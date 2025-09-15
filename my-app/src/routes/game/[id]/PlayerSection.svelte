<script lang="ts">
    import EntityCardList from "$lib/EntityCardList.svelte";
    
  export let players: any[] = [];
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
    entities={players}
    type="player"
    onCreate={player => startCreate('player', player)}
    onNotes={player => openNotes('player', player._id)}
    onDelete={player => deleteContent('player', player._id)}
    onRemoveConnection={onRemoveConnection}
    itemMap={itemMap}
    npcMap={npcMap}
    sceneMap={sceneMap}
    on:entityClick
  />
</section>
