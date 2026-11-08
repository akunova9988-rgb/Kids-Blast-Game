const KEY = 'kidsblast-sound';

export function soundOn() {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setSound(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode can block storage; the toggle still works for this page */
  }
}

let ctx;

function audio() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(context, frequency, when, duration, type = 'triangle') {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, when);
  osc.connect(gain);
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.05, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

export async function tone(kind) {
  if (!soundOn()) return;
  const context = audio();
  if (context.state === 'suspended') await context.resume();
  const now = context.currentTime;
  if (kind === 'ok') {
    beep(context, 523, now, 0.12);
    beep(context, 659, now + 0.08, 0.16);
  } else if (kind === 'miss') {
    beep(context, 294, now, 0.2, 'sine');
  } else if (kind === 'fanfare') {
    [523, 659, 784].forEach((frequency, index) => {
      beep(context, frequency, now + index * 0.09, 0.18);
    });
  }
}
