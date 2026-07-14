// Persistence: localStorage JSON with a version field and migration hook,
// plus a portable export/import string (PF1.<base64 of utf-8 json>).

const KEY = 'pixel-familiars-save';
export const SAVE_VERSION = 1;

export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const st = { ...raw };
  // Future migrations: if (st.version === 1) { ...; st.version = 2; }
  if (typeof st.version !== 'number' || st.version > SAVE_VERSION) return null;
  return st;
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveState(state, now = Date.now(), storage = globalThis.localStorage) {
  state.lastSeen = now;
  try {
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage = globalThis.localStorage) {
  storage.removeItem(KEY);
}

// ---- Portable save string ----

export function exportString(state) {
  const json = JSON.stringify(state);
  const b64 = toBase64(json);
  return `PF1.${b64}`;
}

export function importString(str) {
  try {
    const m = /^PF1\.([A-Za-z0-9+/=]+)$/.exec(str.trim());
    if (!m) return null;
    return migrate(JSON.parse(fromBase64(m[1])));
  } catch {
    return null;
  }
}

function toBase64(s) {
  if (typeof Buffer !== 'undefined') return Buffer.from(s, 'utf8').toString('base64');
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64) {
  if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
