<script lang="ts">
    import EntityCardList from "$lib/EntityCardList.svelte";

  export let npcs: any[] = [];
  export let startEdit: (type: string, data: any) => void;
  export let startConnect: (type: string, data: any) => void;
  export let openNotes: (type: string, id: string) => void;
  export let deleteContent: (type: string, id: string) => void;
</script>

<section class="game-section">
  <h3>NPCs</h3>
  <EntityCardList
    entities={npcs}
    type="npc"
    onEdit={npc => startEdit('npc', npc)}
    onConnect={npc => startConnect('npc', npc)}
    onNotes={npc => openNotes('npc', npc._id)}
    onDelete={npc => deleteContent('npc', npc._id)}
  />
</section>
