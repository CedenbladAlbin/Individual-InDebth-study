<script lang="ts">
    import EntityCardList from "$lib/EntityCardList.svelte";

  export let scenes: any[] = [];
  export let startEdit: (type: string, data: any) => void;
  export let startConnect: (type: string, data: any) => void;
  export let openNotes: (type: string, id: string) => void;
  export let deleteContent: (type: string, id: string) => void;
</script>

<section class="game-section">
  <h3>Scenes</h3>
  <EntityCardList
    entities={scenes}
    type="scene"
    onEdit={scene => startEdit('scene', scene)}
    onConnect={scene => startConnect('scene', scene)}
    onNotes={scene => openNotes('scene', scene._id)}
    onDelete={scene => deleteContent('scene', scene._id)}
  />
</section>
