'use strict';

/* ============================================================
   QUESTION BANK — 60 questions (20 per difficulty)
   All math verified correct.
============================================================ */
const questions = {
  easy: [
    {
      category: 'Арифметика',
      question: 'Сколько будет 47 + 38?',
      answers: ['85', '75', '84', '83'],
      correct: 0,
      explanation: '47 + 38 = 85. Складываем единицы: 7+8=15, пишем 5, переносим 1. Десятки: 4+3+1=8. Итого 85.'
    },
    {
      category: 'Арифметика',
      question: 'Сколько будет 120 − 57?',
      answers: ['63', '53', '73', '67'],
      correct: 0,
      explanation: '120 − 57 = 63. Занимаем десяток: 10+10−7=3, 11−5−1=5... Итого 63.'
    },
    {
      category: 'Арифметика',
      question: 'Сколько будет 9 × 8?',
      answers: ['72', '64', '81', '63'],
      correct: 0,
      explanation: '9 × 8 = 72. Это таблица умножения: 9×8=72.'
    },
    {
      category: 'Арифметика',
      question: 'Сколько будет 144 ÷ 12?',
      answers: ['12', '11', '13', '14'],
      correct: 0,
      explanation: '144 ÷ 12 = 12, так как 12 × 12 = 144.'
    },
    {
      category: 'Арифметика',
      question: 'Сколько будет 25 × 4?',
      answers: ['100', '90', '110', '120'],
      correct: 0,
      explanation: '25 × 4 = 100. Четверть от 400, или: 25×4 = 100.'
    },
    {
      category: 'Дроби',
      question: 'Сколько составляет ½ от числа 80?',
      answers: ['40', '20', '60', '45'],
      correct: 0,
      explanation: '½ × 80 = 40. Делим 80 на 2.'
    },
    {
      category: 'Дроби',
      question: 'Сколько составляет ¼ от числа 60?',
      answers: ['15', '20', '12', '10'],
      correct: 0,
      explanation: '60 ÷ 4 = 15. Одна четверть числа 60 равна 15.'
    },
    {
      category: 'Арифметика',
      question: 'Какое число следует после 99?',
      answers: ['100', '101', '98', '110'],
      correct: 0,
      explanation: '99 + 1 = 100. Следующее целое натуральное число — 100.'
    },
    {
      category: 'Арифметика',
      question: 'Сколько будет 7² (7 в квадрате)?',
      answers: ['49', '14', '42', '56'],
      correct: 0,
      explanation: '7² = 7 × 7 = 49.'
    },
    {
      category: 'Геометрия',
      question: 'Сколько углов у прямоугольника?',
      answers: ['4', '3', '6', '5'],
      correct: 0,
      explanation: 'Прямоугольник — четырёхугольник, у него 4 угла, каждый из которых прямой (90°).'
    },
    {
      category: 'Геометрия',
      question: 'Периметр квадрата со стороной 7 см равен…',
      answers: ['28 см', '21 см', '49 см', '14 см'],
      correct: 0,
      explanation: 'Периметр квадрата = 4 × сторона = 4 × 7 = 28 см.'
    },
    {
      category: 'Логика',
      question: 'Если у Васи 5 яблок, а Маша взяла 3, сколько осталось у Васи?',
      answers: ['2', '3', '8', '5'],
      correct: 0,
      explanation: '5 − 3 = 2. У Васи осталось 2 яблока.'
    },
    {
      category: 'Последовательности',
      question: 'Какое число продолжает ряд: 2, 4, 6, 8, …?',
      answers: ['10', '9', '12', '11'],
      correct: 0,
      explanation: 'Это ряд чётных чисел, каждое следующее больше на 2. После 8 следует 10.'
    },
    {
      category: 'Арифметика',
      question: 'Сколько минут в 2 часах?',
      answers: ['120', '100', '60', '180'],
      correct: 0,
      explanation: '1 час = 60 минут. 2 часа = 2 × 60 = 120 минут.'
    },
    {
      category: 'Арифметика',
      question: 'Сколько сантиметров в 3 метрах?',
      answers: ['300', '30', '3000', '3'],
      correct: 0,
      explanation: '1 метр = 100 см. 3 метра = 3 × 100 = 300 см.'
    },
    {
      category: 'Дроби',
      question: 'Какой дробью обозначается одна третья?',
      answers: ['⅓', '¼', '½', '⅔'],
      correct: 0,
      explanation: 'Одна третья записывается как 1/3 или ⅓.'
    },
    {
      category: 'Логика',
      question: 'Ежедневно Алиса читает 15 страниц. Сколько страниц она прочтёт за 6 дней?',
      answers: ['90', '75', '60', '100'],
      correct: 0,
      explanation: '15 × 6 = 90 страниц.'
    },
    {
      category: 'Арифметика',
      question: 'Сколько будет 1000 − 375?',
      answers: ['625', '635', '615', '725'],
      correct: 0,
      explanation: '1000 − 375 = 625. Проверка: 375 + 625 = 1000. ✓'
    },
    {
      category: 'Последовательности',
      question: 'Какое число продолжает ряд: 1, 3, 9, 27, …?',
      answers: ['81', '54', '36', '63'],
      correct: 0,
      explanation: 'Каждое число умножается на 3: 1→3→9→27→81.'
    },
    {
      category: 'Геометрия',
      question: 'Сколько сторон у треугольника?',
      answers: ['3', '4', '5', '6'],
      correct: 0,
      explanation: 'Треугольник — фигура с тремя сторонами и тремя углами.'
    }
  ],

  medium: [
    {
      category: 'Алгебра',
      question: 'Реши уравнение: 3x + 7 = 22. Чему равно x?',
      answers: ['5', '3', '7', '6'],
      correct: 0,
      explanation: '3x = 22 − 7 = 15, x = 15 ÷ 3 = 5.'
    },
    {
      category: 'Проценты',
      question: '25% от числа 200 равно…',
      answers: ['50', '25', '40', '60'],
      correct: 0,
      explanation: '25% = ¼. 200 ÷ 4 = 50.'
    },
    {
      category: 'Алгебра',
      question: 'Реши уравнение: 2x − 4 = 10. Чему равно x?',
      answers: ['7', '3', '5', '8'],
      correct: 0,
      explanation: '2x = 10 + 4 = 14, x = 14 ÷ 2 = 7.'
    },
    {
      category: 'Арифметика',
      question: 'Сколько будет 15² (15 в квадрате)?',
      answers: ['225', '125', '200', '175'],
      correct: 0,
      explanation: '15² = 15 × 15 = 225.'
    },
    {
      category: 'Проценты',
      question: 'Цена товара 500 руб. Скидка 20%. Сколько стоит товар со скидкой?',
      answers: ['400 руб.', '450 руб.', '350 руб.', '480 руб.'],
      correct: 0,
      explanation: '20% от 500 = 100 руб. 500 − 100 = 400 руб.'
    },
    {
      category: 'Геометрия',
      question: 'Площадь прямоугольника 6 × 8 см равна…',
      answers: ['48 см²', '28 см²', '40 см²', '56 см²'],
      correct: 0,
      explanation: 'Площадь = длина × ширина = 6 × 8 = 48 см².'
    },
    {
      category: 'Алгебра',
      question: 'Если a = 4 и b = 3, чему равно a² + b²?',
      answers: ['25', '49', '16', '30'],
      correct: 0,
      explanation: 'a² + b² = 4² + 3² = 16 + 9 = 25.'
    },
    {
      category: 'Последовательности',
      question: 'Какое число продолжает ряд Фибоначчи: 1, 1, 2, 3, 5, 8, …?',
      answers: ['13', '11', '10', '16'],
      correct: 0,
      explanation: 'В ряду Фибоначчи каждое число = сумма двух предыдущих: 5+8=13.'
    },
    {
      category: 'Проценты',
      question: 'Из 40 учеников 30% получили отличные оценки. Сколько это учеников?',
      answers: ['12', '10', '8', '15'],
      correct: 0,
      explanation: '30% от 40 = 0.30 × 40 = 12 учеников.'
    },
    {
      category: 'Алгебра',
      question: 'Реши: 5(x − 3) = 20. Чему равно x?',
      answers: ['7', '5', '9', '4'],
      correct: 0,
      explanation: '5x − 15 = 20, 5x = 35, x = 7.'
    },
    {
      category: 'Геометрия',
      question: 'Чему равна площадь круга с радиусом 5 см? (π ≈ 3,14)',
      answers: ['78,5 см²', '31,4 см²', '25 см²', '62,8 см²'],
      correct: 0,
      explanation: 'S = π × r² = 3,14 × 25 = 78,5 см².'
    },
    {
      category: 'Проценты',
      question: 'Зарплата выросла с 40 000 до 50 000 руб. На сколько процентов?',
      answers: ['25%', '20%', '10%', '30%'],
      correct: 0,
      explanation: 'Рост = 10 000. Процент = (10 000 ÷ 40 000) × 100 = 25%.'
    },
    {
      category: 'Арифметика',
      question: 'Найди НОД чисел 36 и 48.',
      answers: ['12', '6', '18', '9'],
      correct: 0,
      explanation: '36 = 4×9, 48 = 4×12. НОД(36,48) = 12. (36=2²×3², 48=2⁴×3; НОД=2²×3=12)'
    },
    {
      category: 'Алгебра',
      question: 'Упрости выражение: (x + 3)(x − 3)',
      answers: ['x² − 9', 'x² + 9', 'x² − 6', 'x² + 6'],
      correct: 0,
      explanation: '(a+b)(a−b) = a²−b². Поэтому (x+3)(x−3) = x²−9.'
    },
    {
      category: 'Геометрия',
      question: 'Гипотенуза прямоугольного треугольника с катетами 3 и 4 равна…',
      answers: ['5', '7', '6', '8'],
      correct: 0,
      explanation: 'По теореме Пифагора: c² = 3² + 4² = 9 + 16 = 25, c = 5.'
    },
    {
      category: 'Логика',
      question: 'Если x % 2 = 0, то x является…',
      answers: ['чётным числом', 'нечётным числом', 'простым числом', 'отрицательным числом'],
      correct: 0,
      explanation: 'Если остаток от деления на 2 равен 0, число чётное.'
    },
    {
      category: 'Арифметика',
      question: 'Сколько будет √144?',
      answers: ['12', '14', '16', '11'],
      correct: 0,
      explanation: '√144 = 12, так как 12² = 144.'
    },
    {
      category: 'Последовательности',
      question: 'Найди сумму первых 5 натуральных чисел: 1+2+3+4+5',
      answers: ['15', '12', '20', '10'],
      correct: 0,
      explanation: '1+2+3+4+5 = 15. Формула: n(n+1)/2 = 5×6/2 = 15.'
    },
    {
      category: 'Алгебра',
      question: 'Реши систему: x + y = 10, x − y = 2. Чему равно x?',
      answers: ['6', '4', '8', '5'],
      correct: 0,
      explanation: 'Складываем уравнения: 2x = 12, x = 6. Тогда y = 4.'
    },
    {
      category: 'Проценты',
      question: 'Сколько составляет 15% от 80?',
      answers: ['12', '15', '8', '16'],
      correct: 0,
      explanation: '15% от 80 = 0,15 × 80 = 12.'
    }
  ],

  hard: [
    {
      category: 'Логика',
      question: 'Все птицы летают. Пингвин — птица. Следовательно…',
      answers: ['Вывод ошибочен — не все птицы летают', 'Пингвин летает', 'Пингвин не птица', 'Все животные летают'],
      correct: 0,
      explanation: 'Посылка «Все птицы летают» ложна: пингвины — птицы, но не летают. Силлогизм содержит ошибку.'
    },
    {
      category: 'Алгебра',
      question: 'Реши квадратное уравнение: x² − 5x + 6 = 0. Каковы корни?',
      answers: ['x = 2 и x = 3', 'x = 1 и x = 6', 'x = −2 и x = −3', 'x = 0 и x = 5'],
      correct: 0,
      explanation: 'D = 25−24=1. x = (5±1)/2. x₁ = 3, x₂ = 2. Проверка: (x−2)(x−3)=0.'
    },
    {
      category: 'Геометрия',
      question: 'Площадь равностороннего треугольника со стороной 6 см равна…',
      answers: ['9√3 см²', '18 см²', '12√3 см²', '36 см²'],
      correct: 0,
      explanation: 'S = (√3/4) × a² = (√3/4) × 36 = 9√3 см².'
    },
    {
      category: 'Логика',
      question: 'Трое друзей: Алексей, Борис, Вадим. Один — врач, один — учитель, один — программист. Алексей не врач. Борис не учитель. Вадим — программист. Кто врач?',
      answers: ['Борис', 'Алексей', 'Вадим', 'Неизвестно'],
      correct: 0,
      explanation: 'Вадим — программист. Алексей не врач → Алексей учитель. Значит, Борис — врач.'
    },
    {
      category: 'Алгебра',
      question: 'Найди сумму членов арифметической прогрессии: 2, 5, 8, 11, … (первые 10 членов)',
      answers: ['155', '100', '110', '145'],
      correct: 0,
      explanation: 'a₁=2, d=3, n=10. S = n/2 × (2a₁ + (n−1)d) = 10/2 × (4+27) = 5×31 = 155.'
    },
    {
      category: 'Геометрия',
      question: 'Диагональ квадрата со стороной 5 см равна…',
      answers: ['5√2 см', '10 см', '25 см', '√5 см'],
      correct: 0,
      explanation: 'Диагональ квадрата d = a√2 = 5√2 ≈ 7,07 см.'
    },
    {
      category: 'Алгебра',
      question: 'Реши неравенство: 2x + 3 > 11. Какое множество является решением?',
      answers: ['x > 4', 'x < 4', 'x > 7', 'x ≥ 4'],
      correct: 0,
      explanation: '2x > 11−3 = 8, x > 4. Строгое неравенство, поэтому x > 4.'
    },
    {
      category: 'Последовательности',
      question: 'Найди 10-й член геометрической прогрессии: b₁=2, q=3',
      answers: ['39 366', '19 683', '59 049', '13 122'],
      correct: 0,
      explanation: 'bₙ = b₁ × qⁿ⁻¹ = 2 × 3⁹ = 2 × 19 683 = 39 366.'
    },
    {
      category: 'Логика',
      question: 'Какое наименьшее простое число больше 20?',
      answers: ['23', '21', '22', '25'],
      correct: 0,
      explanation: '21=3×7 (не простое), 22=2×11 (не простое), 23 делится только на 1 и 23 — простое.'
    },
    {
      category: 'Алгебра',
      question: 'Упрости: (a² − b²) ÷ (a − b)',
      answers: ['a + b', 'a − b', 'ab', 'a² + b'],
      correct: 0,
      explanation: 'a²−b² = (a+b)(a−b). Делим на (a−b): получаем (a+b).'
    },
    {
      category: 'Геометрия',
      question: 'Объём куба со стороной 4 см равен…',
      answers: ['64 см³', '48 см³', '16 см³', '96 см³'],
      correct: 0,
      explanation: 'V = a³ = 4³ = 64 см³.'
    },
    {
      category: 'Логика',
      question: 'В шахматном турнире участвуют 8 игроков. Каждый играет с каждым по одной партии. Сколько всего партий?',
      answers: ['28', '32', '56', '16'],
      correct: 0,
      explanation: 'Число пар = C(8,2) = 8×7/2 = 28 партий.'
    },
    {
      category: 'Алгебра',
      question: 'Реши: |2x − 6| = 10. Каковы все решения?',
      answers: ['x = 8 и x = −2', 'x = 8', 'x = −2', 'x = 2 и x = 8'],
      correct: 0,
      explanation: '2x−6=10 → x=8; 2x−6=−10 → x=−2. Оба значения подходят.'
    },
    {
      category: 'Геометрия',
      question: 'Длина окружности с диаметром 10 см (π ≈ 3,14) равна…',
      answers: ['31,4 см', '15,7 см', '78,5 см', '62,8 см'],
      correct: 0,
      explanation: 'L = π × d = 3,14 × 10 = 31,4 см.'
    },
    {
      category: 'Логика',
      question: 'Сколько различных вариантов перестановки 3 букв А, Б, В?',
      answers: ['6', '3', '9', '12'],
      correct: 0,
      explanation: 'Число перестановок из 3 элементов: 3! = 3×2×1 = 6.'
    },
    {
      category: 'Алгебра',
      question: 'Найди значение: log₂(64)',
      answers: ['6', '32', '8', '4'],
      correct: 0,
      explanation: 'log₂(64) = x означает 2ˣ = 64. 2⁶ = 64, поэтому x = 6.'
    },
    {
      category: 'Последовательности',
      question: 'Чему равна сумма всех натуральных чисел от 1 до 100?',
      answers: ['5050', '4950', '5100', '5000'],
      correct: 0,
      explanation: 'S = n(n+1)/2 = 100×101/2 = 5050. (Формула Гаусса)'
    },
    {
      category: 'Геометрия',
      question: 'Сумма углов пятиугольника равна…',
      answers: ['540°', '360°', '720°', '480°'],
      correct: 0,
      explanation: 'Сумма внутренних углов n-угольника = (n−2)×180°. При n=5: 3×180°=540°.'
    },
    {
      category: 'Алгебра',
      question: 'Реши: x² = 81. Каковы все решения?',
      answers: ['x = ±9', 'x = 9', 'x = −9', 'x = ±81'],
      correct: 0,
      explanation: 'x² = 81 имеет два решения: x = 9 и x = −9 (т. е. x = ±9).'
    },
    {
      category: 'Логика',
      question: 'У Маши есть 2 монеты, дающие в сумме 15 рублей. Одна из монет не 5-рублёвая. Какие это монеты?',
      answers: ['10 руб. и 5 руб.', '5 руб. и 10 руб.', '7 руб. и 8 руб.', '15 руб. и 0 руб.'],
      correct: 0,
      explanation: 'Одна монета не 5-рублёвая — это 10-рублёвая. Вторая монета и есть 5-рублёвая! Сумма: 10+5=15.'
    }
  ]
};

