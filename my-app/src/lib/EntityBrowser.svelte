<script lang="ts">
  import { onMount } from 'svelte';
  import EntityCardList from '$lib/EntityCardList.svelte';
  import Modal from '$lib/Modal.svelte';
  import { entityMatches, idTime } from '$lib/sessions';

  type EntityType = 'scene' | 'npc' | 'player' | 'item';

  export let type: EntityType;
  export let entities: any[] = [];
  export let itemMap: Record<string, any> = {};
  export let npcMap: Record<string, any> = {};
  export let sceneMap: Record<string, any> = {};
  export let playerMap: Record<string, any> = {};
  /** Every group name used anywhere in the game, for suggestions */
  export let allGroups: string[] = [];
  /** The group filter currently shown (bound by the parent so "+ New" can default to it) */
  export let groupFilter = '';

  export let onOpen: (e: any) => void;
  export let onOpenMap: (e: any) => void = () => {};
  export let onNotes: (e: any) => void;
  export let onDelete: (e: any) => void;
  export let onCreate: () => void;
  export let onLink: (e: any) => void;
  export let onRemoveConnection: (type: string, entity: any, targetId: string) => void;
  export let onSetGroup: (ids: string[], group: string) => Promise<void>;
  export let onBulkLink: (ids: string[]) => void = () => {};
  export let onBulkDelete: (ids: string[]) => Promise<void>;

  const NONE = '__none__';
  const LABEL: Record<EntityType, { one: string; many: string; link: string }> = {
    scene: { one: 'scene', many: 'scenes', link: 'Add NPCs' },
    npc: { one: 'NPC', many: 'NPCs', link: 'Place in scene' },
    player: { one: 'player', many: 'players', link: 'Give items' },
    item: { one: 'item', many: 'items', link: 'Give / place' }
  };

  let query = '';
  let sortBy: 'newest' | 'oldest' | 'name' = 'name';
  let view: 'cards' | 'list' = 'cards';
  let collapsed = new Set<string>();
  let selected = new Set<string>();

  // Remember the preferred view per content type
  onMount(() => {
    try {
      const saved = localStorage.getItem(`view:${type}`);
      if (saved === 'cards' || saved === 'list') view = saved;
      else view = entities.length > 24 ? 'list' : 'cards';
    } catch {
      view = entities.length > 24 ? 'list' : 'cards';
    }
  });
  function setView(v: 'cards' | 'list') {
    view = v;
    selected = new Set();
    try { localStorage.setItem(`view:${type}`, v); } catch { /* ignore */ }
  }

  const groupOf = (e: any) => (e.group || '').trim();
  $: counts = entities.reduce((m: Map<string, number>, e) => m.set(groupOf(e) || NONE, (m.get(groupOf(e) || NONE) ?? 0) + 1), new Map());
  $: groupNames = [...counts.keys()].filter((g) => g !== NONE).sort((a, b) => a.localeCompare(b));
  $: hasGroups = groupNames.length > 0;
  $: if (groupFilter && groupFilter !== NONE && !counts.has(groupFilter)) groupFilter = '';

  $: filtered = sortList(
    entities.filter((e) => entityMatches(e, query) || groupOf(e).toLowerCase().includes(query.trim().toLowerCase()))
      .filter((e) => !groupFilter || (groupFilter === NONE ? !groupOf(e) : groupOf(e) === groupFilter)),
    sortBy
  );
  /** Sections: one per group when showing everything, otherwise a single flat list */
  $: sections = !hasGroups || groupFilter
    // Own key for the flat list so a collapsed section with the same group name can't hide it
    ? [{ key: `flat:${groupFilter}`, label: '', rows: filtered }]
    : [...groupNames, NONE]
        .map((g) => ({ key: g, label: g === NONE ? 'No group' : g, rows: filtered.filter((e) => (groupOf(e) || NONE) === g) }))
        .filter((s) => s.rows.length);

  function sortList(list: any[], by: typeof sortBy) {
    if (by === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const sign = by === 'newest' ? -1 : 1;
    return [...list].sort((a, b) => (idTime(a._id) - idTime(b._id)) * sign);
  }

  /** Show one group; choosing it also expands its section for when you go back to "All" */
  function showGroup(g: string) {
    groupFilter = g;
    if (collapsed.delete(g)) collapsed = collapsed;
  }

  function toggleSection(key: string) {
    collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key);
    collapsed = collapsed;
  }
  function toggleSelect(id: string) {
    selected.has(id) ? selected.delete(id) : selected.add(id);
    selected = selected;
  }
  function selectAll(rows: any[], on: boolean) {
    for (const r of rows) on ? selected.add(r._id) : selected.delete(r._id);
    selected = selected;
  }
  $: visibleIds = new Set(filtered.map((e) => e._id));
  $: if ([...selected].some((id) => !visibleIds.has(id))) selected = new Set([...selected].filter((id) => visibleIds.has(id)));

  /* ---------- Group dialog (move selection / rename group) ---------- */
  let groupDialog: { mode: 'move' | 'rename'; from?: string; value: string } | null = null;
  let busy = false;
  async function applyGroupDialog() {
    if (!groupDialog) return;
    busy = true;
    const value = groupDialog.value.trim();
    if (groupDialog.mode === 'move') {
      await onSetGroup([...selected], value);
      selected = new Set();
    } else {
      const ids = entities.filter((e) => groupOf(e) === groupDialog!.from).map((e) => e._id);
      await onSetGroup(ids, value);
      if (groupFilter === groupDialog.from) groupFilter = value;
    }
    busy = false;
    groupDialog = null;
  }
  async function deleteSelected() {
    if (!confirm(`Delete ${selected.size} ${selected.size === 1 ? LABEL[type].one : LABEL[type].many}? Their notes and links are removed too.`)) return;
    busy = true;
    await onBulkDelete([...selected]);
    selected = new Set();
    busy = false;
  }

  /* ---------- Row helpers ---------- */
  function detail(e: any): string {
    const parts =
      type === 'scene' ? [e.location, e.dangerLevel && `Danger ${e.dangerLevel}`]
      : type === 'npc' ? [e.role, e.status]
      : type === 'player' ? [e.class, e.level && `Lvl ${e.level}`]
      : [e.itemType, e.benefits];
    return parts.filter(Boolean).join(' · ');
  }
  // The maps are parameters (shadowing the props) so the row re-renders when they change
  function links(
    e: any,
    npcMap: Record<string, any>,
    itemMap: Record<string, any>,
    sceneMap: Record<string, any>,
    playerMap: Record<string, any>
  ): { type: string; text: string }[] {
    if (type === 'npc') return [
      ...(e.sceneId ? [{ type: 'scene', text: sceneMap[e.sceneId]?.name ?? 'Unknown scene' }] : []),
      ...((e.itemIds?.length ?? 0) ? [{ type: 'item', text: `${e.itemIds.length} item${e.itemIds.length === 1 ? '' : 's'}` }] : [])
    ];
    if (type === 'player') return (e.itemIds?.length ?? 0) ? [{ type: 'item', text: `${e.itemIds.length} item${e.itemIds.length === 1 ? '' : 's'}` }] : [];
    if (type === 'item') {
      if (e.ownerPlayerId) return [{ type: 'player', text: playerMap[e.ownerPlayerId]?.name ?? 'Unknown' }];
      if (e.ownerNpcId) return [{ type: 'npc', text: npcMap[e.ownerNpcId]?.name ?? 'Unknown' }];
      if (e.sceneId) return [{ type: 'scene', text: sceneMap[e.sceneId]?.name ?? 'Unknown' }];
      return [];
    }
    const npcCount = Object.values(npcMap).filter((n) => n.sceneId === e._id).length;
    const itemCount = Object.values(itemMap).filter((i) => i.sceneId === e._id).length;
    return [
      ...(npcCount ? [{ type: 'npc', text: `${npcCount} NPC${npcCount === 1 ? '' : 's'}` }] : []),
      ...(itemCount ? [{ type: 'item', text: `${itemCount} item${itemCount === 1 ? '' : 's'}` }] : [])
    ];
  }
