import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { MAX_TEAM_SIZE, teamSizes } from '../../shared/teams';
import type { PlayerPublic, Snapshot } from '../../shared/types';
import { audio } from '../audio';
import { Sprite } from '../components/sprites';
import { isScreen, socket } from '../net';

const joinUrl = `${location.origin}${location.pathname}`;

function JoinQr({ size }: { size: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    void QRCode.toDataURL(joinUrl, { margin: 1, width: size * 2, color: { dark: '#000010', light: '#f4f4f4' } }).then(setSrc);
  }, [size]);
  return (
    <div className="qr">
      {src && <img src={src} width={size} height={size} alt={`QR code for ${joinUrl}`} />}
      <span>{joinUrl.replace(/^https?:\/\//, '')}</span>
    </div>
  );
}

export function Lobby({ snapshot, me }: { snapshot: Snapshot; me: PlayerPublic | null }) {
  const players = snapshot.players.filter((p) => p.connected);
  const sizes = teamSizes(players.length);

  return (
    <div className={`screen center lobby-screen ${isScreen ? 'projector' : ''}`}>
      <h1 className="title small">
        言葉の壁
        <small>{isScreen ? 'SCAN TO JOIN THE PARTY' : 'PARTY'}</small>
      </h1>

      {isScreen && <JoinQr size={220} />}

      <div className="window lobby">
        <div className="lobby-party">
          {players.length === 0 && <p className="blink">Waiting for heroes… / 勇者募集中…</p>}
          {players.map((p) => (
            <div key={p.id} className={`lobby-fighter ${p.id === me?.id ? 'me' : ''}`}>
              <span className="fighter-name">{p.name}</span>
              <Sprite avatar={p.avatar} size={isScreen ? 72 : 56} />
              <small>{p.isHost ? '★HOST' : p.isBot ? 'BOT' : ''}</small>
            </div>
          ))}
        </div>
        {sizes.length > 0 && (
          <p className="team-preview">
            {sizes.length === 1 ? '1 team' : `${sizes.length} teams`} of {sizes.join(' · ')} — formed when the battle starts
            <small>チームはバトル開始時に自動で決まります（最大{MAX_TEAM_SIZE}人）</small>
          </p>
        )}
        {me?.isHost ? (
          <div className="host-controls">
            <div className="row">
              {snapshot.devMode && (
                <button type="button" className="btn" onClick={() => socket.emit('addBot')}>
                  + BOT
                </button>
              )}
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  audio.sfx('submit');
                  socket.emit('start');
                }}
              >
                ▶ FIGHT!
              </button>
            </div>
          </div>
        ) : (
          <p className="blink">{isScreen ? `${players.length}人 準備OK / ${players.length} ready` : 'ホストの開始を待っています… / Waiting for the host to start…'}</p>
        )}
      </div>
      {me?.isHost && !isScreen && (
        <details className="hint">
          <summary>参加用QRコード / Show join QR</summary>
          <JoinQr size={140} />
        </details>
      )}
      <p className="hint">届いた言葉を、もう一つの言語に翻訳しよう！ / Translate the word you receive into the other language!</p>
    </div>
  );
}