/* ============================================================
   BACKGROUND ANIMATION
============================================================ */
const MATH_SYMBOLS = ['+', '−', '×', '÷', 'π', '√', '∑', '∞', '≠', '≤', '≥', '²', '³', 'θ', 'Δ', '∫', 'α', 'β'];

function createBgSymbols() {
  const container = document.getElementById('bgSymbols');
  container.innerHTML = '';
  const count = window.innerWidth < 600 ? 14 : 24;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'math-symbol';
    el.textContent = MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)];
    el.style.left = `${Math.random() * 100}%`;
    el.style.animationDuration = `${8 + Math.random() * 12}s`;
    el.style.animationDelay = `${Math.random() * 10}s`;
    el.style.fontSize = `${1.2 + Math.random() * 2}rem`;
    container.appendChild(el);
  }
}

createBgSymbols();
window.addEventListener('resize', createBgSymbols);

/* ============================================================
   STATE
============================================================ */
let state = {
  playerName: '',
  difficulty: 'easy',
  questionList: [],
  currentIndex: 0,
  score: 0,
  correctCount: 0,
  wrongCount: 0,
  answered: false,
  timerValue: 30,
  timerInterval: null,
  startTime: null
};

/* ============================================================
   SCREEN ROUTING
============================================================ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ============================================================
   HOME SCREEN
============================================================ */
const diffBtns = document.querySelectorAll('.diff-btn');
diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.level;
  });
});

