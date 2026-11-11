<script lang="ts" context="module">
  import type { MapState, Token } from './types';

  /** Combatants in turn order: highest initiative first, players win ties */
  export function turnOrder(tokens: Token[]): Token[] {
    return tokens
      .filter((t) => t.kind !== 'marker' && t.initiative !== null)
      .sort((a, b) =>
        (b.initiative ?? 0) - (a.initiative ?? 0) ||
        Number(b.kind === 'player') - Number(a.kind === 'player') ||
        a.label.localeCompare(b.label, undefined, { numeric: true })
      );
  }

  /** Defeated non-players are skipped; players at 0 HP still get a turn (death saves) */
  const skippable = (t: Token) => t.kind !== 'player' && t.maxHp !== null && t.maxHp > 0 && (t.hp ?? 1) <= 0;

  /** Advance (dir = 1) or go back (dir = -1) one turn, updating the round counter */
  export function stepTurn(s: MapState, dir: 1 | -1) {
    const order = turnOrder(s.tokens);
    if (order.length === 0) return;
    let idx = order.findIndex((t) => t.id === s.combat.turnTokenId);
    if (idx === -1) {
      s.combat.turnTokenId = order[0].id;
      return;
    }
    for (let i = 0; i < order.length; i++) {
      idx += dir;
      if (idx >= order.length) { idx = 0; s.combat.round += 1; }
      if (idx < 0) { idx = order.length - 1; s.combat.round = Math.max(1, s.combat.round - 1); }
      if (!skippable(order[idx])) break;
    }
    s.combat.turnTokenId = order[idx].id;
  }
</script>

<script lang="ts">
  import { KIND_COLORS } from './types';

  export let state: MapState;
  export let selectedId: string | null = null;
  export let onUpdate: (fn: (s: MapState) => void, commit: boolean) => void;
  export let onSelect: (id: string) => void;

  $: order = turnOrder(state.tokens);
  $: waiting = state.tokens.filter((t) => t.kind !== 'marker' && t.initiative === null);
  $: current = state.tokens.find((t) => t.id === state.combat.turnTokenId) ?? null;
  $: unrolledNonPlayers = waiting.filter((t) => t.kind !== 'player');

  const d20 = () => 1 + Math.floor(Math.random() * 20);

  function rollMissing() {
    onUpdate((s) => {
      for (const t of s.tokens) if (t.kind !== 'marker' && t.kind !== 'player' && t.initiative === null) t.initiative = d20();
    }, true);
  }
  function start() {
    onUpdate((s) => {
      s.combat = { active: true, round: 1, turnTokenId: turnOrder(s.tokens)[0]?.id ?? null };
    }, true);
  }
  function end() {
    if (!confirm('End combat? Initiative values are kept so you can start again.')) return;
    onUpdate((s) => { s.combat = { active: false, round: 1, turnTokenId: null }; }, true);
  }
  function clearInitiative() {
    if (!confirm('Clear initiative for every token?')) return;
    onUpdate((s) => {
      s.tokens.forEach((t) => (t.initiative = null));
      s.combat = { active: false, round: 1, turnTokenId: null };
    }, true);
  }
  function setInitiative(id: string, value: string) {
    const n = value === '' ? null : Math.round(Number(value));
    onUpdate((s) => {
      const t = s.tokens.find((t) => t.id === id);
      if (t) t.initiative = Number.isFinite(n as number) ? n : null;
      if (s.combat.turnTokenId === id && n === null) stepTurn(s, 1);
    }, true);
  }
  function makeCurrent(id: string) {
    onUpdate((s) => { s.combat.turnTokenId = id; }, true);
  }

  const hpText = (t: Token) => (t.maxHp ? `${t.hp ?? t.maxHp}/${t.maxHp}` : '');
  const isDown = (t: Token) => t.maxHp !== null && t.maxHp > 0 && (t.hp ?? 1) <= 0;
</script>

