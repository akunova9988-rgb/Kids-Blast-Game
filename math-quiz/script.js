/*
 * ============================================================
 *  MATH QUIZ — script.js
 *  Data layer: localStorage (primary) + Firebase (optional)
 * ============================================================
 *
 *  HOW TO PLUG IN FIREBASE:
 *  1. Go to https://console.firebase.google.com and create a project.
 *  2. Add a Realtime Database, start in test mode.
 *  3. Replace the firebaseConfig object below with your project's config
 *     (found in Project Settings → Your apps → Firebase SDK snippet → Config).
 *  4. The app will automatically sync all quiz state via Firebase so
 *     multiple students on different devices can connect simultaneously.
 *
 *  Without a Firebase config the app works fully via localStorage —
 *  perfect for a single-device demo or same-browser testing.
 * ============================================================
 */

/* ============================================================
   FIREBASE CONFIG — replace with real values to enable sync
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE.firebaseapp.com",
  databaseURL:       "https://REPLACE-default-rtdb.firebaseio.com",
  projectId:         "REPLACE",
  storageBucket:     "REPLACE.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:0000000000000000"
};

let firebaseDb = null;

function initFirebase() {
  try {
    if (
      FIREBASE_CONFIG.apiKey === "REPLACE_WITH_YOUR_API_KEY" ||
      !FIREBASE_CONFIG.databaseURL.startsWith("https://")
    ) {
      console.info("[MathQuiz] Firebase not configured — running in localStorage-only mode.");
      return;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    firebaseDb = firebase.database();
    console.info("[MathQuiz] Firebase connected ✓");
    attachFirebaseListeners();
  } catch (e) {
    console.warn("[MathQuiz] Firebase init failed:", e.message, "— falling back to localStorage.");
    firebaseDb = null;
  }
}

/* ============================================================
   LOCAL STORAGE KEYS
   ============================================================ */
const KEY_CODE    = "mq_quiz_code";
const KEY_STATUS  = "mq_quiz_status";
const KEY_QUESTIONS = "mq_questions";
const KEY_STUDENTS  = "mq_students";
const KEY_RESULTS   = "mq_results";

/* ============================================================
   QUESTION BANK
   ============================================================ */
