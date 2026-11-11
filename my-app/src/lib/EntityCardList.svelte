<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type EntityType = 'scene' | 'npc' | 'player' | 'item';

  export let entities: any[] = [];
  export let type: EntityType;
  export let onCreate = () => {};
  export let onNotes = (entity: any) => {};
  export let onDelete = (entity: any) => {};
  export let onRemoveConnection = (type: string, entity: any, targetId: string) => {};
  export let itemMap: { [key: string]: any } = {};
  export let npcMap: { [key: string]: any } = {};
  export let sceneMap: { [key: string]: any } = {};
  export let playerMap: { [key: string]: any } = {};

  const dispatch = createEventDispatcher();

  // Long campaigns can have hundreds of entries; show them in pages
  const PAGE = 24;
  let limit = PAGE;
  $: visible = entities.slice(0, limit);

  const LABELS: Record<EntityType, { one: string; many: string; hint: string }> = {
    scene: { one: 'scene', many: 'scenes', hint: 'Scenes are the places your party visits. Open one to use the battle map.' },
    npc: { one: 'NPC', many: 'NPCs', hint: 'Add the characters your players will meet, from shopkeepers to villains.' },
    player: { one: 'player', many: 'players', hint: 'Add the characters in your party to track their gear.' },
    item: { one: 'item', many: 'items', hint: 'Add loot, quest items and gear, then drag them onto their owner.' }
  };

  /** Key/value details shown on each card, per type */
  function details(entity: any): [string, string][] {
    const pairs: [string, any][] =
      type === 'scene' ? [['Location', entity.location], ['Danger', entity.dangerLevel]]
      : type === 'npc' ? [['Role', entity.role], ['Status', entity.status]]
      : type === 'player' ? [['Class', entity.class], ['Level', entity.level]]
      : [['Type', entity.itemType], ['Benefits', entity.benefits]];
    return pairs.filter(([, v]) => v);
  }

  function open(entity: any) {
    dispatch('entityClick', entity);
  }
  function onKeydown(e: KeyboardEvent, entity: any) {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open(entity);
    }
  }
</script>

