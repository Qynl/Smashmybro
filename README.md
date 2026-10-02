# GETAWAY

A compact retro-western escape game for the browser. Drive the procedural frontier, take risky jobs, lose the sheriff's posse, and make your own way across the county.

**Play:** open `index.html` directly or serve this folder with any static server.

**Controls:** WASD / arrow keys drive or move · Space handbrake / jump on foot · E interact / enter vehicles · Shift sprint · C crouch · Esc pause.

The game is dependency-free and uses relative URLs for GitHub Pages. The included workflow deploys the site automatically. Because this repository is currently named `Smashmybro`, GitHub's default project URL is `https://qynl.github.io/Smashmybro/`; the exact `/getaways/` path requires a repository named `getaways` or a separate redirect/site configuration.

## Round 2 systems

- Multi-step mission types with retrieval, witness extraction, wagon switching, handoffs, escape legs, and quiet-run bonuses
- Functional hideouts with repair costs, heat reset, and interior entry
- Persistent career cash, best streak, and score via local storage
- Sheriff last-known search ring and route lines on the minimap
- Off-screen objective arrows, distance markers, weather forecasts, hideout landmarks, and clearer objective prompts
- Deterministic dry-trail or storm forecast per county seed

See [`GAME_PLAN.md`](GAME_PLAN.md) for the staged western design plan and [`IMPROVEMENT_PLAN.md`](IMPROVEMENT_PLAN.md) for the current systems roadmap.

## Also in this repo

- [`amongus/`](amongus/) — **IMPOSTOR // Skeldrift Station**, a dependency-free Among Us style social-deduction game (9 crew, 2 impostors, 22 tasks, 9 minigames, sabotages, vents, meetings and voting). Open `amongus/index.html` or browse to `/amongus/` on the deployed site.
