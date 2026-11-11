<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { sortByDate, formatSessionDate, sessionYear, sessionMatches } from '$lib/sessions';

  export let sessions: any[] = [];
  export let selectedSessionId: string = '';
  const dispatch = createEventDispatcher();

  const PAGE = 8;
  let query = '';
  let openYears = new Set<number>();
  let expanded = new Set<string>();
  let initialised = false;

  $: upcoming = sortByDate(sessions.filter((s) => !s.isEnded), 'asc');
  $: history = sortByDate(sessions.filter((s) => s.isEnded), 'desc');
  $: years = [...new Set(history.map(sessionYear))];
  // Open the most recent year the first time sessions arrive
  $: if (!initialised && years.length) {
    openYears = new Set([years[0]]);
    initialised = true;
  }
  $: results = query.trim() ? sortByDate(sessions.filter((s) => sessionMatches(s, query)), 'desc') : [];

  function toggleYear(y: number) {
    openYears.has(y) ? openYears.delete(y) : openYears.add(y);
    openYears = openYears;
  }
  function showAll(key: string) {
    expanded.add(key);
    expanded = expanded;
  }
  // `open` is passed in (not read from `expanded` inside) so the markup re-renders when it changes
  const visible = (key: string, list: any[], open: Set<string>) => (open.has(key) ? list : list.slice(0, PAGE));
</script>

<div class="sessions card">
  <div class="sessions-head">
    <h2>Sessions <span class="faint count">{sessions.length}</span></h2>
    <button class="btn btn-primary btn-sm" on:click={() => dispatch('createSession')}>+ New session</button>
  </div>

  {#if sessions.length > 5}
    <input class="input search" type="search" placeholder="Search sessions and notes…" bind:value={query} aria-label="Search sessions" />
  {/if}

  {#if query.trim()}
    <section class="group">
      <h3 class="eyebrow">{results.length} {results.length === 1 ? 'match' : 'matches'}</h3>
      {#if results.length === 0}
        <p class="faint small">Nothing matches "{query}".</p>
      {:else}
        <ul>
          {#each visible('search', results, expanded) as session (session._id)}
            {@const s = session}
            <li>
              <button type="button" class="session" class:selected={selectedSessionId === s._id} on:click={() => dispatch('selectSession', s)}>
                <span class="status" class:ended={s.isEnded} aria-hidden="true"></span>
                <span class="title">{s.title}</span>
                <span class="date faint">{formatSessionDate(s)}</span>
              </button>
            </li>
          {/each}
        </ul>
        {#if results.length > PAGE && !expanded.has('search')}
          <button class="btn btn-ghost btn-sm more" on:click={() => showAll('search')}>Show all {results.length}</button>
        {/if}
      {/if}
    </section>
  {:else}
    <section class="group">
      <h3 class="eyebrow">Upcoming <span class="count">{upcoming.length}</span></h3>
      {#if upcoming.length === 0}
        <p class="faint small">Nothing planned yet.</p>
      {:else}
        <ul>
          {#each upcoming as s (s._id)}
            <li>
              <button type="button" class="session" class:selected={selectedSessionId === s._id} aria-current={selectedSessionId === s._id ? 'true' : undefined} on:click={() => dispatch('selectSession', s)}>
                <span class="status" aria-hidden="true"></span>
                <span class="title">{s.title}</span>
                <span class="date faint">{formatSessionDate(s, true)}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="group">
      <h3 class="eyebrow">History <span class="count">{history.length}</span></h3>
      {#if history.length === 0}
        <p class="faint small">No finished sessions yet.</p>
      {/if}
      {#each years as year (year)}
        {@const list = history.filter((s) => sessionYear(s) === year)}
        {@const key = `y${year}`}
        <div class="year">
          {#if years.length > 1}
            <button class="year-toggle" aria-expanded={openYears.has(year)} on:click={() => toggleYear(year)}>
              <span class="chev" class:open={openYears.has(year)}>▸</span>
              <span>{year}</span>
              <span class="faint small">{list.length} {list.length === 1 ? 'session' : 'sessions'}</span>
            </button>
          {/if}
          {#if openYears.has(year) || years.length === 1}
            <ul>
              {#each visible(key, list, expanded) as s (s._id)}
                <li>
                  <button type="button" class="session" class:selected={selectedSessionId === s._id} aria-current={selectedSessionId === s._id ? 'true' : undefined} on:click={() => dispatch('selectSession', s)}>
                    <span class="status ended" aria-hidden="true"></span>
                    <span class="title">{s.title}</span>
                    <span class="date faint">{formatSessionDate(s, true)}</span>
                  </button>
                </li>
              {/each}
            </ul>
            {#if list.length > PAGE && !expanded.has(key)}
              <button class="btn btn-ghost btn-sm more" on:click={() => showAll(key)}>Show all {list.length}</button>
            {/if}
          {/if}
        </div>
      {/each}
    </section>
  {/if}
</div>

<style>
  .sessions {
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
    padding: var(--sp-4);
  }
  .sessions-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
  }
  .sessions-head h2 { font-size: var(--fs-base); }
  .search { margin-top: calc(-1 * var(--sp-2)); }
  .group { display: flex; flex-direction: column; gap: var(--sp-3); }
  .count { margin-left: var(--sp-2); color: var(--text-faint); }
  ul {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .session {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--sp-3);
    width: 100%;
    padding: var(--sp-2) var(--sp-3);
    border: 1px solid transparent;
    border-radius: var(--r-md);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .session:hover { background: var(--surface-2); }
  .session.selected {
    background: var(--primary-soft);
    border-color: rgba(124, 92, 255, 0.35);
  }
  .status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary-text);
  }
  .status.ended { background: var(--text-faint); }
  .title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .date { font-size: var(--fs-xs); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .year { display: flex; flex-direction: column; gap: var(--sp-2); }
  .year-toggle {
    display: flex;
    align-items: baseline;
    gap: var(--sp-3);
    padding: var(--sp-1) 0;
    border: none;
    background: none;
    font-weight: 650;
    text-align: left;
    cursor: pointer;
  }
  .chev { display: inline-block; width: 1em; color: var(--text-muted); transition: transform 0.15s; }
  .chev.open { transform: rotate(90deg); }
  .more { align-self: flex-start; }
</style>
