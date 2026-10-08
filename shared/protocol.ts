import type { Rejection } from './guard';
import type { AvatarId, ResolveTimeline, Snapshot, Task } from './types';

export interface ClientToServer {
  hello: (payload: { playerId: string }) => void;
  join: (payload: { name: string; avatar: AvatarId }) => void;
  start: () => void;
  submit: (payload: { chainId: string; text: string }) => void;
  typing: (payload: { typing: boolean }) => void;
  restart: () => void;
  addBot: () => void;
}

export interface ServerToClient {
  snapshot: (s: Snapshot) => void;
  task: (t: Task) => void;
  taskCleared: () => void;
  resolve: (t: ResolveTimeline) => void;
  bossAttack: (p: { damage: number }) => void;
  submitRejected: (r: Rejection) => void;
}
