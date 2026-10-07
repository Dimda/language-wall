import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
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
  const [hopCount, setHopCount] = useState(snapshot.hopCount);
  const players = snapshot.players.filter((p) => p.connected);

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
        {me?.isHost ? (
          <div className="host-controls">
            <div className="choices row">
              <span>HOPS</span>
              {[2, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`choice small ${hopCount === n ? 'selected' : ''}`}
                  onClick={() => {
                    audio.sfx('select');
                    setHopCount(n);
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
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
                  socket.emit('start', { hopCount });
                }}
              >
                ▶ FIGHT!
              </button>
            </div>
          </div>
        ) : (
          <p className="blink">{isScreen ? `${players.length} hero(es) ready` : 'Waiting for the host to start…'}</p>
        )}
      </div>
      {me?.isHost && !isScreen && (
        <details className="hint">
          <summary>Show join QR</summary>
          <JoinQr size={140} />
        </details>
      )}
      <p className="hint">Explain it, don't translate it word for word. / 直訳じゃなく、説明しよう。</p>
    </div>
  );
}
