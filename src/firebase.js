import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, push, update, remove } from "firebase/database";
import firebaseConfig, { isFirebaseConfigured } from "./firebaseConfig";

let app = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  } catch (e) {
    console.warn("Firebase init failed, using localStorage fallback:", e.message);
  }
}

// ── LocalStorage fallback helpers ──────────────────────────────────────────

const LS_KEY = "mathquiz_data";

function lsRead() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}

function lsWrite(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function getByPath(obj, path) {
  return path.split("/").filter(Boolean).reduce((acc, key) => acc?.[key], obj);
}

function setByPath(obj, path, value) {
  const keys = path.split("/").filter(Boolean);
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function delByPath(obj, path) {
  const keys = path.split("/").filter(Boolean);
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]]) return;
    cur = cur[keys[i]];
  }
  delete cur[keys[keys.length - 1]];
}

// ── Unified API ────────────────────────────────────────────────────────────

export async function dbSet(path, value) {
  if (db) {
    await set(ref(db, path), value);
  } else {
    const data = lsRead();
    setByPath(data, path, value);
    lsWrite(data);
    window.dispatchEvent(new CustomEvent("ls-change", { detail: { path } }));
  }
}

export async function dbUpdate(path, value) {
  if (db) {
    await update(ref(db, path), value);
  } else {
    const data = lsRead();
    const existing = getByPath(data, path) || {};
    setByPath(data, path, { ...existing, ...value });
    lsWrite(data);
    window.dispatchEvent(new CustomEvent("ls-change", { detail: { path } }));
  }
}

export async function dbGet(path) {
  if (db) {
    const snap = await get(ref(db, path));
    return snap.val();
  } else {
    return getByPath(lsRead(), path) ?? null;
  }
}

export async function dbPush(path, value) {
  if (db) {
    const r = push(ref(db, path));
    await set(r, value);
    return r.key;
  } else {
    const data = lsRead();
    const id = `ls_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const existing = getByPath(data, path) || {};
    setByPath(data, path, { ...existing, [id]: value });
    lsWrite(data);
    window.dispatchEvent(new CustomEvent("ls-change", { detail: { path } }));
    return id;
  }
}

export async function dbRemove(path) {
  if (db) {
    await remove(ref(db, path));
  } else {
    const data = lsRead();
    delByPath(data, path);
    lsWrite(data);
    window.dispatchEvent(new CustomEvent("ls-change", { detail: { path } }));
  }
}

export function dbSubscribe(path, callback) {
  if (db) {
    const unsubscribe = onValue(ref(db, path), (snap) => callback(snap.val()));
    return unsubscribe;
  } else {
    const handler = () => callback(getByPath(lsRead(), path) ?? null);
    handler(); // initial call
    window.addEventListener("ls-change", handler);
    return () => window.removeEventListener("ls-change", handler);
  }
}

export { isFirebaseConfigured };
