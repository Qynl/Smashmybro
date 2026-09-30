# GETAWAY — build plan

GETAWAY is built in focused passes so every layer supports the escape fantasy instead of becoming a disconnected feature list.

## Pass 1 — Art direction and foundations
- Lock the visual language: low-resolution 3D forms, a restricted midnight palette, amber city light, cyan rain, red police strobes.
- Build a deterministic city seed with named districts, readable road hierarchy, alleys, shortcuts, enterable doors, and escape-friendly sightlines.
- Create a single static GitHub Pages entry point with no build step or server dependency.

## Pass 2 — The core feel
- Add a responsive arcade driving model with weight, grip, handbrake, skid marks, crash sparks, smoke, headlights, and camera impact.
- Add walk/run/crouch movement, vehicle entry and exit, traffic hijacking, and a seamless-feeling interior pocket for hiding.
- Tune input and feedback before adding content.

## Pass 3 — The escape loop
- Build procedural jobs from objective, destination, route complication, weather, and payout.
- Build police as an information system: suspicion, search, pursuit, heavy pursuit, imperfect last-known-position searches, and roadblocks.
- Add hideouts, vehicle condition, money, repairs, and small, legible progression.

## Pass 4 — Replayability and polish
- Add emergent street incidents, radio barks, rain variation, traffic personality, minimap route language, and a GETAWAY endless mode.
- Add accessibility toggles, pause/restart, keyboard + touch-friendly controls, and session persistence.
- Finish with performance passes, responsive layout, and GitHub Pages-safe relative URLs.

## Current vertical slice
The first slice intentionally prioritizes the ten-second loop: **take a job → drive through a readable city → make a risky delivery → attract heat → improvise an escape on foot or behind the wheel → get paid**. The procedural city, jobs, police, interiors, audio-like radio layer, and art direction all serve that loop.
