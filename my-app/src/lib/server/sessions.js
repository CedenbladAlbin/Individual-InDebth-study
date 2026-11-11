import { str } from './access.js';

/** Text fields a session's notes may contain. */
export const NOTE_TEXT_FIELDS = [
  'summary', 'plotDevelopments', 'quests', 'loot', 'secrets', 'factions',
  'mysteries', 'goals', 'downtime', 'nextPlans'
];

const CONNECTION_KEYS = ['npcs', 'items', 'scenes', 'players', 'quests'];

/**
 * The date a session is (or was) played, given as "YYYY-MM-DD".
 * Returns a Date at UTC midnight, or null for empty/invalid input.
 * @param {unknown} value
 */
export function parseSessionDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  const year = d.getUTCFullYear();
  return Number.isNaN(d.getTime()) || year < 1900 || year > 2200 ? null : d;
}

/**
 * Keep only known note fields with sane types. Unknown keys are dropped.
 * @param {any} notes
 * @param {boolean} [partial] when true, only fields present in `notes` are returned
 */
export function sanitizeNotes(notes, partial = false) {
  /** @type {Record<string, any>} */
  const out = {};
  const src = notes && typeof notes === 'object' ? notes : {};
  for (const key of NOTE_TEXT_FIELDS) {
    if (!partial || key in src) out[key] = str(src[key]);
  }
  if (!partial || 'xp' in src) {
    const xp = Number(src.xp);
    out.xp = Number.isFinite(xp) && xp >= 0 ? Math.floor(xp) : 0;
  }
  if (!partial || 'custom' in src) {
    out.custom = Array.isArray(src.custom) ? src.custom.map((/** @type {unknown} */ n) => str(n)) : str(src.custom);
  }
  return out;
}

/**
 * @param {any} connections
 */
export function sanitizeConnections(connections) {
  /** @type {Record<string, string[]>} */
  const out = {};
  const src = connections && typeof connections === 'object' ? connections : {};
  for (const key of CONNECTION_KEYS) {
    out[key] = Array.isArray(src[key])
      ? src[key].filter((/** @type {unknown} */ id) => typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id))
      : [];
  }
  return out;
}
