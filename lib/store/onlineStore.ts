/**
 * Zustand store for online multiplayer: Auth, profile, matchmaking queue, current match, realtime sync.
 */

import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import type { DbMatch, DbProfile, MatchMode, TimeControlPreset } from '../supabase/types';
import type { GameState, Move, Position } from '../game/types';
import { getValidMoves, getRemovableStones, makeMove } from '../game/engine';
import type { RealtimeChannel } from '@supabase/supabase-js';

const HEARTBEAT_INTERVAL_MS = 10_000;
const DISCONNECT_TIMEOUT_MS = 30_000;
const MATCHMAKING_POLL_MS = 3000;

function getFunctionsUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return url.replace(/\/$/, '') + '/functions/v1';
}

interface OnlineState {
  /** Auth */
  userId: string | null;
  sessionReady: boolean;
  /** Profile */
  profile: DbProfile | null;
  /** Queue */
  queueEntry: { mode: 'ranked' | 'casual'; time_control: string | null } | null;
  queuePollTimer: ReturnType<typeof setInterval> | null;
  /** Current match */
  currentMatch: DbMatch | null;
  myPlayerNumber: 1 | 2 | null;
  realtimeChannel: RealtimeChannel | null;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  disconnectCheckTimer: ReturnType<typeof setInterval> | null;
  /** Actions */
  initSession: () => Promise<void>;
  signInAnonymously: () => Promise<{ error: string | null }>;
  /** Returns URL to open for Google OAuth (open with WebBrowser.openAuthSessionAsync). */
  signInWithGoogle: () => Promise<{ url: string | null; error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  upsertProfile: (updates: { display_name?: string; avatar_config?: Record<string, unknown> }) => Promise<void>;
  joinQueue: (mode: 'ranked' | 'casual', timeControl?: TimeControlPreset) => Promise<{ error: string | null }>;
  leaveQueue: () => Promise<void>;
  pollMatchmaking: () => Promise<void>;
  setCurrentMatch: (match: DbMatch | null, myPlayerNumber: 1 | 2 | null) => void;
  loadMatch: (matchId: string) => Promise<boolean>;
  subscribeToMatch: (matchId: string) => void;
  unsubscribeFromMatch: () => void;
  makeMove: (position: Position) => Promise<{ handled: boolean; error?: string }>;
  sendHeartbeat: () => Promise<void>;
  completeMatchAndUpdateElo: (matchId: string) => Promise<void>;
  resetOnline: () => void;
}

export const useOnlineStore = create<OnlineState>((set, get) => ({
  userId: null,
  sessionReady: false,
  profile: null,
  queueEntry: null,
  queuePollTimer: null,
  currentMatch: null,
  myPlayerNumber: null,
  realtimeChannel: null,
  heartbeatTimer: null,
  disconnectCheckTimer: null,

  initSession: async () => {
    if (!isSupabaseConfigured()) {
      set({ sessionReady: true });
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({
        userId: session?.user?.id ?? null,
        sessionReady: true,
      });
      if (session?.user?.id) {
        get().fetchProfile();
      }
    } catch {
      set({ sessionReady: true });
    }
  },

  signInAnonymously: async () => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase nicht konfiguriert.' };
    }
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) return { error: error.message };
      set({ userId: data.user?.id ?? null });
      await get().fetchProfile();
      return { error: null };
    } catch (e) {
      return { error: String(e) };
    }
  },

  /**
   * Returns Google OAuth URL. Open with WebBrowser.openAuthSessionAsync(url, redirectUrl) and
   * configure Supabase Auth URL redirect in Dashboard. After redirect, call initSession() or getSession().
   */
  signInWithGoogle: async () => {
    if (!isSupabaseConfigured()) {
      return { url: null, error: 'Supabase nicht konfiguriert.' };
    }
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { skipBrowserRedirect: true },
      });
      if (error) return { url: null, error: error.message };
      return { url: data?.url ?? null, error: null };
    } catch (e) {
      return { url: null, error: String(e) };
    }
  },

  signOut: async () => {
    get().leaveQueue();
    get().unsubscribeFromMatch();
    set({
      currentMatch: null,
      myPlayerNumber: null,
      profile: null,
      userId: null,
    });
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  },

  fetchProfile: async () => {
    const { userId } = get();
    if (!isSupabaseConfigured() || !userId) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    set({ profile: data as DbProfile | null });
  },

  upsertProfile: async (updates) => {
    const { userId } = get();
    if (!isSupabaseConfigured() || !userId) return;
    await supabase.from('profiles').upsert(
      { id: userId, ...updates },
      { onConflict: 'id' }
    );
    get().fetchProfile();
  },

  joinQueue: async (mode, timeControl) => {
    const { userId, profile } = get();
    if (!isSupabaseConfigured() || !userId) {
      return { error: 'Nicht angemeldet.' };
    }
    get().leaveQueue();
    const elo = profile?.elo_rating ?? 1000;
    const { error } = await supabase.from('matchmaking_queue').upsert(
      {
        player_id: userId,
        elo_rating: elo,
        mode,
        time_control: timeControl ?? null,
        queued_at: new Date().toISOString(),
      },
      { onConflict: 'player_id' }
    );
    if (error) return { error: error.message };
    set({
      queueEntry: { mode, time_control: timeControl ?? null },
    });
    const timer = setInterval(() => {
      get().pollMatchmaking();
    }, MATCHMAKING_POLL_MS);
    set({ queuePollTimer: timer });
    get().pollMatchmaking();
    return { error: null };
  },

  leaveQueue: async () => {
    const { queuePollTimer, userId } = get();
    if (queuePollTimer) {
      clearInterval(queuePollTimer);
      set({ queuePollTimer: null });
    }
    set({ queueEntry: null });
    if (!isSupabaseConfigured() || !userId) return;
    await supabase.from('matchmaking_queue').delete().eq('player_id', userId);
  },

  pollMatchmaking: async () => {
    const { userId } = get();
    if (!userId) return;
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1);
    const match = matches?.[0] as DbMatch | undefined;
    if (match && match.started_at) {
      const started = new Date(match.started_at).getTime();
      if (Date.now() - started < 60_000) {
        get().leaveQueue();
        const myNum = match.player1_id === userId ? 1 : 2;
        get().setCurrentMatch(match, myNum);
        get().subscribeToMatch(match.id);
      }
    }
  },

  setCurrentMatch: (match, myPlayerNumber) => {
    set({ currentMatch: match, myPlayerNumber });
  },

  loadMatch: async (matchId) => {
    const { userId } = get();
    if (!userId) return false;
    const { data, error } = await supabase.from('matches').select('*').eq('id', matchId).single();
    if (error || !data) return false;
    const match = data as DbMatch;
    const myNum = match.player1_id === userId ? 1 : match.player2_id === userId ? 2 : null;
    if (myNum === null) return false;
    set({ currentMatch: match, myPlayerNumber: myNum });
    get().subscribeToMatch(matchId);
    return true;
  },

  subscribeToMatch: (matchId) => {
    get().unsubscribeFromMatch();
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const newRow = payload.new as DbMatch;
          set((s) => ({
            currentMatch: s.currentMatch?.id === matchId ? newRow : s.currentMatch,
          }));
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });

    const heartbeatTimer = setInterval(() => {
      get().sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
    const disconnectCheckTimer = setInterval(() => {
      const { currentMatch, myPlayerNumber } = get();
      if (!currentMatch || !myPlayerNumber || currentMatch.status !== 'active') return;
      const lastSeen = myPlayerNumber === 1 ? currentMatch.last_seen_p2 : currentMatch.last_seen_p1;
      if (!lastSeen) return;
      const elapsed = Date.now() - new Date(lastSeen).getTime();
      if (elapsed > DISCONNECT_TIMEOUT_MS) {
        const winnerId = myPlayerNumber === 1 ? currentMatch.player1_id : currentMatch.player2_id;
        supabase
          .from('matches')
          .update({
            status: 'completed',
            winner_id: winnerId,
            is_draw: false,
            completed_at: new Date().toISOString(),
          })
          .eq('id', matchId);
      }
    }, 5000);

    set({ heartbeatTimer, disconnectCheckTimer });
  },

  unsubscribeFromMatch: () => {
    const { realtimeChannel, heartbeatTimer, disconnectCheckTimer } = get();
    realtimeChannel?.unsubscribe();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (disconnectCheckTimer) clearInterval(disconnectCheckTimer);
    set({
      realtimeChannel: null,
      heartbeatTimer: null,
      disconnectCheckTimer: null,
    });
  },

  makeMove: async (position) => {
    const { currentMatch, myPlayerNumber, userId } = get();
    if (!currentMatch?.game_state || myPlayerNumber === null || !userId) {
      return { handled: false, error: 'Kein aktives Spiel.' };
    }
    const gs = currentMatch.game_state as GameState;
    if (gs.gameOver || gs.currentPlayer !== myPlayerNumber) {
      return { handled: false, error: 'Nicht dein Zug.' };
    }

    const validMoves = getValidMoves(gs);
    const removable = getRemovableStones(gs);

    let nextState: GameState;
    if (gs.mustRemove) {
      if (!removable.includes(position)) return { handled: false, error: 'Ungültiger Stein.' };
      nextState = makeMove(gs, position);
    } else if (gs.phase === 'placing') {
      if (!validMoves.includes(position)) return { handled: false, error: 'Ungültige Position.' };
      nextState = makeMove(gs, position);
    } else {
      if (gs.selectedStone === null) {
        const myStones = gs.board
          .map((v, i) => (v === myPlayerNumber ? i : -1))
          .filter((i) => i >= 0);
        if (myStones.includes(position)) {
          set((s) => ({
            currentMatch: s.currentMatch
              ? {
                  ...s.currentMatch,
                  game_state: { ...gs, selectedStone: position },
                }
              : null,
          }));
          return { handled: true };
        }
        return { handled: false };
      }
      if (position === gs.selectedStone) {
        set((s) => ({
          currentMatch: s.currentMatch
            ? { ...s.currentMatch, game_state: { ...gs, selectedStone: null } }
            : null,
        }));
        return { handled: true };
      }
      if (!validMoves.includes(position)) return { handled: false, error: 'Ungültiger Zug.' };
      nextState = makeMove({ ...gs, selectedStone: gs.selectedStone }, position);
    }

    const move = nextState.lastMove!;
    const moveHistory = [...(currentMatch.move_history || []), move];
    const updates: Partial<DbMatch> = {
      game_state: nextState,
      move_history: moveHistory,
      updated_at: new Date().toISOString(),
    };
    if (nextState.gameOver) {
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();
      updates.winner_id = nextState.winner ? (nextState.winner === 1 ? currentMatch.player1_id : currentMatch.player2_id) : null;
      updates.is_draw = nextState.isDraw;
    }
    if (myPlayerNumber === 1) {
      updates.last_seen_p1 = new Date().toISOString();
    } else {
      updates.last_seen_p2 = new Date().toISOString();
    }

    const { error } = await supabase.from('matches').update(updates).eq('id', currentMatch.id);
    if (error) return { handled: false, error: error.message };
    set((s) => ({
      currentMatch: s.currentMatch
        ? { ...s.currentMatch, ...updates, game_state: nextState, move_history: moveHistory }
        : null,
    }));
    return { handled: true };
  },

  sendHeartbeat: async () => {
    const { currentMatch, myPlayerNumber } = get();
    if (!currentMatch || currentMatch.status !== 'active' || myPlayerNumber === null) return;
    const key = myPlayerNumber === 1 ? 'last_seen_p1' : 'last_seen_p2';
    await supabase
      .from('matches')
      .update({ [key]: new Date().toISOString() })
      .eq('id', currentMatch.id);
  },

  completeMatchAndUpdateElo: async (matchId) => {
    const url = getFunctionsUrl() + '/elo-after-match';
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ matchId }),
    });
  },

  resetOnline: () => {
    get().unsubscribeFromMatch();
    get().leaveQueue();
    set({
      currentMatch: null,
      myPlayerNumber: null,
      queueEntry: null,
    });
  },
}));