</script>

{#if entities.length === 0}
  <EntityCardList entities={[]} {type} {onCreate} />
{:else}
  <div class="browser">
    <!-- Toolbar -->
    <div class="toolbar">
      <input class="input" type="search" placeholder={`Search ${LABEL[type].many} by name, group, role…`} bind:value={query} aria-label={`Search ${LABEL[type].many}`} />
      <select class="input sort" bind:value={sortBy} aria-label="Sort">
        <option value="name">Name A–Z</option>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
      <div class="view-toggle" role="radiogroup" aria-label="View">
        <button role="radio" aria-checked={view === 'cards'} title="Cards" on:click={() => setView('cards')}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" fill="none" stroke="currentColor" stroke-width="1.4" /></svg>
          <span>Cards</span>
        </button>
        <button role="radio" aria-checked={view === 'list'} title="List (select many)" on:click={() => setView('list')}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M2 8h12M2 13h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
          <span>List</span>
        </button>
      </div>
    </div>

    <!-- Group filter -->
    {#if hasGroups}
      <div class="groups" role="radiogroup" aria-label="Filter by group">
        <button class="gchip" role="radio" aria-checked={!groupFilter} on:click={() => (groupFilter = '')}>All <span>{entities.length}</span></button>
        {#each groupNames as g}
          <button class="gchip" role="radio" aria-checked={groupFilter === g} on:click={() => showGroup(g)}>{g} <span>{counts.get(g)}</span></button>
        {/each}
        {#if counts.get(NONE)}
          <button class="gchip none" role="radio" aria-checked={groupFilter === NONE} on:click={() => showGroup(NONE)}>No group <span>{counts.get(NONE)}</span></button>
        {/if}
      </div>
    {:else if entities.length > 8}
      <p class="hint tip">Tip: give {LABEL[type].many} a <strong>group</strong> (a city, clan, faction or region) to sort them into sections. Open one and choose Edit, or switch to List and select several at once.</p>
    {/if}

    <!-- Bulk actions -->
    {#if view === 'list' && selected.size}
      <div class="bulk" role="toolbar" aria-label="Selected">
        <strong>{selected.size} selected</strong>
        <button class="btn btn-outline btn-sm" on:click={() => (groupDialog = { mode: 'move', value: '' })}>Move to group…</button>
        {#if type === 'npc'}
          <button class="btn btn-outline btn-sm" on:click={() => onBulkLink([...selected])}>Place in scene…</button>
        {:else if type === 'item'}
          <button class="btn btn-outline btn-sm" on:click={() => onBulkLink([...selected])}>Give / place…</button>
        {/if}
        <button class="btn btn-danger btn-sm" disabled={busy} on:click={deleteSelected}>Delete</button>
        <button class="btn btn-ghost btn-sm clear" on:click={() => (selected = new Set())}>Clear</button>
      </div>
    {/if}

    {#if filtered.length === 0}
      <div class="empty-state">
        <h3>No {LABEL[type].many} match{query ? ` "${query}"` : ''}</h3>
        <button class="btn btn-ghost btn-sm" on:click={() => { query = ''; groupFilter = ''; }}>Clear filters</button>
      </div>
    {/if}

    {#each sections as section (section.key)}
      <section class="section">
        {#if section.label}
          <header class="section-head">
            <button class="section-toggle" aria-expanded={!collapsed.has(section.key)} on:click={() => toggleSection(section.key)}>
              <span class="chev" class:open={!collapsed.has(section.key)}>▸</span>
              <span class="section-name">{section.label}</span>
              <span class="faint small">{section.rows.length}</span>
            </button>
            {#if section.key !== NONE}
              <button class="btn btn-ghost btn-sm" title="Rename this group" on:click={() => (groupDialog = { mode: 'rename', from: section.key, value: section.key })}>Rename</button>
            {/if}
            <button class="btn btn-ghost btn-sm" title="Show only this group" on:click={() => showGroup(section.key)}>Only this</button>
          </header>
        {/if}

        {#if !collapsed.has(section.key)}
          {#if view === 'cards'}
            <EntityCardList
              entities={section.rows}
              {type}
              {onCreate}
              onNotes={onNotes}
              onDelete={onDelete}
              {onRemoveConnection}
              {itemMap}
              {npcMap}
              {sceneMap}
              {playerMap}
              on:entityClick={(e) => onOpen(e.detail)}
              on:openMap={(e) => onOpenMap(e.detail)}
            />
          {:else}
            <div class="table" role="table" aria-label={section.label || LABEL[type].many}>
              <div class="tr th" role="row">
                <span role="columnheader">
                  <input
                    type="checkbox"
                    aria-label="Select all in this section"
                    checked={section.rows.every((r) => selected.has(r._id))}
                    on:change={(e) => selectAll(section.rows, e.currentTarget.checked)}
                  />
                </span>
                <span role="columnheader">Name</span>
                <span role="columnheader" class="col-group">Group</span>
                <span role="columnheader" class="col-detail">Details</span>
                <span role="columnheader" class="col-links">Linked to</span>
                <span role="columnheader"></span>
              </div>
              {#each section.rows as e (e._id)}
                <div class="tr" role="row" class:selected={selected.has(e._id)} data-type={type}>
                  <span role="cell"><input type="checkbox" aria-label={`Select ${e.name}`} checked={selected.has(e._id)} on:change={() => toggleSelect(e._id)} /></span>
                  <span role="cell" class="name-cell">
                    <button class="name" on:click={() => onOpen(e)}><span class="dot"></span>{e.name}</button>
                  </span>
                  <span role="cell" class="col-group">{#if groupOf(e)}<span class="badge">{groupOf(e)}</span>{/if}</span>
                  <span role="cell" class="col-detail faint small">{detail(e)}</span>
                  <span role="cell" class="col-links">
                    {#each links(e, npcMap, itemMap, sceneMap, playerMap) as l}
                      <span class="chip" data-type={l.type}><span class="dot"></span><span class="chip-label">{l.text}</span></span>
                    {/each}
                  </span>
                  <span role="cell" class="actions">
                    {#if type === 'scene'}<button class="btn btn-ghost btn-sm" on:click={() => onOpenMap(e)}>Map</button>{/if}
                    <button class="btn btn-ghost btn-sm" on:click={() => onLink(e)}>{LABEL[type].link}</button>
                    <button class="btn btn-ghost btn-sm" on:click={() => onNotes(e)}>Notes</button>
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </section>
    {/each}
  </div>
{/if}

{#if groupDialog}
  <Modal title={groupDialog.mode === 'move' ? `Move ${selected.size} to group` : `Rename "${groupDialog.from}"`} onClose={() => (groupDialog = null)} size="sm">
    <form class="stack" on:submit|preventDefault={applyGroupDialog}>
      <label class="field">
        <span class="field-label">Group name</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input class="input" list="browser-groups" maxlength="60" placeholder="e.g. Port Varrow, Clan Ironhide" bind:value={groupDialog.value} autofocus />
        <datalist id="browser-groups">{#each allGroups as g}<option value={g}></option>{/each}</datalist>
        <span class="hint">{groupDialog.mode === 'move' ? 'Pick an existing group or type a new one. Leave empty to remove from groups.' : 'Every member of the group moves to the new name.'}</span>
      </label>
      <div class="row-end">
        <button type="button" class="btn btn-ghost" on:click={() => (groupDialog = null)}>Cancel</button>
        <button type="submit" class="btn btn-primary" disabled={busy || (groupDialog.mode === 'rename' && !groupDialog.value.trim())}>{groupDialog.mode === 'move' ? 'Move' : 'Rename'}</button>
      </div>
    </form>
  </Modal>
{/if}

<style>
  .browser { display: flex; flex-direction: column; gap: var(--sp-4); }
  /* search : sort = φ : 1 */
  .toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1.618fr) minmax(0, 1fr) auto;
    gap: var(--sp-3);
    align-items: center;
  }
  .view-toggle {
    display: flex;
    gap: var(--sp-1);
    padding: var(--sp-1);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
  }
  .view-toggle button {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-1) var(--sp-3);
    border: none;
    border-radius: var(--r-sm);
    background: none;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    font-weight: 650;
    cursor: pointer;
  }
  .view-toggle button[aria-checked='true'] { background: var(--surface-3); color: var(--text); }

  .groups { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
  .gchip {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-1) var(--sp-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--r-pill);
    background: none;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
  }
  .gchip span { color: var(--text-faint); font-variant-numeric: tabular-nums; }
  .gchip:hover { color: var(--text); }
  .gchip[aria-checked='true'] { border-color: var(--primary-text); background: var(--primary-soft); color: var(--text); }
  .gchip.none { border-style: dashed; }
  .tip { margin: 0; }

  .bulk {
    position: sticky;
    top: calc(var(--sp-7) + var(--sp-2));
    z-index: 5;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    border: 1px solid rgba(124, 92, 255, 0.45);
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--primary) 18%, var(--surface));
    box-shadow: var(--shadow-lg);
  }
  .bulk .clear { margin-left: auto; }

  .section { display: flex; flex-direction: column; gap: var(--sp-3); }
  .section-head {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding-bottom: var(--sp-2);
    border-bottom: 1px solid var(--border);
  }
  .section-toggle {
    display: flex;
    align-items: baseline;
    gap: var(--sp-3);
    margin-right: auto;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }
  .section-name { font-size: var(--fs-md); font-weight: 650; }
  .chev { display: inline-block; width: 1em; color: var(--text-muted); transition: transform 0.15s; }
  .chev.open { transform: rotate(90deg); }
  .section-head .btn { opacity: 0.7; }
  .section-head:hover .btn { opacity: 1; }

  /* List view. Name : group : details : links = 1.618 : 1 : 1 : 1 */
  .table { display: flex; flex-direction: column; }
  .tr {
    display: grid;
    grid-template-columns: 21px minmax(0, 1.618fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    border-bottom: 1px solid var(--border);
  }
  .tr:hover:not(.th) { background: var(--surface); }
  .tr.selected { background: var(--primary-soft); }
  .th {
    padding-top: 0;
    font-size: var(--fs-xs);
    font-weight: 650;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .tr input[type='checkbox'] { width: 15px; height: 15px; accent-color: var(--primary); cursor: pointer; }
  .name-cell { min-width: 0; }
  .name {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    max-width: 100%;
    padding: 0;
    border: none;
    background: none;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name:hover { color: var(--primary-text); }
  .col-detail { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .col-links { display: flex; flex-wrap: wrap; gap: var(--sp-1); min-width: 0; }
  .col-group .badge { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .actions { display: flex; gap: var(--sp-1); justify-content: flex-end; }

  @media (max-width: 987px) {
    .tr { grid-template-columns: 21px minmax(0, 1fr) auto; }
    .col-group, .col-detail, .col-links { display: none; }
    .actions .btn:not(:first-child) { display: none; }
  }
  @media (max-width: 610px) {
    .toolbar { grid-template-columns: 1fr auto; }
    .toolbar .sort { display: none; }
    .view-toggle span { display: none; }
  }
</style>
