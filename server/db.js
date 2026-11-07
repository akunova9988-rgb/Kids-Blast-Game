import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword, nowIso } from './logic.js';

const SETS = [
  {
    title: 'Easy Addition',
    topic: 'Addition',
    blurb: 'Add numbers up to 10.',
    accent: 'gold',
    play: [
      ['2 + 3 = ?', ['4', '5', '6', '1'], 1],
      ['4 + 1 = ?', ['3', '6', '5', '2'], 2],
      ['3 + 3 = ?', ['5', '8', '4', '6'], 3],
      ['5 + 2 = ?', ['7', '6', '8', '3'], 0],
      ['1 + 6 = ?', ['5', '8', '6', '7'], 3],
      ['4 + 4 = ?', ['6', '9', '8', '7'], 2],
      ['2 + 5 = ?', ['6', '7', '10', '8'], 1],
      ['3 + 2 = ?', ['4', '6', '1', '5'], 3],
    ],
    check: [
      ['2 + 2 = ?', ['4', '3', '5', '6'], 0],
      ['6 + 1 = ?', ['5', '8', '7', '6'], 2],
      ['3 + 4 = ?', ['6', '8', '5', '7'], 3],
      ['5 + 1 = ?', ['4', '6', '8', '7'], 1],
      ['4 + 2 = ?', ['7', '5', '6', '8'], 2],
      ['1 + 1 = ?', ['3', '2', '4', '0'], 1],
      ['5 + 3 = ?', ['7', '9', '6', '8'], 3],
      ['2 + 6 = ?', ['9', '7', '6', '8'], 3],
    ],
  },
  {
    title: 'Sight Words',
    topic: 'Reading',
    blurb: 'Find the word you know.',
    accent: 'lilac',
    play: [
      ['Find the word: the', ['cat', 'the', 'run', 'big'], 1],
      ['Find the word: see', ['dog', 'sun', 'hop', 'see'], 3],
      ['I ___ you.', ['like', 'run', 'blue', 'tree'], 0],
      ['We ___ go.', ['red', 'book', 'can', 'sit'], 2],
      ['Find the word: and', ['ant', 'ask', 'all', 'and'], 3],
      ['She ___ hello.', ['jump', 'said', 'green', 'ball'], 1],
      ['Find the word: you', ['yes', 'you', 'yell', 'yam'], 1],
      ['I want ___ play.', ['top', 'toy', 'to', 'two'], 2],
    ],
    check: [
      ['Find the word: like', ['look', 'lake', 'like', 'little'], 2],
      ['We ___ a dog.', ['sat', 'see', 'sun', 'sit'], 1],
      ['You ___ I can go.', ['ant', 'ask', 'and', 'all'], 2],
      ['Find the word: can', ['cat', 'car', 'cap', 'can'], 3],
      ['I ___ the cat.', ['sad', 'sit', 'said', 'sun'], 2],
      ['Come ___ me.', ['to', 'top', 'toy', 'two'], 0],
      ['Find the word: said', ['see', 'said', 'sad', 'sit'], 1],
      ['___ sun is up.', ['a', 'to', 'we', 'the'], 3],
    ],
  },
  {
    title: 'Simple Science',
    topic: 'Science',
    blurb: 'Sun, animals, and water.',
    accent: 'teal',
    play: [
      ['The sun is a…', ['star', 'rock', 'fish', 'tree'], 0],
      ['Plants need…', ['shoes', 'hats', 'water', 'cars'], 2],
      ['A baby dog is a…', ['calf', 'cub', 'kit', 'puppy'], 3],
      ['We see with our…', ['ears', 'eyes', 'nose', 'hands'], 1],
      ['Fish live in…', ['trees', 'nests', 'water', 'sand'], 2],
      ['Birds have…', ['scales', 'fur', 'shells', 'feathers'], 3],
      ['The moon shows at…', ['night', 'lunch', 'noon', 'class'], 0],
      ['Ice is water that is…', ['hot', 'frozen', 'dry', 'soft'], 1],
    ],
    check: [
      ['Stars shine in the…', ['sea', 'sky', 'soil', 'den'], 1],
      ['A baby cat is a…', ['puppy', 'calf', 'kitten', 'foal'], 2],
      ['We hear with our…', ['eyes', 'hands', 'toes', 'ears'], 3],
      ['Birds lay…', ['rocks', 'seeds', 'eggs', 'coins'], 2],
      ['What gives us light in the day?', ['the moon', 'a fish', 'a rock', 'the sun'], 3],
      ['Plants grow in…', ['shoes', 'soil', 'hats', 'cars'], 1],
      ['A fish has…', ['wings', 'hooves', 'fins', 'fur'], 2],
      ['Water can freeze into…', ['sand', 'wind', 'smoke', 'ice'], 3],
    ],
  },
];

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
      display_name TEXT NOT NULL,
      class_id INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY,
      teacher_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      join_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY,
      teacher_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      blurb TEXT NOT NULL DEFAULT '',
      accent TEXT NOT NULL DEFAULT 'gold',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY,
      set_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('play', 'check')),
      prompt TEXT NOT NULL,
      choice_a TEXT NOT NULL,
      choice_b TEXT NOT NULL,
      choice_c TEXT NOT NULL,
      choice_d TEXT NOT NULL,
      correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY,
      class_id INTEGER NOT NULL,
      set_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (class_id, set_id)
    );

    CREATE TABLE IF NOT EXISTS plays (
      id INTEGER PRIMARY KEY,
      student_id INTEGER NOT NULL,
      assignment_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('playing', 'finished', 'abandoned')),
      score INTEGER NOT NULL DEFAULT 0,
      stars INTEGER,
      correct_count INTEGER NOT NULL DEFAULT 0,
      miss_count INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      lives INTEGER NOT NULL,
      cursor_index INTEGER NOT NULL DEFAULT 0,
      round_size INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS play_deals (
      play_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('play', 'check')),
      position INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      choices_json TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      PRIMARY KEY (play_id, question_id, kind)
    );

    CREATE TABLE IF NOT EXISTS play_answers (
      play_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      choice_index INTEGER NOT NULL,
      correct_index INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      PRIMARY KEY (play_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY,
      play_id INTEGER NOT NULL UNIQUE,
      student_id INTEGER NOT NULL,
      liked TEXT CHECK (liked IN ('not_much', 'okay', 'loved')),
      difficulty TEXT CHECK (difficulty IN ('too_easy', 'just_right', 'too_hard')),
      skipped INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS check_answers (
      id INTEGER PRIMARY KEY,
      play_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      choice_index INTEGER NOT NULL,
      correct_index INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      UNIQUE (play_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_questions_set ON questions (set_id, kind, sort_order);
    CREATE INDEX IF NOT EXISTS idx_plays_assignment ON plays (assignment_id, status);
    CREATE INDEX IF NOT EXISTS idx_check_play ON check_answers (play_id);
  `);
}

function insertQuestion(db, setId, kind, order, item) {
  const [prompt, choices, correctIndex] = item;
  db.prepare(
    `INSERT INTO questions (
      set_id, kind, prompt, choice_a, choice_b, choice_c, choice_d, correct_index, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(setId, kind, prompt, choices[0], choices[1], choices[2], choices[3], correctIndex, order);
}

function seed(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return;

  const created = nowIso();
  const teacherPass = hashPassword('starlight');
  const lunaPass = hashPassword('rocket');
  const kaiPass = hashPassword('comet');
  const rioPass = hashPassword('planet');

  db.exec('BEGIN');
  try {
    const teacherId = Number(
      db.prepare(
        `INSERT INTO users (username, password_hash, role, display_name, created_at)
         VALUES ('ms-nova', ?, 'teacher', 'Ms. Nova', ?)`,
      ).run(teacherPass, created).lastInsertRowid,
    );

    const classId = Number(
      db.prepare(
        `INSERT INTO classes (teacher_id, name, join_code, created_at)
         VALUES (?, 'Room 2 Rockets', 'STAR2', ?)`,
      ).run(teacherId, created).lastInsertRowid,
    );
    db.prepare('UPDATE users SET class_id = ? WHERE id = ?').run(classId, teacherId);

    const insertStudent = db.prepare(
      `INSERT INTO users (username, password_hash, role, display_name, class_id, created_at)
       VALUES (?, ?, 'student', ?, ?, ?)`,
    );
    const lunaId = Number(insertStudent.run('luna', lunaPass, 'Luna', classId, created).lastInsertRowid);
    const kaiId = Number(insertStudent.run('kai', kaiPass, 'Kai', classId, created).lastInsertRowid);
    insertStudent.run('rio', rioPass, 'Rio', classId, created);

    const assignmentByTitle = new Map();
    for (const set of SETS) {
      const setId = Number(
        db.prepare(
          `INSERT INTO sets (teacher_id, title, topic, blurb, accent, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(teacherId, set.title, set.topic, set.blurb, set.accent, created).lastInsertRowid,
      );
      set.play.forEach((item, index) => insertQuestion(db, setId, 'play', index, item));
      set.check.forEach((item, index) => insertQuestion(db, setId, 'check', index, item));
      const assignmentId = Number(
        db.prepare(
          `INSERT INTO assignments (class_id, set_id, created_at) VALUES (?, ?, ?)`,
        ).run(classId, setId, created).lastInsertRowid,
      );
      assignmentByTitle.set(set.title, assignmentId);
    }

    const additionId = assignmentByTitle.get('Easy Addition');
    const insertPlay = db.prepare(
      `INSERT INTO plays (
        student_id, assignment_id, status, score, stars, correct_count, miss_count,
        best_streak, streak, lives, cursor_index, round_size, created_at, finished_at
      ) VALUES (?, ?, 'finished', ?, ?, ?, ?, ?, ?, ?, 5, 5, ?, ?)`,
    );
    const lunaPlay = Number(
      insertPlay.run(lunaId, additionId, 1000, 3, 5, 0, 5, 5, 3, '2026-11-06T15:00:00.000Z', '2026-11-06T15:04:00.000Z')
        .lastInsertRowid,
    );
    const kaiPlay = Number(
      insertPlay.run(kaiId, additionId, 350, 2, 3, 2, 2, 0, 1, '2026-11-06T16:10:00.000Z', '2026-11-06T16:14:00.000Z')
        .lastInsertRowid,
    );

    db.prepare(
      `INSERT INTO surveys (play_id, student_id, liked, difficulty, skipped, created_at)
       VALUES (?, ?, 'loved', 'just_right', 0, '2026-11-06T15:05:00.000Z')`,
    ).run(lunaPlay, lunaId);
    db.prepare(
      `INSERT INTO surveys (play_id, student_id, liked, difficulty, skipped, created_at)
       VALUES (?, ?, 'okay', 'too_hard', 0, '2026-11-06T16:15:00.000Z')`,
    ).run(kaiPlay, kaiId);

    const checks = db.prepare(
      `SELECT id, prompt, correct_index FROM questions
       WHERE set_id = (SELECT set_id FROM assignments WHERE id = ?) AND kind = 'check'
       ORDER BY sort_order`,
    ).all(additionId);
    const insertCheck = db.prepare(
      `INSERT INTO check_answers (play_id, question_id, prompt, choice_index, correct_index, correct)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    checks.forEach((question, index) => {
      insertCheck.run(lunaPlay, question.id, question.prompt, question.correct_index, question.correct_index, 1);
      const kaiMiss = index === 1 || index === 4 || index === 6;
      const choice = kaiMiss ? (question.correct_index + 1) % 4 : question.correct_index;
      insertCheck.run(kaiPlay, question.id, question.prompt, choice, question.correct_index, kaiMiss ? 0 : 1);
    });
    // Luna missed the last checkup item so the class is not perfect.
    const last = checks[checks.length - 1];
    db.prepare(
      `UPDATE check_answers SET choice_index = ?, correct = 0 WHERE play_id = ? AND question_id = ?`,
    ).run((last.correct_index + 1) % 4, lunaPlay, last.id);

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function openDatabase(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  migrate(db);
  seed(db);
  return db;
}
