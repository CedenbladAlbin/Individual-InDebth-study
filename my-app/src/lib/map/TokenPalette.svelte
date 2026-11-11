<script lang="ts" context="module">
  import type { TokenKind } from './types';
  /** What gets created when a palette entry is clicked or dropped */
  export type TokenTemplate = {
    kind: TokenKind;
    label: string;
    refId?: string | null;
    color?: string;
    icon?: string | null;
    maxHp?: number | null;
    count?: number;
  };
</script>

<script lang="ts">
  import { KIND_COLORS, MARKERS } from './types';
  import type { Token } from './types';

  export let players: any[] = [];
  /** NPCs linked to this scene */
  export let sceneNpcs: any[] = [];
  /** Every other NPC in the game */
  export let otherNpcs: any[] = [];
  /** The scene's group or location, used to suggest NPCs from the same area */
  export let sceneGroup = '';
  export let tokens: Token[] = [];
  export let onAdd: (tpl: TokenTemplate) => void;
  /** Called when an entity that is already on the map is clicked */
  export let onFocus: (tokenId: string) => void;

  const SUGGEST_LIMIT = 8;
  const SEARCH_LIMIT = 20;

  let creatureName = '';
  let creatureKind: TokenKind = 'enemy';
  let creatureCount = 1;
  let creatureHp: number | null = null;
  let npcQuery = '';
  let showAllRegion = false;

  const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();
  /** Not-yet-placed first, then alphabetical */
  const placeOrder = (list: any[], placed: Map<string, string>) =>
    [...list].sort((a, b) => Number(placed.has(a._id)) - Number(placed.has(b._id)) || a.name.localeCompare(b.name, undefined, { numeric: true }));

  $: onMap = new Map(tokens.filter((t) => t.refId).map((t) => [t.refId as string, t.id]));

  // When players are split into groups (e.g. "Current party" / "Retired & fallen"),
  // show the largest group and tuck the others away
  let showOtherPlayers = false;
  $: playerGroups = [...players.reduce((m: Map<string, any[]>, p) => m.set(norm(p.group), [...(m.get(norm(p.group)) ?? []), p]), new Map()).values()]
    .sort((a, b) => b.length - a.length);
  $: mainPlayers = playerGroups.length > 1 ? playerGroups[0] : players;
  $: otherPlayers = playerGroups.length > 1 ? playerGroups.slice(1).flat() : [];
  $: otherPlayersLabel = [...new Set(otherPlayers.map((p) => p.group || 'No group'))].join(', ');
  $: visiblePlayers = showOtherPlayers ? [...mainPlayers, ...otherPlayers] : [...mainPlayers, ...otherPlayers.filter((p) => onMap.has(p._id))];
  $: missingPlayers = mainPlayers.filter((p: any) => !onMap.has(p._id));

  $: sceneList = placeOrder(sceneNpcs, onMap);
  $: missingSceneNpcs = sceneNpcs.filter((n) => !onMap.has(n._id));

  // Suggestions: NPCs whose group or location matches the scene's group/location
  $: area = norm(sceneGroup);
  $: region = area ? otherNpcs.filter((n) => norm(n.group) === area || norm(n.location) === area) : [];
  $: regionList = placeOrder(region, onMap);
  $: regionShown = showAllRegion ? regionList : regionList.slice(0, SUGGEST_LIMIT);
  // NPCs from elsewhere that were put on this map, so they're easy to find again
  $: regionIds = new Set(region.map((n) => n._id));
  $: visitors = otherNpcs.filter((n) => onMap.has(n._id) && !regionIds.has(n._id));

  $: q = norm(npcQuery);
  $: searchAll = q
    ? [...sceneNpcs, ...otherNpcs].filter((n) => [n.name, n.group, n.role].some((v) => norm(v).includes(q)))
    : [];
  $: searchResults = placeOrder(searchAll, onMap).slice(0, SEARCH_LIMIT);

  function dragStart(e: DragEvent, tpl: TokenTemplate) {
    e.dataTransfer?.setData('application/x-map-token', JSON.stringify(tpl));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
  }

  function entityTemplate(kind: 'player' | 'npc', entity: any): TokenTemplate {
    return { kind, label: entity.name, refId: entity._id, color: KIND_COLORS[kind] };
  }

  function clickEntity(kind: 'player' | 'npc', entity: any) {
    const existing = onMap.get(entity._id);
    if (existing) onFocus(existing);
    else onAdd(entityTemplate(kind, entity));
  }

  function markerTemplate(m: { icon: string; label: string; color: string }): TokenTemplate {
    return { kind: 'marker', label: m.label, icon: m.icon, color: m.color };
  }

  function addCreature() {
    if (!creatureName.trim()) return;
    onAdd({
      kind: creatureKind,
      label: creatureName.trim(),
      color: KIND_COLORS[creatureKind],
      maxHp: creatureHp && creatureHp > 0 ? Math.round(creatureHp) : null,
      count: Math.min(20, Math.max(1, Math.round(creatureCount || 1)))
    });
    creatureName = '';
  }

  $: creatureTemplate = {
    kind: creatureKind,
    label: creatureName.trim() || 'Creature',
    color: KIND_COLORS[creatureKind],
    maxHp: creatureHp && creatureHp > 0 ? Math.round(creatureHp) : null,
    count: Math.min(20, Math.max(1, Math.round(creatureCount || 1)))
  } as TokenTemplate;

  const tip = (placed: boolean) => (placed ? 'On the map: click to find it' : 'Click or drag to add');
