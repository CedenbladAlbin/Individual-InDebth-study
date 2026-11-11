<script lang="ts">
  import { api } from '$lib/api';
  import Modal from '$lib/Modal.svelte';
  import { formatSessionDate, toDateInput } from '$lib/sessions';

  export let session: any;
  export let onClose: () => void;
  /** Called after the session was changed or deleted on the server, so the parent can reload. */
  export let onChanged: () => void;

  type Tab = 'overview' | 'entities' | 'notes' | 'more';
  const TABS: [Tab, string][] = [['overview', 'Overview'], ['entities', 'Linked'], ['notes', 'Notes'], ['more', 'More']];
  let activeTab: Tab = 'overview';

  let noteInput = '';
  let loading = false;
  let errorMsg = '';

  let edit = false;
  let editData = { title: '', date: '', summary: '', plotDevelopments: '', xp: 0, nextPlans: '' };

  const MORE_FIELDS: [string, string][] = [
    ['quests', 'Quests'], ['loot', 'Loot'], ['secrets', 'Secrets'], ['factions', 'Factions'],
    ['mysteries', 'Mysteries'], ['goals', 'Goals'], ['downtime', 'Downtime'], ['nextPlans', 'Next session plans']
  ];
  const LINKED: [string, string, string][] = [
    ['scenes', 'Scenes', 'scene'], ['npcs', 'NPCs', 'npc'], ['players', 'Players', 'player'], ['items', 'Items', 'item']
  ];

  $: customNotes = Array.isArray(session.notes?.custom)
    ? session.notes.custom
    : session.notes?.custom ? [session.notes.custom] : [];

  const text = (v: unknown) => (Array.isArray(v) ? v.join(', ') : v ? String(v) : '');

  function startEdit() {
    editData = {
      title: session.title || '',
      date: toDateInput(session.date),
      summary: session.notes?.summary || '',
      plotDevelopments: session.notes?.plotDevelopments || '',
      xp: Number(session.notes?.xp) || 0,
      nextPlans: session.notes?.nextPlans || ''
    };
    edit = true;
  }

  async function run(action: () => Promise<Response>, fallback: string) {
    loading = true;
    errorMsg = '';
    try {
      const res = await action();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || fallback);
      }
      return true;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : fallback;
      return false;
    } finally {
      loading = false;
    }
  }

  async function saveEdit() {
    const { title, date, ...notes } = editData;
    const ok = await run(
      () => api(`/api/sessions/${session._id}`, { method: 'PATCH', body: JSON.stringify({ title, date: date || null, notes }) }),
      'Failed to save session.'
    );
    if (ok) {
      edit = false;
      onChanged();
    }
  }

  async function setEnded(isEnded: boolean) {
    const ok = await run(
      () => api(`/api/sessions/${session._id}`, { method: 'PATCH', body: JSON.stringify({ isEnded }) }),
      'Failed to update session.'
    );
    if (ok) onChanged();
  }

  async function addNote() {
    if (!noteInput.trim()) return;
    const ok = await run(
      () => api(`/api/sessions/${session._id}/notes`, { method: 'POST', body: JSON.stringify({ note: noteInput }) }),
      'Failed to add note.'
    );
    if (ok) {
      noteInput = '';
      onChanged();
    }
  }

  async function deleteSession() {
    if (!confirm(`Delete "${session.title}"? This cannot be undone.`)) return;
    const ok = await run(() => api(`/api/sessions/${session._id}`, { method: 'DELETE' }), 'Failed to delete session.');
    if (ok) {
      onClose();
      onChanged();
    }
  }
</script>

