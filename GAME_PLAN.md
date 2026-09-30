# GETAWAY — Dustfall improvement plan

GETAWAY is a frontier escape game, not a neon city game. The player should feel the heat of an isolated county: one road over the mesa, one train through town, one sheriff radio crackling in the dark, and a hundred choices about where to disappear.

## North star

**Take the job. Read the trail. Break the law. Make it past the county line.**

The game is a compact, stylized western crime sandbox built around memorable improvisation rather than a checklist of open-world features. Its signature moment is:

> “I left the wagon by the livery, slipped through the saloon, crossed the back lot, stole a delivery truck, and the posse searched the wrong barn.”

## Pass 1 — Frontier identity

- Move the art direction from neon-noir to a stylized lost-western game: chunky low-poly 3D, painted low-resolution materials, sunset dust, storm-blue shadows, lantern amber, brass, canvas, timber, and rust.
- Establish a limited palette: bone, adobe, sage, pine, oxblood, brass, charcoal, and moonlit blue.
- Rewrite every player-facing phrase around a county, trail, posse, telegraph, sheriff, livery, saloon, and homestead.
- Keep the crisp pixel-grid treatment, but use it for old-west silhouettes and sign painting instead of cyberpunk glow.

## Pass 2 — Dustfall County

- Generate a compact county around a readable road and rail skeleton.
- Districts become: **Dustfall Main Street**, **Red Mesa**, **Cottonwood**, **Railroad Ward**, **Blackwater Crossing**, and **North Range**.
- Modular building families become: saloon, general store, bank, sheriff office, telegraph office, livery stable, hotel, cabins, mine office, warehouse, and rail depot.
- Add landmarks that help navigation: church steeple, water tower, grain elevator, windmill, rail bridge, canyon cut, and cemetery.
- Keep seed-driven layout, traffic, mission sites, and weather so every county is familiar but not identical.

## Pass 3 — The outlaw loop

- Procedural jobs use western stakes and language:
  - **Run the Satchel** — deliver a letter without getting searched.
  - **Take the Ledger** — recover proof from a bank or office.
  - **Witness Out** — reach a contact before the posse closes in.
  - **Switch the Wagon** — abandon the hot ride and take a clean one.
  - **Across the County** — make a quiet cross-map run.
- Complications become blocked trail, rain-swollen crossing, witness, telegraph alert, train crossing, rival gang, sheriff patrol, or washed-out road.
- Career jobs pay for repairs, a better wagon, a safe room, and information. Endless GETAWAY mode increases reward and law pressure until capture.

## Pass 4 — Law system and hiding

- Police become a sheriff’s office and roaming posse without changing the underlying readable information model.
- Heat stages: **QUIET**, **SUSPICION**, **SEARCH**, **PURSUIT**, **MANHUNT**.
- Law reacts to last known position, abandoned wagons, witnesses, and line of sight rather than teleporting behind the player.
- Interiors become usable western spaces: saloons, stores, livery offices, cabins, depots, and barns.
- A player can ditch a wagon, cut through an interior, crouch in a back room, emerge through another door, and keep the story moving.

## Pass 5 — Feel and presentation

- Vehicles get period-inspired silhouettes, brass lamps, canvas roofs, wood rails, dust, mud, dents, smoke, and lantern glows.
- Crashes use wood/metal impact audio cues, dust puffs, wheel sparks, camera kick, and skid marks.
- Replace radio with a sparse **telegraph / sheriff band**: short, useful barks that communicate search state and direction.
- Use storm rain sparingly, with dry dust and sunset as the default contrast. The western mood should remain readable even when the weather changes.

## Pass 6 — Website quality

- Keep the build dependency-free: static `index.html`, `styles.css`, `game.js`, and local assets.
- Ensure every path is relative and GitHub Pages-safe.
- Keep keyboard and touch controls.
- Test syntax, static serving, and deploy workflow after each pass.
- The current repository is named `Smashmybro`, so its default Pages URL will be `/Smashmybro/`; the exact `/getaways/` path requires the GitHub repository to be named `getaways` or a separate redirect/site configuration.

## Acceptance bar

The website is ready when a first-time player can understand the fantasy in five seconds, start a job in under a minute, recognize the town by silhouette, know why the posse found them, and have at least one viable escape option besides driving faster.
