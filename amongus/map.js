/* IMPOSTOR // map data, geometry helpers and rect-graph pathfinding */
(function (global) {
  'use strict';

  // --- rectangles that make up the walkable station ------------------------
  // Rooms and hallways overlap slightly so the walkable area is one blob.
  const ROOMS = [
    { name: 'Reactor',        x:   60, y:  560, w: 220, h: 260 },
    { name: 'Upper Engine',   x:  320, y:  240, w: 260, h: 200 },
    { name: 'Lower Engine',   x:  320, y: 1020, w: 260, h: 200 },
    { name: 'Security',       x:  560, y:  560, w: 190, h: 160 },
    { name: 'MedBay',         x:  760, y:  440, w: 240, h: 200 },
    { name: 'Electrical',     x:  700, y:  900, w: 280, h: 220 },
    { name: 'Storage',        x: 1080, y:  880, w: 340, h: 380 },
    { name: 'Cafeteria',      x: 1000, y:  120, w: 460, h: 380 },
    { name: 'Weapons',        x: 1560, y:  140, w: 260, h: 200 },
    { name: 'Admin',          x: 1540, y:  620, w: 240, h: 180 },
    { name: 'O2',             x: 1900, y:  380, w: 200, h: 170 },
    { name: 'Navigation',     x: 2250, y:  620, w: 230, h: 170 },
    { name: 'Shields',        x: 1800, y:  920, w: 240, h: 200 },
    { name: 'Communications', x: 1640, y: 1200, w: 260, h: 170 }
  ];

  const HALLS = [
    { x:  400, y:  420, w:  90, h: 620 }, // west spine
    { x:  270, y:  640, w: 140, h:  90 }, // reactor link
    { x:  565, y:  300, w: 450, h:  90 }, // north corridor
    { x:  620, y:  380, w:  80, h: 190 }, // security link
    { x:  880, y:  370, w:  90, h: 100 }, // medbay link
    { x:  440, y:  960, w: 320, h:  90 }, // electrical link
    { x:  950, y: 1020, w: 180, h:  90 }, // electrical -> storage
    { x:  500, y: 1120, w: 620, h:  90 }, // south corridor
    { x: 1200, y:  480, w: 100, h: 420 }, // cafeteria -> storage
    { x: 1260, y:  700, w: 300, h:  90 }, // -> admin
    { x: 1440, y:  200, w: 140, h:  90 }, // cafeteria -> weapons
    { x: 1700, y:  320, w:  90, h: 140 }, // weapons down
    { x: 1700, y:  400, w: 700, h:  90 }, // east corridor
    { x: 2300, y:  470, w:  90, h: 180 }, // -> navigation
    { x: 2300, y:  780, w:  90, h: 220 }, // navigation south
    { x: 1980, y:  910, w: 340, h:  90 }, // -> shields
    { x: 1860, y: 1080, w:  90, h: 200 }, // shields -> comms
    { x: 1380, y: 1240, w: 280, h:  90 }  // comms -> storage
  ];

  const RECTS = [];
  ROOMS.forEach((r) => RECTS.push({ ...r, room: true }));
  HALLS.forEach((r) => RECTS.push({ ...r, name: 'Hallway', room: false }));

  const WORLD = { w: 2560, h: 1440 };

  // --- vents ---------------------------------------------------------------
  // each entry: position + the group it belongs to (vents in a group connect)
  const VENTS = [
    { x:  820, y: 1070, g: 0, room: 'Electrical' },
    { x:  790, y:  600, g: 0, room: 'MedBay' },
    { x:  600, y:  680, g: 0, room: 'Security' },
    { x: 1050, y:  170, g: 1, room: 'Cafeteria' },
    { x: 1560, y:  760, g: 1, room: 'Admin' },
    { x: 1780, y:  180, g: 2, room: 'Weapons' },
    { x: 2440, y:  650, g: 2, room: 'Navigation' },
    { x:  100, y:  790, g: 3, room: 'Reactor' },
    { x:  350, y:  400, g: 3, room: 'Upper Engine' },
    { x:  350, y: 1180, g: 3, room: 'Lower Engine' },
    { x: 1830, y: 1080, g: 4, room: 'Shields' },
    { x: 1680, y: 1340, g: 4, room: 'Communications' }
  ];

  // --- tasks ---------------------------------------------------------------
  const TASKS = [
    { id: 'wires-e',  name: 'Fix Wiring',            room: 'Electrical',     x:  730, y:  930, game: 'wires' },
    { id: 'wires-a',  name: 'Fix Wiring',            room: 'Admin',          x: 1570, y:  650, game: 'wires' },
    { id: 'wires-n',  name: 'Fix Wiring',            room: 'Navigation',     x: 2280, y:  650, game: 'wires' },
    { id: 'wires-s',  name: 'Fix Wiring',            room: 'Security',       x:  590, y:  590, game: 'wires' },
    { id: 'swipe',    name: 'Swipe Card',            room: 'Admin',          x: 1750, y:  780, game: 'swipe' },
    { id: 'download', name: 'Download Data',         room: 'Communications', x: 1870, y: 1230, game: 'download' },
    { id: 'upload',   name: 'Upload Data',           room: 'Admin',          x: 1600, y:  770, game: 'download' },
    { id: 'calib',    name: 'Calibrate Distributor', room: 'Electrical',     x:  950, y: 1090, game: 'align' },
    { id: 'steer',    name: 'Stabilize Steering',    room: 'Navigation',     x: 2450, y:  760, game: 'align' },
    { id: 'aster',    name: 'Clear Asteroids',       room: 'Weapons',        x: 1790, y:  170, game: 'asteroids' },
    { id: 'shields',  name: 'Prime Shields',         room: 'Shields',        x: 1830, y:  950, game: 'toggles' },
    { id: 'reactor',  name: 'Start Reactor',         room: 'Reactor',        x:   95, y:  595, game: 'simon' },
    { id: 'manifold', name: 'Unlock Manifolds',      room: 'Reactor',        x:  245, y:  790, game: 'order' },
    { id: 'fuel',     name: 'Fuel Engines',          room: 'Storage',        x: 1110, y:  910, game: 'hold' },
    { id: 'garbage',  name: 'Empty Garbage',         room: 'Storage',        x: 1390, y: 1230, game: 'hold' },
    { id: 'sample',   name: 'Inspect Sample',        room: 'MedBay',         x:  790, y:  470, game: 'download' },
    { id: 'scan',     name: 'Submit Scan',           room: 'MedBay',         x:  970, y:  610, game: 'download' },
    { id: 'divert-l', name: 'Accept Power',          room: 'Lower Engine',   x:  350, y: 1050, game: 'toggles' },
    { id: 'divert-u', name: 'Accept Power',          room: 'Upper Engine',   x:  350, y:  270, game: 'toggles' },
    { id: 'filter',   name: 'Clean O2 Filter',       room: 'O2',             x: 1930, y:  410, game: 'order' },
    { id: 'chute',    name: 'Empty Cafeteria Chute', room: 'Cafeteria',      x: 1420, y:  460, game: 'hold' },
    { id: 'logs',     name: 'Review Security Logs',  room: 'Security',       x:  720, y:  690, game: 'download' }
  ];

  // Fix stations for sabotages.
  const FIX_POINTS = {
    lights:  { x:  920, y:  920, room: 'Electrical',     name: 'Restore Lights',   game: 'toggles' },
    comms:   { x: 1670, y: 1340, room: 'Communications', name: 'Restore Comms',    game: 'order' },
    o2:      { x: 2060, y:  520, room: 'O2',             name: 'Refill Oxygen',    game: 'hold' },
    reactor: { x:  170, y:  700, room: 'Reactor',        name: 'Cool the Reactor', game: 'hold' }
  };

  const EMERGENCY = { x: 1230, y: 300, room: 'Cafeteria' };
  const SPAWN = { x: 1230, y: 300 };

  // --- geometry ------------------------------------------------------------
  function inRect(r, x, y) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }
  function inside(x, y) {
    for (let i = 0; i < RECTS.length; i++) if (inRect(RECTS[i], x, y)) return true;
    return false;
  }
  // circle fully inside the union (sampled perimeter — rects are axis aligned so this is reliable)
  const SAMPLES = 12;
  const OFFS = [];
  for (let i = 0; i < SAMPLES; i++) OFFS.push([Math.cos((i / SAMPLES) * Math.PI * 2), Math.sin((i / SAMPLES) * Math.PI * 2)]);
  function canStand(x, y, r) {
    if (!inside(x, y)) return false;
    for (let i = 0; i < OFFS.length; i++) {
      if (!inside(x + OFFS[i][0] * r, y + OFFS[i][1] * r)) return false;
    }
    return true;
  }
  function rectAt(x, y) {
    // prefer rooms over hallways when both contain the point
    let hall = null;
    for (let i = 0; i < RECTS.length; i++) {
      if (inRect(RECTS[i], x, y)) {
        if (RECTS[i].room) return RECTS[i];
        if (!hall) hall = RECTS[i];
      }
    }
    return hall;
  }
  function roomAt(x, y) {
    const r = rectAt(x, y);
    return r ? r.name : 'Space';
  }
  function clampToWalkable(x, y, r) {
    if (canStand(x, y, r)) return { x, y };
    for (let step = 4; step <= 80; step += 4) {
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const nx = x + Math.cos(ang) * step;
        const ny = y + Math.sin(ang) * step;
        if (canStand(nx, ny, r)) return { x: nx, y: ny };
      }
    }
    return { x: SPAWN.x, y: SPAWN.y };
  }
  // line of sight: walk the segment and make sure every sample is walkable floor
  function lineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(2, Math.ceil(dist / 18));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!inside(x1 + dx * t, y1 + dy * t)) return false;
    }
    return true;
  }

  // --- rect adjacency graph (for AI navigation) ----------------------------
  function overlapRegion(a, b) {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    if (x2 <= x1 || y2 <= y1) return null;
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, w: x2 - x1, h: y2 - y1 };
  }
  const ADJ = RECTS.map(() => []);
  const GATE = {}; // "i-j" -> waypoint
  for (let i = 0; i < RECTS.length; i++) {
    for (let j = i + 1; j < RECTS.length; j++) {
      const o = overlapRegion(RECTS[i], RECTS[j]);
      if (o && o.w > 6 && o.h > 6) {
        ADJ[i].push(j);
        ADJ[j].push(i);
        GATE[i + '-' + j] = { x: o.x, y: o.y };
        GATE[j + '-' + i] = { x: o.x, y: o.y };
      }
    }
  }
  function rectIndexAt(x, y) {
    const r = rectAt(x, y);
    return r ? RECTS.indexOf(r) : -1;
  }
  // returns a list of waypoints from (x1,y1) to (x2,y2)
  function findPath(x1, y1, x2, y2) {
    const a = rectIndexAt(x1, y1);
    const b = rectIndexAt(x2, y2);
    if (a < 0 || b < 0) return [{ x: x2, y: y2 }];
    if (a === b) return [{ x: x2, y: y2 }];
    const prev = new Array(RECTS.length).fill(-2);
    const q = [a];
    prev[a] = -1;
    let found = false;
    while (q.length) {
      const cur = q.shift();
      if (cur === b) { found = true; break; }
      const nb = ADJ[cur];
      for (let k = 0; k < nb.length; k++) {
        if (prev[nb[k]] === -2) { prev[nb[k]] = cur; q.push(nb[k]); }
      }
    }
    if (!found) return [{ x: x2, y: y2 }];
    const chain = [];
    let cur = b;
    while (cur !== -1) { chain.unshift(cur); cur = prev[cur]; }
    const pts = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const g = GATE[chain[i] + '-' + chain[i + 1]];
      if (g) pts.push({ x: g.x, y: g.y });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  function randomPointInRoom(name) {
    const r = ROOMS.find((q) => q.name === name) || ROOMS[0];
    const pad = 36;
    return {
      x: r.x + pad + Math.random() * Math.max(1, r.w - pad * 2),
      y: r.y + pad + Math.random() * Math.max(1, r.h - pad * 2)
    };
  }
  function randomWalkable() {
    const r = RECTS[Math.floor(Math.random() * RECTS.length)];
    const pad = 30;
    const x = r.x + pad + Math.random() * Math.max(1, r.w - pad * 2);
    const y = r.y + pad + Math.random() * Math.max(1, r.h - pad * 2);
    return clampToWalkable(x, y, 18);
  }

  global.GameMap = {
    ROOMS, HALLS, RECTS, WORLD, VENTS, TASKS, FIX_POINTS, EMERGENCY, SPAWN,
    inside, canStand, roomAt, rectAt, clampToWalkable, lineOfSight,
    findPath, randomPointInRoom, randomWalkable
  };
})(window);
