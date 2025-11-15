const DATA = [];

export async function loadHandSignalsData() {
  const url = `./src/data/signals.json?v=${Date.now()}`; // cache-bust for dev
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load signals.json: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('signals.json must be an array');
  // basic normalization
  return data.map((s) => ({
    id: s.id,
    name: s.name,
    symbol: s.symbol ?? (Array.isArray(s.symbols) ? s.symbols.join('') : undefined),
    symbolAlt: s.symbolAlt,
    instructions: s.instructions,
    media: s.media,
    info: s.info
  }));
}
