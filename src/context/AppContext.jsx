import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getSettings,
  saveSettings,
  subscribeSettings,
  subscribeStudents,
} from "../firebase";
import { DEFAULT_QUESTIONS } from "../questions";

const AppContext = createContext(null);

const DEFAULT_SETTINGS = {
  code: "MATH2026",
  isActive: true,
  questions: DEFAULT_QUESTIONS,
};

// ── View state machine ─────────────────────────────────────────────────────
// 'home' | 'teacher-login' | 'teacher-dashboard' | 'student-login' | 'quiz' | 'results'

export function AppProvider({ children }) {
  const [view, setView] = useState("home");
  const [viewData, setViewData] = useState(null); // extra data for current view

  const [teacherLoggedIn, setTeacherLoggedIn] = useState(
    () => sessionStorage.getItem("teacher_auth") === "true"
  );
  const [quizSettings, setQuizSettings] = useState(DEFAULT_SETTINGS);
  const [students, setStudents] = useState({});
  const [studentSession, setStudentSession] = useState(
    () => JSON.parse(sessionStorage.getItem("student_session") || "null")
  );

  // Subscribe to settings
  useEffect(() => {
    const unsub = subscribeSettings((val) => {
      if (val) setQuizSettings({ ...DEFAULT_SETTINGS, ...val });
    });
    return unsub;
  }, []);

  // Subscribe to students
  useEffect(() => {
    const unsub = subscribeStudents(setStudents);
    return unsub;
  }, []);

  // Seed default settings on first run
  useEffect(() => {
    (async () => {
      const existing = await getSettings();
      if (!existing) await saveSettings(DEFAULT_SETTINGS);
    })();
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────
  const navigate = useCallback((target, data = null) => {
    setView(target);
    setViewData(data);
    window.scrollTo(0, 0);
  }, []);

  // ── Teacher auth ───────────────────────────────────────────────────────
  function teacherLogin(username, password) {
    if (username === "teacher" && password === "Math2026!") {
      sessionStorage.setItem("teacher_auth", "true");
      setTeacherLoggedIn(true);
      return true;
    }
    return false;
  }

  function teacherLogout() {
    sessionStorage.removeItem("teacher_auth");
    setTeacherLoggedIn(false);
    navigate("home");
  }

  // ── Quiz settings ──────────────────────────────────────────────────────
  async function updateQuizCode(code) {
    await saveSettings({ code });
  }

  async function updateIsActive(isActive) {
    await saveSettings({ isActive });
  }

  async function updateQuestions(questions) {
    await saveSettings({ questions });
  }

  // ── Student session ────────────────────────────────────────────────────
  function saveStudentSession(session) {
    sessionStorage.setItem("student_session", JSON.stringify(session));
    setStudentSession(session);
  }

  function clearStudentSession() {
    sessionStorage.removeItem("student_session");
    setStudentSession(null);
  }

  return (
    <AppContext.Provider
      value={{
        view,
        viewData,
        navigate,
        teacherLoggedIn,
        teacherLogin,
        teacherLogout,
        quizSettings,
        students,
        updateQuizCode,
        updateIsActive,
        updateQuestions,
        studentSession,
        saveStudentSession,
        clearStudentSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
