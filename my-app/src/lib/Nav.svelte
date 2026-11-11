<script lang="ts">
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { getToken, clearToken } from '$lib/api';
  import favicon from '$lib/assets/favicon.svg';

  let signedIn = false;
  let menuOpen = false;

  onMount(() => { signedIn = !!getToken(); });
  afterNavigate(() => {
    signedIn = !!getToken();
    menuOpen = false;
  });

  function signOut() {
    clearToken();
    window.location.href = '/';
  }

  $: path = $page.url.pathname;
  $: inGames = path.startsWith('/my-games') || path.startsWith('/game/') || path.startsWith('/session/');
</script>

<header class="topbar">
  <div class="topbar-inner">
    <a href={signedIn ? '/my-games' : '/'} class="brand">
      <img src={favicon} alt="" width="26" height="26" />
      <span>DnD Session Manager</span>
    </a>

    <button
      class="btn btn-ghost btn-icon menu-toggle"
      aria-label="Menu"
      aria-expanded={menuOpen}
      aria-controls="main-nav"
      on:click={() => (menuOpen = !menuOpen)}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        {#if menuOpen}
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        {:else}
          <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        {/if}
      </svg>
    </button>

    <nav id="main-nav" class="nav" class:open={menuOpen} aria-label="Main">
      {#if signedIn}
        <a href="/my-games" class="nav-link" aria-current={inGames ? 'page' : undefined}>My games</a>
        <a href="/games" class="btn btn-primary btn-sm" aria-current={path === '/games' ? 'page' : undefined}>+ New game</a>
        <button class="btn btn-ghost btn-sm" on:click={signOut}>Sign out</button>
      {:else}
        <a href="/login" class="nav-link" aria-current={path === '/login' ? 'page' : undefined}>Sign in</a>
        <a href="/signup" class="btn btn-primary btn-sm">Get started</a>
      {/if}
    </nav>
  </div>
</header>

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(18, 20, 25, 0.86);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border);
  }
  .topbar-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-4);
    max-width: var(--w-page);
    height: var(--sp-7);
    margin: 0 auto;
    padding: 0 var(--sp-5);
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-3);
    color: var(--text);
    font-weight: 700;
    letter-spacing: -0.01em;
    text-decoration: none;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
  }
  .nav-link {
    position: relative;
    display: inline-flex;
    align-items: center;
    height: var(--sp-7);
    color: var(--text-muted);
    font-weight: 600;
    text-decoration: none;
  }
  .nav-link:hover,
  .nav-link[aria-current='page'] {
    color: var(--text);
  }
  .nav-link[aria-current='page']::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: var(--primary-text);
  }
  .menu-toggle {
    display: none;
  }

  @media (max-width: 610px) {
    .topbar-inner { padding: 0 var(--sp-4); }
    .menu-toggle { display: inline-flex; }
    .nav {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      display: none;
      flex-direction: column;
      align-items: stretch;
      gap: var(--sp-3);
      padding: var(--sp-4);
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
    }
    .nav.open { display: flex; }
    .nav .btn { min-height: var(--control-h); font-size: var(--fs-base); }
    .nav-link { height: auto; padding: var(--sp-2) 0; }
    .nav-link[aria-current='page']::after { display: none; }
  }
</style>
