/**
 * Supabase database types for online multiplayer.
 * Mirrors schema: profiles, matches, matchmaking_queue.
 */

import type { GameState } from '../game/types';

/** Avatar config stored in profiles. */
export interface AvatarConfig {
  color?: string;
  icon?: string;
}

/** Profile row (public.profiles). */
export interface DbProfile {
  id: string;
  display_name: string;
  elo_rating: number;
  games_played: number;
  games_won: number;
  avatar_config: AvatarConfig | null;
  created_at: string;
}

/** Match status. */
export type MatchStatus = 'waiting' | 'active' | 'completed';

/** Match mode. */
export type MatchMode = 'ranked' | 'casual' | 'friend';

/** Time control preset. */
export type TimeControlPreset = 'bullet' | 'blitz' | 'rapid' | null;

/** Match row (public.matches). */
export interface DbMatch {
  id: string;
  player1_id: string;
  player2_id: string | null;
  status: MatchStatus;
  game_state: GameState | null;
  winner_id: string | null;
  is_draw: boolean;
  mode: MatchMode;
  time_control: TimeControlPreset;
  move_history: unknown[];
  started_at: string | null;
  completed_at: string | null;
  /** Client-only: last heartbeat from each player (set by RPC or trigger). */
  last_seen_p1?: string | null;
  last_seen_p2?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Matchmaking queue row. */
export interface DbMatchmakingQueue {
  id: string;
  player_id: string;
  elo_rating: number;
  mode: 'ranked' | 'casual';
  time_control: string | null;
  queued_at: string;
}

/** Realtime payload for matches channel. */
export interface MatchRealtimePayload {
  matchId: string;
  game_state?: GameState;
  winner_id?: string | null;
  is_draw?: boolean;
  status?: MatchStatus;
}
