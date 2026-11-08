import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../supabase.js';
import { SUBJECTS } from '../topics.js';
import { Banner, Field } from '../ui.jsx';
import { InstantPlay } from './InstantPlay.jsx';

const SUBJECT_NAME = Object.fromEntries(SUBJECTS.map((item) => [item.id, item.title]));

function subjectName(id) {
  return SUBJECT_NAME[id] || id;
}

function when(value) {
  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mean(rows) {
  if (!rows.length) return null;
  return Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length);
}

export function Accounts() {
  const [client, setClient] = useState(null);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let stop = () => {};
    let live = true;
    getSupabase().then((supabase) => {
      if (!live) return;
      setClient(supabase);
      setReady(true);
      if (!supabase) return;
      supabase.auth.getSession().then(({ data }) => {
        if (live) setSession(data.session ?? null);
      });
      const { data } = supabase.auth.onAuthStateChange((event, next) => {
        setSession(next);
        if (event === 'SIGNED_OUT') setPlaying(false);
      });
      stop = () => data.subscription.unsubscribe();
    }).catch(() => {
      if (live) {
        setClient(null);
        setReady(true);
      }
    });
    return () => {
      live = false;
      stop();
    };
  }, []);

  useEffect(() => {
    if (!client || !session) return undefined;
    let live = true;
    setProfile(undefined);
    client.from('profiles')
      .select('id, role, display_name, class_code')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setProfile(null);
        else setProfile(data);
      });
    return () => {
      live = false;
    };
  }, [client, session]);

  if (!session) return <SignForm client={client} ready={ready} />;
  if (profile === undefined) return <p className="boot">Ищем профиль…</p>;
  if (!profile) return <MissingProfile client={client} />;

  if (playing && profile.role === 'student') {
    return (
      <InstantPlay
        onExit={() => setPlaying(false)}
        onResult={(row) => saveResult(client, profile.id, row)}
      />
    );
  }

  if (profile.role === 'teacher') {
    return <TeacherDesk client={client} profile={profile} />;
  }
  return <StudentDesk client={client} profile={profile} onPlay={() => setPlaying(true)} />;
}

function MissingProfile({ client }) {
  return (
    <section className="card stack">
      <h1>Профиль не создался</h1>
      <p>Выполни SQL из supabase/migrations/001_profiles_and_results.sql и зарегистрируйся снова.</p>
      <button type="button" className="btn" onClick={() => client.auth.signOut()}>Выйти</button>
    </section>
  );
}