const DEFAULT_QUESTIONS = [
  {
    id: 1,
    text: "15 × 12 = ?",
    options: ["160", "170", "180", "190"],
    correct: 2,
    explanation: "15 × 12 = 15 × 10 + 15 × 2 = 150 + 30 = 180"
  },
  {
    id: 2,
    text: "Чему равен √144?",
    options: ["12", "14", "16", "11"],
    correct: 0,
    explanation: "12 × 12 = 144, поэтому √144 = 12"
  },
  {
    id: 3,
    text: "Сколько будет 25% от 240?",
    options: ["50", "80", "120", "60"],
    correct: 3,
    explanation: "25% = ¼, 240 ÷ 4 = 60"
  },
  {
    id: 4,
    text: "Чему равна сумма углов треугольника?",
    options: ["90°", "360°", "180°", "270°"],
    correct: 2,
    explanation: "Сумма внутренних углов любого треугольника = 180°"
  },
  {
    id: 5,
    text: "Решите уравнение: 2x + 6 = 20",
    options: ["x = 7", "x = 5", "x = 6", "x = 8"],
    correct: 0,
    explanation: "2x = 20 − 6 = 14, x = 7"
  },
  {
    id: 6,
    text: "Чему равно 2¹⁰?",
    options: ["512", "1024", "1000", "2048"],
    correct: 1,
    explanation: "2¹⁰ = 1024"
  },
  {
    id: 7,
    text: "Площадь круга с радиусом 3 равна:",
    options: ["6π", "3π", "18π", "9π"],
    correct: 3,
    explanation: "S = πr² = π × 3² = 9π"
  },
  {
    id: 8,
    text: "Сколько простых чисел от 1 до 20?",
    options: ["7", "8", "9", "10"],
    correct: 1,
    explanation: "Простые числа: 2, 3, 5, 7, 11, 13, 17, 19 — всего 8"
  },
  {
    id: 9,
    text: "3/4 + 1/6 = ?",
    options: ["4/10", "5/6", "11/12", "7/12"],
    correct: 2,
    explanation: "3/4 = 9/12, 1/6 = 2/12, сумма = 11/12"
  },
  {
    id: 10,
    text: "Чему равна производная функции x²?",
    options: ["x", "x²", "2", "2x"],
    correct: 3,
    explanation: "(x²)' = 2x"
  },
  {
    id: 11,
    text: "Чему равен факториал 5 (5!)?",
    options: ["25", "60", "120", "720"],
    correct: 2,
    explanation: "5! = 5 × 4 × 3 × 2 × 1 = 120"
  },
  {
    id: 12,
    text: "Найдите гипотенузу прямоугольного треугольника с катетами 6 и 8.",
    options: ["9", "10", "12", "14"],
    correct: 1,
    explanation: "c² = 6² + 8² = 36 + 64 = 100, c = 10"
  },
  {
    id: 13,
    text: "Сколько корней у уравнения x² − 9 = 0?",
    options: ["0", "1", "2", "3"],
    correct: 2,
    explanation: "x² = 9, x = ±3 — два корня"
  },
  {
    id: 14,
    text: "Чему равен log₁₀(1000)?",
    options: ["2", "3", "10", "100"],
    correct: 1,
    explanation: "10³ = 1000, поэтому log₁₀(1000) = 3"
  },
  {
    id: 15,
    text: "Какова вероятность выпадения орла дважды подряд при двух подбрасываниях монеты?",
    options: ["1/2", "1/3", "1/4", "1/8"],
    correct: 2,
    explanation: "P = 1/2 × 1/2 = 1/4"
  }
];

/* ============================================================
   DATA ACCESS — always reads/writes localStorage;
   mirrors to Firebase when available
   ============================================================ */
function ls(key, defaultVal) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultVal;
    return JSON.parse(v);
  } catch { return defaultVal; }
}
function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
  if (firebaseDb) {
    firebaseDb.ref("mathquiz/" + key).set(val).catch(() => {});
  }
}

function getCode()      { return ls(KEY_CODE, "MATH2026"); }
function getStatus()    { return ls(KEY_STATUS, "idle"); }
function getQuestions() { return ls(KEY_QUESTIONS, DEFAULT_QUESTIONS); }
function getStudents()  { return ls(KEY_STUDENTS, []); }
function getResults()   { return ls(KEY_RESULTS, []); }

function setCode(v)      { lsSet(KEY_CODE, v); }
function setStatus(v)    { lsSet(KEY_STATUS, v); }
function setQuestions(v) { lsSet(KEY_QUESTIONS, v); }
function setStudents(v)  { lsSet(KEY_STUDENTS, v); }
function setResults(v)   { lsSet(KEY_RESULTS, v); }

/* Firebase real-time listeners — update localStorage from server */
function attachFirebaseListeners() {
  if (!firebaseDb) return;
  const root = firebaseDb.ref("mathquiz");
  root.on("value", snap => {
    const data = snap.val() || {};
    if (data[KEY_STATUS])    localStorage.setItem(KEY_STATUS,    JSON.stringify(data[KEY_STATUS]));
    if (data[KEY_CODE])      localStorage.setItem(KEY_CODE,      JSON.stringify(data[KEY_CODE]));
    if (data[KEY_STUDENTS])  localStorage.setItem(KEY_STUDENTS,  JSON.stringify(data[KEY_STUDENTS]));
    if (data[KEY_RESULTS])   localStorage.setItem(KEY_RESULTS,   JSON.stringify(data[KEY_RESULTS]));
    if (data[KEY_QUESTIONS]) localStorage.setItem(KEY_QUESTIONS, JSON.stringify(data[KEY_QUESTIONS]));
  });
}

/* ============================================================
   SCREEN NAVIGATION
   ============================================================ */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}
