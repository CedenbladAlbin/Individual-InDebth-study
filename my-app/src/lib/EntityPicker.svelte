<script lang="ts" context="module">
  export type Candidate = { type: 'scene' | 'npc' | 'player' | 'item'; entity: any };
</script>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Modal from '$lib/Modal.svelte';

  export let title: string;
  export let candidates: Candidate[];
  export let multiple = false;
  /** Shown first under "Suggested" (e.g. same group) */
  export let suggestedIds: string[] = [];
  /** Already linked: shown but not selectable */
  export let disabledIds: string[] = [];
  export let confirmLabel = 'Done';
  export let onConfirm: (picked: Candidate[]) => void;
  export let onClose: () => void;

  const TYPE_LABEL: Record<string, string> = { scene: 'Scenes', npc: 'NPCs', player: 'Players', item: 'Items' };
  const TYPE_ORDER = ['player', 'npc', 'scene', 'item'];
  const MAX_ROWS = 200;

  let query = '';
  let selected = new Set<string>();
  let active = 0;
  let input: HTMLInputElement;
  let listEl: HTMLElement;

  $: suggested = new Set(suggestedIds);
  $: disabled = new Set(disabledIds);
  $: multiType = new Set(candidates.map((c) => c.type)).size > 1;

  /** Search on name, group and a few descriptive fields; every word must match */
  function matches(c: Candidate, q: string) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return true;
    const e = c.entity;
    const hay = [e.name, e.group, e.role, e.class, e.itemType, e.location, TYPE_LABEL[c.type]].filter(Boolean).join(' ').toLowerCase();
    return terms.every((t) => hay.includes(t));
  }

  type Section = { key: string; label: string; rows: Candidate[] };
  $: sections = buildSections(candidates.filter((c) => matches(c, query)));
  $: flat = sections.flatMap((s) => s.rows);
  $: if (active >= flat.length) active = Math.max(0, flat.length - 1);

  function buildSections(list: Candidate[]): Section[] {
    const byName = (a: Candidate, b: Candidate) => a.entity.name.localeCompare(b.entity.name, undefined, { numeric: true });
    const top = list.filter((c) => suggested.has(c.entity._id) && !disabled.has(c.entity._id)).sort(byName);
    const rest = list.filter((c) => !top.includes(c));
    const out: Section[] = [];
    if (top.length) out.push({ key: 'suggested', label: 'Suggested', rows: top });
    const groups = new Map<string, Candidate[]>();
    for (const c of rest) {
      const key = `${TYPE_ORDER.indexOf(c.type)}|${c.entity.group || '￿'}|${c.type}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }
    let budget = MAX_ROWS;
    for (const key of [...groups.keys()].sort()) {
      const rows = groups.get(key)!.sort(byName);
      const [, group, type] = key.split('|');
      const groupLabel = group === '￿' ? (multiType ? '' : 'No group') : group;
      const label = multiType ? [TYPE_LABEL[type], groupLabel].filter(Boolean).join(' · ') : groupLabel;
      if (budget <= 0) break;
      out.push({ key, label, rows: rows.slice(0, budget) });
      budget -= rows.length;
    }
    return out;
  }

  function choose(c: Candidate) {
    if (disabled.has(c.entity._id)) return;
    if (!multiple) {
      onConfirm([c]);
      return;
    }
    selected.has(c.entity._id) ? selected.delete(c.entity._id) : selected.add(c.entity._id);
    selected = selected;
  }

  function confirm() {
    onConfirm(candidates.filter((c) => selected.has(c.entity._id)));
  }

  async function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(0, Math.min(flat.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
      await tick();
      listEl?.querySelector('.row.active')?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (multiple && (e.ctrlKey || e.metaKey)) confirm();
      else if (flat[active]) choose(flat[active]);
    }
  }

  onMount(() => setTimeout(() => input?.focus()));

  const meta = (c: Candidate) => {
    const e = c.entity;
    return [e.role, e.class, e.itemType, e.location].filter(Boolean)[0] ?? '';
  };
  $: total = candidates.filter((c) => matches(c, query)).length;
</script>

<Modal {title} {onClose}>
  <div class="picker">
    <input
      bind:this={input}
      class="input search"
      type="search"
      placeholder={multiType ? 'Search by name, group, type…' : 'Search by name or group…'}
      bind:value={query}
      on:keydown={onKeydown}
      on:input={() => (active = 0)}
      aria-label="Search"
    />
    <p class="hint">
      {#if multiple}↑ ↓ to move, Enter to select, Ctrl+Enter to finish.{:else}↑ ↓ to move, Enter to choose.{/if}
      {#if total > MAX_ROWS}Showing the first {MAX_ROWS} of {total}. Type to narrow down.{/if}
    </p>

    <div class="list" bind:this={listEl} role="listbox" aria-multiselectable={multiple}>
      {#if flat.length === 0}
        <p class="faint small empty">Nothing matches "{query}".</p>
      {/if}
      {#each sections as section (section.key)}
        {#if section.label}<div class="section eyebrow">{section.label}</div>{/if}
        {#each section.rows as c (c.entity._id)}
          {@const i = flat.indexOf(c)}
          {@const isDisabled = disabled.has(c.entity._id)}
          <button
            type="button"
            class="row"
            class:active={i === active}
            class:selected={selected.has(c.entity._id)}
            class:disabled={isDisabled}
            role="option"
            aria-selected={selected.has(c.entity._id)}
            aria-disabled={isDisabled}
            data-type={c.type}
            on:click={() => choose(c)}
            on:mousemove={() => (active = i)}
          >
            {#if multiple}
              <span class="check" aria-hidden="true">{selected.has(c.entity._id) ? '✓' : ''}</span>
            {/if}
            <span class="dot"></span>
            <span class="name">{c.entity.name}</span>
            {#if isDisabled}
              <span class="tag faint">already linked</span>
            {:else}
              <span class="meta faint">{meta(c)}</span>
              {#if c.entity.group && section.key === 'suggested'}<span class="badge">{c.entity.group}</span>{/if}
            {/if}
          </button>
        {/each}
      {/each}
    </div>
  </div>

  <svelte:fragment slot="footer">
    {#if multiple}
      <span class="faint small count">{selected.size} selected</span>
      <button class="btn btn-ghost" on:click={onClose}>Cancel</button>
      <button class="btn btn-primary" disabled={selected.size === 0} on:click={confirm}>{confirmLabel}{selected.size ? ` ${selected.size}` : ''}</button>
    {:else}
      <button class="btn btn-ghost" on:click={onClose}>Cancel</button>
    {/if}
  </svelte:fragment>
</Modal>

<style>
  .picker { display: flex; flex-direction: column; gap: var(--sp-3); }
  .list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    max-height: min(377px, 50vh);
    overflow-y: auto;
    margin: 0 calc(-1 * var(--sp-2));
    padding: 0 var(--sp-2);
  }
  .section { padding: var(--sp-3) var(--sp-2) var(--sp-1); }
  .section:first-child { padding-top: 0; }
  .row {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    border: 1px solid transparent;
    border-radius: var(--r-md);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .row:not(:has(.check)) { grid-template-columns: auto minmax(0, 1fr) auto auto; }
  .row.active { background: var(--surface-2); }
  .row.selected { border-color: var(--type-color); background: color-mix(in srgb, var(--type-color) 12%, transparent); }
  .row.disabled { cursor: default; opacity: 0.55; }
  .check {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-sm);
    font-size: 12px;
    color: var(--type-color);
  }
  .selected .check { border-color: var(--type-color); }
  .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta, .tag { font-size: var(--fs-xs); white-space: nowrap; }
  .empty { padding: var(--sp-4) var(--sp-2); }
  .count { margin-right: auto; align-self: center; }
</style>
