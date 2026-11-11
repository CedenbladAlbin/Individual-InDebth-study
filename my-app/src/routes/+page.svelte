<script lang="ts">
  import { onMount } from 'svelte';
  import { getToken } from '$lib/api';

  let signedIn = false;
  onMount(() => { signedIn = !!getToken(); });

  const features = [
    { type: 'scene', title: 'Scenes & maps', text: 'Upload a battle map, drop markers and split the table into teams while you play.' },
    { type: 'npc', title: 'NPCs, players & loot', text: 'Keep every character and item in one place, with notes you can find mid-session.' },
    { type: 'player', title: 'Drag to connect', text: 'Drop an item on a player or an NPC on a scene. Ownership and locations stay in sync.' },
    { type: 'item', title: 'Session log', text: 'Plan upcoming sessions, record what happened and pick up exactly where you left off.' }
  ];
</script>

<svelte:head>
  <title>DnD Session Manager</title>
</svelte:head>

<main class="page">
  <section class="hero">
    <div class="hero-text">
      <span class="eyebrow">For Dungeon Masters</span>
      <h1>Run the story, not the paperwork.</h1>
      <p class="lead">
        Organise your campaigns, keep track of NPCs, players and loot, and have every note ready when the dice start rolling.
      </p>
      <div class="row hero-actions">
        {#if signedIn}
          <a href="/my-games" class="btn btn-primary btn-lg">Open my games</a>
        {:else}
          <a href="/signup" class="btn btn-primary btn-lg">Get started, it's free</a>
          <a href="/login" class="btn btn-outline btn-lg">Sign in</a>
        {/if}
      </div>
    </div>

    <div class="hero-visual" aria-hidden="true">
      <div class="preview card">
        <div class="preview-head">
          <span class="eyebrow">Session 3</span>
          <span class="badge badge-primary">Upcoming</span>
        </div>
        <p class="preview-title">The Goblin Hideout</p>
        <div class="preview-chips">
          <span class="chip" data-type="scene"><span class="dot"></span>Cragmaw Cave</span>
          <span class="chip" data-type="npc"><span class="dot"></span>Klarg</span>
          <span class="chip" data-type="player"><span class="dot"></span>Aria</span>
          <span class="chip" data-type="item"><span class="dot"></span>Potion of Healing</span>
        </div>
        <div class="preview-lines">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  </section>

  <section class="features" aria-label="Features">
    {#each features as f}
      <article class="feature card" data-type={f.type}>
        <span class="feature-bar"></span>
        <h3>{f.title}</h3>
        <p class="muted">{f.text}</p>
      </article>
    {/each}
  </section>
</main>

<style>
  /* Text and visual split the hero 1 : 1/φ (61.8% / 38.2%) */
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.618fr) minmax(0, 1fr);
    align-items: center;
    gap: var(--sp-7);
    padding: var(--sp-8) 0 var(--sp-7);
  }
  .hero-text {
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
    max-width: 610px;
  }
  .hero h1 {
    font-size: var(--fs-2xl);
    line-height: 1.12;
  }
  .hero-actions { margin-top: var(--sp-3); }

  /* Golden rectangle preview card */
  .preview {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    aspect-ratio: 1.618 / 1;
    padding: var(--sp-5);
    background: linear-gradient(160deg, var(--surface-2), var(--surface));
    box-shadow: var(--shadow-lg);
    transform: rotate(-1.5deg);
  }
  .preview-head { display: flex; justify-content: space-between; align-items: center; }
  .preview-title { font-size: var(--fs-md); font-weight: 650; }
  .preview-chips { display: flex; flex-wrap: wrap; gap: var(--sp-3); }
  .preview-lines { display: flex; flex-direction: column; gap: var(--sp-3); margin-top: auto; }
  .preview-lines span { height: 8px; border-radius: var(--r-pill); background: var(--surface-3); }
  .preview-lines span:nth-child(1) { width: 100%; }
  .preview-lines span:nth-child(2) { width: 61.8%; }
  .preview-lines span:nth-child(3) { width: 38.2%; }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 233px), 1fr));
    gap: var(--sp-5);
  }
  .feature {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .feature h3 { font-size: var(--fs-base); }
  .feature-bar {
    width: var(--sp-6);
    height: 3px;
    border-radius: var(--r-pill);
    background: var(--type-color);
    margin-bottom: var(--sp-2);
  }

  @media (max-width: 987px) {
    .hero { grid-template-columns: 1fr; padding: var(--sp-6) 0; }
    .hero-visual { max-width: 377px; }
  }
  @media (max-width: 610px) {
    .hero h1 { font-size: var(--fs-xl); }
    .hero-actions .btn { flex: 1; }
  }
</style>
