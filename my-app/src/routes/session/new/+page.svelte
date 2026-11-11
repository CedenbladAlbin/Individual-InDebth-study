<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api, getToken } from '$lib/api';
  import { sortByDate, todayInput } from '$lib/sessions';

  type Key = 'scenes' | 'npcs' | 'players' | 'items';

  let gameId = '';
  let title = '';
  let date = todayInput();
  let pickQuery = '';
  let isEnded = false;
  let error = '';
  let saving = false;
  let showMore = false;

  let notes = {
    summary: '',
    plotDevelopments: '',
    quests: '',
    loot: '',
    xp: 0,
    secrets: '',
    factions: '',
    mysteries: '',
    goals: '',
    downtime: '',
    nextPlans: '',
    custom: ''
  };
  type NoteKey = keyof typeof notes;

  let content: Record<Key, any[]> = { scenes: [], npcs: [], players: [], items: [] };
  let selected: Record<Key, string[]> = { scenes: [], npcs: [], players: [], items: [] };

  const GROUPS: { key: Key; label: string; type: string }[] = [
    { key: 'scenes', label: 'Scenes', type: 'scene' },
    { key: 'npcs', label: 'NPCs', type: 'npc' },
    { key: 'players', label: 'Players', type: 'player' },
    { key: 'items', label: 'Items', type: 'item' }
  ];
  const MORE_FIELDS: [NoteKey, string, boolean][] = [
    ['quests', 'Quests', false], ['loot', 'Loot', false], ['factions', 'Factions', false], ['goals', 'Goals', false],
    ['secrets', 'Secrets', true], ['mysteries', 'Mysteries', true], ['downtime', 'Downtime', true],
    ['nextPlans', 'Next session plans', true], ['custom', 'Other notes', true]
  ];

  onMount(async () => {
    if (!getToken()) {
      window.location.href = '/login';
      return;
    }
    gameId = new URLSearchParams(window.location.search).get('gameId') || '';
    if (!gameId) return;
    const load = async (type: string) => {
      const res = await api(`/api/game-content?${type}=1&gameId=${gameId}`);
      return res.ok ? await res.json() : [];
    };
    const [npcs, players, items, scenes, sessionsRes] = await Promise.all([
      load('npc'), load('player'), load('item'), load('scene'), api(`/api/sessions?gameId=${gameId}`)
    ]);
    content = { scenes, npcs, players, items };
    const sessions: any[] = sessionsRes.ok ? await sessionsRes.json() : [];

    // Pre-select the players who were at the most recent session (retired characters drop out),
    // or everyone if this is the first session
    const latest = sortByDate(sessions, 'desc')[0];
    const ids = new Set(players.map((p: any) => p._id));
    const lastPlayers = (latest?.connections?.players ?? []).filter((id: string) => ids.has(id));
    selected.players = lastPlayers.length ? lastPlayers : players.map((p: any) => p._id);

    // Continue the numbering: "Session 134: …" → "Session 135: "
    const numbers = sessions.map((s) => Number(/^session\s+(\d+)/i.exec(s.title)?.[1])).filter((n) => n > 0);
    title = `Session ${(numbers.length ? Math.max(...numbers) : sessions.length) + 1}: `;
  });

  /** Selected entries first, then the rest filtered by the search */
  function pickList(list: any[], chosen: string[], q: string) {
    const term = q.trim().toLowerCase();
    const on = list.filter((e) => chosen.includes(e._id));
    const off = list.filter((e) => !chosen.includes(e._id) && (!term || e.name.toLowerCase().includes(term)));
    return [...on, ...off];
  }
  $: totalContent = content.scenes.length + content.npcs.length + content.players.length + content.items.length;

  function toggle(key: Key, id: string) {
    selected[key] = selected[key].includes(id) ? selected[key].filter((x) => x !== id) : [...selected[key], id];
  }

  async function createSession() {
    if (!title.trim() || !gameId) return;
    saving = true;
    error = '';
    const res = await api('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ gameId, title, date, notes, connections: { ...selected, quests: [] }, isEnded })
    });
    if (res.ok) {
      await goto(`/game/${gameId}`);
      return;
    }
    const data = await res.json().catch(() => ({}));
    error = data.message || 'Failed to create session.';
    saving = false;
  }
