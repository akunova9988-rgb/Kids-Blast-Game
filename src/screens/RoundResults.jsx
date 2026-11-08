import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { go, useTitle } from '../nav.js';
import { Banner, Stars } from '../ui.jsx';

function lineFor(stars, livesOut) {
  if (stars >= 3) return 'A perfect blast!';
  if (stars === 2) return 'You did really well.';
  if (livesOut) return 'You finished the round. Nice effort.';
  return 'You finished the round. Nice effort.';
}

export function RoundResults({ playId }) {
  useTitle('Your stars');
  const [play, setPlay] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/plays/${playId}`).then(setPlay).catch((err) => setError(err.message));
  }, [playId]);

  if (!play) {
    return (
      <div className="card stack">
        <Banner>{error}</Banner>
        {!error ? <p>Counting your stars…</p> : <button type="button" className="btn" onClick={() => go('/class')}>Back to games</button>}
      </div>
    );
  }

  const livesOut = play.missCount >= 3 || play.answered < play.roundSize;
  return (
    <div className="stack results-wrap">
      {play.stars >= 3 ? <Confetti /> : null}
      <section className={`card result-card accent-${play.accent}`}>
        <p className="kicker">{play.topic}</p>
        <h1>{play.title}</h1>
        <Stars count={play.stars} size={64} />
        <p className="score-num">{play.score}</p>
        <p className="feedback-title">{lineFor(play.stars, livesOut)}</p>
        <p>You blasted {play.correctCount} of {play.answered}.</p>
        {play.bestStreak > 1 ? <p>Best streak: {play.bestStreak}</p> : null}
        <div className="row-actions">
          {play.check?.done ? (
            <button type="button" className="btn primary" onClick={() => go(`/play/checkup/${play.playId}`)}>
              Checkup {play.check.correct} of {play.check.total}
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={() => go(`/play/checkup/${play.playId}`)}>
              Quick checkup
            </button>
          )}
          <button type="button" className="btn" onClick={() => go('/class')}>Back to games</button>
        </div>
        <p className="muted">The checkup is optional. 8 short questions show what you learned.</p>
      </section>
    </div>
  );
}

function Confetti() {
  const bits = ['gold', 'teal', 'peach', 'lilac', 'gold', 'teal', 'peach', 'lilac', 'gold', 'peach'];
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((color, index) => <i key={index} className={`bit ${color}`} style={{ left: `${8 + index * 9}%`, animationDelay: `${index * 0.08}s` }} />)}
    </div>
  );
}
