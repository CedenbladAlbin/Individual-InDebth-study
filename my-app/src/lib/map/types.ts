export type GridType = 'none' | 'square' | 'hex-pointy' | 'hex-flat';
export type TokenKind = 'player' | 'npc' | 'enemy' | 'ally' | 'neutral' | 'marker';
export type Tool = 'select' | 'draw' | 'erase' | 'ruler';

export interface Grid {
  type: GridType;
  /** Distance between neighbouring cell centres, in world units */
  size: number;
  offsetX: number;
  offsetY: number;
  color: string;
  opacity: number;
  snap: boolean;
}

export interface Token {
  id: string;
  kind: TokenKind;
  /** _id of the linked player/NPC, if any */
  refId: string | null;
  label: string;
  color: string;
  icon: string | null;
  x: number;
  y: number;
  /** Footprint in cells: 0.5 tiny, 1 medium, 2 large, 3 huge, 4 gargantuan */
  size: number;
  hp: number | null;
  maxHp: number | null;
  initiative: number | null;
  conditions: string[];
}

export interface Stroke {
  id: string;
  color: string;
  width: number;
  /** Flat list of x,y pairs in world units */
  points: number[];
}

export interface Combat {
  active: boolean;
  round: number;
  turnTokenId: string | null;
}

export interface MapState {
  version: 1;
  grid: Grid;
  tokens: Token[];
  strokes: Stroke[];
  combat: Combat;
}

export const KIND_COLORS: Record<TokenKind, string> = {
  player: '#5fd08a',
  npc: '#f2a65a',
  enemy: '#e5534b',
  ally: '#4fb3d9',
  neutral: '#a1a9ba',
  marker: '#c58cf2'
};

export const KIND_LABELS: Record<TokenKind, string> = {
  player: 'Player',
  npc: 'NPC',
  enemy: 'Enemy',
  ally: 'Ally',
  neutral: 'Neutral',
  marker: 'Marker'
};

export const MARKERS: { icon: string; label: string; color: string }[] = [
  { icon: 'objective', label: 'Objective', color: '#fbc02d' },
  { icon: 'treasure', label: 'Treasure', color: '#ffb300' },
  { icon: 'trap', label: 'Trap', color: '#8e24aa' },
  { icon: 'obstruction', label: 'Obstacle', color: '#757575' },
  { icon: 'start', label: 'Start', color: '#00bcd4' },
  { icon: 'exit', label: 'Exit', color: '#ff7043' }
];

export const TOKEN_SIZES: { value: number; label: string }[] = [
  { value: 0.5, label: 'Tiny' },
  { value: 1, label: 'Medium' },
  { value: 2, label: 'Large' },
  { value: 3, label: 'Huge' },
  { value: 4, label: 'Gargantuan' }
];

export const CONDITIONS = [
  'blinded', 'charmed', 'concentrating', 'deafened', 'frightened', 'grappled', 'incapacitated',
  'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
];

export const DRAW_COLORS = ['#f0605d', '#f2b552', '#5fd08a', '#4fb3d9', '#b0a0ff', '#ffffff', '#111111'];
export const DRAW_WIDTHS = [3, 8, 21];

export function emptyMapState(gridSize = 50): MapState {
  return {
    version: 1,
    grid: { type: 'square', size: gridSize, offsetX: 0, offsetY: 0, color: '#ffffff', opacity: 0.25, snap: true },
    tokens: [],
    strokes: [],
    combat: { active: false, round: 1, turnTokenId: null }
  };
}

export function newId(prefix = 't') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function initials(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  // "Goblin 3" → "G3", "Toblen Stonehill" → "TS"
  const last = words[words.length - 1];
  if (words.length > 1 && /^\d+$/.test(last)) return (words[0][0] + last).toUpperCase().slice(0, 3);
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