function showHome()          { showScreen("screen-home"); }
function showTeacherLogin()  { showScreen("screen-teacher-login"); document.getElementById("teacherUsername").value = ""; document.getElementById("teacherPassword").value = ""; document.getElementById("teacherLoginError").textContent = ""; }
function showStudentLogin()  { showScreen("screen-student-login"); document.getElementById("studentLoginError").textContent = ""; }

/* ============================================================
   MATH BACKGROUND ANIMATION
   ============================================================ */
const BG_SYMBOLS = ["+", "−", "×", "÷", "π", "√", "x²", "∑", "∞", "≠", "≤", "≥", "α", "β", "θ"];

function spawnMathSymbol() {
  const bg = document.getElementById("mathBg");
  if (!bg) return;
  const el = document.createElement("span");
  el.className = "math-symbol";
  el.textContent = BG_SYMBOLS[Math.floor(Math.random() * BG_SYMBOLS.length)];
  el.style.left = Math.random() * 100 + "vw";
  el.style.fontSize = (1.2 + Math.random() * 2.5) + "rem";
  const dur = 8 + Math.random() * 14;
  el.style.animationDuration = dur + "s";
  el.style.animationDelay = "0s";
  bg.appendChild(el);
  setTimeout(() => el.remove(), dur * 1000);
}

function startMathBg() {
  spawnMathSymbol();
  setInterval(spawnMathSymbol, 700);
}

/* ============================================================
   TEACHER AUTH
   ============================================================ */
const TEACHER_USER = "teacher";
const TEACHER_PASS = "Math2026!";

function teacherLogin() {
  const u = document.getElementById("teacherUsername").value.trim();
  const p = document.getElementById("teacherPassword").value;
  const err = document.getElementById("teacherLoginError");
  if (u === TEACHER_USER && p === TEACHER_PASS) {
    err.textContent = "";
    showScreen("screen-teacher-dashboard");
    initTeacherDashboard();
  } else {
    err.textContent = "Неверные учётные данные. Попробуйте снова.";
  }
}
document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    if (document.getElementById("screen-teacher-login").classList.contains("active")) teacherLogin();
    if (document.getElementById("screen-student-login").classList.contains("active")) studentLogin();
  }
});

function teacherLogout() {
  clearInterval(teacherRefreshInterval);
  showHome();
}

/* ============================================================
   TEACHER DASHBOARD
   ============================================================ */
let teacherRefreshInterval = null;

function initTeacherDashboard() {
  renderQuestionsTab();
  renderControlTab();
  renderStudentsTab();
  renderResultsTab();
  clearInterval(teacherRefreshInterval);
  teacherRefreshInterval = setInterval(() => {
    renderStudentsTab();
    renderResultsTab();
    renderControlTab();
  }, 3000);
}

function switchTab(tabId, btn) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  btn.classList.add("active");
}

/* --- Quiz Editor Tab --- */
function renderQuestionsTab() {
  const qs = getQuestions();
  const list = document.getElementById("questionsList");
  const labels = ["A", "B", "C", "D"];
  list.innerHTML = qs.map((q, idx) => `
    <div class="question-item" id="qi-${idx}">
      <div class="q-num">${String(idx + 1).padStart(2, "0")}</div>
      <div class="q-body">
        <div class="q-text">${escHtml(q.text)}</div>
        <div class="q-options">
          ${q.options.map((o, oi) =>
            `<span class="q-opt${oi === q.correct ? " correct" : ""}">${labels[oi]}: ${escHtml(o)}</span>`
          ).join("")}
        </div>
      </div>
      <div class="q-actions">
        <button class="btn btn-sm btn-outline" onclick="editQuestion(${idx})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteQuestion(${idx})">🗑️</button>
      </div>
    </div>
  `).join("") || `<div class="empty-state">Нет вопросов. Добавьте первый!</div>`;
}

