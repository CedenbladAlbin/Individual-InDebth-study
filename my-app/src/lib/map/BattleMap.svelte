<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { MapState, Tool, Stroke, Token } from './types';
  import { KIND_COLORS, initials, newId } from './types';
  import { gridPattern, snapPoint, cellDistance, distanceToPolyline, strokePath, stackLayout, type Placed } from './grid';

  export let state: MapState;
  export let world: { w: number; h: number };
  export let imageUrl: string | null = null;
  export let tool: Tool = 'select';
  export let drawColor = '#f0605d';
  export let drawWidth = 8;
  export let selectedId: string | null = null;
  /** Apply a change to the map state. `commit` = record an undo step and save. */
  export let onUpdate: (fn: (s: MapState) => void, commit: boolean) => void;
  export let onSelect: (id: string | null) => void;
  /** A palette entry was dropped onto the map at world position (x, y) */
  export let onDropTemplate: (data: string, x: number, y: number) => void = () => {};

  const dispatch = createEventDispatcher<{ zoom: number }>();
  const patternId = `grid-${Math.random().toString(36).slice(2, 8)}`;

  type Pt = { x: number; y: number };
  type Gesture =
    | { kind: 'pan'; startX: number; startY: number; vb: typeof vb; ppu: number; moved: boolean }
    | { kind: 'token'; id: string; dx: number; dy: number; moved: boolean }
    | { kind: 'draw' }
    | { kind: 'erase'; removed: boolean }
    | { kind: 'ruler' }
    | { kind: 'pinch'; dist: number; mid: Pt };

  let svg: SVGSVGElement;
  let vb = { x: 0, y: 0, w: world.w, h: world.h };
  let fitW = world.w;
  let gesture: Gesture | null = null;
  let draft: Stroke | null = null;
  let ruler: { a: Pt; b: Pt } | null = null;
  let hoverId: string | null = null;
  let spaceHeld = false;
  const pointers = new Map<number, Pt>();

  $: grid = state.grid;
  $: pattern = gridPattern(grid);
  $: gridStroke = Math.max(1, grid.size * 0.025);
  $: activeTurnId = state.combat.active ? state.combat.turnTokenId : null;
  // Screen size of the SVG, so text can stay readable at any zoom level
  let cw = 1, ch = 1;
  $: scale = Math.max(0.0001, Math.min(cw / vb.w, ch / vb.h));
  // Names stay between 11 and 15 screen pixels tall at any zoom
  $: labelSize = Math.min(Math.max(grid.size * 0.24, 11 / scale), 15 / scale);
  /** Show every name only when cells are big enough on screen; otherwise just on hover/selection/turn */
  $: showAllLabels = grid.size * scale >= 34;

  // Re-fit when the world size changes (e.g. a map image was loaded)
  let lastWorld = '';
  $: if (`${world.w}x${world.h}` !== lastWorld) {
    lastWorld = `${world.w}x${world.h}`;
    fit();
  }

  /* ---------- Viewport ---------- */
  export function fit() {
    const pad = Math.max(world.w, world.h) * 0.03;
    vb = { x: -pad, y: -pad, w: world.w + pad * 2, h: world.h + pad * 2 };
    fitW = vb.w;
    emitZoom();
  }
  export function zoomBy(factor: number) {
    zoomAt({ x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 }, factor);
  }
  /** Pan so that the given world point is centred, without changing zoom */
  export function centerOn(x: number, y: number) {
    vb = { ...vb, x: x - vb.w / 2, y: y - vb.h / 2 };
  }
  /** World coordinates of the centre of the current view */
  export function viewCenter(): Pt {
    return { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };
  }
  /** Is the world point currently visible? */
  export function isVisible(x: number, y: number) {
    return x > vb.x && x < vb.x + vb.w && y > vb.y && y < vb.y + vb.h;
  }
  function zoomAt(p: Pt, factor: number) {
    const minW = world.w / 10, maxW = Math.max(world.w, world.h) * 4;
    const w = Math.min(maxW, Math.max(minW, vb.w / factor));
    const f = vb.w / w;
    vb = { x: p.x - (p.x - vb.x) / f, y: p.y - (p.y - vb.y) / f, w, h: vb.h / f };
    emitZoom();
  }
  function emitZoom() {
    dispatch('zoom', Math.round((fitW / vb.w) * 100));
  }
  function toWorld(clientX: number, clientY: number): Pt {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  /** Screen pixels per world unit */
  const ppu = () => svg.getScreenCTM()?.a || 1;

  /* ---------- Pointer handling ---------- */
  function tokenAt(e: PointerEvent) {
    const el = (e.target as Element).closest?.('[data-token-id]');
    return el ? el.getAttribute('data-token-id') : null;
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button === 2) return;
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      // Second finger: switch to pinch-zoom, finishing whatever the first finger did
      finishGesture();
      const [a, b] = [...pointers.values()];
      gesture = { kind: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      return;
    }

    const p = toWorld(e.clientX, e.clientY);
    const hitToken = tokenAt(e);
    const wantsPan = e.button === 1 || spaceHeld || (tool === 'select' && !hitToken);

    if (wantsPan) {
      gesture = { kind: 'pan', startX: e.clientX, startY: e.clientY, vb: { ...vb }, ppu: ppu(), moved: false };
    } else if (tool === 'select' && hitToken) {
      const t = state.tokens.find((t) => t.id === hitToken);
      if (!t) return;
      onSelect(t.id);
      // Grab relative to where the token is drawn (it may be spread out inside a shared cell)
      const shown = layout.placed.get(t.id) ?? t;
      gesture = { kind: 'token', id: t.id, dx: shown.x - p.x, dy: shown.y - p.y, moved: false };
    } else if (tool === 'draw') {
      draft = { id: newId('s'), color: drawColor, width: drawWidth, points: [round(p.x), round(p.y)] };
      gesture = { kind: 'draw' };
    } else if (tool === 'erase') {
      gesture = { kind: 'erase', removed: false };
      eraseAt(p);
    } else if (tool === 'ruler') {
      const start = grid.type !== 'none' ? snapPoint({ ...grid, snap: true }, p) : p;
      ruler = { a: start, b: start };
      gesture = { kind: 'ruler' };
    }
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesture) {
      if (tool === 'select') hoverId = tokenAt(e);
      return;
    }
    if (gesture.kind === 'pinch') {
      if (pointers.size < 2) return;
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const scale = ppu();
      vb = { ...vb, x: vb.x - (mid.x - gesture.mid.x) / scale, y: vb.y - (mid.y - gesture.mid.y) / scale };
      zoomAt(toWorld(mid.x, mid.y), dist / gesture.dist);
      gesture = { kind: 'pinch', dist, mid };
      return;
    }

    const p = toWorld(e.clientX, e.clientY);
    if (gesture.kind === 'pan') {
      const dx = e.clientX - gesture.startX, dy = e.clientY - gesture.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) gesture.moved = true;
      vb = { ...vb, x: gesture.vb.x - dx / gesture.ppu, y: gesture.vb.y - dy / gesture.ppu };
    } else if (gesture.kind === 'token') {
      const g = gesture;
      g.moved = true;
      onUpdate((s) => {
        const t = s.tokens.find((t) => t.id === g.id);
        if (t) { t.x = round(p.x + g.dx); t.y = round(p.y + g.dy); }
      }, false);
    } else if (gesture.kind === 'draw' && draft) {
      const n = draft.points.length;
      const lx = draft.points[n - 2], ly = draft.points[n - 1];
      // Skip points closer than ~2 screen pixels to keep strokes small
      if (Math.hypot(p.x - lx, p.y - ly) * ppu() > 2 && n < 4000) {
        draft.points = [...draft.points, round(p.x), round(p.y)];
      }
    } else if (gesture.kind === 'erase') {
      eraseAt(p);
    } else if (gesture.kind === 'ruler' && ruler) {
      const end = grid.type !== 'none' ? snapPoint({ ...grid, snap: true }, p) : p;
      ruler = { ...ruler, b: end };
    }
  }

  function onPointerUp(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    if (gesture?.kind === 'pinch') {
      if (pointers.size < 2) gesture = null;
      return;
    }
    finishGesture();
  }

  function finishGesture() {
    const g = gesture;
    gesture = null;
    if (!g) return;
    if (g.kind === 'pan' && !g.moved && tool === 'select') onSelect(null);
    if (g.kind === 'token' && g.moved) {
      onUpdate((s) => {
        const t = s.tokens.find((t) => t.id === g.id);
        if (t) Object.assign(t, snapPoint(s.grid, t, t.size));
      }, true);
    }
    if (g.kind === 'draw' && draft) {
      const stroke = draft;
      if (stroke.points.length === 2) stroke.points = [...stroke.points, stroke.points[0] + 0.1, stroke.points[1]];
      draft = null;
      onUpdate((s) => { s.strokes.push(stroke); }, true);
    }
    if (g.kind === 'erase' && g.removed) onUpdate(() => {}, true);
  }

  function eraseAt(p: Pt) {
    const radius = 10 / ppu();
    const hit = state.strokes.filter((s) => distanceToPolyline(p, s.points) <= s.width / 2 + radius).map((s) => s.id);
    if (hit.length === 0) return;
    if (gesture?.kind === 'erase') gesture.removed = true;
    onUpdate((s) => { s.strokes = s.strokes.filter((st) => !hit.includes(st.id)); }, false);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(toWorld(e.clientX, e.clientY), Math.exp(-delta * 0.0015));
  }

  function onDrop(e: DragEvent) {
    const data = e.dataTransfer?.getData('application/x-map-token');
    if (!data) return;
    e.preventDefault();
    const p = toWorld(e.clientX, e.clientY);
    onDropTemplate(data, p.x, p.y);
  }

  const round = (n: number) => Math.round(n * 10) / 10;

  /* ---------- Space to pan ---------- */
  function isTyping(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  }
  onMount(() => {
    const ro = new ResizeObserver(() => { cw = svg.clientWidth || 1; ch = svg.clientHeight || 1; });
    ro.observe(svg);
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !isTyping(e)) { spaceHeld = true; e.preventDefault(); } };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') spaceHeld = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      ro.disconnect();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  });

  export function clearRuler() {
    ruler = null;
  }

  /* ---------- Token geometry ---------- */
  const radius = (t: Token, cell: number) => Math.max(cell * t.size * 0.44, cell * 0.2);
  const hpRatio = (t: Token) => (t.maxHp ? Math.max(0, Math.min(1, (t.hp ?? t.maxHp) / t.maxHp)) : 1);
  const hpColor = (r: number) => (r > 0.5 ? '#4cc38a' : r > 0.25 ? '#f2b552' : '#f0605d');
  const isDown = (t: Token) => t.maxHp !== null && t.maxHp > 0 && (t.hp ?? 1) <= 0;

  // Tokens sharing a cell are spread out; the one being dragged follows the pointer
  $: layout = stackLayout(state.tokens, grid, gesture?.kind === 'token' ? gesture.id : null);
  // Template helpers take everything they read as arguments: in legacy mode the markup only
  // re-renders for variables that appear in the expression itself.
  const at = (t: Token, l: typeof layout): Placed => l.placed.get(t.id) ?? { x: t.x, y: t.y, scale: 1, stacked: false };
  /** Big creatures first so smaller tokens on top of them stay visible; selected/active last */
  $: drawOrder = [...state.tokens].sort((a, b) => {
    const rank = (t: Token) => Number(t.id === activeTurnId || t.id === selectedId);
    return rank(a) - rank(b) || b.size - a.size;
  });

  $: cursor =
    gesture?.kind === 'pan' ? 'grabbing'
    : spaceHeld ? 'grab'
    : tool === 'draw' ? 'crosshair'
    : tool === 'erase' ? 'cell'
    : tool === 'ruler' ? 'crosshair'
    : hoverId ? 'move' : 'grab';

  $: rulerCells = ruler ? cellDistance(grid, ruler.a, ruler.b) : 0;
  $: rulerLabel = ruler
    ? grid.type === 'none' || !Number.isInteger(rulerCells)
      ? `${(rulerCells * 5).toFixed(0)} ft`
      : `${rulerCells} ${rulerCells === 1 ? 'cell' : 'cells'} · ${rulerCells * 5} ft`
    : '';
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg
  bind:this={svg}
  class="battle-map"
  viewBox="{vb.x} {vb.y} {vb.w} {vb.h}"
  preserveAspectRatio="xMidYMid meet"
  style="cursor: {cursor}"
  on:pointerdown={onPointerDown}
  on:pointermove={onPointerMove}
  on:pointerup={onPointerUp}
  on:pointercancel={onPointerUp}
  on:pointerleave={() => (hoverId = null)}
  on:wheel|nonpassive={onWheel}
  on:dragover|preventDefault
  on:drop={onDrop}
  on:contextmenu|preventDefault
