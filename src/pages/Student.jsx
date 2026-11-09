import { useState } from "react";
import { useApp } from "../context/AppContext";
import { addStudent, getSettings } from "../firebase";
import MathBackground from "../components/MathBackground";
import styles from "./Student.module.css";

export default function Student() {
  const { quizSettings, saveStudentSession, navigate } = useApp();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setLoading(true);
    setError("");

    // Re-fetch latest settings for authoritative code check
    const settings = await getSettings();
    const currentCode = settings?.code || quizSettings.code;
    const isActive = settings?.isActive ?? quizSettings.isActive;

    if (code.trim().toUpperCase() !== currentCode.toUpperCase()) {
      setError("Неверный код. Попробуйте ещё раз.");
      setLoading(false);
      return;
    }

    if (!isActive) {
      setError("Викторина сейчас не активна. Дождитесь учителя.");
      setLoading(false);
      return;
    }

    const id = `student_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await addStudent(id, {
      name: name.trim(),
      joinedAt: Date.now(),
      status: "waiting",
      answers: [],
      score: 0,
      correctCount: 0,
      timeSeconds: 0,
    });

    saveStudentSession({ id, name: name.trim() });
    navigate("quiz");
    setLoading(false);
  }

  return (
    <div className={styles.page}>
      <MathBackground />
      <div className={`card ${styles.joinCard} anim-scale-in`}>
        <button className={styles.backBtn} onClick={() => navigate("home")}>← Назад</button>

        <div className={styles.logoArea}>
          <span className={styles.logo}>🎓</span>
          <h2>Кабинет ученика</h2>
          <p>Введите имя и код для входа в викторину</p>
        </div>

        <form onSubmit={handleJoin} className={styles.form}>
          <div className="form-group">
            <label>Ваше имя</label>
            <input
              className="input"
              type="text"
              placeholder="Введите ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Код викторины</label>
            <input
              className="input"
              type="text"
              placeholder="Например: MATH2026"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !name.trim() || !code.trim()}
            style={{ width: "100%", marginTop: 8 }}
          >
            {loading ? "Вход..." : "Начать викторину →"}
          </button>
        </form>
      </div>
    </div>
  );
}
