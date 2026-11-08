import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { go, useTitle } from '../nav.js';
import { Banner, Stars, formatWhen } from '../ui.jsx';

const LIKED = [
  ['loved', 'I loved it', 'gold'],
  ['okay', 'It was okay', 'lilac'],
  ['not_much', 'Not much', 'peach'],
];

const EASE = [
  ['too_easy', 'Too easy', 'gold'],
  ['just_right', 'Just right', 'teal'],
  ['too_hard', 'Too hard', 'peach'],
];

export function TeacherResults({ assignmentId }) {
  useTitle('Results');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/results/${assignmentId}`).then(setData).catch((err) => setError(err.message));
  }, [assignmentId]);

  if (!data) return <p className="boot">{error || 'Loading results…'}</p>;

  const likedMax = Math.max(1, ...Object.values(data.liked));
  const easeMax = Math.max(1, ...Object.values(data.difficulty));

  return (
    <div className="stack">
      <button type="button" className="text-link" onClick={() => go('/class')}>Back to class</button>
      <p className="kicker on-night">{data.game.className} · {data.game.topic}</p>
      <h1 className="page-title">{data.game.title}</h1>
      <Banner>{error}</Banner>

      <div className="stat-grid">
        <article className="card stat">
          <p className="kicker">Played</p>
          <p className="stat-num">{data.summary.studentsPlayed}<span> / {data.summary.classSize}</span></p>
        </article>
        <article className="card stat">
          <p className="kicker">Average best score</p>
          <p className="stat-num">{data.summary.avgBestScore}</p>
        </article>
        <article className="card stat">
          <p className="kicker">Learning checkup</p>
          <p className="stat-num">{data.summary.checkPercent == null ? '—' : `${data.summary.checkPercent}%`}</p>
        </article>
      </div>

      <section className="card stack">
        <h2>How did they like it?</h2>
        <p className="muted">{data.summary.surveyStudents} kids shared how it felt. Feelings stay grouped, not listed by name.</p>
        {LIKED.map(([key, label, color]) => (
          <Meter key={key} label={label} count={data.liked[key]} max={likedMax} color={color} />
        ))}
        <h2>Was it easy?</h2>
        {EASE.map(([key, label, color]) => (
          <Meter key={key} label={label} count={data.difficulty[key]} max={easeMax} color={color} />
        ))}
      </section>

      <section className="card stack">
        <h2>What the class learned</h2>
        {data.checks.length === 0 ? (
          <p>No checkup answers yet. After a game, kids can answer 8 quick questions.</p>
        ) : (
          <ol className="check-results">
            {data.checks.map((item) => (
              <li key={item.prompt}>
                <p>{item.prompt}</p>
                <Meter
                  label={`${item.correct} of ${item.total} got it`}
                  count={item.correct}
                  max={Math.max(1, item.total)}
                  color="teal"
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="stack">
        <h2 className="on-night">Who played</h2>
        <div className="game-list">
          {data.roster.map((student) => (
            <article key={student.studentId} className="card roster-card">
              <h3>{student.name}</h3>
              {student.played ? (
                <>
                  <p className="stat-num small-num">{student.bestScore}</p>
                  <Stars count={student.bestStars} size={28} />
                  <p className="muted">
                    Best score · {student.plays} {student.plays === 1 ? 'play' : 'plays'}
                    {student.lastPlayed ? ` · ${formatWhen(student.lastPlayed)}` : ''}
                  </p>
                  <p>{student.checkup ? `Checkup ${student.checkup.correct} of ${student.checkup.total}` : 'No checkup yet'}</p>
                </>
              ) : (
                <p>Has not played yet.</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Meter({ label, count, max, color }) {
  const width = Math.round((count / max) * 100);
  return (
    <div className="bar-row">
      <span>{label}</span>
      <span className="meter" aria-hidden="true"><span className={`fill-${color}`} style={{ width: `${width}%` }} /></span>
      <span>{count}</span>
    </div>
  );
}