>
  <defs>
    {#if pattern}
      <pattern id={patternId} patternUnits="userSpaceOnUse" x={grid.offsetX} y={grid.offsetY} width={pattern.width} height={pattern.height}>
        <path d={pattern.path} fill="none" stroke={grid.color} stroke-opacity={grid.opacity} stroke-width={gridStroke} />
      </pattern>
    {/if}
  </defs>

  <!-- Board -->
  <rect x="0" y="0" width={world.w} height={world.h} class="board" />
  {#if imageUrl}
    <image href={imageUrl} x="0" y="0" width={world.w} height={world.h} preserveAspectRatio="none" />
  {/if}
  {#if pattern}
    <rect x="0" y="0" width={world.w} height={world.h} fill="url(#{patternId})" pointer-events="none" />
  {/if}

  <!-- Drawings -->
  <g pointer-events="none" stroke-linecap="round" stroke-linejoin="round" fill="none">
    {#each state.strokes as s (s.id)}
      <path d={strokePath(s.points)} stroke={s.color} stroke-width={s.width} />
    {/each}
    {#if draft}
      <path d={strokePath(draft.points)} stroke={draft.color} stroke-width={draft.width} />
    {/if}
  </g>

  <!-- Ruler -->
  {#if ruler}
    <g class="ruler" pointer-events="none">
      <line x1={ruler.a.x} y1={ruler.a.y} x2={ruler.b.x} y2={ruler.b.y} stroke-width={Math.max(grid.size * 0.06, 2.5 / scale)} stroke-dasharray="{Math.max(grid.size * 0.2, 8 / scale)} {Math.max(grid.size * 0.12, 5 / scale)}" />
      <circle cx={ruler.a.x} cy={ruler.a.y} r={grid.size * 0.1} />
      <circle cx={ruler.b.x} cy={ruler.b.y} r={grid.size * 0.1} />
      {#if rulerLabel && (ruler.a.x !== ruler.b.x || ruler.a.y !== ruler.b.y)}
        <text x={ruler.b.x + grid.size * 0.3} y={ruler.b.y - grid.size * 0.3} font-size={labelSize * 1.15}>{rulerLabel}</text>
      {/if}
    </g>
  {/if}

  <!-- Shared cells: outline under the tokens (the count is drawn above them, further down) -->
  <g pointer-events="none">
    {#each layout.stacks as s (`${s.x}:${s.y}`)}
      <circle class="stack-ring" cx={s.x} cy={s.y} r={grid.size * 0.5} stroke-width={Math.max(1.5, grid.size * 0.03)} />
    {/each}
  </g>

  <!-- Tokens: big ones first, the selected/active one last so it's on top -->
  <g>
    {#each drawOrder as t (t.id)}
      {@const r = radius(t, grid.size)}
      {@const ratio = hpRatio(t)}
      {@const pos = at(t, layout)}
      <g
        class="token"
        class:selected={t.id === selectedId}
        class:active={t.id === activeTurnId}
        class:down={isDown(t)}
        class:stacked={pos.stacked}
        data-token-id={t.id}
        transform="translate({pos.x} {pos.y}) scale({pos.scale})"
      >
        {#if t.id === activeTurnId}
          <circle class="turn-ring" r={r + grid.size * 0.12} stroke-width={grid.size * 0.06} />
        {/if}
        {#if t.id === selectedId}
          <circle class="select-ring" r={r + grid.size * 0.06} stroke-width={grid.size * 0.035} />
        {/if}
        <circle class="token-body" r={r} fill={t.color} stroke={KIND_COLORS[t.kind]} stroke-width={Math.max(2, r * 0.12)} />
        {#if t.icon}
          <image href="/assets/markers/{t.icon}.svg" x={-r} y={-r} width={r * 2} height={r * 2} />
        {:else}
          <text class="token-initials" font-size={r * (t.label.length > 2 ? 0.7 : 0.8)} dy="0.35em">{initials(t.label)}</text>
        {/if}
        {#if isDown(t)}
          <path class="down-mark" d="M {-r * 0.6} {-r * 0.6} L {r * 0.6} {r * 0.6} M {r * 0.6} {-r * 0.6} L {-r * 0.6} {r * 0.6}" stroke-width={r * 0.18} />
        {/if}
        {#if t.conditions.length}
          <g transform="translate({r * 0.75} {-r * 0.75})">
            <circle r={Math.max(r * 0.3, 7)} class="cond-badge" />
            <text font-size={Math.max(r * 0.36, 9)} dy="0.35em" class="cond-text">{t.conditions.length}</text>
          </g>
        {/if}
        {#if t.maxHp}
          <rect x={-r} y={r + grid.size * 0.06} width={r * 2} height={Math.max(3, grid.size * 0.07)} rx="2" class="hp-track" />
          <rect x={-r} y={r + grid.size * 0.06} width={r * 2 * ratio} height={Math.max(3, grid.size * 0.07)} rx="2" fill={hpColor(ratio)} />
        {/if}
        <title>{t.label}{t.maxHp ? ` · ${t.hp ?? t.maxHp}/${t.maxHp} HP` : ''}{t.conditions.length ? ` · ${t.conditions.join(', ')}` : ''}</title>
      </g>
    {/each}
  </g>

  <!-- How many tokens share a cell, on top so no token hides the number -->
  <g pointer-events="none">
    {#each layout.stacks as s (`${s.x}:${s.y}`)}
      <g transform="translate({s.x + grid.size * 0.42} {s.y - grid.size * 0.42})">
        <circle class="stack-badge" r={Math.max(grid.size * 0.14, 8 / scale)} />
        <text class="stack-count" font-size={Math.max(grid.size * 0.17, 10 / scale)} dy="0.35em">{s.count}</text>
      </g>
    {/each}
  </g>

  <!-- Names on their own layer so neighbouring tokens never cover them -->
  <g pointer-events="none">
    {#each state.tokens as t (t.id)}
      {@const pos = at(t, layout)}
      <!-- In a shared cell names would overlap, so they only show on hover/selection/turn -->
      {#if (showAllLabels && !pos.stacked) || t.id === selectedId || t.id === activeTurnId || t.id === hoverId}
        <text class="token-label" x={pos.x} y={pos.y + (radius(t, grid.size) + grid.size * (t.maxHp ? 0.14 : 0.06)) * pos.scale} dy="0.9em" font-size={labelSize}>{t.label}</text>
      {/if}
    {/each}
  </g>
</svg>

<style>
  .battle-map {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .board { fill: #1c2029; }
  .token { transition: opacity 0.15s; }
  .token-body { filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.6)); }
  .token-initials {
    fill: #fff;
    font-weight: 700;
    text-anchor: middle;
    pointer-events: none;
    paint-order: stroke;
    stroke: rgba(0, 0, 0, 0.35);
    stroke-width: 1.5px;
  }
  .token-label {
    fill: #fff;
    font-weight: 600;
    text-anchor: middle;
    pointer-events: none;
    paint-order: stroke;
    stroke: rgba(10, 12, 16, 0.85);
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .select-ring { fill: none; stroke: #fff; }
  .turn-ring {
    fill: none;
    stroke: #f2b552;
    animation: pulse 1.6s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { stroke-opacity: 1; }
    50% { stroke-opacity: 0.35; }
  }
  .token.down .token-body,
  .token.down image { opacity: 0.45; }
  .down-mark { stroke: #f0605d; stroke-linecap: round; pointer-events: none; }
  .hp-track { fill: rgba(0, 0, 0, 0.6); }
  .cond-badge { fill: #b0a0ff; stroke: #121419; stroke-width: 1.5; }
  .cond-text { fill: #121419; font-weight: 700; text-anchor: middle; pointer-events: none; }
  .stack-ring { fill: rgba(18, 20, 25, 0.35); stroke: rgba(255, 255, 255, 0.55); stroke-dasharray: 4 3; }
  .stack-badge { fill: #eceef3; stroke: #121419; stroke-width: 1.5; }
  .stack-count { fill: #121419; font-weight: 800; text-anchor: middle; }
  .ruler line { stroke: #f2b552; stroke-linecap: round; }
  .ruler circle { fill: #f2b552; }
  .ruler text {
    fill: #fff;
    font-weight: 700;
    paint-order: stroke;
    stroke: #121419;
    stroke-width: 4px;
    stroke-linejoin: round;
  }
</style>
