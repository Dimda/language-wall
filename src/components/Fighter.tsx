import { memo } from 'react';
import type { Element, PlayerPublic } from '../../shared/types';
import { ELEMENT_COLOR, Sprite } from './sprites';

export type FighterRole = 'idle' | 'casting' | 'typing' | 'waiting' | 'done' | 'fizzled' | 'channel';

interface Props {
  player: PlayerPublic;
  role: FighterRole;
  element: Element | null;
  size: number;
  isMe: boolean;
  hurtKey: number;
  /** Tiny version for other teams: no name label, small bubble. */
  compact?: boolean;
}

/** Stable per-player offset so the party doesn't march in lockstep. */
const walkDelay = (id: string) => `${-([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 560)}ms`;

export const Fighter = memo(function Fighter({ player, role, element, size, isMe, hurtKey, compact }: Props) {
  const color = element ? ELEMENT_COLOR[element] : '#ffffff';
  // Everyone marches toward the wall; casters (and channelling spell-casters) stop to chant.
  const walking = player.connected && (role === 'idle' || role === 'waiting' || role === 'done');
  return (
    <div
      className={`fighter role-${role} ${isMe ? 'me' : ''} ${player.connected ? '' : 'gone'} ${compact ? 'compact' : ''} ${walking ? 'walking' : ''}`}
      data-pid={player.id}
      title={compact ? player.name : undefined}
      style={{ '--el': color, '--wd': walkDelay(player.id) } as React.CSSProperties}
    >
      <span className="fighter-name">
        {isMe && '▶'}
        {player.name}
      </span>
      <div className="fighter-body">
        {(role === 'typing' || role === 'casting') && <span className="bubble">{role === 'typing' ? '✎…' : '…'}</span>}
        <div key={hurtKey} className={hurtKey ? 'fighter-sprite hurt' : 'fighter-sprite'}>
          <Sprite avatar={player.avatar} size={size} walk={walking} />
        </div>
        <span className="fighter-shadow" />
      </div>
    </div>
  );
});