function SignForm({ client, ready }) {
  const [mode, setMode] = useState('in');
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNote('');
    try {
      if (!client) {
        throw new Error(ready
          ? 'Вход сейчас недоступен: кабинет не подключён.'
          : 'Подключаемся. Нажми ещё раз.');
      }
      if (mode === 'in') {
        const { error: signError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (signError) throw signError;
        return;
      }
      const displayName = name.trim();
      if (displayName.length < 2) throw new Error('Имя должно быть хотя бы из двух букв.');
      if (password.length < 8) throw new Error('Пароль должен быть не короче 8 символов.');
      const code = classCode.trim().toUpperCase();
      if (role === 'student' && code.length < 4) throw new Error('Введи код класса от учителя.');
      const { data, error: signError } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role,
            display_name: displayName,
            class_code: role === 'student' ? code : '',
          },
        },
      });
      if (signError) throw signError;
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError('Такой email уже зарегистрирован.');
        return;
      }
      if (!data.session) {
        setNote('Письмо отправлено. Подтверди почту, затем войди.');
        setMode('in');
      }
    } catch (err) {
      setError(plainError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack auth-card sky-card">
      <p className="kicker">Kids Blast</p>
      <h1>{mode === 'in' ? 'Вход' : 'Регистрация'}</h1>
      <form className="stack" onSubmit={submit}>
        {mode === 'up' ? (
          <Field label="Имя">
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} required />
          </Field>
        ) : null}
        <Field label="Email">
          <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Пароль">
          <input
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        {mode === 'up' ? (
          <>
            <div className="role-pick" role="group" aria-label="Роль">
              <button type="button" aria-pressed={role === 'student'} onClick={() => setRole('student')}>Ученик</button>
              <button type="button" aria-pressed={role === 'teacher'} onClick={() => setRole('teacher')}>Учитель</button>
            </div>
            {role === 'student' ? (
              <Field label="Код класса" hint="Его даёт учитель">
                <input
                  value={classCode}
                  onChange={(event) => setClassCode(event.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={8}
                  required
                />
              </Field>
            ) : (
              <p>После регистрации появится код класса. Его вводят ученики.</p>
            )}
          </>
        ) : null}
        {error ? <Banner>{error}</Banner> : null}
        {note ? <p>{note}</p> : null}
        <button type="submit" className="btn primary big" disabled={busy}>
          {busy ? 'Секунду…' : mode === 'in' ? 'Войти' : 'Создать кабинет'}
        </button>
      </form>
      <button
        type="button"
        className="btn"
        onClick={() => {
          setMode(mode === 'in' ? 'up' : 'in');
          setError('');
          setNote('');
        }}
      >
        {mode === 'in' ? 'Нет кабинета? Зарегистрироваться' : 'Уже есть кабинет? Войти'}
      </button>
    </section>
  );
}

function StudentDesk({ client, profile, onPlay }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    client.from('results')
      .select('id, subject, level, score, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error: readError }) => {
        if (!live) return;
        if (readError) {
          setError(readError.message);
          setRows([]);
        } else setRows(data || []);
      });
    return () => {
      live = false;
    };
  }, [client]);

  const progress = useMemo(() => {
    const list = rows || [];
    return SUBJECTS.map((subject) => {
      const mine = list.filter((row) => row.subject === subject.id);
      return {
        id: subject.id,
        title: subject.title,
        count: mine.length,
        best: mine.length ? Math.max(...mine.map((row) => row.score)) : null,
      };
    });
  }, [rows]);

  const best = rows?.length ? Math.max(...rows.map((row) => row.score)) : null;

  return (
    <section className="card stack sky-card desk">
      <DeskBar name={profile.display_name} onLogout={() => client.auth.signOut()} />
      <p className="kicker">Кабинет ученика · класс {profile.class_code}</p>
      <h1>Привет, {profile.display_name}</h1>
      <button type="button" className="btn primary big" onClick={onPlay}>Начать полёт</button>
      {error ? <Banner>{error}</Banner> : null}
      {rows === null ? <p>Загружаем результаты…</p> : null}
      {rows ? (
        <>
          <p className="mark-line">{best === null ? 'Тестов пока нет' : `Лучший результат ${best}%`}</p>
          <div className="progress-grid">
            {progress.map((item) => (
              <article key={item.id} className="progress-card">
                <h2>{item.title}</h2>
                <p>{item.count ? `${item.count} тест.` : 'Ещё не было'}</p>
                <p>{item.best === null ? '—' : `Лучший ${item.best}%`}</p>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${item.best || 0}%` }} />
                </div>
              </article>
            ))}
          </div>
          <h2>История</h2>
          {rows.length === 0 ? <p>Пройди итоговый тест, и он появится здесь.</p> : (
            <ul className="history">
              {rows.map((row) => (
                <li key={row.id}>
                  <strong>{subjectName(row.subject)}</strong>
                  <span>Уровень {row.level}</span>
                  <span>{row.score}%</span>
                  <time dateTime={row.created_at}>{when(row.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}

function TeacherDesk({ client, profile }) {
  const [students, setStudents] = useState(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });

  useEffect(() => {
    let live = true;
    Promise.all([
      client.from('profiles').select('id, display_name').eq('role', 'student'),
      client.from('results').select('id, student_id, subject, level, score, created_at'),
    ]).then(([people, scores]) => {
      if (!live) return;
      if (people.error || scores.error) {
        setError(people.error?.message || scores.error?.message);
        setStudents([]);
        setRows([]);
        return;
      }
      setStudents(people.data || []);
      setRows(scores.data || []);
    });
    return () => {
      live = false;
    };
  }, [client]);

  const names = useMemo(() => {
    const map = new Map((students || []).map((student) => [student.id, student.display_name]));
    return map;
  }, [students]);

  const table = useMemo(() => {
    const list = (rows || []).map((row) => ({
      ...row,
      name: names.get(row.student_id) || 'Ученик',
      subjectTitle: subjectName(row.subject),
      date: new Date(row.created_at).getTime(),
    }));
    const factor = sort.dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      if (typeof left === 'string') return left.localeCompare(right, 'ru') * factor;
      return (left - right) * factor;
    });
    return list;
  }, [rows, names, sort]);

  const average = mean(rows || []);

  function toggle(key) {
    setSort((current) => (
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' || key === 'subjectTitle' ? 'asc' : 'desc' }
    ));
  }

  return (
    <section className="card stack sky-card desk">
      <DeskBar name={profile.display_name} onLogout={() => client.auth.signOut()} />
      <p className="kicker">Кабинет учителя</p>
      <h1>Класс {profile.class_code}</h1>
      <p>Ученики вводят этот код при регистрации. Здесь только их результаты.</p>
      {error ? <Banner>{error}</Banner> : null}
      {students === null || rows === null ? <p>Загружаем класс…</p> : (
        <>
          <div className="progress-grid">
            <article className="progress-card">
              <h2>Ученики</h2>
              <p className="mark-line">{students.length}</p>
            </article>
            <article className="progress-card">
              <h2>Средний балл</h2>
              <p className="mark-line">{average === null ? '—' : `${average}%`}</p>
            </article>
          </div>
          {students.length === 0 ? <p>Пока никто не ввёл код класса.</p> : (
            <ul className="history">
              {students.map((student) => {
                const mine = (rows || []).filter((row) => row.student_id === student.id);
                const bySubject = SUBJECTS.map((subject) => {
                  const tests = mine.filter((row) => row.subject === subject.id);
                  return `${subject.title}: ${tests.length ? `${mean(tests)}% · ${tests.length}` : '—'}`;
                }).join(' · ');
                return (
                  <li key={student.id}>
                    <strong>{student.display_name}</strong>
                    <span>{mine.length ? `средний ${mean(mine)}%` : 'тестов нет'}</span>
                    <span>{bySubject}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <h2>Все тесты</h2>
          <div className="desk-scroll">
            <table className="score-table">
              <thead>
                <tr>
                  <SortHead label="Ученик" column="name" sort={sort} onSort={toggle} />
                  <SortHead label="Предмет" column="subjectTitle" sort={sort} onSort={toggle} />
                  <SortHead label="Уровень" column="level" sort={sort} onSort={toggle} />
                  <SortHead label="Балл" column="score" sort={sort} onSort={toggle} />
                  <SortHead label="Дата" column="date" sort={sort} onSort={toggle} />
                </tr>
              </thead>
              <tbody>
                {table.length === 0 ? (
                  <tr><td colSpan={5}>Результатов пока нет.</td></tr>
                ) : table.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.subjectTitle}</td>
                    <td>{row.level}</td>
                    <td>{row.score}%</td>
                    <td>{when(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function SortHead({ label, column, sort, onSort }) {
  const active = sort.key === column;
  const mark = active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
  return (
    <th aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(column)}>{label}{mark}</button>
    </th>
  );
}

function DeskBar({ name, onLogout }) {
  return (
    <div className="desk-bar">
      <span>{name}</span>
      <button type="button" className="btn small" onClick={onLogout}>Выйти</button>
    </div>
  );
}

async function saveResult(client, studentId, row) {
  const { error } = await client.from('results').insert({
    student_id: studentId,
    subject: row.subject,
    level: row.level,
    score: row.score,
  });
  if (error) throw error;
}

function plainError(error) {
  const message = error?.message || 'Не получилось.';
  if (/invalid login/i.test(message)) return 'Неверный email или пароль.';
  if (/already registered/i.test(message)) return 'Такой email уже зарегистрирован.';
  if (/class/i.test(message) && /не найден/i.test(message)) return 'Код класса не найден.';
  if (/email/i.test(message) && /confirm/i.test(message)) return 'Сначала подтверди почту.';
  return message;
}
