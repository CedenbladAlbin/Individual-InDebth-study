<script lang="ts">
  import EntityCardList from "$lib/EntityCardList.svelte";
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();

  // Generic props for any entity type
  export let entities: any[] = [];
  export let entityType: 'npc' | 'player' | 'item' | 'scene';
  export let itemMap: { [key: string]: any } = {};
  export let npcMap: { [key: string]: any } = {};
  export let sceneMap: { [key: string]: any } = {};
  export let playerMap: { [key: string]: any } = {};
  
  // Function props
  export let startCreate: (type: string, data: any) => void;
  export let startEdit: (type: string, data: any) => void;
  export let startConnect: (type: string, data: any) => void;
  export let openNotes: (type: string, id: string) => void;
  export let deleteContent: (type: string, id: string) => void;
  export let onRemoveConnection: (type: string, entity: any, targetId: string) => void;
</script>

<section class="game-section">
  <EntityCardList
    {entities}
    type={entityType}
    onCreate={entity => startCreate(entityType, entity)}
    onEdit={entity => startEdit(entityType, entity)}
    onNotes={entity => openNotes(entityType, entity._id)}
    onDelete={entity => deleteContent(entityType, entity._id)}
    {onRemoveConnection}
    {itemMap}
    {npcMap}
    {sceneMap}
    on:entityClick={e => dispatch('entityClick', e.detail)}
  />
</section>