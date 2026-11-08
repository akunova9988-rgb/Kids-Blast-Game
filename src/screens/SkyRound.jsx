import { useEffect, useRef } from 'react';
import { Rocket } from '../ui.jsx';

const COLORS = ['gold', 'teal', 'peach', 'lilac'];
const BANDS = [0.2, 0.36, 0.52, 0.28];

function flySpeed(level) {
  return 88 + Math.max(0, level - 1) * 26;
}

function sample(rock, time, width, height, speed) {
  const span = width + 220;
  const moved = (time * speed + rock.offset * span) % span;
  const x = rock.dir > 0 ? moved - 110 : width + 110 - moved;
  const amp = Math.min(22, height * 0.04);
  const y = height * rock.band + Math.sin(time * 0.9 + rock.phase) * amp;
  return { x, y };
}

function aimPoint(origin, rock, time, width, height, speed) {
  const bulletSpeed = 820;
  let best = null;
  for (let t = 0.18; t <= 1.05; t += 0.025) {
    const point = sample(rock, time + t, width, height, speed);
    const error = Math.abs(Math.hypot(point.x - origin.x, point.y - origin.y) - bulletSpeed * t);
    if (!best || error < best.error) best = { ...point, t, error };
  }
  return best;
}

export function SkyRound({ prompt, choices, level = 1, onFire, onDone }) {
  const fieldRef = useRef(null);
  const rockRefs = useRef([]);
  const rocketRef = useRef(null);
  const bulletRef = useRef(null);
  const boomRef = useRef(null);
  const noteRef = useRef(null);
  const launchRef = useRef(() => {});
  const propsRef = useRef({ level, onFire, onDone });
  propsRef.current = { level, onFire, onDone };

  useEffect(() => {
    rockRefs.current.forEach((node) => {
      if (!node) return;
      node.style.visibility = '';
      node.classList.remove('is-miss');
    });
    if (noteRef.current) noteRef.current.textContent = 'Tap a flying answer, or press 1–4.';
  }, [prompt]);

  useEffect(() => {
    const field = fieldRef.current;
    const rocks = [0, 1, 2, 3].map((index) => rockRefs.current[index]);
    const rocket = rocketRef.current;
    const bullet = bulletRef.current;
    const boom = boomRef.current;
    if (!field || rocks.some((node) => !node) || !rocket || !bullet || !boom) return undefined;

    const bits = Array.from(boom.querySelectorAll('i'));
    const fleet = BANDS.map((band, index) => ({
      band,
      dir: index % 2 === 0 ? 1 : -1,
      offset: (index + 0.4) / 4,
      phase: index * 1.5,
    }));
    let frame = 0;
    let last = 0;
    let clock = 0;
    let mode = 'fly';
    let angle = 0;
    let want = 0;
    let aimFrom = 0;
    let shot = null;

    function box() {
      const rect = field.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }

    function hideBullet() {
      bullet.style.opacity = '0';
    }

    function drawFleet(width, height, speed) {
      fleet.forEach((rock, index) => {
        const point = sample(rock, clock, width, height, speed);
        const tilt = rock.dir * 8;
        rocks[index].style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%) rotate(${tilt}deg)`;
      });
    }

    function turnRocket(now) {
      const progress = Math.min(1, (now - aimFrom) / 220);
      const shown = angle + (want - angle) * (1 - (1 - progress) ** 3);
      rocket.style.transform = `translate3d(-50%, 0, 0) rotate(${shown}deg)`;
      if (progress >= 1) angle = want;
      return progress >= 1;
    }

    function launch(index) {
      if (shot || mode !== 'fly') return;
      const { width, height } = box();
      if (width < 40 || height < 40) return;
      const speed = flySpeed(propsRef.current.level);
      const from = { x: width / 2, y: height - 58 };
      const rock = fleet[index];
      const where = sample(rock, clock, width, height, speed);
      want = Math.atan2(where.x - from.x, from.y - where.y) * (180 / Math.PI);
      aimFrom = performance.now();
      mode = 'aim';
      shot = { index, from, result: null };
      Promise.resolve(propsRef.current.onFire(index)).then(
        (result) => {
          if (shot && shot.index === index) shot.result = result || { correct: false, done: false };
        },
        () => {
          shot = null;
          mode = 'fly';
          hideBullet();
        },
      );
    }

    launchRef.current = launch;

    function onKey(event) {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const number = ['1', '2', '3', '4'].indexOf(event.key);
      if (number >= 0) {
        event.preventDefault();
        launch(number);
      }
    }
    window.addEventListener('keydown', onKey);
    hideBullet();

    function tick(now) {
      frame = requestAnimationFrame(tick);
      if (!last) {
        last = now;
        return;
      }
      const step = Math.min(0.034, (now - last) / 1000);
      last = now;
      clock += step;
      const { width, height } = box();
      const speed = flySpeed(propsRef.current.level);

      if (mode === 'aim' && shot && turnRocket(now)) {
        const hit = aimPoint(shot.from, fleet[shot.index], clock, width, height, speed);
        shot.toX = hit.x;
        shot.toY = hit.y;
        shot.duration = hit.t;
        shot.started = now;
        mode = 'bullet';
        bullet.style.opacity = '1';
      } else if (mode === 'aim' && shot) {
        turnRocket(now);
      }

      if (mode === 'bullet' && shot) {
        const progress = Math.min(1, (now - shot.started) / (shot.duration * 1000));
        const eased = 1 - (1 - progress) ** 2;
        const live = sample(fleet[shot.index], clock, width, height, speed);
        const aimX = shot.from.x + (shot.toX - shot.from.x) * eased;
        const aimY = shot.from.y + (shot.toY - shot.from.y) * eased;
        const blend = progress > 0.72 ? (progress - 0.72) / 0.28 : 0;
        const x = aimX + (live.x - aimX) * blend;
        const y = aimY + (live.y - aimY) * blend;
        bullet.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        if (progress >= 1 && shot.result) {
          const landed = sample(fleet[shot.index], clock, width, height, speed);
          hideBullet();
          boom.style.opacity = '1';
          boom.style.transform = `translate3d(${landed.x}px, ${landed.y}px, 0) translate(-50%, -50%)`;
          if (shot.result.correct) rocks[shot.index].style.visibility = 'hidden';
          else rocks[shot.index].classList.add('is-miss');
          if (noteRef.current) {
            noteRef.current.textContent = shot.result.correct
              ? 'Nice blast!'
              : (shot.result.correctText ? `The answer was ${shot.result.correctText}.` : 'Nice try!');
          }
          shot.boomAt = now;
          mode = 'boom';
        }
      }

      if (mode === 'boom' && shot) {
        const span = shot.result.correct ? 620 : 460;
        const progress = Math.min(1, (now - shot.boomAt) / span);
        const reach = shot.result.correct ? 58 : 16;
        bits.forEach((bit, index) => {
          const dir = (Math.PI * 2 * index) / bits.length;
          bit.style.opacity = String(1 - progress);
          bit.style.transform = `translate(${Math.cos(dir) * reach * progress}px, ${Math.sin(dir) * reach * progress}px) scale(${1 - progress * 0.6})`;
        });
        if (progress >= 1) {
          const result = shot.result;
          boom.style.opacity = '0';
          shot = null;
          mode = 'fly';
          if (result.done) propsRef.current.onDone?.(result);
          else rocks.forEach((node) => node.classList.remove('is-miss'));
        }
      }

      drawFleet(width, height, speed);
    }

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      launchRef.current = () => {};
    };
  }, []);

  return (
    <div className="sky-round sky-keep">
      <h2 className="sky-prompt">{prompt}</h2>
      <p className="sky-note" ref={noteRef}>Tap a flying answer, or press 1–4.</p>
      <div className="sky-field" ref={fieldRef}>
        {choices.map((choice, index) => (
          <button
            key={`${prompt}-${index}`}
            type="button"
            className={`rock rock-${COLORS[index]}`}
            ref={(node) => {
              rockRefs.current[index] = node;
            }}
            onClick={() => launchRef.current(index)}
            aria-keyshortcuts={String(index + 1)}
            aria-label={`Answer ${index + 1}: ${choice}`}
          >
            <span className="badge">{index + 1}</span>
            <span className="target-label">{choice}</span>
          </button>
        ))}
        <span className="pellet" ref={bulletRef} />
        <span className="sky-boom" ref={boomRef} aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        </span>
        <div className="rocket-mount" ref={rocketRef}>
          <Rocket className="ship" />
        </div>
      </div>
    </div>
  );
}