</script>

<div class="palette stack-lg">
  <p class="hint">Click to add to the centre of the view, or drag onto the map. ✓ means it's already on the map.</p>

  <!-- Players -->
  <section class="stack" data-type="player">
    <div class="section-head">
      <h4 class="eyebrow"><span class="dot"></span> Players</h4>
      {#if missingPlayers.length > 1}
        <button class="btn btn-ghost btn-sm" on:click={() => missingPlayers.forEach((p: any) => onAdd(entityTemplate('player', p)))}>Add all {missingPlayers.length}</button>
      {/if}
    </div>
    {#if players.length === 0}
      <p class="faint small">No players in this game yet.</p>
    {:else}
      <div class="entries">
        {#each placeOrder(visiblePlayers, onMap) as p (p._id)}
          <button class="entry" class:on-map={onMap.has(p._id)} style="--c: {KIND_COLORS.player}" draggable={!onMap.has(p._id)}
            on:dragstart={(e) => dragStart(e, entityTemplate('player', p))} on:click={() => clickEntity('player', p)} title={tip(onMap.has(p._id))}>
            <span class="swatch"></span>{p.name}{#if onMap.has(p._id)}<span class="check" aria-label="on map">✓</span>{/if}
          </button>
        {/each}
      </div>
      {#if otherPlayers.length && !showOtherPlayers}
        <button class="btn btn-ghost btn-sm more" on:click={() => (showOtherPlayers = true)}>Show {otherPlayersLabel} · {otherPlayers.length}</button>
      {/if}
    {/if}
  </section>

  <!-- NPCs linked to this scene -->
  <section class="stack" data-type="npc">
    <div class="section-head">
      <h4 class="eyebrow"><span class="dot"></span> NPCs in this scene <span class="faint count">{sceneNpcs.length}</span></h4>
      {#if missingSceneNpcs.length > 1}
        <button class="btn btn-ghost btn-sm" on:click={() => missingSceneNpcs.forEach((n) => onAdd(entityTemplate('npc', n)))}>Add all {missingSceneNpcs.length}</button>
      {/if}
    </div>
    {#if sceneList.length === 0}
      <p class="faint small">No NPCs are linked to this scene. Link them from the scene's details on the game page, or find one below.</p>
    {:else}
      <div class="entries">
        {#each sceneList as n (n._id)}
          <button class="entry" class:on-map={onMap.has(n._id)} style="--c: {KIND_COLORS.npc}" draggable={!onMap.has(n._id)}
            on:dragstart={(e) => dragStart(e, entityTemplate('npc', n))} on:click={() => clickEntity('npc', n)} title={tip(onMap.has(n._id))}>
            <span class="swatch"></span>{n.name}{#if onMap.has(n._id)}<span class="check" aria-label="on map">✓</span>{/if}
          </button>
        {/each}
      </div>
    {/if}
    {#if visitors.length}
      <span class="sub faint small">Also on the map</span>
      <div class="entries">
        {#each visitors as n (n._id)}
          <button class="entry on-map" style="--c: {KIND_COLORS.npc}" on:click={() => clickEntity('npc', n)} title={tip(true)}>
            <span class="swatch"></span>{n.name}<span class="check" aria-label="on map">✓</span>
          </button>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Quick creature -->
  <form class="creature card" on:submit|preventDefault={addCreature}>
    <div class="kind-switch" role="radiogroup" aria-label="Creature type">
      {#each [['enemy', 'Enemy'], ['ally', 'Ally'], ['neutral', 'Neutral']] as [k, label]}
        <button
          type="button"
          role="radio"
          aria-checked={creatureKind === k}
          class="kind-opt"
          style="--c: {KIND_COLORS[k as TokenKind]}"
          on:click={() => (creatureKind = k as TokenKind)}
        >{label}</button>
      {/each}
    </div>
    <input class="input" type="text" placeholder="Name, e.g. Goblin" maxlength="50" bind:value={creatureName} />
    <div class="creature-row">
      <label class="field">
        <span class="field-label">Count</span>
        <input class="input" type="number" min="1" max="20" bind:value={creatureCount} />
      </label>
      <label class="field">
        <span class="field-label">HP <span class="faint">(opt.)</span></span>
        <input class="input" type="number" min="0" placeholder="–" bind:value={creatureHp} />
      </label>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <button
        type="submit"
        class="btn btn-primary add-creature"
        disabled={!creatureName.trim()}
        draggable={!!creatureName.trim()}
        on:dragstart={(e) => dragStart(e, creatureTemplate)}
      >
        Add{creatureCount > 1 ? ` ${Math.min(20, creatureCount)}` : ''}
      </button>
    </div>
  </form>

  <!-- Other NPCs: suggestions from the same area + search -->
  {#if otherNpcs.length}
    <section class="stack" data-type="npc">
      <h4 class="eyebrow"><span class="dot"></span> Other NPCs</h4>
      <input class="input" type="search" placeholder={`Find any of ${otherNpcs.length + sceneNpcs.length} NPCs by name, group or role…`} bind:value={npcQuery} aria-label="Find an NPC" />

      {#if q}
        {#if searchResults.length === 0}
          <p class="faint small">No NPC matches "{npcQuery}".</p>
        {:else}
          <ul class="results">
            {#each searchResults as n (n._id)}
              <li>
                <button class="result" class:on-map={onMap.has(n._id)} style="--c: {KIND_COLORS.npc}" draggable={!onMap.has(n._id)}
                  on:dragstart={(e) => dragStart(e, entityTemplate('npc', n))} on:click={() => clickEntity('npc', n)} title={tip(onMap.has(n._id))}>
                  <span class="swatch"></span>
                  <span class="name">{n.name}</span>
                  {#if n.group}<span class="badge">{n.group}</span>{/if}
                  {#if onMap.has(n._id)}<span class="check" aria-label="on map">✓</span>{/if}
                </button>
              </li>
            {/each}
          </ul>
          {#if searchAll.length > SEARCH_LIMIT}<p class="faint small">Showing {SEARCH_LIMIT} of {searchAll.length}. Keep typing to narrow down.</p>{/if}
        {/if}
      {:else if regionList.length}
        <span class="sub faint small">From {sceneGroup} · {regionList.length}</span>
        <div class="entries">
          {#each regionShown as n (n._id)}
            <button class="entry" class:on-map={onMap.has(n._id)} style="--c: {KIND_COLORS.npc}" draggable={!onMap.has(n._id)}
              on:dragstart={(e) => dragStart(e, entityTemplate('npc', n))} on:click={() => clickEntity('npc', n)} title={tip(onMap.has(n._id))}>
              <span class="swatch"></span>{n.name}{#if onMap.has(n._id)}<span class="check" aria-label="on map">✓</span>{/if}
            </button>
          {/each}
        </div>
        {#if regionList.length > SUGGEST_LIMIT && !showAllRegion}
          <button class="btn btn-ghost btn-sm more" on:click={() => (showAllRegion = true)}>Show all {regionList.length}</button>
        {/if}
      {/if}
    </section>
  {/if}

  <!-- Markers -->
  <section class="stack">
    <h4 class="eyebrow">Markers</h4>
    <div class="markers">
      {#each MARKERS as m}
        {@const tpl = markerTemplate(m)}
        <button class="marker" draggable="true" on:dragstart={(e) => dragStart(e, tpl)} on:click={() => onAdd(tpl)} title={m.label}>
          <img src="/assets/markers/{m.icon}.svg" alt="" width="21" height="21" />
          <span>{m.label}</span>
        </button>
      {/each}
    </div>
  </section>
</div>

<style>
  .creature {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-4);
    background: var(--surface-2);
  }
  .kind-switch {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--sp-1);
    padding: var(--sp-1);
    border-radius: var(--r-md);
    background: var(--bg);
  }
  .kind-opt {
    padding: var(--sp-2);
    border: none;
    border-radius: var(--r-sm);
    background: none;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    font-weight: 650;
    cursor: pointer;
  }
  .kind-opt[aria-checked='true'] {
    background: color-mix(in srgb, var(--c) 22%, transparent);
    color: var(--text);
    box-shadow: inset 0 0 0 1px var(--c);
  }
  .creature-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: var(--sp-3);
    align-items: end;
  }
  .add-creature { min-width: 72px; }
  .section-head { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); }
  .eyebrow { display: flex; align-items: center; gap: var(--sp-2); }
  .count { font-weight: 500; }
  .sub { margin-top: calc(-1 * var(--sp-1)); }
  .entries { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
  .entry {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--r-pill);
    background: var(--surface-2);
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: grab;
  }
  .entry:hover, .result:hover { border-color: var(--c); }
  .entry.on-map { cursor: pointer; color: var(--text-muted); background: transparent; border-style: dashed; }
  .swatch { width: 10px; height: 10px; flex: none; border-radius: 50%; background: var(--c); }
  .check { color: var(--success-text); }
  .results { display: flex; flex-direction: column; gap: var(--sp-1); margin: 0; padding: 0; list-style: none; max-height: 233px; overflow-y: auto; }
  .result {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--sp-3);
    width: 100%;
    padding: var(--sp-2) var(--sp-3);
    border: 1px solid transparent;
    border-radius: var(--r-md);
    background: none;
    font-size: var(--fs-xs);
    text-align: left;
    cursor: grab;
  }
  .result .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .result.on-map { color: var(--text-muted); cursor: pointer; }
  .more { align-self: flex-start; }
  .markers { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-2); }
  .marker {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-3) var(--sp-2);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface-2);
    font-size: var(--fs-xs);
    color: var(--text-muted);
    cursor: grab;
  }
  .marker:hover { border-color: var(--border-strong); color: var(--text); }
</style>
