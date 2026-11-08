import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

export const ROUND_SIZE = 5;
export const START_LIVES = 3;
export const ACCENTS = ['gold', 'teal', 'lilac', 'peach'];

export function nowIso() {
  return new Date().toISOString();
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const next = scryptSync(String(password), salt, 32);
  const prev = Buffer.from(hash, 'hex');
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function computeStars({ correctCount, missCount, roundSize }) {
  if (correctCount === roundSize && missCount === 0 && roundSize > 0) return 3;
  if (correctCount >= 1 && correctCount >= missCount) return 2;
  return 1;
}

export function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealChoices(question) {
  const choices = [question.choice_a, question.choice_b, question.choice_c, question.choice_d];
  const order = shuffle([0, 1, 2, 3]);
  return {
    choices: order.map((index) => choices[index]),
    correctIndex: order.indexOf(question.correct_index),
  };
}

export function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(5);
  let code = '';
  for (let i = 0; i < 5; i += 1) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

export function cleanLine(value, max) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function cleanUsername(value) {
  const username = cleanLine(value, 16).toLowerCase();
  if (!/^[a-z0-9-]{3,16}$/.test(username)) return null;
  return username;
}

export function cleanPassword(value) {
  if (typeof value !== 'string') return null;
  if (value.length < 4 || value.length > 32) return null;
  if (/\s/.test(value)) return null;
  return value;
}

export function cleanName(value, max = 24) {
  const name = cleanLine(value, max);
  if (!/^[\p{L}\p{N} .'-]{1,32}$/u.test(name)) return null;
  if (name.length > max) return null;
  return name;
}

export function validateQuestion(raw) {
  const prompt = cleanLine(raw?.prompt, 120);
  const choices = Array.isArray(raw?.choices) ? raw.choices.map((choice) => cleanLine(choice, 28)) : [];
  const correctIndex = Number(raw?.correctIndex);
  if (prompt.length < 2) return { error: 'Each question needs a few words.' };
  if (choices.length !== 4 || choices.some((choice) => choice.length < 1)) {
    return { error: 'Each question needs four answers.' };
  }
  const unique = new Set(choices.map((choice) => choice.toLowerCase()));
  if (unique.size < 4) return { error: 'The four answers should be different.' };
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    return { error: 'Mark the correct answer on each question.' };
  }
  return { prompt, choices, correctIndex };
}

export function publicQuestion(row) {
  return {
    id: row.id,
    prompt: row.prompt,
    choices: [row.choice_a, row.choice_b, row.choice_c, row.choice_d],
    correctIndex: row.correct_index,
  };
}

export function dummyHash() {
  return `${'ab'.repeat(16)}:${'cd'.repeat(32)}`;
}