document.getElementById('startBtn').addEventListener('click', startGame);

document.getElementById('playerName').addEventListener('keydown', e => {
  if (e.key === 'Enter') startGame();
});

function startGame() {
  const nameInput = document.getElementById('playerName');
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    nameInput.style.borderColor = 'var(--wrong)';
    nameInput.style.boxShadow = '0 0 0 4px rgba(239,68,68,0.2)';
    setTimeout(() => {
      nameInput.style.borderColor = '';
      nameInput.style.boxShadow = '';
    }, 1500);
    return;
  }

  state.playerName     = name;
  state.questionList   = shuffle([...questions[state.difficulty]]);
  state.currentIndex   = 0;
  state.score          = 0;
  state.correctCount   = 0;
  state.wrongCount     = 0;
  state.startTime      = Date.now();

  document.getElementById('quizPlayerName').textContent = name;
  showScreen('quizScreen');
  renderQuestion();
}

/* ============================================================
   QUIZ
============================================================ */
function renderQuestion() {
  const q = state.questionList[state.currentIndex];
  const total = state.questionList.length;
  const idx   = state.currentIndex;

  state.answered = false;

  // Header
  document.getElementById('questionCounter').textContent = `Вопрос ${idx + 1} из ${total}`;
  document.getElementById('currentScore').textContent    = state.score;

  // Progress bar
  document.getElementById('progressBar').style.width = `${(idx / total) * 100}%`;

  // Question
  document.getElementById('questionCategory').textContent = q.category;
  document.getElementById('questionText').textContent     = q.question;

  // Answers
  const grid = document.getElementById('answersGrid');
  grid.innerHTML = '';
  const letters = ['А', 'Б', 'В', 'Г'];
  q.answers.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.innerHTML = `<span class="answer-letter">${letters[i]}</span><span>${ans}</span>`;
    btn.addEventListener('click', () => selectAnswer(i));
    grid.appendChild(btn);
  });

  // Hide explanation & next
  document.getElementById('explanationPanel').classList.add('hidden');
  document.getElementById('nextBtn').classList.add('hidden');

  // Timer
  startTimer();
}

