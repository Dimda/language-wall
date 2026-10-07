import type { PlayerPublic, Snapshot } from '../../shared/types';
import { Sprite } from '../components/sprites';
import { Typewriter } from '../components/ui';
import { socket } from '../net';

export function End({ snapshot, me }: { snapshot: Snapshot; me: PlayerPublic | null }) {
  const win = snapshot.phase === 'victory';
  const names = snapshot.players.filter((p) => p.connected).map((p) => p.name);

  return (
    <div className={`screen center end ${win ? 'victory' : 'defeat'}`}>
      {win ? (
        <div className="bridge-scene" aria-hidden>
          <div className="shore left">関西</div>
          <div className="rubble">
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} style={{ '--i': i } as React.CSSProperties} />
            ))}
          </div>
          <div className="bridge">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} style={{ '--i': i } as React.CSSProperties} />
            ))}
          </div>
          <div className="shore right">Kansai</div>
        </div>
      ) : (
        <div className="defeat-wall" aria-hidden>
          言葉の壁
        </div>
      )}

      <div className={`end-party ${win ? 'cheer' : 'down'}`}>
        {snapshot.players
          .filter((p) => p.connected)
          .map((p) => (
            <div key={p.id} className="lobby-fighter">
              <span className="fighter-name">{p.name}</span>
              <Sprite avatar={p.avatar} size={56} />
            </div>
          ))}
      </div>

      <div className="window end-msg">
        <h2>{win ? 'VICTORY! / 勝利！' : 'DEFEAT… / 全滅…'}</h2>
        <p>
          <Typewriter
            text={
              win
                ? `The wall has fallen. A bridge now connects ${names.join(', ')}. 言葉の壁を越えた！`
                : 'The words were lost in translation… 言葉の壁は高かった。'
            }
          />
        </p>
        {me?.isHost ? (
          <button type="button" className="btn primary" onClick={() => socket.emit('restart')}>
            ▶ PLAY AGAIN
          </button>
        ) : (
          <p className="blink">Waiting for the host…</p>
        )}
      </div>
    </div>
  );
}
