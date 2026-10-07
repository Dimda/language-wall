import { useState } from 'react';
import { audio } from '../audio';

export function MuteButton() {
  const [muted, setMuted] = useState(audio.muted);
  return (
    <button
      type="button"
      className="mute"
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      onClick={() => {
        audio.unlock();
        audio.setMuted(!muted);
        setMuted(!muted);
      }}
    >
      {muted ? '♪✕' : '♪'}
    </button>
  );
}
