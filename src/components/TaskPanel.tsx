import { useEffect, useRef, useState } from 'react';
import type { Lang, Task } from '../../shared/types';
import { audio } from '../audio';
import { socket } from '../net';
import { ELEMENT_COLOR, ELEMENT_LABEL } from './sprites';
import { Typewriter, useNow } from './ui';

const LANG_LABEL: Record<Lang, string> = { ja: '日本語', en: 'English' };
const TYPING_IDLE_MS = 2500;

export function TaskPanel({ task, status }: { task: Task | null; status: string }) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingSent = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const now = useNow(200);
  const taskKey = task ? `${task.chainId}:${task.hopIndex}` : '';

  useEffect(() => {
    setText('');
    typingSent.current = false;
    if (taskKey) {
      audio.sfx('select');
      inputRef.current?.focus();
    }
    return () => clearTimeout(idleTimer.current);
  }, [taskKey]);

  if (!task) {
    return (
      <div className="window task waiting">
        <p className="blink">{status}</p>
      </div>
    );
  }

  const setTyping = (typing: boolean) => {
    if (typingSent.current === typing) return;
    typingSent.current = typing;
    socket.emit('typing', { typing });
  };

  const onChange = (value: string) => {
    setText(value);
    setTyping(value.length > 0);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setTyping(false), TYPING_IDLE_MS);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    clearTimeout(idleTimer.current);
    audio.sfx('submit');
    socket.emit('submit', { chainId: task.chainId, text });
  };

  const isFirst = task.hopIndex === 0;
  const left = Math.max(0, Math.ceil((task.endsAt - now) / 1000));
  const el = ELEMENT_LABEL[task.element];

  return (
    <form className="window task" onSubmit={submit} style={{ '--el': ELEMENT_COLOR[task.element] } as React.CSSProperties}>
      <div className="task-head">
        <span className="el-name">
          {el.icon} {el.en} · HOP {task.hopIndex + 1}/{task.hopCount}
        </span>
        <span className={`task-timer ${left <= 10 ? 'danger' : ''}`}>⏳ {left}s</span>
      </div>
      <p className="task-label">
        {isFirst ? 'Your word / お題:' : 'You received / 届いた呪文:'}{' '}
        <span className="langs">
          {LANG_LABEL[task.fromLang]} → <b>{LANG_LABEL[task.toLang]}</b>
        </span>
      </p>
      <p className="task-prev">
        「<Typewriter text={task.prevText} ms={22} />」
      </p>
      <textarea
        ref={inputRef}
        rows={2}
        maxLength={200}
        value={text}
        placeholder={task.toLang === 'ja' ? '日本語で説明してね…' : 'Explain it in English…'}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="task-foot">
        <small>Explain it, don't translate it word for word.</small>
        <button className="btn primary" type="submit" disabled={!text.trim()}>
          ✦ CAST
        </button>
      </div>
    </form>
  );
}
