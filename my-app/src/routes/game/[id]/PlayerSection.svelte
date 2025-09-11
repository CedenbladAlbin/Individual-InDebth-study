<script lang="ts">
    import EntityCardList from "$lib/EntityCardList.svelte";
    
  export let players: any[] = [];
  export let startEdit: (type: string, data: any) => void;
  export let startConnect: (type: string, data: any) => void;
  export let openNotes: (type: string, id: string) => void;
  export let deleteContent: (type: string, id: string) => void;
</script>

<section class="game-section">
  <h3>Players</h3>
  <EntityCardList
    entities={players}
    type="player"
    onEdit={player => startEdit('player', player)}
    onConnect={player => startConnect('player', player)}
    onNotes={player => openNotes('player', player._id)}
    onDelete={player => deleteContent('player', player._id)}
  />
</section>
