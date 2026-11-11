/**
 * Builds a "context pack": a Markdown brief of a campaign that the user pastes into
 * any AI chat (ChatGPT, Claude, Gemini, a browser extension…). Nothing is sent
 * anywhere by the app; this only formats the user's own data with fixed rules and a
 * task so the AI gets well-organised input without the user writing a long prompt.
 */

export type CampaignExport = {
  game: any;
  scenes: any[];
  npcs: any[];
  players: any[];
  items: any[];
  sessions: any[];
  notes: any[];
};

export type Scope =
  | { kind: 'all' }
  | { kind: 'session'; sessionId: string }
  | { kind: 'scene'; sceneId: string }
  | { kind: 'group'; group: string };

export type PresetId = 'codm' | 'prep' | 'recap' | 'npcs' | 'encounter' | 'threads';

export type PackOptions = {
  scope: Scope;
  /** How many of the most recent sessions to include (0 = all) */
  sessionCount: number;
  includeSecrets: boolean;
  task: string;
};

export const PRESETS: { id: PresetId; label: string; secrets: boolean; task: (ctx: TaskContext) => string }[] = [
  {
    id: 'codm',
    label: 'Co-DM (ask anything)',
    secrets: true,
    task: () => 'Act as my co-Dungeon Master for this campaign. Confirm in one short sentence that you have read the brief, then wait for my questions.'
  },
  {
    id: 'prep',
    label: 'Prepare next session',
    secrets: true,
    task: (c) =>
      `Help me prepare the next session${c.nextSession ? ` ("${c.nextSession}")` : ''}. Give me:\n` +
      '1. The open plot threads and promises the party is following (with the session they come from).\n' +
      '2. Three hooks or scenes I could run, each tied to existing NPCs, scenes or items.\n' +
      '3. One encounter that fits the party, with suggested enemies and tactics.\n' +
      '4. Two short roleplay moments for specific NPCs, with a line of dialogue each.\n' +
      'Keep it to bullet points I can glance at during play.'
  },
  {
    id: 'recap',
    label: 'Recap for the players',
    secrets: false,
    task: (c) =>
      `Write a short, atmospheric recap of ${c.latestSession ? `"${c.latestSession}"` : 'the latest session'} that I can read aloud to the players at the start of the next session (about 150 words). ` +
      'Only mention what the characters experienced. Never reveal anything marked [DM ONLY].'
  },
  {
    id: 'npcs',
    label: 'Create NPCs',
    secrets: true,
    task: (c) =>
      `Create 3 new NPCs that fit ${c.focus ? `"${c.focus}"` : 'the current part of the campaign'} and do not contradict existing NPCs. ` +
      'For each give a name, role, a short description, a secret, and how they connect to existing characters or scenes.\n' +
      `End with the JSON block described in the rules${c.focus ? `, with "group" set to "${c.focus}"` : ''}, so I can import them.`
  },
  {
    id: 'encounter',
    label: 'Build an encounter',
    secrets: true,
    task: (c) =>
      `Design a combat or social encounter${c.focus ? ` for "${c.focus}"` : ''} that suits the party's current level and size. ` +
      'Include the setup, enemies or opponents with rough stats (AC, HP, key attacks), terrain or hazards, how it can escalate, and how it ties back to the story.'
  },
  {
    id: 'threads',
    label: 'Find loose threads',
    secrets: true,
    task: () =>
      'Go through the campaign data and list: (a) unresolved plot threads, (b) NPCs who have not appeared for a long time but matter, ' +
      '(c) items or clues that were found but never used, and (d) contradictions between sessions. Cite the session or entity for each point.'
  }
];

export type TaskContext = { latestSession?: string; nextSession?: string; focus?: string };

