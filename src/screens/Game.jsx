import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { go, useTitle } from '../nav.js';
import { tone } from '../sound.js';
import { Banner, Lives, Rocket } from '../ui.jsx';

const YAY = ['Nice blast!', 'You got it!', 'Super star!', 'Boom! That is right!'];
const NOPE = ['Nice try!', 'Almost!', 'Keep going!', 'You will get the next one!'];

export function Game({ assignmentId }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('loading');
  const [playId, setPlayId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState({ score: 0, lives: 3, streak: 0, bestStreak: 0 });
  const [feedback, setFeedback] = useState(null);
  const [locked, setLocked] = useState(false);
  const [focus, setFocus] = useState(0);
  const [firing, setFiring] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const headingRef = useRef(null);
  const nextRef = useRef(null);
  const lockRef = useRef(false);

  useTitle(info?.title || 'Play');

  useEffect(() => {
    let cancel = false;
    api(`/api/assignments/${assignmentId}`)
      .then((data) => {
        if (cancel) return;
        setInfo(data);
        setPhase('ready');
      })
      .catch((err) => {
        if (!cancel) setError(err.message);
      });
    return () => {
      cancel = true;
    };
  }, [assignmentId]);

  useEffect(() => {
    if (phase === 'playing') headingRef.current?.focus();
    if (phase === 'feedback') nextRef.current?.focus();
  }, [phase, index]);

  function applyActive(active) {
    setPlayId(active.playId);
    setQuestions(active.questions);
    setIndex(active.index);
    setStats({
      score: active.score,
      lives: active.lives,
      streak: active.streak,
      bestStreak: active.bestStreak,
    });
    setFeedback(null);
    setFocus(0);
    setPhase('playing');
  }

  async function start() {
    if (lockRef.current) return;
    lockRef.current = true;
    setLocked(true);
    setError('');
    try {
      const data = await api('/api/plays', { method: 'POST', body: { assignmentId: Number(assignmentId) } });
      applyActive({
        playId: data.playId,
        questions: data.questions,
        index: 0,
        score: 0,
        lives: data.lives,
        streak: 0,
        bestStreak: 0,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      lockRef.current = false;
      setLocked(false);
    }
  }

  async function blast(choiceIndex) {
    if (lockRef.current || phase !== 'playing') return;
    const question = questions[index];
    if (!question) return;
    lockRef.current = true;
    setLocked(true);
    setFiring(true);
    window.setTimeout(() => setFiring(false), 280);
    try {
      const data = await api(`/api/plays/${playId}/answer`, {
        method: 'POST',
        body: { questionId: question.id, choiceIndex },
      });
      setStats({
        score: data.score,
        lives: data.lives,
        streak: data.streak,
        bestStreak: data.bestStreak,
      });
      setFeedback(data);
      setPhase('feedback');
      tone(data.correct ? 'ok' : 'miss');
      if (data.finished) tone('fanfare');
    } catch (err) {
      lockRef.current = false;
      setError(err.message);
    } finally {
      setLocked(false);
    }
  }

  function next() {
    if (!feedback) return;
    lockRef.current = false;
    if (feedback.finished) {
      go(`/play/results/${playId}`);
      return;
    }
    setIndex((value) => value + 1);
    setFeedback(null);
    setFocus(0);
    setPhase('playing');
  }

  useEffect(() => {
    function onKey(event) {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (phase === 'playing' && !locked) {
        const number = ['1', '2', '3', '4'].indexOf(event.key);
        if (number >= 0) {
          event.preventDefault();
          blast(number);
          return;
        }
        if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          const nextFocus = (focus + 1) % 4;
          setFocus(nextFocus);
          document.querySelector(`[data-choice="${nextFocus}"]`)?.focus();
        }
        if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          const nextFocus = (focus + 3) % 4;
          setFocus(nextFocus);
          document.querySelector(`[data-choice="${nextFocus}"]`)?.focus();
        }
      }
      if (phase === 'feedback' && (event.key === 'Enter' || event.key === ' ')) {
        if (tag === 'BUTTON') return;
        event.preventDefault();
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (error && !info) {
    return (
      <div className="card stack">
        <Banner>{error}</Banner>
        <button type="button" className="btn" onClick={() => go('/class')}>Back to games</button>
      </div>
    );
  }
  if (!info) return <p className="boot">Warming up the rockets…</p>;

  const question = questions[index];
  const accent = `accent-${info.accent || 'gold'}`;

  return (
    <div className={`game ${accent}`}>
      <div className="hud">
        <Lives lives={phase === 'ready' ? info.lives : stats.lives} />
        <p className="score-pill" aria-label={`Score ${stats.score}`}>{stats.score} pts</p>
        {stats.streak > 1 ? <p className="streak-pill">Streak {stats.streak}</p> : null}
      </div>
      <Banner>{error}</Banner>

      {phase === 'ready' ? (
        <section className="card stack ready">
          <p className="kicker">{info.topic}</p>
          <h1>{info.title}</h1>
          <p>{info.blurb}</p>
          <ul className="ready-list">
            <li>{info.roundSize} questions</li>
            <li>3 lives</li>
            <li>Tap the right answer, or press 1, 2, 3, or 4</li>
          </ul>
          <p>A hit is 100 points. A streak adds 50 more each time. A miss costs a life, not points.</p>
          {info.activePlay ? (
            <div className="row-actions">
              <button type="button" className="btn primary" onClick={() => applyActive(info.activePlay)}>Keep playing</button>
              <button type="button" className="btn" onClick={start} disabled={locked}>Start over</button>
            </div>
          ) : (
            <button type="button" className="btn primary big" onClick={start} disabled={locked || info.roundSize < 1}>
              Blast off!
            </button>
          )}
        </section>
      ) : null}

      {question && phase !== 'ready' ? (
        <>
          <section className="question-card" aria-live="polite">
            <p className="kicker">Question {index + 1} of {questions.length}</p>
            <h2 ref={headingRef} tabIndex={-1}>{question.prompt}</h2>
            {feedback ? (
              <div className="feedback-copy">
                <p className="feedback-title">{feedback.correct ? YAY[index % YAY.length] : NOPE[index % NOPE.length]}</p>
                {feedback.correct ? null : <p>The answer was {feedback.correctText}.</p>}
                {feedback.finished && feedback.lives <= 0 ? <p>That was the last life. You still earned stars.</p> : null}
              </div>
            ) : null}
          </section>
          <div className={`playfield ${phase === 'feedback' ? 'is-locked' : ''}`}>
            {question.choices.map((choice, choiceIndex) => {
              const picked = feedback && feedback.picked === choiceIndex;
              const correct = feedback && feedback.correctIndex === choiceIndex;
              const className = [
                'target',
                `target-${choiceIndex}`,
                correct ? 'is-correct' : '',
                picked && !feedback.correct ? 'is-picked' : '',
                focus === choiceIndex && phase === 'playing' ? 'is-focused' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={choice}
                  type="button"
                  className={className}
                  data-choice={choiceIndex}
                  disabled={phase !== 'playing' || locked}
                  onClick={() => blast(choiceIndex)}
                  aria-keyshortcuts={String(choiceIndex + 1)}
                  aria-label={`Answer ${choiceIndex + 1}: ${choice}`}
                >
                  <span className="badge">{choiceIndex + 1}</span>
                  <span className="target-label">{choice}</span>
                </button>
              );
            })}
          </div>
          <div className="ship-row">
            <Rocket className={firing ? 'ship is-firing' : 'ship'} />
            {phase === 'feedback' ? (
              <button ref={nextRef} type="button" className="btn primary big" onClick={next}>
                {feedback.finished ? 'See my stars' : 'Next question'}
              </button>
            ) : (
              <p className="hint">Tap an asteroid, or press 1–4.</p>
            )}
          </div>
        </>
      ) : null}

      {leaving ? (
        <div className="leave-box card">
          <p>Leave this round? Stars are saved when you finish.</p>
          <div className="row-actions">
            <button type="button" className="btn primary" onClick={() => setLeaving(false)}>Stay</button>
            <button type="button" className="btn" onClick={() => go('/class')}>Leave</button>
          </div>
        </div>
      ) : (
        <button type="button" className="text-link" onClick={() => (phase === 'ready' ? go('/class') : setLeaving(true))}>
          Exit
        </button>
      )}
    </div>
  );
}
