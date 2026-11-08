import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { dbUpdate } from "../firebase";
import MathBackground from "../components/MathBackground";
import styles from "./Quiz.module.css";

const TIME_PER_QUESTION = 30;

export default function Quiz() {
  const { studentSession, questions, clearStudentSession } = useApp();
  const navigate = useNavigate();

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [canNext, setCanNext] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [startTime] = useState(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    if (!studentSession) {
      navigate("/student");
    }
  }, [studentSession, navigate]);

  // Update student status to "playing"
  useEffect(() => {
    if (studentSession?.id) {
      dbUpdate(`quiz/students/${studentSession.id}`, { status: "playing" });
    }
  }, [studentSession]);

  const goNext = useCallback(() => {
    if (transitioning) return;
    const chosenAnswer = selected ?? -1;
    const newAnswers = [...answers, chosenAnswer];

    if (current + 1 >= questions.length) {
      // Quiz done
      const correctCount = newAnswers.filter((a, i) => a === questions[i]?.correct).length;
      const score = correctCount * 10;
      const timeSeconds = Math.round((Date.now() - startTime) / 1000);

      if (studentSession?.id) {
        dbUpdate(`quiz/students/${studentSession.id}`, {
          status: "done",
          answers: newAnswers,
          score,
          correctCount,
          timeSeconds,
          finishedAt: Date.now(),
        });
      }

      navigate("/results", { state: { answers: newAnswers, questions, timeSeconds } });
    } else {
      setTransitioning(true);
      setTimeout(() => {
        setAnswers(newAnswers);
        setCurrent((c) => c + 1);
        setSelected(null);
        setTimeLeft(TIME_PER_QUESTION);
        setCanNext(false);
        setTransitioning(false);
      }, 300);
    }
  }, [transitioning, selected, answers, current, questions, startTime, studentSession, navigate]);

  // Timer
  useEffect(() => {
    if (canNext) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setCanNext(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current, canNext]);

  function handleSelect(idx) {
    if (selected !== null || canNext) return;
    setSelected(idx);
    setCanNext(true);
    clearInterval(timerRef.current);
  }

  if (!studentSession || !questions.length) return null;

  const q = questions[current];
  const progress = ((current) / questions.length) * 100;
  const timerProgress = (timeLeft / TIME_PER_QUESTION) * 100;

  return (
    <div className={styles.page}>
      <MathBackground />
      <div className={`${styles.container} ${transitioning ? styles.transitioning : ""}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.studentName}>👤 {studentSession.name}</div>
          <div className={styles.progress}>
            Вопрос <strong>{current + 1}</strong> из <strong>{questions.length}</strong>
          </div>
        </div>

        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* Timer */}
        <div className={styles.timerRow}>
          <div className={`${styles.timerNumber} ${timeLeft <= 10 ? styles.timerUrgent : ""}`}>
            ⏱ {timeLeft}с
          </div>
          <div className={styles.timerBarWrap}>
            <div
              className={styles.timerBarFill}
              style={{
                width: `${timerProgress}%`,
                background: timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : "#10b981",
              }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className={`card ${styles.questionCard} anim-scale-in`} key={current}>
          <div className={styles.questionNumber}>Вопрос {current + 1}</div>
          <h2 className={styles.questionText}>{q.text}</h2>

          <div className={styles.options}>
            {q.options.map((opt, i) => (
              <button
                key={i}
                className={`${styles.optionBtn} ${selected === i ? styles.optionSelected : ""} ${selected !== null && i !== selected ? styles.optionFaded : ""}`}
                onClick={() => handleSelect(i)}
                disabled={selected !== null || canNext && selected === null}
              >
                <span className={styles.optionLabel}>{String.fromCharCode(65 + i)}</span>
                <span className={styles.optionText}>{opt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Next button */}
        <div className={styles.nextRow}>
          {timeLeft === 0 && selected === null && (
            <div className={styles.timeoutMsg}>Время вышло! Переходим к следующему вопросу.</div>
          )}
          <button
            className={`btn btn-primary ${styles.nextBtn}`}
            onClick={goNext}
            disabled={!canNext}
          >
            {current + 1 >= questions.length ? "Завершить викторину ✓" : "Следующий вопрос →"}
          </button>
        </div>
      </div>
    </div>
  );
}
