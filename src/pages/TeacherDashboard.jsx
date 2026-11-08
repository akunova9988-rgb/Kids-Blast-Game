import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import MathBackground from "../components/MathBackground";
import styles from "./TeacherDashboard.module.css";
import { dbRemove } from "../firebase";

const TABS = [
  { id: "quiz",     label: "Управление",  icon: "⚙️" },
  { id: "questions",label: "Вопросы",     icon: "❓" },
  { id: "students", label: "Ученики",     icon: "👥" },
  { id: "results",  label: "Результаты",  icon: "🏆" },
];

export default function TeacherDashboard() {
  const { teacherLoggedIn, teacherLogout, quizSettings, questions, students, updateQuizCode, updateIsActive, updateQuestions } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState("quiz");

  useEffect(() => {
    if (!teacherLoggedIn) navigate("/teacher");
  }, [teacherLoggedIn, navigate]);

  function handleLogout() {
    teacherLogout();
    navigate("/teacher");
  }

  return (
    <div className={styles.page}>
      <MathBackground />
      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span>👩‍🏫</span>
            <div>
              <div className={styles.sidebarTitle}>Панель учителя</div>
              <div className={styles.sidebarSub}>MATH QUIZ</div>
            </div>
          </div>
          <nav className={styles.nav}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${styles.navItem} ${tab === t.id ? styles.navActive : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
          <button className={`btn btn-danger btn-sm ${styles.logoutBtn}`} onClick={handleLogout}>
            Выйти
          </button>
        </aside>

        {/* Main content */}
        <main className={styles.main}>
          {tab === "quiz" && (
            <QuizManagement
              settings={quizSettings}
              onUpdateCode={updateQuizCode}
              onUpdateActive={updateIsActive}
            />
          )}
          {tab === "questions" && (
            <QuestionEditor questions={questions} onSave={updateQuestions} />
          )}
          {tab === "students" && <StudentsList students={students} />}
          {tab === "results"  && <ResultsTable students={students} />}
        </main>
      </div>
    </div>
  );
}

// ── Quiz Management ───────────────────────────────────────────────────────

function QuizManagement({ settings, onUpdateCode, onUpdateActive }) {
  const [code, setCode] = useState(settings.code);
  const [saved, setSaved] = useState(false);

  useEffect(() => setCode(settings.code), [settings.code]);

  async function handleSaveCode() {
    await onUpdateCode(code.trim().toUpperCase());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={`${styles.section} anim-fade-up`}>
      <h2 className={styles.sectionTitle}>⚙️ Управление викториной</h2>

      <div className={`card card-sm ${styles.settingCard}`}>
        <h3>Код доступа</h3>
        <p className={styles.settingDesc}>Ученики вводят этот код для входа в викторину.</p>
        <div className={styles.codeRow}>
          <input
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={12}
            placeholder="Код доступа"
          />
          <button className="btn btn-primary" onClick={handleSaveCode} disabled={!code.trim()}>
            {saved ? "✓ Сохранено" : "Сохранить"}
          </button>
        </div>
        <div className={styles.currentCode}>
          Текущий код: <strong>{settings.code}</strong>
        </div>
      </div>

      <div className={`card card-sm ${styles.settingCard}`}>
        <h3>Статус викторины</h3>
        <p className={styles.settingDesc}>Включите или выключите доступ к викторине для учеников.</p>
        <div className={styles.toggleRow}>
          <span className={`badge ${settings.isActive ? "badge-success" : "badge-danger"}`}>
            {settings.isActive ? "Активна" : "Остановлена"}
          </span>
          <button
            className={`btn ${settings.isActive ? "btn-danger" : "btn-success"}`}
            onClick={() => onUpdateActive(!settings.isActive)}
          >
            {settings.isActive ? "Остановить" : "Запустить"}
          </button>
        </div>
      </div>

      <div className={`card card-sm ${styles.settingCard}`}>
        <h3>Быстрая статистика</h3>
        <RealtimeStats />
      </div>
    </div>
  );
}

function RealtimeStats() {
  const { students } = useApp();
  const list = Object.values(students);
  const done = list.filter((s) => s.status === "done").length;
  const playing = list.filter((s) => s.status === "playing").length;
  const waiting = list.filter((s) => s.status === "waiting").length;

  return (
    <div className={styles.statsGrid}>
      <div className={styles.statBox}><span>{list.length}</span><small>Всего</small></div>
      <div className={styles.statBox} style={{ color: "#10b981" }}><span>{done}</span><small>Завершили</small></div>
      <div className={styles.statBox} style={{ color: "#6366f1" }}><span>{playing}</span><small>Играют</small></div>
      <div className={styles.statBox} style={{ color: "#f59e0b" }}><span>{waiting}</span><small>Ожидают</small></div>
    </div>
  );
}

// ── Question Editor ───────────────────────────────────────────────────────

function QuestionEditor({ questions, onSave }) {
  const [qs, setQs] = useState(questions);
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setQs(questions), [questions]);

  function startEdit(q) { setEditing({ ...q, options: [...q.options] }); }
  function cancelEdit() { setEditing(null); }

  function saveEdit() {
    if (!editing) return;
    const newQs = qs.map((q) => q.id === editing.id ? editing : q);
    setQs(newQs);
    setEditing(null);
  }

  async function handleSaveAll() {
    await onSave(qs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function deleteQuestion(id) {
    if (!window.confirm("Удалить вопрос?")) return;
    setQs(qs.filter((q) => q.id !== id));
  }

  function addQuestion() {
    const newQ = {
      id: Date.now(),
      text: "Новый вопрос?",
      options: ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
      correct: 0,
    };
    setQs([...qs, newQ]);
    setEditing({ ...newQ, options: [...newQ.options] });
  }

  return (
    <div className={`${styles.section} anim-fade-up`}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>❓ Вопросы ({qs.length})</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={addQuestion}>+ Добавить</button>
          <button className="btn btn-primary btn-sm" onClick={handleSaveAll}>{saved ? "✓ Сохранено" : "Сохранить всё"}</button>
        </div>
      </div>

      {editing && (
        <div className={`card ${styles.editModal} anim-scale-in`}>
          <h3>Редактировать вопрос</h3>
          <div className="form-group">
            <label>Текст вопроса</label>
            <input className="input" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
          </div>
          {editing.options.map((opt, i) => (
            <div className="form-group" key={i}>
              <label>
                Вариант {String.fromCharCode(65 + i)}
                {editing.correct === i && <span className="badge badge-success" style={{ marginLeft: 8 }}>Правильный</span>}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="input"
                  value={opt}
                  onChange={(e) => {
                    const opts = [...editing.options];
                    opts[i] = e.target.value;
                    setEditing({ ...editing, options: opts });
                  }}
                />
                <button
                  className={`btn btn-sm ${editing.correct === i ? "btn-success" : "btn-secondary"}`}
                  onClick={() => setEditing({ ...editing, correct: i })}
                  title="Отметить как правильный"
                >✓</button>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={saveEdit}>Сохранить</button>
            <button className="btn btn-secondary" onClick={cancelEdit}>Отмена</button>
          </div>
        </div>
      )}

      <div className={styles.questionList}>
        {qs.map((q, idx) => (
          <div key={q.id} className={`card card-sm ${styles.questionItem}`}>
            <div className={styles.questionNumber}>#{idx + 1}</div>
            <div className={styles.questionText}>{q.text}</div>
            <div className={styles.questionOptions}>
              {q.options.map((opt, i) => (
                <span key={i} className={`${styles.optionChip} ${q.correct === i ? styles.correctChip : ""}`}>
                  {String.fromCharCode(65 + i)}: {opt}
                </span>
              ))}
            </div>
            <div className={styles.questionActions}>
              <button className="btn btn-secondary btn-sm" onClick={() => startEdit(q)}>Изменить</button>
              <button className="btn btn-danger btn-sm" onClick={() => deleteQuestion(q.id)}>Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Students List ─────────────────────────────────────────────────────────

function StudentsList({ students }) {
  const list = Object.entries(students).sort(([,a],[,b]) => (b.joinedAt||0)-(a.joinedAt||0));

  const statusLabel = { waiting: "Ожидает", playing: "Играет", done: "Завершил" };
  const statusClass = { waiting: "badge-warning", playing: "badge-info", done: "badge-success" };

  async function handleRemove(id) {
    if (!window.confirm("Удалить ученика из списка?")) return;
    await dbRemove(`quiz/students/${id}`);
  }

  const gridStyle = { gridTemplateColumns: "1fr 120px 140px 50px" };

  return (
    <div className={`${styles.section} anim-fade-up`}>
      <h2 className={styles.sectionTitle}>👥 Ученики ({list.length})</h2>
      {list.length === 0 ? (
        <div className={`card ${styles.empty}`}>Пока нет подключённых учеников.</div>
      ) : (
        <div className={styles.table}>
          <div className={`${styles.tableRow} ${styles.tableHeader}`} style={gridStyle}>
            <span>Имя</span>
            <span>Статус</span>
            <span>Присоединился</span>
            <span></span>
          </div>
          {list.map(([id, s]) => (
            <div key={id} className={`${styles.tableRow} card card-sm`} style={gridStyle}>
              <span className={styles.studentName}>{s.name}</span>
              <span>
                <span className={`badge ${statusClass[s.status] || "badge-info"}`}>
                  {statusLabel[s.status] || s.status}
                </span>
              </span>
              <span className={styles.time}>
                {s.joinedAt ? new Date(s.joinedAt).toLocaleTimeString("ru-RU") : "—"}
              </span>
              <span>
                <button className="btn btn-danger btn-sm" onClick={() => handleRemove(id)}>✕</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Results Table ─────────────────────────────────────────────────────────

function ResultsTable({ students }) {
  const done = Object.entries(students)
    .filter(([, s]) => s.status === "done")
    .sort(([,a],[,b]) => (b.score||0) - (a.score||0) || (a.timeSeconds||9999) - (b.timeSeconds||9999));

  const gridStyle = { gridTemplateColumns: "60px 1fr 110px 100px 90px 80px" };

  return (
    <div className={`${styles.section} anim-fade-up`}>
      <h2 className={styles.sectionTitle}>🏆 Результаты</h2>
      {done.length === 0 ? (
        <div className={`card ${styles.empty}`}>Нет результатов. Ждём учеников...</div>
      ) : (
        <div className={styles.table}>
          <div className={`${styles.tableRow} ${styles.tableHeader}`} style={gridStyle}>
            <span>Место</span>
            <span>Имя</span>
            <span>Правильно</span>
            <span>Неверно</span>
            <span>Баллы</span>
            <span>Время</span>
          </div>
          {done.map(([id, s], idx) => (
            <div key={id} className={`${styles.tableRow} card card-sm ${idx < 3 ? styles.topRow : ""}`} style={gridStyle}>
              <span className={styles.rank}>
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
              </span>
              <span className={styles.studentName}>{s.name}</span>
              <span className={styles.correct}>{s.correctCount ?? 0} ✓</span>
              <span className={styles.wrong}>{(s.answers?.length||15) - (s.correctCount||0)} ✗</span>
              <span className={styles.score}>{s.score ?? 0}</span>
              <span className={styles.time}>{s.timeSeconds ? `${s.timeSeconds}с` : "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
