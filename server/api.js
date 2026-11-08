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
const DEMO_USERS = new Set(['luna', 'kai', 'rio']);

function route(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function cookieSecure(req) {
  return req.secure || req.get('x-forwarded-proto') === 'https';
}

function setCookie(res, req, token) {
  const parts = [`kb_session=${token}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=2592000'];
  if (cookieSecure(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearCookie(res, req) {
  const parts = ['kb_session=', 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=0'];
  if (cookieSecure(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function intId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function count(row) {
  return Number(row?.n ?? 0);
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

function isUnique(error) {
  return error?.code === '23505' || String(error?.message || '').toLowerCase().includes('unique');
}

export function mountApi(app, db) {
  async function userFrom(req) {
    const token = readCookie(req, 'kb_session');
    if (!token) return null;
    return db.get(
      'select u.* from sessions s join users u on u.id = s.user_id where s.token = ?',
      token,
    );
  }

  async function requireUser(req, res) {
    const user = await userFrom(req);
    if (!user) {
      res.status(401).json({ error: 'Please sign in first.' });
      return null;
    }
    return user;
  }

  async function requireRole(req, res, role) {
    const user = await requireUser(req, res);
    if (!user) return null;
    if (user.role !== role) {
      res.status(403).json({ error: 'That page is for a different login.' });
      return null;
    }
    return user;
  }

  async function startSession(res, req, user) {
    const token = randomBytes(32).toString('hex');
    await db.run(
      'insert into sessions (token, user_id, created_at) values (?, ?, ?)',
      token,
      user.id,
      nowIso(),
    );
    const old = await db.all(
      'select token from sessions where user_id = ? order by created_at desc',
      user.id,
    );
    for (const row of old.slice(5)) {
      await db.run('delete from sessions where token = ?', row.token);
    }
    setCookie(res, req, token);
  }

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'GET' && req.method !== 'HEAD' && !sameSite(req, res)) return;
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/me', route(async (req, res) => {
    const user = await userFrom(req);
    res.json({ user: user ? publicUser(user) : null });
  }));

  app.post('/api/auth/signup', route(async (req, res) => {
    if (limited(req, res)) return;
    const username = cleanUsername(req.body?.username);
    const password = cleanPassword(req.body?.password);
    const displayName = cleanName(req.body?.displayName, 24);
    const role = req.body?.role === 'teacher' ? 'teacher' : req.body?.role === 'student' ? 'student' : null;
    if (!username) return res.status(400).json({ error: 'Use 3 to 16 letters or numbers for the username.' });
    if (!password) return res.status(400).json({ error: 'Use a password of 4 to 32 letters or numbers, with no spaces.' });
    if (!displayName) return res.status(400).json({ error: 'Add a nickname with letters, like Luna or Ms. Nova.' });
    if (!role) return res.status(400).json({ error: 'Pick student or teacher.' });
    if (count(await db.get('select count(*)::int as n from users')) >= 500) {
      return res.status(400).json({ error: 'This class server is full.' });
    }

    const code = cleanLine(req.body?.joinCode || '', 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
    let classId = null;
    if (role === 'student' && code) {
      const klass = await db.get('select id from classes where join_code = ?', code);
      if (!klass) return res.status(400).json({ error: 'That class code did not match.' });
      classId = klass.id;
    }

    try {
      const id = await db.insert(
        `insert into users (username, password_hash, role, display_name, class_id, created_at)
         values (?, ?, ?, ?, ?, ?)`,
        username,
        hashPassword(password),
        role,
        displayName,
        classId,
        nowIso(),
      );
      const user = await db.get('select * from users where id = ?', id);
      await startSession(res, req, user);
      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      if (isUnique(error)) {
        res.status(400).json({ error: 'That username is taken. Try another.' });
        return;
      }
      throw error;
    }
  }));

  app.post('/api/auth/login', route(async (req, res) => {
    if (limited(req, res)) return;
    const username = cleanUsername(req.body?.username);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = username ? await db.get('select * from users where username = ?', username) : null;
    const safePassword = password.length > 72 ? 'nope' : password || 'nope';
    const ok = verifyPassword(safePassword, user ? user.password_hash : dummyHash());
    if (!user || !ok || password.length > 72) {
      res.status(401).json({ error: 'That username and password did not match.' });
      return;
    }
    await startSession(res, req, user);
    res.json({ user: publicUser(user) });
  }));

  app.post('/api/auth/demo', route(async (req, res) => {
    if (limited(req, res)) return;
    const username = cleanUsername(req.body?.username);
    if (!username || !DEMO_USERS.has(username)) {
      return res.status(404).json({ error: 'Pick a name on the sign-in screen.' });
    }
    const user = await db.get('select * from users where username = ?', username);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ error: 'That demo player is not here.' });
    }
    await startSession(res, req, user);
    res.json({ user: publicUser(user) });
  }));

  app.post('/api/auth/logout', route(async (req, res) => {
    const token = readCookie(req, 'kb_session');
    if (token) await db.run('delete from sessions where token = ?', token);
    clearCookie(res, req);
    res.json({ ok: true });
  }));

  app.get('/api/home', route(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    if (user.role === 'teacher') {
      const klass = await db.get('select * from classes where teacher_id = ?', user.id);
      const sets = await db.all(
        `select s.*,
            (select count(*)::int from questions q where q.set_id = s.id and q.kind = 'play') as play_count,
            (select count(*)::int from questions q where q.set_id = s.id and q.kind = 'check') as check_count,
            (select a.id from assignments a where a.set_id = s.id limit 1) as assignment_id
         from sets s where s.teacher_id = ? order by s.id`,
        user.id,
      );
      const games = klass
        ? await db.all(
          `select a.id, s.title, s.topic, s.accent, s.blurb, a.set_id,
              (select count(*)::int from plays p where p.assignment_id = a.id and p.status = 'finished') as play_count,
              (select count(distinct p.student_id)::int from plays p where p.assignment_id = a.id and p.status = 'finished') as student_count
           from assignments a join sets s on s.id = a.set_id
           where a.class_id = ? order by a.id`,
          klass.id,
        )
        : [];
      const students = klass
        ? await db.all(
          `select id, display_name from users where class_id = ? and role = 'student' order by lower(display_name)`,
          klass.id,
        )
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

    const klass = user.class_id ? await db.get('select * from classes where id = ?', user.class_id) : null;
    const games = klass
      ? await db.all(
        `select a.id, s.title, s.topic, s.accent, s.blurb,
            (select count(*)::int from questions q where q.set_id = s.id and q.kind = 'play') as play_count,
            (select max(p.score) from plays p where p.assignment_id = a.id and p.student_id = ? and p.status = 'finished') as best_score,
            (select p.stars from plays p where p.assignment_id = a.id and p.student_id = ? and p.status = 'finished' order by p.score desc, p.id desc limit 1) as best_stars
         from assignments a join sets s on s.id = a.set_id
         where a.class_id = ? order by a.id`,
        user.id,
        user.id,
        klass.id,
      )
      : [];
    res.json({
      class: klass ? { id: klass.id, name: klass.name, joinCode: klass.join_code } : null,
      games: games.map((game) => ({
        id: game.id,
        title: game.title,
        topic: game.topic,
        accent: game.accent,
        blurb: game.blurb,
        roundSize: Math.min(ROUND_SIZE, Number(game.play_count)),
        bestScore: game.best_score,
        bestStars: game.best_stars,
      })),
    });
  }));

  app.post('/api/class', route(async (req, res) => {
    const user = await requireRole(req, res, 'teacher');
    if (!user) return;
    const name = cleanName(req.body?.name, 32);
    if (!name) return res.status(400).json({ error: 'Give your class a short name.' });
    const existing = await db.get('select * from classes where teacher_id = ?', user.id);
    if (existing) {
      await db.run('update classes set name = ? where id = ?', name, existing.id);
      res.json({ class: { id: existing.id, name, joinCode: existing.join_code } });
      return;
    }
    let code = makeCode();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const taken = await db.get('select 1 as ok from classes where join_code = ?', code);
      if (!taken) break;
      code = makeCode();
    }
    const id = await db.insert(
      'insert into classes (teacher_id, name, join_code, created_at) values (?, ?, ?, ?)',
      user.id,
      name,
      code,
      nowIso(),
    );
    await db.run('update users set class_id = ? where id = ?', id, user.id);
    res.status(201).json({ class: { id, name, joinCode: code } });
  }));

  app.post('/api/class/join', route(async (req, res) => {
    const user = await requireRole(req, res, 'student');
    if (!user) return;
    const code = cleanLine(req.body?.code || '', 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) return res.status(400).json({ error: 'Enter the class code.' });
    const klass = await db.get('select * from classes where join_code = ?', code);
    if (!klass) return res.status(400).json({ error: 'That class code did not match.' });
    await db.run('update users set class_id = ? where id = ?', klass.id, user.id);
    res.json({ class: { id: klass.id, name: klass.name, joinCode: klass.join_code } });
  }));

  async function saveQuestions(setId, play, check) {
    await db.transaction(async (tx) => {
      await tx.run('delete from questions where set_id = ?', setId);
      for (let index = 0; index < play.length; index += 1) {
        const question = play[index];
        await tx.run(
          `insert into questions (
            set_id, kind, prompt, choice_a, choice_b, choice_c, choice_d, correct_index, sort_order
          ) values (?, 'play', ?, ?, ?, ?, ?, ?, ?)`,
          setId,
          question.prompt,
          question.choices[0],
          question.choices[1],
          question.choices[2],
          question.choices[3],
          question.correctIndex,
          index,
        );
      }
      for (let index = 0; index < check.length; index += 1) {
        const question = check[index];
        await tx.run(
          `insert into questions (
            set_id, kind, prompt, choice_a, choice_b, choice_c, choice_d, correct_index, sort_order
          ) values (?, 'check', ?, ?, ?, ?, ?, ?, ?)`,
          setId,
          question.prompt,
          question.choices[0],
          question.choices[1],
          question.choices[2],
          question.choices[3],
          question.correctIndex,
          index,
        );
      }
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

  async function setPayload(set) {
    const questions = await db.all(
      'select * from questions where set_id = ? order by kind desc, sort_order',
      set.id,
    );
    const assignment = await db.get('select id from assignments where set_id = ?', set.id);
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

  app.get('/api/sets/:id', route(async (req, res) => {
    const user = await requireRole(req, res, 'teacher');
    if (!user) return;
    const id = intId(req.params.id);
    const set = id ? await db.get('select * from sets where id = ? and teacher_id = ?', id, user.id) : null;
    if (!set) return res.status(404).json({ error: 'That question set could not be found.' });
    res.json({ set: await setPayload(set) });
  }));

  app.post('/api/sets', route(async (req, res) => {
    const user = await requireRole(req, res, 'teacher');
    if (!user) return;
    if (count(await db.get('select count(*)::int as n from sets where teacher_id = ?', user.id)) >= 100) {
      return res.status(400).json({ error: 'You have a lot of sets. Edit one you already made.' });
    }
    const parsed = readSetBody(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const id = await db.insert(
      'insert into sets (teacher_id, title, topic, blurb, accent, created_at) values (?, ?, ?, ?, ?, ?)',
      user.id,
      parsed.title,
      parsed.topic,
      parsed.blurb,
      parsed.accent,
      nowIso(),
    );
    await saveQuestions(id, parsed.play, parsed.check);
    res.status(201).json({ set: await setPayload(await db.get('select * from sets where id = ?', id)) });
  }));

  app.put('/api/sets/:id', route(async (req, res) => {
    const user = await requireRole(req, res, 'teacher');
    if (!user) return;
    const id = intId(req.params.id);
    const set = id ? await db.get('select * from sets where id = ? and teacher_id = ?', id, user.id) : null;
    if (!set) return res.status(404).json({ error: 'That question set could not be found.' });
    const parsed = readSetBody(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    await db.run(
      'update sets set title = ?, topic = ?, blurb = ?, accent = ? where id = ?',
      parsed.title,
      parsed.topic,
      parsed.blurb,
      parsed.accent,
      id,
    );
    await saveQuestions(id, parsed.play, parsed.check);
    res.json({ set: await setPayload(await db.get('select * from sets where id = ?', id)) });
  }));

  app.delete('/api/sets/:id', route(async (req, res) => {
    const user = await requireRole(req, res, 'teacher');
    if (!user) return;
    const id = intId(req.params.id);
    const set = id ? await db.get('select * from sets where id = ? and teacher_id = ?', id, user.id) : null;
    if (!set) return res.status(404).json({ error: 'That question set could not be found.' });
    const finished = count(await db.get(
      `select count(*)::int as n from plays p
       join assignments a on a.id = p.assignment_id
       where a.set_id = ? and p.status = 'finished'`,
      id,
    ));
    if (finished > 0) {
      return res.status(400).json({ error: 'This set has saved scores, so it stays.' });
    }
    await db.run('delete from assignments where set_id = ?', id);
    await db.run('delete from questions where set_id = ?', id);
    await db.run('delete from sets where id = ?', id);
    res.json({ ok: true });
  }));

  app.post('/api/assignments', route(async (req, res) => {
    const user = await requireRole(req, res, 'teacher');
    if (!user) return;
    const setId = intId(req.body?.setId);
    const set = setId ? await db.get('select * from sets where id = ? and teacher_id = ?', setId, user.id) : null;
    if (!set) return res.status(404).json({ error: 'That question set could not be found.' });
    const klass = await db.get('select * from classes where teacher_id = ?', user.id);
    if (!klass) return res.status(400).json({ error: 'Make a class before you assign a game.' });
    const playCount = count(await db.get(
      `select count(*)::int as n from questions where set_id = ? and kind = 'play'`,
      set.id,
    ));
    if (playCount < 1) return res.status(400).json({ error: 'Add a game question before assigning this set.' });
    const existing = await db.get('select * from assignments where class_id = ? and set_id = ?', klass.id, set.id);
    if (existing) return res.json({ assignmentId: existing.id, already: true });
    const id = await db.insert(
      'insert into assignments (class_id, set_id, created_at) values (?, ?, ?)',
      klass.id,
      set.id,
      nowIso(),
    );
    res.status(201).json({ assignmentId: id, already: false });
  }));

  async function loadAssignment(id) {
    if (!id) return null;
    return db.get(
      `select a.*, s.title, s.topic, s.accent, s.blurb, s.teacher_id, s.id as set_id
       from assignments a join sets s on s.id = a.set_id where a.id = ?`,
      id,
    );
  }

  async function activePlay(userId, assignmentId) {
    const play = await db.get(
      `select * from plays where student_id = ? and assignment_id = ? and status = 'playing' order by id desc limit 1`,
      userId,
      assignmentId,
    );
    if (!play) return null;
    const deals = await db.all(
      `select * from play_deals where play_id = ? and kind = 'play' order by position`,
      play.id,
    );
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

  app.get('/api/assignments/:id', route(async (req, res) => {
    const user = await requireRole(req, res, 'student');
    if (!user) return;
    const assignment = await loadAssignment(intId(req.params.id));
    if (!assignment || assignment.class_id !== user.class_id) {
      return res.status(404).json({ error: 'That game is not in your class.' });
    }
    const playCount = count(await db.get(
      `select count(*)::int as n from questions where set_id = ? and kind = 'play'`,
      assignment.set_id,
    ));
    res.json({
      id: assignment.id,
      title: assignment.title,
      topic: assignment.topic,
      accent: assignment.accent,
      blurb: assignment.blurb,
      roundSize: Math.min(ROUND_SIZE, playCount),
      lives: START_LIVES,
      activePlay: await activePlay(user.id, assignment.id),
    });
  }));

  app.post('/api/plays', route(async (req, res) => {
    const user = await requireRole(req, res, 'student');
    if (!user) return;
    const assignment = await loadAssignment(intId(req.body?.assignmentId));
    if (!assignment || assignment.class_id !== user.class_id) {
      return res.status(404).json({ error: 'That game is not in your class.' });
    }
    const pool = await db.all(
      `select * from questions where set_id = ? and kind = 'play' order by sort_order`,
      assignment.set_id,
    );
    if (!pool.length) return res.status(400).json({ error: 'This game has no questions yet.' });
    if (count(await db.get('select count(*)::int as n from plays where student_id = ?', user.id)) >= 80) {
      return res.status(400).json({ error: 'You have played a lot today. Ask your teacher for a new try.' });
    }
    const chosen = shuffle(pool).slice(0, Math.min(ROUND_SIZE, pool.length));

    const playId = await db.transaction(async (tx) => {
      await tx.run(
        `update plays set status = 'abandoned' where student_id = ? and assignment_id = ? and status = 'playing'`,
        user.id,
        assignment.id,
      );
      const id = await tx.insert(
        `insert into plays (student_id, assignment_id, status, lives, round_size, created_at)
         values (?, ?, 'playing', ?, ?, ?)`,
        user.id,
        assignment.id,
        START_LIVES,
        chosen.length,
        nowIso(),
      );
      for (let position = 0; position < chosen.length; position += 1) {
        const question = chosen[position];
        const dealt = dealChoices(question);
        await tx.run(
          `insert into play_deals (play_id, question_id, kind, position, prompt, choices_json, correct_index)
           values (?, ?, 'play', ?, ?, ?, ?)`,
          id,
          question.id,
          position,
          question.prompt,
          JSON.stringify(dealt.choices),
          dealt.correctIndex,
        );
      }
      return id;
    });

    const deals = await db.all(
      `select * from play_deals where play_id = ? and kind = 'play' order by position`,
      playId,
    );
    res.status(201).json({
      playId,
      title: assignment.title,
      topic: assignment.topic,
      accent: assignment.accent,
      lives: START_LIVES,
      questions: deals.map(dealView),
    });
  }));

  function answerJson(play, deal, correct, picked) {
    const choices = choicesOf(deal);
    return {
      correct: !!Number(correct),
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

  app.post('/api/plays/:id/answer', route(async (req, res) => {
    const user = await requireRole(req, res, 'student');
    if (!user) return;
    const playId = intId(req.params.id);
    const play = playId ? await db.get('select * from plays where id = ?', playId) : null;
    if (!play || play.student_id !== user.id) {
      return res.status(404).json({ error: 'That round could not be found.' });
    }
    const questionId = intId(req.body?.questionId);
    const choiceIndex = Number(req.body?.choiceIndex);
    if (!questionId || !Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
      return res.status(400).json({ error: 'Pick one of the answers.' });
    }
    const deal = await db.get(
      `select * from play_deals where play_id = ? and question_id = ? and kind = 'play'`,
      play.id,
      questionId,
    );
    if (!deal) return res.status(400).json({ error: 'That answer is not part of this round.' });

    const existing = await db.get(
      'select * from play_answers where play_id = ? and question_id = ?',
      play.id,
      questionId,
    );
    if (existing) {
      const fresh = await db.get('select * from plays where id = ?', play.id);
      res.json(answerJson(fresh, deal, existing.correct, existing.choice_index));
      return;
    }
    if (play.status !== 'playing') {
      return res.status(400).json({ error: 'This round is already finished.' });
    }
    if (Number(deal.position) !== Number(play.cursor_index)) {
      return res.status(400).json({ error: 'Answer the question on the screen.' });
    }

    const correct = choiceIndex === Number(deal.correct_index) ? 1 : 0;
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
    const cursor = Number(play.cursor_index) + 1;
    const finished = lives <= 0 || cursor >= Number(play.round_size);
    const stars = finished ? computeStars({ correctCount, missCount, roundSize: Number(play.round_size) }) : null;

    await db.transaction(async (tx) => {
      await tx.run(
        `insert into play_answers (play_id, question_id, prompt, choice_index, correct_index, correct)
         values (?, ?, ?, ?, ?, ?)`,
        play.id,
        questionId,
        deal.prompt,
        choiceIndex,
        deal.correct_index,
        correct,
      );
      await tx.run(
        `update plays set score = ?, streak = ?, best_streak = ?, lives = ?, correct_count = ?,
         miss_count = ?, cursor_index = ?, status = ?, stars = ?, finished_at = ? where id = ?`,
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
    });

    const fresh = await db.get('select * from plays where id = ?', play.id);
    res.json(answerJson(fresh, deal, correct, choiceIndex));
  }));

  app.get('/api/plays/:id', route(async (req, res) => {
    const user = await requireRole(req, res, 'student');
    if (!user) return;
    const play = await db.get('select * from plays where id = ?', intId(req.params.id));
    if (!play || play.student_id !== user.id || play.status !== 'finished') {
      return res.status(404).json({ error: 'That score could not be found.' });
    }
    const assignment = await loadAssignment(play.assignment_id);
    const survey = await db.get('select * from surveys where play_id = ?', play.id);
    const check = await db.get(
      'select coalesce(sum(correct), 0)::int as correct, count(*)::int as total from check_answers where play_id = ?',
      play.id,
    );
    const planned = count(await db.get(
      `select count(*)::int as n from play_deals where play_id = ? and kind = 'check'`,
      play.id,
    ));
    const answered = Number(check.total);
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
        ? { liked: survey.liked, difficulty: survey.difficulty, skipped: !!Number(survey.skipped) }
        : null,
      check: answered
        ? {
            correct: Number(check.correct),
            answered,
            total: planned || answered,
            done: planned > 0 && answered >= planned,
          }
        : null,
    });
  }));

  app.post('/api/plays/:id/survey', route(async (req, res) => {
    const user = await requireRole(req, res, 'student');
    if (!user) return;
    const play = await db.get('select * from plays where id = ?', intId(req.params.id));
    if (!play || play.student_id !== user.id || play.status !== 'finished') {
      return res.status(404).json({ error: 'Finish a round before the checkup.' });
    }
    const liked = ['not_much', 'okay', 'loved'].includes(req.body?.liked) ? req.body.liked : null;
    const difficulty = ['too_easy', 'just_right', 'too_hard'].includes(req.body?.difficulty)
      ? req.body.difficulty
      : null;
    const skipped = req.body?.skipped ? 1 : 0;
    const existing = await db.get('select id from surveys where play_id = ?', play.id);
    if (existing) {
      await db.run(
        'update surveys set liked = ?, difficulty = ?, skipped = ? where play_id = ?',
        liked,
        difficulty,
        skipped,
        play.id,
      );
    } else {
      await db.run(
        `insert into surveys (play_id, student_id, liked, difficulty, skipped, created_at)
         values (?, ?, ?, ?, ?, ?)`,
        play.id,
        user.id,
        liked,
        difficulty,
        skipped,
        nowIso(),
      );
    }
    res.json({ ok: true, liked, difficulty, skipped: !!skipped });
  }));

  async function checkQuestionsFor(setId) {
    const checks = await db.all(
      `select * from questions where set_id = ? and kind = 'check' order by sort_order`,
      setId,
    );
    const plays = await db.all(
      `select * from questions where set_id = ? and kind = 'play' order by sort_order`,
      setId,
    );
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

  async function ensureCheckDeals(play) {
    const existing = await db.all(
      `select * from play_deals where play_id = ? and kind = 'check' order by position`,
      play.id,
    );
    if (existing.length) return existing;
    const assignment = await loadAssignment(play.assignment_id);
    const questions = await checkQuestionsFor(assignment.set_id);
    for (let position = 0; position < questions.length; position += 1) {
      const question = questions[position];
      const dealt = dealChoices(question);
      await db.run(
        `insert into play_deals (play_id, question_id, kind, position, prompt, choices_json, correct_index)
         values (?, ?, 'check', ?, ?, ?, ?)`,
        play.id,
        question.id,
        position,
        question.prompt,
        JSON.stringify(dealt.choices),
        dealt.correctIndex,
      );
    }
    return db.all(
      `select * from play_deals where play_id = ? and kind = 'check' order by position`,
      play.id,
    );
  }

  app.get('/api/plays/:id/checkup', route(async (req, res) => {
    const user = await requireRole(req, res, 'student');
    if (!user) return;
    const play = await db.get('select * from plays where id = ?', intId(req.params.id));
    if (!play || play.student_id !== user.id || play.status !== 'finished') {
      return res.status(404).json({ error: 'Finish a round before the checkup.' });
    }
    const deals = await ensureCheckDeals(play);
    const answers = await db.all('select * from check_answers where play_id = ?', play.id);
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
            correct: !!Number(answer.correct),
            correctIndex: deal.correct_index,
            correctText: choices[deal.correct_index],
            choiceIndex: answer.choice_index,
          };
        }),
      total: deals.length,
    });
  }));

  app.post('/api/plays/:id/checkup', route(async (req, res) => {
    const user = await requireRole(req, res, 'student');
    if (!user) return;
    const play = await db.get('select * from plays where id = ?', intId(req.params.id));
    if (!play || play.student_id !== user.id || play.status !== 'finished') {
      return res.status(404).json({ error: 'Finish a round before the checkup.' });
    }
    const questionId = intId(req.body?.questionId);
    const choiceIndex = Number(req.body?.choiceIndex);
    if (!questionId || !Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
      return res.status(400).json({ error: 'Pick one of the answers.' });
    }
    const deals = await ensureCheckDeals(play);
    const deal = deals.find((item) => item.question_id === questionId);
    if (!deal) return res.status(400).json({ error: 'That question is not in this checkup.' });
    const existing = await db.get(
      'select * from check_answers where play_id = ? and question_id = ?',
      play.id,
      questionId,
    );
    const choices = choicesOf(deal);
    if (existing) {
      const totals = await db.get(
        'select coalesce(sum(correct), 0)::int as correct, count(*)::int as total from check_answers where play_id = ?',
        play.id,
      );
      res.json({
        correct: !!Number(existing.correct),
        correctIndex: deal.correct_index,
        correctText: choices[deal.correct_index],
        correctCount: Number(totals.correct),
        total: deals.length,
        done: Number(totals.total) >= deals.length,
      });
      return;
    }
    const answeredCount = count(await db.get(
      'select count(*)::int as n from check_answers where play_id = ?',
      play.id,
    ));
    if (Number(deal.position) !== answeredCount) {
      return res.status(400).json({ error: 'Answer the question on the screen.' });
    }
    const correct = choiceIndex === Number(deal.correct_index) ? 1 : 0;
    await db.run(
      `insert into check_answers (play_id, question_id, prompt, choice_index, correct_index, correct)
       values (?, ?, ?, ?, ?, ?)`,
      play.id,
      questionId,
      deal.prompt,
      choiceIndex,
      deal.correct_index,
      correct,
    );
    const totals = await db.get(
      'select coalesce(sum(correct), 0)::int as correct, count(*)::int as total from check_answers where play_id = ?',
      play.id,
    );
    res.json({
      correct: !!correct,
      correctIndex: deal.correct_index,
      correctText: choices[deal.correct_index],
      correctCount: Number(totals.correct),
      total: deals.length,
      done: Number(totals.total) >= deals.length,
    });
  }));

  app.get('/api/results/:id', route(async (req, res) => {
    const user = await requireRole(req, res, 'teacher');
    if (!user) return;
    const assignment = await loadAssignment(intId(req.params.id));
    if (!assignment || assignment.teacher_id !== user.id) {
      return res.status(404).json({ error: 'Those results could not be found.' });
    }
    const klass = await db.get('select * from classes where id = ?', assignment.class_id);
    const students = await db.all(
      `select id, display_name from users where class_id = ? and role = 'student' order by lower(display_name)`,
      assignment.class_id,
    );
    const finished = await db.all(
      `select * from plays where assignment_id = ? and status = 'finished' order by id desc`,
      assignment.id,
    );
    const byStudent = new Map();
    for (const play of finished) {
      if (!byStudent.has(play.student_id)) byStudent.set(play.student_id, []);
      byStudent.get(play.student_id).push(play);
    }

    const roster = [];
    for (const student of students) {
      const plays = byStudent.get(student.id) || [];
      if (!plays.length) {
        roster.push({ studentId: student.id, name: student.display_name, played: false });
        continue;
      }
      const latest = plays[0];
      const best = plays.reduce((winner, play) => (play.score > winner.score ? play : winner), plays[0]);
      const checkPlay = await db.get(
        `select p.id from plays p
         join check_answers c on c.play_id = p.id
         where p.student_id = ? and p.assignment_id = ? and p.status = 'finished'
         group by p.id order by p.id desc limit 1`,
        student.id,
        assignment.id,
      );
      let checkup = null;
      if (checkPlay) {
        const totals = await db.get(
          'select coalesce(sum(correct), 0)::int as correct, count(*)::int as total from check_answers where play_id = ?',
          checkPlay.id,
        );
        checkup = { correct: Number(totals.correct), total: Number(totals.total) };
      }
      roster.push({
        studentId: student.id,
        name: student.display_name,
        played: true,
        plays: plays.length,
        bestScore: best.score,
        bestStars: best.stars,
        lastPlayed: latest.finished_at,
        checkup,
      });
    }

    const surveyRows = await db.all(
      `select s.liked, s.difficulty, s.student_id
       from surveys s join plays p on p.id = s.play_id
       where p.assignment_id = ? and p.status = 'finished'
       order by s.play_id desc`,
      assignment.id,
    );
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

    const checkRows = await db.all(
      `with latest as (
         select p.student_id as student_id, max(p.id) as play_id
         from plays p join check_answers c on c.play_id = p.id
         where p.assignment_id = ? and p.status = 'finished'
         group by p.student_id
       )
       select c.prompt as prompt, sum(c.correct)::int as correct, count(*)::int as total
       from check_answers c join latest l on l.play_id = c.play_id
       group by c.prompt
       order by min(c.id)`,
      assignment.id,
    );
    const checks = checkRows.map((row) => ({
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
          ? Math.round(players.reduce((sum, row) => sum + Number(row.bestScore), 0) / players.length)
          : 0,
        avgStars: players.length
          ? Math.round((players.reduce((sum, row) => sum + Number(row.bestStars), 0) / players.length) * 10) / 10
          : 0,
        surveyStudents,
        checkPercent: checkTotal ? Math.round((checkCorrect / checkTotal) * 100) : null,
      },
      liked,
      difficulty,
      checks,
      roster,
    });
  }));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });
}
