import { hashPassword, nowIso } from './logic.js';
import { openStore } from './sql.js';

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

async function insertQuestion(db, setId, kind, order, item) {
  const [prompt, choices, correctIndex] = item;
  await db.run(
    `insert into questions (
      set_id, kind, prompt, choice_a, choice_b, choice_c, choice_d, correct_index, sort_order
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    setId,
    kind,
    prompt,
    choices[0],
    choices[1],
    choices[2],
    choices[3],
    correctIndex,
    order,
  );
}

async function seed(db) {
  const count = await db.get('select count(*)::int as n from users');
  if (Number(count.n) > 0) return;

  const created = nowIso();
  // Public demo class words. The sign-in screen shows these same words.
  const teacherPass = hashPassword('starlight');
  const lunaPass = hashPassword('rocket');
  const kaiPass = hashPassword('comet');
  const rioPass = hashPassword('planet');

  await db.transaction(async (tx) => {
    const teacherId = await tx.insert(
      `insert into users (username, password_hash, role, display_name, created_at)
       values ('ms-nova', ?, 'teacher', 'Ms. Nova', ?)`,
      teacherPass,
      created,
    );
    const classId = await tx.insert(
      `insert into classes (teacher_id, name, join_code, created_at)
       values (?, 'Room 2 Rockets', 'STAR2', ?)`,
      teacherId,
      created,
    );
    await tx.run('update users set class_id = ? where id = ?', classId, teacherId);

    const lunaId = await tx.insert(
      `insert into users (username, password_hash, role, display_name, class_id, created_at)
       values ('luna', ?, 'student', 'Luna', ?, ?)`,
      lunaPass,
      classId,
      created,
    );
    const kaiId = await tx.insert(
      `insert into users (username, password_hash, role, display_name, class_id, created_at)
       values ('kai', ?, 'student', 'Kai', ?, ?)`,
      kaiPass,
      classId,
      created,
    );
    await tx.insert(
      `insert into users (username, password_hash, role, display_name, class_id, created_at)
       values ('rio', ?, 'student', 'Rio', ?, ?)`,
      rioPass,
      classId,
      created,
    );

    const assignmentByTitle = new Map();
    for (const set of SETS) {
      const setId = await tx.insert(
        `insert into sets (teacher_id, title, topic, blurb, accent, created_at)
         values (?, ?, ?, ?, ?, ?)`,
        teacherId,
        set.title,
        set.topic,
        set.blurb,
        set.accent,
        created,
      );
      for (let index = 0; index < set.play.length; index += 1) {
        await insertQuestion(tx, setId, 'play', index, set.play[index]);
      }
      for (let index = 0; index < set.check.length; index += 1) {
        await insertQuestion(tx, setId, 'check', index, set.check[index]);
      }
      const assignmentId = await tx.insert(
        'insert into assignments (class_id, set_id, created_at) values (?, ?, ?)',
        classId,
        setId,
        created,
      );
      assignmentByTitle.set(set.title, assignmentId);
    }

    const additionId = assignmentByTitle.get('Easy Addition');
    const lunaPlay = await tx.insert(
      `insert into plays (
        student_id, assignment_id, status, score, stars, correct_count, miss_count,
        best_streak, streak, lives, cursor_index, round_size, created_at, finished_at
      ) values (?, ?, 'finished', 1000, 3, 5, 0, 5, 5, 3, 5, 5, ?, ?)`,
      lunaId,
      additionId,
      '2026-11-06T15:00:00.000Z',
      '2026-11-06T15:04:00.000Z',
    );
    const kaiPlay = await tx.insert(
      `insert into plays (
        student_id, assignment_id, status, score, stars, correct_count, miss_count,
        best_streak, streak, lives, cursor_index, round_size, created_at, finished_at
      ) values (?, ?, 'finished', 350, 2, 3, 2, 2, 0, 1, 5, 5, ?, ?)`,
      kaiId,
      additionId,
      '2026-11-06T16:10:00.000Z',
      '2026-11-06T16:14:00.000Z',
    );
    await tx.run(
      `insert into surveys (play_id, student_id, liked, difficulty, skipped, created_at)
       values (?, ?, 'loved', 'just_right', 0, '2026-11-06T15:05:00.000Z')`,
      lunaPlay,
      lunaId,
    );
    await tx.run(
      `insert into surveys (play_id, student_id, liked, difficulty, skipped, created_at)
       values (?, ?, 'okay', 'too_hard', 0, '2026-11-06T16:15:00.000Z')`,
      kaiPlay,
      kaiId,
    );
    const checks = await tx.all(
      `select id, prompt, correct_index from questions
       where set_id = (select set_id from assignments where id = ?) and kind = 'check'
       order by sort_order`,
      additionId,
    );
    for (let index = 0; index < checks.length; index += 1) {
      const question = checks[index];
      await tx.run(
        `insert into check_answers (play_id, question_id, prompt, choice_index, correct_index, correct)
         values (?, ?, ?, ?, ?, 1)`,
        lunaPlay,
        question.id,
        question.prompt,
        question.correct_index,
        question.correct_index,
      );
      const kaiMiss = index === 1 || index === 4 || index === 6;
      const choice = kaiMiss ? (question.correct_index + 1) % 4 : question.correct_index;
      await tx.run(
        `insert into check_answers (play_id, question_id, prompt, choice_index, correct_index, correct)
         values (?, ?, ?, ?, ?, ?)`,
        kaiPlay,
        question.id,
        question.prompt,
        choice,
        question.correct_index,
        kaiMiss ? 0 : 1,
      );
    }
    const last = checks[checks.length - 1];
    await tx.run(
      'update check_answers set choice_index = ?, correct = 0 where play_id = ? and question_id = ?',
      (last.correct_index + 1) % 4,
      lunaPlay,
      last.id,
    );
  });
}

export async function openDatabase() {
  const db = await openStore();
  await seed(db);
  return db;
}