function selectAnswer(index) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const q    = state.questionList[state.currentIndex];
  const btns = document.querySelectorAll('.answer-btn');

  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
    else if (i === index && index !== q.correct) btn.classList.add('wrong');
  });

  if (index === q.correct) {
    state.correctCount++;
    const timeBonus = Math.max(0, state.timerValue);
    state.score += 10 + Math.floor(timeBonus / 3);
  } else {
    state.wrongCount++;
  }

  document.getElementById('currentScore').textContent = state.score;

  // Show explanation
  const panel = document.getElementById('explanationPanel');
  document.getElementById('explanationText').textContent = q.explanation;
  panel.classList.remove('hidden');

  // Show next button
  document.getElementById('nextBtn').classList.remove('hidden');
}

document.getElementById('nextBtn').addEventListener('click', nextQuestion);

function nextQuestion() {
  state.currentIndex++;
  if (state.currentIndex >= state.questionList.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

/* ============================================================
   TIMER
============================================================ */
const TIMER_MAX    = 30;
const CIRCLE_LEN   = 2 * Math.PI * 26; // ≈ 163.36

function startTimer() {
  state.timerValue = TIMER_MAX;
  updateTimerDisplay();

  const ring   = document.getElementById('timerRing');
  const circle = document.getElementById('timerCircle');
  ring.classList.remove('urgent');
  circle.style.stroke = '';
  circle.style.transition = 'none';
  circle.style.strokeDashoffset = '0';

  // Force reflow so the reset registers before the animation begins
  void circle.getBoundingClientRect();
  circle.style.transition = 'stroke-dashoffset 1s linear, stroke 0.3s';

  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.timerValue--;
    updateTimerDisplay();

    if (state.timerValue <= 0) {
      stopTimer();
      // Time's up — auto-select wrong
      if (!state.answered) timeUp();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const ratio  = state.timerValue / TIMER_MAX;
  const offset = CIRCLE_LEN * (1 - ratio);
  const circle = document.getElementById('timerCircle');
  const ring   = document.getElementById('timerRing');
  const text   = document.getElementById('timerText');

  circle.style.strokeDashoffset = offset;
  text.textContent = state.timerValue;

  if (state.timerValue <= 10) {
    ring.classList.add('urgent');
  } else {
    ring.classList.remove('urgent');
  }
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function timeUp() {
  state.answered = true;
  state.wrongCount++;

  const q    = state.questionList[state.currentIndex];
  const btns = document.querySelectorAll('.answer-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
  });

  document.getElementById('explanationText').textContent =
    '⏰ Время вышло! ' + q.explanation;
  document.getElementById('explanationPanel').classList.remove('hidden');
  document.getElementById('nextBtn').classList.remove('hidden');
}

/* ============================================================
   RESULTS
============================================================ */
function showResults() {
  stopTimer();
  const elapsed = Math.round((Date.now() - state.startTime) / 1000);
  const total   = state.questionList.length;
  const pct     = Math.round((state.correctCount / total) * 100);

  // Trophy & message
  let trophy  = '🏆';
  let message = '';
  if (pct === 100) {
    trophy  = '🌟';
    message = 'Великолепно! Ты настоящий математический гений!';
  } else if (pct >= 80) {
    trophy  = '🥇';
    message = 'Отличный результат! Ты прекрасно знаешь математику!';
  } else if (pct >= 50) {
    trophy  = '👍';
    message = 'Хорошая работа! Продолжай тренироваться!';
  } else {
    trophy  = '💪';
    message = 'Не сдавайся! Попробуй ещё раз!';
  }

  document.getElementById('resultTrophy').textContent        = trophy;
  document.getElementById('resultPlayerName').textContent    = state.playerName;
  document.getElementById('resultMessage').textContent       = message;
  document.getElementById('statCorrect').textContent         = state.correctCount;
  document.getElementById('statWrong').textContent           = state.wrongCount;
  document.getElementById('statScore').textContent           = state.score;
  document.getElementById('statPercent').textContent         = pct + '%';
  document.getElementById('statTime').textContent            = formatTime(elapsed);
  document.getElementById('scoreBarLabel').textContent       = pct + '%';

  showScreen('resultsScreen');

  // Animate score bar with a short delay
  setTimeout(() => {
    document.getElementById('scoreBar').style.width = pct + '%';
  }, 100);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ============================================================
   REPLAY
============================================================ */
document.getElementById('replayBtn').addEventListener('click', () => {
  // Reset score bar instantly before showing home
  document.getElementById('scoreBar').style.width = '0%';
  document.getElementById('scoreBar').style.transition = 'none';
  setTimeout(() => {
    document.getElementById('scoreBar').style.transition = '';
  }, 50);
  showScreen('homeScreen');
});

/* ============================================================
   UTILS
============================================================ */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
