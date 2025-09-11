<script lang="ts">
    import EntityCardList from "$lib/EntityCardList.svelte";

  export let items: any[] = [];
  export let startEdit: (type: string, data: any) => void;
  export let startConnect: (type: string, data: any) => void;
  export let openNotes: (type: string, id: string) => void;
  export let deleteContent: (type: string, id: string) => void;
</script>

<section class="game-section">
  <h3>Items</h3>
  <EntityCardList
    entities={items}
    type="item"
    onEdit={item => startEdit('item', item)}
    onConnect={item => startConnect('item', item)}
    onNotes={item => openNotes('item', item._id)}
    onDelete={item => deleteContent('item', item._id)}
  />
</section>
