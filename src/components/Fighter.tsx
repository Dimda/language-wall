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
}

export const Fighter = memo(function Fighter({ player, role, element, size, isMe, hurtKey }: Props) {
  const color = element ? ELEMENT_COLOR[element] : '#ffffff';
  return (
    <div
      className={`fighter role-${role} ${isMe ? 'me' : ''} ${player.connected ? '' : 'gone'}`}
      data-pid={player.id}
      style={{ '--el': color } as React.CSSProperties}
    >
      <span className="fighter-name">
        {isMe && '▶'}
        {player.name}
      </span>
      <div className="fighter-body">
        {(role === 'typing' || role === 'casting') && <span className="bubble">{role === 'typing' ? '✎…' : '…'}</span>}
        <div key={hurtKey} className={hurtKey ? 'fighter-sprite hurt' : 'fighter-sprite'}>
          <Sprite avatar={player.avatar} size={size} />
        </div>
        <span className="fighter-shadow" />
      </div>
    </div>
  );
});
