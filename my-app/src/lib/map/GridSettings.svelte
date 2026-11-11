<script lang="ts">
  import type { Grid, GridType } from './types';

  export let grid: Grid;
  export let world: { w: number; h: number };
  /** Change the grid. `commit` = record undo step + save (false while dragging a slider) */
  export let onChange: (fn: (g: Grid) => void, commit?: boolean) => void;

  const TYPES: { type: GridType; label: string; icon: string }[] = [
    { type: 'none', label: 'None', icon: 'M4 4h16v16H4z' },
    { type: 'square', label: 'Squares', icon: 'M4 4h16v16H4zM12 4v16M4 12h16' },
    { type: 'hex-pointy', label: 'Hex (pointy)', icon: 'M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z' },
    { type: 'hex-flat', label: 'Hex (flat)', icon: 'M3 12l4.5-7.8h9L21 12l-4.5 7.8h-9z' }
  ];
  const COLORS = ['#ffffff', '#111111', '#f2b552', '#4fb3d9', '#f0605d'];

  $: columns = Math.round((world.w / grid.size) * 10) / 10;
  let columnsInput = '';

  function fitColumns() {
    const n = Number(columnsInput);
    if (!n || n < 1) return;
    onChange((g) => { g.size = Math.round((world.w / n) * 10) / 10; g.offsetX = 0; g.offsetY = 0; });
    columnsInput = '';
  }
</script>

<div class="grid-settings stack-lg">
  <div class="types" role="radiogroup" aria-label="Grid type">
    {#each TYPES as t}
      <button
        type="button"
        role="radio"
        aria-checked={grid.type === t.type}
        class="type"
        on:click={() => onChange((g) => { g.type = t.type; })}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d={t.icon} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
        </svg>
        <span>{t.label}</span>
      </button>
    {/each}
  </div>

  {#if grid.type !== 'none'}
    <label class="field">
      <span class="field-label row-label">Cell size <span class="faint">{grid.size} px · {columns} across</span></span>
      <input
        type="range"
        min="10"
        max={Math.max(200, Math.round(world.w / 4))}
        step="0.5"
        value={grid.size}
        on:input={(e) => onChange((g) => { g.size = Number(e.currentTarget.value); }, false)}
        on:change={() => onChange(() => {}, true)}
      />
    </label>

    <form class="fit" on:submit|preventDefault={fitColumns}>
      <label class="field">
        <span class="field-label">Fit to map</span>
        <input class="input" type="number" min="1" max="200" step="0.5" placeholder="Cells across, e.g. 24" bind:value={columnsInput} />
      </label>
      <button class="btn btn-outline btn-sm" type="submit" disabled={!columnsInput}>Apply</button>
    </form>
    <p class="hint">If your map image has a printed grid, count its cells across and enter the number. Then nudge the offset to line it up.</p>

    <div class="grid2">
      <label class="field">
        <span class="field-label row-label">Offset X <span class="faint">{grid.offsetX}</span></span>
        <input
          type="range"
          min={-grid.size}
          max={grid.size}
          step="0.5"
          value={grid.offsetX}
          on:input={(e) => onChange((g) => { g.offsetX = Number(e.currentTarget.value); }, false)}
          on:change={() => onChange(() => {}, true)}
        />
      </label>
      <label class="field">
        <span class="field-label row-label">Offset Y <span class="faint">{grid.offsetY}</span></span>
        <input
          type="range"
          min={-grid.size}
          max={grid.size}
          step="0.5"
          value={grid.offsetY}
          on:input={(e) => onChange((g) => { g.offsetY = Number(e.currentTarget.value); }, false)}
          on:change={() => onChange(() => {}, true)}
        />
      </label>
    </div>

    <div class="grid2">
      <label class="field">
        <span class="field-label row-label">Opacity <span class="faint">{Math.round(grid.opacity * 100)}%</span></span>
        <input
          type="range"
          min="0.05"
          max="1"
          step="0.05"
          value={grid.opacity}
          on:input={(e) => onChange((g) => { g.opacity = Number(e.currentTarget.value); }, false)}
          on:change={() => onChange(() => {}, true)}
        />
      </label>
      <div class="field">
        <span class="field-label">Line colour</span>
        <div class="swatches">
          {#each COLORS as c}
            <button type="button" class="sw" class:on={grid.color === c} style="background: {c}" aria-label={`Grid colour ${c}`} on:click={() => onChange((g) => { g.color = c; })}></button>
          {/each}
        </div>
      </div>
    </div>

    <label class="toggle">
      <input type="checkbox" checked={grid.snap} on:change={(e) => onChange((g) => { g.snap = e.currentTarget.checked; })} />
      <span>Snap tokens to grid</span>
    </label>
  {:else}
    <p class="hint">Without a grid, tokens move freely and the ruler measures in feet using the cell size below.</p>
    <label class="field">
      <span class="field-label row-label">5 ft equals <span class="faint">{grid.size} px</span></span>
      <input type="range" min="10" max="200" step="0.5" value={grid.size}
        on:input={(e) => onChange((g) => { g.size = Number(e.currentTarget.value); }, false)}
        on:change={() => onChange(() => {}, true)} />
    </label>
  {/if}
</div>

<style>
  .types { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-2); }
  .type {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-3) var(--sp-1);
    border: 1px solid var(--border-strong);
    border-radius: var(--r-md);
    background: none;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }
  .type:hover { color: var(--text); }
  .type[aria-checked='true'] { border-color: var(--primary-text); background: var(--primary-soft); color: var(--text); }
  .row-label { display: flex; justify-content: space-between; gap: var(--sp-3); }
  input[type='range'] { width: 100%; accent-color: var(--primary); }
  .fit { display: grid; grid-template-columns: 1fr auto; gap: var(--sp-3); align-items: end; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }
  .swatches { display: flex; gap: var(--sp-2); padding-top: var(--sp-1); }
  .sw { width: 21px; height: 21px; padding: 0; border: 2px solid var(--border-strong); border-radius: 50%; cursor: pointer; }
  .sw.on { border-color: var(--primary-text); box-shadow: 0 0 0 2px var(--primary-soft); }
  .toggle { display: flex; align-items: center; gap: var(--sp-3); font-weight: 600; cursor: pointer; }
  .toggle input { width: 16px; height: 16px; accent-color: var(--primary); }
</style>