function showAddQuestionForm() {
  document.getElementById("questionFormTitle").textContent = "Новый вопрос";
  document.getElementById("editQuestionId").value = "";
  ["qText", "qOpt0", "qOpt1", "qOpt2", "qOpt3", "qExplanation"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("qCorrect").value = "0";
  document.getElementById("questionFormPanel").classList.remove("hidden");
  document.getElementById("qText").focus();
}

function editQuestion(idx) {
  const qs = getQuestions();
  const q = qs[idx];
  document.getElementById("questionFormTitle").textContent = "Редактировать вопрос";
  document.getElementById("editQuestionId").value = idx;
  document.getElementById("qText").value = q.text;
  q.options.forEach((o, i) => document.getElementById("qOpt" + i).value = o);
  document.getElementById("qCorrect").value = q.correct;
  document.getElementById("qExplanation").value = q.explanation || "";
  document.getElementById("questionFormPanel").classList.remove("hidden");
  document.getElementById("questionFormPanel").scrollIntoView({ behavior: "smooth" });
}

function hideQuestionForm() {
  document.getElementById("questionFormPanel").classList.add("hidden");
}

function saveQuestion() {
  const text = document.getElementById("qText").value.trim();
  if (!text) return alert("Введите текст вопроса.");
  const opts = [0,1,2,3].map(i => document.getElementById("qOpt" + i).value.trim());
  if (opts.some(o => !o)) return alert("Заполните все варианты ответа.");
  const correct = parseInt(document.getElementById("qCorrect").value);
  const explanation = document.getElementById("qExplanation").value.trim();

  const qs = getQuestions();
  const idxStr = document.getElementById("editQuestionId").value;
  if (idxStr === "") {
    qs.push({ id: Date.now(), text, options: opts, correct, explanation });
  } else {
    const idx = parseInt(idxStr);
    qs[idx] = { ...qs[idx], text, options: opts, correct, explanation };
  }
  setQuestions(qs);
  hideQuestionForm();
  renderQuestionsTab();
}

function deleteQuestion(idx) {
  if (!confirm("Удалить вопрос?")) return;
  const qs = getQuestions();
  qs.splice(idx, 1);
  setQuestions(qs);
  renderQuestionsTab();
}

/* --- Control Tab --- */
function renderControlTab() {
  const code   = getCode();
  const status = getStatus();
  document.getElementById("currentCode").textContent = code;

  const badge  = document.getElementById("quizStatusBadge");
  const labels = { idle: "Не запущена", active: "Активна", ended: "Завершена" };
  const classes = { idle: "status-idle", active: "status-active", ended: "status-ended" };
  badge.textContent = labels[status] || status;
  badge.className = "status-badge " + (classes[status] || "status-idle");

  document.getElementById("btnStartQuiz").disabled = (status === "active");
  document.getElementById("btnEndQuiz").disabled   = (status !== "active");
}

function changeCode() {
  const area = document.getElementById("codeInputArea");
  area.style.display = area.style.display === "none" ? "block" : "none";
  if (area.style.display === "block") {
    document.getElementById("newCodeInput").value = getCode();
    document.getElementById("newCodeInput").focus();
  }
}

function saveCode() {
  const v = document.getElementById("newCodeInput").value.trim().toUpperCase();
  if (!v) return;
  setCode(v);
  document.getElementById("codeInputArea").style.display = "none";
  renderControlTab();
}

function startQuiz() {
  setStatus("active");
  renderControlTab();
}

function endQuiz() {
  setStatus("ended");
  renderControlTab();
}

/* --- Students Tab --- */
function renderStudentsTab() {
  const students = getStudents();
  const list = document.getElementById("studentsList");
  document.getElementById("studentCount").textContent = students.length + " учен" + (students.length === 1 ? "ик" : "иков");

  if (!students.length) {
    list.innerHTML = `<div class="empty-state">Пока никто не присоединился</div>`;
    return;
  }
  const statusLabel = { waiting: "Ожидает", process: "В процессе", done: "Завершил" };
  const statusClass = { waiting: "status-waiting", process: "status-process", done: "status-done" };
  list.innerHTML = students.map(s => `
    <div class="student-row">
      <div class="student-avatar">${s.name.charAt(0).toUpperCase()}</div>
      <div class="student-info">
        <strong>${escHtml(s.name)}</strong>
        <small>Вошёл: ${formatTime(s.joinTime)}</small>
      </div>
      <span class="student-status ${statusClass[s.status] || "status-waiting"}">
        ${statusLabel[s.status] || s.status}
      </span>
    </div>
  `).join("");
}

/* --- Results Tab --- */
function renderResultsTab() {
  const results = getResults().filter(r => r.status === "done");
  results.sort((a, b) => (b.score - a.score) || (a.timeTaken - b.timeTaken));

  const medals = ["🥇", "🥈", "🥉"];
  const tbody = document.getElementById("leaderboardBody");
  if (!results.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">Нет данных</td></tr>`;
    return;
  }
  tbody.innerHTML = results.map((r, i) => `
    <tr onclick="showBreakdown('${escAttr(r.name)}')">
      <td><span class="rank-medal">${medals[i] || (i + 1)}</span></td>
      <td>${escHtml(r.name)}</td>
      <td>${r.correct} / ${getQuestions().length}</td>
      <td><strong>${r.score}</strong></td>
      <td>${formatDuration(r.timeTaken)}</td>
    </tr>
  `).join("");
}

function showBreakdown(name) {
  const results = getResults();
  const r = results.find(x => x.name === name);
  if (!r) return;
  const qs = getQuestions();
  document.getElementById("breakdownName").textContent = `Ответы: ${name}`;
  const labels = ["A", "B", "C", "D"];
  document.getElementById("breakdownContent").innerHTML = `
    <table class="breakdown-table">
      <thead><tr><th>#</th><th>Вопрос</th><th>Ответ</th><th>Результат</th></tr></thead>
      <tbody>
        ${qs.map((q, i) => {
          const ans = r.answers && r.answers[i];
          const given = (ans !== undefined && ans !== null) ? ans : -1;
          const correct = given === q.correct;
          const noAns = given === -1;
          return `<tr>
            <td>${i + 1}</td>
            <td>${escHtml(q.text)}</td>
            <td>${noAns ? "—" : labels[given]}: ${noAns ? "Нет ответа" : escHtml(q.options[given])}</td>
            <td class="${noAns ? "ans-wrong" : correct ? "ans-correct" : "ans-wrong"}">${noAns ? "✗" : correct ? "✓" : "✗"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
  document.getElementById("breakdownModal").classList.remove("hidden");
}

function closeBreakdown() {
  document.getElementById("breakdownModal").classList.add("hidden");
}

function clearResults() {
  if (!confirm("Очистить все результаты?")) return;
  setResults([]);
  setStudents([]);
  renderResultsTab();
  renderStudentsTab();
}

/* ============================================================
   STUDENT PORTAL
   ============================================================ */
let currentStudent = null;
let waitingPollInterval = null;

function studentLogin() {
  const name = document.getElementById("studentName").value.trim();
  const code = document.getElementById("studentCode").value.trim().toUpperCase();
  const err  = document.getElementById("studentLoginError");

  if (!name) { err.textContent = "Введите ваше имя."; return; }
  if (!code) { err.textContent = "Введите код викторины."; return; }

  const realCode = getCode();
  if (code !== realCode) {
    err.textContent = "Неверный код. Попробуйте ещё раз.";
    return;
  }

  currentStudent = { name, joinTime: Date.now(), status: "waiting", answers: [], score: 0, timeTaken: 0, correct: 0 };
  registerStudent(currentStudent);

  document.getElementById("waitingName").textContent = name;
  showScreen("screen-waiting");
  startWaitingPoll();
}

function registerStudent(student) {
  const students = getStudents();
  const existing = students.findIndex(s => s.name === student.name);
  if (existing >= 0) students[existing] = { ...students[existing], ...student };
  else students.push(student);
  setStudents(students);
}

function startWaitingPoll() {
  clearInterval(waitingPollInterval);
  waitingPollInterval = setInterval(() => {
    const status = getStatus();
    if (status === "active") {
      clearInterval(waitingPollInterval);
      startStudentQuiz();
    }
  }, 2000);
}

/* ============================================================
   STUDENT QUIZ
   ============================================================ */
let quizState = {
  questions: [],
  current: 0,
  answers: [],
  startTime: 0,
  questionStart: 0,
  timerInterval: null,
  timeLeft: 30,
  answered: false
};

const TIMER_DURATION = 30;
const CIRCUMFERENCE = 2 * Math.PI * 44; // r=44

function startStudentQuiz() {
  quizState.questions = getQuestions();
  quizState.current = 0;
  quizState.answers = new Array(quizState.questions.length).fill(null);
  quizState.startTime = Date.now();
  quizState.answered = false;

  document.getElementById("studentNameBadge").textContent = currentStudent.name;
  updateStudentStatus("process");
  showScreen("screen-quiz");
  renderQuestion();
}

function renderQuestion() {
  const qs = quizState.questions;
  const idx = quizState.current;
  const q   = qs[idx];
  const labels = ["A", "B", "C", "D"];

  document.getElementById("questionProgress").textContent = `Вопрос ${idx + 1} из ${qs.length}`;
  document.getElementById("questionNum").textContent = String(idx + 1).padStart(2, "0");
  document.getElementById("questionText").textContent = q.text;

  const pct = (idx / qs.length) * 100;
  document.getElementById("progressBar").style.width = pct + "%";

  const optList = document.getElementById("optionsList");
  optList.innerHTML = q.options.map((o, i) => `
    <button class="option-btn" onclick="selectAnswer(${i})" id="opt-${i}">
      <span class="option-label">${labels[i]}</span>
      <span>${escHtml(o)}</span>
    </button>
  `).join("");

  document.getElementById("nextBtn").classList.add("hidden");
  quizState.answered = false;
  quizState.questionStart = Date.now();
  startTimer();
}

function startTimer() {
  clearInterval(quizState.timerInterval);
  quizState.timeLeft = TIMER_DURATION;
  updateTimerUI();

  quizState.timerInterval = setInterval(() => {
    quizState.timeLeft--;
    updateTimerUI();
    if (quizState.timeLeft <= 0) {
      clearInterval(quizState.timerInterval);
      if (!quizState.answered) autoAdvance();
    }
  }, 1000);
}

function updateTimerUI() {
  const t  = quizState.timeLeft;
  const pct = t / TIMER_DURATION;
  const offset = CIRCUMFERENCE * (1 - pct);
  const ring  = document.getElementById("timerRing");
  const count = document.getElementById("timerCount");
  ring.style.strokeDashoffset = offset;
  count.textContent = t;
  const urgent = t < 10;
  ring.classList.toggle("urgent", urgent);
  count.classList.toggle("urgent", urgent);
}

function selectAnswer(optIdx) {
  if (quizState.answered) return;
  quizState.answered = true;
  clearInterval(quizState.timerInterval);

  quizState.answers[quizState.current] = optIdx;
  document.querySelectorAll(".option-btn").forEach((b, i) => {
    b.disabled = true;
    if (i === optIdx) b.classList.add("selected");
  });
  document.getElementById("nextBtn").classList.remove("hidden");
}

function autoAdvance() {
  quizState.answers[quizState.current] = -1;
  document.querySelectorAll(".option-btn").forEach(b => b.disabled = true);
  setTimeout(nextQuestion, 800);
}

function nextQuestion() {
  quizState.current++;
  if (quizState.current >= quizState.questions.length) {
    finishQuiz();
  } else {
    renderQuestion();
  }
}

function finishQuiz() {
  clearInterval(quizState.timerInterval);

  const qs      = quizState.questions;
  const answers = quizState.answers;
  let correct   = 0;
  answers.forEach((a, i) => { if (a === qs[i].correct) correct++; });

  const timeTaken = Math.round((Date.now() - quizState.startTime) / 1000);
  const score     = correct * 10;

  currentStudent.answers  = answers;
  currentStudent.score    = score;
  currentStudent.correct  = correct;
  currentStudent.timeTaken = timeTaken;
  currentStudent.status   = "done";

  updateStudentStatus("done", { answers, score, correct, timeTaken });
  saveToResults(currentStudent);
  showResults(currentStudent);
}

function updateStudentStatus(status, extra = {}) {
  const students = getStudents();
  const idx = students.findIndex(s => s.name === currentStudent.name);
  if (idx >= 0) {
    students[idx] = { ...students[idx], status, ...extra };
    setStudents(students);
  }
}

function saveToResults(student) {
  const results = getResults();
  const idx = results.findIndex(r => r.name === student.name);
  if (idx >= 0) results[idx] = student;
  else results.push(student);
  setResults(results);
}

/* ============================================================
   RESULTS SCREEN
   ============================================================ */
function showResults(student) {
  const qs = quizState.questions;
  const pct = Math.round((student.correct / qs.length) * 100);

  let grade, trophy;
  if (student.correct >= 13)       { grade = "Отлично! 🌟";                trophy = "🏆"; }
  else if (student.correct >= 10)  { grade = "Очень хорошо! 👍";           trophy = "🥇"; }
  else if (student.correct >= 7)   { grade = "Хорошо!";                    trophy = "🥈"; }
  else if (student.correct >= 4)   { grade = "Нужно ещё потренироваться"; trophy = "📚"; }
  else                             { grade = "Попробуй ещё раз!";          trophy = "💪"; }

  document.getElementById("resultsTrophy").textContent         = trophy;
  document.getElementById("resultsStudentName").textContent    = student.name;
  document.getElementById("resultsGrade").textContent          = grade;
  document.getElementById("statCorrect").textContent           = student.correct;
  document.getElementById("statWrong").textContent             = qs.length - student.correct;
  document.getElementById("statScore").textContent             = student.score;
  document.getElementById("resultsPercent").textContent        = pct + "%";
  document.getElementById("resultsPercentFill").style.width    = "0%";

  showScreen("screen-results");

  setTimeout(() => {
    document.getElementById("resultsPercentFill").style.width = pct + "%";
  }, 100);

  if (student.correct >= 10) spawnConfetti();
}

function playAgain() {
  currentStudent = null;
  clearInterval(waitingPollInterval);
  showStudentLogin();
}

/* ============================================================
   CONFETTI
   ============================================================ */
function spawnConfetti() {
  const colors = ["#6C63FF", "#48CAE4", "#ffd700", "#ff6b6b", "#51cf66", "#ff922b"];
  for (let i = 0; i < 80; i++) {
    setTimeout(() => {
      const el = document.createElement("div");
      el.className = "confetti-piece";
      el.style.left = Math.random() * 100 + "vw";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.setProperty("--tx", (Math.random() * 200 - 100) + "px");
      el.style.width  = (8 + Math.random() * 8) + "px";
      el.style.height = (8 + Math.random() * 8) + "px";
      el.style.borderRadius = Math.random() > .5 ? "50%" : "2px";
      const dur = 2 + Math.random() * 2;
      el.style.animationDuration = dur + "s";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), dur * 1000 + 100);
    }, i * 30);
  }
}

/* ============================================================
   HELPERS
   ============================================================ */
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escAttr(str) { return escHtml(str); }

function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.getHours().toString().padStart(2,"0") + ":" + d.getMinutes().toString().padStart(2,"0");
}

function formatDuration(secs) {
  if (!secs && secs !== 0) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m ? `${m}м ${s}с` : `${s}с`;
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  startMathBg();

  /* Ensure default questions exist in localStorage on first run */
  if (!localStorage.getItem(KEY_QUESTIONS)) setQuestions(DEFAULT_QUESTIONS);
  if (!localStorage.getItem(KEY_CODE))      setCode("MATH2026");
  if (!localStorage.getItem(KEY_STATUS))    setStatus("idle");
});