const RULES = [
  'You are helping a tabletop RPG Game Master (Dungeon Master) run their own campaign.',
  'Everything under "Campaign data" is canon. Do not contradict it; if something is missing, say so or ask.',
  'Clearly label anything you invent as a suggestion, so the GM can decide whether it becomes canon.',
  'Text marked [DM ONLY] is secret. Never put it in anything meant to be read or shown to the players.',
  'Keep answers practical and easy to scan during play: short paragraphs and bullet points.',
  'Reply in the language the GM writes to you in.',
  'Whenever you create new NPCs, items, scenes or player characters, also list them at the end of your answer in a ```json code block, ' +
    'so the GM can import them into their app: an array of objects with "type" ("npc", "item", "scene" or "player"), "name", "group" and "description", ' +
    'plus "role" and "status" for NPCs, "itemType" and "benefits" for items, "location" and "dangerLevel" for scenes, "class" and "level" for players.'
];

/* ---------- helpers ---------- */

const time = (s: any) => new Date(s.date ?? s.createdAt ?? 0).getTime();
const day = (s: any) => {
  const t = time(s);
  return t ? new Date(t).toISOString().slice(0, 10) : 'no date';
};
const clean = (v: unknown) => (Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v)).replace(/\s+\n/g, '\n').trim();
const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
const byName = (a: any, b: any) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true });

function groupBy<T>(list: T[], key: (x: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const x of list) {
    const k = key(x) || 'No group';
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(x);
  }
  return [...m.entries()].sort(([a], [b]) => (a === 'No group' ? 1 : b === 'No group' ? -1 : a.localeCompare(b)));
}

