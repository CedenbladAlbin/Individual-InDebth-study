<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
  import { api } from '$lib/api';
  import BattleMap from '$lib/map/BattleMap.svelte';
  import TokenPalette, { type TokenTemplate } from '$lib/map/TokenPalette.svelte';
  import TokenInspector from '$lib/map/TokenInspector.svelte';
  import TurnTracker, { stepTurn } from '$lib/map/TurnTracker.svelte';
  import GridSettings from '$lib/map/GridSettings.svelte';
  import { freeSpotNear, snapPoint } from '$lib/map/grid';
  import {
    emptyMapState, newId, KIND_COLORS, DRAW_COLORS, DRAW_WIDTHS,
    type MapState, type Tool, type Token, type TokenKind
  } from '$lib/map/types';

  export let scene: any;
  /** NPCs and items linked to this scene on the game page */
  export let npcs: any[] = [];
  export let items: any[] = [];
  export let players: any[] = [];
  /** Every NPC in the game, so NPCs from other scenes can be put on the map too */
  export let allNpcs: any[] = [];

  const dispatch = createEventDispatcher();
  const mapUrl = () => `/api/scenes/${scene._id}/map`;
  const DEFAULT_WORLD = { w: 1618, h: 1000 };

  /* ---------- State ---------- */
  let state: MapState | null = null;
  let world = DEFAULT_WORLD;
  let imageUrl: string | null = null;
  let loading = true;
  let loadError = '';

  let tool: Tool = 'select';
  let drawColor = DRAW_COLORS[0];
  let drawWidth = DRAW_WIDTHS[1];
  let selectedId: string | null = null;
  let panelTab: 'tokens' | 'turns' | 'grid' | 'scene' = 'tokens';
  let panelOpen = true;
  let zoom = 100;
  let map: BattleMap;

  $: selected = state?.tokens.find((t) => t.id === selectedId) ?? null;
  $: sceneNpcIds = new Set(npcs.map((n) => n._id));
  $: otherNpcs = allNpcs.filter((n) => !sceneNpcIds.has(n._id));
  $: currentTurn = state?.combat.active ? state.tokens.find((t) => t.id === state?.combat.turnTokenId) ?? null : null;

  /* ---------- Undo / redo ---------- */
  let committed = '';
  let undoStack: string[] = [];
  let redoStack: string[] = [];

  function update(fn: (s: MapState) => void, commit = true) {
    if (!state) return;
    fn(state);
    state = state;
    if (commit) {
      const snap = JSON.stringify(state);
      if (snap !== committed) {
        undoStack = [...undoStack.slice(-99), committed];
        redoStack = [];
        committed = snap;
      }
      scheduleSave();
    }
  }
  function restore(snap: string) {
    state = JSON.parse(snap);
    if (selectedId && !state?.tokens.some((t) => t.id === selectedId)) selectedId = null;
    scheduleSave();
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack = [...redoStack, committed];
    committed = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    restore(committed);
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack = [...undoStack, committed];
    committed = redoStack[redoStack.length - 1];
    redoStack = redoStack.slice(0, -1);
    restore(committed);
  }

  /* ---------- Saving ---------- */
  let saveStatus: 'saved' | 'pending' | 'saving' | 'error' = 'saved';
  let lastSaved = '';
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | null = null;

  function scheduleSave() {
    saveStatus = 'pending';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 700);
  }
  async function save(): Promise<void> {
    clearTimeout(saveTimer);
    if (!state) return;
    if (inFlight) await inFlight;
    const body = JSON.stringify(state);
    if (body === lastSaved) {
      saveStatus = 'saved';
      return;
    }
    saveStatus = 'saving';
    inFlight = (async () => {
      try {
        const res = await api(mapUrl(), { method: 'PUT', body: JSON.stringify({ state: JSON.parse(body) }) });
        if (res.ok) {
          lastSaved = body;
          saveStatus = JSON.stringify(state) === lastSaved ? 'saved' : 'pending';
        } else {
          saveStatus = 'error';
        }
      } catch {
        saveStatus = 'error';
      }
    })();
    await inFlight;
    inFlight = null;
  }
  const hasUnsaved = () => !!state && JSON.stringify(state) !== lastSaved;

  async function close() {
    if (hasUnsaved()) {
      await save();
      if (saveStatus === 'error' && !confirm('Your latest map changes could not be saved. Close anyway?')) return;
    }
    dispatch('close');
  }

  /* ---------- Loading ---------- */
  async function loadImage() {
    const res = await api(`/api/scenes/${scene._id}/image`);
    if (!res.ok) {
      imageUrl = null;
      return DEFAULT_WORLD;
    }
    const url = URL.createObjectURL(await res.blob());
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || DEFAULT_WORLD.w, h: img.naturalHeight || DEFAULT_WORLD.h });
      img.onerror = () => resolve(DEFAULT_WORLD);
      img.src = url;
    });
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = url;
    return dims;
  }

  onMount(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (window.innerWidth < 987) panelOpen = false;

    (async () => {
      try {
        const [dims, mapRes] = await Promise.all([loadImage(), api(mapUrl())]);
        world = dims;
        if (!mapRes.ok) throw new Error();
        const data = await mapRes.json();
        state = data.state ?? emptyMapState(Math.round((world.w / 30) * 10) / 10);
        committed = lastSaved = JSON.stringify(state);
      } catch {
        loadError = 'Could not load the map. Close the scene and try again.';
      }
      loading = false;
    })();

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved()) e.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('beforeunload', beforeUnload);
    };
  });
  onDestroy(() => {
    clearTimeout(saveTimer);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  });

  /* ---------- Tokens ---------- */
  function nextNumber(s: MapState, base: string) {
    const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: (\\d+))?$`, 'i');
    let max = 0;
    for (const t of s.tokens) {
      const m = t.label.match(re);
      if (m) max = Math.max(max, m[1] ? Number(m[1]) : 1);
    }
    return max;
  }

  function addFromTemplate(tpl: TokenTemplate, at?: { x: number; y: number }) {
    if (!state) return;
    // An entity that is already on the map is moved instead of duplicated
    if (tpl.refId) {
      const existing = state.tokens.find((t) => t.refId === tpl.refId);
      if (existing) {
        if (at) update((s) => { const t = s.tokens.find((t) => t.id === existing.id); if (t) Object.assign(t, snapPoint(s.grid, at, t.size)); });
        focusToken(existing.id);
        return;
      }
    }
    const count = Math.max(1, Math.min(20, tpl.count ?? 1));
    const origin = at ?? map.viewCenter();
    let lastId = '';
    update((s) => {
      const numbered = !tpl.refId && tpl.kind !== 'marker';
      let n = numbered ? nextNumber(s, tpl.label) : 0;
      // Rename a lone "Goblin" to "Goblin 1" when more goblins join
      if (numbered && n >= 1) {
        const lone = s.tokens.find((t) => !t.refId && t.label.toLowerCase() === tpl.label.toLowerCase());
        if (lone) lone.label = `${tpl.label} 1`;
      }
      for (let i = 0; i < count; i++) {
        const pos = freeSpotNear(s.grid, origin, s.tokens, 1);
        const token: Token = {
          id: newId(),
          kind: tpl.kind,
          refId: tpl.refId ?? null,
          label: numbered && (count > 1 || n > 0) ? `${tpl.label} ${++n}` : tpl.label,
          color: tpl.color ?? KIND_COLORS[tpl.kind],
          icon: tpl.icon ?? null,
          x: pos.x,
          y: pos.y,
          size: tpl.kind === 'marker' ? 0.5 : 1,
          hp: tpl.maxHp ?? null,
          maxHp: tpl.maxHp ?? null,
          initiative: null,
          conditions: []
        };
        s.tokens.push(token);
        lastId = token.id;
      }
    });
    selectedId = lastId;
    tool = 'select';
  }

  function onDropTemplate(data: string, x: number, y: number) {
    try {
      const tpl = JSON.parse(data);
      const kinds: TokenKind[] = ['player', 'npc', 'enemy', 'ally', 'neutral', 'marker'];
      if (!tpl || !kinds.includes(tpl.kind) || typeof tpl.label !== 'string') return;
      addFromTemplate(tpl, { x, y });
    } catch {
      // ignore drops that aren't ours
    }
  }

  function focusToken(id: string) {
    const t = state?.tokens.find((t) => t.id === id);
    if (!t) return;
    selectedId = id;
    map?.centerOn(t.x, t.y);
    if (panelTab === 'grid' || panelTab === 'scene') panelTab = 'tokens';
  }

  function selectToken(id: string | null) {
    selectedId = id;
    if (id && (panelTab === 'grid' || panelTab === 'scene')) panelTab = 'tokens';
  }

  function updateSelected(fn: (t: Token) => void, commit = true) {
    update((s) => {
      const t = s.tokens.find((t) => t.id === selectedId);
      if (t) fn(t);
    }, commit);
  }

  function removeToken(id: string) {
    update((s) => {
      s.tokens = s.tokens.filter((t) => t.id !== id);
      if (s.combat.turnTokenId === id) s.combat.turnTokenId = null;
    });
    if (selectedId === id) selectedId = null;
  }

  // Keep the token whose turn it is in view
  let lastTurnId: string | null = null;
  $: if (state && state.combat.turnTokenId !== lastTurnId) {
    lastTurnId = state.combat.turnTokenId;
    const t = state.tokens.find((t) => t.id === lastTurnId);
    if (t && map && !map.isVisible(t.x, t.y)) map.centerOn(t.x, t.y);
  }

  function clearDrawings() {
    if (!state?.strokes.length || !confirm('Remove all drawings from this map?')) return;
    update((s) => { s.strokes = []; });
  }

  /* ---------- Keyboard ---------- */
  function onKeydown(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    const mod = e.ctrlKey || e.metaKey;

    if (e.key === 'Escape') {
      if (typing) { el.blur(); return; }
      if (selectedId) selectedId = null;
      else if (tool !== 'select') { tool = 'select'; map?.clearRuler(); }
      else close();
      return;
    }
    if (typing || !state) return;

    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod) return;

    const key = e.key.toLowerCase();
    if (key === 'v') tool = 'select';
    else if (key === 'b') tool = 'draw';
    else if (key === 'e') tool = 'erase';
    else if (key === 'r') tool = 'ruler';
    else if (key === 'n' && state.combat.active) update((s) => stepTurn(s, 1));
    else if (key === '+' || key === '=') map?.zoomBy(1.25);
    else if (key === '-') map?.zoomBy(0.8);
    else if (key === '0') map?.fit();
    else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); removeToken(selectedId); }
    else if (e.key.startsWith('Arrow') && selected) {
      e.preventDefault();
      const step = e.shiftKey ? state.grid.size / 5 : state.grid.size;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      updateSelected((t) => {
        const moved = { x: t.x + dx, y: t.y + dy };
        Object.assign(t, e.shiftKey ? moved : snapPoint(state!.grid, moved, t.size));
      });
    }
  }

  /* ---------- Scene contents & image ---------- */
  async function disconnect(kind: 'npc' | 'item', entity: any) {
    const res = await api('/api/game-content/disconnect', {
      method: 'POST',
      body: JSON.stringify({ type: kind === 'npc' ? 'npc-scene' : 'item-scene', fromId: entity._id })
    });
    if (!res.ok) {
      alert(`Failed to remove ${kind === 'npc' ? 'NPC' : 'item'} from scene.`);
      return;
    }
    if (kind === 'npc') npcs = npcs.filter((n) => n._id !== entity._id);
    else items = items.filter((i) => i._id !== entity._id);
    dispatch('changed');
  }

  let fileInput: HTMLInputElement;
  let uploadingImage = false;
  let uploadError = '';
  async function onImageSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploadingImage = true;
    uploadError = '';
    const formData = new FormData();
    formData.append('image', file);
    const res = await api(`/api/scenes/${scene._id}/image`, { method: 'POST', body: formData });
    if (res.ok) {
      world = await loadImage();
      await tick();
      map?.fit();
    } else {
      uploadError = (await res.json().catch(() => ({}))).message || 'Failed to upload image.';
    }
    uploadingImage = false;
    input.value = '';
  }

  const TOOLS: { id: Tool; label: string; key: string; icon: string }[] = [
    { id: 'select', label: 'Move', key: 'V', icon: 'M6 3l12 7.5-5.2 1.3L10 17.5z' },
    { id: 'draw', label: 'Draw', key: 'B', icon: 'M4 20l1-4L16.5 4.5l3 3L8 19zM14 7l3 3' },
    { id: 'erase', label: 'Erase', key: 'E', icon: 'M15 4l5 5-9 9H6l-3-3zM9 9l6 6M6 18h14' },
    { id: 'ruler', label: 'Measure', key: 'R', icon: 'M3 16L16 3l5 5L8 21zM7 12l2 2M10 9l2 2M13 6l2 2' }
  ];
  const SAVE_TEXT = { saved: 'Saved', pending: 'Unsaved changes', saving: 'Saving…', error: 'Save failed. Retrying on next change' };
</script>

<svelte:window on:keydown={onKeydown} />

<div class="scene-view" role="dialog" aria-modal="true" aria-label={`Scene: ${scene?.name}`}>
  <!-- Top bar -->
  <header class="bar">
    <button class="btn btn-ghost btn-sm" on:click={close}>← Back</button>
    <div class="title" data-type="scene">
      <span class="dot"></span>
      <h2 title={scene?.name}>{scene?.name}</h2>
      {#if scene?.location}<span class="badge hide-sm">{scene.location}</span>{/if}
    </div>
    <span class="save {saveStatus}" title={SAVE_TEXT[saveStatus]} aria-live="polite">
      <span class="save-dot"></span><span class="hide-sm">{SAVE_TEXT[saveStatus]}</span>
    </span>
    <div class="group">
      <button class="btn btn-ghost btn-icon btn-sm" disabled={!undoStack.length} on:click={undo} title="Undo (Ctrl+Z)" aria-label="Undo">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4L2.5 7.5 6 11M3 7.5h6.5a4 4 0 010 8H8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <button class="btn btn-ghost btn-icon btn-sm" disabled={!redoStack.length} on:click={redo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 4l3.5 3.5L10 11M13 7.5H6.5a4 4 0 000 8H8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </div>
    <div class="group zoom">
      <button class="btn btn-ghost btn-icon btn-sm" on:click={() => map?.zoomBy(0.8)} aria-label="Zoom out" title="Zoom out (−)">−</button>
      <button class="btn btn-ghost btn-sm pct" on:click={() => map?.fit()} title="Fit map to screen (0)">{zoom}%</button>
      <button class="btn btn-ghost btn-icon btn-sm" on:click={() => map?.zoomBy(1.25)} aria-label="Zoom in" title="Zoom in (+)">+</button>
    </div>
    <button class="btn btn-outline btn-sm" aria-pressed={panelOpen} on:click={() => (panelOpen = !panelOpen)}>
      {panelOpen ? 'Hide panel' : 'Panel'}
    </button>
  </header>

  <div class="body" class:with-panel={panelOpen}>
    <section class="stage">
      <!-- Tools -->
      <div class="toolbar">
        <div class="tools" role="radiogroup" aria-label="Map tool">
          {#each TOOLS as t}
            <button
              role="radio"
              aria-checked={tool === t.id}
              class="tool"
              title={`${t.label} (${t.key})`}
              on:click={() => { tool = t.id; if (t.id !== 'ruler') map?.clearRuler(); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d={t.icon} fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" /></svg>
              <span>{t.label}</span>
            </button>
          {/each}
        </div>

        <div class="tool-options">
          {#if tool === 'draw'}
            <div class="swatches" role="radiogroup" aria-label="Pen colour">
              {#each DRAW_COLORS as c}
                <button role="radio" aria-checked={drawColor === c} class="sw" style="background: {c}" aria-label={`Colour ${c}`} on:click={() => (drawColor = c)}></button>
              {/each}
            </div>
            <div class="widths" role="radiogroup" aria-label="Pen size">
              {#each DRAW_WIDTHS as w, i}
                <button role="radio" aria-checked={drawWidth === w} class="width" on:click={() => (drawWidth = w)} aria-label={['Thin', 'Medium', 'Thick'][i]}>
                  <span style="width: {4 + i * 5}px; height: {4 + i * 5}px; background: {drawColor}"></span>
                </button>
              {/each}
            </div>
          {:else if tool === 'erase'}
            <span class="hint">Drag over a drawing to erase it.</span>
            <button class="btn btn-ghost btn-sm" disabled={!state?.strokes.length} on:click={clearDrawings}>Clear all drawings</button>
          {:else if tool === 'ruler'}
            <span class="hint">Drag to measure. 1 cell = 5 ft (diagonals count as 1 cell).</span>
          {:else}
            <span class="hint hide-sm">Drag tokens to move them. Drag empty space to pan, scroll to zoom. Hold Space to pan with any tool.</span>
          {/if}
        </div>
      </div>

      <!-- Map -->
      <div class="map-frame">
        {#if loading}
          <div class="center muted">Loading map…</div>
        {:else if loadError || !state}
          <div class="center"><div class="alert alert-error">{loadError || 'Could not load the map.'}</div></div>
        {:else}
          <BattleMap
            bind:this={map}
            {state}
            {world}
            {imageUrl}
            {tool}
            {drawColor}
            {drawWidth}
            {selectedId}
            onUpdate={update}
            onSelect={selectToken}
            {onDropTemplate}
            on:zoom={(e) => (zoom = e.detail)}
          />

          {#if currentTurn}
            <div class="turn-banner">
              <span class="eyebrow">Round {state.combat.round}</span>
              <button class="turn-who" on:click={() => currentTurn && focusToken(currentTurn.id)}>
                <span class="swatch" style="background: {currentTurn.color}"></span>{currentTurn.label}'s turn
              </button>
              <button class="btn btn-primary btn-sm" on:click={() => update((s) => stepTurn(s, 1))} title="Next turn (N)">Next ▶</button>
            </div>
          {/if}

          {#if !imageUrl}
            <div class="no-image card">
              <span class="small"><strong>No map image.</strong> <span class="muted">Upload one, or play on the blank grid.</span></span>
              <button class="btn btn-primary btn-sm" disabled={uploadingImage} on:click={() => fileInput.click()}>{uploadingImage ? 'Uploading…' : 'Upload map'}</button>
            </div>
          {/if}
        {/if}
      </div>
    </section>

    {#if panelOpen && state}
      <aside class="panel">
        <div class="tabs panel-tabs" role="tablist">
          <button class="tab" role="tab" aria-selected={panelTab === 'tokens'} on:click={() => (panelTab = 'tokens')}>
            Tokens <span class="badge">{state.tokens.length}</span>
          </button>
          <button class="tab" role="tab" aria-selected={panelTab === 'turns'} on:click={() => (panelTab = 'turns')}>
            Turns {#if state.combat.active}<span class="badge live">R{state.combat.round}</span>{/if}
          </button>
          <button class="tab" role="tab" aria-selected={panelTab === 'grid'} on:click={() => (panelTab = 'grid')}>Grid</button>
          <button class="tab" role="tab" aria-selected={panelTab === 'scene'} on:click={() => (panelTab = 'scene')}>Scene</button>
        </div>

        <div class="panel-body" role="tabpanel">
          {#if panelTab === 'tokens'}
            <div class="stack-lg">
              {#if selected}
                {#key selected.id}
                  <TokenInspector
                    token={selected}
                    onChange={updateSelected}
                    onDelete={() => selected && removeToken(selected.id)}
                    onCenter={() => selected && map?.centerOn(selected.x, selected.y)}
                    onDeselect={() => (selectedId = null)}
                  />
                {/key}
              {/if}
              <TokenPalette
                {players}
                sceneNpcs={npcs}
                {otherNpcs}
                sceneGroup={scene?.group || scene?.location || ''}
                tokens={state.tokens}
                onAdd={(tpl) => addFromTemplate(tpl)}
                onFocus={focusToken}
              />
            </div>
          {:else if panelTab === 'turns'}
            <TurnTracker {state} {selectedId} onUpdate={update} onSelect={focusToken} />
          {:else if panelTab === 'grid'}
            <GridSettings
              grid={state.grid}
              {world}
              onChange={(fn, commit = true) => update((s) => fn(s.grid), commit)}
            />
          {:else}
            <div class="stack-lg">
              <section class="stack">
                <h3 class="card-title">About</h3>
                <p class:faint={!scene?.description} class="desc">{scene?.description || 'No description.'}</p>
                {#if scene?.dangerLevel}<p class="small"><span class="faint">Danger:</span> {scene.dangerLevel}</p>{/if}
              </section>
              <section class="stack">
                <h3 class="card-title">Map image</h3>
                <div class="row">
                  <button class="btn btn-outline btn-sm" on:click={() => fileInput.click()} disabled={uploadingImage}>
                    {uploadingImage ? 'Uploading…' : imageUrl ? 'Replace image' : 'Upload image'}
                  </button>
                  <span class="hint">PNG, JPEG, GIF or WebP · max 5 MB</span>
                </div>
                {#if uploadError}<div class="alert alert-error" role="alert">{uploadError}</div>{/if}
              </section>
              <section class="stack">
                <h3 class="card-title">Linked to this scene</h3>
                {#each [{ kind: 'npc', label: 'NPCs', list: npcs }, { kind: 'item', label: 'Items', list: items }] as group}
                  <div class="stack" data-type={group.kind}>
                    <span class="eyebrow">{group.label} · {group.list.length}</span>
                    {#if group.list.length === 0}
                      <span class="faint small">None. Open the scene's details on the game page and use "Add NPCs" or "Add items".</span>
                    {:else}
                      <ul class="linked">
                        {#each group.list as entity (entity._id)}
                          <li>
                            <span class="dot"></span>
                            <span class="name">{entity.name}</span>
                            <button class="btn btn-ghost btn-sm" on:click={() => disconnect(group.kind === 'npc' ? 'npc' : 'item', entity)}>Unlink</button>
                          </li>
                        {/each}
                      </ul>
                    {/if}
                  </div>
                {/each}
              </section>
              <section class="stack shortcuts">
                <h3 class="card-title">Keyboard shortcuts</h3>
                <dl>
                  <div><dt>V B E R</dt><dd>Move, draw, erase, measure</dd></div>
                  <div><dt>Arrows</dt><dd>Move selected token one cell (Shift: fine)</dd></div>
                  <div><dt>Delete</dt><dd>Remove selected token</dd></div>
                  <div><dt>N</dt><dd>Next turn</dd></div>
                  <div><dt>Ctrl+Z</dt><dd>Undo (Ctrl+Shift+Z redo)</dd></div>
                  <div><dt>Space</dt><dd>Hold and drag to pan</dd></div>
                  <div><dt>+ − 0</dt><dd>Zoom in, out, fit</dd></div>
                  <div><dt>Esc</dt><dd>Deselect, then close</dd></div>
                </dl>
              </section>
            </div>
          {/if}
        </div>
      </aside>
    {/if}
  </div>

  <input bind:this={fileInput} class="sr-only" type="file" accept="image/png,image/jpeg,image/gif,image/webp" on:change={onImageSelect} tabindex="-1" />
</div>

<style>
  .scene-view {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    flex-direction: column;
    background: var(--bg);
  }

  /* Top bar: 55px (Fibonacci) */
  .bar {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    height: var(--sp-7);
    flex: none;
    padding: 0 var(--sp-4);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .title { display: flex; align-items: center; gap: var(--sp-3); min-width: 0; flex: 1; }
  .title h2 { font-size: var(--fs-md); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .group { display: flex; align-items: center; gap: var(--sp-1); }
  .pct { min-width: 55px; font-variant-numeric: tabular-nums; }
  .save { display: inline-flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-xs); color: var(--text-faint); white-space: nowrap; }
  .save-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); }
  .save.pending .save-dot, .save.saving .save-dot { background: var(--warning); }
  .save.error { color: var(--danger-text); }
  .save.error .save-dot { background: var(--danger); }

  /* Map : panel. The panel is a Fibonacci width (377px) so the map dominates */
  .body { display: grid; grid-template-columns: minmax(0, 1fr); flex: 1; min-height: 0; }
  .body.with-panel { grid-template-columns: minmax(0, 1fr) 377px; }

  .stage { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-3) var(--sp-4);
    padding: var(--sp-3) var(--sp-4);
    border-bottom: 1px solid var(--border);
  }
  .tools { display: flex; gap: var(--sp-1); padding: var(--sp-1); border-radius: var(--r-md); background: var(--surface); border: 1px solid var(--border); }
  .tool {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    border: none;
    border-radius: var(--r-sm);
    background: none;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    font-weight: 650;
    cursor: pointer;
  }
  .tool:hover { color: var(--text); }
  .tool[aria-checked='true'] { background: var(--primary); color: #fff; }
  .tool-options { display: flex; align-items: center; gap: var(--sp-4); min-height: var(--control-h-sm); flex-wrap: wrap; }
  .swatches, .widths { display: flex; align-items: center; gap: var(--sp-2); }
  .sw { width: 21px; height: 21px; padding: 0; border: 2px solid var(--border-strong); border-radius: 50%; cursor: pointer; }
  .sw[aria-checked='true'] { border-color: #fff; box-shadow: 0 0 0 2px var(--primary); }
  .width {
    display: grid;
    place-items: center;
    width: var(--control-h-sm);
    height: var(--control-h-sm);
    padding: 0;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-sm);
    background: var(--surface);
    cursor: pointer;
  }
  .width span { border-radius: 50%; }
  .width[aria-checked='true'] { border-color: var(--primary-text); background: var(--primary-soft); }

  .map-frame {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    background:
      radial-gradient(circle at 1px 1px, var(--surface-3) 1px, transparent 0) 0 0 / 21px 21px,
      var(--bg);
  }
  .center { position: absolute; inset: 0; display: grid; place-items: center; padding: var(--sp-5); }
  .turn-banner {
    position: absolute;
    top: var(--sp-4);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-4);
    border: 1px solid rgba(242, 181, 82, 0.5);
    border-radius: var(--r-pill);
    background: rgba(26, 29, 36, 0.92);
    box-shadow: var(--shadow-lg);
    white-space: nowrap;
  }
  .turn-banner .eyebrow { color: var(--warning); }
  .turn-who { display: inline-flex; align-items: center; gap: var(--sp-2); padding: 0; border: none; background: none; font-weight: 650; cursor: pointer; }
  .swatch { width: 10px; height: 10px; border-radius: 50%; }
  .no-image {
    position: absolute;
    left: var(--sp-4);
    bottom: var(--sp-4);
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-4);
    background: rgba(26, 29, 36, 0.92);
  }

  .panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-left: 1px solid var(--border);
    background: var(--surface);
  }
  .panel-tabs { flex: none; padding: 0 var(--sp-3); }
  .panel-tabs .tab { padding: var(--sp-4) var(--sp-3); }
  .badge.live { background: rgba(242, 181, 82, 0.18); color: var(--warning); }
  .panel-body { flex: 1; min-height: 0; overflow-y: auto; padding: var(--sp-5) var(--sp-4); }
  .card-title { margin: 0; }
  .desc { white-space: pre-wrap; font-size: var(--fs-xs); }
  .linked { display: flex; flex-direction: column; gap: var(--sp-1); margin: 0; padding: 0; list-style: none; }
  .linked li { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--sp-3); }
  .linked .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .shortcuts dl { display: flex; flex-direction: column; gap: var(--sp-2); margin: 0; font-size: var(--fs-xs); }
  .shortcuts dl div { display: grid; grid-template-columns: 89px 1fr; gap: var(--sp-3); }
  .shortcuts dt { font-family: ui-monospace, monospace; color: var(--text); }
  .shortcuts dd { margin: 0; color: var(--text-muted); }

  @media (max-width: 987px) {
    .body.with-panel { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1.618fr) minmax(0, 1fr); }
    .panel { border-left: none; border-top: 1px solid var(--border); }
  }
  @media (max-width: 610px) {
    .bar { gap: var(--sp-2); padding: 0 var(--sp-2); }
    .hide-sm { display: none; }
    .tool span { display: none; }
    .toolbar { padding: var(--sp-2); }
    .turn-banner { top: var(--sp-2); gap: var(--sp-3); }
  }
</style>
