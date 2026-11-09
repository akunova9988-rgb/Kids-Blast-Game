import { useState } from "react";
import { useApp } from "../context/AppContext";
import MathBackground from "../components/MathBackground";
import styles from "./TeacherLogin.module.css";

export default function TeacherLogin() {
  const { teacherLogin, navigate } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 400));
    if (teacherLogin(username, password)) {
      navigate("teacher-dashboard");
    } else {
      setError("Неверный логин или пароль.");
    }
    setLoading(false);
  }

  return (
    <div className={styles.page}>
      <MathBackground />
      <div className={`card ${styles.loginCard} anim-scale-in`}>
        <button className={styles.backBtn} onClick={() => navigate("home")}>← Назад</button>
        <div className={styles.logoArea}>
          <span className={styles.logo}>👩‍🏫</span>
          <h2>Кабинет учителя</h2>
          <p>Войдите для доступа к панели управления</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label>Логин</label>
            <input
              className="input"
              type="text"
              placeholder="teacher"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !username || !password}
            style={{ width: "100%", marginTop: 8 }}
          >
            {loading ? "Вход..." : "Войти →"}
          </button>
        </form>

        <p className={styles.hint}>Логин: teacher · Пароль: Math2026!</p>
      </div>
    </div>
  );
}
