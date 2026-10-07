import { useEffect } from 'react';
import { audio, type TrackName } from './audio';
import { MuteButton } from './components/MuteButton';
import { isScreen, playerId, useGame } from './net';
import { Battle } from './screens/Battle';
import { End } from './screens/End';
import { Join } from './screens/Join';
import { Lobby } from './screens/Lobby';

export function App() {
  const { snapshot, connected } = useGame();

  // Browsers only allow audio after a user gesture.
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const phase = snapshot?.phase;
  const turn = snapshot?.turn;
  useEffect(() => {
    let track: TrackName | null = 'menu';
    if (phase === 'battle') track = turn === 'casting' ? 'battle' : 'quiet';
    else if (phase === 'victory') track = 'victory';
    else if (phase === 'defeat') track = 'defeat';
    audio.play(track);
  }, [phase, turn]);

  if (!snapshot) {
    return (
      <div className="screen center">
        <div className="window">{connected ? 'Loading…' : 'Connecting to server…'}</div>
      </div>
    );
  }

  const me = snapshot.players.find((p) => p.id === playerId) ?? null;
  let screen: React.ReactNode;
  if (!me && !isScreen) screen = <Join phase={snapshot.phase} />;
  else if (snapshot.phase === 'lobby') screen = <Lobby snapshot={snapshot} me={me} />;
  else if (snapshot.phase === 'battle') screen = <Battle snapshot={snapshot} me={me} />;
  else screen = <End snapshot={snapshot} me={me} />;

  return (
    <>
      {!connected && <div className="offline">Reconnecting…</div>}
      <MuteButton />
      {screen}
    </>
  );
}
