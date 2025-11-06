import { loadHandSignalsData } from '../data/signals.js';

export async function generateRandomQuestions(n = 5) {
  const signals = await loadHandSignalsData();
  const pool = [...signals];
  const qs = [];
  while (qs.length < Math.min(n, pool.length)) {
    const i = Math.floor(Math.random() * pool.length);
    const s = pool.splice(i, 1)[0];
    const options = shuffle([s.name, ...pickOtherNames(signals, s.name, 3)]);
    qs.push({ prompt: s, options, correct: s.name });
  }
  return qs;
}

function pickOtherNames(signals, exclude, k) {
  const names = signals.map(x => x.name).filter(n => n !== exclude);
  const out = [];
  while (out.length < Math.min(k, names.length)) {
    const i = Math.floor(Math.random() * names.length);
    out.push(names.splice(i, 1)[0]);
  }
  return out;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
