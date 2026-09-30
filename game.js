/* GETAWAY // A procedural retro-western outlaw escape sandbox */
(() => {
  'use strict';

  // --- Canvas & Constants ---
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const mapCanvas = document.getElementById('map-canvas');
  const mapCtx = mapCanvas.getContext('2d');
  const W = 960;
  const H = 540;
  const WORLD_W = 4200;
  const WORLD_H = 3400;
  const ROAD = 96;
  const TAU = Math.PI * 2;

  const $ = (id) => document.getElementById(id);
  const titleScreen = $('title-screen');
  const pauseScreen = $('pause-screen');
  const garageScreen = $('garage-screen');
  const bustedScreen = $('busted-screen');
  const helpScreen = $('help-screen');
  const gameUI = $('game-ui');
  const menuSeed = $('menu-seed');

  // Input State
  const keys = Object.create(null);
  const justPressed = Object.create(null);
  let touchVector = { x: 0, y: 0 };

  // Game Engine State
  let runMode = 'career';
  let gameMode = 'menu';
  let lastTime = 0;
  let elapsed = 0;
  let seedText = 'DUST-091';
  let world;
  let player;
  let playerCar;
  let police = [];
  let traffic = [];
  let props = [];
  let particles = [];
  let skidMarks = [];
  let caltrops = [];
  let train = null;
  let countyEvents = [];
  let lawSearch = { x: 0, y: 0, ttl: 0, active: false };
  let flash = 0;
  let lightningTimer = 8;
  let mission = null;
  let money = 650;
  let careerCash = 650;
  let careerStreak = 0;
  let bestStreak = 0;
  let bestScore = 0;
  let totalSmashCount = 0;
  let heat = 0;
  let nitro = 100;
  let caltropAmmo = 3;
  let driftPoints = 0;
  let driftTimer = 0;
  let weather = { kind: 'storm', wet: true };
  let camera = { x: 700, y: 700, shake: 0 };
  const SAVE_KEY = 'getaway-dustfall-career-v3';
  let rain = [];
  let radioTimer = 0;
  let policeTimer = 0;
  let ambientTimer = 8;
  let missionNumber = 1;
  let activeSafehouse = null;

  // Upgrades installed in career
  let upgrades = {
    engine: 0,
    bumper: 0,
    tires: 0,
    smuggler: false,
    ownedVehicles: ['sedan']
  };

  // Web Audio Context & Sounds
  let audioCtx = null;
  let engineNode = null;
  let engineGain = null;
  let driftNode = null;
  let driftGain = null;

  // --- Spec Definitions ---
  const VEHICLE_TYPES = {
    sedan: {
      name: 'DUSTWIND COUPE',
      price: 0,
      top: 245,
      accel: 165,
      brake: 260,
      turn: 2.7,
      grip: 0.88,
      weight: 1.0,
      color: '#d1b27c',
      accent: '#4e6263',
      durability: 120,
      desc: 'Balanced vintage coupe. Reliable on city avenues and dirt trails.'
    },
    muscle: {
      name: 'IRON HORSE V8',
      price: 550,
      top: 285,
      accel: 200,
      brake: 230,
      turn: 2.1,
      grip: 0.74,
      weight: 1.4,
      color: '#9c382f',
      accent: '#d4a45b',
      durability: 150,
      desc: 'Roaring muscle machine. Smashes roadblocks and outruns cruisers.'
    },
    compact: {
      name: 'MULE RUNNER',
      price: 320,
      top: 228,
      accel: 185,
      brake: 270,
      turn: 3.2,
      grip: 0.94,
      weight: 0.75,
      color: '#8e9c68',
      accent: '#3e3126',
      durability: 95,
      desc: 'Light and nimble. Excellent for slipping through narrow canyon alleys.'
    },
    sports: {
      name: 'SILVER BULLET',
      price: 900,
      top: 315,
      accel: 235,
      brake: 290,
      turn: 2.9,
      grip: 0.85,
      weight: 0.88,
      color: '#658390',
      accent: '#f2e4c0',
      durability: 90,
      desc: 'Unmatched speed. The fastest getaway vehicle across open county roads.'
    },
    van: {
      name: 'ARMORED WAR WAGON',
      price: 800,
      top: 210,
      accel: 130,
      brake: 210,
      turn: 1.8,
      grip: 0.72,
      weight: 2.1,
      color: '#6e5643',
      accent: '#2b211a',
      durability: 240,
      desc: 'Fortified steel plating. Devastating ramming power with high health.'
    },
    taxi: {
      name: 'STAGE TAXI',
      price: 420,
      top: 238,
      accel: 155,
      brake: 240,
      turn: 2.6,
      grip: 0.86,
      weight: 1.05,
      color: '#e0b248',
      accent: '#262016',
      durability: 110,
      desc: 'Camouflaged civilian transport. Draws less suspicion from patrols.'
    },
    police: {
      name: 'SHERIFF INTERCEPTOR',
      price: 1300,
      top: 290,
      accel: 210,
      brake: 280,
      turn: 2.8,
      grip: 0.91,
      weight: 1.25,
      color: '#e2d7be',
      accent: '#2c3e42',
      durability: 160,
      desc: 'Confiscated law cruiser equipped with dual spotlight and sirens.'
    }
  };

  const DISTRICTS = [
    { name: 'DUSTFALL MAIN STREET', short: 'MAIN STREET', x: 200, y: 200, w: 1400, h: 1400, color: '#4b3226', accent: '#d79855' },
    { name: 'RED MESA', short: 'RED MESA', x: 200, y: 1800, w: 1400, h: 1400, color: '#63392a', accent: '#c9794e' },
    { name: 'COTTONWOOD', short: 'COTTONWOOD', x: 1750, y: 200, w: 1200, h: 1400, color: '#3d4d3e', accent: '#a7b07b' },
    { name: 'RAILROAD WARD', short: 'RAILROAD', x: 3050, y: 200, w: 1100, h: 1400, color: '#453f38', accent: '#d5a948' },
    { name: 'BLACKWATER CROSSING', short: 'BLACKWATER', x: 1750, y: 1800, w: 2400, h: 1400, color: '#273e44', accent: '#87aeb2' }
  ];

  // --- Math & Helper Utilities ---
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function formatMoney(n) { return '$' + Math.max(0, Math.floor(n)).toLocaleString('en-US'); }
  function angleDiff(a, b) { return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }
  function hashString(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rngFrom(seed) { let s = hashString(seed) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296); }; }
  function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
  function choice(list) { return list[Math.floor(Math.random() * list.length)]; }

  // --- Persistence ---
  function loadCareer() {
    try {
      if (typeof localStorage === 'undefined') return;
      const save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      careerCash = Number.isFinite(save.cash) ? Math.max(650, save.cash) : 650;
      bestStreak = Number.isFinite(save.bestStreak) ? Math.max(0, save.bestStreak) : 0;
      bestScore = Number.isFinite(save.bestScore) ? Math.max(0, save.bestScore) : 0;
      if (save.upgrades) upgrades = { ...upgrades, ...save.upgrades };
    } catch (e) { careerCash = 650; }
  }

  function persistCareer() {
    careerCash = Math.max(0, money);
    bestScore = Math.max(bestScore, money + bestStreak * 600);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
          cash: careerCash,
          bestStreak,
          bestScore,
          upgrades,
          seed: seedText
        }));
      }
    } catch (e) {}
  }

  // --- Window Resize ---
  function resize() {
    canvas.width = W;
    canvas.height = H;
  }
  window.addEventListener('resize', resize);
  resize();

  // --- World Generation ---
  function buildWorld(seed) {
    const r = rngFrom(seed);
    const roadsX = [280, 700, 1120, 1540, 1960, 2380, 2800, 3220, 3640, 4040];
    const roadsY = [280, 700, 1120, 1540, 1960, 2380, 2800, 3200];
    const buildings = [];
    const doors = [];
    const parks = [];
    const worldProps = [];
    const jobSites = [];
    const events = [];

    // Safehouses with dedicated open courtyards (NO buildings spawn inside exclusion boxes)
    const hideouts = [
      {
        id: 'switchyard',
        x: 490,
        y: 490,
        spawnX: 490,
        spawnY: 400,
        spawnAngle: -Math.PI / 2,
        name: 'THE SWITCHYARD GARAGE',
        district: 'DUSTFALL MAIN STREET',
        type: 'GARAGE',
        bounds: { left: 340, right: 640, top: 340, bottom: 640 }
      },
      {
        id: 'cinder',
        x: 1330,
        y: 2590,
        spawnX: 1330,
        spawnY: 2500,
        spawnAngle: -Math.PI / 2,
        name: 'CINDER HOTEL & LIVERY',
        district: 'RED MESA',
        type: 'HOTEL',
        bounds: { left: 1180, right: 1480, top: 2440, bottom: 2740 }
      },
      {
        id: 'blackwater',
        x: 3430,
        y: 2590,
        spawnX: 3430,
        spawnY: 2500,
        spawnAngle: -Math.PI / 2,
        name: 'BLACKWATER RIVER BARN',
        district: 'BLACKWATER CROSSING',
        type: 'BARN',
        bounds: { left: 3280, right: 3580, top: 2440, bottom: 2740 }
      }
    ];

    // Helper: is a point or rect in a safehouse exclusion zone?
    function isExcluded(x, y, w = 0, boxH = 0) {
      for (const ho of hideouts) {
        const b = ho.bounds;
        if (x + w > b.left && x < b.right && y + boxH > b.top && y < b.bottom) return true;
      }
      return false;
    }

    // Procedural Block & Building Generator
    for (let xi = 0; xi < roadsX.length - 1; xi++) {
      for (let yi = 0; yi < roadsY.length - 1; yi++) {
        const left = roadsX[xi] + ROAD / 2 + 18;
        const top = roadsY[yi] + ROAD / 2 + 18;
        const right = roadsX[xi + 1] - ROAD / 2 - 18;
        const bottom = roadsY[yi + 1] - ROAD / 2 - 18;
        if (right - left < 80 || bottom - top < 80) continue;

        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        const district = districtAt({ x: centerX, y: centerY });

        // Check if block contains a hideout
        if (isExcluded(left, top, right - left, bottom - top)) {
          // Add open courtyard pavement and the custom safehouse building
          parks.push({ x: left, y: top, w: right - left, h: bottom - top, kind: 'courtyard' });
          continue;
        }

        const roll = r();
        if (roll < (district.name === 'BLACKWATER CROSSING' ? 0.3 : 0.12)) {
          parks.push({ x: left, y: top, w: right - left, h: bottom - top, kind: district.name === 'BLACKWATER CROSSING' ? 'marsh' : 'park' });
          continue;
        }

        const cols = district.name === 'RED MESA' ? 2 : (r() > 0.55 ? 2 : 1);
        const rows = district.name === 'RED MESA' ? 2 : (r() > 0.55 ? 2 : 1);
        const gap = 16;
        const cellW = (right - left - gap * (cols - 1)) / cols;
        const cellH = (bottom - top - gap * (rows - 1)) / rows;

        for (let cx = 0; cx < cols; cx++) {
          for (let cy = 0; cy < rows; cy++) {
            const bx = left + cx * (cellW + gap) + (r() * 6 - 3);
            const by = top + cy * (cellH + gap) + (r() * 6 - 3);
            const bw = Math.max(68, cellW - 6 - r() * 12);
            const bh = Math.max(68, cellH - 6 - r() * 12);

            if (isExcluded(bx, by, bw, bh)) continue;

            const kinds = district.name === 'BLACKWATER CROSSING'
              ? ['warehouse', 'depot', 'stable', 'office']
              : district.name === 'COTTONWOOD'
                ? ['saloon', 'hotel', 'general store', 'bank', 'stable']
                : ['cabin', 'general store', 'office', 'hotel', 'saloon', 'bank'];

            const kind = pick(r, kinds);
            const b = {
              x: bx,
              y: by,
              w: bw,
              h: bh,
              z: 1 + Math.floor(r() * 3),
              kind,
              district: district.name,
              color: district.color,
              accent: district.accent,
              seed: r(),
              enterable: r() > 0.6 || ['saloon', 'bank', 'general store', 'hotel'].includes(kind)
            };
            buildings.push(b);

            if (b.enterable && doors.length < 36) {
              doors.push({
                x: b.x + b.w / 2,
                y: b.y + b.h + 8,
                building: b,
                label: kind === 'general store' ? 'GENERAL STORE' : kind.toUpperCase()
              });
            }
          }
        }
      }
    }

    // Authored Job Sites along roads and key landmarks
    jobSites.push({ x: 490, y: 350, label: 'MAIN STREET TELEGRAPH' });
    jobSites.push({ x: 1120, y: 350, label: 'DUSTFALL FIRST BANK' });
    jobSites.push({ x: 1960, y: 350, label: 'COTTONWOOD LIVERY' });
    jobSites.push({ x: 3220, y: 450, label: 'RAIL DEPOT VAULT' });
    jobSites.push({ x: 700, y: 1960, label: 'RED MESA CANYON OUTPOST' });
    jobSites.push({ x: 1540, y: 2800, label: 'SOUTH TRAIL TELEGRAPH' });
    jobSites.push({ x: 2800, y: 2800, label: 'BLACKWATER TOLL OFFICE' });
    jobSites.push({ x: 3640, y: 1960, label: 'EAST RIVER DOCKS' });
    jobSites.push({ x: 2380, y: 1120, label: 'CROSSROADS SALOON' });

    // Destructible World Props (Fences, Crates, Barrels)
    for (let i = 0; i < 90; i++) {
      const rx = 100 + r() * (WORLD_W - 200);
      const ry = 100 + r() * (WORLD_H - 200);
      if (isExcluded(rx, ry, 30, 30)) continue;
      const type = pick(r, ['fence', 'crate', 'barrel', 'cactus', 'hitch']);
      worldProps.push({
        id: 'prop_' + i,
        x: rx,
        y: ry,
        type,
        health: type === 'fence' ? 20 : 35,
        destroyed: false
      });
    }

    // Street Lights / Lantern Poles
    const streetLights = [];
    roadsX.forEach((x) => roadsY.forEach((y) => {
      if (r() > 0.15) streetLights.push({ x: x + 40, y: y + 40, phase: r() * TAU });
    }));

    // Moving Freight Train track along Y = 160 across the whole world
    const trainTrackY = 160;
    const initialTrain = {
      x: 300,
      y: trainTrackY,
      speed: 130,
      length: 6,
      carSpacing: 62,
      bellTimer: 0
    };

    // Civilian Traffic Cars
    const trafficCars = [];
    const trafficKinds = ['compact', 'sedan', 'taxi', 'muscle', 'van', 'sports'];
    for (let i = 0; i < 30; i++) {
      const horizontal = r() > 0.5;
      const road = horizontal ? pick(r, roadsY) : pick(r, roadsX);
      const laneOffset = r() > 0.5 ? -24 : 24;
      const x = horizontal ? 100 + r() * (WORLD_W - 200) : road + laneOffset;
      const y = horizontal ? road + laneOffset : 100 + r() * (WORLD_H - 200);
      const angle = horizontal ? (laneOffset < 0 ? 0 : Math.PI) : (laneOffset < 0 ? Math.PI / 2 : -Math.PI / 2);
      trafficCars.push(makeVehicle(pick(r, trafficKinds), x, y, angle, false));
    }

    // County Events / Roadblocks
    const eventTypes = [
      { type: 'train', label: 'TRAIN CROSSING', note: 'Freight train running through the Railroad Ward.' },
      { type: 'breakdown', label: 'BROKEN WAGON', note: 'A delivery wagon is blocking the main road.' },
      { type: 'bridge', label: 'HIGH WATER BRIDGE', note: 'Blackwater is raging. Cross with caution.' },
      { type: 'riders', label: 'RIVAL OUTLAWS', note: 'Rival gang spotted watching the junction.' },
      { type: 'search', label: 'SHERIFF CHECKPOINT', note: 'The posse is questioning travelers ahead.' }
    ];
    for (let i = 0; i < 9; i++) {
      const horizontal = r() > 0.5;
      const road = horizontal ? pick(r, roadsY) : pick(r, roadsX);
      events.push({
        ...pick(r, eventTypes),
        x: horizontal ? 350 + r() * (WORLD_W - 700) : road + (r() > 0.5 ? 26 : -26),
        y: horizontal ? road + (r() > 0.5 ? 26 : -26) : 350 + r() * (WORLD_H - 700),
        radius: 170,
        active: false,
        triggered: false,
        cooldown: 8 + r() * 14,
        seed: r()
      });
    }

    return {
      seed,
      roadsX,
      roadsY,
      buildings,
      doors,
      parks,
      worldProps,
      jobSites,
      hideouts,
      streetLights,
      trafficCars,
      trainTrackY,
      initialTrain,
      events
    };
  }

  function districtAt(pos) {
    for (const d of DISTRICTS) {
      if (pos.x >= d.x && pos.x <= d.x + d.w && pos.y >= d.y && pos.y <= d.y + d.h) return d;
    }
    return DISTRICTS[0];
  }

  function makeVehicle(kind, x, y, angle, isPlayer = false) {
    const baseSpec = VEHICLE_TYPES[kind] || VEHICLE_TYPES.sedan;
    const spec = { ...baseSpec };
    if (isPlayer) {
      if (upgrades.engine > 0) {
        spec.top *= 1 + upgrades.engine * 0.15;
        spec.accel *= 1 + upgrades.engine * 0.22;
      }
      if (upgrades.bumper > 0) {
        spec.durability += upgrades.bumper * 40;
      }
      if (upgrades.tires > 0) {
        spec.grip = Math.min(0.98, spec.grip + upgrades.tires * 0.06);
        spec.turn += upgrades.tires * 0.25;
      }
    }

    return {
      kind,
      x,
      y,
      angle,
      speed: 0,
      lateralSpeed: 0,
      health: spec.durability,
      maxHealth: spec.durability,
      spec,
      isPlayer: !!isPlayer,
      abandoned: false,
      ai: !isPlayer,
      hitFlash: 0,
      skid: 0,
      siren: Math.random() * TAU,
      wheelTurn: 0,
      color: spec.color,
      accent: spec.accent
    };
  }

  function resetRain() {
    const r = rngFrom(seedText + ':rain');
    rain = [];
    const count = weather.wet ? 140 : 70;
    for (let i = 0; i < count; i++) {
      rain.push({
        x: r() * W,
        y: r() * H,
        len: weather.wet ? 6 + r() * 14 : 2 + r() * 5,
        speed: weather.wet ? 260 + r() * 260 : 30 + r() * 40,
        alpha: weather.wet ? 0.15 + r() * 0.35 : 0.08 + r() * 0.18,
        slant: weather.wet ? 5 + r() * 8 : 1 + r() * 4
      });
    }
  }

  // --- Mission System ---
  function newMission(isFirst = false) {
    const r = rngFrom(`${seedText}:job:${missionNumber}:${money}:${Date.now()}`);
    const types = [
      {
        key: 'delivery',
        title: 'RUN THE SATCHEL',
        description: 'Deliver the sealed contraband satchel to the drop point. Keep low profile.',
        risk: 1,
        radio: 'Keep it quiet. The law is checking outbound wagons.'
      },
      {
        key: 'bank_heist',
        title: 'DUSTFALL VAULT HEIST',
        description: 'Crack the bank safe in town. Expect immediate sheriff pursuit upon exit!',
        risk: 3,
        radio: 'Alarm is tripped! Shake the posse and make it across the county line!'
      },
      {
        key: 'train_ambush',
        title: 'RAILROAD PAYROLL AMBUSH',
        description: 'Intercept the moving freight train at the rail crossing and snatch the payroll.',
        risk: 3,
        radio: 'Train payroll secured! The cavalry is swarming the tracks!'
      },
      {
        key: 'bootlegger',
        title: 'MOONSHINE EXPRESS',
        description: 'Fragile cargo run across rough canyon trails. Heavy crashes damage payout.',
        risk: 2,
        radio: 'Do not smash the jars. Clean delivery pays a premium.'
      },
      {
        key: 'jailbreak',
        title: 'WITNESS EXTRACTION',
        description: 'Pick up an outlaw partner under sheriff surveillance and bring them to safehouse.',
        risk: 2,
        radio: 'Contact is in the passenger seat. Move before they block the bridges!'
      },
      {
        key: 'burn_switch',
        title: 'BURN & SWITCH',
        description: 'Ditch your hot wanted wagon at the drop point and steal a clean ride.',
        risk: 2,
        radio: 'Abandon the old wagon. Find a clean set of wheels to break the search.'
      }
    ];

    const type = isFirst ? types[0] : pick(r, types);
    const start = isFirst
      ? { x: world.hideouts[0].spawnX, y: world.hideouts[0].spawnY, label: 'MAIN STREET TELEGRAPH' }
      : { ...pick(r, world.jobSites) };

    let destination = { ...pick(r, world.jobSites) };
    let tries = 0;
    while (dist(start, destination) < 800 && tries++ < 12) {
      destination = { ...pick(r, world.jobSites) };
    }

    const handoff = { ...pick(r, world.jobSites) };
    let payout = 320 + type.risk * 220 + Math.floor(r() * 200);
    if (upgrades.smuggler) payout = Math.round(payout * 1.5);

    mission = {
      number: missionNumber,
      ...type,
      start,
      destination,
      handoff,
      payout,
      cargoIntegrity: 100,
      state: 'available',
      phase: 'accept',
      timer: 0,
      complication: pick(r, [
        'sheriff roadblock at river bridge',
        'freight train blocking crossing',
        'witness alerting the deputies',
        'posse interceptors closing in'
      ]),
      revealed: false,
      quietBonus: false
    };

    radio(type.radio);
  }

  // --- Start & Loop Management ---
  function startRun(mode) {
    ensureAudio();
    startAudioBed();
    runMode = mode;
    gameMode = 'playing';

    titleScreen.classList.remove('active');
    titleScreen.style.display = 'none';
    pauseScreen.hidden = true;
    garageScreen.hidden = true;
    bustedScreen.hidden = true;
    helpScreen.hidden = true;
    gameUI.classList.add('active');

    world = buildWorld(seedText);
    const forecast = rngFrom(seedText + ':forecast')();
    weather = forecast > 0.4 ? { kind: 'storm', wet: true } : { kind: 'dry', wet: false };
    resetRain();

    traffic = world.trafficCars.map((v) => ({ ...v }));
    police = [];
    particles = [];
    skidMarks = [];
    caltrops = [];
    props = world.worldProps.map((p) => ({ ...p }));
    train = { ...world.initialTrain };
    countyEvents = world.events.map((e) => ({ ...e }));
    lawSearch = { x: world.hideouts[0].spawnX, y: world.hideouts[0].spawnY, ttl: 0, active: false };
    flash = 0;

    // Guaranteed safe starting position in open driveway
    const startHideout = world.hideouts[0];
    const initialKind = mode === 'endless' ? 'compact' : upgrades.ownedVehicles[upgrades.ownedVehicles.length - 1] || 'sedan';

    playerCar = makeVehicle(initialKind, startHideout.spawnX, startHideout.spawnY, startHideout.spawnAngle, true);
    player = {
      x: playerCar.x,
      y: playerCar.y,
      angle: playerCar.angle,
      onFoot: false,
      crouching: false,
      hidden: false,
      stamina: 1.0,
      dodge: 0,
      interior: null,
      interiorPos: { x: 0, y: 0 }
    };

    money = mode === 'endless' ? 0 : careerCash;
    careerStreak = 0;
    heat = 0;
    nitro = 100;
    caltropAmmo = 3;
    driftPoints = 0;
    driftTimer = 0;
    missionNumber = 1;
    camera = { x: player.x, y: player.y, shake: 0 };

    newMission(true);
    notify(mode === 'endless' ? 'OUTLAW RUN // NO SAFETY NET' : 'DUSTFALL COUNTY IS OPEN', 'good');
    notify('Ride to the telegraph beacon or open safehouse garage [E].', '');
    playWesternJingle('start');

    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(now) {
    if (gameMode !== 'playing') return;
    const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    elapsed += dt;

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  // --- Main Update ---
  function update(dt) {
    updatePlayer(dt);
    updateTraffic(dt);
    updateTrain(dt);
    updateEvents(dt);
    updatePolice(dt);
    updateMission(dt);
    updateParticles(dt);
    updateRain(dt);
    updateCamera(dt);
    updateAudio();
    updateHUD(dt);

    radioTimer -= dt;
    ambientTimer -= dt;
    if (radioTimer <= 0 && Math.random() < 0.02) cycleRadio();
    if (ambientTimer <= 0) {
      ambientTimer = 14 + Math.random() * 16;
      cityEvent();
    }

    // Weather & Lightning in storm
    if (weather.wet) {
      lightningTimer -= dt;
      if (lightningTimer <= 0) {
        lightningTimer = 7 + Math.random() * 12;
        flash = 0.65;
        playThunder();
      }
    }

    for (const k in justPressed) delete justPressed[k];
  }

  function targetPos() {
    return player.onFoot ? player : playerCar;
  }

  // --- Input & Movement Handling ---
  function axis() {
    let x = 0, y = 0;
    if (keys.a || keys.arrowleft || keys.q) x -= 1;
    if (keys.d || keys.arrowright) x += 1;
    if (keys.w || keys.arrowup || keys.z) y -= 1;
    if (keys.s || keys.arrowdown) y += 1;
    if (touchVector.x || touchVector.y) { x = touchVector.x; y = touchVector.y; }
    const mag = Math.hypot(x, y);
    return mag > 1 ? { x: x / mag, y: y / mag } : { x, y };
  }

  function updatePlayer(dt) {
    if (player.interior) {
      updateInteriorPlayer(dt);
      return;
    }
    if (player.onFoot) updateOnFoot(dt);
    else updateDriving(dt);
  }

  // Axis-separated continuous collision and wall sliding
  function tryMoveVehicle(v, dx, dy, radius) {
    let newX = v.x + dx;
    let newY = v.y + dy;

    // De-penetration if already stuck
    if (blocked(v.x, v.y, radius)) {
      v.x = clamp(v.x + (Math.random() - 0.5) * 6, 40, WORLD_W - 40);
      v.y = clamp(v.y + (Math.random() - 0.5) * 6, 40, WORLD_H - 40);
    }

    // Test X movement independently
    if (!blocked(newX, v.y, radius)) {
      v.x = clamp(newX, 35, WORLD_W - 35);
    } else {
      if (Math.abs(v.speed) > 40) crash(v, Math.abs(v.speed) * 0.7);
      v.speed *= 0.65;
    }

    // Test Y movement independently
    if (!blocked(v.x, newY, radius)) {
      v.y = clamp(newY, 35, WORLD_H - 35);
    } else {
      if (Math.abs(v.speed) > 40) crash(v, Math.abs(v.speed) * 0.7);
      v.speed *= 0.65;
    }

    // Check destructible props collisions
    checkPropCollisions(v);
  }

  function updateDriving(dt) {
    const v = playerCar;
    const spec = v.spec;
    const a = axis();
    const throttle = -a.y;
    const steer = a.x;
    const braking = !!(keys[' '] || keys.space || justPressed.touchBrake);
    const boosting = !!(keys.shift || justPressed.touchNitro) && nitro > 1;

    // Nitro boost
    let boostMultiplier = 1.0;
    if (boosting && throttle > 0.1) {
      nitro = Math.max(0, nitro - dt * 28);
      boostMultiplier = 1.45;
      if (Math.random() < 0.6) {
        particles.push({
          x: v.x - Math.cos(v.angle) * 26,
          y: v.y - Math.sin(v.angle) * 26,
          vx: -Math.cos(v.angle) * 90 + (Math.random() - 0.5) * 30,
          vy: -Math.sin(v.angle) * 90 + (Math.random() - 0.5) * 30,
          life: 0.35,
          color: '#87aeb2',
          size: 4
        });
      }
    } else {
      nitro = Math.min(100, nitro + dt * 10);
    }

    // Acceleration & Braking
    if (throttle > 0.05) {
      v.speed += spec.accel * throttle * boostMultiplier * dt;
    } else if (throttle < -0.05) {
      if (v.speed > 5) v.speed -= spec.brake * dt;
      else v.speed += spec.accel * throttle * 0.65 * dt;
    } else {
      v.speed *= Math.pow(0.982, dt * 60);
    }

    if (braking) {
      v.speed *= Math.pow(0.93, dt * 60);
    }

    // Top speed & weather penalty
    const wetPenalty = weather.wet && upgrades.tires === 0 ? 0.92 : 1.0;
    const maxForward = spec.top * boostMultiplier * (1 - (spec.durability - v.health) / 750) * wetPenalty;
    const maxReverse = -spec.top * 0.38;
    v.speed = clamp(v.speed, maxReverse, maxForward);

    // Drifting & Steering Mechanics
    const isDrifting = braking && Math.abs(v.speed) > 50;
    const turnRate = spec.turn * (isDrifting ? 1.45 : 1.0);

    const steerDir = v.speed >= -5 ? 1 : -1;
    v.angle += steer * turnRate * dt * (0.45 + Math.min(1, Math.abs(v.speed) / 120)) * steerDir;

    // Drift physics & skid marks
    if (isDrifting) {
      v.skid = Math.min(1, v.skid + dt * 4);
      driftTimer += dt;
      driftPoints += Math.round(Math.abs(v.speed) * dt * 2);

      if (skidMarks.length > 250) skidMarks.shift();
      skidMarks.push({
        x: v.x - Math.cos(v.angle) * 16,
        y: v.y - Math.sin(v.angle) * 16,
        angle: v.angle,
        life: 14
      });

      if (Math.random() < 0.7) {
        particles.push({
          x: v.x - Math.cos(v.angle) * 20 + (Math.random() - 0.5) * 14,
          y: v.y - Math.sin(v.angle) * 20 + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 25,
          vy: (Math.random() - 0.5) * 25,
          life: 0.5,
          color: 'rgba(215, 190, 150, 0.4)',
          size: 5
        });
      }
    } else {
      v.skid = Math.max(0, v.skid - dt * 2.5);
      if (driftTimer > 0.6) {
        notify(`DRIFT BONUS // +$${Math.min(120, Math.round(driftPoints / 10))}`, 'good');
        money += Math.min(120, Math.round(driftPoints / 10));
        driftPoints = 0;
        driftTimer = 0;
      }
    }

    // Execute Move with continuous sliding
    const dx = Math.cos(v.angle) * v.speed * dt;
    const dy = Math.sin(v.angle) * v.speed * dt;
    tryMoveVehicle(v, dx, dy, 16);

    player.x = v.x;
    player.y = v.y;
    player.angle = v.angle;

    // Actions
    if (justPressed.e || justPressed.f || justPressed.enter || justPressed.touchAction) action();
    if (justPressed.c || justPressed.g || justPressed.touchCaltrop) dropCaltrops();
    if (justPressed.h || justPressed.r) {
      if (v.kind === 'police') playSirenStinger();
      else playTrainWhistle();
    }

    if (v.health < 35 && Math.random() < 0.006) {
      notify('WAGON CRITICAL // SEEK SAFEHOUSE WORKSHOP', 'warn');
    }
  }

  function updateOnFoot(dt) {
    const a = axis();
    const sprint = (keys.shift || justPressed.touchNitro) && player.stamina > 0.05;
    const speed = sprint ? 185 : player.crouching ? 65 : 120;

    if (sprint && (a.x || a.y)) player.stamina = Math.max(0, player.stamina - dt * 0.25);
    else player.stamina = Math.min(1, player.stamina + dt * 0.15);

    const nx = player.x + a.x * speed * dt;
    const ny = player.y + a.y * speed * dt;

    if (!blocked(nx, player.y, 8)) player.x = clamp(nx, 20, WORLD_W - 20);
    if (!blocked(player.x, ny, 8)) player.y = clamp(ny, 20, WORLD_H - 20);

    if (a.x || a.y) player.angle = Math.atan2(a.y, a.x);
    player.crouching = !!(keys.c || keys.control);

    if (justPressed.e || justPressed.f || justPressed.enter || justPressed.touchAction) action();
  }

  function updateInteriorPlayer(dt) {
    const a = axis();
    const speed = player.crouching ? 45 : 95;
    player.interiorPos.x = clamp(player.interiorPos.x + a.x * speed * dt, -120, 120);
    player.interiorPos.y = clamp(player.interiorPos.y + a.y * speed * dt, -80, 90);
    if (a.x || a.y) player.angle = Math.atan2(a.y, a.x);
    player.crouching = !!(keys.c || keys.control);

    if (justPressed.e || justPressed.f || justPressed.enter || justPressed.touchAction) exitInterior();
  }

  // --- Props & Obstacles ---
  function checkPropCollisions(v) {
    const speed = Math.abs(v.speed);
    for (const p of props) {
      if (p.destroyed) continue;
      if (dist(v, p) < 26) {
        if (speed > 35) {
          p.destroyed = true;
          totalSmashCount++;
          playPropSmash();
          camera.shake = Math.max(camera.shake, 0.12);

          for (let i = 0; i < 7; i++) {
            particles.push({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 140,
              vy: (Math.random() - 0.5) * 140,
              life: 0.45,
              color: p.type === 'cactus' ? '#7d9259' : '#8a6542',
              size: 4
            });
          }

          if (totalSmashCount % 5 === 0) {
            money += 25;
            notify('OUTLAW RAMPAGE // +$25 SMASH BONUS', 'good');
          }
        }
      }
    }
  }

  // --- Freight Train System ---
  function updateTrain(dt) {
    if (!train) return;
    train.x += train.speed * dt;
    if (train.x > WORLD_W + 800) train.x = -600;

    train.bellTimer -= dt;
    for (const rx of world.roadsX) {
      if (Math.abs(train.x - rx) < 140 && train.bellTimer <= 0) {
        train.bellTimer = 6;
        playTrainWhistle();
      }
    }

    const headX = train.x;
    const trainY = train.y;
    for (let c = 0; c < train.length; c++) {
      const carX = headX - c * train.carSpacing;
      if (dist(playerCar, { x: carX, y: trainY }) < 38) {
        crash(playerCar, 120);
        playerCar.y += playerCar.y > trainY ? 45 : -45;
        notify('STRUCK BY FREIGHT TRAIN!', 'warn');
        break;
      }
    }
  }

  // --- Destructible Caltrops Trap ---
  function dropCaltrops() {
    if (caltropAmmo <= 0) {
      notify('OUT OF CALTROPS // REFILL AT SAFEHOUSE', 'warn');
      return;
    }
    caltropAmmo--;
    caltrops.push({
      x: playerCar.x - Math.cos(playerCar.angle) * 32,
      y: playerCar.y - Math.sin(playerCar.angle) * 32,
      ttl: 25
    });
    playCaltropDrop();
    notify(`CALTROP DEPLOYED // ${caltropAmmo} REMAINING`, 'good');
  }

  // --- Traffic AI ---
  function updateTraffic(dt) {
    for (const v of traffic) {
      if (v.abandoned) continue;
      v.x += Math.cos(v.angle) * (v.speed || v.spec.top * 0.25) * dt;
      v.y += Math.sin(v.angle) * (v.speed || v.spec.top * 0.25) * dt;

      if (v.x < -100) v.x = WORLD_W + 100;
      if (v.x > WORLD_W + 100) v.x = -100;
      if (v.y < -100) v.y = WORLD_H + 100;
      if (v.y > WORLD_H + 100) v.y = -100;

      v.hitFlash = Math.max(0, v.hitFlash - dt);

      if (!player.onFoot && !player.interior && dist(v, playerCar) < 28 && Math.abs(playerCar.speed) > 35) {
        crash(playerCar, Math.abs(playerCar.speed) * 0.55);
        v.hitFlash = 0.4;
        v.x += Math.cos(playerCar.angle) * 28;
        v.y += Math.sin(playerCar.angle) * 28;
        notify('TRAFFIC COLLISION // WITNESS REPORTED YOUR WAGON', 'warn');
        addHeat(0.3);
      }
    }
  }

  // --- Events & Roadblocks ---
  function updateEvents(dt) {
    flash = Math.max(0, flash - dt * 3.5);
    for (const event of countyEvents) {
      event.cooldown -= dt;
      if (event.active) {
        event.timer -= dt;
        if (event.timer <= 0) {
          event.active = false;
          event.cooldown = 14 + event.seed * 12;
        }
        continue;
      }
      if (event.cooldown > 0 || dist(targetPos(), event) > event.radius) continue;

      event.active = true;
      event.timer = 8;
      notify(`${event.label} // ${event.note}`, event.type === 'search' ? 'warn' : '');
      radio(event.note);
    }
  }

  // --- Law Posse & Sheriff System ---
  function updatePolice(dt) {
    const target = targetPos();
    if (!player.interior && heat > 0.4) policeTimer -= dt;

    const maxCops = heat > 3.8 ? 3 : heat > 2.0 ? 2 : heat > 0.8 ? 1 : 0;
    if (!player.interior && heat > 0.7 && policeTimer <= 0 && police.length < maxCops) {
      spawnPolice();
      policeTimer = 5 + Math.random() * 4;
    }

    for (let i = police.length - 1; i >= 0; i--) {
      const cop = police[i];
      cop.hitFlash = Math.max(0, cop.hitFlash - dt);

      // Check caltrops trap hit
      for (let ci = caltrops.length - 1; ci >= 0; ci--) {
        const cal = caltrops[ci];
        if (dist(cop, cal) < 24) {
          cop.health = 0;
          cop.speed = 0;
          cop.abandoned = true;
          caltrops.splice(ci, 1);
          playMetalCrunch();
          notify('SHERIFF HIT CALTROPS // TIRES SHREDDED!', 'good');
          police.splice(i, 1);
          continue;
        }
      }
      if (cop.abandoned) continue;

      // Line of Sight & Sight Cones
      const d = dist(cop, target);
      const angleToTarget = Math.atan2(target.y - cop.y, target.x - cop.x);
      const viewDiff = Math.abs(angleDiff(cop.angle, angleToTarget));
      const inCone = viewDiff < 1.1;
      const visible = !player.interior && !player.hidden && !player.crouching && d < 520 && (inCone || d < 120);

      if (visible) {
        cop.state = 'pursuit';
        cop.lastKnown = { x: target.x, y: target.y };
        lawSearch = { x: target.x, y: target.y, ttl: 10, active: true };
        cop.lost = 0;
        heat = clamp(heat + dt * 0.045, 0, 5);
      } else if (cop.state === 'pursuit') {
        cop.lost += dt;
        if (cop.lost > 3.2) {
          cop.state = 'search';
          cop.searchTime = 12;
          notify('LINE OF SIGHT BROKEN // POSSE SEARCHING AREA', 'good');
        }
      }

      let aim = cop.state === 'pursuit'
        ? { x: target.x + Math.cos(target.angle || 0) * 30, y: target.y + Math.sin(target.angle || 0) * 30 }
        : cop.lastKnown;

      if (cop.state === 'search') {
        cop.searchTime -= dt;
        if (cop.searchTime <= 0) {
          police.splice(i, 1);
          continue;
        }
      }

      const desired = Math.atan2(aim.y - cop.y, aim.x - cop.x);
      const delta = angleDiff(cop.angle, desired);
      cop.angle += clamp(delta, -2.5 * dt, 2.5 * dt);

      const copSpeed = cop.state === 'pursuit' ? cop.spec.top * (heat > 3.0 ? 0.76 : 0.62) : cop.spec.top * 0.32;
      cop.x += Math.cos(cop.angle) * copSpeed * dt;
      cop.y += Math.sin(cop.angle) * copSpeed * dt;

      if (blocked(cop.x, cop.y, 16)) {
        cop.angle += (Math.random() > 0.5 ? 1 : -1) * 1.2;
        cop.x -= Math.cos(cop.angle) * 10;
        cop.y -= Math.sin(cop.angle) * 10;
      }

      // Ramming / Busted condition
      if (dist(cop, target) < (player.onFoot ? 24 : 36) && !player.interior) {
        if (!player.onFoot && upgrades.bumper > 0 && Math.abs(playerCar.speed) > 130) {
          cop.health -= 60;
          playMetalCrunch();
          notify('RAMMED SHERIFF INTERCEPTOR!', 'good');
          if (cop.health <= 0) {
            police.splice(i, 1);
            continue;
          }
        } else {
          busted();
          return;
        }
      }
    }

    // Heat decay
    lawSearch.ttl = Math.max(0, lawSearch.ttl - dt);
    if (lawSearch.ttl <= 0) lawSearch.active = false;

    if (!player.interior && !player.hidden && police.length === 0 && heat > 0) {
      heat = Math.max(0, heat - dt * 0.035);
    }
    if (player.interior || player.hidden) {
      heat = Math.max(0, heat - dt * 0.08);
    }
  }

  function addHeat(amount) {
    const before = Math.ceil(heat);
    heat = clamp(heat + amount, 0, 5);
    const after = Math.ceil(heat);
    if (after > before) {
      if (after === 1) notify('HEAT 1 // SUSPICION ON THE ROADS', 'warn');
      if (after === 2) notify('HEAT 2 // SHERIFF PATROLS DISPATCHED', 'warn');
      if (after === 3) notify('HEAT 3 // PURSUIT INTERCEPTORS ACTIVE', 'warn');
      if (after === 4) notify('HEAT 4 // COUNTY MANHUNT IN EFFECT', 'warn');
      if (after >= 5) notify('HEAT 5 // COUNTY-WIDE LOCKDOWN!', 'warn');
      playSirenStinger();
    }
  }

  function spawnPolice() {
    const r = rngFrom(`${seedText}:cop:${elapsed}:${police.length}`);
    let x, y, angle;
    const target = targetPos();
    if (r() > 0.5) {
      x = r() > 0.5 ? 70 : WORLD_W - 70;
      y = target.y + (r() - 0.5) * 800;
      angle = Math.atan2(target.y - y, target.x - x);
    } else {
      y = r() > 0.5 ? 70 : WORLD_H - 70;
      x = target.x + (r() - 0.5) * 800;
      angle = Math.atan2(target.y - y, target.x - x);
    }
    x = clamp(x, 60, WORLD_W - 60);
    y = clamp(y, 60, WORLD_H - 60);

    const cop = makeVehicle('police', x, y, angle, false);
    cop.state = heat > 2.2 ? 'pursuit' : 'search';
    cop.lastKnown = { x: target.x, y: target.y };
    cop.lost = 99;
    cop.searchTime = 14;
    police.push(cop);

    notify(police.length > 1 ? 'POSSE REINFORCEMENTS IN PURSUIT' : 'SHERIFF PATROL SPOTTED', 'warn');
    radio(police.length > 1 ? 'All riders, close the crossings!' : 'Rider 14, suspicious wagon heading your way.');
  }

  // --- Missions & Contracts ---
  function updateMission(dt) {
    if (!mission) return;
    if (mission.state === 'active') {
      mission.timer += dt;
      if (mission.timer > 10 && !mission.revealed) {
        mission.revealed = true;
        notify('COMPLICATION // ' + mission.complication.toUpperCase(), 'warn');
        addHeat(mission.risk * 0.2);
      }

      const target = getMissionTarget();
      if (target && dist(targetPos(), target) < 80) {
        if (mission.key === 'bank_heist' && mission.phase === 'escape') {
          completeMission();
        } else if (mission.key === 'delivery' && mission.phase === 'escape') {
          completeMission();
        } else if (mission.key === 'bootlegger' && mission.phase === 'escape') {
          completeMission();
        }
      }
    } else if (mission.state === 'cooldown') {
      mission.timer += dt;
      if (mission.timer > 3.0) {
        missionNumber++;
        newMission(false);
      }
    }
  }

  function getMissionTarget() {
    if (!mission || mission.state === 'cooldown') return null;
    if (mission.state !== 'active') return mission.start;
    if (mission.phase === 'retrieve' || mission.phase === 'infiltrate') return mission.destination;
    if (mission.phase === 'handoff' || mission.phase === 'escape') return mission.handoff;
    return mission.destination;
  }

  function missionInstruction() {
    if (!mission) return '';
    if (mission.state === 'available') return `Ride to ${mission.start.label} and press [E] to accept contract.`;
    if (mission.state === 'cooldown') return 'Contract completed. Payment wired to safehouse.';
    if (mission.key === 'bank_heist') {
      if (mission.phase === 'route') return `Drive to ${mission.destination.label} to initiate vault break-in.`;
      if (mission.phase === 'escape') return `Posse alerted! Escape to ${mission.handoff.label} across county lines!`;
    }
    if (mission.key === 'train_ambush') {
      if (mission.phase === 'route') return 'Intercept the moving freight train along the railroad tracks!';
      if (mission.phase === 'escape') return `Snatch secured! Evade the cavalry and reach ${mission.handoff.label}.`;
    }
    if (mission.key === 'bootlegger') {
      if (mission.phase === 'route') return `Deliver fragile moonshine to ${mission.destination.label}. Avoid hard crashes!`;
    }
    if (mission.key === 'jailbreak') {
      if (mission.phase === 'route') return `Reach ${mission.destination.label} and pick up your outlaw partner.`;
      if (mission.phase === 'escape') return `Witness on board! Deliver them safely to ${mission.handoff.label}.`;
    }
    if (mission.key === 'burn_switch') {
      if (mission.phase === 'route') return `Drive to ${mission.destination.label} and ditch your hot wagon.`;
      if (mission.phase === 'escape') return `Steal a clean civilian vehicle and reach ${mission.handoff.label}.`;
    }
    return `Reach ${mission.destination.label} and make the drop.`;
  }

  function action() {
    if (player.interior) {
      exitInterior();
      return;
    }

    const p = targetPos();

    // Check Hideout Garage Entry
    const safehouse = world.hideouts.find((h) => dist(p, h) < 85);
    if (safehouse) {
      openGarage(safehouse);
      return;
    }

    // Accept Available Mission
    if (mission && mission.state === 'available' && dist(p, mission.start) < 95) {
      acceptMission();
      return;
    }

    // Advance Multi-stage Mission
    if (mission && mission.state === 'active') {
      const target = getMissionTarget();
      if (target && dist(p, target) < 95) {
        if (mission.key === 'bank_heist' && mission.phase === 'route') {
          mission.phase = 'escape';
          addHeat(2.5);
          notify('VAULT CRACKED // $500 BONUS LOOT SECURED!', 'good');
          radio('Bank alarm ringing! All units converge on the main street!');
          playGunshot();
          return;
        }
        if (mission.key === 'train_ambush' && mission.phase === 'route') {
          mission.phase = 'escape';
          addHeat(2.0);
          notify('PAYROLL SATCHEL SNATCHED!', 'good');
          radio('Train hijacked! Posse dispatched to the rail ward!');
          return;
        }
        if (mission.key === 'jailbreak' && mission.phase === 'route') {
          mission.phase = 'escape';
          addHeat(1.2);
          notify('PARTNER IN THE PASSENGER SEAT // HIT THE GAS!', 'good');
          return;
        }
        if (mission.key === 'burn_switch' && mission.phase === 'route') {
          mission.phase = 'escape';
          heat = 0;
          notify('HOT WAGON ABANDONED // HEAT CLEARED!', 'good');
          radio('Lost visual on the hotrod. Sweep the area for foot traffic.');
          return;
        }
        completeMission();
        return;
      }
    }

    // Vehicle Enter / Exit
    if (player.onFoot) {
      if (dist(player, playerCar) < 45) {
        enterVehicle(playerCar);
        return;
      }
      const abandoned = traffic.find((v) => v.abandoned && dist(player, v) < 45);
      if (abandoned) {
        enterVehicle(abandoned);
        return;
      }
      const door = world.doors.find((d) => dist(player, d) < 55);
      if (door) {
        enterInterior(door);
        return;
      }
    } else {
      if (Math.abs(playerCar.speed) < 35) {
        exitVehicle();
        return;
      }
    }
  }

  function acceptMission() {
    mission.state = 'active';
    mission.phase = 'route';
    mission.timer = 0;
    mission.revealed = false;
    addHeat(mission.risk * 0.25);
    notify(`CONTRACT ACCEPTED // ${mission.title}`, 'good');
    radio(mission.radio);
    playWesternJingle('accept');
  }

  function completeMission() {
    if (!mission || mission.state !== 'active') return;
    mission.state = 'cooldown';
    mission.phase = 'done';
    mission.timer = 0;

    let award = mission.payout;
    money += award;
    careerStreak += 1;
    bestStreak = Math.max(bestStreak, careerStreak);
    persistCareer();

    notify(`CONTRACT COMPLETE // +${formatMoney(award)} REWARD!`, 'good');
    radio('Handoff confirmed. Satchel delivered clean.');
    playWesternJingle('complete');
  }

  // --- Safehouse & Garage Workshop ---
  function openGarage(safehouse) {
    activeSafehouse = safehouse;
    gameMode = 'garage';
    garageScreen.hidden = false;
    $('garage-location').textContent = `${safehouse.name} // WORKSHOP`;
    $('garage-cash').textContent = formatMoney(money);
    renderGaragePanels();
  }

  function closeGarage() {
    garageScreen.hidden = true;
    gameMode = 'playing';
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function renderGaragePanels() {
    $('garage-cash').textContent = formatMoney(money);
    const tuningPanel = $('garage-tuning-panel');
    const vehiclePanel = $('garage-vehicle-panel');

    const repairCost = Math.ceil((1 - playerCar.health / playerCar.maxHealth) * 180) + (heat > 0 ? 50 : 0);
    tuningPanel.innerHTML = `
      <div class="upgrade-card ${playerCar.health === playerCar.maxHealth && heat === 0 ? 'installed' : ''}">
        <div class="card-top">
          <h4>REPAIR &amp; RESPRAY</h4>
          <span class="price">${repairCost > 0 ? formatMoney(repairCost) : 'CLEAN'}</span>
        </div>
        <p class="card-desc">Restore wagon condition to 100%, apply fresh paint job, and wipe all wanted heat.</p>
        <button class="buy-btn" id="btn-repair" ${money < repairCost || repairCost === 0 ? 'disabled' : ''}>
          ${repairCost > 0 ? `REPAIR &amp; WIPE HEAT (${formatMoney(repairCost)})` : 'PERFECT CONDITION'}
        </button>
      </div>

      <div class="upgrade-card ${upgrades.engine >= 2 ? 'installed' : ''}">
        <div class="card-top">
          <h4>V8 ENGINE TUNING</h4>
          <span class="price">${upgrades.engine >= 2 ? 'MAX' : formatMoney(300)}</span>
        </div>
        <p class="card-desc">Stage ${upgrades.engine}/2: Boosts top speed by +15% and acceleration by +22%.</p>
        <button class="buy-btn" id="btn-upgrade-engine" ${money < 300 || upgrades.engine >= 2 ? 'disabled' : ''}>
          ${upgrades.engine >= 2 ? 'MAX LEVEL' : `UPGRADE (${formatMoney(300)})`}
        </button>
      </div>

      <div class="upgrade-card ${upgrades.bumper >= 2 ? 'installed' : ''}">
        <div class="card-top">
          <h4>STEEL RAM-BUMPER</h4>
          <span class="price">${upgrades.bumper >= 2 ? 'MAX' : formatMoney(250)}</span>
        </div>
        <p class="card-desc">Stage ${upgrades.bumper}/2: Increases durability +40 and smashes sheriff cruisers.</p>
        <button class="buy-btn" id="btn-upgrade-bumper" ${money < 250 || upgrades.bumper >= 2 ? 'disabled' : ''}>
          ${upgrades.bumper >= 2 ? 'MAX LEVEL' : `INSTALL (${formatMoney(250)})`}
        </button>
      </div>

      <div class="upgrade-card ${upgrades.tires >= 1 ? 'installed' : ''}">
        <div class="card-top">
          <h4>RALLY MUD TIRES</h4>
          <span class="price">${upgrades.tires >= 1 ? 'INSTALLED' : formatMoney(200)}</span>
        </div>
        <p class="card-desc">All-terrain compound. Maximum traction in rain storms and dirt canyon trails.</p>
        <button class="buy-btn" id="btn-upgrade-tires" ${money < 200 || upgrades.tires >= 1 ? 'disabled' : ''}>
          ${upgrades.tires >= 1 ? 'INSTALLED' : `INSTALL (${formatMoney(200)})`}
        </button>
      </div>

      <div class="upgrade-card ${upgrades.smuggler ? 'installed' : ''}">
        <div class="card-top">
          <h4>SMUGGLER FLOORBOARD</h4>
          <span class="price">${upgrades.smuggler ? 'INSTALLED' : formatMoney(350)}</span>
        </div>
        <p class="card-desc">Secret hollowed chassis compartments increase all contract payouts by +50%.</p>
        <button class="buy-btn" id="btn-upgrade-smuggler" ${money < 350 || upgrades.smuggler ? 'disabled' : ''}>
          ${upgrades.smuggler ? 'INSTALLED' : `PURCHASE (${formatMoney(350)})`}
        </button>
      </div>

      <div class="upgrade-card">
        <div class="card-top">
          <h4>SPIKE CALTROPS REFILL</h4>
          <span class="price">${formatMoney(100)}</span>
        </div>
        <p class="card-desc">Current ammo: ${caltropAmmo}/3. Drop spike strips [C] behind you to shred pursuers' tires.</p>
        <button class="buy-btn" id="btn-refill-caltrops" ${money < 100 || caltropAmmo >= 3 ? 'disabled' : ''}>
          ${caltropAmmo >= 3 ? 'FULL AMMO' : `REFILL (${formatMoney(100)})`}
        </button>
      </div>
    `;

    vehiclePanel.innerHTML = Object.entries(VEHICLE_TYPES)
      .map(([k, v]) => {
        const owned = upgrades.ownedVehicles.includes(k);
        const isActive = playerCar.kind === k;
        return `
          <div class="vehicle-card ${isActive ? 'active' : ''}">
            <div class="card-top">
              <h4>${v.name}</h4>
              <span class="price">${owned ? (isActive ? 'CURRENT' : 'OWNED') : formatMoney(v.price)}</span>
            </div>
            <p class="card-desc">${v.desc} Top Speed: ${v.top} km/h | Durability: ${v.durability}</p>
            <button class="buy-btn" data-vehicle="${k}" ${!owned && money < v.price ? 'disabled' : ''}>
              ${isActive ? 'CURRENT RIDE' : owned ? 'SELECT VEHICLE' : `BUY (${formatMoney(v.price)})`}
            </button>
          </div>
        `;
      })
      .join('');

    // Attach listeners
    $('btn-repair').onclick = () => {
      if (money >= repairCost && repairCost > 0) {
        money -= repairCost;
        playerCar.health = playerCar.maxHealth;
        heat = 0;
        police = [];
        playerCar.color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        persistCareer();
        notify('WAGON REPAIRED & RESPRAYED // HEAT CLEARED', 'good');
        renderGaragePanels();
      }
    };

    $('btn-upgrade-engine').onclick = () => {
      if (money >= 300 && upgrades.engine < 2) {
        money -= 300;
        upgrades.engine++;
        playerCar = makeVehicle(playerCar.kind, playerCar.x, playerCar.y, playerCar.angle, true);
        persistCareer();
        notify('V8 ENGINE TUNING INSTALLED!', 'good');
        renderGaragePanels();
      }
    };

    $('btn-upgrade-bumper').onclick = () => {
      if (money >= 250 && upgrades.bumper < 2) {
        money -= 250;
        upgrades.bumper++;
        playerCar = makeVehicle(playerCar.kind, playerCar.x, playerCar.y, playerCar.angle, true);
        persistCareer();
        notify('STEEL RAM-BUMPER INSTALLED!', 'good');
        renderGaragePanels();
      }
    };

    $('btn-upgrade-tires').onclick = () => {
      if (money >= 200 && upgrades.tires === 0) {
        money -= 200;
        upgrades.tires = 1;
        playerCar = makeVehicle(playerCar.kind, playerCar.x, playerCar.y, playerCar.angle, true);
        persistCareer();
        notify('RALLY MUD TIRES FITTED!', 'good');
        renderGaragePanels();
      }
    };

    $('btn-upgrade-smuggler').onclick = () => {
      if (money >= 350 && !upgrades.smuggler) {
        money -= 350;
        upgrades.smuggler = true;
        persistCareer();
        notify('SMUGGLER FLOORBOARDS INSTALLED // +50% REWARDS!', 'good');
        renderGaragePanels();
      }
    };

    $('btn-refill-caltrops').onclick = () => {
      if (money >= 100 && caltropAmmo < 3) {
        money -= 100;
        caltropAmmo = 3;
        persistCareer();
        notify('CALTROPS RESTOCKED!', 'good');
        renderGaragePanels();
      }
    };

    vehiclePanel.querySelectorAll('[data-vehicle]').forEach((btn) => {
      btn.onclick = () => {
        const k = btn.dataset.vehicle;
        if (!upgrades.ownedVehicles.includes(k)) {
          const spec = VEHICLE_TYPES[k];
          if (money >= spec.price) {
            money -= spec.price;
            upgrades.ownedVehicles.push(k);
            notify(`ACQUIRED ${spec.name}!`, 'good');
          }
        }
        if (upgrades.ownedVehicles.includes(k)) {
          playerCar = makeVehicle(k, playerCar.x, playerCar.y, playerCar.angle, true);
          persistCareer();
          renderGaragePanels();
        }
      };
    });
  }

  // --- Interiors ---
  function enterInterior(door) {
    if (!player.onFoot) {
      notify('LEAVE VEHICLE BEFORE ENTERING BUILDING', 'warn');
      return;
    }
    player.interior = door;
    player.interiorPos = { x: 0, y: 50 };
    player.hidden = true;
    notify(`${door.label} // LINE OF SIGHT BROKEN`, 'good');
    playDoorCreak();
  }

  function exitInterior() {
    if (!player.interior) return;
    const door = player.interior;
    player.interior = null;
    player.hidden = false;
    player.x = door.x;
    player.y = door.y + 24;
    player.interiorPos = { x: 0, y: 0 };
    notify('BACK OUTSIDE // STAY VIGILANT', '');
  }

  function enterVehicle(vehicle) {
    playerCar = vehicle;
    vehicle.abandoned = false;
    vehicle.isPlayer = true;
    player.onFoot = false;
    player.hidden = false;
    player.x = vehicle.x;
    player.y = vehicle.y;
    player.angle = vehicle.angle;
    notify(`BOARDED ${vehicle.spec.name}`, 'good');
  }

  function exitVehicle() {
    player.onFoot = true;
    playerCar.abandoned = true;
    playerCar.isPlayer = false;
    if (!traffic.includes(playerCar)) traffic.push(playerCar);
    player.x = playerCar.x + Math.cos(playerCar.angle + Math.PI / 2) * 26;
    player.y = playerCar.y + Math.sin(playerCar.angle + Math.PI / 2) * 26;
    player.hidden = false;
    notify('ON FOOT // FIND COVER OR CLEAN WHEELS', '');
  }

  // --- Crash & Damage ---
  function crash(v, impact) {
    const bumperArmor = v.isPlayer && upgrades.bumper > 0 ? 0.45 : 1.0;
    v.health = Math.max(0, v.health - impact * 0.12 * bumperArmor);
    v.speed *= -0.32;
    camera.shake = Math.max(camera.shake, clamp(impact / 400, 0.1, 0.42));
    flash = Math.max(flash, clamp(impact / 200, 0.12, 0.6));
    playMetalCrunch();

    if (v.health <= 0) {
      notify('WAGON TOTALED // EXIT NOW!', 'warn');
      if (v.isPlayer) exitVehicle();
    }
  }

  // --- Busted Screen ---
  function busted() {
    if (gameMode !== 'playing') return;
    gameMode = 'busted';
    const fine = Math.min(money, 250);
    money = Math.max(0, money - fine);
    careerStreak = 0;
    persistCareer();

    bustedScreen.hidden = false;
    $('busted-stats').innerHTML = `
      <div class="pause-stat"><b>${formatMoney(fine)}</b><span>COUNTY FINE</span></div>
      <div class="pause-stat"><b>${formatMoney(money)}</b><span>REMAINING</span></div>
      <div class="pause-stat"><b>${bestStreak}</b><span>RECORD STREAK</span></div>
    `;
    playWesternJingle('busted');
  }

  // --- Radio & Ambient ---
  function radio(line) {
    $('radio-line').textContent = line;
    radioTimer = 11;
  }

  function cycleRadio() {
    const lines =
      heat > 2.5
        ? [
            'All units: suspect spotted heading towards the crossing!',
            'Maintain visual! Roadblock ready at the river.',
            'Outlaw driving aggressively through town!',
            'Hold the county perimeter!'
          ]
        : [
            'Storm advisory across Red Mesa tonight.',
            'Rail depot freight schedule on time.',
            'Quiet night on Dustfall Main Street.',
            'County radio band clear.'
          ];
    radio(choice(lines));
    $('radio-source').textContent = heat > 2.5 ? 'SHERIFF BAND // OPEN CHANNEL' : 'TELEGRAPH / COUNTY BAND';
  }

  function cityEvent() {
    const events = [
      'A freight train approaches the depot.',
      'Lantern flickering at the old livery.',
      'Red Mesa dust wind picking up.',
      'Stagecoach parked outside the saloon.'
    ];
    radio(choice(events));
  }

  function notify(text, type = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = text;
    $('toast-stack').appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // --- Collision Checker ---
  function blocked(x, y, radius) {
    if (x < 25 || y < 25 || x > WORLD_W - 25 || y > WORLD_H - 25) return true;
    for (const b of world.buildings) {
      if (x > b.x - radius && x < b.x + b.w + radius && y > b.y - radius && y < b.y + b.h + radius) {
        return true;
      }
    }
    return false;
  }

  // --- Particle Systems ---
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = skidMarks.length - 1; i >= 0; i--) {
      skidMarks[i].life -= dt;
      if (skidMarks[i].life <= 0) skidMarks.splice(i, 1);
    }
    for (let i = caltrops.length - 1; i >= 0; i--) {
      caltrops[i].ttl -= dt;
      if (caltrops[i].ttl <= 0) caltrops.splice(i, 1);
    }
  }

  function updateRain(dt) {
    for (const drop of rain) {
      drop.x += drop.slant * dt;
      drop.y += drop.speed * dt;
      if (drop.y > H + 25) {
        drop.y = -20;
        drop.x = Math.random() * W;
      }
      if (drop.x > W + 20) drop.x = -20;
    }
  }

  function updateCamera(dt) {
    const t = targetPos();
    const lookAhead = player.onFoot ? 0 : Math.cos(playerCar.angle) * Math.min(120, Math.abs(playerCar.speed) * 0.45);
    const lookAheadY = player.onFoot ? 0 : Math.sin(playerCar.angle) * Math.min(100, Math.abs(playerCar.speed) * 0.4);

    camera.x = lerp(camera.x, t.x + lookAhead, 1 - Math.pow(0.001, dt));
    camera.y = lerp(camera.y, t.y + lookAheadY, 1 - Math.pow(0.001, dt));
    camera.x = clamp(camera.x, W / 2, WORLD_W - W / 2);
    camera.y = clamp(camera.y, H / 2, WORLD_H - H / 2);
    camera.shake = Math.max(0, camera.shake - dt * 2.2);
  }

  // --- HUD Update ---
  function updateHUD(dt) {
    const district = districtAt(targetPos());
    $('district-name').textContent = district.name;
    $('money-value').textContent = formatMoney(money);

    const speed = player.onFoot ? 0 : Math.abs(playerCar.speed) * 0.65;
    $('speed-value').textContent = String(Math.round(speed)).padStart(3, '0');
    $('vehicle-name').textContent = player.onFoot
      ? 'ON FOOT // ' + (player.crouching ? 'CROUCHING' : 'SPRINT READY')
      : playerCar.spec.name;

    const conditionPercent = player.onFoot ? 100 : (playerCar.health / playerCar.maxHealth) * 100;
    $('condition-bar').style.width = `${clamp(conditionPercent, 0, 100)}%`;
    $('condition-bar').style.background = conditionPercent < 30 ? 'var(--red)' : conditionPercent < 60 ? 'var(--amber)' : 'var(--acid)';

    $('nitro-bar').style.width = `${nitro}%`;
    $('caltrop-count').textContent = caltropAmmo;

    const stage = Math.ceil(heat);
    const heatLabels = ['QUIET', 'SUSPICION', 'SEARCH', 'PURSUIT', 'MANHUNT', 'LOCKDOWN'];
    $('heat-stage').textContent = heatLabels[stage] || 'QUIET';
    $('heat-stage').style.color = stage >= 3 ? 'var(--red)' : stage > 0 ? 'var(--amber)' : 'var(--cyan)';
    [...$('heat-pips').children].forEach((el, i) => el.classList.toggle('hot', i < stage));

    if (driftPoints > 0) {
      $('drift-counter').hidden = false;
      $('drift-score').textContent = `+${driftPoints}`;
    } else {
      $('drift-counter').hidden = true;
    }

    updateMissionHUD();

    const prompt = getPrompt();
    $('interaction-prompt').hidden = !prompt;
    if (prompt) $('interaction-text').textContent = prompt;

    const target = getMissionTarget();
    if (target) {
      $('gps-dist').textContent = `${Math.round(dist(targetPos(), target) / 10)}m`;
      $('gps-target').textContent = mission ? mission.title : 'TARGET';
    }

    drawMap();
  }

  function updateMissionHUD() {
    if (!mission) return;
    $('mission-code').textContent = `JOB—${String(mission.number).padStart(3, '0')}`;
    $('mission-title').textContent = mission.state === 'cooldown' ? 'CONTRACT COMPLETE' : mission.title;
    $('mission-description').textContent = missionInstruction();
    $('mission-pay').textContent = formatMoney(mission.payout);
    $('mission-risk').textContent = `RISK / ${['LOW', 'MED', 'HIGH'][mission.risk - 1]}`;
    $('mission-clock').textContent =
      mission.state === 'active'
        ? `${String(Math.floor(mission.timer / 60)).padStart(2, '0')}:${String(Math.floor(mission.timer % 60)).padStart(2, '0')}`
        : 'READY';
    $('mission-kicker-text').textContent = mission.state === 'active' ? 'ACTIVE CONTRACT' : mission.state === 'cooldown' ? 'PAID' : 'AVAILABLE';
    $('mission-status-dot').style.background = mission.state === 'cooldown' ? 'var(--cyan)' : mission.state === 'active' ? 'var(--red)' : 'var(--acid)';
  }

  function getPrompt() {
    if (player.interior) return 'EXIT BUILDING [E]';
    const p = targetPos();
    const safehouse = world.hideouts.find((h) => dist(p, h) < 85);
    if (safehouse) return `OPEN ${safehouse.name} [E]`;

    if (mission && mission.state === 'available' && dist(p, mission.start) < 95) return 'ACCEPT CONTRACT [E]';
    if (mission && mission.state === 'active') {
      const target = getMissionTarget();
      if (target && dist(p, target) < 95) {
        if (mission.phase === 'escape') return 'COMPLETE DROP [E]';
        return 'TRIGGER OBJECTIVE [E]';
      }
    }

    if (player.onFoot) {
      if (dist(p, playerCar) < 45) return 'ENTER VEHICLE [E]';
      const abandoned = traffic.find((v) => v.abandoned && dist(p, v) < 45);
      if (abandoned) return 'HIJACK VEHICLE [E]';
      const door = world.doors.find((d) => dist(p, d) < 55);
      if (door) return 'ENTER ' + door.label + ' [E]';
    } else if (Math.abs(playerCar.speed) < 35) {
      return 'EXIT VEHICLE [E]';
    }
    return null;
  }

  // --- Rendering ---
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const shakeX = (Math.random() - 0.5) * camera.shake * 22;
    const shakeY = (Math.random() - 0.5) * camera.shake * 16;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawWorld();
    ctx.restore();

    drawLighting();
    drawObjectiveGuide();
    drawRain();
    drawVignette();
  }

  function worldTransform() {
    const zoom = 1.05;
    ctx.translate(W / 2 - camera.x * zoom, H / 2 - camera.y * zoom);
    ctx.scale(zoom, zoom);
  }

  function drawWorld() {
    ctx.save();
    worldTransform();

    ctx.fillStyle = '#221711';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    for (const d of DISTRICTS) {
      ctx.fillStyle = d.color;
      ctx.fillRect(d.x, d.y, d.w, d.h);
    }

    drawTerrain();
    drawParks();
    drawRoads();
    drawSkidMarks();
    drawCaltrops();
    drawTrain();
    drawBuildings();
    drawProps();
    drawSafehouses();
    drawJobBeacons();
    drawParticles();

    for (const v of traffic) drawVehicle(v, false);
    if (playerCar) drawVehicle(playerCar, false);
    for (const c of police) drawVehicle(c, true);
    if (player.onFoot) drawPerson();

    if (player.interior) {
      ctx.restore();
      drawInteriorOverlay();
      return;
    }
    ctx.restore();
  }

  function drawTerrain() {
    ctx.fillStyle = 'rgba(125, 68, 42, 0.55)';
    ctx.fillRect(80, 2180, 95, 520);
    ctx.fillRect(1560, 2080, 85, 560);

    ctx.fillStyle = '#1c343b';
    ctx.fillRect(3700, 1850, 500, 1400);
    ctx.strokeStyle = 'rgba(135,174,178,0.35)';
    ctx.lineWidth = 3;
    for (let y = 1900; y < 3200; y += 45) {
      ctx.beginPath();
      ctx.moveTo(3720, y);
      ctx.lineTo(4180, y - 20);
      ctx.stroke();
    }
  }

  function drawParks() {
    for (const p of world.parks) {
      ctx.fillStyle = p.kind === 'courtyard' ? '#3e3228' : p.kind === 'marsh' ? '#2f423d' : '#324234';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = 'rgba(229,189,99,0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);
    }
  }

  function drawRoads() {
    for (const x of world.roadsX) {
      ctx.fillStyle = '#2c251f';
      ctx.fillRect(x - ROAD / 2, 0, ROAD, WORLD_H);
      ctx.fillStyle = 'rgba(183,145,91,0.25)';
      ctx.fillRect(x - ROAD / 2, 0, 5, WORLD_H);
      ctx.fillRect(x + ROAD / 2 - 5, 0, 5, WORLD_H);
      ctx.strokeStyle = 'rgba(229,189,99,0.3)';
      ctx.lineWidth = 3;
      ctx.setLineDash([36, 32]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_H);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const y of world.roadsY) {
      ctx.fillStyle = '#2c251f';
      ctx.fillRect(0, y - ROAD / 2, WORLD_W, ROAD);
      ctx.fillStyle = 'rgba(183,145,91,0.25)';
      ctx.fillRect(0, y - ROAD / 2, WORLD_W, 5);
      ctx.fillRect(0, y + ROAD / 2 - 5, WORLD_W, 5);
      ctx.strokeStyle = 'rgba(229,189,99,0.3)';
      ctx.lineWidth = 3;
      ctx.setLineDash([36, 32]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_W, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Railroad Track along Y = 160
    ctx.fillStyle = '#443428';
    ctx.fillRect(0, world.trainTrackY - 14, WORLD_W, 28);
    ctx.fillStyle = '#1e1814';
    for (let x = 0; x < WORLD_W; x += 22) {
      ctx.fillRect(x, world.trainTrackY - 18, 7, 36);
    }
    ctx.strokeStyle = '#85786a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, world.trainTrackY - 8);
    ctx.lineTo(WORLD_W, world.trainTrackY - 8);
    ctx.moveTo(0, world.trainTrackY + 8);
    ctx.lineTo(WORLD_W, world.trainTrackY + 8);
    ctx.stroke();
  }

  function drawSkidMarks() {
    ctx.save();
    for (const s of skidMarks) {
      ctx.strokeStyle = `rgba(18, 12, 8, ${Math.min(0.65, s.life / 14)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCaltrops() {
    for (const c of caltrops) {
      ctx.fillStyle = '#d79855';
      ctx.fillRect(c.x - 4, c.y - 4, 8, 8);
      ctx.strokeStyle = '#120d0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x - 4, c.y - 4, 8, 8);
    }
  }

  function drawTrain() {
    if (!train) return;
    const ty = train.y;
    const headX = train.x;
    ctx.save();
    ctx.fillStyle = '#222';
    ctx.fillRect(headX - 30, ty - 16, 60, 32);
    ctx.fillStyle = '#a7443b';
    ctx.fillRect(headX - 18, ty - 12, 36, 24);
    ctx.fillStyle = '#ffe89c';
    ctx.fillRect(headX + 28, ty - 6, 8, 12);
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(headX + 16, ty, 6, 0, TAU);
    ctx.fill();

    for (let c = 1; c < train.length; c++) {
      const cx = headX - c * train.carSpacing;
      ctx.fillStyle = c === train.length - 1 ? '#a7443b' : '#5c4838';
      ctx.fillRect(cx - 26, ty - 14, 52, 28);
      ctx.strokeStyle = '#221a14';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 26, ty - 14, 52, 28);
    }
    ctx.restore();
  }

  function drawBuildings() {
    for (const b of world.buildings) {
      const lift = b.z * 7;
      ctx.fillStyle = 'rgba(15, 10, 7, 0.45)';
      ctx.fillRect(b.x + 14, b.y + 14, b.w, b.h);

      ctx.fillStyle = '#3a2b22';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + b.w, b.y);
      ctx.lineTo(b.x + b.w + lift, b.y + b.h + lift);
      ctx.lineTo(b.x + lift, b.y + b.h + lift);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(244, 231, 203, 0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      if (b.enterable) {
        ctx.fillStyle = b.accent;
        ctx.fillRect(b.x + b.w / 2 - 8, b.y + b.h - 4, 16, 6);
      }
    }
  }

  function drawProps() {
    for (const p of props) {
      if (p.destroyed) continue;
      if (p.type === 'fence') {
        ctx.fillStyle = '#6e533c';
        ctx.fillRect(p.x - 14, p.y - 3, 28, 6);
      } else if (p.type === 'barrel') {
        ctx.fillStyle = '#4a382b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, TAU);
        ctx.fill();
      } else if (p.type === 'crate') {
        ctx.fillStyle = '#8a6542';
        ctx.fillRect(p.x - 7, p.y - 7, 14, 14);
      } else if (p.type === 'cactus') {
        ctx.fillStyle = '#5d764e';
        ctx.fillRect(p.x - 3, p.y - 12, 6, 24);
      }
    }
  }

  function drawSafehouses() {
    for (const h of world.hideouts) {
      ctx.save();
      ctx.fillStyle = '#5b402d';
      ctx.fillRect(h.x - 32, h.y - 24, 64, 48);
      ctx.strokeStyle = '#e5bd63';
      ctx.lineWidth = 3;
      ctx.strokeRect(h.x - 32, h.y - 24, 64, 48);

      ctx.fillStyle = '#e5bd63';
      ctx.fillRect(h.x - 16, h.y + 12, 32, 12);

      ctx.fillStyle = '#f4e7cb';
      ctx.font = '700 9px Space Mono';
      ctx.textAlign = 'center';
      ctx.fillText(h.name, h.x, h.y - 32);
      ctx.restore();
    }
  }

  function drawJobBeacons() {
    const target = getMissionTarget();
    if (!target) return;
    const pulse = 1 + Math.sin(elapsed * 5) * 0.18;
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.strokeStyle = '#e5bd63';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 30 * pulse, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = 'rgba(229,189,99,0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#f4e7cb';
    ctx.font = '700 10px Space Mono';
    ctx.textAlign = 'center';
    ctx.fillText('OBJECTIVE', 0, 4);
    ctx.restore();
  }

  function drawVehicle(v, isPolice) {
    if (v.x < camera.x - 650 || v.x > camera.x + 650 || v.y < camera.y - 450 || v.y > camera.y + 450) return;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);

    const s = v.kind === 'van' ? 1.25 : v.kind === 'sports' ? 0.9 : 1.0;

    ctx.fillStyle = 'rgba(15, 10, 7, 0.48)';
    ctx.beginPath();
    ctx.ellipse(2, 6, 24 * s, 11 * s, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = v.color || v.spec.color;
    ctx.beginPath();
    ctx.roundRect(-21 * s, -10 * s, 42 * s, 20 * s, 4 * s);
    ctx.fill();
    ctx.strokeStyle = '#120d0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = v.accent || v.spec.accent;
    ctx.beginPath();
    ctx.roundRect(-8 * s, -7 * s, 16 * s, 14 * s, 2 * s);
    ctx.fill();

    ctx.fillStyle = '#ffeaa7';
    ctx.fillRect(18 * s, -7 * s, 4 * s, 4 * s);
    ctx.fillRect(18 * s, 3 * s, 4 * s, 4 * s);
    ctx.fillStyle = '#d63031';
    ctx.fillRect(-22 * s, -7 * s, 3 * s, 4 * s);
    ctx.fillRect(-22 * s, 3 * s, 3 * s, 4 * s);

    ctx.fillStyle = '#1e1814';
    ctx.fillRect(-13 * s, -12 * s, 9 * s, 3 * s);
    ctx.fillRect(5 * s, -12 * s, 9 * s, 3 * s);
    ctx.fillRect(-13 * s, 9 * s, 9 * s, 3 * s);
    ctx.fillRect(5 * s, 9 * s, 9 * s, 3 * s);

    if (isPolice) {
      const flasher = Math.sin(elapsed * 14 + v.siren) > 0;
      ctx.fillStyle = flasher ? '#c94a3d' : '#87aeb2';
      ctx.fillRect(-4, -15, 8, 6);
    }

    ctx.restore();
  }

  function drawPerson() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 7, 4, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = player.crouching ? '#284d52' : '#3d281d';
    ctx.fillRect(-6, -6, 12, 16);
    ctx.fillStyle = '#d5a77e';
    ctx.fillRect(2, -7, 7, 7);
    ctx.fillStyle = '#e5bd63';
    ctx.fillRect(5, -7, 5, 2);

    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }

  function drawLighting() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const p = targetPos();
    if (!player.interior && p) {
      drawCone(p.x, p.y, p.angle, 260, 'rgba(255, 230, 160, 0.12)');
    }
    for (const c of police) {
      drawGlow(c.x, c.y, Math.sin(elapsed * 14 + c.siren) > 0 ? '#c94a3d' : '#87aeb2', 65, 0.2);
    }
    ctx.restore();
  }

  function drawCone(x, y, angle, length, color) {
    const zoom = 1.05;
    const sx = W / 2 + (x - camera.x) * zoom;
    const sy = H / 2 + (y - camera.y) * zoom;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(angle - 0.25) * length * zoom, sy + Math.sin(angle - 0.25) * length * zoom);
    ctx.lineTo(sx + Math.cos(angle + 0.25) * length * zoom, sy + Math.sin(angle + 0.25) * length * zoom);
    ctx.closePath();
    ctx.fill();
  }

  function drawGlow(x, y, color, radius, alpha) {
    const zoom = 1.05;
    const sx = W / 2 + (x - camera.x) * zoom;
    const sy = H / 2 + (y - camera.y) * zoom;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, TAU);
    ctx.fill();
  }

  function drawObjectiveGuide() {
    const target = getMissionTarget();
    if (!target || player.interior) return;

    const zoom = 1.05;
    const sx = W / 2 + (target.x - camera.x) * zoom;
    const sy = H / 2 + (target.y - camera.y) * zoom;
    const margin = 35;
    const onScreen = sx > margin && sx < W - margin && sy > margin && sy < H - margin;

    if (!onScreen) {
      const angle = Math.atan2(sy - H / 2, sx - W / 2);
      const edgeX = clamp(W / 2 + Math.cos(angle) * (W / 2 - 30), 30, W - 30);
      const edgeY = clamp(H / 2 + Math.sin(angle) * (H / 2 - 30), 30, H - 30);
      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.rotate(angle);
      ctx.fillStyle = '#e5bd63';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawInteriorOverlay() {
    ctx.fillStyle = 'rgba(16, 11, 8, 0.96)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#4a3324';
    ctx.fillRect(100, 70, 760, 400);
    ctx.strokeStyle = 'var(--acid)';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 70, 760, 400);

    const x = 480 + player.interiorPos.x * 2.0;
    const y = 300 + player.interiorPos.y * 1.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#3d5755';
    ctx.fillRect(-9, -9, 18, 22);
    ctx.fillStyle = '#d5a77e';
    ctx.fillRect(3, -12, 10, 10);
    ctx.restore();

    ctx.fillStyle = '#f4e7cb';
    ctx.font = '700 16px Space Mono';
    ctx.fillText('INSIDE BUILDING // POSSE HAS LOST LINE OF SIGHT', 130, 110);
    ctx.fillStyle = 'var(--muted)';
    ctx.font = '12px Space Mono';
    ctx.fillText('PRESS [E] OR [ENTER] TO RETURN TO THE STREET', 130, 135);
  }

  function drawRain() {
    ctx.save();
    ctx.lineWidth = weather.wet ? 1.5 : 1;
    for (const d of rain) {
      ctx.strokeStyle = weather.wet ? `rgba(135,174,178,${d.alpha})` : `rgba(196,153,95,${d.alpha})`;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.slant, d.y + d.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, 140, W / 2, H / 2, 580);
    g.addColorStop(0, 'rgba(2,5,10,0)');
    g.addColorStop(1, 'rgba(2,5,10,0.65)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (flash > 0) {
      ctx.fillStyle = `rgba(244, 231, 203, ${flash * 0.25})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawMap() {
    if (!world) return;
    const mw = mapCanvas.width, mh = mapCanvas.height;
    mapCtx.clearRect(0, 0, mw, mh);
    mapCtx.fillStyle = '#221711';
    mapCtx.fillRect(0, 0, mw, mh);

    const sx = mw / WORLD_W, sy = mh / WORLD_H;

    mapCtx.strokeStyle = '#42372e';
    mapCtx.lineWidth = ROAD * sx;
    for (const x of world.roadsX) {
      mapCtx.beginPath();
      mapCtx.moveTo(x * sx, 0);
      mapCtx.lineTo(x * sx, mh);
      mapCtx.stroke();
    }
    for (const y of world.roadsY) {
      mapCtx.beginPath();
      mapCtx.moveTo(0, y * sy);
      mapCtx.lineTo(mw, y * sy);
      mapCtx.stroke();
    }

    mapCtx.fillStyle = '#87aeb2';
    for (const h of world.hideouts) {
      mapCtx.fillRect(h.x * sx - 3, h.y * sy - 3, 6, 6);
    }

    const p = targetPos();
    const target = getMissionTarget();
    if (target) {
      mapCtx.strokeStyle = '#e5bd63';
      mapCtx.lineWidth = 2;
      mapCtx.setLineDash([4, 4]);
      mapCtx.beginPath();
      mapCtx.moveTo(p.x * sx, p.y * sy);
      mapCtx.lineTo(target.x * sx, target.y * sy);
      mapCtx.stroke();
      mapCtx.setLineDash([]);

      mapCtx.fillStyle = '#e5bd63';
      mapCtx.beginPath();
      mapCtx.arc(target.x * sx, target.y * sy, 5, 0, TAU);
      mapCtx.fill();
    }

    if (lawSearch.active) {
      mapCtx.strokeStyle = `rgba(201, 74, 61, ${lawSearch.ttl / 10})`;
      mapCtx.lineWidth = 2;
      mapCtx.beginPath();
      mapCtx.arc(lawSearch.x * sx, lawSearch.y * sy, 18, 0, TAU);
      mapCtx.stroke();
    }

    for (const c of police) {
      mapCtx.fillStyle = '#c94a3d';
      mapCtx.fillRect(c.x * sx - 2, c.y * sy - 2, 4, 4);
    }

    mapCtx.save();
    mapCtx.translate(p.x * sx, p.y * sy);
    mapCtx.rotate(p.angle || 0);
    mapCtx.fillStyle = '#87aeb2';
    mapCtx.beginPath();
    mapCtx.moveTo(6, 0);
    mapCtx.lineTo(-5, -4);
    mapCtx.lineTo(-5, 4);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  // --- Sound Synthesizer (Web Audio API) ---
  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function startAudioBed() {
    if (!audioCtx || engineNode) return;
    try {
      engineNode = audioCtx.createOscillator();
      engineGain = audioCtx.createGain();
      engineNode.type = 'sawtooth';
      engineNode.frequency.value = 55;
      engineGain.gain.value = 0.0001;
      engineNode.connect(engineGain);
      engineGain.connect(audioCtx.destination);
      engineNode.start();

      driftNode = audioCtx.createOscillator();
      driftGain = audioCtx.createGain();
      driftNode.type = 'triangle';
      driftNode.frequency.value = 240;
      driftGain.gain.value = 0.0001;
      driftNode.connect(driftGain);
      driftGain.connect(audioCtx.destination);
      driftNode.start();
    } catch (e) {
      engineNode = null;
    }
  }

  function updateAudio() {
    if (!audioCtx || !engineGain || !engineNode) return;
    const speed = playerCar && !player.onFoot ? Math.abs(playerCar.speed) : 0;
    const now = audioCtx.currentTime;

    engineNode.frequency.setTargetAtTime(50 + speed * 0.45, now, 0.05);
    engineGain.gain.setTargetAtTime(speed > 5 ? 0.015 + Math.min(0.035, speed / 5500) : 0.0001, now, 0.08);

    if (driftGain && playerCar) {
      const isDrifting = playerCar.skid > 0.3;
      driftGain.gain.setTargetAtTime(isDrifting ? 0.025 : 0.0001, now, 0.05);
    }
  }

  function playMetalCrunch() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(140, now);
    o.frequency.exponentialRampToValueAtTime(35, now + 0.18);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.22);
  }

  function playPropSmash() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(280, now);
    o.frequency.exponentialRampToValueAtTime(60, now + 0.12);
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.15);
  }

  function playTrainWhistle() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [330, 440, 550].forEach((freq) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.025, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(now);
      o.stop(now + 0.85);
    });
  }

  function playGunshot() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(650, now);
    o.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    g.gain.setValueAtTime(0.09, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.14);
  }

  function playCaltropDrop() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(520, now);
    o.frequency.exponentialRampToValueAtTime(120, now + 0.1);
    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.14);
  }

  function playDoorCreak() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, now);
    o.frequency.linearRampToValueAtTime(260, now + 0.15);
    g.gain.setValueAtTime(0.03, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.2);
  }

  function playThunder() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(45, now);
    g.gain.setValueAtTime(0.07, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 1.25);
  }

  function playSirenStinger() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(440, now);
    o.frequency.linearRampToValueAtTime(620, now + 0.25);
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.32);
  }

  function playWesternJingle(type) {
    if (!audioCtx) return;
    const notes =
      type === 'complete'
        ? [293.66, 369.99, 440.0, 587.33]
        : type === 'accept'
          ? [220.0, 277.18, 329.63]
          : type === 'busted'
            ? [196.0, 185.0, 164.81]
            : [220.0, 293.66, 329.63];

    const now = audioCtx.currentTime;
    notes.forEach((freq, idx) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, now + idx * 0.12);
      g.gain.setValueAtTime(0.0001, now + idx * 0.12);
      g.gain.exponentialRampToValueAtTime(0.045, now + idx * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.28);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(now + idx * 0.12);
      o.stop(now + idx * 0.12 + 0.3);
    });
  }

  // --- Pause & Modals ---
  function togglePause(force) {
    if (gameMode !== 'playing' && gameMode !== 'paused') return;
    const pause = typeof force === 'boolean' ? force : gameMode === 'playing';
    gameMode = pause ? 'paused' : 'playing';
    pauseScreen.hidden = !pause;
    if (pause) {
      $('pause-stats').innerHTML = `
        <div class="pause-stat"><b>${formatMoney(money)}</b><span>CASH</span></div>
        <div class="pause-stat"><b>${careerStreak}</b><span>STREAK</span></div>
        <div class="pause-stat"><b>${bestStreak}</b><span>BEST STREAK</span></div>
      `;
    } else {
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function setSeed() {
    const names = ['DUST', 'MESA', 'COTTONWOOD', 'BLACKWATER', 'CINDER', 'PRAIRIE'];
    seedText = `${choice(names)}-${String(10 + Math.floor(Math.random() * 890)).padStart(3, '0')}`;
    menuSeed.textContent = seedText;
  }

  // --- Keyboard & Event Listeners ---
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();
    if (!keys[key]) justPressed[key] = true;
    keys[key] = true;

    if (e.key === 'Escape') {
      if (gameMode === 'garage') closeGarage();
      else if (gameMode === 'busted') {
        bustedScreen.hidden = true;
        startRun(runMode);
      } else togglePause();
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // Buttons
  $('career-btn').onclick = () => startRun('career');
  $('endless-btn').onclick = () => startRun('endless');
  $('reroll-btn').onclick = () => {
    setSeed();
    ensureAudio();
  };
  $('pause-btn').onclick = () => togglePause(true);
  $('resume-btn').onclick = () => togglePause(false);
  $('restart-btn').onclick = () => {
    pauseScreen.hidden = true;
    startRun(runMode);
  };
  $('menu-btn').onclick = () => {
    pauseScreen.hidden = true;
    gameMode = 'menu';
    gameUI.classList.remove('active');
    titleScreen.style.display = 'flex';
    titleScreen.classList.add('active');
  };

  $('how-to-play-btn').onclick = () => {
    helpScreen.hidden = false;
  };
  $('help-btn').onclick = () => {
    helpScreen.hidden = false;
  };
  $('help-close-btn').onclick = () => {
    helpScreen.hidden = true;
  };

  $('garage-leave-btn').onclick = () => closeGarage();
  $('tab-tuning').onclick = () => {
    $('tab-tuning').classList.add('active');
    $('tab-vehicles').classList.remove('active');
    $('garage-tuning-panel').hidden = false;
    $('garage-vehicle-panel').hidden = true;
  };
  $('tab-vehicles').onclick = () => {
    $('tab-vehicles').classList.add('active');
    $('tab-tuning').classList.remove('active');
    $('garage-vehicle-panel').hidden = false;
    $('garage-tuning-panel').hidden = true;
  };

  $('busted-continue-btn').onclick = () => {
    bustedScreen.hidden = true;
    startRun(runMode);
  };
  $('busted-restart-btn').onclick = () => {
    bustedScreen.hidden = true;
    startRun(runMode);
  };

  // Touch Controls
  const stick = document.querySelector('.touch-stick');
  if (stick) {
    const moveTouch = (e) => {
      const t = e.touches[0];
      const r = stick.getBoundingClientRect();
      const dx = t.clientX - (r.left + r.width / 2);
      const dy = t.clientY - (r.top + r.height / 2);
      const mag = Math.min(1, Math.hypot(dx, dy) / (r.width * 0.45));
      const ang = Math.atan2(dy, dx);
      touchVector = { x: Math.cos(ang) * mag, y: Math.sin(ang) * mag };
    };
    stick.addEventListener('touchstart', (e) => { e.preventDefault(); moveTouch(e); }, { passive: false });
    stick.addEventListener('touchmove', (e) => { e.preventDefault(); moveTouch(e); }, { passive: false });
    stick.addEventListener('touchend', () => { touchVector = { x: 0, y: 0 }; });
  }

  document.querySelectorAll('[data-touch]').forEach((btn) => {
    const act = btn.dataset.touch;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      justPressed['touch' + act[0].toUpperCase() + act.slice(1)] = true;
      keys['touch' + act] = true;
    }, { passive: false });
    btn.addEventListener('touchend', () => {
      keys['touch' + act] = false;
    });
  });

  // Init
  loadCareer();
  menuSeed.textContent = seedText;
})();
