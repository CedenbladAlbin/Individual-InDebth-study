<script lang="ts">
    import EntityCardList from "$lib/EntityCardList.svelte";
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

  export let scenes: any[] = [];
  export let itemMap: { [key: string]: any } = {};
  export let npcMap: { [key: string]: any } = {};
  export let sceneMap: { [key: string]: any } = {};
  export let startCreate: (type: string, data: any) => void;
  export let startConnect: (type: string, data: any) => void;
  export let openNotes: (type: string, id: string) => void;
  export let deleteContent: (type: string, id: string) => void;
  export let onRemoveConnection: (type: string, entity: any, targetId: string) => void;
</script>

<section class="game-section">
  <EntityCardList
    entities={scenes}
    type="scene"
    onCreate={scene => startCreate('scene', scene)}
    onNotes={scene => openNotes('scene', scene._id)}
    onDelete={scene => deleteContent('scene', scene._id)}
    onRemoveConnection={onRemoveConnection}
    itemMap={itemMap}
    npcMap={npcMap}
    sceneMap={sceneMap}
    on:entityClick={e => dispatch('entityClick', e.detail)}
  />
</section>
