import type { LogEntry } from '../../shared/types';
import { Typewriter } from './ui';

export function BattleLog({ log }: { log: LogEntry[] }) {
  const recent = log.slice(-6);
  const newest = recent[recent.length - 1]?.id;
  return (
    <div className="window log">
      {recent.map((l) => (
        <p key={l.id} className={`log-${l.kind}`}>
          {l.id === newest ? <Typewriter text={l.text} /> : l.text}
        </p>
      ))}
    </div>
  );
}
