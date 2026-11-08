import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { go, useTitle } from '../nav.js';
import { tone } from '../sound.js';
import { Banner } from '../ui.jsx';

const LIKED = [
  ['not_much', 'Not much'],
  ['okay', 'It was okay'],
  ['loved', 'I loved it'],
];

const EASE = [
  ['too_easy', 'Too easy'],
  ['just_right', 'Just right'],
  ['too_hard', 'Too hard'],
];

export function Checkup({ playId }) {
  useTitle('Checkup');
  const [play, setPlay] = useState(null);
  const [pack, setPack] = useState(null);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    Promise.all([api(`/api/plays/${playId}`), api(`/api/plays/${playId}/checkup`)])
      .then(([playData, checkup]) => {
        if (cancel) return;
        setPlay(playData);
        setPack(checkup);
        if (playData.survey) {
          setLiked(playData.survey.liked);
          setDifficulty(playData.survey.difficulty);
        }
        const done = checkup.total > 0 && checkup.answered.length >= checkup.total;
        if (done) {
          setSummary({
            correct: checkup.answered.filter((item) => item.correct).length,
            total: checkup.total,
          });
          setStarted(true);
        } else if (checkup.answered.length > 0) {
          setStarted(true);
          setIndex(checkup.answered.length);
        }
      })
      .catch((err) => {
        if (!cancel) setError(err.message);
      });
    return () => {
      cancel = true;
    };
  }, [playId]);

  async function saveSurvey(skipped) {
    await api(`/api/plays/${playId}/survey`, {
      method: 'POST',
      body: { liked, difficulty, skipped },
    });
  }

  async function skip() {
    setBusy(true);
    setError('');
    try {
      await saveSurvey(!liked && !difficulty);
      go('/class');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function begin() {
    setBusy(true);
    setError('');
    try {
      await saveSurvey(false);
      if (!pack?.questions?.length) {
        setSummary({ correct: 0, total: 0 });
      }
      setStarted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function pick(choiceIndex) {
    if (busy || feedback) return;
    const question = pack.questions[index];
    setBusy(true);
    setError('');
    try {
      const data = await api(`/api/plays/${playId}/checkup`, {
        method: 'POST',
        body: { questionId: question.id, choiceIndex },
      });
      setFeedback({ ...data, picked: choiceIndex });
      tone(data.correct ? 'ok' : 'miss');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function nextQuestion() {
    if (summary) return;
    setFeedback(null);
    setIndex((value) => value + 1);
  }

  if (error && !play) {
    return (
      <div className="card stack">
        <Banner>{error}</Banner>
        <button type="button" className="btn" onClick={() => go('/class')}>Back to games</button>
      </div>
    );
  }
  if (!play || !pack) return <p className="boot">Opening the checkup…</p>;

  if (summary) {
    const kind = summary.total === 0
      ? 'Thanks for telling us how it felt.'
      : summary.correct >= summary.total - 1
        ? 'You really learned this.'
        : summary.correct >= Math.ceil(summary.total / 2)
          ? 'You are getting it. Nice work.'
          : 'You practiced every question. That is how you grow.';
    return (
      <section className="card stack result-card">
        <p className="kicker">Checkup</p>
        <h1>{summary.total ? `${summary.correct} of ${summary.total}` : 'All done'}</h1>
        <p className="feedback-title">{kind}</p>
        <p>Your teacher can see how the class did. Not as a gotcha. Just to help.</p>
        <button type="button" className="btn primary" onClick={() => go('/class')}>Back to games</button>
      </section>
    );
  }

  if (!started) {
    return (
      <section className="card stack">
        <button type="button" className="text-link" onClick={() => go(`/play/results/${playId}`)}>Back to stars</button>
        <p className="kicker">Optional</p>
        <h1 className="page-title ink">How was the game?</h1>
        <p>You can skip this. It helps your teacher make the next game a better fit.</p>
        <fieldset className="stack">
          <legend>How did you like the game?</legend>
          <div className="survey-grid">
            {LIKED.map(([value, label]) => (
              <button key={value} type="button" className={liked === value ? 'survey-choice is-on' : 'survey-choice'} aria-pressed={liked === value} onClick={() => setLiked(value)}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="stack">
          <legend>Was it easy?</legend>
          <div className="survey-grid">
            {EASE.map(([value, label]) => (
              <button key={value} type="button" className={difficulty === value ? 'survey-choice is-on' : 'survey-choice'} aria-pressed={difficulty === value} onClick={() => setDifficulty(value)}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <Banner>{error}</Banner>
        <div className="row-actions">
          <button type="button" className="btn primary" onClick={begin} disabled={busy}>
            {pack.questions.length ? `Start ${pack.questions.length} questions` : 'Save'}
          </button>
          <button type="button" className="btn quiet" onClick={skip} disabled={busy}>Skip checkup</button>
        </div>
      </section>
    );
  }

  const question = pack.questions[index];
  if (!question) return <p className="boot">Loading the next question…</p>;

  return (
    <section className="card stack">
      <div className="dots" aria-hidden="true">
        {pack.questions.map((item, dot) => <i key={item.id} className={dot <= index ? 'is-on' : ''} />)}
      </div>
      <p className="kicker">Question {index + 1} of {pack.questions.length}</p>
      <h1 className="page-title ink">{question.prompt}</h1>
      <div className="stack">
        {question.choices.map((choice, choiceIndex) => {
          const correct = feedback && feedback.correctIndex === choiceIndex;
          const picked = feedback && feedback.picked === choiceIndex;
          const className = [
            'check-choice',
            correct ? 'is-right' : '',
            picked && feedback && !feedback.correct ? 'is-wrong' : '',
          ].filter(Boolean).join(' ');
          return (
            <button key={choice} type="button" className={className} disabled={!!feedback || busy} onClick={() => pick(choiceIndex)}>
              {choice}
            </button>
          );
        })}
      </div>
      {feedback ? (
        <div role="status">
          <p className="feedback-title">{feedback.correct ? 'Yes!' : 'Not quite.'}</p>
          {feedback.correct ? null : <p>The answer is {feedback.correctText}.</p>}
          {feedback.done ? (
            <button type="button" className="btn primary" onClick={() => setSummary({ correct: feedback.correctCount, total: feedback.total })}>
              See how I did
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={nextQuestion}>Next</button>
          )}
        </div>
      ) : null}
      <Banner>{error}</Banner>
    </section>
  );
}
