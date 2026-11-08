import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { go, useTitle } from '../nav.js';
import { Banner, Field, Stars } from '../ui.jsx';

export function StudentHome({ user }) {
  useTitle('Games');
  const [home, setHome] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    return api('/api/home').then(setHome);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function join(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/class/join', { method: 'POST', body: { code } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!home) return <p className="boot">{error || 'Loading your games…'}</p>;

  if (!home.class) {
    return (
      <form className="card stack narrow" noValidate onSubmit={join}>
        <p className="kicker">Hi, {user.displayName}</p>
        <h1 className="page-title ink">Join your class</h1>
        <Field label="Class code" hint="Ask your teacher. The demo code is STAR2.">
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={8} autoCapitalize="characters" required />
        </Field>
        <Banner>{error}</Banner>
        <button className="btn primary" type="submit" disabled={busy}>Join</button>
      </form>
    );
  }

  return (
    <div className="stack">
      <div>
        <p className="kicker on-night">{home.class.name}</p>
        <h1 className="page-title">Pick a game</h1>
        <p className="on-night">Hi, {user.displayName}. Blast the right answer.</p>
      </div>
      <Banner>{error}</Banner>
      {home.games.length === 0 ? (
        <p className="card">Your teacher has not assigned a game yet.</p>
      ) : (
        <div className="game-list">
          {home.games.map((game) => (
            <article key={game.id} className={`game-card accent-${game.accent}`}>
              <p className="kicker">{game.topic}</p>
              <h3>{game.title}</h3>
              <p>{game.blurb}</p>
              {game.bestScore != null ? (
                <div className="best">
                  <span>Your best {game.bestScore}</span>
                  <Stars count={game.bestStars} size={26} />
                </div>
              ) : (
                <p className="muted">{game.roundSize} questions · 3 lives</p>
              )}
              <button type="button" className="btn primary" onClick={() => go(`/play/${game.id}`)}>Play</button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
