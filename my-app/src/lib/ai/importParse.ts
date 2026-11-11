/**
 * Turns an AI chat answer into entities that can be created in the app.
 * Finds JSON in ```json blocks (or bare JSON), tolerates common AI mistakes
 * (trailing commas, smart quotes, synonyms for field names) and guesses the
 * entity type from the fields when there is no explicit "type".
 */

export type EntityType = 'npc' | 'item' | 'scene' | 'player';

export type Draft = {
  key: string;
  type: EntityType;
  name: string;
  group: string;
  description: string;
  /** Type-specific fields, e.g. role/status for NPCs */
  fields: Record<string, string>;
};

export type ParseResult = { drafts: Draft[]; errors: string[]; foundJson: boolean };

/** The fields each type stores, with the names an AI might use for them */
const FIELD_ALIASES: Record<EntityType, Record<string, string[]>> = {
  npc: { role: ['role', 'occupation', 'job', 'profession', 'class'], status: ['status', 'attitude', 'disposition', 'alignment'] },
  item: { itemType: ['itemType', 'item_type', 'category', 'kind', 'rarity'], benefits: ['benefits', 'effect', 'effects', 'properties', 'bonus', 'abilities'] },
  scene: { location: ['location', 'region', 'area', 'place'], dangerLevel: ['dangerLevel', 'danger_level', 'danger', 'difficulty', 'threat'] },
  player: { class: ['class', 'characterClass', 'character_class'], level: ['level', 'lvl'] }
};
const NAME_KEYS = ['name', 'title'];
const DESC_KEYS = ['description', 'desc', 'summary', 'details', 'appearance', 'personality', 'background'];
const GROUP_KEYS = ['group', 'faction', 'clan', 'city', 'town', 'organisation', 'organization', 'affiliation'];
const TYPE_KEYS = ['type', 'kind', 'entity', 'entityType', 'entity_type'];

const TYPE_WORDS: Record<string, EntityType> = {
  npc: 'npc', npcs: 'npc', character: 'npc', person: 'npc', creature: 'npc', monster: 'npc',
  item: 'item', items: 'item', object: 'item', loot: 'item', treasure: 'item', weapon: 'item', armor: 'item', artifact: 'item',
  scene: 'scene', scenes: 'scene', location: 'scene', locations: 'scene', place: 'scene', places: 'scene',
  player: 'player', players: 'player', pc: 'player', pcs: 'player', 'player character': 'player'
};

const MAX = { name: 200, group: 60, field: 10000 };

let counter = 0;
const nextKey = () => `d${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Pull candidate JSON strings out of a chat answer */
function jsonCandidates(text: string): string[] {
  const out: string[] = [];
  const fence = /```[ \t]*([a-zA-Z0-9_-]*)[^\n]*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text))) {
    const lang = m[1].toLowerCase();
    const body = m[2].trim();
    if (lang === 'json' || lang === 'jsonc' || ((lang === '' || lang === 'javascript' || lang === 'js') && /^[[{]/.test(body))) out.push(body);
  }
  if (out.length) return out;
  const trimmed = text.trim();
  if (/^[[{]/.test(trimmed)) return [trimmed];
  // Last resort: the outermost [...] or {...} in the text
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
  if (start !== -1 && end > start) return [text.slice(start, end + 1)];
  return [];
}

/** Fix the mistakes AIs commonly make in JSON */
function repair(json: string): string {
  return json
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\/\/[^\n"]*$/gm, '')
    .replace(/,\s*([\]}])/g, '$1');
}

const str = (v: unknown, max = MAX.field) =>
  v === null || v === undefined ? '' : (Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)).trim().slice(0, max);

function pick(obj: Record<string, unknown>, keys: string[]): string {
  const lower = new Map(Object.keys(obj).map((k) => [k.toLowerCase(), k]));
  for (const k of keys) {
    const real = lower.get(k.toLowerCase());
    if (real !== undefined && str(obj[real])) return str(obj[real]);
  }
  return '';
}

function typeFromWord(v: unknown): EntityType | null {
  const w = String(v ?? '').trim().toLowerCase();
  return TYPE_WORDS[w] ?? null;
}

/** Explicit type, or a guess from which fields are present */
function detectType(obj: Record<string, unknown>, hint: EntityType | null): EntityType {
  for (const k of TYPE_KEYS) {
    const t = typeFromWord(obj[k]);
    if (t) return t;
  }
  if (hint) return hint;
  const keys = new Set(Object.keys(obj).map((k) => k.toLowerCase()));
  const score = (type: EntityType) => Object.values(FIELD_ALIASES[type]).flat().filter((a) => keys.has(a.toLowerCase())).length;
  const ranked = (['npc', 'item', 'scene', 'player'] as EntityType[]).map((t) => [t, score(t)] as const).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : 'npc';
}

function toDraft(obj: Record<string, unknown>, hint: EntityType | null): Draft | null {
  const name = pick(obj, NAME_KEYS).slice(0, MAX.name);
  if (!name) return null;
  const type = detectType(obj, hint);
  const fields: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES[type])) {
    const value = pick(obj, aliases);
    if (value) fields[field] = value;
  }
  // On items "type" is often the category ("Weapon"), not the entity type
  if (type === 'item' && !fields.itemType) {
    const t = pick(obj, ['type']);
    if (t && !['item', 'items'].includes(t.toLowerCase())) fields.itemType = t;
  }
  let description = pick(obj, DESC_KEYS);
  // Keep useful extras (e.g. "secret", "hook") in the description rather than dropping them
  const used = new Set([...NAME_KEYS, ...DESC_KEYS, ...GROUP_KEYS, ...TYPE_KEYS, ...Object.values(FIELD_ALIASES[type]).flat()].map((k) => k.toLowerCase()));
  const extras = Object.entries(obj)
    .filter(([k, v]) => !used.has(k.toLowerCase()) && str(v))
    .map(([k, v]) => `${k.charAt(0).toUpperCase()}${k.slice(1)}: ${str(v)}`);
  if (extras.length) description = [description, ...extras].filter(Boolean).join('\n');
  return { key: nextKey(), type, name, group: pick(obj, GROUP_KEYS).slice(0, MAX.group), description: description.slice(0, MAX.field), fields };
}

/** Flatten the shapes AIs return: an array, {npcs:[...], items:[...]}, or a single object */
function collect(value: unknown, hint: EntityType | null, out: Draft[]) {
  if (Array.isArray(value)) {
    for (const v of value) collect(v, hint, out);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const obj = value as Record<string, unknown>;
  if (pick(obj, NAME_KEYS)) {
    const d = toDraft(obj, hint);
    if (d) out.push(d);
    return;
  }
  // A wrapper object: its keys may name the type ("npcs": [...])
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v) || (v && typeof v === 'object')) collect(v, typeFromWord(k) ?? hint, out);
  }
}

export function parseAiText(text: string): ParseResult {
  const errors: string[] = [];
  const drafts: Draft[] = [];
  const candidates = jsonCandidates(text);
  for (const [i, c] of candidates.entries()) {
    try {
      collect(JSON.parse(repair(c)), null, drafts);
    } catch (e) {
      errors.push(`JSON block ${candidates.length > 1 ? i + 1 : ''} could not be read: ${(e as Error).message}`.replace('  ', ' '));
    }
  }
  return { drafts, errors, foundJson: candidates.length > 0 };
}

/** Lower-case name for duplicate checks */
export const nameKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
