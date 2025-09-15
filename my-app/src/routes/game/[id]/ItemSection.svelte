<script lang="ts">
    import EntityCardList from "$lib/EntityCardList.svelte";

  export let items: any[] = [];
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
    entities={items}
    type="item"
    onCreate={item => startCreate('item', item)}
    onNotes={item => openNotes('item', item._id)}
    onDelete={item => deleteContent('item', item._id)}
    onRemoveConnection={onRemoveConnection}
    itemMap={itemMap}
    npcMap={npcMap}
    sceneMap={sceneMap}
    on:entityClick
  />
</section>