<div class="tracker stack-lg">
  {#if state.combat.active}
    <div class="now card">
      <div class="round">
        <span class="eyebrow">Round</span>
        <strong>{state.combat.round}</strong>
      </div>
      <div class="who">
        <span class="eyebrow">Current turn</span>
        <strong>{current?.label ?? '–'}</strong>
      </div>
      <div class="nav">
        <button class="btn btn-outline btn-sm" on:click={() => onUpdate((s) => stepTurn(s, -1), true)} title="Previous turn">◀</button>
        <button class="btn btn-primary btn-sm" on:click={() => onUpdate((s) => stepTurn(s, 1), true)} title="Next turn (N)">Next ▶</button>
      </div>
    </div>
  {:else}
    <div class="intro">
      <p class="small muted">
        Set initiative for each token, then start combat. Players usually roll their own. Use the button to roll d20 for everyone else.
      </p>
    </div>
  {/if}

  <div class="row">
    {#if unrolledNonPlayers.length}
      <button class="btn btn-outline btn-sm" on:click={rollMissing}>🎲 Roll for {unrolledNonPlayers.length} non-player{unrolledNonPlayers.length === 1 ? '' : 's'}</button>
    {/if}
    {#if !state.combat.active}
      <button class="btn btn-primary btn-sm" disabled={order.length === 0} on:click={start}>Start combat</button>
    {:else}
      <button class="btn btn-ghost btn-sm" on:click={end}>End combat</button>
    {/if}
  </div>

  <section class="stack">
    <h4 class="eyebrow">Turn order</h4>
    {#if order.length === 0}
      <p class="faint small">Nobody has initiative yet.</p>
    {:else}
      <ol class="order">
        {#each order as t, i (t.id)}
          <li
            class:current={state.combat.active && t.id === state.combat.turnTokenId}
            class:selected={t.id === selectedId}
            class:down={isDown(t)}
          >
            <span class="pos faint">{i + 1}</span>
            <button class="name" on:click={() => onSelect(t.id)} title="Select on map">
              <span class="swatch" style="background: {t.color}; box-shadow: 0 0 0 2px {KIND_COLORS[t.kind]}"></span>
              <span class="label">{t.label}</span>
              {#if t.conditions.length}<span class="cond" title={t.conditions.join(', ')}>{t.conditions.length}</span>{/if}
            </button>
            <span class="hp small" class:low={isDown(t)}>{hpText(t)}</span>
            <input
              class="input init"
              type="number"
              value={t.initiative}
              aria-label={`Initiative for ${t.label}`}
              on:change={(e) => setInitiative(t.id, e.currentTarget.value)}
            />
            {#if state.combat.active && t.id !== state.combat.turnTokenId}
              <button class="btn btn-ghost btn-icon btn-sm jump" title="Make it this token's turn" on:click={() => makeCurrent(t.id)}>↵</button>
            {:else}
              <span class="jump"></span>
            {/if}
          </li>
        {/each}
      </ol>
    {/if}
  </section>

  {#if waiting.length}
    <section class="stack">
      <h4 class="eyebrow">Not in combat</h4>
      <ul class="order waiting">
        {#each waiting as t (t.id)}
          <li class:selected={t.id === selectedId}>
            <span class="pos"></span>
            <button class="name" on:click={() => onSelect(t.id)}>
              <span class="swatch" style="background: {t.color}; box-shadow: 0 0 0 2px {KIND_COLORS[t.kind]}"></span>
              <span class="label">{t.label}</span>
            </button>
            <span class="hp small">{hpText(t)}</span>
            <input
              class="input init"
              type="number"
              placeholder="Init"
              aria-label={`Initiative for ${t.label}`}
              on:change={(e) => setInitiative(t.id, e.currentTarget.value)}
            />
            <span class="jump"></span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if order.length && !state.combat.active}
    <button class="btn btn-ghost btn-sm clear" on:click={clearInitiative}>Clear all initiative</button>
  {/if}
</div>

<style>
  .now {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-4);
    border-color: rgba(242, 181, 82, 0.4);
    background: linear-gradient(135deg, rgba(242, 181, 82, 0.1), transparent 61.8%), var(--surface);
  }
  .round, .who { display: flex; flex-direction: column; min-width: 0; }
  .round strong { font-size: var(--fs-lg); line-height: 1; font-variant-numeric: tabular-nums; }
  .who strong { font-size: var(--fs-md); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav { display: flex; gap: var(--sp-2); }
  .order {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .order li {
    display: grid;
    grid-template-columns: 21px minmax(0, 1fr) auto 55px 26px;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-1) var(--sp-2);
    border: 1px solid transparent;
    border-radius: var(--r-md);
  }
  .order li.selected { border-color: var(--border-strong); background: var(--surface-2); }
  .order li.current {
    border-color: rgba(242, 181, 82, 0.6);
    background: rgba(242, 181, 82, 0.1);
  }
  .order li.down .label { text-decoration: line-through; color: var(--text-faint); }
  .pos { font-size: var(--fs-xs); text-align: center; font-variant-numeric: tabular-nums; }
  .current .pos { color: var(--warning); }
  .name {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    min-width: 0;
    padding: var(--sp-2) 0;
    border: none;
    background: none;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  .label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .swatch { width: 10px; height: 10px; flex: none; border-radius: 50%; }
  .cond {
    flex: none;
    min-width: 18px;
    padding: 0 4px;
    border-radius: var(--r-pill);
    background: var(--primary-soft);
    color: var(--primary-text);
    font-size: 11px;
    text-align: center;
  }
  .hp { color: var(--text-muted); font-variant-numeric: tabular-nums; }
  .hp.low { color: var(--danger-text); }
  .init { min-height: var(--control-h-sm); padding: 0 var(--sp-2); text-align: center; font-variant-numeric: tabular-nums; }
  .clear { align-self: flex-start; }
</style>
