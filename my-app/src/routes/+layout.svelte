
<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Nav from '$lib/Nav.svelte';
	let { children } = $props();
</script>


<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Nav />

{@render children?.()}

<style>
	:global(body){
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		background-color: var(--color-bg-accent);
	}
</style>