</script>

<svelte:head>
  <title>New session · DnD Session Manager</title>
</svelte:head>

<main class="page">
  <a href={`/game/${gameId}`} class="back-link">← Back to game</a>
  <header class="page-header">
    <div>
      <h1>New session</h1>
      <p class="muted lead">Plan what's coming up, or log a session you've just played.</p>
    </div>
  </header>

  {#if !gameId}
    <div class="alert alert-error" role="alert">No game selected. Open a game and click "New session".</div>
  {:else}
    <form class="layout" on:submit|preventDefault={createSession}>
      <div class="main stack-lg">
        {#if error}<div class="alert alert-error" role="alert">{error}</div>{/if}

        <section class="card stack-lg">
          <label class="field">
            <span class="field-label">Title</span>
            <input class="input title-input" type="text" maxlength="200" placeholder="e.g. Session 4: Into the Mines" bind:value={title} required />
          </label>
          <label class="field">
            <span class="field-label">Summary</span>
            <textarea class="input" rows="5" placeholder="What is this session about, or what happened?" bind:value={notes.summary}></textarea>
          </label>
          <label class="field">
            <span class="field-label">Plot developments</span>
            <textarea class="input" rows="3" placeholder="Twists, reveals, decisions the party made…" bind:value={notes.plotDevelopments}></textarea>
          </label>
        </section>

        <section class="card stack-lg">
          <div>
            <h2 class="card-title">What's involved?</h2>
            <p class="hint">Tap to link scenes, NPCs, players and items to this session.</p>
          </div>
          {#if totalContent > 30}
            <input class="input" type="search" placeholder="Search by name…" bind:value={pickQuery} aria-label="Search scenes, NPCs, players and items" />
          {/if}
          {#each GROUPS as group}
            <fieldset class="pick" data-type={group.type}>
              <legend class="field-label"><span class="dot"></span>{group.label}<span class="faint">{selected[group.key].length ? `${selected[group.key].length} selected` : ''}</span></legend>
              <div class="pick-list">
                {#each pickList(content[group.key], selected[group.key], pickQuery) as entity (entity._id)}
                  <label class="pick-chip" class:on={selected[group.key].includes(entity._id)}>
                    <input type="checkbox" class="sr-only" checked={selected[group.key].includes(entity._id)} on:change={() => toggle(group.key, entity._id)} />
                    {entity.name}
                  </label>
                {:else}
                  <span class="faint small">{content[group.key].length ? 'No match' : 'None in this game yet.'}</span>
                {/each}
              </div>
            </fieldset>
          {/each}
        </section>

        <section class="card">
          <button type="button" class="more-toggle" aria-expanded={showMore} on:click={() => (showMore = !showMore)}>
            <span><strong>More notes</strong> <span class="faint small">Quests, loot, secrets, next session plans…</span></span>
            <svg class:flipped={showMore} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          {#if showMore}
            <div class="form-grid more-fields">
              {#each MORE_FIELDS as [key, label, long]}
                <label class="field" class:wide={long}>
                  <span class="field-label">{label}</span>
                  {#if long}
                    <textarea class="input" rows="2" bind:value={notes[key]}></textarea>
                  {:else}
                    <input class="input" type="text" bind:value={notes[key]} />
                  {/if}
                </label>
              {/each}
            </div>
          {/if}
        </section>
      </div>

      <aside class="side">
        <div class="card stack-lg">
          <fieldset class="status">
            <legend class="field-label">Status</legend>
            <label class="status-opt" class:on={!isEnded}>
              <input type="radio" name="status" class="sr-only" value={false} bind:group={isEnded} />
              <span class="status-dot upcoming"></span>
              <span><strong>Upcoming</strong><span class="hint">Planning ahead</span></span>
            </label>
            <label class="status-opt" class:on={isEnded}>
              <input type="radio" name="status" class="sr-only" value={true} bind:group={isEnded} />
              <span class="status-dot"></span>
              <span><strong>Played</strong><span class="hint">Logging a finished session</span></span>
            </label>
          </fieldset>

          <label class="field">
            <span class="field-label">Date</span>
            <input class="input" type="date" bind:value={date} />
          </label>

          <label class="field">
            <span class="field-label">XP awarded</span>
            <input class="input" type="number" min="0" step="10" bind:value={notes.xp} />
            <input class="range" type="range" min="0" max="10000" step="50" bind:value={notes.xp} aria-label="XP slider" />
          </label>

          <div class="summary small muted">
            {selected.scenes.length + selected.npcs.length + selected.players.length + selected.items.length} linked
          </div>

          <div class="stack">
            <button type="submit" class="btn btn-primary btn-lg btn-block" disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : 'Create session'}
            </button>
            <a href={`/game/${gameId}`} class="btn btn-ghost btn-block">Cancel</a>
          </div>
        </div>
      </aside>
    </form>
  {/if}
</main>

<style>
  /* Content : side panel = φ : 1 */
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1.618fr) minmax(260px, 1fr);
    gap: var(--sp-6);
    align-items: start;
    max-width: 1220px;
  }
  .side {
    position: sticky;
    top: calc(var(--sp-7) + var(--sp-5));
  }
  .title-input { font-size: var(--fs-md); font-weight: 600; min-height: var(--control-h-lg); }

  fieldset { margin: 0; padding: 0; border: none; min-width: 0; }
  legend { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); padding: 0; }
  /* Scroll inside each group so a long campaign doesn't produce a page of chips (233px = Fibonacci) */
  .pick-list { position: relative; display: flex; flex-wrap: wrap; align-content: flex-start; gap: var(--sp-2); max-height: 233px; overflow-y: auto; padding: 2px; scrollbar-width: thin; }
  legend .faint { margin-left: var(--sp-2); font-weight: 500; }
  .pick-chip {
    padding: var(--sp-1) var(--sp-4);
    border: 1px solid var(--border-strong);
    border-radius: var(--r-pill);
    font-size: var(--fs-xs);
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
    transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  }
  .pick-chip:hover { border-color: var(--type-color); color: var(--text); }
  .pick-chip.on {
    background: color-mix(in srgb, var(--type-color) 18%, transparent);
    border-color: var(--type-color);
    color: var(--text);
  }
  .pick-chip:has(input:focus-visible) { outline: 2px solid var(--primary-text); outline-offset: 2px; }

  .more-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .more-toggle svg { color: var(--text-muted); transition: transform 0.15s; flex: none; }
  .more-toggle svg.flipped { transform: rotate(180deg); }
  .more-fields { margin-top: var(--sp-5); }
  .field.wide { grid-column: 1 / -1; }

  .status { display: flex; flex-direction: column; gap: var(--sp-2); }
  .status-opt {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    border: 1px solid var(--border-strong);
    border-radius: var(--r-md);
    cursor: pointer;
  }
  .status-opt > span:last-child { display: flex; flex-direction: column; }
  .status-opt.on { border-color: var(--primary-text); background: var(--primary-soft); }
  .status-opt:has(input:focus-visible) { outline: 2px solid var(--primary-text); outline-offset: 2px; }
  .status-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--text-faint); flex: none; }
  .status-dot.upcoming { background: var(--primary-text); }
  .range { width: 100%; accent-color: var(--primary); }

  @media (max-width: 987px) {
    .layout { grid-template-columns: 1fr; }
    .side { position: static; }
  }
</style>
