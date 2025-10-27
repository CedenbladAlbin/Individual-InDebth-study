<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let entities: any[] = [];
  export let type = '';
  export let onCreate = (entity: any) => {};
  export let onEdit = (entity: any) => {};
  export let onNotes = (entity: any) => {};
  export let onDelete = (entity: any) => {};
  export let onRemoveConnection = (type: string, entity: any, targetId: string) => {};
  export let itemMap: { [key: string]: any } = {};
  export let npcMap: { [key: string]: any } = {};
  export let sceneMap: { [key: string]: any } = {};

  const dispatch = createEventDispatcher();
  function handleCardKeydown(event: KeyboardEvent, entity: any) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dispatch('entityClick', entity);
    }
  }
</script>
  <button id="createNew-btn" on:click={onCreate}>Create New {type}</button>
<div class="card-list">
  {#each entities as entity}
    <div
      class="card {type === 'scene' ? 'scene-card' : ''}"
      role="button"
      tabindex="0"
      on:click={() => dispatch('entityClick', entity)}
      on:keydown={(e) => handleCardKeydown(e, entity)}
    >
      <div class="card-header">
        <div class="card-title">{entity.name}</div>
      </div>
      <div class="card-desc">{entity.description}</div>
      {#if type === 'scene' && (entity.location || entity.dangerLevel)}
        <div class="card-meta">
          {#if entity.location}<span>Location: {entity.location}</span>{/if}
          {#if entity.dangerLevel}<span>Danger: {entity.dangerLevel}</span>{/if}
        </div>
      {/if}
      {#if type === 'npc' && (entity.role || entity.status)}
        <div class="card-meta">
          {#if entity.role}<span>Role: {entity.role}</span>{/if}
          {#if entity.status}<span>Status: {entity.status}</span>{/if}
        </div>
      {/if}
      {#if type === 'player' && (entity.class || entity.level)}
        <div class="card-meta">
          {#if entity.class}<span>Class: {entity.class}</span>{/if}
          {#if entity.level}<span>Level: {entity.level}</span>{/if}
        </div>
      {/if}
      {#if type === 'item' && (entity.itemType || entity.benefits)}
        <div class="card-meta">
          {#if entity.itemType}<span>Type: {entity.itemType}</span>{/if}
          {#if entity.benefits}<span>Benefits: {entity.benefits}</span>{/if}
        </div>
      {/if}
      <div class="card-connections">


        {#if type === 'npc'}
          {#if entity.sceneId || entity.scene}
          {@const sid = entity.sceneId || (entity.scene && entity.scene._id)}
            <span class="chip">
              Scene: {sceneMap[sid]?.name || entity.scene?.name || sid}
              <button class="chip-remove" title="Remove from scene"
                on:click|stopPropagation={() => onRemoveConnection('npc-scene', entity, sid)}>×</button>
            </span>
          {/if}
          {#if entity.itemIds && entity.itemIds.length}
              {#each entity.itemIds as itemId}
                <span class="chip">{entity.items && entity.items.find((i: any) => i._id === itemId)?.name || itemMap[itemId]?.name || itemId}
                  <button class="chip-remove" title="Remove item from NPC" on:click|stopPropagation={() => onRemoveConnection('item-npc', { _id: itemId }, entity._id)}>×</button>
                </span>
              {/each}
          {/if}
        {/if}

        {#if type === 'scene'}
          {#if entity.npcIds && entity.npcIds.length}
            {#each entity.npcIds as npcId}
                <span class="chip">{entity.npcs && entity.npcs.find((n: any) => n._id === npcId)?.name || npcMap[npcId]?.name || npcId}
                  <button class="chip-remove" title="Remove NPC from scene" on:click|stopPropagation={() => onRemoveConnection('npc-scene', { _id: npcId }, entity._id)}>×</button>
                </span>
              {/each}
          {/if}
        {/if}

        {#if type === 'item'}
          {#if entity.ownerPlayer}
            <span class="chip">Owner: {entity.ownerPlayer.name}
              <button class="chip-remove" title="Remove from player" on:click|stopPropagation={() => onRemoveConnection('item-player', entity, entity.ownerPlayer._id)}>×</button>
            </span>
          {:else if entity.ownerNpc}
            <span class="chip">Owner: {entity.ownerNpc.name}
              <button class="chip-remove" title="Remove from NPC" on:click|stopPropagation={() => onRemoveConnection('item-npc', entity, entity.ownerNpc._id)}>×</button>
            </span>
          {:else if entity.sceneId || entity.scene}
            {@const sid = entity.sceneId || (entity.scene && entity.scene._id)}
            <span class="chip">Scene: {sceneMap[sid]?.name || entity.scene?.name || sid}
              <button class="chip-remove" title="Remove from scene" on:click|stopPropagation={() => onRemoveConnection('item-scene', entity, sid)}>×</button>
            </span>
          {/if}
        {/if}

        {#if type === 'player'}
          {#if entity.itemIds && entity.itemIds.length}
            {#each entity.itemIds as itemId}
                <span class="chip">{entity.items && entity.items.find((i: any) => i._id === itemId)?.name || (typeof itemMap !== 'undefined' && itemMap[itemId]?.name) || itemId}
                  <button class="chip-remove" title="Remove item from player" on:click|stopPropagation={() => onRemoveConnection('item-player', { _id: itemId }, entity._id)}>×</button>
                </span>
              {/each}
          {/if}
        {/if}
      </div>
      <div class="card-actions">
        <button class="edit-btn" on:click|stopPropagation={() => onEdit(entity)}>Edit</button>
        <button on:click|stopPropagation={() => onNotes(entity)}>Notes</button>
        <button class="delete-btn" on:click|stopPropagation={() => onDelete(entity)}>Delete</button>
      </div>
    </div>
  {/each}
</div>

<style>
.chip-remove {
  background: none;
  border: none;
  color: var(--color-text-accent);
  font-size: 1.1em;
  margin-left: 0.3em;
  cursor: pointer;
  padding: 0 0.2em;
  line-height: 1;
}
.chip-remove:hover {
  color: var(--color-bg-danger);
}
  #createNew-btn {
    background: var(--color-bg-button);
    color: var(--color-text-main);
    border: none;
    border-radius: 4px;
    padding: 0.5em 1em;
    cursor: pointer;
    font-size: 1em;
    transition: background 0.15s;
  }

.card-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2em;
  margin-top: 1em;
}
.card {
  background: var(--color-bg-main);
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.10);
  padding: 1em 1.2em 0.7em 1.2em;
  min-width: 220px;
  max-width: 260px;
  flex: 1 1 220px;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.scene-card {
  position: relative;
}

.scene-card::after {
  content: 'Click ⛶ to open map view';
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--color-primary);
  color: white;
  font-size: 0.75em;
  padding: 0.25em 0.5em;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
}

.scene-card:hover::after {
  opacity: 1;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.2em;
}

.card-title {
  font-weight: bold;
  font-size: 1.15em;
  color: var(--color-text-accent);
  flex: 1;
}

.fullscreen-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  opacity: 0.7;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 0.5em;
  cursor: pointer;
  padding: 0.25em;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-btn:hover,
.card:hover .fullscreen-btn {
  opacity: 1;
  color: var(--color-text-accent);
  background: var(--color-bg-button);
  transform: scale(1.1);
}
.card-desc {
  color: var(--color-text-secondary);
  font-size: 1em;
}
.card-meta {
  font-size: 0.95em;
  color: var(--color-text-accent);
  display: flex;
  flex-direction: column;
  gap: 0.1em;
}
.card-actions {
  margin-top: 0.7em;
  display: flex;
  gap: 0.5em;
}
.card-actions button {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 4px;
  padding: 0.2em 0.8em;
  cursor: pointer;
  font-size: 0.95em;
  transition: background 0.15s;
}
.card-actions button:hover {
  background: var(--color-bg-button-hover);
}
.card-actions .edit-btn {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: white;
  font-weight: 600;
  border: none;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);
}
.card-actions .edit-btn:hover {
  background: linear-gradient(135deg, #4338ca, #4f46e5);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(79, 70, 229, 0.4);
}
.card-actions .delete-btn {
  background: var(--color-bg-danger);
}
.card-actions .delete-btn:hover {
  background: var(--color-bg-danger-dark);
}


.card-connections {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em;
  margin-bottom: 0.3em;
  margin-top: 0.2em;
}
.chip {
  background: var(--color-bg-button);
  color: var(--color-text-accent);
  border-radius: 12px;
  padding: 0.15em 0.7em;
  font-size: 0.92em;
  display: inline-block;
  margin-right: 0.2em;
}

</style>
