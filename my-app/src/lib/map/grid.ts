import type { Grid } from './types';

/**
 * Grid geometry. `grid.size` is always the distance between neighbouring cell
 * centres, so a token of size 1 fills one cell regardless of grid type.
 *
 * Hex maths uses axial coordinates (see redblobgames.com/grids/hexagons).
 * Flat-top hexes are handled by swapping x/y around the pointy-top maths.
 */

const SQRT3 = Math.sqrt(3);

type Pt = { x: number; y: number };

const isHex = (g: Grid) => g.type === 'hex-pointy' || g.type === 'hex-flat';
const swap = (p: Pt): Pt => ({ x: p.y, y: p.x });

/** Hex circumradius (centre to corner) for a centre-to-centre spacing of `size` */
const hexRadius = (size: number) => size / SQRT3;

/** Origin of the hex lattice: the centre of the first hex in the SVG pattern tile */
function hexOrigin(g: Grid): Pt {
  const r = hexRadius(g.size);
  const o = { x: g.size / 2, y: r };
  return g.type === 'hex-flat' ? { x: g.offsetX + o.y, y: g.offsetY + o.x } : { x: g.offsetX + o.x, y: g.offsetY + o.y };
}

function cubeRound(q: number, r: number) {
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

/** World point → axial hex coordinate */
function toAxial(g: Grid, p: Pt) {
  const o = hexOrigin(g);
  let local = { x: p.x - o.x, y: p.y - o.y };
  if (g.type === 'hex-flat') local = swap(local);
  const rad = hexRadius(g.size);
  const q = ((SQRT3 / 3) * local.x - (1 / 3) * local.y) / rad;
  const r = ((2 / 3) * local.y) / rad;
  return cubeRound(q, r);
}

/** Axial hex coordinate → world point (cell centre) */
function fromAxial(g: Grid, a: { q: number; r: number }): Pt {
  const rad = hexRadius(g.size);
  let local = { x: rad * SQRT3 * (a.q + a.r / 2), y: rad * 1.5 * a.r };
  if (g.type === 'hex-flat') local = swap(local);
  const o = hexOrigin(g);
  return { x: local.x + o.x, y: local.y + o.y };
}

/**
 * Snap a token centre to the grid. Square tokens with an even footprint
 * (2×2, 4×4) snap to grid intersections; everything else to cell centres.
 */
export function snapPoint(g: Grid, p: Pt, tokenSize = 1): Pt {
  if (g.type === 'none' || !g.snap) return p;
  if (isHex(g)) return fromAxial(g, toAxial(g, p));
  const s = g.size;
  const even = tokenSize >= 2 && tokenSize % 2 === 0;
  const shift = even ? 0 : s / 2;
  return {
    x: Math.round((p.x - g.offsetX - shift) / s) * s + g.offsetX + shift,
    y: Math.round((p.y - g.offsetY - shift) / s) * s + g.offsetY + shift
  };
}

/** Distance between two points in cells (5e rules: diagonals count as 1 on squares) */
export function cellDistance(g: Grid, a: Pt, b: Pt): number {
  if (isHex(g)) {
    const A = toAxial(g, a), B = toAxial(g, b);
    return (Math.abs(A.q - B.q) + Math.abs(A.q + A.r - B.q - B.r) + Math.abs(A.r - B.r)) / 2;
  }
  if (g.type === 'square') {
    const ca = snapPoint({ ...g, snap: true }, a), cb = snapPoint({ ...g, snap: true }, b);
    return Math.max(Math.abs(ca.x - cb.x), Math.abs(ca.y - cb.y)) / g.size;
  }
  return Math.hypot(b.x - a.x, b.y - a.y) / g.size;
}

/** SVG pattern tile for the grid: { width, height, path } in world units */
export function gridPattern(g: Grid): { width: number; height: number; path: string } | null {
  if (g.type === 'none') return null;
  const s = g.size;
  if (g.type === 'square') return { width: s, height: s, path: `M ${s} 0 L 0 0 0 ${s}` };

  // Pointy-top tile: one full hex plus the vertical edge shared by the next row
  const r = hexRadius(s);
  const w = s;
  const pts: [number, number][] = [
    [w / 2, 0], [w, r / 2], [w, 1.5 * r], [w / 2, 2 * r], [0, 1.5 * r], [0, r / 2]
  ];
  const tail: [number, number][] = [[w / 2, 2 * r], [w / 2, 3 * r]];
  const flat = g.type === 'hex-flat';
  const fmt = ([x, y]: [number, number]) => (flat ? `${y} ${x}` : `${x} ${y}`);
  const path = `M ${pts.map(fmt).join(' L ')} Z M ${tail.map(fmt).join(' L ')}`;
  return flat ? { width: 3 * r, height: w, path } : { width: w, height: 3 * r, path };
}

/* ---------- Stacking: several tokens on one cell ---------- */

export type Placed = { x: number; y: number; scale: number; stacked: boolean };
export type Stack = { x: number; y: number; count: number };

/** Offsets (in cells) and scale for n tokens sharing a cell */
function stackPattern(n: number): { pts: [number, number][]; scale: number } {
  if (n === 2) return { pts: [[-0.22, 0], [0.22, 0]], scale: 0.5 };
  if (n === 3) return { pts: [[0, -0.2], [-0.22, 0.18], [0.22, 0.18]], scale: 0.48 };
  if (n === 4) return { pts: [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]], scale: 0.46 };
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * 0.3, Math.sin(a) * 0.3]);
  }
  return { pts, scale: Math.max(0.2, Math.min(0.4, 1.9 / n)) };
}

