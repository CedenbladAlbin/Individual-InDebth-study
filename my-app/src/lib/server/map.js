/**
 * Validation for the battle map state stored per scene.
 * Everything is clamped to sane limits so a client can't store arbitrary data.
 */

export const GRID_TYPES = ['none', 'square', 'hex-pointy', 'hex-flat'];
export const TOKEN_KINDS = ['player', 'npc', 'enemy', 'ally', 'neutral', 'marker'];
export const TOKEN_ICONS = ['objective', 'treasure', 'trap', 'obstruction', 'start', 'exit'];
export const TOKEN_SIZES = [0.5, 1, 2, 3, 4];
export const CONDITIONS = [
  'blinded', 'charmed', 'concentrating', 'deafened', 'frightened', 'grappled', 'incapacitated',
  'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
];

const MAX_TOKENS = 200;
const MAX_STROKES = 1000;
const MAX_POINTS_PER_STROKE = 4000; // numbers (x,y pairs × 2)
const MAX_POINTS_TOTAL = 60000;
const COORD_LIMIT = 100000;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const LOCAL_ID = /^[a-z0-9-]{1,40}$/i;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** @param {unknown} v @param {number} min @param {number} max @param {number} def */
function num(v, min, max, def) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
/** @param {unknown} v @param {number} min @param {number} max */
function intOrNull(v, min, max) {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
}
/** @param {unknown} v @param {string} def */
function color(v, def) {
  return typeof v === 'string' && HEX_COLOR.test(v) ? v.toLowerCase() : def;
}
/** @param {unknown} v @param {number} max */
function text(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}
/** @param {number} n */
const round1 = (n) => Math.round(n * 10) / 10;

export function emptyMapState() {
  return {
    version: 1,
    grid: { type: 'square', size: 50, offsetX: 0, offsetY: 0, color: '#ffffff', opacity: 0.25, snap: true },
    tokens: [],
    strokes: [],
    combat: { active: false, round: 1, turnTokenId: null }
  };
}

/**
 * @param {any} input
 */
export function sanitizeMapState(input) {
  const src = input && typeof input === 'object' ? input : {};
  const def = emptyMapState();

  const g = src.grid && typeof src.grid === 'object' ? src.grid : {};
  const grid = {
    type: GRID_TYPES.includes(g.type) ? g.type : def.grid.type,
    size: round1(num(g.size, 8, 500, def.grid.size)),
    offsetX: round1(num(g.offsetX, -500, 500, 0)),
    offsetY: round1(num(g.offsetY, -500, 500, 0)),
    color: color(g.color, def.grid.color),
    opacity: Math.round(num(g.opacity, 0, 1, def.grid.opacity) * 100) / 100,
    snap: g.snap !== false
  };

  /** @type {any[]} */
  const tokens = [];
  const seen = new Set();
  for (const t of Array.isArray(src.tokens) ? src.tokens.slice(0, MAX_TOKENS) : []) {
    if (!t || typeof t !== 'object' || typeof t.id !== 'string' || !LOCAL_ID.test(t.id) || seen.has(t.id)) continue;
    seen.add(t.id);
    const maxHp = intOrNull(t.maxHp, 0, 99999);
    tokens.push({
      id: t.id,
      kind: TOKEN_KINDS.includes(t.kind) ? t.kind : 'neutral',
      refId: typeof t.refId === 'string' && OBJECT_ID.test(t.refId) ? t.refId : null,
      label: text(t.label, 60) || 'Token',
      color: color(t.color, '#888888'),
      icon: TOKEN_ICONS.includes(t.icon) ? t.icon : null,
      x: round1(num(t.x, -COORD_LIMIT, COORD_LIMIT, 0)),
      y: round1(num(t.y, -COORD_LIMIT, COORD_LIMIT, 0)),
      size: TOKEN_SIZES.includes(Number(t.size)) ? Number(t.size) : 1,
      hp: maxHp === null ? null : intOrNull(t.hp, -99999, 99999),
      maxHp,
      initiative: intOrNull(t.initiative, -50, 99),
      conditions: Array.isArray(t.conditions)
        ? [...new Set(t.conditions.filter((/** @type {unknown} */ c) => typeof c === 'string' && CONDITIONS.includes(c)))]
        : []
    });
  }

  /** @type {any[]} */
  const strokes = [];
  let totalPoints = 0;
  for (const s of Array.isArray(src.strokes) ? src.strokes.slice(0, MAX_STROKES) : []) {
    if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !LOCAL_ID.test(s.id) || !Array.isArray(s.points)) continue;
    let points = s.points.slice(0, MAX_POINTS_PER_STROKE).map((/** @type {unknown} */ p) => round1(num(p, -COORD_LIMIT, COORD_LIMIT, 0)));
    if (points.length % 2) points = points.slice(0, -1);
    if (points.length < 2 || totalPoints + points.length > MAX_POINTS_TOTAL) continue;
    totalPoints += points.length;
    strokes.push({
      id: s.id,
      color: color(s.color, '#f0605d'),
      width: round1(num(s.width, 1, 120, 4)),
      points
    });
  }

  const c = src.combat && typeof src.combat === 'object' ? src.combat : {};
  const combat = {
    active: !!c.active,
    round: intOrNull(c.round, 1, 9999) ?? 1,
    turnTokenId: typeof c.turnTokenId === 'string' && seen.has(c.turnTokenId) ? c.turnTokenId : null
  };

  return { version: 1, grid, tokens, strokes, combat };
}
