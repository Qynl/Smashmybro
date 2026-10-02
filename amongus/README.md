# IMPOSTOR // Skeldrift Station

A dependency-free, browser-based social-deduction game in the spirit of *Among Us*. Nine crewmates, two impostors, one small space station, zero external assets — everything is drawn with canvas and CSS.

**Play:** open `index.html` directly, or serve this folder with any static server. On GitHub Pages it lives at `/amongus/`.

## Controls

| Key | Action |
| --- | --- |
| `WASD` / arrows | Move (touch: drag anywhere on the map for a thumb-stick) |
| `E` | Use — task console, sabotage fix, vent, emergency button |
| `R` | Report a dead body |
| `Q` | Kill (impostor) |
| `F` | Sabotage menu (impostor) |
| `TAB` | Station map |
| `ESC` | Close a task / map |

## What's in it

- **Two roles.** Pick Crewmate, Impostor, or Random from the menu. There are always 2 impostors in a 9-player lobby — as an impostor you get an AI partner.
- **22 task stations across 14 rooms**, backed by **9 hand-built minigames**: wiring, card swipe, data transfer, fuel lever, reactor Simon, manifold ordering, shield toggles, slider alignment and asteroid shooting.
- **A real task bar.** Every crewmate (you and the AI) has 6 tasks; the bar tracks the whole crew. Fill it and the crew wins.
- **Impostor kit.** 24s kill cooldown, a 12-vent network in 5 connected groups, and four sabotages: lights (crew vision collapses), comms (task list blacked out), O2 and reactor (45-second countdowns that end the round).
- **Line-of-sight vision.** You only see crewmates your character could actually see — rooms, corridors and darkness are all raycast against the floor plan.
- **Meetings and voting.** Report a body or hit the emergency button: 14s of discussion with AI chatter (witnesses name their killer, impostors lie and misdirect), then a 22s vote with live vote chips, ties, skips and an ejection cutscene that confirms the role.
- **Ghost mode.** Dying doesn't end the round — you float through walls, keep finishing your tasks for the crew, and watch the rest play out.
- **AI crew that behaves.** Pathfinding over a room-adjacency graph, task routines, body reporting, responding to sabotages, isolated-kill logic for impostors, and bandwagon voting.

## Files

- `index.html` — shell, HUD and all overlay screens
- `style.css` — the entire look
- `map.js` — station geometry, walkability, line-of-sight, pathfinding, task/vent tables
- `minigames.js` — the nine task minigames
- `game.js` — simulation, AI, meetings, rendering

No build step, no dependencies, no network calls.
