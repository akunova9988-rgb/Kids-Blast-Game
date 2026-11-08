import { useState } from 'react';
import { setSound, soundOn, tone } from './sound.js';

export function Stars({ count = 0, of = 3, size = 42 }) {
  const safe = Math.max(0, Math.min(of, count || 0));
  return (
    <div className="stars" role="img" aria-label={`${safe} of ${of} stars`}>
      {Array.from({ length: of }, (_, index) => (
        <svg key={index} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={index < safe ? 'star is-on' : 'star'}>
          <path d="M12 2.6l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8 6.6 19.5l1-6.1L3.2 9.1l6.1-.9L12 2.6z" />
        </svg>
      ))}
    </div>
  );
}

export function Rocket({ className = 'ship' }) {
  return (
    <svg className={className} viewBox="0 0 80 80" aria-hidden="true">
      <path d="M40 6c8 10 12 22 12 34 0 8-2 14-6 18l-6 4-6-4c-4-4-6-10-6-18C28 28 32 16 40 6z" fill="#ffd15c" stroke="#1c1733" strokeWidth="3" />
      <circle cx="40" cy="34" r="6" fill="#fff4e8" stroke="#1c1733" strokeWidth="3" />
      <path d="M28 48c-8 2-12 10-12 16 6-2 10-6 12-12zM52 48c8 2 12 10 12 16-6-2-10-6-12-12z" fill="#ffb199" stroke="#1c1733" strokeWidth="3" />
      <path d="M34 62c2 8 4 12 6 14 2-2 4-6 6-14" fill="#ef6f6c" stroke="#1c1733" strokeWidth="3" />
    </svg>
  );
}

export function Lives({ lives, of = 3 }) {
  return (
    <div className="lives" aria-label={`${lives} lives left`}>
      {Array.from({ length: of }, (_, index) => (
        <Rocket key={index} className={index < lives ? 'life' : 'life is-gone'} />
      ))}
    </div>
  );
}

export function Banner({ kind = 'error', children }) {
  if (!children) return null;
  return (
    <div className={kind === 'ok' ? 'banner is-ok' : 'banner'} role={kind === 'ok' ? 'status' : 'alert'}>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function SoundToggle() {
  const [on, setOn] = useState(soundOn);
  return (
    <button
      type="button"
      className="icon-btn"
      aria-pressed={on}
      onClick={() => {
        const next = !on;
        setSound(next);
        setOn(next);
        if (next) tone('ok');
      }}
    >
      {on ? 'Sound on' : 'Sound off'}
    </button>
  );
}

export function formatWhen(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
