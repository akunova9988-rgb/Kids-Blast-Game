import { randomBytes } from 'node:crypto';
import {
  ACCENTS,
  ROUND_SIZE,
  START_LIVES,
  cleanLine,
  cleanName,
  cleanPassword,
  cleanUsername,
  computeStars,
  dealChoices,
  dummyHash,
  makeCode,
  nowIso,
  publicQuestion,
  shuffle,
  validateQuestion,
  verifyPassword,
  hashPassword,
} from './logic.js';

const hits = new Map();

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function setCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    [`kb_session=${token}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=2592000'].join('; '),
  );
}

function clearCookie(res) {
  res.setHeader('Set-Cookie', 'kb_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}

function intId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function limited(req, res) {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 40) {
    res.status(429).json({ error: 'Too many tries. Wait a minute and try again.' });
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

function sameSite(req, res) {
  const site = req.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    res.status(403).json({ error: 'Blocked.' });
    return false;
  }
  return true;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    classId: user.class_id,
  };
}

function choicesOf(deal) {
  return JSON.parse(deal.choices_json);
}

function dealView(deal) {
  return {
    id: deal.question_id,
    prompt: deal.prompt,
    choices: choicesOf(deal),
  };
}

export function mountApi(app, db) {
  function userFrom(req) {
    const token = readCookie(req, 'kb_session');
    if (!token) return null;
    return (
      db.prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
      ).get(token) || null
    );
  }

  function requireUser(req, res) {
    const user = userFrom(req);
    if (!user) {
      res.status(401).json({ error: 'Please sign in first.' });
      return null;
    }
    return user;
  }

  function requireRole(req, res, role) {
    const user = requireUser(req, res);
    if (!user) return null;
    if (user.role !== role) {
      res.status(403).json({ error: 'That page is for a different login.' });
      return null;
    }
    return user;
  }

  function startSession(res, user) {
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
      token,
      user.id,
      nowIso(),
    );
    setCookie(res, token);
  }

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'GET' && req.method !== 'HEAD' && !sameSite(req, res)) return;
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/me', (req, res) => {
    const user = userFrom(req);
    res.json({ user: user ? publicUser(user) : null });
  });

  app.post('/api/auth/signup', (req, res) => {
    if (limited(req, res)) return;
    const username = cleanUsername(req.body?.username);
    const password = cleanPassword(req.body?.password);
    const displayName = cleanName(req.body?.displayName, 24);
    const role = req.body?.role === 'teacher' ? 'teacher' : req.body?.role === 'student' ? 'student' : null;
    if (!username) return res.status(400).json({ error: 'Use 3 to 16 letters or numbers for the username.' });
    if (!password) return res.status(400).json({ error: 'Use a password of 4 to 32 letters or numbers, with no spaces.' });
    if (!displayName) return res.status(400).json({ error: 'Add a nickname with letters, like Luna or Ms. Nova.' });
    if (!role) return res.status(400).json({ error: 'Pick student or teacher.' });
    if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n >= 500) {
      return res.status(400).json({ error: 'This class server is full.' });
    }

    const code = cleanLine(req.body?.joinCode || '', 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
    let classId = null;
    if (role === 'student' && code) {
      const klass = db.prepare('SELECT id FROM classes WHERE join_code = ?').get(code);
      if (!klass) return res.status(400).json({ error: 'That class code did not match.' });
      classId = klass.id;
    }

    try {
      const id = Number(
        db.prepare(
          `INSERT INTO users (username, password_hash, role, display_name, class_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(username, hashPassword(password), role, displayName, classId, nowIso()).lastInsertRowid,
      );
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      startSession(res, user);
      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) {
        res.status(400).json({ error: 'That username is taken. Try another.' });
        return;
      }
      throw error;
    }
  });

  app.post('/api/auth/login', (req, res) => {
    if (limited(req, res)) return;
    const username = cleanUsername(req.body?.username);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = username ? db.prepare('SELECT * FROM users WHERE username = ?').get(username) : null;
    const safePassword = password.length > 72 ? 'nope' : password || 'nope';
    const ok = verifyPassword(safePassword, user ? user.password_hash : dummyHash());
    if (!user || !ok || password.length > 72) {
      res.status(401).json({ error: 'That username and password did not match.' });
      return;
    }
    startSession(res, user);
    res.json({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = readCookie(req, 'kb_session');
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    clearCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/home', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.role === 'teacher') {
      const klass = db.prepare('SELECT * FROM classes WHERE teacher_id = ?').get(user.id);
      const sets = db.prepare(
        `SELECT s.*,
            (SELECT COUNT(*) FROM questions q WHERE q.set_id = s.id AND q.kind = 'play') AS play_count,
            (SELECT COUNT(*) FROM questions q WHERE q.set_id = s.id AND q.kind = 'check') AS check_count,
            (SELECT a.id FROM assignments a WHERE a.set_id = s.id LIMIT 1) AS assignment_id
         FROM sets s WHERE s.teacher_id = ? ORDER BY s.id`,
      ).all(user.id);
      const games = klass
        ? db.prepare(
            `SELECT a.id, s.title, s.topic, s.accent, s.blurb, a.set_id,
                (SELECT COUNT(*) FROM plays p WHERE p.assignment_id = a.id AND p.status = 'finished') AS play_count,
                (SELECT COUNT(DISTINCT p.student_id) FROM plays p WHERE p.assignment_id = a.id AND p.status = 'finished') AS student_count
             FROM assignments a JOIN sets s ON s.id = a.set_id
             WHERE a.class_id = ? ORDER BY a.id`,
          ).all(klass.id)
        : [];
      const students = klass
        ? db.prepare(
            `SELECT id, display_name FROM users WHERE class_id = ? AND role = 'student' ORDER BY display_name COLLATE NOCASE`,
          ).all(klass.id)
        : [];
      res.json({
        class: klass
          ? {
              id: klass.id,
              name: klass.name,
              joinCode: klass.join_code,
              students: students.map((student) => ({ id: student.id, displayName: student.display_name })),
            }
          : null,
        sets: sets.map((set) => ({
          id: set.id,
          title: set.title,
          topic: set.topic,
          blurb: set.blurb,
          accent: set.accent,
          playCount: set.play_count,
          checkCount: set.check_count,
          assignmentId: set.assignment_id,
        })),
        games: games.map((game) => ({
          id: game.id,
          setId: game.set_id,
          title: game.title,
          topic: game.topic,
          accent: game.accent,
          blurb: game.blurb,
          playCount: game.play_count,
          studentCount: game.student_count,
        })),
      });
      return;
    }

    const klass = user.class_id ? db.prepare('SELECT * FROM classes WHERE id = ?').get(user.class_id) : null;
    const games = klass
      ? db.prepare(
          `SELECT a.id, s.title, s.topic, s.accent, s.blurb,
              (SELECT COUNT(*) FROM questions q WHERE q.set_id = s.id AND q.kind = 'play') AS play_count,
              (SELECT MAX(p.score) FROM plays p WHERE p.assignment_id = a.id AND p.student_id = ? AND p.status = 'finished') AS best_score,
              (SELECT p.stars FROM plays p WHERE p.assignment_id = a.id AND p.student_id = ? AND p.status = 'finished' ORDER BY p.score DESC, p.id DESC LIMIT 1) AS best_stars
           FROM assignments a JOIN sets s ON s.id = a.set_id
           WHERE a.class_id = ? ORDER BY a.id`,
        ).all(user.id, user.id, klass.id)
      : [];
    res.json({
      class: klass ? { id: klass.id, name: klass.name, joinCode: klass.join_code } : null,
      games: games.map((game) => ({
        id: game.id,
        title: game.title,
        topic: game.topic,
        accent: game.accent,
        blurb: game.blurb,
        roundSize: Math.min(ROUND_SIZE, game.play_count),
        bestScore: game.best_score,
        bestStars: game.best_stars,
      })),
    });
  });

  app.post('/api/class', (req, res) => {
    const user = requireRole(req, res, 'teacher');
    if (!user) return;
    const name = cleanName(req.body?.name, 32);
    if (!name) return res.status(400).json({ error: 'Give your class a short name.' });
    const existing = db.prepare('SELECT * FROM classes WHERE teacher_id = ?').get(user.id);
    if (existing) {
      db.prepare('UPDATE classes SET name = ? WHERE id = ?').run(name, existing.id);
      res.json({ class: { id: existing.id, name, joinCode: existing.join_code } });
      return;
    }
    let code = makeCode();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const taken = db.prepare('SELECT 1 FROM classes WHERE join_code = ?').get(code);
      if (!taken) break;
      code = makeCode();
    }
    const id = Number(
      db.prepare('INSERT INTO classes (teacher_id, name, join_code, created_at) VALUES (?, ?, ?, ?)').run(
        user.id,
        name,
        code,
        nowIso(),
      ).lastInsertRowid,
    );
    db.prepare('UPDATE users SET class_id = ? WHERE id = ?').run(id, user.id);
    res.status(201).json({ class: { id, name, joinCode: code } });
  });

  app.post('/api/class/join', (req, res) => {
    const user = requireRole(req, res, 'student');
    if (!user) return;
    const code = cleanLine(req.body?.code || '', 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) return res.status(400).json({ error: 'Enter the class code.' });
    const klass = db.prepare('SELECT * FROM classes WHERE join_code = ?').get(code);
    if (!klass) return res.status(400).json({ error: 'That class code did not match.' });
    db.prepare('UPDATE users SET class_id = ? WHERE id = ?').run(klass.id, user.id);
    res.json({ class: { id: klass.id, name: klass.name, joinCode: klass.join_code } });
  });

  function saveQuestions(setId, play, check) {
    db.prepare('DELETE FROM questions WHERE set_id = ?').run(setId);
    const insert = db.prepare(
      `INSERT INTO questions (
        set_id, kind, prompt, choice_a, choice_b, choice_c, choice_d, correct_index, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    play.forEach((question, index) => {
      insert.run(setId, 'play', question.prompt, ...question.choices, question.correctIndex, index);
    });
    check.forEach((question, index) => {
      insert.run(setId, 'check', question.prompt, ...question.choices, question.correctIndex, index);
    });
  }

  function readSetBody(body) {
    const title = cleanLine(body?.title, 40);
    const topic = cleanLine(body?.topic, 24);
    const blurb = cleanLine(body?.blurb || '', 80);
    const accent = ACCENTS.includes(body?.accent) ? body.accent : 'gold';
    if (title.length < 2) return { error: 'Name this question set.' };
    if (topic.length < 2) return { error: 'Add a short topic, like Addition.' };
    if (!Array.isArray(body?.play) || body.play.length < 1 || body.play.length > 16) {
      return { error: 'Add between 1 and 16 game questions.' };
    }
    if (!Array.isArray(body?.check) || body.check.length > 8) {
      return { error: 'The learning checkup can have up to 8 questions.' };
    }
    const play = [];
    for (const raw of body.play) {
      const question = validateQuestion(raw);
      if (question.error) return { error: question.error };
      play.push(question);
    }
    const check = [];
    for (const raw of body.check) {
      const question = validateQuestion(raw);
      if (question.error) return { error: question.error };
      check.push(question);
    }
    return { title, topic, blurb, accent, play, check };
  }

  function setPayload(set) {
    const questions = db.prepare('SELECT * FROM questions WHERE set_id = ? ORDER BY kind DESC, sort_order').all(set.id);
    const assignment = db.prepare('SELECT id FROM assignments WHERE set_id = ?').get(set.id);
    return {
      id: set.id,
      title: set.title,
      topic: set.topic,
      blurb: set.blurb,
      accent: set.accent,
      assignmentId: assignment ? assignment.id : null,
      play: questions.filter((question) => question.kind === 'play').map(publicQuestion),
      check: questions.filter((question) => question.kind === 'check').map(publicQuestion),
    };
  }

  app.get('/api/sets/:id', (req, res) => {
    const user = requireRole(req, res, 'teacher');
    if (!user) return;
    const id = intId(req.params.id);
    const set = id ? db.prepare('SELECT * FROM sets WHERE id = ? AND teacher_id = ?').get(id, user.id) : null;
    if (!set) return res.status(404).json({ error: 'That question set could not be found.' });
    res.json({ set: setPayload(set) });
  });

  app.post('/api/sets', (req, res) => {
    const user = requireRole(req, res, 'teacher');
    if (!user) return;
    if (db.prepare('SELECT COUNT(*) AS n FROM sets WHERE teacher_id = ?').get(user.id).n >= 100) {
      return res.status(400).json({ error: 'You have a lot of sets. Edit one you already made.' });
    }
    const parsed = readSetBody(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const id = Number(
      db.prepare(
        `INSERT INTO sets (teacher_id, title, topic, blurb, accent, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(user.id, parsed.title, parsed.topic, parsed.blurb, parsed.accent, nowIso()).lastInsertRowid,
    );
    saveQuestions(id, parsed.play, parsed.check);
    const set = db.prepare('SELECT * FROM sets WHERE id = ?').get(id);
    res.status(201).json({ set: setPayload(set) });
  });

  app.put('/api/sets/:id', (req, res) => {
    const user = requireRole(req, res, 'teacher');
    if (!user) return;
    const id = intId(req.params.id);
    const set = id ? db.prepare('SELECT * FROM sets WHERE id = ? AND teacher_id = ?').get(id, user.id) : null;
    if (!set) return res.status(404).json({ error: 'That question set could not be found.' });
    const parsed = readSetBody(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    db.prepare('UPDATE sets SET title = ?, topic = ?, blurb = ?, accent = ? WHERE id = ?').run(
      parsed.title,
      parsed.topic,
      parsed.blurb,
      parsed.accent,
      id,
    );
    saveQuestions(id, parsed.play, parsed.check);
    res.json({ set: setPayload(db.prepare('SELECT * FROM sets WHERE id = ?').get(id)) });
  });

  app.delete('/api/sets/:id', (req, res) => {
    const user = requireRole(req, res, 'teacher');
    if (!user) return;
    const id = intId(req.params.id);
    const set = id ? db.prepare('SELECT * FROM sets WHERE id = ? AND teacher_id = ?').get(id, user.id) : null;
    if (!set) return res.status(404).json({ error: 'That question set could not be found.' });
    const finished = db.prepare(
      `SELECT COUNT(*) AS n FROM plays p
       JOIN assignments a ON a.id = p.assignment_id
       WHERE a.set_id = ? AND p.status = 'finished'`,
    ).get(id).n;
    if (finished > 0) {
      return res.status(400).json({ error: 'This set has saved scores, so it stays.' });
    }
    db.prepare('DELETE FROM assignments WHERE set_id = ?').run(id);
    db.prepare('DELETE FROM questions WHERE set_id = ?').run(id);
    db.prepare('DELETE FROM sets WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  app.post('/api/assignments', (req, res) => {
    const user = requireRole(req, res, 'teacher');
    if (!user) return;
    const setId = intId(req.body?.setId);
    const set = setId ? db.prepare('SELECT * FROM sets WHERE id = ? AND teacher_id = ?').get(setId, user.id) : null;
    if (!set) return res.status(404).json({ error: 'That question set could not be found.' });
    const klass = db.prepare('SELECT * FROM classes WHERE teacher_id = ?').get(user.id);
    if (!klass) return res.status(400).json({ error: 'Make a class before you assign a game.' });
    const playCount = db.prepare(
      `SELECT COUNT(*) AS n FROM questions WHERE set_id = ? AND kind = 'play'`,
    ).get(set.id).n;
    if (playCount < 1) return res.status(400).json({ error: 'Add a game question before assigning this set.' });
    const existing = db.prepare('SELECT * FROM assignments WHERE class_id = ? AND set_id = ?').get(klass.id, set.id);
    if (existing) return res.json({ assignmentId: existing.id, already: true });
    const id = Number(
      db.prepare('INSERT INTO assignments (class_id, set_id, created_at) VALUES (?, ?, ?)').run(
        klass.id,
        set.id,
        nowIso(),
      ).lastInsertRowid,
    );
    res.status(201).json({ assignmentId: id, already: false });
  });

  function loadAssignment(id) {
    if (!id) return null;
    return db.prepare(
      `SELECT a.*, s.title, s.topic, s.accent, s.blurb, s.teacher_id, s.id AS set_id
       FROM assignments a JOIN sets s ON s.id = a.set_id WHERE a.id = ?`,
    ).get(id);
  }

  function activePlay(userId, assignmentId) {
    const play = db.prepare(
      `SELECT * FROM plays WHERE student_id = ? AND assignment_id = ? AND status = 'playing' ORDER BY id DESC LIMIT 1`,
    ).get(userId, assignmentId);
    if (!play) return null;
    const deals = db.prepare(
      `SELECT * FROM play_deals WHERE play_id = ? AND kind = 'play' ORDER BY position`,
    ).all(play.id);
    return {
      playId: play.id,
      index: play.cursor_index,
      score: play.score,
      lives: play.lives,
      streak: play.streak,
      bestStreak: play.best_streak,
      questions: deals.map(dealView),
    };
  }

  app.get('/api/assignments/:id', (req, res) => {
    const user = requireRole(req, res, 'student');
    if (!user) return;
    const assignment = loadAssignment(intId(req.params.id));
    if (!assignment || assignment.class_id !== user.class_id) {
      return res.status(404).json({ error: 'That game is not in your class.' });
    }
    const playCount = db.prepare(
      `SELECT COUNT(*) AS n FROM questions WHERE set_id = ? AND kind = 'play'`,
    ).get(assignment.set_id).n;
    res.json({
      id: assignment.id,
      title: assignment.title,
      topic: assignment.topic,
      accent: assignment.accent,
      blurb: assignment.blurb,
      roundSize: Math.min(ROUND_SIZE, playCount),
      lives: START_LIVES,
      activePlay: activePlay(user.id, assignment.id),
    });
  });

  app.post('/api/plays', (req, res) => {
    const user = requireRole(req, res, 'student');
    if (!user) return;
    const assignment = loadAssignment(intId(req.body?.assignmentId));
    if (!assignment || assignment.class_id !== user.class_id) {
      return res.status(404).json({ error: 'That game is not in your class.' });
    }
    const pool = db.prepare(
      `SELECT * FROM questions WHERE set_id = ? AND kind = 'play' ORDER BY sort_order`,
    ).all(assignment.set_id);
    if (!pool.length) return res.status(400).json({ error: 'This game has no questions yet.' });
    const chosen = shuffle(pool).slice(0, Math.min(ROUND_SIZE, pool.length));

    db.exec('BEGIN');
    let playId;
    try {
      db.prepare(
        `UPDATE plays SET status = 'abandoned' WHERE student_id = ? AND assignment_id = ? AND status = 'playing'`,
      ).run(user.id, assignment.id);
      playId = Number(
        db.prepare(
          `INSERT INTO plays (
            student_id, assignment_id, status, lives, round_size, created_at
          ) VALUES (?, ?, 'playing', ?, ?, ?)`,
        ).run(user.id, assignment.id, START_LIVES, chosen.length, nowIso()).lastInsertRowid,
      );
      const insertDeal = db.prepare(
        `INSERT INTO play_deals (play_id, question_id, kind, position, prompt, choices_json, correct_index)
         VALUES (?, ?, 'play', ?, ?, ?, ?)`,
      );
      chosen.forEach((question, position) => {
        const dealt = dealChoices(question);
        insertDeal.run(playId, question.id, position, question.prompt, JSON.stringify(dealt.choices), dealt.correctIndex);
      });
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    const deals = db.prepare(
      `SELECT * FROM play_deals WHERE play_id = ? AND kind = 'play' ORDER BY position`,
    ).all(playId);
    res.status(201).json({
      playId,
      title: assignment.title,
      topic: assignment.topic,
      accent: assignment.accent,
      lives: START_LIVES,
      questions: deals.map(dealView),
    });
  });

  function answerJson(play, deal, correct, picked) {
    const choices = choicesOf(deal);
    return {
      correct: !!correct,
      correctIndex: deal.correct_index,
      correctText: choices[deal.correct_index],
      picked,
      score: play.score,
      streak: play.streak,
      bestStreak: play.best_streak,
      lives: play.lives,
      correctCount: play.correct_count,
      missCount: play.miss_count,
      finished: play.status === 'finished',
      stars: play.stars,
      questionId: deal.question_id,
    };
  }

  app.post('/api/plays/:id/answer', (req, res) => {
    const user = requireRole(req, res, 'student');
    if (!user) return;
    const playId = intId(req.params.id);
    const play = playId ? db.prepare('SELECT * FROM plays WHERE id = ?').get(playId) : null;
    if (!play || play.student_id !== user.id) {
      return res.status(404).json({ error: 'That round could not be found.' });
    }
    const questionId = intId(req.body?.questionId);
    const choiceIndex = Number(req.body?.choiceIndex);
    if (!questionId || !Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
      return res.status(400).json({ error: 'Pick one of the answers.' });
    }
    const deal = db.prepare(
      `SELECT * FROM play_deals WHERE play_id = ? AND question_id = ? AND kind = 'play'`,
    ).get(play.id, questionId);
    if (!deal) return res.status(400).json({ error: 'That answer is not part of this round.' });

    const existing = db.prepare(
      'SELECT * FROM play_answers WHERE play_id = ? AND question_id = ?',
    ).get(play.id, questionId);
    if (existing) {
      const fresh = db.prepare('SELECT * FROM plays WHERE id = ?').get(play.id);
      return res.json(answerJson(fresh, deal, existing.correct, existing.choice_index));
    }
    if (play.status !== 'playing') {
      return res.status(400).json({ error: 'This round is already finished.' });
    }
    if (deal.position !== play.cursor_index) {
      return res.status(400).json({ error: 'Answer the question on the screen.' });
    }

    const correct = choiceIndex === deal.correct_index ? 1 : 0;
    let streak = play.streak;
    let score = play.score;
    let lives = play.lives;
    let correctCount = play.correct_count;
    let missCount = play.miss_count;
    let best = play.best_streak;
    if (correct) {
      streak += 1;
      best = Math.max(best, streak);
      score += 100 + (streak - 1) * 50;
      correctCount += 1;
    } else {
      streak = 0;
      missCount += 1;
      lives = Math.max(0, lives - 1);
    }
    const cursor = play.cursor_index + 1;
    const finished = lives <= 0 || cursor >= play.round_size;
    const stars = finished ? computeStars({ correctCount, missCount, roundSize: play.round_size }) : null;

    db.exec('BEGIN');
    try {
      db.prepare(
        `INSERT INTO play_answers (play_id, question_id, prompt, choice_index, correct_index, correct)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(play.id, questionId, deal.prompt, choiceIndex, deal.correct_index, correct);
      db.prepare(
        `UPDATE plays SET score = ?, streak = ?, best_streak = ?, lives = ?, correct_count = ?,
         miss_count = ?, cursor_index = ?, status = ?, stars = ?, finished_at = ? WHERE id = ?`,
      ).run(
        score,
        streak,
        best,
        lives,
        correctCount,
        missCount,
        cursor,
        finished ? 'finished' : 'playing',
        stars,
        finished ? nowIso() : null,
        play.id,
      );
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    const fresh = db.prepare('SELECT * FROM plays WHERE id = ?').get(play.id);
    res.json(answerJson(fresh, deal, correct, choiceIndex));
  });

  app.get('/api/plays/:id', (req, res) => {
    const user = requireRole(req, res, 'student');
    if (!user) return;
    const play = db.prepare('SELECT * FROM plays WHERE id = ?').get(intId(req.params.id));
    if (!play || play.student_id !== user.id || play.status !== 'finished') {
      return res.status(404).json({ error: 'That score could not be found.' });
    }
    const assignment = loadAssignment(play.assignment_id);
    const survey = db.prepare('SELECT * FROM surveys WHERE play_id = ?').get(play.id);
    const check = db.prepare(
      'SELECT COALESCE(SUM(correct), 0) AS correct, COUNT(*) AS total FROM check_answers WHERE play_id = ?',
    ).get(play.id);
    const planned = db.prepare(
      `SELECT COUNT(*) AS n FROM play_deals WHERE play_id = ? AND kind = 'check'`,
    ).get(play.id).n;
    res.json({
      playId: play.id,
      assignmentId: play.assignment_id,
      title: assignment?.title || 'Game',
      topic: assignment?.topic || '',
      accent: assignment?.accent || 'gold',
      score: play.score,
      stars: play.stars,
      correctCount: play.correct_count,
      missCount: play.miss_count,
      bestStreak: play.best_streak,
      roundSize: play.round_size,
      answered: play.cursor_index,
      survey: survey
        ? { liked: survey.liked, difficulty: survey.difficulty, skipped: !!survey.skipped }
        : null,
      check: check.total
        ? {
            correct: Number(check.correct),
            answered: Number(check.total),
            total: Number(planned) || Number(check.total),
            done: Number(planned) > 0 && Number(check.total) >= Number(planned),
          }
        : null,
    });
  });

  app.post('/api/plays/:id/survey', (req, res) => {
    const user = requireRole(req, res, 'student');
    if (!user) return;
    const play = db.prepare('SELECT * FROM plays WHERE id = ?').get(intId(req.params.id));
    if (!play || play.student_id !== user.id || play.status !== 'finished') {
      return res.status(404).json({ error: 'Finish a round before the checkup.' });
    }
    const liked = ['not_much', 'okay', 'loved'].includes(req.body?.liked) ? req.body.liked : null;
    const difficulty = ['too_easy', 'just_right', 'too_hard'].includes(req.body?.difficulty)
      ? req.body.difficulty
      : null;
    const skipped = req.body?.skipped ? 1 : 0;
    const existing = db.prepare('SELECT id FROM surveys WHERE play_id = ?').get(play.id);
    if (existing) {
      db.prepare('UPDATE surveys SET liked = ?, difficulty = ?, skipped = ? WHERE play_id = ?').run(
        liked,
        difficulty,
        skipped,
        play.id,
      );
    } else {
      db.prepare(
        `INSERT INTO surveys (play_id, student_id, liked, difficulty, skipped, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(play.id, user.id, liked, difficulty, skipped, nowIso());
    }
    res.json({ ok: true, liked, difficulty, skipped: !!skipped });
  });

  function checkQuestionsFor(setId) {
    const checks = db.prepare(
      `SELECT * FROM questions WHERE set_id = ? AND kind = 'check' ORDER BY sort_order`,
    ).all(setId);
    const plays = db.prepare(
      `SELECT * FROM questions WHERE set_id = ? AND kind = 'play' ORDER BY sort_order`,
    ).all(setId);
    const chosen = [];
    const seen = new Set();
    for (const question of checks) {
      if (chosen.length >= 8) break;
      chosen.push(question);
      seen.add(question.prompt);
    }
    for (const question of plays) {
      if (chosen.length >= 8) break;
      if (seen.has(question.prompt)) continue;
      chosen.push(question);
      seen.add(question.prompt);
    }
    return chosen.slice(0, 8);
  }

  function ensureCheckDeals(play) {
    const existing = db.prepare(
      `SELECT * FROM play_deals WHERE play_id = ? AND kind = 'check' ORDER BY position`,
    ).all(play.id);
    if (existing.length) return existing;
    const assignment = loadAssignment(play.assignment_id);
    const questions = checkQuestionsFor(assignment.set_id);
    const insert = db.prepare(
      `INSERT INTO play_deals (play_id, question_id, kind, position, prompt, choices_json, correct_index)
       VALUES (?, ?, 'check', ?, ?, ?, ?)`,
    );
    questions.forEach((question, position) => {
      const dealt = dealChoices(question);
      insert.run(
        play.id,
        question.id,
        position,
        question.prompt,
        JSON.stringify(dealt.choices),
        dealt.correctIndex,
      );
    });
    return db.prepare(
      `SELECT * FROM play_deals WHERE play_id = ? AND kind = 'check' ORDER BY position`,
    ).all(play.id);
  }

  app.get('/api/plays/:id/checkup', (req, res) => {
    const user = requireRole(req, res, 'student');
    if (!user) return;
    const play = db.prepare('SELECT * FROM plays WHERE id = ?').get(intId(req.params.id));
    if (!play || play.student_id !== user.id || play.status !== 'finished') {
      return res.status(404).json({ error: 'Finish a round before the checkup.' });
    }
    const deals = ensureCheckDeals(play);
    const answers = db.prepare('SELECT * FROM check_answers WHERE play_id = ?').all(play.id);
    const byQuestion = new Map(answers.map((answer) => [answer.question_id, answer]));
    res.json({
      questions: deals.map(dealView),
      answered: deals
        .filter((deal) => byQuestion.has(deal.question_id))
        .map((deal) => {
          const answer = byQuestion.get(deal.question_id);
          const choices = choicesOf(deal);
          return {
            questionId: deal.question_id,
            correct: !!answer.correct,
            correctIndex: deal.correct_index,
            correctText: choices[deal.correct_index],
            choiceIndex: answer.choice_index,
          };
        }),
      total: deals.length,
    });
  });

  app.post('/api/plays/:id/checkup', (req, res) => {
    const user = requireRole(req, res, 'student');
    if (!user) return;
    const play = db.prepare('SELECT * FROM plays WHERE id = ?').get(intId(req.params.id));
    if (!play || play.student_id !== user.id || play.status !== 'finished') {
      return res.status(404).json({ error: 'Finish a round before the checkup.' });
    }
    const questionId = intId(req.body?.questionId);
    const choiceIndex = Number(req.body?.choiceIndex);
    if (!questionId || !Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
      return res.status(400).json({ error: 'Pick one of the answers.' });
    }
    const deals = ensureCheckDeals(play);
    const deal = deals.find((item) => item.question_id === questionId);
    if (!deal) return res.status(400).json({ error: 'That question is not in this checkup.' });
    const existing = db.prepare(
      'SELECT * FROM check_answers WHERE play_id = ? AND question_id = ?',
    ).get(play.id, questionId);
    const choices = choicesOf(deal);
    if (existing) {
      const totals = db.prepare(
        'SELECT COALESCE(SUM(correct), 0) AS correct, COUNT(*) AS total FROM check_answers WHERE play_id = ?',
      ).get(play.id);
      return res.json({
        correct: !!existing.correct,
        correctIndex: deal.correct_index,
        correctText: choices[deal.correct_index],
        correctCount: Number(totals.correct),
        total: deals.length,
        done: Number(totals.total) >= deals.length,
      });
    }
    const answeredCount = db.prepare('SELECT COUNT(*) AS n FROM check_answers WHERE play_id = ?').get(play.id).n;
    if (deal.position !== answeredCount) {
      return res.status(400).json({ error: 'Answer the question on the screen.' });
    }
    const correct = choiceIndex === deal.correct_index ? 1 : 0;
    db.prepare(
      `INSERT INTO check_answers (play_id, question_id, prompt, choice_index, correct_index, correct)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(play.id, questionId, deal.prompt, choiceIndex, deal.correct_index, correct);
    const totals = db.prepare(
      'SELECT COALESCE(SUM(correct), 0) AS correct, COUNT(*) AS total FROM check_answers WHERE play_id = ?',
    ).get(play.id);
    res.json({
      correct: !!correct,
      correctIndex: deal.correct_index,
      correctText: choices[deal.correct_index],
      correctCount: Number(totals.correct),
      total: deals.length,
      done: Number(totals.total) >= deals.length,
    });
  });

  app.get('/api/results/:id', (req, res) => {
    const user = requireRole(req, res, 'teacher');
    if (!user) return;
    const assignment = loadAssignment(intId(req.params.id));
    if (!assignment || assignment.teacher_id !== user.id) {
      return res.status(404).json({ error: 'Those results could not be found.' });
    }
    const klass = db.prepare('SELECT * FROM classes WHERE id = ?').get(assignment.class_id);
    const students = db.prepare(
      `SELECT id, display_name FROM users WHERE class_id = ? AND role = 'student' ORDER BY display_name COLLATE NOCASE`,
    ).all(assignment.class_id);
    const finished = db.prepare(
      `SELECT * FROM plays WHERE assignment_id = ? AND status = 'finished' ORDER BY id DESC`,
    ).all(assignment.id);
    const byStudent = new Map();
    for (const play of finished) {
      if (!byStudent.has(play.student_id)) byStudent.set(play.student_id, []);
      byStudent.get(play.student_id).push(play);
    }

    const roster = students.map((student) => {
      const plays = byStudent.get(student.id) || [];
      if (!plays.length) {
        return { studentId: student.id, name: student.display_name, played: false };
      }
      const latest = plays[0];
      const best = plays.reduce((winner, play) => (play.score > winner.score ? play : winner), plays[0]);
      const checkPlay = db.prepare(
        `SELECT p.id FROM plays p
         JOIN check_answers c ON c.play_id = p.id
         WHERE p.student_id = ? AND p.assignment_id = ? AND p.status = 'finished'
         GROUP BY p.id ORDER BY p.id DESC LIMIT 1`,
      ).get(student.id, assignment.id);
      let checkup = null;
      if (checkPlay) {
        const totals = db.prepare(
          'SELECT COALESCE(SUM(correct), 0) AS correct, COUNT(*) AS total FROM check_answers WHERE play_id = ?',
        ).get(checkPlay.id);
        checkup = { correct: Number(totals.correct), total: Number(totals.total) };
      }
      return {
        studentId: student.id,
        name: student.display_name,
        played: true,
        plays: plays.length,
        bestScore: best.score,
        bestStars: best.stars,
        lastPlayed: latest.finished_at,
        checkup,
      };
    });

    const surveyRows = db.prepare(
      `SELECT s.liked, s.difficulty, s.student_id
       FROM surveys s JOIN plays p ON p.id = s.play_id
       WHERE p.assignment_id = ? AND p.status = 'finished'
       ORDER BY s.play_id DESC`,
    ).all(assignment.id);
    const seen = new Set();
    const liked = { not_much: 0, okay: 0, loved: 0 };
    const difficulty = { too_easy: 0, just_right: 0, too_hard: 0 };
    let surveyStudents = 0;
    for (const row of surveyRows) {
      if (seen.has(row.student_id)) continue;
      seen.add(row.student_id);
      if (!row.liked && !row.difficulty) continue;
      surveyStudents += 1;
      if (row.liked) liked[row.liked] += 1;
      if (row.difficulty) difficulty[row.difficulty] += 1;
    }

    const checks = db.prepare(
      `WITH latest AS (
         SELECT p.student_id AS student_id, MAX(p.id) AS play_id
         FROM plays p JOIN check_answers c ON c.play_id = p.id
         WHERE p.assignment_id = ? AND p.status = 'finished'
         GROUP BY p.student_id
       )
       SELECT c.prompt AS prompt, SUM(c.correct) AS correct, COUNT(*) AS total
       FROM check_answers c JOIN latest l ON l.play_id = c.play_id
       GROUP BY c.prompt
       ORDER BY MIN(c.id)`,
    ).all(assignment.id).map((row) => ({
      prompt: row.prompt,
      correct: Number(row.correct),
      total: Number(row.total),
    }));

    const players = roster.filter((row) => row.played);
    const checkCorrect = checks.reduce((sum, row) => sum + row.correct, 0);
    const checkTotal = checks.reduce((sum, row) => sum + row.total, 0);
    res.json({
      game: {
        id: assignment.id,
        title: assignment.title,
        topic: assignment.topic,
        accent: assignment.accent,
        className: klass?.name || 'Class',
      },
      summary: {
        classSize: students.length,
        studentsPlayed: players.length,
        avgBestScore: players.length
          ? Math.round(players.reduce((sum, row) => sum + row.bestScore, 0) / players.length)
          : 0,
        avgStars: players.length
          ? Math.round((players.reduce((sum, row) => sum + row.bestStars, 0) / players.length) * 10) / 10
          : 0,
        surveyStudents,
        checkPercent: checkTotal ? Math.round((checkCorrect / checkTotal) * 100) : null,
      },
      liked,
      difficulty,
      checks,
      roster,
    });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });
}
