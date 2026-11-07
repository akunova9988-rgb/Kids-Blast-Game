import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { go, useTitle } from '../nav.js';
import { Banner, Field } from '../ui.jsx';

export function TeacherHome({ user }) {
  useTitle('Teacher');
  const [home, setHome] = useState(null);
  const [error, setError] = useState('');
  const [className, setClassName] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api('/api/home');
    setHome(data);
    if (data.class) setClassName(data.class.name);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function saveClass(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/class', { method: 'POST', body: { name: className } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function assign(setId) {
    setError('');
    try {
      await api('/api/assignments', { method: 'POST', body: { setId } });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!home) return <p className="boot">{error || 'Loading your class…'}</p>;

  return (
    <div className="stack">
      <div>
        <p className="kicker on-night">Hello, {user.displayName}</p>
        <h1 className="page-title">Your class</h1>
      </div>
      <Banner>{error}</Banner>

      <section className="card">
        {home.class ? (
          <>
            <form onSubmit={saveClass} className="stack">
              <Field label="Class name">
                <input value={className} onChange={(event) => setClassName(event.target.value)} maxLength={32} required />
              </Field>
              <button className="btn small" type="submit" disabled={busy}>Save name</button>
            </form>
            <p className="kicker">Class code</p>
            <p className="code">{home.class.joinCode}</p>
            <button type="button" className="btn small" onClick={() => copyCode(home.class.joinCode)}>
              {copied ? 'Copied' : 'Copy code'}
            </button>
            <p className="muted">Students use this code when they join.</p>
            <p>
              <strong>Students: </strong>
              {home.class.students.length
                ? home.class.students.map((student) => student.displayName).join(', ')
                : 'No one has joined yet.'}
            </p>
          </>
        ) : (
          <form onSubmit={saveClass} className="stack">
            <h2>Name your class</h2>
            <Field label="Class name" hint="Example: Room 2 Rockets">
              <input value={className} onChange={(event) => setClassName(event.target.value)} maxLength={32} required />
            </Field>
            <button className="btn primary" type="submit" disabled={busy}>Create class</button>
          </form>
        )}
      </section>

      <section className="stack">
        <div className="section-head">
          <h2>Assigned games</h2>
        </div>
        {home.games.length === 0 ? (
          <p className="card">Assign a question set and it shows up here for your class.</p>
        ) : (
          <div className="game-list">
            {home.games.map((game) => (
              <article key={game.id} className={`game-card accent-${game.accent}`}>
                <p className="kicker">{game.topic}</p>
                <h3>{game.title}</h3>
                <p>{game.blurb}</p>
                <p className="muted">{game.studentCount} played · {game.playCount} scores</p>
                <button type="button" className="btn primary" onClick={() => go(`/teacher/results/${game.id}`)}>Results</button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="stack">
        <div className="section-head">
          <h2>Question sets</h2>
          <button type="button" className="btn primary" onClick={() => go('/teacher/sets/new')}>New set</button>
        </div>
        <div className="game-list">
          {home.sets.map((set) => (
            <article key={set.id} className={`game-card accent-${set.accent}`}>
              <p className="kicker">{set.topic}</p>
              <h3>{set.title}</h3>
              <p>{set.playCount} game questions · {set.checkCount} checkup questions</p>
              <div className="row-actions">
                <button type="button" className="btn" onClick={() => go(`/teacher/sets/${set.id}`)}>Edit</button>
                {set.assignmentId ? (
                  <button type="button" className="btn quiet" onClick={() => go(`/teacher/results/${set.assignmentId}`)}>Results</button>
                ) : (
                  <button type="button" className="btn teal" onClick={() => assign(set.id)} disabled={!home.class}>Assign</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
