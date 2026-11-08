import { useApp } from "../context/AppContext";
import MathBackground from "../components/MathBackground";
import styles from "./Home.module.css";

export default function Home() {
  const { navigate } = useApp();

  return (
    <div className={styles.page}>
      <MathBackground />
      <div className={styles.content}>
        <div className={`${styles.hero} anim-fade-up`}>
          <div className={styles.iconRow}>
            <span>📐</span><span>🔢</span><span>📏</span>
          </div>
          <h1 className={styles.title}>MATH QUIZ</h1>
          <p className={styles.subtitle}>Интерактивная математическая викторина</p>
        </div>

        <div className={`${styles.buttons} anim-fade-up`} style={{ animationDelay: "0.15s" }}>
          <button
            className={`${styles.bigBtn} ${styles.teacherBtn}`}
            onClick={() => navigate("teacher-login")}
          >
            <span className={styles.btnIcon}>👩‍🏫</span>
            <span>Кабинет учителя</span>
            <span className={styles.btnArrow}>→</span>
          </button>

          <button
            className={`${styles.bigBtn} ${styles.studentBtn}`}
            onClick={() => navigate("student-login")}
          >
            <span className={styles.btnIcon}>🎓</span>
            <span>Кабинет ученика</span>
            <span className={styles.btnArrow}>→</span>
          </button>
        </div>

        <p className={`${styles.footer} anim-fade-in`} style={{ animationDelay: "0.3s" }}>
          15 вопросов · 30 секунд на вопрос · Таблица лидеров в реальном времени
        </p>
      </div>
    </div>
  );
}