/**
 * Where to draw each token. Tokens of size ≤ 1 that sit on the same cell are
 * shrunk and spread out inside that cell so none of them is hidden; their stored
 * positions are untouched. Larger creatures and the token being dragged are drawn
 * where they are.
 */
export function stackLayout(
  tokens: { id: string; x: number; y: number; size: number }[],
  g: Grid,
  skipId: string | null = null
): { placed: Map<string, Placed>; stacks: Stack[] } {
  const placed = new Map<string, Placed>();
  const groups: { center: Pt; members: string[] }[] = [];
  const tolerance = g.size * 0.3;

  for (const t of tokens) {
    if (t.size > 1 || t.id === skipId) {
      placed.set(t.id, { x: t.x, y: t.y, scale: 1, stacked: false });
      continue;
    }
    // Group around the cell centre. Tokens that aren't near a centre (no grid, snapping off,
    // or the grid type was changed after placing them) group around their own position instead.
    const cellCentre = g.type === 'none' ? null : snapPoint({ ...g, snap: true }, t, 1);
    const centre = cellCentre && Math.hypot(cellCentre.x - t.x, cellCentre.y - t.y) <= tolerance ? cellCentre : { x: t.x, y: t.y };
    const group = groups.find((gr) => Math.hypot(gr.center.x - centre.x, gr.center.y - centre.y) < tolerance);
    if (group) group.members.push(t.id);
    else groups.push({ center: centre, members: [t.id] });
  }

  const stacks: Stack[] = [];
  const byId = new Map(tokens.map((t) => [t.id, t]));
  for (const { center, members } of groups) {
    if (members.length === 1) {
      const t = byId.get(members[0])!;
      placed.set(t.id, { x: t.x, y: t.y, scale: 1, stacked: false });
      continue;
    }
    const { pts, scale } = stackPattern(members.length);
    members.forEach((id, i) => {
      placed.set(id, { x: center.x + pts[i][0] * g.size, y: center.y + pts[i][1] * g.size, scale, stacked: true });
    });
    stacks.push({ x: center.x, y: center.y, count: members.length });
  }
  return { placed, stacks };
}

/** Find the free cell closest to `p` so newly added tokens don't stack */
export function freeSpotNear(g: Grid, p: Pt, taken: Pt[], tokenSize = 1): Pt {
  const step = g.type === 'none' ? g.size : g.size;
  const isFree = (q: Pt) => taken.every((t) => Math.hypot(t.x - q.x, t.y - q.y) > step * 0.5);
  const start = snapPoint({ ...g, snap: true }, p, tokenSize);
  if (isFree(start)) return start;
  for (let ring = 1; ring < 12; ring++) {
    for (let i = 0; i < ring * 8; i++) {
      const angle = (i / (ring * 8)) * Math.PI * 2;
      const cand = snapPoint({ ...g, snap: true }, { x: start.x + Math.cos(angle) * ring * step, y: start.y + Math.sin(angle) * ring * step }, tokenSize);
      if (isFree(cand)) return cand;
    }
  }
  return start;
}

/** Shortest distance from point p to a polyline (flat x,y list) */
export function distanceToPolyline(p: Pt, pts: number[]): number {
  let best = Infinity;
  if (pts.length === 2) return Math.hypot(p.x - pts[0], p.y - pts[1]);
  for (let i = 0; i < pts.length - 2; i += 2) {
    const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3];
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(p.x - (ax + t * dx), p.y - (ay + t * dy)));
  }
  return best;
}

/** SVG path data for a stroke, smoothed with quadratic curves through midpoints */
export function strokePath(pts: number[]): string {
  if (pts.length < 2) return '';
  if (pts.length <= 4) return `M ${pts[0]} ${pts[1]} L ${pts[pts.length - 2]} ${pts[pts.length - 1]}`;
  let d = `M ${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = (pts[i] + pts[i + 2]) / 2, my = (pts[i + 1] + pts[i + 3]) / 2;
    d += ` Q ${pts[i]} ${pts[i + 1]} ${mx} ${my}`;
  }
  return d + ` L ${pts[pts.length - 2]} ${pts[pts.length - 1]}`;
}
