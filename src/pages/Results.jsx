import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import MathBackground from "../components/MathBackground";
import styles from "./Results.module.css";

function getGrade(correct) {
  if (correct >= 13) return { label: "Отлично! 🌟",                       color: "#10b981", bg: "#d1fae5" };
  if (correct >= 10) return { label: "Очень хорошо! 🎉",                  color: "#6366f1", bg: "#ede9fe" };
  if (correct >=  7) return { label: "Хорошо! 👍",                        color: "#3b82f6", bg: "#dbeafe" };
  if (correct >=  4) return { label: "Нужно ещё потренироваться. 📚",     color: "#f59e0b", bg: "#fef3c7" };
  return               { label: "Попробуй ещё раз! 💪",                   color: "#ef4444", bg: "#fee2e2" };
}

export default function Results({ data }) {
  const { studentSession, clearStudentSession, navigate, quizSettings } = useApp();
  const [confetti, setConfetti] = useState([]);

  const answers   = data?.answers || [];
  const questions = data?.questions || quizSettings.questions || [];
  const timeSeconds = data?.timeSeconds || 0;

  const correctCount = answers.filter((a, i) => a === questions[i]?.correct).length;
  const wrongCount   = questions.length - correctCount;
  const percentage   = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const score        = correctCount * 10;
  const grade        = getGrade(correctCount);
  const name         = studentSession?.name || "Ученик";

  useEffect(() => {
    setConfetti(
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 3,
        color: ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#f43f5e","#fde68a"][i % 7],
        size: 6 + Math.random() * 10,
        isCircle: Math.random() > 0.5,
      }))
    );
  }, []);

  const mins   = Math.floor(timeSeconds / 60);
  const secs   = timeSeconds % 60;
  const timeStr = mins > 0 ? `${mins}м ${secs}с` : `${secs}с`;

  function handlePlayAgain() {
    clearStudentSession();
    navigate("student-login");
  }

  return (
    <div className={styles.page}>
      <MathBackground />

      {/* Confetti */}
      <div className={styles.confettiContainer} aria-hidden="true">
        {confetti.map((p) => (
          <div
            key={p.id}
            className={styles.confetti}
            style={{
              left: `${p.left}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              backgroundColor: p.color,
              width: p.size,
              height: p.size,
              borderRadius: p.isCircle ? "50%" : "2px",
            }}
          />
        ))}
      </div>

      <div className={`${styles.container} anim-fade-up`}>
        {/* Grade card */}
        <div className={`card ${styles.gradeCard}`}>
          <div className={styles.gradeEmoji}>🎊</div>
          <h1 className={styles.studentName}>{name}</h1>
          <div className={styles.gradeBadge} style={{ color: grade.color, background: grade.bg }}>
            {grade.label}
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={`card card-sm ${styles.statCard}`}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statValue} style={{ color: "#10b981" }}>{correctCount}</div>
            <div className={styles.statLabel}>Правильно</div>
          </div>
          <div className={`card card-sm ${styles.statCard}`}>
            <div className={styles.statIcon}>❌</div>
            <div className={styles.statValue} style={{ color: "#ef4444" }}>{wrongCount}</div>
            <div className={styles.statLabel}>Неверно</div>
          </div>
          <div className={`card card-sm ${styles.statCard}`}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statValue} style={{ color: "#6366f1" }}>{percentage}%</div>
            <div className={styles.statLabel}>Процент</div>
          </div>
          <div className={`card card-sm ${styles.statCard}`}>
            <div className={styles.statIcon}>⏱</div>
            <div className={styles.statValue} style={{ color: "#f59e0b" }}>{timeStr}</div>
            <div className={styles.statLabel}>Время</div>
          </div>
        </div>

        {/* Score */}
        <div className={`card ${styles.scoreCard}`}>
          <div className={styles.scoreLabel}>Итоговый балл</div>
          <div className={styles.scoreValue}>{score}</div>
          <div className={styles.scoreMax}>из {questions.length * 10}</div>
        </div>

        {/* Answer review */}
        <div className={`card ${styles.reviewCard}`}>
          <h3 className={styles.reviewTitle}>Ответы на вопросы</h3>
          <div className={styles.reviewList}>
            {questions.map((q, i) => {
              const userAns = answers[i];
              const isCorrect = userAns === q.correct;
              const skipped = userAns === -1 || userAns === undefined;
              return (
                <div
                  key={q.id}
                  className={`${styles.reviewItem} ${isCorrect ? styles.reviewCorrect : styles.reviewWrong}`}
                >
                  <span className={styles.reviewNum}>#{i + 1}</span>
                  <span className={styles.reviewText}>{q.text}</span>
                  <span className={styles.reviewResult}>
                    {skipped ? "⏭ Пропущен" : isCorrect ? "✓" : `✗ → ${q.options[q.correct]}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={handlePlayAgain}>🔄 Играть снова</button>
          <button className="btn btn-secondary" onClick={() => navigate("home")}>🏠 На главную</button>
        </div>
      </div>
    </div>
  );
}
