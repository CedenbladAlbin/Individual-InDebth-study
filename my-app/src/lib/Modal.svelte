<script lang="ts">
  import { onMount } from 'svelte';

  export let title: string;
  export let onClose: () => void;
  export let size: 'sm' | 'md' | 'lg' = 'md';

  const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`;
  let dialog: HTMLDivElement;

  onMount(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  });

  let backdrop: HTMLDivElement;
  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    // With stacked modals (e.g. a picker opened from a detail view) only the top one closes
    const all = document.querySelectorAll('.modal-backdrop');
    if (all[all.length - 1] === backdrop) onClose();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" role="presentation" bind:this={backdrop} on:click|self={onClose}>
  <div
    class="modal modal-{size}"
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    tabindex="-1"
    bind:this={dialog}
  >
    <header class="modal-header">
      <div class="modal-heading">
        <slot name="eyebrow" />
        <h2 id={titleId}>{title}</h2>
      </div>
      <button type="button" class="btn btn-ghost btn-icon" aria-label="Close" on:click={onClose}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
      </button>
    </header>
    <div class="modal-body">
      <slot />
    </div>
    {#if $$slots.footer}
      <footer class="modal-footer">
        <slot name="footer" />
      </footer>
    {/if}
  </div>
</div>

<style>
  .modal-heading {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    min-width: 0;
  }
</style>
