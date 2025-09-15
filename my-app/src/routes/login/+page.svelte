<script>
  let email = '';
  let password = '';
  let message = '';

  async function login() {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      message = 'Login successful! Redirecting...';
      setTimeout(() => window.location.href = '/my-games', 1000);
    } else {
      const data = await res.json().catch(() => ({}));
      message = data.error || 'Login failed.';
    }
  }
</script>

<main class="login-container">
  <h2 class="login-title">Sign In</h2>
  <form on:submit|preventDefault={login}>
    <label for="email">Email</label>
    <input id="email" type="email" bind:value={email} required class="login-input" />

    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} required class="login-input" />

    <button type="submit" class="login-btn">Sign In</button>
  </form>
  {#if message}
    <div class="login-message">{message}</div>
  {/if}
  <div class="signup-link">
    <span>Don't have an account?</span>
    <a href="/signup">Sign up here</a>
  </div>
</main>

<style>
.login-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  background: #23272f;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.15);
  color: #fff;
}
.login-title {
  text-align: center;
}
.login-input {
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #444;
  background: #181c22;
  color: #fff;
}
.login-btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  background: #6c47ff;
  color: #fff;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}
.login-btn:hover {
  background: #4b2fd6;
}
.login-message {
  margin-top: 1rem;
  text-align: center;
  color: #ffb347;
}
  .signup-link {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 1rem;
  }
  .signup-link a {
    color: #6c47ff;
    text-decoration: underline;
    margin-left: 0.5rem;
    font-weight: bold;
    transition: color 0.2s;
  }
  .signup-link a:hover {
    color: #4b2fd6;
  }
</style>