<Modal title={edit ? 'Edit session' : session.title} {onClose} size="lg">
  <span slot="eyebrow">
    {#if session.isEnded}
      <span class="badge">Ended</span>
    {:else}
      <span class="badge badge-primary">Upcoming</span>
    {/if}
  </span>

  {#if errorMsg}<div class="alert alert-error" role="alert">{errorMsg}</div>{/if}

  {#if edit}
    <form class="stack-lg" on:submit|preventDefault={saveEdit}>
      <label class="field">
        <span class="field-label">Title</span>
        <input class="input" type="text" bind:value={editData.title} required />
      </label>
      <label class="field">
        <span class="field-label">Summary</span>
        <textarea class="input" rows="4" bind:value={editData.summary}></textarea>
      </label>
      <label class="field">
        <span class="field-label">Plot developments</span>
        <textarea class="input" rows="3" bind:value={editData.plotDevelopments}></textarea>
      </label>
      <div class="form-grid">
        <label class="field">
          <span class="field-label">Date played</span>
          <input class="input" type="date" bind:value={editData.date} />
        </label>
        <label class="field">
          <span class="field-label">XP awarded</span>
          <input class="input" type="number" min="0" step="10" bind:value={editData.xp} />
        </label>
      </div>
      <label class="field">
        <span class="field-label">Next session plans</span>
        <textarea class="input" rows="2" bind:value={editData.nextPlans}></textarea>
      </label>
      <div class="row-end">
        <button type="button" class="btn btn-ghost" on:click={() => (edit = false)}>Cancel</button>
        <button type="submit" class="btn btn-primary" disabled={loading || !editData.title.trim()}>Save changes</button>
      </div>
    </form>
  {:else}
    <div class="toolbar">
      <button class="btn btn-outline btn-sm" on:click={startEdit} disabled={loading}>Edit</button>
      {#if session.isEnded}
        <button class="btn btn-outline btn-sm" on:click={() => setEnded(false)} disabled={loading}>Reopen</button>
      {:else}
        <button class="btn btn-outline btn-sm" on:click={() => setEnded(true)} disabled={loading}>Mark as ended</button>
      {/if}
      <button class="btn btn-danger btn-sm push" on:click={deleteSession} disabled={loading}>Delete</button>
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
          <div class="stack">
            <section>
              <h3 class="eyebrow">Summary</h3>
              <p class:faint={!session.notes?.summary}>{session.notes?.summary || 'No summary yet.'}</p>
            </section>
            <section>
              <h3 class="eyebrow">Plot developments</h3>
              <p class:faint={!session.notes?.plotDevelopments}>{session.notes?.plotDevelopments || 'Nothing recorded.'}</p>
            </section>
          </div>
          <dl class="facts card">
            <div><dt>XP</dt><dd>{session.notes?.xp || 0}</dd></div>
            <div><dt>Status</dt><dd>{session.isEnded ? 'Ended' : 'Upcoming'}</dd></div>
            <div><dt>{session.isEnded ? 'Played' : 'Planned for'}</dt><dd>{formatSessionDate(session) || '–'}</dd></div>
          </dl>
        </div>
      {:else if activeTab === 'entities'}
        <div class="linked">
          {#each LINKED as [key, label, type]}
            <section data-type={type}>
              <h3 class="eyebrow">{label}</h3>
              <div class="chips">
                {#each session[key] || [] as entity}
                  <span class="chip"><span class="dot"></span>{entity.name || 'Deleted'}</span>
                {:else}
                  <span class="faint small">None</span>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      {:else if activeTab === 'notes'}
        <div class="stack">
          <form class="add-note" on:submit|preventDefault={addNote}>
            <input class="input" type="text" placeholder="Write a note and press Enter…" bind:value={noteInput} />
            <button type="submit" class="btn btn-primary" disabled={loading || !noteInput.trim()}>Add</button>
          </form>
          {#if customNotes.length}
            <ol class="notes">
              {#each customNotes as note}
                <li>{note}</li>
              {/each}
            </ol>
          {:else}
            <p class="faint small">No notes yet.</p>
          {/if}
        </div>
      {:else}
        <dl class="more">
          {#each MORE_FIELDS as [key, label]}
            <div>
              <dt class="eyebrow">{label}</dt>
              <dd class:faint={!text(session.notes?.[key])}>{text(session.notes?.[key]) || '–'}</dd>
            </div>
          {/each}
        </dl>
      {/if}
    </div>
  {/if}
</Modal>

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-3);
    margin-bottom: var(--sp-4);
  }
  .push { margin-left: auto; }
  .panel { padding-top: var(--sp-5); }
  section { display: flex; flex-direction: column; gap: var(--sp-2); }
  p { white-space: pre-wrap; }

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
    gap: var(--sp-3);
    margin: 0;
    padding: var(--sp-4);
    background: var(--surface-2);
  }
  .facts div { display: flex; justify-content: space-between; gap: var(--sp-3); }
  .facts dt { color: var(--text-muted); font-size: var(--fs-xs); }
  .facts dd { margin: 0; font-weight: 600; }

  .linked {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 233px), 1fr));
    gap: var(--sp-5);
  }
  .chips { display: flex; flex-wrap: wrap; gap: var(--sp-2); }

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
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 233px), 1fr));
    gap: var(--sp-5);
    margin: 0;
  }
  .more div { display: flex; flex-direction: column; gap: var(--sp-2); }
  .more dd { margin: 0; white-space: pre-wrap; }

  @media (max-width: 610px) {
    .overview { grid-template-columns: 1fr; }
  }
</style>
