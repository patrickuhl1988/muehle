/**
 * Matchmaking Edge Function.
 * Invoke every 3s (cron or client). Pairs players from matchmaking_queue by ELO and creates a match.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ELO_DIFF_INITIAL = 200;
const ELO_DIFF_AFTER_15S = 400;
const QUEUE_TIME_15S = 15;
const QUEUE_TIME_30S = 30;

interface QueueEntry {
  id: string;
  player_id: string;
  elo_rating: number;
  mode: string;
  time_control: string | null;
  queued_at: string;
}

function getMaxEloDiff(queuedAt: string): number {
  const sec = (Date.now() - new Date(queuedAt).getTime()) / 1000;
  if (sec >= QUEUE_TIME_30S) return Infinity;
  if (sec >= QUEUE_TIME_15S) return ELO_DIFF_AFTER_15S;
  return ELO_DIFF_INITIAL;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: entries, error: fetchError } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .order('queued_at', { ascending: true });

    if (fetchError || !entries || entries.length < 2) {
      return new Response(JSON.stringify({ matched: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const queue = entries as QueueEntry[];
    let i = 0;
    while (i < queue.length) {
      const a = queue[i];
      const maxDiffA = getMaxEloDiff(a.queued_at);
      let j = i + 1;
      while (j < queue.length) {
        const b = queue[j];
        if (a.mode !== b.mode) {
          j++;
          continue;
        }
        if (a.time_control !== b.time_control) {
          j++;
          continue;
        }
        const diff = Math.abs(a.elo_rating - b.elo_rating);
        const maxDiffB = getMaxEloDiff(b.queued_at);
        const maxAllowed = Math.min(maxDiffA, maxDiffB);
        if (diff <= maxAllowed) {
          const gameState = {
            board: Array(24).fill(0),
            currentPlayer: 1,
            phase: 'placing',
            stonesInHand: { 1: 9, 2: 9 },
            stonesOnBoard: { 1: 0, 2: 0 },
            mustRemove: false,
            selectedStone: null,
            moveHistory: [],
            moveCount: 0,
            gameOver: false,
            winner: null,
            isDraw: false,
            lastMove: null,
            lastMillAtMove: -1,
            positionCount: {},
          };

          const { data: match, error: matchError } = await supabase
            .from('matches')
            .insert({
              player1_id: a.player_id,
              player2_id: b.player_id,
              status: 'active',
              game_state: gameState,
              mode: a.mode as 'ranked' | 'casual',
              time_control: a.time_control ? (a.time_control as 'bullet' | 'blitz' | 'rapid') : null,
              started_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (matchError || !match) {
            j++;
            continue;
          }

          await supabase.from('matchmaking_queue').delete().in('id', [a.id, b.id]);

          return new Response(
            JSON.stringify({ matched: true, matchId: match.id, player1: a.player_id, player2: b.player_id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
        j++;
      }
      i++;
    }

    return new Response(JSON.stringify({ matched: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
