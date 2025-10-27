<script>
  export let user = null;
  let menuOpen = false;
  function toggleMenu() {
    menuOpen = !menuOpen;
  }
  function closeMenu() {
    menuOpen = false;
  }
</script>

<nav class="navbar">
  <a href="/" class="logo">DnD Session Manager</a>
  <button class="hamburger" aria-label="Toggle menu" on:click={toggleMenu} aria-expanded={menuOpen}>
    <span class="bar"></span>
    <span class="bar"></span>
    <span class="bar"></span>
  </button>
  <div class="nav-links {menuOpen ? 'open' : ''}">
    <a href="/" class="nav-link" on:click={closeMenu}>Home</a>
    
  <a href="/games" class="nav-link" on:click={closeMenu}>Create Game</a>
  <a href="/my-games" class="nav-link" on:click={closeMenu}>My Games</a>
  <a href="/login" class="nav-link" on:click={closeMenu}>Sign In</a>
      <button class="nav-link signout-btn" on:click={() => {
        console.log('Token before sign out:', localStorage.getItem('token'));
        localStorage.removeItem('token');
        console.log('Token after sign out:', localStorage.getItem('token'));
        closeMenu();
        window.location.href = '/';
      }}>Sign Out</button>

  </div>
</nav>

<style>
*{
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-main);
  padding: 1rem 1.2rem;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  position: relative;
}
.logo {
  font-size: 1.3rem;
  font-weight: bold;
  color: var(--color-text-accent2);
  text-decoration: none;
  letter-spacing: 1px;
}
.hamburger {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 2.2rem;
  height: 2.2rem;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 20;
}
.bar {
  width: 1.7rem;
  height: 3px;
  background: var(--color-text-main);
  margin: 2.5px 0;
  border-radius: 2px;
  transition: all 0.3s;
}
.nav-links {
  display: flex;
  gap: 1.5rem;
}
.nav-link {
  color: var(--color-text-main);
  text-decoration: none;
  font-size: 1.05rem;
  font-weight: 500;
  transition: color 0.2s;
}
.nav-link:hover {
  color: var(--color-text-accent3);
}
@media (max-width: 700px) {
  .nav-links {
    position: absolute;
    top: 100%;
    right: 0;
    left: 0;
    background: var(--color-bg-main);
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    padding: 1rem 0.5rem;
    border-radius: 0 0 12px 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    z-index: 10;
    display: none;
  }
  .nav-links.open {
    display: flex;
  }
  .nav-link {
    width: 100%;
    padding: 0.8rem 1.2rem;
    font-size: 1.1rem;
    border-radius: 6px;
  }
  .hamburger {
    display: flex;
  }
}
@media (min-width: 701px) {
  .hamburger {
    display: none;
  }
}
.signout-btn {
  background: none;
  border: none;
  color: var(--color-text-main);
  font-size: 1.05rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  margin: 0;
  transition: color 0.2s;
}
.signout-btn:hover {
  color: var(--color-text-accent3);
}
</style>
