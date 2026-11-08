import { useEffect, useMemo, useRef, useState } from 'react';
import { SkyRound } from './SkyRound.jsx';
import { tone } from '../sound.js';
import { Lives, SoundToggle } from '../ui.jsx';
import { LEVELS, SUBJECTS, lessonReport, topicBank } from '../topics.js';

function shuffle(list) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function deal(item) {
  const order = shuffle([0, 1, 2, 3]);
  return {
    prompt: item.prompt,
    choices: order.map((index) => item.choices[index]),
    correctIndex: order.indexOf(item.correctIndex),
  };
}

export function InstantPlay({ onResult, onExit }) {
  const [stage, setStage] = useState('pick');
  const [subjectId, setSubjectId] = useState('math');
  const [levelId, setLevelId] = useState(1);
  const [flight, setFlight] = useState([]);
  const [flightIndex, setFlightIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [test, setTest] = useState([]);
  const [testIndex, setTestIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [picked, setPicked] = useState(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const savedRef = useRef(false);
  const [saveNote, setSaveNote] = useState('');

  const subject = SUBJECTS.find((item) => item.id === subjectId);
  const question = flight[flightIndex];

  const report = useMemo(() => {
    if (stage !== 'result') return null;
    const correct = answers.filter((item) => item.correct).length;
    return { ...lessonReport(correct, answers.length), correct, total: answers.length };
  }, [stage, answers]);

  useEffect(() => {
    if (stage !== 'result' || !report || savedRef.current || !onResult) return;
    savedRef.current = true;
    onResult({
      subject: subjectId,
      level: levelId,
      score: report.percent,
    }).then(() => setSaveNote('Результат сохранён в кабинете.')).catch(() => {
      savedRef.current = false;
      setSaveNote('Не удалось сохранить результат.');
    });
  }, [stage, report, onResult, subjectId, levelId]);

  function begin() {
    const bank = topicBank(subjectId, levelId);
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setFlight(shuffle(bank.play).slice(0, 5).map(deal));
    setFlightIndex(0);
    setTest(bank.test.map(deal));
    setTestIndex(0);
    setAnswers([]);
    setPicked(null);
    savedRef.current = false;
    setSaveNote('');
    setStage('fly');
  }

  function onFire(choiceIndex) {
    const current = flight[flightIndex];
    const correct = choiceIndex === current.correctIndex;
    if (correct) scoreRef.current += 100;
    else livesRef.current = Math.max(0, livesRef.current - 1);
    setScore(scoreRef.current);
    setLives(livesRef.current);
    tone(correct ? 'ok' : 'miss');
    const finished = livesRef.current <= 0 || flightIndex + 1 >= flight.length;
    if (finished) tone('fanfare');
    return {
      correct,
      done: correct || livesRef.current <= 0,
      finished,
      correctText: current.choices[current.correctIndex],
    };
  }

  function onDone(result) {
    if (result.finished || flightIndex + 1 >= flight.length) {
      setStage('test');
      return;
    }
    setFlightIndex((value) => value + 1);
  }

  function chooseTest(choiceIndex) {
    if (picked !== null) return;
    const current = test[testIndex];
    const correct = choiceIndex === current.correctIndex;
    setPicked(choiceIndex);
    tone(correct ? 'ok' : 'miss');
    const nextAnswers = [
      ...answers,
      {
        prompt: current.prompt,
        picked: current.choices[choiceIndex],
        correctText: current.choices[current.correctIndex],
        correct,
      },
    ];
    window.setTimeout(() => {
      setAnswers(nextAnswers);
      setPicked(null);
      if (testIndex + 1 >= test.length) setStage('result');
      else setTestIndex((value) => value + 1);
    }, 420);
  }

  return (
    <div className={`journey is-${stage}`}>
      {stage === 'pick' ? (
        <section className="card stack pick-card">
          <p className="kicker">Светлый космос</p>
          <h1>Выбери полёт</h1>
          <p>Сначала предмет, потом уровень. Астероиды будут лететь мимо ракеты.</p>
          <div className="pick-grid">
            {SUBJECTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`pick-btn tint-${item.tint} ${subjectId === item.id ? 'is-on' : ''}`}
                onClick={() => setSubjectId(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
          <div className="level-row">
            {LEVELS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`level-btn ${levelId === item.id ? 'is-on' : ''}`}
                onClick={() => setLevelId(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn primary big" onClick={begin}>
            В полёт
          </button>
        </section>
      ) : null}

      {stage === 'fly' && question ? (
        <div className="arcade">
          <div className="hud">
            <p className="arcade-name">{subject.title}</p>
            <Lives lives={lives} />
            <p className="score-pill" aria-label={`Очки ${score}`}>{score}</p>
            <p className="streak-pill">Уровень {levelId}</p>
            <SoundToggle />
          </div>
          <SkyRound
            prompt={question.prompt}
            choices={question.choices}
            level={levelId}
            onFire={onFire}
            onDone={onDone}
          />
        </div>
      ) : null}

      {stage === 'test' && test[testIndex] ? (
        <section className="card stack test-card">
          <p className="kicker">Итоговый тест · {subject.title}</p>
          <h1>Вопрос {testIndex + 1} из {test.length}</h1>
          <p className="test-prompt">{test[testIndex].prompt}</p>
          <div className="test-choices">
            {test[testIndex].choices.map((choice, index) => {
              const show = picked !== null;
              const right = index === test[testIndex].correctIndex;
              const mine = index === picked;
              const className = [
                'test-choice',
                show && right ? 'is-right' : '',
                show && mine && !right ? 'is-wrong' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={`${test[testIndex].prompt}-${index}`}
                  type="button"
                  className={className}
                  disabled={picked !== null}
                  onClick={() => chooseTest(index)}
                >
                  <span>{index + 1}</span>
                  {choice}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {stage === 'result' && report ? (
        <section className="card stack result-card sky-card">
          <p className="kicker">{subject.title} · уровень {levelId}</p>
          <p className="score-num">{report.percent}%</p>
          <p className="mark-line">Оценка {report.mark}</p>
          <h1>{report.line}</h1>
          <p>{report.correct} из {report.total} в итоговом тесте.</p>
          {answers.some((item) => !item.correct) ? (
            <ul className="miss-list">
              {answers.filter((item) => !item.correct).map((item) => (
                <li key={item.prompt}>
                  <strong>{item.prompt}</strong>
                  <span>Твой ответ: {item.picked}</span>
                  <span>Верно: {item.correctText}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Ошибок нет. Все ответы в тесте верные.</p>
          )}
          {saveNote ? <p>{saveNote}</p> : null}
          <div className="row-actions">
            <button type="button" className="btn primary big" onClick={() => setStage('pick')}>
              Другой предмет
            </button>
            {onExit ? (
              <button type="button" className="btn big" onClick={onExit}>В кабинет</button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
