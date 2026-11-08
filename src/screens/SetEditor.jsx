import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { go, useTitle } from '../nav.js';
import { Banner, Field } from '../ui.jsx';

const ACCENTS = [
  { id: 'gold', label: 'Gold' },
  { id: 'teal', label: 'Teal' },
  { id: 'lilac', label: 'Lilac' },
  { id: 'peach', label: 'Peach' },
];

function blankQuestion() {
  return { prompt: '', choices: ['', '', '', ''], correctIndex: 0 };
}

function emptySet() {
  return {
    title: '',
    topic: '',
    blurb: '',
    accent: 'gold',
    play: [blankQuestion()],
    check: [],
    assignmentId: null,
  };
}

export function SetEditor({ setId }) {
  const isNew = setId === 'new';
  useTitle(isNew ? 'New set' : 'Edit set');
  const [set, setSet] = useState(isNew ? emptySet() : null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isNew) return;
    api(`/api/sets/${setId}`).then((data) => setSet(data.set)).catch((err) => setError(err.message));
  }, [isNew, setId]);

  function updateQuestion(kind, index, next) {
    setSet((current) => ({
      ...current,
      [kind]: current[kind].map((question, itemIndex) => (itemIndex === index ? next : question)),
    }));
  }

  function removeQuestion(kind, index) {
    setSet((current) => {
      const next = current[kind].filter((_, itemIndex) => itemIndex !== index);
      return { ...current, [kind]: kind === 'play' && next.length === 0 ? [blankQuestion()] : next };
    });
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNote('');
    try {
      const body = {
        title: set.title,
        topic: set.topic,
        blurb: set.blurb,
        accent: set.accent,
        play: set.play,
        check: set.check,
      };
      const data = await api(isNew ? '/api/sets' : `/api/sets/${set.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body,
      });
      setSet(data.set);
      setNote('Saved.');
      if (isNew) go(`/teacher/sets/${data.set.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function assign() {
    setError('');
    try {
      const data = await api('/api/assignments', { method: 'POST', body: { setId: set.id } });
      setSet((current) => ({ ...current, assignmentId: data.assignmentId }));
      setNote(data.already ? 'Already assigned to your class.' : 'Assigned. Students can play it now.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeSet() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await api(`/api/sets/${set.id}`, { method: 'DELETE' });
      go('/class');
    } catch (err) {
      setError(err.message);
      setConfirmDelete(false);
    }
  }

  if (!set) return <p className="boot">{error || 'Loading the set…'}</p>;

  return (
    <form className="stack" onSubmit={save}>
      <button type="button" className="text-link" onClick={() => go('/class')}>Back to class</button>
      <h1 className="page-title">{isNew ? 'New question set' : 'Edit question set'}</h1>
      <Banner>{error}</Banner>
      <Banner kind="ok">{note}</Banner>

      <section className="card stack">
        <Field label="Name">
          <input value={set.title} onChange={(event) => setSet({ ...set, title: event.target.value })} maxLength={40} required />
        </Field>
        <Field label="Topic" hint="A short word, like Addition or Science.">
          <input value={set.topic} onChange={(event) => setSet({ ...set, topic: event.target.value })} maxLength={24} required />
        </Field>
        <Field label="One-line hint">
          <input value={set.blurb} onChange={(event) => setSet({ ...set, blurb: event.target.value })} maxLength={80} />
        </Field>
        <div className="field">
          <span>Color</span>
          <div className="swatches" role="radiogroup" aria-label="Set color">
            {ACCENTS.map((accent) => (
              <button
                key={accent.id}
                type="button"
                role="radio"
                aria-checked={set.accent === accent.id}
                className={`swatch accent-${accent.id} ${set.accent === accent.id ? 'is-on' : ''}`}
                onClick={() => setSet({ ...set, accent: accent.id })}
              >
                {accent.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <QuestionList
        title="Game questions"
        help="Kids blast these. A round uses up to 5, picked at random."
        questions={set.play}
        onAdd={() => set.play.length < 16 && setSet({ ...set, play: [...set.play, blankQuestion()] })}
        canAdd={set.play.length < 16}
        onChange={(index, question) => updateQuestion('play', index, question)}
        onRemove={(index) => removeQuestion('play', index)}
      />

      <QuestionList
        title="Learning checkup"
        help="After the stars, kids can answer up to 8 quick questions. You will see how the class did. If you leave this empty, the checkup uses the game questions."
        questions={set.check}
        onAdd={() => set.check.length < 8 && setSet({ ...set, check: [...set.check, blankQuestion()] })}
        canAdd={set.check.length < 8}
        onChange={(index, question) => updateQuestion('check', index, question)}
        onRemove={(index) => removeQuestion('check', index)}
        countLabel={`${set.check.length} of 8`}
      />

      <div className="save-bar">
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save set'}</button>
        {!isNew && set.id ? (
          set.assignmentId ? (
            <button type="button" className="btn teal" onClick={() => go(`/teacher/results/${set.assignmentId}`)}>View results</button>
          ) : (
            <button type="button" className="btn teal" onClick={assign}>Assign to class</button>
          )
        ) : null}
        {!isNew && set.id ? (
          <button type="button" className="btn quiet" onClick={removeSet}>
            {confirmDelete ? 'Tap again to delete' : 'Delete set'}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function QuestionList({ title, help, questions, onAdd, canAdd, onChange, onRemove, countLabel }) {
  return (
    <section className="stack">
      <div className="section-head">
        <h2>{title}</h2>
        {countLabel ? <span className="pill">{countLabel}</span> : null}
      </div>
      <p className="on-night">{help}</p>
      {questions.map((question, index) => (
        <fieldset key={index} className="card question-block">
          <legend>{title} {index + 1}</legend>
          <Field label="Question">
            <input
              value={question.prompt}
              onChange={(event) => onChange(index, { ...question, prompt: event.target.value })}
              maxLength={120}
            />
          </Field>
          <div className="stack">
            {question.choices.map((choice, choiceIndex) => (
              <div key={choiceIndex} className={question.correctIndex === choiceIndex ? 'choice-edit is-correct' : 'choice-edit'}>
                <label>
                  <span className="sr-only">Answer {choiceIndex + 1}</span>
                  <input
                    value={choice}
                    aria-label={`Answer ${choiceIndex + 1}`}
                    onChange={(event) => {
                      const choices = question.choices.slice();
                      choices[choiceIndex] = event.target.value;
                      onChange(index, { ...question, choices });
                    }}
                    maxLength={28}
                  />
                </label>
                <button
                  type="button"
                  className="btn small"
                  aria-pressed={question.correctIndex === choiceIndex}
                  onClick={() => onChange(index, { ...question, correctIndex: choiceIndex })}
                >
                  {question.correctIndex === choiceIndex ? 'Correct answer' : 'Mark correct'}
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn quiet" onClick={() => onRemove(index)}>Remove</button>
        </fieldset>
      ))}
      <button type="button" className="btn" onClick={onAdd} disabled={!canAdd}>Add question</button>
    </section>
  );
}
