import { createContext, useContext, useState, useEffect } from "react";
import { dbGet, dbSet, dbSubscribe } from "../firebase";
import { DEFAULT_QUESTIONS } from "../questions";

const AppContext = createContext(null);

const DEFAULT_SETTINGS = {
  code: "MATH2026",
  isActive: true,
};

export function AppProvider({ children }) {
  const [teacherLoggedIn, setTeacherLoggedIn] = useState(
    () => sessionStorage.getItem("teacher_auth") === "true"
  );
  const [quizSettings, setQuizSettings] = useState(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [students, setStudents] = useState({});
  const [studentSession, setStudentSession] = useState(
    () => JSON.parse(sessionStorage.getItem("student_session") || "null")
  );

  // Subscribe to quiz settings in real-time
  useEffect(() => {
    const unsub = dbSubscribe("quiz/settings", (val) => {
      if (val) {
        setQuizSettings({ code: val.code || DEFAULT_SETTINGS.code, isActive: val.isActive ?? true });
        if (val.questions && Array.isArray(val.questions)) setQuestions(val.questions);
      }
    });
    return unsub;
  }, []);

  // Subscribe to students in real-time
  useEffect(() => {
    const unsub = dbSubscribe("quiz/students", (val) => {
      setStudents(val || {});
    });
    return unsub;
  }, []);

  // Initialize default settings on first load
  useEffect(() => {
    (async () => {
      const existing = await dbGet("quiz/settings");
      if (!existing) {
        await dbSet("quiz/settings", { ...DEFAULT_SETTINGS, questions: DEFAULT_QUESTIONS });
      }
    })();
  }, []);

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
  }

  async function updateQuizCode(code) {
    await dbSet("quiz/settings/code", code);
  }

  async function updateIsActive(isActive) {
    await dbSet("quiz/settings/isActive", isActive);
  }

  async function updateQuestions(newQuestions) {
    await dbSet("quiz/settings/questions", newQuestions);
  }

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
        teacherLoggedIn,
        teacherLogin,
        teacherLogout,
        quizSettings,
        questions,
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
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
