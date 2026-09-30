# GETAWAY — Round 2 improvement plan

This pass is about turning the western presentation into a stronger game. The original vertical slice proved the mood, controls, seeded county, driving, interiors, jobs, and posse loop. Round 2 makes the player's decisions matter more.

## Design target

Every job should create a chain of decisions:

**Where do I start? Which wagon do I trust? Which road crosses the county fastest? Do I stay in the wagon after the law notices me? Can I use a building or hideout to reset the situation? What happens if the job goes wrong?**

## Milestone A — Mission grammar

- Give every procedural job a distinct multi-step state machine rather than sharing one “drive to a dot” finish.
- Delivery: accept → cross county → make drop → survive the heat window.
- Ledger: travel → leave the wagon → enter a building → retrieve the ledger → reach the handoff.
- Witness: reach contact → trigger a moving escape destination → get both of you out.
- Switch wagon: reach the handoff → abandon the hot wagon → take another vehicle → finish clean.
- Quiet run: payout scales with low heat and reckless driving makes the quiet bonus disappear.
- Failures should bend the story instead of always hard-resetting the run.

## Milestone B — Outlaw infrastructure

- Make the three hideouts functional world objects.
- Enter a hideout to cool the law heat, repair the wagon, and prepare the next job.
- Charge repair costs so money becomes a meaningful but understandable decision.
- Persist career cash, best streak, county seed, and best outlaw score in local storage.
- Give the HUD a clear “last safehouse” and “repair needed” signal.

## Milestone C — Readable law behavior

- Track a last-known search location and show it as a fading search ring on the minimap.
- Make abandoned wagons a clue that can pull riders toward the wrong place.
- Tie sheriff-band barks to suspicion, search, pursuit, lost visual, and manhunt transitions.
- Make manhunt stronger through more search riders and road pressure, not teleporting units.
- Surface the reason the player is safe: distance, interior, crouch, or broken line of sight.

## Milestone D — Navigation and feedback

- Add a route line and distance readout to the minimap.
- Add a world-space objective beacon and off-screen edge arrow.
- Make every interaction explain itself: telegraph, building, wagon, hideout, drop, retrieve, escape.
- Add a compact job step tracker and a clear quiet-run bonus state.
- Keep the low-resolution western look while increasing contrast and information density.

## Milestone E — Frontier texture

- Add dry-dust particles when the storm is clear and dust splash during rain.
- Add telegraph poles, hitching rails, wanted posters, bridge planks, water tanks, and county-line markers.
- Add small ambient incidents that alter the route: train crossing, wagon breakdown, blocked bridge, and a distant gunshot.
- Improve interior lighting and landmark silhouettes without introducing a loading screen.

## Milestone F — Website reliability

- Keep the build dependency-free and GitHub Pages-safe.
- Keep all assets and scripts relative to the project root.
- Verify JavaScript syntax, boot the game in a DOM/canvas smoke test, serve it over HTTP, and confirm the deployment workflow remains present.
- Keep the exact Pages URL caveat documented: the repository is `Smashmybro`, so the default project path is `/Smashmybro/`; `/getaways/` requires a repository or redirect configured for that path.

## Definition of done for Round 2

A player can start a job, make a route decision, use a different interaction based on the job type, lose the posse through a believable action, visit a hideout to recover, and see that progress survive a reload. The game should feel like a small authored western sandbox with procedural variation, not a single mission demo wearing a western skin.
