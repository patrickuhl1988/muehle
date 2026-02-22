/**
 * ELO update after match completion.
 * Call from client when match ends, or invoke via DB webhook.
 * K = 32 (64 for players with < 10 games). Min rating 100.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const K_NORMAL = 32;
const K_NEW = 64;
const GAMES_FOR_NEW = 10;
const MIN_ELO = 100;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
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

    const { matchId } = (await req.json()) as { matchId: string };
    if (!matchId) {
      return new Response(JSON.stringify({ error: 'matchId required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('player1_id, player2_id, winner_id, is_draw, mode')
      .eq('id', matchId)
      .single();

    if (matchErr || !match || match.mode !== 'ranked' || match.is_draw) {
      return new Response(JSON.stringify({ updated: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const p1Id = match.player1_id as string;
    const p2Id = match.player2_id as string;
    if (!p2Id) {
      return new Response(JSON.stringify({ updated: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, elo_rating, games_played, games_won')
      .in('id', [p1Id, p2Id]);

    const p1 = profiles?.find((r) => r.id === p1Id);
    const p2 = profiles?.find((r) => r.id === p2Id);
    if (!p1 || !p2) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const r1 = p1.elo_rating;
    const r2 = p2.elo_rating;
    const k1 = (p1.games_played ?? 0) < GAMES_FOR_NEW ? K_NEW : K_NORMAL;
    const k2 = (p2.games_played ?? 0) < GAMES_FOR_NEW ? K_NEW : K_NORMAL;

    const e1 = expectedScore(r1, r2);
    const e2 = expectedScore(r2, r1);

    const winnerId = match.winner_id as string | null;
    const s1 = winnerId === p1Id ? 1 : winnerId === p2Id ? 0 : 0.5;
    const s2 = 1 - s1;

    const newR1 = Math.round(Math.max(MIN_ELO, r1 + k1 * (s1 - e1)));
    const newR2 = Math.round(Math.max(MIN_ELO, r2 + k2 * (s2 - e2)));

    await supabase
      .from('profiles')
      .update({
        elo_rating: newR1,
        games_played: (p1.games_played ?? 0) + 1,
        games_won: (p1.games_won ?? 0) + (s1 === 1 ? 1 : 0),
      })
      .eq('id', p1Id);

    await supabase
      .from('profiles')
      .update({
        elo_rating: newR2,
        games_played: (p2.games_played ?? 0) + 1,
        games_won: (p2.games_won ?? 0) + (s2 === 1 ? 1 : 0),
      })
      .eq('id', p2Id);

    return new Response(
      JSON.stringify({
        updated: true,
        player1: { id: p1Id, newElo: newR1 },
        player2: { id: p2Id, newElo: newR2 },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
