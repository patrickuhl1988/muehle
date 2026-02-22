/**
 * Minimal Supabase Database type for tables used by the app.
 * For full generated types run: npx supabase gen types typescript --project-id <id> > lib/supabase/database.generated.ts
 */

import type { GameState } from '../game/types';

export interface JsonMap {
  [key: string]: unknown;
}

export interface DbProfileRow {
  id: string;
  display_name: string;
  elo_rating: number;
  games_played: number;
  games_won: number;
  avatar_config: JsonMap | null;
  created_at: string;
}

export interface DbMatchRow {
  id: string;
  player1_id: string;
  player2_id: string | null;
  status: 'waiting' | 'active' | 'completed';
  game_state: GameState | null;
  winner_id: string | null;
  is_draw: boolean;
  mode: 'ranked' | 'casual' | 'friend';
  time_control: 'bullet' | 'blitz' | 'rapid' | null;
  move_history: unknown[];
  started_at: string | null;
  completed_at: string | null;
  last_seen_p1?: string | null;
  last_seen_p2?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbMatchmakingQueueRow {
  id: string;
  player_id: string;
  elo_rating: number;
  mode: 'ranked' | 'casual';
  time_control: string | null;
  queued_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: DbProfileRow;
        Insert: Omit<DbProfileRow, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<DbProfileRow, 'id'>>;
      };
      matches: {
        Row: DbMatchRow;
        Insert: Omit<DbMatchRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Omit<DbMatchRow, 'id'>>;
      };
      matchmaking_queue: {
        Row: DbMatchmakingQueueRow;
        Insert: Omit<DbMatchmakingQueueRow, 'id'>;
        Update: Partial<DbMatchmakingQueueRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
