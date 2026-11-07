import { useState } from 'react';
import { api } from '../api.js';
import { useTitle } from '../nav.js';
import { Banner, Field, Rocket, SoundToggle } from '../ui.jsx';

const DEMOS = [
  { label: 'Ms. Nova', detail: 'Teacher', username: 'ms-nova', password: 'starlight' },
  { label: 'Luna', detail: 'Student', username: 'luna', password: 'rocket' },
  { label: 'Kai', detail: 'Student', username: 'kai', password: 'comet' },
  { label: 'Rio', detail: 'Student', username: 'rio', password: 'planet' },
];

export function Auth({ onUser }) {
  useTitle('Sign in');
  const [mode, setMode] = useState('in');
  const [role, setRole] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const path = mode === 'in' ? '/api/auth/login' : '/api/auth/signup';
      const body = mode === 'in'
        ? { username, password }
        : { username, password, displayName, role, joinCode };
      const data = await api(path, { method: 'POST', body });
      onUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function demo(account) {
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { username: account.username, password: account.password },
      });
      onUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="poster">
        <p className="kicker">Grades 1–4</p>
        <h1>Kids<br />Blast</h1>
        <p className="lede">Read the question. Blast the right answer. Earn stars.</p>
        <div className="poster-rocks" aria-hidden="true">
          <span className="mini-rock gold">5</span>
          <span className="mini-rock teal">star</span>
          <span className="mini-rock peach">see</span>
          <span className="mini-rock lilac">moon</span>
        </div>
        <ol className="poster-steps">
          <li>A question pops up.</li>
          <li>Tap the right asteroid.</li>
          <li>A miss costs a life, not your points.</li>
        </ol>
      </section>

      <section className="card auth-card">
        <div className="auth-tools">
          <Rocket className="life" />
          <SoundToggle />
        </div>
        <div className="segmented" role="tablist" aria-label="Sign in or create account">
          <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'is-on' : ''} onClick={() => setMode('in')}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'is-on' : ''} onClick={() => setMode('up')}>Create account</button>
        </div>
        <form onSubmit={submit} className="stack">
          {mode === 'up' ? (
            <>
              <div className="segmented" role="group" aria-label="I am a">
                <button type="button" className={role === 'student' ? 'is-on' : ''} onClick={() => setRole('student')}>Student</button>
                <button type="button" className={role === 'teacher' ? 'is-on' : ''} onClick={() => setRole('teacher')}>Teacher</button>
              </div>
              <Field label="Nickname" hint="Use a first name or nickname. Not a full real name.">
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={24} required autoComplete="nickname" />
              </Field>
            </>
          ) : null}
          <Field label="Username">
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="none" autoCorrect="off" maxLength={16} required autoComplete="username" />
          </Field>
          <Field label="Password" hint={mode === 'up' ? '4 or more letters. A class word is fine.' : null}>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === 'up' ? 4 : undefined} maxLength={32} required autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
          </Field>
          {mode === 'up' && role === 'student' ? (
            <Field label="Class code" hint="Optional. You can join later. The demo code is STAR2.">
              <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} maxLength={8} autoCapitalize="characters" />
            </Field>
          ) : null}
          <Banner>{error}</Banner>
          <button className="btn primary full" type="submit" disabled={busy}>
            {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <div className="demo">
          <p>Try the demo class</p>
          <div className="demo-grid">
            {DEMOS.map((account) => (
              <button key={account.username} type="button" className="demo-btn" onClick={() => demo(account)} disabled={busy}>
                <strong>{account.label}</strong>
                <span>{account.detail}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
