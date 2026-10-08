import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServer, ServerToClient } from '../shared/protocol';
import type { ResolveTimeline, Snapshot, Task } from '../shared/types';

function getPlayerId(): string {
  // sessionStorage: each tab is its own player, refresh keeps identity.
  try {
    const existing = sessionStorage.getItem('lw-player-id');
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem('lw-player-id', id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** `?screen` = projector view: never joins, shows the battle full size. */
export const isScreen = new URLSearchParams(location.search).has('screen');
export const playerId = isScreen ? `screen-${crypto.randomUUID()}` : getPlayerId();
export const socket: Socket<ServerToClient, ClientToServer> = io();

export interface Resolving {
  timeline: ResolveTimeline;
  receivedAt: number;
}

interface State {
  connected: boolean;
  snapshot: Snapshot | null;
  task: Task | null;
  resolving: Resolving | null;
  bossAttack: { id: number; damage: number } | null;
  /** Latest refusal of my answer by the server, shown under the input. */
  rejection: { id: number; ja: string; en: string } | null;
}

let state: State = { connected: false, snapshot: null, task: null, resolving: null, bossAttack: null, rejection: null };
const listeners = new Set<() => void>();
let seq = 0;

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

socket.on('connect', () => {
  set({ connected: true });
  socket.emit('hello', { playerId });
});
socket.on('disconnect', () => set({ connected: false }));
socket.on('snapshot', (snapshot) => {
  const patch: Partial<State> = { snapshot };
  if (snapshot.phase === 'lobby') Object.assign(patch, { task: null, resolving: null });
  if (snapshot.phase === 'battle' && snapshot.turn === 'casting') patch.resolving = null;
  set(patch);
});
socket.on('task', (task) => set({ task, rejection: null }));
socket.on('taskCleared', () => set({ task: null }));
socket.on('resolve', (timeline) => set({ resolving: { timeline, receivedAt: performance.now() } }));
socket.on('bossAttack', ({ damage }) => set({ bossAttack: { id: ++seq, damage } }));
socket.on('submitRejected', (r) => set({ rejection: { id: ++seq, ...r } }));

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useGame(): State {
  return useSyncExternalStore(subscribe, () => state);
}
