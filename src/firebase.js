/**
 * Firebase Firestore + localStorage fallback layer.
 *
 * Firestore structure:
 *   /quiz/main          → document: { code, isActive, questions[] }
 *   /quiz/main/students/{id} → document: { name, joinedAt, status, ... }
 *
 * When Firebase is not configured, localStorage mirrors the same structure.
 */
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  getDocs,
  deleteDoc,
  deleteField,
} from "firebase/firestore";
import firebaseConfig, { isFirebaseConfigured } from "./firebaseConfig";

let firebaseApp = null;
let firestoreDb = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp);
  } catch (e) {
    console.warn("Firebase init failed, using localStorage fallback:", e.message);
  }
}

// ── LocalStorage helpers ───────────────────────────────────────────────────

const LS_SETTINGS_KEY = "mq_settings";
const LS_STUDENTS_KEY = "mq_students";

function lsGetSettings() {
  try { return JSON.parse(localStorage.getItem(LS_SETTINGS_KEY)); } catch { return null; }
}
function lsSetSettings(data) {
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("ls-settings-change"));
}
function lsGetStudents() {
  try { return JSON.parse(localStorage.getItem(LS_STUDENTS_KEY)) || {}; } catch { return {}; }
}
function lsSetStudents(data) {
  localStorage.setItem(LS_STUDENTS_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("ls-students-change"));
}

// ── Settings API ───────────────────────────────────────────────────────────

export async function getSettings() {
  if (firestoreDb) {
    const snap = await getDoc(doc(firestoreDb, "quiz", "main"));
    return snap.exists() ? snap.data() : null;
  }
  return lsGetSettings();
}

export async function saveSettings(data) {
  if (firestoreDb) {
    await setDoc(doc(firestoreDb, "quiz", "main"), data, { merge: true });
  } else {
    lsSetSettings({ ...(lsGetSettings() || {}), ...data });
  }
}

export function subscribeSettings(callback) {
  if (firestoreDb) {
    return onSnapshot(doc(firestoreDb, "quiz", "main"), (snap) => {
      callback(snap.exists() ? snap.data() : null);
    });
  }
  const handler = () => callback(lsGetSettings());
  handler();
  window.addEventListener("ls-settings-change", handler);
  return () => window.removeEventListener("ls-settings-change", handler);
}

// ── Students API ───────────────────────────────────────────────────────────

export async function addStudent(id, data) {
  if (firestoreDb) {
    await setDoc(doc(firestoreDb, "quiz", "main", "students", id), data);
  } else {
    const students = lsGetStudents();
    students[id] = data;
    lsSetStudents(students);
  }
}

export async function updateStudent(id, data) {
  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, "quiz", "main", "students", id), data);
    } catch {
      await setDoc(doc(firestoreDb, "quiz", "main", "students", id), data, { merge: true });
    }
  } else {
    const students = lsGetStudents();
    students[id] = { ...(students[id] || {}), ...data };
    lsSetStudents(students);
  }
}

export async function removeStudent(id) {
  if (firestoreDb) {
    await deleteDoc(doc(firestoreDb, "quiz", "main", "students", id));
  } else {
    const students = lsGetStudents();
    delete students[id];
    lsSetStudents(students);
  }
}

export function subscribeStudents(callback) {
  if (firestoreDb) {
    return onSnapshot(collection(firestoreDb, "quiz", "main", "students"), (snap) => {
      const students = {};
      snap.forEach((d) => { students[d.id] = d.data(); });
      callback(students);
    });
  }
  const handler = () => callback(lsGetStudents());
  handler();
  window.addEventListener("ls-students-change", handler);
  return () => window.removeEventListener("ls-students-change", handler);
}

export { isFirebaseConfigured };
