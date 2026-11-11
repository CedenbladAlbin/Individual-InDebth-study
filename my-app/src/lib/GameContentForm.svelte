<script lang="ts" context="module">
  export type EntityType = 'npc' | 'player' | 'item' | 'scene';

  /** Extra fields per type: [key, label, placeholder] */
  export const FIELDS: Record<EntityType, [string, string, string][]> = {
    scene: [['location', 'Location', 'e.g. Port Varrow'], ['dangerLevel', 'Danger level', 'e.g. Low, High']],
    npc: [['role', 'Role', 'e.g. Merchant, Villain'], ['status', 'Status', 'e.g. Friendly, Hostile']],
    player: [['class', 'Class', 'e.g. Wizard'], ['level', 'Level', 'e.g. 3']],
    item: [['itemType', 'Type', 'e.g. Weapon, Potion'], ['benefits', 'Benefits', 'e.g. +1 to hit']]
  };

  export const GROUP_HINT: Record<EntityType, string> = {
    npc: 'e.g. a city, clan or faction',
    scene: 'e.g. a region or island',
    player: 'e.g. Main party, Retired',
    item: 'e.g. Loot act 2, Quest items'
  };
</script>

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { api } from '$lib/api';

  export let type: EntityType;
  export let gameId: string;
  /** When set, the form edits this entity instead of creating a new one */
  export let entity: any = null;
  /** Existing group names, offered as suggestions */
  export let groups: string[] = [];
  export let defaultGroup = '';

  const dispatch = createEventDispatcher();
  const listId = `groups-${Math.random().toString(36).slice(2, 8)}`;

  const NAME_PLACEHOLDER: Record<EntityType, string> = {
    scene: 'e.g. The Rusty Anchor',
    npc: 'e.g. Mara Quickwhistle',
    player: 'e.g. Aria the Ranger',
    item: 'e.g. Potion of Healing'
  };

  let name = entity?.name ?? '';
  let description = entity?.description ?? '';
  let group = entity ? entity.group ?? '' : defaultGroup;
  let extra: Record<string, string> = Object.fromEntries(FIELDS[type].map(([k]) => [k, entity?.[k] ?? '']));
  let error = '';
  let loading = false;
  let nameInput: HTMLInputElement;

  // Wait a tick so this runs after the surrounding modal has taken focus
  onMount(() => { setTimeout(() => nameInput?.focus()); });

  async function handleSubmit() {
    loading = true;
    error = '';
    const data = { name, description, group, ...extra };
    try {
      const res = entity
        ? await api('/api/game-content', { method: 'PATCH', body: JSON.stringify({ type, ids: [entity._id], data }) })
        : await api('/api/game-content', { method: 'POST', body: JSON.stringify({ type, gameId, data }) });
      if (res.ok) {
        dispatch(entity ? 'saved' : 'created', await res.json());
      } else {
        error = (await res.json().catch(() => ({}))).message || 'Failed to save.';
      }
    } catch {
      error = 'Failed to save.';
    }
    loading = false;
  }
</script>

<form class="stack-lg" on:submit|preventDefault={handleSubmit}>
  {#if error}<div class="alert alert-error" role="alert">{error}</div>{/if}
  <div class="name-row">
    <label class="field">
      <span class="field-label">Name</span>
      <input class="input" type="text" maxlength="200" placeholder={NAME_PLACEHOLDER[type]} bind:value={name} bind:this={nameInput} required />
    </label>
    <label class="field">
      <span class="field-label">Group <span class="faint">(optional)</span></span>
      <input class="input" type="text" maxlength="60" list={listId} placeholder={GROUP_HINT[type]} bind:value={group} />
      <datalist id={listId}>{#each groups as g}<option value={g}></option>{/each}</datalist>
    </label>
  </div>
  <label class="field">
    <span class="field-label">Description <span class="faint">(optional)</span></span>
    <textarea class="input" rows="3" bind:value={description}></textarea>
  </label>
  <div class="form-grid">
    {#each FIELDS[type] as [key, label, placeholder]}
      <label class="field">
        <span class="field-label">{label} <span class="faint">(optional)</span></span>
        <input class="input" type="text" {placeholder} bind:value={extra[key]} />
      </label>
    {/each}
  </div>
  <div class="row-end">
    <button type="button" class="btn btn-ghost" on:click={() => dispatch('cancel')}>Cancel</button>
    <button type="submit" class="btn btn-primary" disabled={loading || !name.trim()}>
      {loading ? 'Saving…' : entity ? 'Save changes' : 'Create'}
    </button>
  </div>
</form>

<style>
  /* name : group = φ : 1 */
  .name-row {
    display: grid;
    grid-template-columns: minmax(0, 1.618fr) minmax(0, 1fr);
    gap: var(--sp-4);
  }
  @media (max-width: 610px) {
    .name-row { grid-template-columns: 1fr; }
  }
</style>