{#if entities.length === 0}
  <div class="empty-state" data-type={type}>
    <h3>No {LABELS[type].many} yet</h3>
    <p>{LABELS[type].hint}</p>
    <button class="btn btn-primary" on:click={onCreate}>+ New {LABELS[type].one}</button>
  </div>
{:else}
  <ul class="card-grid">
    {#each visible as entity (entity._id)}
      <li>
      <div
        class="entity-card"
        data-type={type}
        role="button"
        tabindex="0"
        aria-label={`Open ${entity.name}`}
        on:click={() => open(entity)}
        on:keydown={(e) => onKeydown(e, entity)}
      >
        <div class="card-head">
          <h3>{entity.name}</h3>
          {#if type === 'npc' && entity.status}
            <span class="badge">{entity.status}</span>
          {/if}
        </div>

        {#if entity.description}
          <p class="desc muted">{entity.description}</p>
        {/if}

        {#if details(entity).length}
          <dl class="details">
            {#each details(entity) as [label, value]}
              <div><dt>{label}</dt><dd>{value}</dd></div>
            {/each}
          </dl>
        {/if}

        <div class="links">
          {#if type === 'npc'}
            {#if entity.sceneId}
              <span class="chip" data-type="scene">
                <span class="dot"></span><span class="chip-label">{sceneMap[entity.sceneId]?.name || 'Unknown scene'}</span>
                <button class="chip-remove" title="Remove from scene" aria-label="Remove from scene"
                  on:click|stopPropagation={() => onRemoveConnection('npc-scene', entity, entity.sceneId)}>×</button>
              </span>
            {/if}
            {#each entity.itemIds || [] as itemId}
              <span class="chip" data-type="item">
                <span class="dot"></span><span class="chip-label">{itemMap[itemId]?.name || 'Unknown item'}</span>
                <button class="chip-remove" title="Remove item" aria-label="Remove item"
                  on:click|stopPropagation={() => onRemoveConnection('item-npc', { _id: itemId }, entity._id)}>×</button>
              </span>
            {/each}
          {:else if type === 'player'}
            {#each entity.itemIds || [] as itemId}
              <span class="chip" data-type="item">
                <span class="dot"></span><span class="chip-label">{itemMap[itemId]?.name || 'Unknown item'}</span>
                <button class="chip-remove" title="Remove item" aria-label="Remove item"
                  on:click|stopPropagation={() => onRemoveConnection('item-player', { _id: itemId }, entity._id)}>×</button>
              </span>
            {/each}
          {:else if type === 'scene'}
            {#each Object.values(npcMap).filter((n) => n.sceneId === entity._id) as npc (npc._id)}
              <span class="chip" data-type="npc">
                <span class="dot"></span><span class="chip-label">{npc.name}</span>
                <button class="chip-remove" title="Remove NPC from scene" aria-label="Remove NPC from scene"
                  on:click|stopPropagation={() => onRemoveConnection('npc-scene', npc, entity._id)}>×</button>
              </span>
            {/each}
            {#each Object.values(itemMap).filter((i) => i.sceneId === entity._id) as item (item._id)}
              <span class="chip" data-type="item">
                <span class="dot"></span><span class="chip-label">{item.name}</span>
                <button class="chip-remove" title="Remove item from scene" aria-label="Remove item from scene"
                  on:click|stopPropagation={() => onRemoveConnection('item-scene', item, entity._id)}>×</button>
              </span>
            {/each}
          {:else if type === 'item'}
            {#if entity.ownerPlayerId}
              <span class="chip" data-type="player">
                <span class="dot"></span><span class="chip-label">{playerMap[entity.ownerPlayerId]?.name || 'Unknown player'}</span>
                <button class="chip-remove" title="Remove from player" aria-label="Remove from player"
                  on:click|stopPropagation={() => onRemoveConnection('item-player', entity, entity.ownerPlayerId)}>×</button>
              </span>
            {:else if entity.ownerNpcId}
              <span class="chip" data-type="npc">
                <span class="dot"></span><span class="chip-label">{npcMap[entity.ownerNpcId]?.name || 'Unknown NPC'}</span>
                <button class="chip-remove" title="Remove from NPC" aria-label="Remove from NPC"
                  on:click|stopPropagation={() => onRemoveConnection('item-npc', entity, entity.ownerNpcId)}>×</button>
              </span>
            {:else if entity.sceneId}
              <span class="chip" data-type="scene">
                <span class="dot"></span><span class="chip-label">{sceneMap[entity.sceneId]?.name || 'Unknown scene'}</span>
                <button class="chip-remove" title="Remove from scene" aria-label="Remove from scene"
                  on:click|stopPropagation={() => onRemoveConnection('item-scene', entity, entity.sceneId)}>×</button>
              </span>
            {:else}
              <span class="faint small">Not assigned</span>
            {/if}
          {/if}
        </div>

        <div class="card-actions">
          {#if type === 'scene'}
            <button class="btn btn-ghost btn-sm open-hint" on:click|stopPropagation={() => dispatch('openMap', entity)}>Open map →</button>
          {/if}
          <button class="btn btn-ghost btn-sm" on:click|stopPropagation={() => onNotes(entity)}>Notes</button>
          <button class="btn btn-danger btn-sm" on:click|stopPropagation={() => onDelete(entity)}>Delete</button>
        </div>
      </div>
      </li>
    {/each}
  </ul>
  {#if entities.length > limit}
    <div class="more">
      <span class="faint small">Showing {limit} of {entities.length}</span>
      <button class="btn btn-outline btn-sm" on:click={() => (limit += PAGE)}>Show {Math.min(PAGE, entities.length - limit)} more</button>
      <button class="btn btn-ghost btn-sm" on:click={() => (limit = entities.length)}>Show all</button>
    </div>
  {/if}
{/if}

<style>
  .more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-3);
    margin-top: var(--sp-5);
  }
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 233px), 1fr));
    gap: var(--sp-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .entity-card {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-4) var(--sp-4) var(--sp-3);
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .entity-card::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: var(--type-color);
  }
  .entity-card:hover {
    border-color: var(--border-strong);
    background: var(--surface-2);
  }
  .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--sp-3);
  }
  .card-head h3 {
    font-size: var(--fs-base);
    overflow-wrap: anywhere;
  }
  .desc {
    font-size: var(--fs-xs);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .details {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2) var(--sp-4);
    margin: 0;
    font-size: var(--fs-xs);
  }
  .details div { display: flex; gap: var(--sp-2); }
  .details dt { color: var(--text-faint); }
  .details dd { margin: 0; }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
  }
  .links:empty { display: none; }
  .card-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--sp-1);
    margin-top: auto;
    padding-top: var(--sp-3);
    border-top: 1px solid var(--border);
  }
  .open-hint {
    margin-right: auto;
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--type-color);
  }
</style>
