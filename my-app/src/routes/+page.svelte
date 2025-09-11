<script>
	// No logic needed for landing page
</script>

<main class="landing-container">
	<h1 class="landing-title">Welcome to DnD Session Manager</h1>
	<p class="landing-desc">
		Organize your Dungeons & Dragons campaigns, manage NPCs, players, items, and keep detailed notes for every session.<br>
		Sign up to get started and make your next game night seamless!
	</p>
	<div class="landing-actions">
		<a href="/signup" class="landing-btn primary">Get Started</a>
	</div>
	<section class="landing-features">
		<h2>Features</h2>
		<ul>
			<li>Create and manage multiple game sessions</li>
			<li>Track NPCs and players for each session</li>
			<li>Organize items, loot, and equipment</li>
			<li>Keep general notes and session logs</li>
			<li>All your data is private and secure</li>
		</ul>
	</section>
</main>

<style>
* {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
}
.landing-container {
	max-width: 600px;
	margin: 3rem auto;
	padding: 2rem;
	background: #23272f;
	border-radius: 16px;
	box-shadow: 0 2px 16px rgba(0,0,0,0.15);
	color: #fff;
}
.landing-title {
	text-align: center;
}
.landing-desc {
	text-align: center;
	font-size: 1.2rem;
	margin-bottom: 2rem;
}
.landing-actions {
	display: flex;
	justify-content: center;
	gap: 1.5rem;
	margin-bottom: 2rem;
}
.landing-btn {
	padding: 0.75rem 2rem;
	border-radius: 8px;
	text-decoration: none;
	font-weight: bold;
	font-size: 1.1rem;
	transition: background 0.2s;
	color: #fff;
	display: inline-block;
}
.landing-btn.primary {
	background: #6c47ff;
}
.landing-btn.primary:hover {
	background: #4b2fd6;
}
.landing-features {
	margin-top: 2.5rem;
}
.landing-features ul {
	line-height: 2;
	font-size: 1.1rem;
}
</style>