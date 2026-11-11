<script lang="ts">
  import { onDestroy } from 'svelte';
  import { api } from '$lib/api';
  import Modal from '$lib/Modal.svelte';
  import { toDateInput } from '$lib/sessions';

  export let session: any;
  export let onClose: () => void;
  /** Called after the session was changed or deleted on the server, so the parent can reload. */
  export let onChanged: () => void;
  /** Open a linked scene's battle map */
  export let onOpenScene: (scene: any) => void = () => {};

  type Tab = 'overview' | 'entities' | 'notes' | 'more';
  const TABS: [Tab, string][] = [['overview', 'Overview'], ['entities', 'Linked'], ['notes', 'Notes'], ['more', 'More']];
  let activeTab: Tab = 'overview';

  const MORE_FIELDS: [string, string, string][] = [
    ['quests', 'Quests', 'Open quests and leads'],
    ['loot', 'Loot', 'Treasure and rewards handed out'],
    ['secrets', 'Secrets', 'What the players still don\'t know'],
    ['factions', 'Factions', 'Who gained or lost standing'],
    ['mysteries', 'Mysteries', 'Unanswered questions'],
    ['goals', 'Goals', 'What the party is working towards'],
    ['downtime', 'Downtime', 'Shopping, training, travel'],
    ['nextPlans', 'Next session plans', 'Prep for next time']
  ];
  const LINKED: [string, string, string][] = [
    ['scenes', 'Scenes', 'scene'], ['npcs', 'NPCs', 'npc'], ['players', 'Players', 'player'], ['items', 'Items', 'item']
  ];

  /* ---------- Inline editing with autosave ---------- */
  type Draft = { title: string; date: string; isEnded: boolean; xp: number; [note: string]: any };

  function fromSession(s: any): Draft {
    const n = s.notes ?? {};
    const text = (v: unknown) => (Array.isArray(v) ? v.join('\n') : v ? String(v) : '');
    return {
      title: s.title ?? '',
      date: toDateInput(s.date),
      isEnded: !!s.isEnded,
      xp: Number(n.xp) || 0,
      summary: text(n.summary),
      plotDevelopments: text(n.plotDevelopments),
      additional: text(n.additional),
      ...Object.fromEntries(MORE_FIELDS.map(([k]) => [k, text(n[k])]))
    };
  }

  let draft = fromSession(session);
  let lastSaved = JSON.stringify(draft);
  let saveState: 'saved' | 'pending' | 'saving' | 'error' = 'saved';
  let errorMsg = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | null = null;

  /** Call after every edit: saves 0.8 s after the last keystroke */
  function changed() {
    saveState = 'pending';
    clearTimeout(timer);
    timer = setTimeout(save, 800);
  }

  async function save(): Promise<void> {
    clearTimeout(timer);
    if (inFlight) await inFlight;
    const snap = JSON.stringify(draft);
    if (snap === lastSaved) {
      saveState = 'saved';
      return;
    }
    if (!draft.title.trim()) {
      saveState = 'error';
      errorMsg = 'The title cannot be empty.';
      return;
    }
    saveState = 'saving';
    errorMsg = '';
    const { title, date, isEnded, ...notes } = draft;
    inFlight = (async () => {
      try {
        const res = await api(`/api/sessions/${session._id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, date: date || null, isEnded, notes })
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Could not save.');
        lastSaved = snap;
        saveState = JSON.stringify(draft) === snap ? 'saved' : 'pending';
        onChanged();
      } catch (e) {
        saveState = 'error';
        errorMsg = e instanceof Error ? e.message : 'Could not save.';
      }
    })();
    await inFlight;
    inFlight = null;
  }

  /** Make sure nothing typed is lost when the dialog closes */
  async function close() {
    if (JSON.stringify(draft) !== lastSaved) await save();
    if (saveState === 'error' && !confirm('Your latest changes could not be saved. Close anyway?')) return;
    onClose();
  }
  onDestroy(() => clearTimeout(timer));

  function toggleEnded() {
    draft.isEnded = !draft.isEnded;
    save();
  }

  async function openScene(scene: any) {
    if (!scene?.name) return;
    await save();
    onClose();
    onOpenScene(scene);
  }

  /* ---------- Quick notes (appended list) ---------- */
  let noteInput = '';
  let busy = false;
  $: customNotes = Array.isArray(session.notes?.custom)
    ? session.notes.custom
    : session.notes?.custom ? [session.notes.custom] : [];

  async function addNote() {
    if (!noteInput.trim()) return;
    busy = true;
    const res = await api(`/api/sessions/${session._id}/notes`, { method: 'POST', body: JSON.stringify({ note: noteInput }) });
    busy = false;
    if (res.ok) {
      noteInput = '';
      onChanged();
    } else {
      errorMsg = 'Failed to add note.';
    }
  }

  async function deleteSession() {
    if (!confirm(`Delete "${session.title}"? This cannot be undone.`)) return;
    clearTimeout(timer);
    const res = await api(`/api/sessions/${session._id}`, { method: 'DELETE' });
    if (!res.ok) {
      errorMsg = 'Failed to delete session.';
      return;
    }
    onClose();
    onChanged();
  }

  const SAVE_TEXT = { saved: 'All changes saved', pending: 'Editing…', saving: 'Saving…', error: 'Not saved' };
</script>

<Modal title={draft.title || 'Untitled session'} onClose={close} size="lg">
  <span slot="eyebrow" class="eyebrow-row">
    {#if draft.isEnded}
      <span class="badge">Ended</span>
    {:else}
      <span class="badge badge-primary">Upcoming</span>
    {/if}
    <span class="save {saveState}" aria-live="polite"><span class="save-dot"></span>{SAVE_TEXT[saveState]}</span>
  </span>

  {#if errorMsg}<div class="alert alert-error" role="alert">{errorMsg}</div>{/if}

  <div class="toolbar">
    <button class="btn btn-outline btn-sm" on:click={toggleEnded}>{draft.isEnded ? 'Reopen' : 'Mark as ended'}</button>
    <span class="hint">Everything here saves automatically as you type.</span>
    <button class="btn btn-danger btn-sm push" on:click={deleteSession}>Delete</button>
  </div>

  <div class="tabs" role="tablist">
    {#each TABS as [key, label]}
      <button class="tab" role="tab" aria-selected={activeTab === key} on:click={() => (activeTab = key)}>
        {label}
        {#if key === 'notes' && customNotes.length}<span class="badge">{customNotes.length}</span>{/if}
      </button>
    {/each}
  </div>

  <div class="panel" role="tabpanel">
    {#if activeTab === 'overview'}
      <div class="overview">
        <div class="stack-lg">
          <label class="field">
            <span class="field-label">Title</span>
            <input class="input" type="text" maxlength="200" bind:value={draft.title} on:input={changed} />
          </label>
          <label class="field">
            <span class="field-label">Summary</span>
            <textarea class="input" rows="5" placeholder="What happened, or what is planned?" bind:value={draft.summary} on:input={changed}></textarea>
          </label>
          <label class="field">
            <span class="field-label">Plot developments</span>
            <textarea class="input" rows="3" placeholder="Twists, reveals, decisions…" bind:value={draft.plotDevelopments} on:input={changed}></textarea>
          </label>
        </div>
        <div class="facts card">
          <label class="field">
            <span class="field-label">{draft.isEnded ? 'Played on' : 'Planned for'}</span>
            <input class="input" type="date" bind:value={draft.date} on:change={changed} />
          </label>
          <label class="field">
            <span class="field-label">XP awarded</span>
            <input class="input" type="number" min="0" step="10" bind:value={draft.xp} on:input={changed} />
          </label>
          <div class="field">
            <span class="field-label">Status</span>
            <label class="toggle">
              <input type="checkbox" checked={draft.isEnded} on:change={toggleEnded} />
              <span>Session completed</span>
            </label>
          </div>
        </div>
      </div>
    {:else if activeTab === 'entities'}
      <div class="linked">
        {#each LINKED as [key, label, type]}
          <section data-type={type}>
            <h3 class="eyebrow">{label}</h3>
            <div class="chips">
              {#each session[key] || [] as entity}
                {#if type === 'scene' && entity.name}
                  <button class="chip chip-btn" title="Open the battle map" on:click={() => openScene(entity)}>
                    <span class="dot"></span>{entity.name}<span class="open">Map →</span>
                  </button>
                {:else}
                  <span class="chip"><span class="dot"></span>{entity.name || 'Deleted'}</span>
                {/if}
              {:else}
                <span class="faint small">None</span>
              {/each}
            </div>
          </section>
        {/each}
      </div>
    {:else if activeTab === 'notes'}
      <div class="stack-lg">
        <div class="stack">
          <form class="add-note" on:submit|preventDefault={addNote}>
            <input class="input" type="text" placeholder="Quick note, press Enter to add…" bind:value={noteInput} />
            <button type="submit" class="btn btn-primary" disabled={busy || !noteInput.trim()}>Add</button>
          </form>
          {#if customNotes.length}
            <ol class="notes">
              {#each customNotes as note}
                <li>{note}</li>
              {/each}
            </ol>
          {:else}
            <p class="faint small">No quick notes yet.</p>
          {/if}
        </div>
        <label class="field">
          <span class="field-label">Additional notes</span>
          <textarea class="input" rows="5" placeholder="Longer notes about this session…" bind:value={draft.additional} on:input={changed}></textarea>
        </label>
      </div>
    {:else}
      <div class="more">
        {#each MORE_FIELDS as [key, label, placeholder]}
          <label class="field">
            <span class="field-label">{label}</span>
            <textarea class="input" rows="3" {placeholder} bind:value={draft[key]} on:input={changed}></textarea>
          </label>
        {/each}
      </div>
    {/if}
  </div>
</Modal>

<style>
  .eyebrow-row { display: inline-flex; align-items: center; gap: var(--sp-4); }
  .save { display: inline-flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-xs); color: var(--text-faint); }
  .save-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); }
  .save.pending .save-dot, .save.saving .save-dot { background: var(--warning); }
  .save.error { color: var(--danger-text); }
  .save.error .save-dot { background: var(--danger); }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-3);
    margin-bottom: var(--sp-4);
  }
  .push { margin-left: auto; }
  .panel { padding-top: var(--sp-5); }
  section { display: flex; flex-direction: column; gap: var(--sp-2); }

  /* Main text : facts = φ : 1 */
  .overview {
    display: grid;
    grid-template-columns: minmax(0, 1.618fr) minmax(0, 1fr);
    gap: var(--sp-5);
    align-items: start;
  }
  .facts {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    margin: 0;
    padding: var(--sp-4);
    background: var(--surface-2);
  }
  .toggle { display: flex; align-items: center; gap: var(--sp-3); font-weight: 600; cursor: pointer; min-height: var(--control-h); }
  .toggle input { width: 16px; height: 16px; accent-color: var(--primary); }

  .linked {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 233px), 1fr));
    gap: var(--sp-5);
  }
  .chips { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
  .chip-btn { cursor: pointer; }
  .chip-btn:hover { border-color: var(--type-color); }
  .chip-btn .open { color: var(--type-color); font-weight: 650; }

  .add-note { display: flex; gap: var(--sp-3); }
  .notes {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: note;
  }
  .notes li {
    position: relative;
    padding: var(--sp-3) var(--sp-4) var(--sp-3) var(--sp-6);
    background: var(--surface-2);
    border-radius: var(--r-md);
    white-space: pre-wrap;
    counter-increment: note;
  }
  .notes li::before {
    content: counter(note);
    position: absolute;
    left: var(--sp-4);
    color: var(--text-faint);
    font-size: var(--fs-xs);
    font-weight: 650;
    line-height: 2.058;
  }

  .more {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 288px), 1fr));
    gap: var(--sp-4) var(--sp-5);
  }

  @media (max-width: 610px) {
    .overview { grid-template-columns: 1fr; }
  }
</style>
