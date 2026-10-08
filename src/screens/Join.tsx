import { useState } from 'react';
import type { AvatarId, Phase } from '../../shared/types';
import { audio } from '../audio';
import { MAX_PLAYERS } from '../../shared/teams';
import { AVATARS, Sprite } from '../components/sprites';
import { socket } from '../net';

function load(): { name: string; avatar: AvatarId } {
  try {
    const saved = JSON.parse(localStorage.getItem('lw-profile') ?? '');
    const avatar = AVATARS.some((a) => a.id === saved.avatar) ? saved.avatar : AVATARS[0].id;
    return { name: String(saved.name ?? ''), avatar };
  } catch {
    return { name: '', avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)].id };
  }
}

export function Join({ phase, count }: { phase: Phase; count: number }) {
  const full = count >= MAX_PLAYERS;
  const saved = load();
  const [name, setName] = useState(saved.name);
  const [avatar, setAvatar] = useState<AvatarId>(saved.avatar);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      localStorage.setItem('lw-profile', JSON.stringify({ name: name.trim(), avatar }));
    } catch {}
    audio.sfx('submit');
    socket.emit('join', { name, avatar });
  };

  return (
    <div className="screen center">
      <h1 className="title">
        言葉の壁
        <small>THE LANGUAGE WALL</small>
      </h1>
      <form className="window join" onSubmit={submit}>
        <label className="field">
          <span>なまえ / NAME</span>
          <input autoFocus maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="field">
          <span>キャラ / CHOOSE YOUR FIGHTER</span>
          <div className="avatar-grid">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`avatar-choice ${avatar === a.id ? 'selected' : ''}`}
                onClick={() => {
                  audio.unlock();
                  audio.sfx('select');
                  setAvatar(a.id);
                }}
              >
                <Sprite avatar={a.id} size={56} />
                <small>
                  {a.labelJa}
                  <br />
                  {a.label}
                </small>
              </button>
            ))}
          </div>
        </div>
        {full && (
          <p className="warn">
            満員です（{MAX_PLAYERS}人まで） / The party is full ({MAX_PLAYERS} max)
          </p>
        )}
        <button className="btn primary" type="submit" disabled={!name.trim() || full}>
          ▶ {phase === 'battle' ? 'JOIN THE BATTLE' : 'JOIN'}
        </button>
      </form>
      <p className="hint">関西をつなぐ — Bridge Kansai</p>
    </div>
  );
}
