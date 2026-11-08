import { useEffect, useState } from 'react';
import { api } from './api.js';
import { go, usePath } from './nav.js';
import { Auth } from './screens/Auth.jsx';
import { Checkup } from './screens/Checkup.jsx';
import { Game } from './screens/Game.jsx';
import { Accounts } from './screens/Accounts.jsx';
import { RoundResults } from './screens/RoundResults.jsx';
import { SetEditor } from './screens/SetEditor.jsx';
import { StudentHome } from './screens/StudentHome.jsx';
import { TeacherHome } from './screens/TeacherHome.jsx';
import { TeacherResults } from './screens/TeacherResults.jsx';
import { SoundToggle } from './ui.jsx';

function piece(path, prefix) {
  if (!path.startsWith(prefix)) return null;
  const rest = path.slice(prefix.length).split('/')[0];
  return rest || null;
}

function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      <span className="planet-peach" />
      <span className="planet-teal" />
    </div>
  );
}

function isClassroom(path) {
  return path.startsWith('/class') || path.startsWith('/teacher') || path.startsWith('/play');
}

export function App() {
  const path = usePath();
  if (!isClassroom(path)) {
    return (
      <>
        <Sky />
        <div className="shell arcade-shell">
          <a className="skip" href="#main">К содержанию</a>
          <main id="main">
            <Accounts />
          </main>
        </div>
      </>
    );
  }
  return <Classroom path={path} />;
}

function Classroom({ path }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api('/api/me').then((data) => setUser(data.user)).catch(() => setUser(null));
  }, []);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    go('/class');
  }

  return (
    <>
      <Sky />
      <div className="shell">
        <a className="skip" href="#main">Skip to content</a>
        {user ? (
          <header className="topbar">
            <button type="button" className="logo" onClick={() => go('/class')}>Kids Blast</button>
            <div className="top-actions">
              <SoundToggle />
              <span className="who">{user.displayName}</span>
              <button type="button" className="btn small" onClick={logout}>Log out</button>
            </div>
          </header>
        ) : null}
        <main id="main">
          {user === undefined ? <p className="boot">Getting the rockets ready…</p> : null}
          {user === null ? <Auth onUser={setUser} /> : null}
          {user ? <Routes user={user} path={path} /> : null}
        </main>
      </div>
    </>
  );
}

function Routes({ user, path }) {
  if (user.role === 'teacher') {
    const resultId = piece(path, '/teacher/results/');
    if (resultId && /^\d+$/.test(resultId)) return <TeacherResults assignmentId={resultId} />;
    const setId = piece(path, '/teacher/sets/');
    if (setId === 'new' || (setId && /^\d+$/.test(setId))) return <SetEditor setId={setId} />;
    if (path === '/class' || path === '/teacher' || path === '/teacher/') return <TeacherHome user={user} />;
    return (
      <div className="card stack">
        <h1>That page flew away.</h1>
        <button type="button" className="btn primary" onClick={() => go('/class')}>Back to class</button>
      </div>
    );
  }

  const checkupId = piece(path, '/play/checkup/');
  if (checkupId && /^\d+$/.test(checkupId)) return <Checkup playId={checkupId} />;
  const resultId = piece(path, '/play/results/');
  if (resultId && /^\d+$/.test(resultId)) return <RoundResults playId={resultId} />;
  const gameId = piece(path, '/play/');
  if (gameId && /^\d+$/.test(gameId)) return <Game assignmentId={gameId} />;
  if (path === '/class' || path === '/class/') return <StudentHome user={user} />;
  return (
    <div className="card stack">
      <h1>That page flew away.</h1>
      <button type="button" className="btn primary" onClick={() => go('/class')}>Back to games</button>
    </div>
  );
}
