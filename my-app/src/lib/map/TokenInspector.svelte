<script lang="ts">
  import type { Token, TokenKind } from './types';
  import { KIND_COLORS, KIND_LABELS, TOKEN_SIZES, CONDITIONS } from './types';

  export let token: Token;
  /** Change the token. `commit` = record undo step + save (false while typing) */
  export let onChange: (fn: (t: Token) => void, commit?: boolean) => void;
  export let onDelete: () => void;
  export let onCenter: () => void;
  export let onDeselect: () => void;

  const SWATCHES = ['#5fd08a', '#f2a65a', '#e5534b', '#4fb3d9', '#b0a0ff', '#c58cf2', '#f2b552', '#a1a9ba', '#3c4354'];
  const KINDS: TokenKind[] = ['player', 'npc', 'enemy', 'ally', 'neutral', 'marker'];

  let amount: number | null = null;
  let showConditions = false;

  function applyHp(sign: 1 | -1) {
    if (!amount || token.maxHp === null) return;
    const delta = Math.abs(Math.round(amount)) * sign;
    onChange((t) => {
      const current = t.hp ?? t.maxHp ?? 0;
      t.hp = Math.min(t.maxHp ?? Infinity, current + delta);
    });
    amount = null;
  }

  function setMaxHp(v: string) {
    const n = v === '' ? null : Math.max(0, Math.round(Number(v)));
    onChange((t) => {
      t.maxHp = n;
      t.hp = n === null ? null : t.hp === null ? n : Math.min(t.hp, n);
    });
  }

  function toggleCondition(c: string) {
    onChange((t) => {
      t.conditions = t.conditions.includes(c) ? t.conditions.filter((x) => x !== c) : [...t.conditions, c];
    });
  }

  const num = (v: string) => (v === '' ? null : Math.round(Number(v)));
</script>

<div class="inspector card" style="--c: {KIND_COLORS[token.kind]}">
  <div class="head">
    <span class="eyebrow kind"><span class="swatch" style="background: {token.color}"></span>{KIND_LABELS[token.kind]}</span>
    <div class="row">
      <button class="btn btn-ghost btn-sm" on:click={onCenter} title="Centre the map on this token">Find</button>
      <button class="btn btn-ghost btn-icon btn-sm" on:click={onDeselect} aria-label="Deselect">✕</button>
    </div>
  </div>

  <input
    class="input name"
    type="text"
    maxlength="60"
    value={token.label}
    aria-label="Name"
    on:input={(e) => onChange((t) => { t.label = e.currentTarget.value; }, false)}
    on:change={() => onChange((t) => { t.label = t.label.trim() || 'Token'; }, true)}
  />

  {#if token.kind !== 'marker'}
    <!-- HP -->
    <div class="hp">
      <div class="hp-values">
        <label class="field">
          <span class="field-label">HP</span>
          <input
            class="input"
            type="number"
            value={token.hp ?? ''}
            placeholder="–"
            disabled={token.maxHp === null}
            on:change={(e) => onChange((t) => { t.hp = num(e.currentTarget.value); })}
          />
        </label>
        <span class="slash faint">/</span>
        <label class="field">
          <span class="field-label">Max</span>
          <input class="input" type="number" min="0" value={token.maxHp ?? ''} placeholder="–" on:change={(e) => setMaxHp(e.currentTarget.value)} />
        </label>
      </div>
      {#if token.maxHp !== null}
        <form class="hp-adjust" on:submit|preventDefault={() => applyHp(-1)}>
          <input class="input" type="number" min="0" placeholder="Amount" bind:value={amount} aria-label="HP amount" />
          <button type="button" class="btn btn-sm dmg" disabled={!amount} on:click={() => applyHp(-1)}>Damage</button>
          <button type="button" class="btn btn-sm heal" disabled={!amount} on:click={() => applyHp(1)}>Heal</button>
        </form>
      {/if}
    </div>

    <div class="grid2">
      <label class="field">
        <span class="field-label">Initiative</span>
        <input class="input" type="number" value={token.initiative ?? ''} placeholder="–" on:change={(e) => onChange((t) => { t.initiative = num(e.currentTarget.value); })} />
      </label>
      <label class="field">
        <span class="field-label">Size</span>
        <select class="input" value={token.size} on:change={(e) => onChange((t) => { t.size = Number(e.currentTarget.value); })}>
          {#each TOKEN_SIZES as s}<option value={s.value}>{s.label}</option>{/each}
        </select>
      </label>
    </div>

    <!-- Conditions -->
    <div class="stack conditions">
      <button class="cond-toggle" type="button" aria-expanded={showConditions} on:click={() => (showConditions = !showConditions)}>
        <span class="field-label">Conditions</span>
        {#if token.conditions.length}
          <span class="faint small">{token.conditions.join(', ')}</span>
        {:else}
          <span class="faint small">None</span>
        {/if}
        <span class="chev" class:open={showConditions}>▾</span>
      </button>
      {#if showConditions}
        <div class="cond-list">
          {#each CONDITIONS as c}
            <button type="button" class="cond" class:on={token.conditions.includes(c)} on:click={() => toggleCondition(c)}>{c}</button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <div class="grid2">
    <label class="field">
      <span class="field-label">Type</span>
      <select class="input" value={token.kind} on:change={(e) => onChange((t) => { t.kind = e.currentTarget.value as TokenKind; })}>
        {#each KINDS as k}<option value={k}>{KIND_LABELS[k]}</option>{/each}
      </select>
    </label>
    <div class="field">
      <span class="field-label">Colour</span>
      <div class="swatches">
        {#each SWATCHES as s}
          <button
            type="button"
            class="sw"
            class:on={token.color === s}
            style="background: {s}"
            aria-label={`Colour ${s}`}
            on:click={() => onChange((t) => { t.color = s; })}
          ></button>
        {/each}
      </div>
    </div>
  </div>

  <button class="btn btn-danger btn-sm remove" on:click={onDelete}>Remove from map</button>
</div>

<style>
  .inspector {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-4);
    border-top: 3px solid var(--c);
  }
  .head { display: flex; align-items: center; justify-content: space-between; }
  .kind { display: inline-flex; align-items: center; gap: var(--sp-2); }
  .swatch { width: 10px; height: 10px; border-radius: 50%; }
  .name { font-size: var(--fs-md); font-weight: 650; }
  .hp { display: flex; flex-direction: column; gap: var(--sp-3); }
  .hp-values { display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--sp-3); align-items: end; }
  .slash { padding-bottom: var(--sp-2); }
  .hp-adjust { display: grid; grid-template-columns: 1fr auto auto; gap: var(--sp-2); }
  .dmg { background: var(--danger-soft); color: var(--danger-text); }
  .heal { background: var(--success-soft); color: var(--success-text); }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
  .cond-toggle {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--sp-3);
    padding: 0;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .cond-toggle .small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chev { color: var(--text-muted); transition: transform 0.15s; }
  .chev.open { transform: rotate(180deg); }
  .cond-list { display: flex; flex-wrap: wrap; gap: var(--sp-1); }
  .cond {
    padding: 2px var(--sp-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--r-pill);
    background: none;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    text-transform: capitalize;
    cursor: pointer;
  }
  .cond.on { background: var(--primary-soft); border-color: var(--primary-text); color: var(--text); }
  .swatches { display: flex; flex-wrap: wrap; gap: var(--sp-1); }
  .sw {
    width: 21px;
    height: 21px;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 50%;
    cursor: pointer;
  }
  .sw.on { border-color: #fff; }
  .remove { align-self: flex-start; }
</style>
