import { useEffect, useRef, useState } from 'react';
import type { Lang, Task } from '../../shared/types';
import { audio } from '../audio';
import { checkAnswer, type Rejection } from '../../shared/guard';
import { socket, useGame } from '../net';
import { ELEMENT_COLOR, ELEMENT_LABEL } from './sprites';
import { Typewriter, useNow } from './ui';

const LANG_LABEL: Record<Lang, string> = { ja: '日本語', en: 'English' };

/** Everything the player needs to know about the target language, in both languages. */
const TARGET: Record<Lang, { big: string; ja: string; en: string; placeholder: string }> = {
  en: {
    big: 'ENGLISH',
    ja: '英語に翻訳しよう！',
    en: 'Translate into English',
    placeholder: 'Type it in English… / 英語で入力…',
  },
  ja: {
    big: '日本語',
    ja: '日本語に翻訳しよう！',
    en: 'Translate into Japanese',
    placeholder: '日本語で入力… / Type it in Japanese…',
  },
};
const TYPING_IDLE_MS = 2500;

export function TaskPanel({ task, status }: { task: Task | null; status: string }) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingSent = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const now = useNow(200);
  const taskKey = task ? `${task.chainId}:${task.hopIndex}` : '';
  const [error, setError] = useState<Rejection | null>(null);
  const { rejection } = useGame();

  // The server can refuse an answer too (same rule); show its reason the same way.
  useEffect(() => {
    if (!rejection) return;
    setError(rejection);
    audio.sfx('fizzle');
  }, [rejection?.id]);

  useEffect(() => {
    setText('');
    setError(null);
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
    setError(null);
    setTyping(value.length > 0);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setTyping(false), TYPING_IDLE_MS);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    const reason = checkAnswer(task.prevText, text, task.toLang);
    if (reason) {
      setError(reason);
      audio.sfx('fizzle');
      inputRef.current?.focus();
      return;
    }
    clearTimeout(idleTimer.current);
    audio.sfx('submit');
    socket.emit('submit', { chainId: task.chainId, text });
  };

  const isFirst = task.hopIndex === 0;
  const left = Math.max(0, Math.ceil((task.endsAt - now) / 1000));
  const el = ELEMENT_LABEL[task.element];
  const target = TARGET[task.toLang];

  return (
    <form className="window task" onSubmit={submit} style={{ '--el': ELEMENT_COLOR[task.element] } as React.CSSProperties}>
      <div className="task-head">
        <span className="el-name">
          {el.icon} {el.ja} {el.en} · HOP {task.hopIndex + 1}/{task.hopCount}
        </span>
        <span className={`task-timer ${left <= 10 ? 'danger' : ''}`}>⏳ {left}s</span>
      </div>
      <p className="task-label">{isFirst ? 'お題 / Your word' : '届いた言葉 / You received'}</p>
      <p className="task-prev">
        「<Typewriter text={task.prevText} ms={22} />」
      </p>
      <div className={`target target-${task.toLang}`}>
        <span className="target-from">
          {LANG_LABEL[task.fromLang]} →
        </span>
        <b>{target.big}</b>
        <small>
          {target.ja} / {target.en}
        </small>
      </div>
      <textarea
        ref={inputRef}
        className={`input-${task.toLang} ${error ? 'input-error' : ''}`}
        rows={2}
        maxLength={200}
        value={text}
        placeholder={target.placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {error && (
        <p key={JSON.stringify(error)} className="answer-error" role="alert">
          ✕ {error.ja} / {error.en}
        </p>
      )}
      <div className="task-foot">
        <small>Enterで送信 / Press Enter to send</small>
        <button className="btn primary" type="submit" disabled={!text.trim()}>
          ✦ 送る / SEND
        </button>
      </div>
    </form>
  );
}
