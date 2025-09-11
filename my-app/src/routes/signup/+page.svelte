<script>
  let email = '';
  let password = '';
  let name = '';
  let message = '';

  async function signup() {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    if (res.ok) {
      message = 'Account created! You can now sign in.';
      email = '';
      password = '';
      name = '';
    } else {
      const data = await res.json().catch(() => ({}));
      message = data.error || 'Signup failed.';
    }
  }
</script>

<style>
.signup-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border-radius: 12px;
  background: #23272f;
  box-shadow: 0 2px 16px rgba(0,0,0,0.2);
  color: #fff;
}
.signup-container h2 {
  margin-bottom: 1.5rem;
  text-align: center;
}
.signup-container label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}
.signup-container input[type="text"],
.signup-container input[type="email"],
.signup-container input[type="password"] {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 6px;
  border: 1px solid #444;
  background: #181c22;
  color: #fff;
}
.signup-container button {
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
.signup-container button:hover {
  background: #4b2fd6;
}
.signup-container .message {
  margin-top: 1rem;
  text-align: center;
  color: #ffb347;
}
</style>

<div class="signup-container">
  <h2>Create Account</h2>
  <form on:submit|preventDefault={signup}>
    <label for="name">Name</label>
    <input id="name" type="text" bind:value={name} required />

    <label for="email">Email</label>
    <input id="email" type="email" bind:value={email} required />

    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} required minlength="6" />

    <button type="submit">Sign Up</button>
  </form>
  {#if message}
    <div class="message">{message}</div>
  {/if}
</div>