/** All groups used in the campaign, for the scope picker */
export function campaignGroups(data: CampaignExport): string[] {
  return [...new Set([...data.npcs, ...data.scenes, ...data.items, ...data.players].map((e) => String(e.group ?? '').trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
}

/** Rough token estimate (≈ 4 characters per token for English text) */
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

/* ---------- scope ---------- */

type Selection = { scenes: any[]; npcs: any[]; players: any[]; items: any[]; sessions: any[]; focus: string };

function select(data: CampaignExport, opts: PackOptions): Selection {
  const sorted = [...data.sessions].sort((a, b) => time(a) - time(b));
  const latest = (list: any[]) => (opts.sessionCount > 0 ? list.slice(-opts.sessionCount) : list);
  const sessionsLinking = (key: string, ids: Set<string>) =>
    sorted.filter((s) => (s.connections?.[key] ?? []).some((id: string) => ids.has(id)));

  const s = opts.scope;
  if (s.kind === 'session') {
    const session = sorted.find((x) => x._id === s.sessionId);
    if (!session) return { scenes: [], npcs: [], players: data.players, items: [], sessions: [], focus: '' };
    const c = session.connections ?? {};
    const pick = (list: any[], key: string) => list.filter((e) => (c[key] ?? []).includes(e._id));
    const npcs = pick(data.npcs, 'npcs');
    const scenes = pick(data.scenes, 'scenes');
    return {
      scenes,
      npcs,
      players: data.players,
      items: data.items.filter((i) => (c.items ?? []).includes(i._id) || npcs.some((n) => n._id === i.ownerNpcId) || scenes.some((sc) => sc._id === i.sceneId)),
      sessions: [session],
      focus: session.title
    };
  }
  if (s.kind === 'scene') {
    const scene = data.scenes.find((x) => x._id === s.sceneId);
    if (!scene) return { scenes: [], npcs: [], players: data.players, items: [], sessions: [], focus: '' };
    const npcs = data.npcs.filter((n) => n.sceneId === scene._id);
    return {
      scenes: [scene],
      npcs,
      players: data.players,
      items: data.items.filter((i) => i.sceneId === scene._id || npcs.some((n) => n._id === i.ownerNpcId)),
      sessions: latest(sessionsLinking('scenes', new Set([scene._id]))),
      focus: scene.name
    };
  }
  if (s.kind === 'group') {
    const g = norm(s.group);
    const inGroup = (e: any) => norm(e.group) === g || norm(e.location) === g;
    const npcs = data.npcs.filter(inGroup);
    const scenes = data.scenes.filter(inGroup);
    const ids = new Set([...npcs, ...scenes].map((e) => e._id));
    return {
      scenes,
      npcs,
      players: data.players,
      items: data.items.filter((i) => inGroup(i) || ids.has(i.ownerNpcId) || ids.has(i.sceneId)),
      sessions: latest([...new Set([...sessionsLinking('npcs', ids), ...sessionsLinking('scenes', ids)])].sort((a, b) => time(a) - time(b))),
      focus: s.group
    };
  }
  return { scenes: data.scenes, npcs: data.npcs, players: data.players, items: data.items, sessions: latest(sorted), focus: '' };
}

/** Values the task presets can refer to */
export function taskContext(data: CampaignExport, scope: Scope): TaskContext {
  const sorted = [...data.sessions].sort((a, b) => time(a) - time(b));
  const latest = [...sorted].reverse().find((s) => s.isEnded);
  const next = sorted.find((s) => !s.isEnded);
  const focus =
    scope.kind === 'scene' ? data.scenes.find((x) => x._id === scope.sceneId)?.name
    : scope.kind === 'group' ? scope.group
    : scope.kind === 'session' ? data.sessions.find((x) => x._id === scope.sessionId)?.title
    : undefined;
  return { latestSession: latest?.title, nextSession: next?.title, focus };
}

/* ---------- the pack ---------- */

export function buildPack(data: CampaignExport, opts: PackOptions): string {
  const sel = select(data, opts);
  const secret = opts.includeSecrets;
  const name = (list: any[], id: string | null | undefined) => (id ? list.find((e) => e._id === id)?.name ?? null : null);
  const notesFor = (id: string) => data.notes.filter((n) => n.entityId === id);
  const out: string[] = [];
  const push = (...lines: string[]) => out.push(...lines);

  push('# Game Master brief', '');
  push('## Rules for you, the AI', ...RULES.map((r) => `- ${r}`), '');
  if (!secret) push('- This brief was prepared for sharing with players: it contains no DM secrets.', '');
  push('## Your task', opts.task.trim() || 'Wait for my questions.', '');

  push('---', '', '## Campaign data', '');
  push(`### Campaign: ${data.game.name}`);
  if (data.game.description) push(clean(data.game.description));
  const played = data.sessions.filter((s) => s.isEnded);
  if (played.length) push(`${played.length} sessions played, from ${day([...played].sort((a, b) => time(a) - time(b))[0])} to ${day([...played].sort((a, b) => time(b) - time(a))[0])}.`);
  if (sel.focus) push(`This brief focuses on: **${sel.focus}**. Only the related parts of the campaign are included.`);
  push('');

  // Party
  if (sel.players.length) {
    push('### Player characters');
    for (const [group, list] of groupBy(sel.players.sort(byName), (p) => p.group)) {
      if (group !== 'No group') push(`*${group}*`);
      for (const p of list) {
        // Focused briefs only mention the party's items that belong to the focus; full briefs cap the list
        const inScope = new Set(sel.items.map((i) => i._id));
        const ownIds: string[] = (p.itemIds ?? []).filter((i: string) => opts.scope.kind === 'all' || inScope.has(i));
        const named = ownIds.map((i) => name(data.items, i)).filter(Boolean) as string[];
        const carries = named.length > 10 ? [...named.slice(0, 10), `+${named.length - 10} more`] : named;
        const bits = [p.class, p.level && `level ${p.level}`].filter(Boolean).join(', ');
        push(`- **${p.name}**${bits ? ` (${bits})` : ''}${p.description ? `: ${clean(p.description)}` : ''}${carries.length ? ` Carries: ${carries.join(', ')}.` : ''}`);
      }
    }
    push('');
  }

  // Sessions, newest first
  if (sel.sessions.length) {
    const total = opts.scope.kind === 'all' ? data.sessions.length : sel.sessions.length;
    push(`### Sessions (${sel.sessions.length}${sel.sessions.length < total ? ` most recent of ${total}` : ''}, newest first)`);
    for (const s of [...sel.sessions].sort((a, b) => time(b) - time(a))) {
      const n = s.notes ?? {};
      push('', `#### ${s.title} · ${day(s)} · ${s.isEnded ? 'played' : 'upcoming'}`);
      const field = (label: string, v: unknown, dmOnly = false) => {
        const t = clean(v);
        if (!t || (dmOnly && !secret)) return;
        push(`- ${dmOnly ? '[DM ONLY] ' : ''}${label}: ${t}`);
      };
      field('Summary', n.summary);
      field('Plot developments', n.plotDevelopments);
      field('Quests', n.quests);
      field('Loot', n.loot);
      if (n.xp) push(`- XP: ${n.xp}`);
      field('Factions', n.factions);
      field('Goals', n.goals);
      field('Downtime', n.downtime);
      field('Mysteries', n.mysteries, true);
      field('Secrets', n.secrets, true);
      field('Next session plans', n.nextPlans, true);
      field('Notes', n.custom, true);
      field('Additional notes', n.additional, true);
      const c = s.connections ?? {};
      const linked = [
        ['Scenes', data.scenes, c.scenes],
        ['NPCs', data.npcs, c.npcs],
        ['Players', data.players, c.players],
        ['Items', data.items, c.items]
      ]
        .map(([label, list, ids]: any) => [label, (ids ?? []).map((id: string) => name(list, id)).filter(Boolean)])
        .filter(([, names]: any) => names.length)
        .map(([label, names]: any) => `${label}: ${names.join(', ')}`);
      if (linked.length) push(`- Involved: ${linked.join(' · ')}`);
    }
    push('');
  }

  // NPCs by group
  if (sel.npcs.length) {
    push('### NPCs (by group)');
    for (const [group, list] of groupBy(sel.npcs.sort(byName), (n) => n.group)) {
      push('', `#### ${group}`);
      for (const n of list) {
        const where = name(data.scenes, n.sceneId);
        const carries = (n.itemIds ?? []).map((i: string) => name(data.items, i)).filter(Boolean);
        const meta = [n.role, n.status].filter(Boolean).join(', ');
        push(`- **${n.name}**${meta ? ` (${meta})` : ''}${n.description ? `: ${clean(n.description)}` : ''}${where ? ` Location: ${where}.` : ''}${carries.length ? ` Carries: ${carries.join(', ')}.` : ''}`);
        if (secret) for (const note of notesFor(n._id)) push(`  - [DM ONLY] ${note.title}: ${clean(note.text)}`);
      }
    }
    push('');
  }

  // Scenes by group
  if (sel.scenes.length) {
    push('### Scenes and locations (by group)');
    for (const [group, list] of groupBy(sel.scenes.sort(byName), (s) => s.group || s.location)) {
      push('', `#### ${group}`);
      for (const s of list) {
        const here = data.npcs.filter((n) => n.sceneId === s._id).map((n) => n.name);
        const meta = [s.location, s.dangerLevel && `danger ${s.dangerLevel}`].filter(Boolean).join(', ');
        push(`- **${s.name}**${meta ? ` (${meta})` : ''}${s.description ? `: ${clean(s.description)}` : ''}${here.length ? ` NPCs here: ${here.join(', ')}.` : ''}`);
        if (secret) for (const note of notesFor(s._id)) push(`  - [DM ONLY] ${note.title}: ${clean(note.text)}`);
      }
    }
    push('');
  }

  // Items by holder
  if (sel.items.length) {
    push('### Items (by who has them)');
    const holder = (i: any) =>
      i.ownerPlayerId ? `Carried by ${name(data.players, i.ownerPlayerId) ?? 'a player'}`
      : i.ownerNpcId ? `Carried by ${name(data.npcs, i.ownerNpcId) ?? 'an NPC'}`
      : i.sceneId ? `At ${name(data.scenes, i.sceneId) ?? 'a scene'}`
      : 'Not placed yet';
    for (const [where, list] of groupBy(sel.items.sort(byName), holder)) {
      push('', `#### ${where}`);
      for (const i of list) {
        const meta = [i.itemType, i.benefits].filter(Boolean).join(', ');
        push(`- **${i.name}**${meta ? ` (${meta})` : ''}${i.description ? `: ${clean(i.description)}` : ''}`);
        if (secret) for (const note of notesFor(i._id)) push(`  - [DM ONLY] ${note.title}: ${clean(note.text)}`);
      }
    }
    push('');
  }

  push('---', '', '_End of campaign data. Follow the rules and the task above._');
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
