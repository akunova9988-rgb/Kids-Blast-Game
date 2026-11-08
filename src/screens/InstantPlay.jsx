import { useEffect, useRef, useState } from 'react';
import { makeRound, starsFor } from '../sets.js';
import { tone } from '../sound.js';
import { Lives, Rocket, SoundToggle, Stars } from '../ui.jsx';

const YAY = ['Nice blast!', 'You got it!', 'Super star!', 'Boom! That is right!'];
const NOPE = ['Nice try!', 'Almost!', 'Keep going!', 'You will get the next one!'];

function fresh(setIndex) {
  return {
    round: makeRound(setIndex),
    index: 0,
    score: 0,
    lives: 3,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    missCount: 0,
    feedback: null,
    stars: null,
  };
}

export function InstantPlay() {
  const [state, setState] = useState(() => fresh(0));
  const [focus, setFocus] = useState(0);
  const [firing, setFiring] = useState(false);
  const lockRef = useRef(false);
  const headingRef = useRef(null);
  const nextRef = useRef(null);
  const againRef = useRef(null);

  const { round, index, feedback, stars } = state;
  const question = round.questions[index];
  const playing = !feedback && !stars;

  useEffect(() => {
    document.title = 'Kids Blast';
  }, []);

  useEffect(() => {
    if (playing) headingRef.current?.focus();
    if (feedback) nextRef.current?.focus();
    if (stars) againRef.current?.focus();
  }, [playing, feedback, stars, index]);

  function blast(choiceIndex) {
    if (lockRef.current || !playing) return;
    const current = question;
    if (!current) return;
    lockRef.current = true;
    setFiring(true);
    window.setTimeout(() => setFiring(false), 280);
    const correct = choiceIndex === current.correctIndex;
    setState((prev) => {
      let streak = prev.streak;
      let score = prev.score;
      let lives = prev.lives;
      let correctCount = prev.correctCount;
      let missCount = prev.missCount;
      let bestStreak = prev.bestStreak;
      if (correct) {
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
        score += 100 + (streak - 1) * 50;
        correctCount += 1;
      } else {
        streak = 0;
        missCount += 1;
        lives = Math.max(0, lives - 1);
      }
      const cursor = prev.index + 1;
      const finished = lives <= 0 || cursor >= prev.round.questions.length;
      return {
        ...prev,
        score,
        lives,
        streak,
        bestStreak,
        correctCount,
        missCount,
        feedback: {
          correct,
          correctIndex: current.correctIndex,
          correctText: current.choices[current.correctIndex],
          picked: choiceIndex,
          finished,
          lives,
        },
      };
    });
    tone(correct ? 'ok' : 'miss');
  }

  function showStars() {
    lockRef.current = false;
    setState((prev) => ({
      ...prev,
      stars: starsFor({
        correctCount: prev.correctCount,
        missCount: prev.missCount,
        roundSize: prev.round.questions.length,
      }),
    }));
  }

  useEffect(() => {
    if (feedback?.finished) tone('fanfare');
  }, [feedback]);

  function next() {
    if (!feedback) return;
    lockRef.current = false;
    if (feedback.finished) return;
    setFocus(0);
    setState((prev) => ({ ...prev, index: prev.index + 1, feedback: null }));
  }

  function again() {
    lockRef.current = false;
    setFocus(0);
    setState((prev) => fresh(prev.round.setIndex + 1));
  }

  useEffect(() => {
    function onKey(event) {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (stars && (event.key === 'Enter' || event.key === ' ')) {
        if (tag === 'BUTTON') return;
        event.preventDefault();
        again();
        return;
      }
      if (playing) {
        const number = ['1', '2', '3', '4'].indexOf(event.key);
        if (number >= 0) {
          event.preventDefault();
          blast(number);
          return;
        }
        if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          setFocus((value) => {
            const nextFocus = (value + 1) % 4;
            document.querySelector(`[data-choice="${nextFocus}"]`)?.focus();
            return nextFocus;
          });
        }
        if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          setFocus((value) => {
            const nextFocus = (value + 3) % 4;
            document.querySelector(`[data-choice="${nextFocus}"]`)?.focus();
            return nextFocus;
          });
        }
      }
      if (feedback && !feedback.finished && (event.key === 'Enter' || event.key === ' ')) {
        if (tag === 'BUTTON') return;
        event.preventDefault();
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`game arcade accent-${round.accent}`}>
      <div className="hud">
        <p className="arcade-name">Kids Blast</p>
        <Lives lives={state.lives} />
        <p className="score-pill" aria-label={`Score ${state.score}`}>{state.score} pts</p>
        {state.streak > 1 ? <p className="streak-pill">Streak {state.streak}</p> : null}
        <SoundToggle />
      </div>

      {stars ? (
        <section className="card stack result-card arcade-result">
          <p className="kicker">{round.topic}</p>
          <Stars count={stars} />
          <p className="score-num">{state.score}</p>
          <p>
            {state.correctCount} right
            {state.missCount ? ` · ${state.missCount} missed` : ''}
            {state.bestStreak > 1 ? ` · best streak ${state.bestStreak}` : ''}
          </p>
          <button ref={againRef} type="button" className="btn primary big" onClick={again}>Play again</button>
        </section>
      ) : (
        <>
          <section className="question-card" aria-live="polite">
            <p className="kicker">Question {index + 1} of {round.questions.length}</p>
            <h2 ref={headingRef} tabIndex={-1}>{question.prompt}</h2>
            {feedback ? (
              <div className="feedback-copy">
                <p className="feedback-title">{feedback.correct ? YAY[index % YAY.length] : NOPE[index % NOPE.length]}</p>
                {feedback.correct ? null : <p>The answer was {feedback.correctText}.</p>}
                {feedback.finished && feedback.lives <= 0 ? <p>That was the last life. You still earned stars.</p> : null}
              </div>
            ) : null}
          </section>
          <div className={`playfield ${feedback ? 'is-locked' : ''}`}>
            {question.choices.map((choice, choiceIndex) => {
              const picked = feedback && feedback.picked === choiceIndex;
              const correct = feedback && feedback.correctIndex === choiceIndex;
              const className = [
                'target',
                `target-${choiceIndex}`,
                correct ? 'is-correct' : '',
                picked && !feedback.correct ? 'is-picked' : '',
                focus === choiceIndex && playing ? 'is-focused' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={`${question.prompt}-${choice}`}
                  type="button"
                  className={className}
                  data-choice={choiceIndex}
                  disabled={Boolean(feedback)}
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
            {feedback ? (
              <button ref={nextRef} type="button" className="btn primary big" onClick={feedback.finished ? showStars : next}>
                {feedback.finished ? 'See my stars' : 'Next question'}
              </button>
            ) : (
              <p className="hint">Tap an asteroid, or press 1–4.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
