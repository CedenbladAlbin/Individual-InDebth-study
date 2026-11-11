/** Helpers for session dates. `session.date` is the play date (UTC midnight); older sessions only have `createdAt`. */

type SessionLike = { date?: string | null; createdAt?: string; title?: string; notes?: any; isEnded?: boolean };

/** Sort key: the play date if set, otherwise when the session was created */
export function sessionTime(s: SessionLike): number {
  const t = new Date(s.date ?? s.createdAt ?? 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function sortByDate<T extends SessionLike>(list: T[], dir: 'asc' | 'desc' = 'asc'): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => (sessionTime(a) - sessionTime(b)) * sign);
}

/** "12 Mar 2025" (or without the year when `short`) */
export function formatSessionDate(s: SessionLike, short = false): string {
  const t = sessionTime(s);
  if (!t) return '';
  return new Date(t).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(short ? {} : { year: 'numeric' }),
    // Play dates are stored as UTC midnight, so format in UTC to avoid showing the day before
    timeZone: s.date ? 'UTC' : undefined
  });
}

export function sessionYear(s: SessionLike): number {
  return new Date(sessionTime(s)).getUTCFullYear();
}

/** Value for an <input type="date"> */
export function toDateInput(value?: string | Date | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** Today in the user's local time, as YYYY-MM-DD */
export function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Does the session's title or notes contain the query? */
export function sessionMatches(s: SessionLike, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const n = s.notes ?? {};
  const custom = Array.isArray(n.custom) ? n.custom.join(' ') : n.custom ?? '';
  return [s.title, n.summary, n.plotDevelopments, n.secrets, n.nextPlans, n.loot, n.quests, custom]
    .some((v) => typeof v === 'string' && v.toLowerCase().includes(q));
}

/** Free-text match on the fields shown on entity cards */
export function entityMatches(e: any, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return ['name', 'description', 'role', 'status', 'location', 'dangerLevel', 'class', 'level', 'itemType', 'benefits']
    .some((k) => typeof e[k] === 'string' && e[k].toLowerCase().includes(q));
}

/** Creation time from a MongoDB ObjectId (first 4 bytes), for "newest first" sorting */
export function idTime(id: string): number {
  return /^[0-9a-f]{24}$/i.test(id) ? parseInt(id.slice(0, 8), 16) : 0;
}
