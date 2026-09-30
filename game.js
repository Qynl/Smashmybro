  /* GETAWAY // a dependency-free retro-western escape sandbox */
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const mapCanvas = document.getElementById('map-canvas');
  const mapCtx = mapCanvas.getContext('2d');
  const W = 960;
  const H = 540;
  const WORLD_W = 4200;
  const WORLD_H = 3400;
  const ROAD = 94;
  const TAU = Math.PI * 2;

  const $ = (id) => document.getElementById(id);
  const titleScreen = $('title-screen');
  const pauseScreen = $('pause-screen');
  const gameUI = $('game-ui');
  const menuSeed = $('menu-seed');
  const keys = Object.create(null);
  const justPressed = Object.create(null);

  let runMode = 'career';
  let gameMode = 'menu';
  let lastTime = 0;
  let elapsed = 0;
  let viewW = W;
  let viewH = H;
  let seedText = 'NIGHT-091';
  let world;
  let player;
  let playerCar;
  let police = [];
  let traffic = [];
  let lawSearch = { x: 0, y: 0, ttl: 0 };
  let mission;
  let money = 460;
  let careerCash = 460;
  let careerStreak = 0;
  let bestStreak = 0;
  let bestScore = 0;
  let heat = 0;
  let weather = { kind: 'storm', wet: true };
  let camera = { x: 700, y: 700, shake: 0 };
  const SAVE_KEY = 'getaway-dustfall-career-v2';
  let rain = [];
  let toastQueue = [];
  let radioTimer = 0;
  let policeTimer = 0;
  let ambientTimer = 8;
  let missionNumber = 1;
  let audioContext = null;
  let touchVector = { x: 0, y: 0 };

  const VEHICLE_TYPES = {
    sedan: { name: 'DUSTWIND COUPE', top: 235, accel: 145, brake: 235, turn: 2.35, grip: 0.86, weight: 1, color: '#d1b27c', accent: '#4e6263', durability: 100 },
    compact: { name: 'MULE COMPACT', top: 218, accel: 170, brake: 245, turn: 2.8, grip: 0.93, weight: .72, color: '#a7b07b', accent: '#423329', durability: 82 },
    muscle: { name: 'IRON HORSE COUPE', top: 264, accel: 175, brake: 205, turn: 1.8, grip: 0.72, weight: 1.3, color: '#9c4d3f', accent: '#d4a45b', durability: 115 },
    sports: { name: 'SILVER BULLET', top: 292, accel: 205, brake: 270, turn: 2.5, grip: 0.82, weight: .9, color: '#6f8c98', accent: '#efe0b7', durability: 75 },
    van: { name: 'COVERED WAGON', top: 190, accel: 112, brake: 190, turn: 1.55, grip: .68, weight: 1.7, color: '#b8895c', accent: '#3d2a20', durability: 145 },
    taxi: { name: 'STAGE TAXI', top: 220, accel: 140, brake: 220, turn: 2.25, grip: .84, weight: 1, color: '#d5a948', accent: '#30281c', durability: 95 },
    police: { name: 'SHERIFF PATROL', top: 270, accel: 188, brake: 255, turn: 2.4, grip: .9, weight: 1.15, color: '#e0d5b6', accent: '#384a4e', durability: 130 }
  };

  const DISTRICTS = [
    { name: 'DUSTFALL MAIN STREET', short: 'MAIN STREET', x: 300, y: 500, w: 1280, h: 1180, color: '#4b3024', accent: '#d79855' },
    { name: 'RED MESA', short: 'RED MESA', x: 300, y: 1850, w: 1280, h: 1220, color: '#60382a', accent: '#c9794e' },
    { name: 'COTTONWOOD', short: 'COTTONWOOD', x: 1660, y: 500, w: 1150, h: 1180, color: '#3c4a3d', accent: '#a7b07b' },
    { name: 'RAILROAD WARD', short: 'RAILROAD', x: 2850, y: 300, w: 1120, h: 1350, color: '#474039', accent: '#d5a948' },
    { name: 'BLACKWATER CROSSING', short: 'BLACKWATER', x: 2760, y: 1900, w: 1350, h: 1250, color: '#294248', accent: '#87aeb2' },
    { name: 'NORTH RANGE', short: 'NORTH RANGE', x: 1200, y: 50, w: 1300, h: 390, color: '#38483d', accent: '#d5a948' }
  ];

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function formatMoney(n) { return '$' + Math.max(0, Math.floor(n)).toLocaleString('en-US').padStart(3, '0'); }
  function angleDiff(a, b) { return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }
  function hashString(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rngFrom(seed) { let s = hashString(seed) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296); }; }
  function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
  function choice(list) { return list[Math.floor(Math.random() * list.length)]; }

  function loadCareer() {
    try {
      if (typeof localStorage === 'undefined') return;
      const save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      careerCash = Number.isFinite(save.cash) ? Math.max(460, save.cash) : 460;
      bestStreak = Number.isFinite(save.bestStreak) ? Math.max(0, save.bestStreak) : 0;
      bestScore = Number.isFinite(save.bestScore) ? Math.max(0, save.bestScore) : 0;
    } catch (e) { careerCash = 460; }
  }

  function persistCareer() {
    careerCash = Math.max(0, money);
    bestScore = Math.max(bestScore, money + bestStreak * 500);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(SAVE_KEY, JSON.stringify({ cash: careerCash, bestStreak, bestScore, seed: seedText }));
    } catch (e) { /* Private browsing can disable storage; the run still works. */ }
  }

  function resize() {
    canvas.width = W;
    canvas.height = H;
    viewW = canvas.clientWidth || W;
    viewH = canvas.clientHeight || H;
  }
  window.addEventListener('resize', resize);
  resize();

  function buildWorld(seed) {
    const r = rngFrom(seed);
    const roadsX = [270, 690, 1110, 1530, 1950, 2370, 2790, 3210, 3630, 4050];
    const roadsY = [260, 680, 1100, 1520, 1940, 2360, 2780, 3200];
    const buildings = [];
    const doors = [];
    const parks = [];
    const props = [];
    const jobSites = [];
    const hideouts = [
      { x: 620, y: 530, name: 'THE SWITCHYARD', type: 'GARAGE', safe: true },
      { x: 1310, y: 2570, name: 'CINDER HOTEL', type: 'ROOM', safe: true },
      { x: 3470, y: 2640, name: 'BLACKWATER BARN', type: 'WAREHOUSE', safe: true }
    ];
    const signWords = ['SALOON', 'LIVERY', 'GENERAL', 'BANK', 'DEPOT', 'HOTEL', 'OPEN', 'NO TRESPASS'];

    // Road blocks are the authored skeleton. Modular lots fill the space around them.
    for (let xi = 0; xi < roadsX.length - 1; xi++) {
      for (let yi = 0; yi < roadsY.length - 1; yi++) {
        const left = roadsX[xi] + ROAD / 2 + 16;
        const top = roadsY[yi] + ROAD / 2 + 16;
        const right = roadsX[xi + 1] - ROAD / 2 - 16;
        const bottom = roadsY[yi + 1] - ROAD / 2 - 16;
        if (right - left < 100 || bottom - top < 100) continue;
        const district = districtAt({ x: (left + right) / 2, y: (top + bottom) / 2 });
        const roll = r();
        if (roll < (district.name === 'BLACKWATER CROSSING' ? .28 : .1)) {
          parks.push({ x: left, y: top, w: right - left, h: bottom - top, kind: district.name === 'BLACKWATER CROSSING' ? 'yard' : 'park' });
          continue;
        }
        const cols = district.name === 'RED MESA' ? 2 : (r() > .6 ? 2 : 1);
        const rows = district.name === 'RED MESA' ? 2 : (r() > .62 ? 2 : 1);
        const gap = district.name === 'RED MESA' ? 12 : 20;
        const cellW = (right - left - gap * (cols - 1)) / cols;
        const cellH = (bottom - top - gap * (rows - 1)) / rows;
        for (let cx = 0; cx < cols; cx++) {
          for (let cy = 0; cy < rows; cy++) {
            const bx = left + cx * (cellW + gap) + (r() * 8 - 4);
            const by = top + cy * (cellH + gap) + (r() * 8 - 4);
            const bw = Math.max(72, cellW - 8 - r() * 17);
            const bh = Math.max(72, cellH - 8 - r() * 17);
            const kind = pick(r, district.name === 'BLACKWATER CROSSING' ? ['warehouse', 'depot', 'stable', 'office'] : district.name === 'COTTONWOOD' ? ['saloon', 'hotel', 'general store', 'bank'] : ['cabin', 'general store', 'office', 'hotel', 'stable']);
            const b = { x: bx, y: by, w: bw, h: bh, z: 1 + Math.floor(r() * 3), kind, district: district.name, color: district.color, accent: district.accent, seed: r(), enterable: r() > .67 || kind === 'general store' || kind === 'stable' || kind === 'saloon' };
            buildings.push(b);
            if (b.enterable && doors.length < 32) {
              doors.push({ x: b.x + b.w / 2, y: b.y + b.h + 10, building: b, label: kind === 'general store' ? 'GENERAL STORE' : kind.toUpperCase() });
            }
            if (r() > .58) props.push({ x: b.x + 12 + r() * Math.max(1, b.w - 24), y: b.y + 12 + r() * Math.max(1, b.h - 24), type: 'window', seed: r() });
          }
        }
      }
    }

    for (let i = 0; i < 18; i++) {
      const roadX = pick(r, roadsX);
      const roadY = pick(r, roadsY);
      jobSites.push({ x: roadX + (r() > .5 ? 64 : -64), y: roadY + (r() > .5 ? 64 : -64), label: pick(r, ['TELEGRAPH', 'BACK PORCH', 'LOCKBOX', 'DROP POINT', 'STABLE EXIT']) });
    }
    // Make the first job immediately legible at the starting hideout.
    jobSites.unshift({ x: hideouts[0].x, y: hideouts[0].y + 26, label: 'TELEGRAPH' });

    const trafficCars = [];
    const trafficKinds = ['compact', 'sedan', 'taxi', 'muscle', 'van', 'sports'];
    for (let i = 0; i < 28; i++) {
      const horizontal = r() > .48;
      const road = horizontal ? pick(r, roadsY) : pick(r, roadsX);
      const laneOffset = r() > .5 ? -22 : 22;
      const x = horizontal ? 60 + r() * (WORLD_W - 120) : road + laneOffset;
      const y = horizontal ? road + laneOffset : 60 + r() * (WORLD_H - 120);
      const angle = horizontal ? (laneOffset < 0 ? 0 : Math.PI) : (laneOffset < 0 ? Math.PI / 2 : -Math.PI / 2);
      trafficCars.push(makeVehicle(pick(r, trafficKinds), x, y, angle, false));
    }

    const streetLights = [];
    roadsX.forEach((x) => roadsY.forEach((y) => { if (r() > .12) streetLights.push({ x: x + 39, y: y + 39, phase: r() * TAU }); }));
    return { seed, roadsX, roadsY, buildings, doors, parks, props, jobSites, hideouts, trafficCars, streetLights, signWords };
  }

  function districtAt(pos) {
    for (const d of DISTRICTS) if (pos.x >= d.x && pos.x <= d.x + d.w && pos.y >= d.y && pos.y <= d.y + d.h) return d;
    return DISTRICTS[0];
  }

  function makeVehicle(kind, x, y, angle, isPlayer) {
    const spec = VEHICLE_TYPES[kind] || VEHICLE_TYPES.sedan;
    return { kind, x, y, angle, speed: 0, health: spec.durability, spec, isPlayer: !!isPlayer, abandoned: false, ai: !isPlayer, hitFlash: 0, skid: 0, tint: Math.random() };
  }

  function resetRain() {
    const r = rngFrom(seedText + ':rain');
    rain = [];
    const count = weather.wet ? 135 : 72;
    for (let i = 0; i < count; i++) rain.push({ x: r() * W, y: r() * H, len: weather.wet ? 5 + r() * 12 : 2 + r() * 5, speed: weather.wet ? 220 + r() * 260 : 24 + r() * 42, alpha: weather.wet ? .12 + r() * .36 : .06 + r() * .16, slant: weather.wet ? 4 + r() * 8 : 1 + r() * 4 });
  }

  function newMission(isFirst = false) {
    const r = rngFrom(`${seedText}:job:${missionNumber}:${money}`);
    const types = [
      { key: 'delivery', title: 'RUN THE SATCHEL', description: 'A sealed letter. No questions. No lawmen.', risk: 1, radio: 'Keep it quiet. Quiet pays better out here.' },
      { key: 'recovery', title: 'TAKE THE LEDGER', description: 'The bank ledger is sitting where the sheriff cannot see.', risk: 2, radio: 'One stop. One ledger. Then you vanish.' },
      { key: 'quiet', title: 'ACROSS THE COUNTY', description: 'Make the crossing look like an ordinary supply run.', risk: 1, radio: 'Ordinary is a superpower on the frontier.' },
      { key: 'extraction', title: 'WITNESS OUT', description: 'Reach the contact before the sheriff closes the road.', risk: 3, radio: 'The window is open. It will not stay that way.' },
      { key: 'switch', title: 'SWITCH THE WAGON', description: 'Reach the handoff, then leave your trouble behind.', risk: 2, radio: 'Every wagon tells a story. Change the ending.' }
    ];
    const type = isFirst ? types[0] : pick(r, types);
    const start = isFirst ? { x: world.hideouts[0].x, y: world.hideouts[0].y + 26, label: 'TELEGRAPH' } : { ...pick(r, world.jobSites) };
    let destination = { ...pick(r, world.jobSites) };
    let tries = 0;
    while (dist(start, destination) < 700 && tries++ < 10) destination = { ...pick(r, world.jobSites) };
    const handoff = { ...pick(r, world.jobSites) };
    const retrievalDoor = type.key === 'recovery' && world.doors.length ? world.doors.slice().sort((a, b) => dist(a, destination) - dist(b, destination))[0] : pick(r, world.doors);
    const payout = 260 + type.risk * 160 + Math.floor(r() * 180);
    mission = { number: missionNumber, ...type, start, destination, originalDestination: { ...destination }, handoff, retrievalDoor, payout, state: 'available', phase: 'accept', timer: 0, complication: pick(r, ['a blocked trail', 'rain-swollen crossing', 'a telegraph alert', 'a witness nearby', 'sheriff patrol ahead', 'rival riders in town']), revealed: false, quietBonus: false, lastToast: 0 };
    radio(type.radio);
  }

  function startRun(mode) {
    ensureAudio();
    runMode = mode;
    gameMode = 'playing';
    titleScreen.classList.remove('active');
    titleScreen.style.display = 'none';
    pauseScreen.hidden = true;
    gameUI.classList.add('active');
    world = buildWorld(seedText);
    const forecast = rngFrom(seedText + ':forecast')();
    weather = forecast > .3 ? { kind: 'storm', wet: true } : { kind: 'dry', wet: false };
    resetRain();
    traffic = world.trafficCars.map(v => ({ ...v }));
    police = [];
    lawSearch = { x: world.hideouts[0].x, y: world.hideouts[0].y, ttl: 0 };
    player = { x: world.hideouts[0].x, y: world.hideouts[0].y + 8, angle: 0, onFoot: false, crouching: false, hidden: false, stamina: 1, jump: 0, interior: null, interiorPos: { x: 0, y: 0 } };
    playerCar = makeVehicle(mode === 'endless' ? 'compact' : 'sedan', player.x, player.y, -Math.PI / 2, true);
    money = mode === 'endless' ? 0 : careerCash;
    careerStreak = 0;
    heat = 0;
    missionNumber = 1;
    camera = { x: player.x, y: player.y, shake: 0 };
    toastQueue = [];
    newMission(true);
    notify(mode === 'endless' ? 'OUTLAW RUN // NO SAFETY NET' : 'DUSTFALL COUNTY IS OPEN', 'good');
    notify(weather.wet ? 'FORECAST // RED MESA STORM' : 'FORECAST // DRY TRAIL, LONG SHADOWS', '');
    notify('Ride to the telegraph. Press E to take the job.', '');
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(now) {
    if (gameMode !== 'playing') return;
    const dt = Math.min(.033, Math.max(.001, (now - lastTime) / 1000));
    lastTime = now;
    elapsed += dt;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    updatePlayer(dt);
    updateTraffic(dt);
    updatePolice(dt);
    updateMission(dt);
    updateRain(dt);
    updateCamera(dt);
    updateHUD(dt);
    radioTimer -= dt;
    ambientTimer -= dt;
    if (radioTimer <= 0 && Math.random() < .025) cycleRadio();
    if (ambientTimer <= 0) { ambientTimer = 14 + Math.random() * 16; cityEvent(); }
    for (const k in justPressed) delete justPressed[k];
  }

  function targetPos() { return player.onFoot ? player : playerCar; }

  function updatePlayer(dt) {
    if (player.interior) {
      updateInteriorPlayer(dt);
      return;
    }
    if (player.onFoot) updateOnFoot(dt);
    else updateDriving(dt);
  }

  function axis() {
    let x = 0, y = 0;
    if (keys.a || keys.ArrowLeft) x -= 1;
    if (keys.d || keys.ArrowRight) x += 1;
    if (keys.w || keys.ArrowUp) y -= 1;
    if (keys.s || keys.ArrowDown) y += 1;
    if (touchVector.x || touchVector.y) { x = touchVector.x; y = touchVector.y; }
    const mag = Math.hypot(x, y);
    return mag > 1 ? { x: x / mag, y: y / mag } : { x, y };
  }

  function updateDriving(dt) {
    const v = playerCar;
    const spec = v.spec;
    const a = axis();
    const throttle = -a.y;
    const steer = a.x;
    const braking = !!(keys[' '] || keys.Space || justPressed.touchBrake);
    const oldSpeed = v.speed;
    if (throttle > .05) v.speed += spec.accel * throttle * dt;
    else if (throttle < -.05) v.speed += spec.accel * throttle * .62 * dt;
    else v.speed *= Math.pow(.985, dt * 60);
    if (braking) v.speed *= Math.pow(.91, dt * 60);
    const wetPenalty = weatherWet() ? .9 : 1;
    v.speed = clamp(v.speed, -spec.top * .34, spec.top * (1 - (100 - v.health) / 650) * wetPenalty);
    const speedRatio = clamp(Math.abs(v.speed) / spec.top, 0, 1);
    if (Math.abs(v.speed) > 4) v.angle += steer * spec.turn * dt * (0.25 + speedRatio * .9) * (v.speed >= 0 ? 1 : -1);
    const nx = v.x + Math.cos(v.angle) * v.speed * dt;
    const ny = v.y + Math.sin(v.angle) * v.speed * dt;
    if (blocked(nx, ny, 17)) {
      if (Math.abs(v.speed) > 35) crash(v, Math.abs(v.speed));
      v.speed *= -.28;
      v.x = clamp(v.x, 42, WORLD_W - 42);
      v.y = clamp(v.y, 42, WORLD_H - 42);
    } else { v.x = clamp(nx, 35, WORLD_W - 35); v.y = clamp(ny, 35, WORLD_H - 35); }
    if (Math.abs(v.speed) > 48) v.skid = Math.min(1, v.skid + dt * (Math.abs(steer) > .45 ? 3 : 1));
    else v.skid = Math.max(0, v.skid - dt * 2);
    player.x = v.x; player.y = v.y; player.angle = v.angle;
    if (Math.abs(v.speed - oldSpeed) > 125 && braking) camera.shake = Math.max(camera.shake, .1);
    if (justPressed.e) action();
    if (justPressed.touchAction) action();
    if (v.health < 40 && Math.random() < .008) notify('WAGON DAMAGE // HANDLING COMPROMISED', 'warn');
  }

  function updateOnFoot(dt) {
    const a = axis();
    if ((justPressed[' '] || justPressed.space) && player.jump <= 0 && !player.crouching) {
      player.jump = .55;
      beep(190, .045, 'sine');
    }
    if (player.jump > 0) player.jump = Math.max(0, player.jump - dt);
    const sprint = !!(keys.Shift || keys.shift) && player.stamina > .02;
    const speed = sprint ? 178 : (player.crouching ? 62 : 112);
    if (sprint && (a.x || a.y)) player.stamina = Math.max(0, player.stamina - dt * .22); else player.stamina = Math.min(1, player.stamina + dt * .13);
    const nx = player.x + a.x * speed * dt;
    const ny = player.y + a.y * speed * dt;
    if (!blocked(nx, ny, 9)) { player.x = clamp(nx, 22, WORLD_W - 22); player.y = clamp(ny, 22, WORLD_H - 22); }
    if (a.x || a.y) player.angle = Math.atan2(a.y, a.x);
    player.crouching = !!(keys.c || keys.C || keys.Control);
    if (justPressed.e) action();
    if (justPressed.touchAction) action();
    for (const t of traffic) {
      if (t.abandoned && dist(player, t) < 25 && justPressed.e) { stealVehicle(t); break; }
    }
  }

  function updateInteriorPlayer(dt) {
    const a = axis();
    const speed = player.crouching ? 40 : 88;
    player.interiorPos.x = clamp(player.interiorPos.x + a.x * speed * dt, -110, 110);
    player.interiorPos.y = clamp(player.interiorPos.y + a.y * speed * dt, -72, 80);
    if (a.x || a.y) player.angle = Math.atan2(a.y, a.x);
    player.crouching = !!(keys.c || keys.C || keys.Control);
    if (justPressed.e || justPressed.touchAction) exitInterior();
  }

  function updateTraffic(dt) {
    for (const v of traffic) {
      if (v.abandoned) continue;
      v.x += Math.cos(v.angle) * (v.speed || v.spec.top * .23) * dt;
      v.y += Math.sin(v.angle) * (v.speed || v.spec.top * .23) * dt;
      if (v.x < -100) v.x = WORLD_W + 100;
      if (v.x > WORLD_W + 100) v.x = -100;
      if (v.y < -100) v.y = WORLD_H + 100;
      if (v.y > WORLD_H + 100) v.y = -100;
      v.hitFlash = Math.max(0, v.hitFlash - dt);
      if (!player.onFoot && !player.interior && dist(v, playerCar) < 27 && Math.abs(playerCar.speed) > 35) {
        crash(playerCar, Math.abs(playerCar.speed) * .55);
        v.hitFlash = .4;
        v.x += Math.cos(v.angle) * 23; v.y += Math.sin(v.angle) * 23;
        notify('WAGON CONTACT // A WITNESS RODE FOR THE SHERIFF', 'warn');
        addHeat(.28);
      }
    }
  }

  function updatePolice(dt) {
    const target = targetPos();
    if (!player.interior && heat > .55) policeTimer -= dt;
    if (!player.interior && heat > .65 && policeTimer <= 0 && police.length < (heat > 3.3 ? 3 : heat > 1.8 ? 2 : 1)) {
      spawnPolice();
      policeTimer = 5.5 + Math.random() * 4;
    }
    for (let i = police.length - 1; i >= 0; i--) {
      const cop = police[i];
      cop.hitFlash = Math.max(0, cop.hitFlash - dt);
      const visible = !player.interior && !player.hidden && dist(cop, target) < (cop.state === 'search' ? 190 : 540) && !player.crouching;
      if (visible) {
        cop.state = 'pursuit';
        cop.lastKnown = { x: target.x, y: target.y };
        lawSearch = { x: target.x, y: target.y, ttl: 9 };
        cop.lost = 0;
        heat = clamp(heat + dt * .035, 0, 5);
      } else if (cop.state === 'pursuit') {
        cop.lost += dt;
        if (cop.lost > 2.8) { cop.state = 'search'; cop.searchTime = 12; notify('LOST THE TRAIL // THE POSSE IS SEARCHING', 'good'); }
      }
      let aim = cop.state === 'pursuit' ? { x: target.x + Math.cos(target.angle || 0) * 35, y: target.y + Math.sin(target.angle || 0) * 35 } : cop.lastKnown;
      if (cop.state === 'search') { cop.searchTime -= dt; if (cop.searchTime <= 0) { police.splice(i, 1); continue; } }
      const desired = Math.atan2(aim.y - cop.y, aim.x - cop.x);
      const delta = angleDiff(cop.angle, desired);
      cop.angle += clamp(delta, -2.3 * dt, 2.3 * dt);
      const speed = cop.state === 'pursuit' ? cop.spec.top * (heat > 3.2 ? .7 : .58) : cop.spec.top * .3;
      cop.x += Math.cos(cop.angle) * speed * dt;
      cop.y += Math.sin(cop.angle) * speed * dt;
      if (blocked(cop.x, cop.y, 16)) { cop.angle += (Math.random() > .5 ? 1 : -1) * 1.1; cop.x -= Math.cos(cop.angle) * 9; cop.y -= Math.sin(cop.angle) * 9; }
      if (dist(cop, target) < (player.onFoot ? 24 : 36) && !player.interior) { caught(); return; }
    }
    lawSearch.ttl = Math.max(0, lawSearch.ttl - dt);
    if (!player.interior && !player.hidden && police.length === 0 && heat > 0) heat = Math.max(0, heat - dt * .025);
    if (player.interior || player.hidden) heat = Math.max(0, heat - dt * .055);
    if (heat < .3 && police.length === 0) { player.hidden = false; lawSearch.ttl = 0; }
  }

  function updateMission(dt) {
    if (!mission) return;
    if (mission.state === 'active') {
      mission.timer += dt;
      if (mission.timer > 9 && !mission.revealed) { mission.revealed = true; notify('COMPLICATION // ' + mission.complication.toUpperCase(), 'warn'); addHeat(mission.risk * .15); }
      if (mission.key === 'quiet' && heat > 1.4 && !mission.quietBroken) { mission.quietBroken = true; notify('QUIET BONUS LOST // THE COUNTY HEARD THAT', 'warn'); }
      const target = getMissionTarget();
      if (target && mission.phase === 'escape' && !player.onFoot && dist(targetPos(), target) < 76) completeMission();
      if (target && mission.phase === 'handoff' && player.onFoot && dist(targetPos(), target) < 76 && justPressed.e) completeMission();
    } else if (mission.state === 'cooldown') {
      mission.timer += dt;
      if (mission.timer > 2.5) { missionNumber++; newMission(false); }
    }
  }

  function updateRain(dt) {
    for (const drop of rain) { drop.x += drop.slant * dt; drop.y += drop.speed * dt; if (drop.y > H + 25) { drop.y = -20; drop.x = Math.random() * W; } if (drop.x > W + 20) drop.x = -20; }
  }

  function updateCamera(dt) {
    const t = targetPos();
    const look = player.onFoot ? 0 : Math.cos(playerCar.angle) * 90;
    camera.x = lerp(camera.x, t.x + look, 1 - Math.pow(.001, dt));
    camera.y = lerp(camera.y, t.y + (player.onFoot ? 0 : Math.sin(playerCar.angle) * 70), 1 - Math.pow(.001, dt));
    camera.x = clamp(camera.x, W / 2 / 1.08, WORLD_W - W / 2 / 1.08);
    camera.y = clamp(camera.y, H / 2 / 1.08, WORLD_H - H / 2 / 1.08);
    camera.shake = Math.max(0, camera.shake - dt * 1.9);
  }

  function weatherWet() { return weather.wet; }

  function blocked(x, y, radius) {
    if (x < 20 || y < 20 || x > WORLD_W - 20 || y > WORLD_H - 20) return true;
    for (const b of world.buildings) {
      if (x > b.x - radius && x < b.x + b.w + radius && y > b.y - radius && y < b.y + b.h + radius) return true;
    }
    return false;
  }

  function action() {
    if (player.interior) { exitInterior(); return; }
    const p = targetPos();
    if (mission && mission.state === 'available' && dist(p, mission.start) < 90) { acceptMission(); return; }
    if (mission && mission.state === 'active') {
      const target = getMissionTarget();
      if (target && dist(p, target) < 92) {
        if (mission.phase === 'route') {
          if (mission.key === 'recovery') {
            if (!player.onFoot) { exitVehicle(); return; }
            mission.phase = 'retrieve';
            mission.destination = mission.retrievalDoor;
            notify('LEDGER JOB // FIND THE RIGHT DOOR', 'good');
            radio('Ledger is inside. Sheriff riders are checking the street.');
            return;
          }
          if (mission.key === 'extraction') {
            mission.phase = 'escape';
            mission.destination = mission.handoff;
            addHeat(.55);
            notify('WITNESS SECURED // GET THEM ACROSS THE COUNTY', 'good');
            radio('Contact is moving with you. Do not stop for the law.');
            return;
          }
          if (mission.key === 'switch') {
            if (!player.onFoot) { exitVehicle(); return; }
            mission.phase = 'steal';
            notify('HOT WAGON BURNED // TAKE SOMETHING CLEAN', 'good');
            radio('Old wagon is abandoned. Find another set of wheels.');
            return;
          }
          if (mission.key === 'quiet' && heat > 1.4) notify('QUIET RUN // THE BONUS IS ALREADY GONE', 'warn');
          else completeMission();
          return;
        }
        if (mission.phase === 'handoff' && player.onFoot) { completeMission(); return; }
      }
    }
    const hideout = world.hideouts.find(h => dist(p, h) < 82);
    if (hideout) {
      if (!player.onFoot && Math.abs(playerCar.speed) < 35) { useHideout(hideout); return; }
      if (player.onFoot) { useHideout(hideout); return; }
    }
    if (player.onFoot) {
      if (dist(p, playerCar) < 45) {
        if (mission && mission.state === 'active' && mission.phase === 'steal') { notify('THAT WAGON IS BURNED // FIND A CLEAN RIDE', 'warn'); return; }
        enterVehicle(playerCar); return;
      }
      const abandoned = traffic.find(v => v.abandoned && dist(p, v) < 40);
      if (abandoned) { stealVehicle(abandoned); return; }
      const door = world.doors.find(d => dist(p, d) < 55);
      if (door) { enterInterior(door); return; }
    }
    if (!player.onFoot && Math.abs(playerCar.speed) < 35 && justPressed.e) exitVehicle();
  }

  function acceptMission() {
    mission.state = 'active';
    mission.phase = 'route';
    mission.timer = 0;
    mission.revealed = false;
    addHeat(mission.risk * .22);
    notify('JOB ACCEPTED // ROUTE IS YOURS', 'good');
    radio(mission.radio);
    beep(420, .09, 'square');
  }

  function completeMission() {
    if (!mission || mission.state !== 'active') return;
    mission.state = 'cooldown';
    mission.phase = 'done';
    mission.timer = 0;
    mission.quietBonus = mission.key === 'quiet' && !mission.quietBroken && heat < 1.4;
    const bonus = mission.quietBonus ? Math.round(mission.payout * .35) : 0;
    const award = mission.payout + bonus;
    mission.award = award;
    money += award;
    careerStreak += 1;
    bestStreak = Math.max(bestStreak, careerStreak);
    persistCareer();
    addHeat(mission.risk * .72 + (mission.revealed ? .35 : 0));
    notify(`JOB COMPLETE // ${formatMoney(award)} CLEARED${bonus ? ' // QUIET BONUS' : ''}`, 'good');
    radio('Satchel delivered. Nobody got a name. Good work.');
    beep(720, .12, 'sine');
    beep(960, .1, 'sine');
  }

  function useHideout(hideout) {
    const condition = playerCar ? playerCar.health / playerCar.spec.durability : 1;
    const repairCost = Math.ceil((1 - condition) * 320);
    const coolCost = heat > 0 ? 45 : 0;
    const total = repairCost + coolCost;
    if (total > 0 && money < total) {
      notify(`HIDEOUT // NEED ${formatMoney(total)} FOR REPAIRS AND A CLEAN TRAIL`, 'warn');
      return;
    }
    money -= total;
    if (playerCar) playerCar.health = playerCar.spec.durability;
    heat = 0;
    police = [];
    player.hidden = true;
    careerStreak = Math.max(careerStreak, 0);
    persistCareer();
    notify(`${hideout.name} // WAGON READY, TRAIL COLD`, 'good');
    radio('The law lost the scent. Your wagon is ready when you are.');
    if (player.onFoot) enterInterior({ x: hideout.x, y: hideout.y + 28, label: 'HIDEOUT', hideout: true });
  }

  function exitVehicle() {
    if (Math.abs(playerCar.speed) > 34) { notify('SLOW DOWN TO LEAVE THE VEHICLE', 'warn'); return; }
    player.onFoot = true;
    playerCar.abandoned = true;
    playerCar.isPlayer = false;
    if (!traffic.includes(playerCar)) traffic.push(playerCar);
    player.x = playerCar.x + Math.cos(playerCar.angle + Math.PI / 2) * 28;
    player.y = playerCar.y + Math.sin(playerCar.angle + Math.PI / 2) * 28;
    player.hidden = false;
    if (mission && mission.state === 'active' && mission.key === 'switch' && mission.phase === 'route' && dist(playerCar, mission.destination) < 120) {
      mission.phase = 'steal';
      notify('HOT WAGON BURNED // TAKE SOMETHING CLEAN', 'good');
      radio('Old wagon is abandoned. Find another set of wheels.');
    } else {
      notify('ON FOOT // FIND COVER OR FIND ANOTHER RIDE', '');
      radio('Outlaw left the wagon. Riders, check the last known trail.');
    }
    addHeat(.12);
  }

  function enterVehicle(vehicle) {
    const wasOwn = vehicle === playerCar;
    playerCar = vehicle;
    vehicle.abandoned = false;
    vehicle.isPlayer = true;
    player.onFoot = false;
    player.hidden = false;
    player.x = vehicle.x; player.y = vehicle.y; player.angle = vehicle.angle;
    notify(wasOwn ? 'BACK IN THE RIDE' : 'VEHICLE ACQUIRED // KEEP MOVING', 'good');
    beep(260, .07, 'square');
  }

  function stealVehicle(vehicle) {
    enterVehicle(vehicle);
    addHeat(.38);
    if (mission && mission.state === 'active' && mission.phase === 'steal') {
      mission.phase = 'escape';
      mission.destination = mission.handoff;
      notify('CLEAN WAGON // NOW REACH THE HANDOFF', 'good');
      radio('Description changed. Riders are searching the old wagon.');
    } else {
      notify('HOTWIRE // THE OWNER WILL NOTICE', 'warn');
      radio('Outlaw may have changed wagons. Update the description.');
    }
  }

  function enterInterior(door) {
    if (!player.onFoot) { notify('EXIT THE VEHICLE FIRST', 'warn'); return; }
    player.interior = door;
    player.interiorPos = { x: 0, y: 54 };
    player.hidden = true;
    if (mission && mission.state === 'active' && mission.key === 'recovery' && mission.phase === 'retrieve') {
      mission.phase = 'handoff';
      notify('LEDGER SECURED // TAKE IT TO THE HANDOFF', 'good');
      radio('Ledger is secured. Keep the posse away from the handoff.');
    } else {
      notify(`${door.label} // LINE OF SIGHT BROKEN`, 'good');
      radio('Visual lost at the last intersection. Check the doors.');
    }
    beep(330, .08, 'sine');
  }

  function exitInterior() {
    if (!player.interior) return;
    const door = player.interior;
    player.interior = null;
    player.hidden = false;
    player.x = door.x; player.y = door.y + 28;
    player.interiorPos = { x: 0, y: 0 };
    notify('BACK OUTSIDE // KEEP YOUR HEAD DOWN', '');
  }

  function addHeat(amount) {
    const before = Math.ceil(heat);
    heat = clamp(heat + amount, 0, 5);
    const after = Math.ceil(heat);
    if (after > before) {
      if (after === 1) notify('SUSPICION // SOMEONE IS ASKING QUESTIONS', 'warn');
      if (after === 2) notify('SEARCH // SHERIFFS ARE CHECKING THE AREA', 'warn');
      if (after === 3) notify('PURSUIT // LAW LIGHTS IN THE MIRROR', 'warn');
      if (after >= 4) notify('MANHUNT // ROADBLOCKS POSSIBLE', 'warn');
      beep(170, .12, 'sawtooth');
    }
  }

  function spawnPolice() {
    const r = rngFrom(`${seedText}:cop:${elapsed}:${police.length}`);
    let x, y, angle;
    const target = targetPos();
    if (r() > .5) { x = r() > .5 ? 65 : WORLD_W - 65; y = target.y + (r() - .5) * 800; angle = Math.atan2(target.y - y, target.x - x); }
    else { y = r() > .5 ? 65 : WORLD_H - 65; x = target.x + (r() - .5) * 800; angle = Math.atan2(target.y - y, target.x - x); }
    x = clamp(x, 50, WORLD_W - 50); y = clamp(y, 50, WORLD_H - 50);
    const cop = makeVehicle('police', x, y, angle, false);
    cop.state = heat > 2.4 ? 'pursuit' : 'search'; cop.lastKnown = { x: target.x, y: target.y }; cop.lost = 99; cop.searchTime = 13; cop.siren = r() * TAU;
    police.push(cop);
    notify(police.length > 1 ? 'POSSE RIDERS // INTERCEPT AHEAD' : 'SHERIFF DISPATCHED // KEEP MOVING', 'warn');
    radio(police.length > 1 ? 'All riders, close the crossings.' : 'Rider 12, check the eastbound trail.');
  }

  function crash(v, impact) {
    v.health = Math.max(0, v.health - impact * .09);
    v.speed *= -.28;
    camera.shake = Math.max(camera.shake, clamp(impact / 500, .08, .38));
    beep(75 + Math.random() * 25, .1, 'sawtooth');
    if (v.health < 22) notify('WAGON CRITICAL // FIND A SWITCH', 'warn');
    else if (impact > 90) notify('HARD IMPACT // KEEP THE WHEELS UNDER YOU', 'warn');
  }

  function caught() {
    if (gameMode !== 'playing') return;
    money = Math.max(0, money - 180);
    careerStreak = 0;
    persistCareer();
    heat = 0;
    police = [];
    lawSearch.ttl = 0;
    player.onFoot = false;
    player.interior = null;
    player.hidden = false;
    playerCar = makeVehicle('sedan', world.hideouts[0].x, world.hideouts[0].y + 8, -Math.PI / 2, true);
    player.x = playerCar.x; player.y = playerCar.y;
    camera.x = player.x; camera.y = player.y;
    mission.state = 'available'; mission.phase = 'accept'; mission.timer = 0; mission.revealed = false;
    notify('CAUGHT // THE COUNTY TAKES ITS CUT', 'warn');
    radio('No charges filed. Yet. Keep your head down.');
    beep(90, .23, 'square');
  }

  function cityEvent() {
    if (heat > 2.5 && Math.random() < .5) { radio('The telegraph is down near Blackwater.'); notify('COUNTY NOTE // TELEGRAPH LINE BLINKED OUT', 'good'); return; }
    const events = ['A stage wagon blocks the hard road. Of course.', 'The rail crossing is down. Shortcut or detour?', 'A lantern flickers in a house that should be empty.', 'Someone is running toward the canyon. Not your problem. Yet.', 'Rain is getting heavier over Red Mesa.'];
    radio(choice(events));
  }

  function radio(line) {
    $('radio-line').textContent = line;
    radioTimer = 11;
  }

  function cycleRadio() {
    const lines = heat > 2.5 ? ['Rider 12, outlaw heading east.', 'Lost the trail. Check the next crossing.', 'Do not let them reach Blackwater.', 'All riders, hold the county line.'] : ['Storm rolling off Red Mesa. Keep to the hard road.', 'The trail is quiet through Red Mesa tonight.', 'Freight is late at the railroad ward.', 'County band — the signal that never asks questions.'];
    radio(lines[Math.floor(Math.random() * lines.length)]);
    $('radio-source').textContent = heat > 2.5 ? 'SHERIFF BAND // OPEN CHANNEL' : 'TELEGRAPH / COUNTY BAND';
  }

  function notify(text, type = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = text;
    $('toast-stack').appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function getMissionTarget() {
    if (!mission) return null;
    if (mission.state === 'cooldown') return null;
    if (mission.state !== 'active') return mission.start;
    if (mission.phase === 'retrieve') return mission.retrievalDoor;
    if (mission.phase === 'handoff' || mission.phase === 'steal' || mission.phase === 'escape') return mission.handoff;
    return mission.destination;
  }

  function missionInstruction() {
    if (!mission) return '';
    if (mission.state === 'available') return `Ride to the ${mission.start.label.toLowerCase()} and press E to take the job.`;
    if (mission.state === 'cooldown') return 'Payment cleared. The next telegraph is already ringing.';
    if (mission.phase === 'retrieve') return `Leave the wagon. Enter the ${mission.retrievalDoor.label.toLowerCase()} and retrieve the ledger.`;
    if (mission.phase === 'handoff') return `Get the ${mission.title === 'WITNESS OUT' ? 'witness' : 'goods'} to the ${mission.handoff.label.toLowerCase()}.`;
    if (mission.phase === 'steal') return 'The wagon is burned. Take a clean ride, then reach the handoff.';
    if (mission.phase === 'escape') return `Reach the ${mission.handoff.label.toLowerCase()} before the posse closes in.`;
    if (mission.key === 'recovery') return `Reach the ${mission.destination.label.toLowerCase()}, then get out on foot.`;
    if (mission.key === 'extraction') return `Reach the ${mission.destination.label.toLowerCase()} and find the witness.`;
    if (mission.key === 'switch') return `Reach the ${mission.destination.label.toLowerCase()} and leave the hot wagon.`;
    if (mission.key === 'quiet') return `Reach the ${mission.destination.label.toLowerCase()} without raising the law heat.`;
    return `Reach the ${mission.destination.label.toLowerCase()} and make the drop.`;
  }

  function updateHUD(dt) {
    const district = districtAt(targetPos());
    $('district-name').textContent = district.name;
    $('money-value').textContent = formatMoney(money);
    const speed = player.onFoot ? 0 : Math.abs(playerCar.speed) * .58;
    $('speed-value').textContent = String(Math.round(speed)).padStart(3, '0');
    $('vehicle-name').textContent = player.onFoot ? 'ON FOOT // ' + (player.crouching ? 'LOW PROFILE' : 'MOVE QUIET') : playerCar.spec.name;
    $('condition-bar').style.width = player.onFoot ? '100%' : `${clamp(playerCar.health / playerCar.spec.durability * 100, 0, 100)}%`;
    $('condition-bar').style.background = player.onFoot ? 'var(--cyan)' : (playerCar.health < 35 ? 'var(--red)' : 'var(--acid)');
    const stage = Math.ceil(heat);
    $('heat-stage').textContent = ['QUIET', 'SUSPICION', 'SEARCH', 'PURSUIT', 'MANHUNT', 'COUNTY WIDE'][stage];
    $('heat-stage').style.color = stage >= 3 ? 'var(--red)' : stage > 0 ? 'var(--amber)' : 'var(--cyan)';
    [...$('heat-pips').children].forEach((el, i) => el.classList.toggle('hot', i < stage));
    updateMissionHUD();
    const prompt = getPrompt();
    $('interaction-prompt').hidden = !prompt;
    if (prompt) $('interaction-text').textContent = prompt;
    drawMap();
  }

  function updateMissionHUD() {
    if (!mission) return;
    const state = mission.state;
    $('mission-code').textContent = `JOB—${String(mission.number).padStart(3, '0')}`;
    $('mission-title').textContent = state === 'cooldown' ? 'CLEAN EXIT' : mission.title;
    $('mission-description').textContent = missionInstruction();
    $('mission-pay').textContent = state === 'cooldown' ? '+ ' + formatMoney(mission.award || mission.payout) : formatMoney(mission.payout);
    $('mission-risk').textContent = state === 'active' ? `RISK / ${['LOW', 'MED', 'HIGH'][mission.risk - 1]}${mission.key === 'quiet' && !mission.quietBroken ? ' / QUIET BONUS' : ''}` : state === 'cooldown' ? 'STATUS / PAID' : 'STATUS / AVAILABLE';
    $('mission-clock').textContent = state === 'active' ? `${String(Math.floor(mission.timer / 60)).padStart(2, '0')}:${String(Math.floor(mission.timer % 60)).padStart(2, '0')}` : runMode === 'endless' ? 'ENDLESS' : 'READY';
    $('mission-kicker-text').textContent = state === 'active' ? (mission.phase === 'route' ? 'ACTIVE JOB' : mission.phase.replace('-', ' ').toUpperCase()) : state === 'cooldown' ? 'JOB COMPLETE' : 'AVAILABLE JOB';
    $('mission-status-dot').style.background = state === 'cooldown' ? 'var(--cyan)' : state === 'active' ? 'var(--red)' : 'var(--acid)';
  }

  function getPrompt() {
    if (player.interior) return 'EXIT BUILDING';
    const p = targetPos();
    const hideout = world && world.hideouts ? world.hideouts.find(h => dist(p, h) < 82) : null;
    if (mission && mission.state === 'available' && dist(p, mission.start) < 90) return 'ACCEPT JOB';
    if (mission && mission.state === 'active') {
      const target = getMissionTarget();
      if (target && dist(p, target) < 92) {
        if (mission.phase === 'retrieve') return 'FIND THE LEDGER INSIDE';
        if (mission.phase === 'steal') return 'TAKE CLEAN WAGON';
        if (mission.phase === 'handoff') return 'MAKE THE HANDOFF';
        if (mission.phase === 'escape') return 'REACH SAFE TRAIL';
        if (mission.key === 'recovery' || mission.key === 'extraction' || mission.key === 'switch') return player.onFoot ? 'START THE NEXT STEP' : 'PULL IN / STOP';
        return 'MAKE THE DROP';
      }
    }
    if (hideout && !player.onFoot && Math.abs(playerCar.speed) < 35) return 'PULL INTO HIDEOUT';
    if (hideout && player.onFoot) return 'ENTER HIDEOUT';
    if (player.onFoot) {
      if (dist(p, playerCar) < 45) return mission && mission.phase === 'steal' ? 'WAGON IS BURNED' : 'ENTER VEHICLE';
      const abandoned = traffic.find(v => v.abandoned && dist(p, v) < 40);
      if (abandoned) return 'TAKE VEHICLE';
      const door = world.doors.find(d => dist(p, d) < 55);
      if (door) return 'ENTER ' + door.label;
    } else if (Math.abs(playerCar.speed) < 35) return 'EXIT VEHICLE';
    return null;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const shakeX = (Math.random() - .5) * camera.shake * 18;
    const shakeY = (Math.random() - .5) * camera.shake * 13;
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
    const zoom = 1.08;
    ctx.translate(W / 2 - camera.x * zoom, H / 2 - camera.y * zoom);
    ctx.scale(zoom, zoom);
  }

  function drawWorld() {
    ctx.save();
    worldTransform();
    ctx.fillStyle = '#251a14'; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    // District blocks / ambient color fields.
    for (const d of DISTRICTS) { ctx.fillStyle = d.color; ctx.fillRect(d.x, d.y, d.w, d.h); }
    drawParks();
    drawRoads();
    drawBuildings();
    drawProps();
    drawHideouts();
    drawJobMarker();
    for (const v of traffic) drawVehicle(v, false);
    if (playerCar) drawVehicle(playerCar, false);
    for (const c of police) drawVehicle(c, true);
    if (player.onFoot) drawPerson();
    if (player.interior) { ctx.restore(); drawInteriorOverlay(); return; }
    ctx.restore();
  }

  function drawParks() {
    for (const p of world.parks) {
      ctx.fillStyle = p.kind === 'yard' ? '#3b3930' : '#334638'; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = p.kind === 'yard' ? 'rgba(213,169,72,.24)' : 'rgba(167,176,123,.22)'; ctx.lineWidth = 3; ctx.strokeRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
      const count = Math.floor(p.w * p.h / 28000);
      for (let i = 0; i < count; i++) { const x = p.x + 25 + ((i * 73) % Math.max(30, p.w - 50)); const y = p.y + 30 + ((i * 47) % Math.max(30, p.h - 60)); drawTree(x, y, p.kind === 'yard'); }
      if (p.kind === 'yard') {
        ctx.strokeStyle = 'rgba(113,86,54,.8)'; ctx.lineWidth = 5;
        for (let y = p.y + 24; y < p.y + p.h; y += 38) { ctx.beginPath(); ctx.moveTo(p.x + 12, y); ctx.lineTo(p.x + p.w - 12, y + 8); ctx.stroke(); }
        for (let x = p.x + 35; x < p.x + p.w; x += 95) { ctx.fillStyle = '#b18758'; ctx.fillRect(x, p.y + 28, 18, 14); }
      }
    }
    // Blackwater is a broad river, with timber docks and a rough crossing.
    ctx.fillStyle = '#203b42'; ctx.fillRect(3720, 1940, 480, 1260);
    ctx.strokeStyle = 'rgba(135,174,178,.28)'; ctx.lineWidth = 2;
    for (let y = 2000; y < 3200; y += 34) { ctx.beginPath(); ctx.moveTo(3740, y); ctx.lineTo(4170, y - 14); ctx.stroke(); }
    for (let x = 2820; x < 3700; x += 160) { ctx.fillStyle = '#514538'; ctx.fillRect(x, 2220 + (x % 3) * 36, 92, 37); ctx.fillStyle = '#a5674c'; ctx.fillRect(x + 9, 2229 + (x % 3) * 36, 74, 5); }
    // Railroad ties and the water tower establish a silhouette from anywhere in town.
    ctx.fillStyle = '#554333'; ctx.fillRect(2920, 166, 550, 12); ctx.fillStyle = '#2e2722';
    for (let x = 2920; x < 3470; x += 28) ctx.fillRect(x, 156, 8, 34);
    ctx.fillStyle = '#5e5345'; ctx.fillRect(3535, 420, 11, 104); ctx.beginPath(); ctx.arc(3540, 410, 38, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b88b59'; ctx.fillRect(3515, 388, 50, 7); ctx.fillRect(3518, 430, 44, 6);
  }

  function drawRoads() {
    for (const x of world.roadsX) {
      ctx.fillStyle = '#302b26'; ctx.fillRect(x - ROAD / 2, 0, ROAD, WORLD_H);
      ctx.fillStyle = 'rgba(183,145,91,.22)'; ctx.fillRect(x - ROAD / 2, 0, 5, WORLD_H); ctx.fillRect(x + ROAD / 2 - 5, 0, 5, WORLD_H);
      ctx.strokeStyle = 'rgba(229,189,99,.26)'; ctx.lineWidth = 3; ctx.setLineDash([38, 32]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const y of world.roadsY) {
      ctx.fillStyle = '#302b26'; ctx.fillRect(0, y - ROAD / 2, WORLD_W, ROAD);
      ctx.fillStyle = 'rgba(183,145,91,.22)'; ctx.fillRect(0, y - ROAD / 2, WORLD_W, 5); ctx.fillRect(0, y + ROAD / 2 - 5, WORLD_W, 5);
      ctx.strokeStyle = 'rgba(229,189,99,.26)'; ctx.lineWidth = 3; ctx.setLineDash([38, 32]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke(); ctx.setLineDash([]);
    }
    // Timber crossing marks make intersections readable without turning them into city crosswalks.
    for (const x of world.roadsX) for (const y of world.roadsY) {
      ctx.strokeStyle = 'rgba(213,169,72,.27)'; ctx.lineWidth = 4;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 11, y - 42); ctx.lineTo(x + i * 11, y - 22); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + i * 11, y + 22); ctx.lineTo(x + i * 11, y + 42); ctx.stroke(); }
    }
  }

  function buildingPalette(b) {
    const palettes = {
      saloon: { wall: '#79503b', roof: '#392820', trim: '#d79855', window: '#d5a948' },
      bank: { wall: '#9a886d', roof: '#4a3a30', trim: '#d5a948', window: '#b9c4b0' },
      'general store': { wall: '#806344', roof: '#47342a', trim: '#e0c18b', window: '#d79855' },
      stable: { wall: '#6a513a', roof: '#332922', trim: '#b18758', window: '#d5a948' },
      cabin: { wall: '#604733', roof: '#30251f', trim: '#a7b07b', window: '#d5a948' },
      hotel: { wall: '#70554a', roof: '#3b2b2a', trim: '#d79855', window: '#d5a948' },
      depot: { wall: '#655a4b', roof: '#332e28', trim: '#d5a948', window: '#b9c4b0' },
      warehouse: { wall: '#5a5147', roof: '#2e2b27', trim: '#b18758', window: '#87aeb2' },
      office: { wall: '#766852', roof: '#3e3329', trim: '#c9794e', window: '#d5a948' }
    };
    return palettes[b.kind] || palettes.cabin;
  }

  function drawBuildings() {
    for (const b of world.buildings) {
      const lift = b.z * 8;
      const p = buildingPalette(b);
      ctx.fillStyle = 'rgba(17,11,8,.42)'; ctx.fillRect(b.x + 18, b.y + 18, b.w, b.h);
      ctx.fillStyle = shade(p.roof, -12); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w + lift, b.y + b.h + lift); ctx.lineTo(b.x + lift, b.y + b.h + lift); ctx.closePath(); ctx.fill();
      ctx.fillStyle = p.wall; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(244,231,203,.18)'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
      // Low-poly roof planes and timber/Adobe facade texture.
      ctx.fillStyle = p.roof; ctx.beginPath(); ctx.moveTo(b.x - 3, b.y + 5); ctx.lineTo(b.x + b.w * .5, b.y - 7); ctx.lineTo(b.x + b.w + 3, b.y + 5); ctx.lineTo(b.x + b.w, b.y + 17); ctx.lineTo(b.x, b.y + 17); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(244,231,203,.08)';
      for (let i = 0; i < Math.min(7, Math.floor(b.w / 25)); i++) ctx.fillRect(b.x + 12 + i * 26, b.y + 24 + ((b.seed * 17) % 15), 13, 3);
      if (b.kind === 'cabin' || b.kind === 'stable' || b.kind === 'general store') {
        ctx.strokeStyle = 'rgba(44,30,22,.34)'; ctx.lineWidth = 2;
        for (let x = b.x + 15; x < b.x + b.w - 8; x += 18) { ctx.beginPath(); ctx.moveTo(x, b.y + 20); ctx.lineTo(x, b.y + b.h - 9); ctx.stroke(); }
      }
      if (b.enterable) { ctx.fillStyle = p.trim; ctx.fillRect(b.x + b.w / 2 - 7, b.y + b.h - 3, 14, 5); ctx.fillStyle = '#292019'; ctx.fillRect(b.x + b.w / 2 - 4, b.y + b.h - 11, 8, 9); }
      if (b.kind === 'hotel' || b.kind === 'office' || b.kind === 'bank' || b.kind === 'depot') {
        ctx.fillStyle = p.window;
        for (let y = b.y + 29; y < b.y + b.h - 10; y += 21) for (let x = b.x + 17; x < b.x + b.w - 10; x += 24) if ((Math.floor(x + y + b.seed * 100) % 4) !== 0) ctx.fillRect(x, y, 7, 5);
      }
      const signs = { saloon: 'SALOON', bank: 'BANK', 'general store': 'GENERAL', stable: 'LIVERY', depot: 'DEPOT', hotel: 'HOTEL' };
      if (signs[b.kind] && b.w > 90) {
        const text = signs[b.kind]; ctx.fillStyle = '#3d281d'; ctx.fillRect(b.x + b.w * .5 - text.length * 4.6, b.y + b.h - 25, text.length * 9 + 10, 13); ctx.strokeStyle = p.trim; ctx.strokeRect(b.x + b.w * .5 - text.length * 4.6, b.y + b.h - 25, text.length * 9 + 10, 13); ctx.fillStyle = '#f4e7cb'; ctx.font = '700 8px Space Mono'; ctx.textAlign = 'center'; ctx.fillText(text, b.x + b.w / 2, b.y + b.h - 15); ctx.textAlign = 'left';
      }
    }
  }

  function drawProps() {
    for (const l of world.streetLights) {
      ctx.strokeStyle = 'rgba(199,178,142,.3)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(l.x, l.y + 22); ctx.lineTo(l.x, l.y - 12); ctx.lineTo(l.x + 8, l.y - 17); ctx.stroke();
      ctx.fillStyle = `rgba(229,189,99,${.46 + Math.sin(elapsed * 2 + l.phase) * .08})`; ctx.fillRect(l.x + 5, l.y - 21, 9, 5);
    }
    for (const p of world.props) {
      if (p.type === 'window') { ctx.fillStyle = p.seed > .55 ? 'rgba(255,193,112,.48)' : 'rgba(135,174,178,.24)'; ctx.fillRect(p.x, p.y, 7, 4); }
    }
    // Hand-painted landmarks make the county legible at a glance.
    const signData = [[1030,574,'SALOON','#d79855'],[2035,574,'COTTONWOOD','#a7b07b'],[2875,1000,'DEPOT','#d5a948'],[1180,1700,'BANK','#c9794e'],[3340,2040,'BLACKWATER','#87aeb2']];
    for (const [x, y, text, color] of signData) { ctx.fillStyle = '#3d281d'; ctx.fillRect(x - 4, y - 18, text.length * 10 + 12, 24); ctx.strokeStyle = color; ctx.strokeRect(x - 4, y - 18, text.length * 10 + 12, 24); ctx.fillStyle = color; ctx.font = '700 10px Space Mono'; ctx.fillText(text, x + 2, y - 2); }
    // Hitching posts and a couple of windmills keep the open lots from feeling empty.
    for (const x of [530, 1010, 1740, 3090]) { const y = 450 + (x % 4) * 680; ctx.fillStyle = '#4c3525'; ctx.fillRect(x, y, 5, 22); ctx.fillRect(x + 19, y, 5, 22); ctx.strokeStyle = '#7d5d3f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 5, y + 4); ctx.lineTo(x + 29, y + 4); ctx.stroke(); }
  }

  function drawTree(x, y, industrial) {
    ctx.fillStyle = 'rgba(17,11,8,.28)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 8, 18, 8, 0, 0, TAU); ctx.fill();
    if (industrial) {
      ctx.fillStyle = '#5d764e'; ctx.fillRect(x - 3, y - 12, 6, 25); ctx.fillRect(x - 13, y - 4, 10, 5); ctx.fillRect(x + 3, y + 1, 10, 5); ctx.fillStyle = '#7d9259'; ctx.fillRect(x - 1, y - 18, 4, 10);
    } else {
      ctx.fillStyle = '#5a422d'; ctx.fillRect(x - 3, y - 2, 6, 15);
      ctx.fillStyle = '#466148'; ctx.beginPath(); ctx.arc(x, y - 10, 14, 0, TAU); ctx.fill(); ctx.fillStyle = '#6c8050'; ctx.fillRect(x - 8, y - 17, 10, 6);
    }
  }

  function drawVehicle(v, isPolice) {
    if (v.x < camera.x - 620 || v.x > camera.x + 620 || v.y < camera.y - 420 || v.y > camera.y + 420) return;
    ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.angle);
    const s = v.kind === 'van' ? 1.2 : v.kind === 'sports' ? .88 : 1;
    // Dust and low-res contact shadow sell the period silhouette without realism.
    if (v.isPlayer && Math.abs(v.speed) > 50) { ctx.fillStyle = `rgba(196,153,95,${.08 + Math.min(.18, Math.abs(v.speed) / 1100)})`; ctx.beginPath(); ctx.ellipse(-30, 0, 25 + Math.abs(v.speed) / 13, 10, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(17,11,8,.5)'; ctx.beginPath(); ctx.ellipse(3, 7, 22 * s, 10 * s, 0, 0, TAU); ctx.fill();
    if (v.skid > .3 && v.isPlayer) { ctx.strokeStyle = 'rgba(25,17,12,.72)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(-40, -7); ctx.moveTo(-10, 7); ctx.lineTo(-40, 7); ctx.stroke(); }
    ctx.fillStyle = shade(v.spec.color, -24); ctx.beginPath(); ctx.roundRect(-21 * s, -10 * s, 42 * s, 20 * s, 4 * s); ctx.fill();
    ctx.fillStyle = v.spec.color; ctx.beginPath(); ctx.roundRect(-19 * s, -9 * s, 38 * s, 17 * s, 3 * s); ctx.fill();
    ctx.fillStyle = v.spec.accent; ctx.beginPath(); ctx.roundRect(-7 * s, -7 * s, 14 * s, 14 * s, 2 * s); ctx.fill();
    ctx.fillStyle = 'rgba(39,54,58,.9)'; ctx.fillRect(-5 * s, -6 * s, 10 * s, 12 * s);
    // Brass lanterns and oxblood tail lamps.
    ctx.fillStyle = '#f4d8a1'; ctx.fillRect(16 * s, -7 * s, 4 * s, 4 * s); ctx.fillRect(16 * s, 3 * s, 4 * s, 4 * s);
    ctx.fillStyle = '#8f3f36'; ctx.fillRect(-20 * s, -7 * s, 3 * s, 4 * s); ctx.fillRect(-20 * s, 3 * s, 3 * s, 4 * s);
    ctx.fillStyle = '#241b16'; ctx.fillRect(-12 * s, -12 * s, 9 * s, 3 * s); ctx.fillRect(4 * s, -12 * s, 9 * s, 3 * s); ctx.fillRect(-12 * s, 9 * s, 9 * s, 3 * s); ctx.fillRect(4 * s, 9 * s, 9 * s, 3 * s);
    if (isPolice) { ctx.fillStyle = '#2a3535'; ctx.fillRect(-6, -14, 12, 4); ctx.fillStyle = Math.sin(elapsed * 13 + v.siren) > 0 ? '#a7443b' : '#87aeb2'; ctx.fillRect(-5, -15, 5, 5); ctx.fillStyle = Math.sin(elapsed * 13 + v.siren) > 0 ? '#87aeb2' : '#a7443b'; ctx.fillRect(1, -15, 5, 5); }
    if (v.health < v.spec.durability * .42) { ctx.fillStyle = 'rgba(177,157,128,.35)'; ctx.fillRect(-16, -15, 5, 4); }
    if (v.health < v.spec.durability * .25 && Math.sin(elapsed * 8 + v.x) > -.4) { ctx.fillStyle = 'rgba(175,161,136,.38)'; ctx.beginPath(); ctx.arc(-22, 0, 5 + Math.sin(elapsed * 5) * 2, 0, TAU); ctx.fill(); }
    if (v.hitFlash > 0) { ctx.fillStyle = `rgba(255,236,178,${v.hitFlash})`; ctx.fillRect(-20 * s, -10 * s, 40 * s, 20 * s); }
    ctx.restore();
  }

  function drawPerson() {
    const bob = Math.sin(elapsed * (player.crouching ? 3 : 7)) * (player.crouching ? 1 : 2);
    const jumpLift = player.jump > 0 ? Math.sin((1 - player.jump / .55) * Math.PI) * 11 : 0;
    ctx.save();
    ctx.translate(player.x, player.y + bob - jumpLift);
    ctx.fillStyle = 'rgba(0,0,0,.48)'; ctx.beginPath(); ctx.ellipse(0, 9, player.crouching ? 9 : 7, 4, 0, 0, TAU); ctx.fill();
    ctx.rotate(player.angle);
    ctx.fillStyle = player.crouching ? '#284d52' : '#263f4b'; ctx.fillRect(-5, -5, 10, 15);
    ctx.fillStyle = '#d5a77e'; ctx.fillRect(2, -7, 7, 7);
    ctx.fillStyle = '#d8ff62'; ctx.fillRect(5, -7, 5, 2);
    ctx.fillStyle = '#17232d'; ctx.fillRect(-5, 9, 4, 7); ctx.fillRect(2, 9, 4, 7);
    ctx.restore();
  }

  function drawHideouts() {
    for (const h of world.hideouts) {
      const pulse = .78 + Math.sin(elapsed * 2 + h.x) * .08;
      ctx.fillStyle = 'rgba(17,11,8,.38)'; ctx.beginPath(); ctx.ellipse(h.x + 8, h.y + 12, 34, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5b402d'; ctx.fillRect(h.x - 27, h.y - 17, 54, 34); ctx.fillStyle = '#34251d'; ctx.beginPath(); ctx.moveTo(h.x - 35, h.y - 17); ctx.lineTo(h.x, h.y - 37); ctx.lineTo(h.x + 35, h.y - 17); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e5bd63'; ctx.fillRect(h.x - 5, h.y + 1, 10, 16); ctx.fillStyle = `rgba(229,189,99,${pulse})`; ctx.fillRect(h.x - 22, h.y - 4, 6, 6); ctx.fillRect(h.x + 16, h.y - 4, 6, 6);
      ctx.fillStyle = '#f4e7cb'; ctx.font = '700 8px Space Mono'; ctx.textAlign = 'center'; ctx.fillText(h.name, h.x, h.y - 43); ctx.textAlign = 'left';
    }
  }

  function drawJobMarker() {
    const target = getMissionTarget();
    if (!target || mission.state === 'cooldown') return;
    const pulse = 1 + Math.sin(elapsed * 4) * .15;
    ctx.save(); ctx.translate(target.x, target.y);
    ctx.strokeStyle = mission.state === 'active' ? '#d79855' : '#e5bd63'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 28 * pulse, 0, TAU); ctx.stroke();
    ctx.fillStyle = mission.state === 'active' ? 'rgba(215,152,85,.18)' : 'rgba(229,189,99,.14)'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
    const markerLabel = mission.state !== 'active' ? 'JOB' : mission.phase === 'retrieve' ? 'LEDGER' : mission.phase === 'steal' ? 'WAGON' : mission.phase === 'handoff' ? 'HANDOFF' : mission.phase === 'escape' ? 'ESCAPE' : 'DROP';
    ctx.fillStyle = '#f4e7cb'; ctx.font = '700 10px Space Mono'; ctx.textAlign = 'center'; ctx.fillText(markerLabel, 0, 4); ctx.restore();
  }

  function drawObjectiveGuide() {
    const target = getMissionTarget();
    if (!target || mission.state === 'cooldown' || player.interior) return;
    const zoom = 1.08;
    const sx = W / 2 + (target.x - camera.x) * zoom;
    const sy = H / 2 + (target.y - camera.y) * zoom;
    const margin = 35;
    const onScreen = sx > margin && sx < W - margin && sy > margin && sy < H - margin;
    if (!onScreen) {
      const angle = Math.atan2(sy - H / 2, sx - W / 2);
      const edgeX = clamp(W / 2 + Math.cos(angle) * (W / 2 - 30), 30, W - 30);
      const edgeY = clamp(H / 2 + Math.sin(angle) * (H / 2 - 30), 30, H - 30);
      ctx.save(); ctx.translate(edgeX, edgeY); ctx.rotate(angle);
      ctx.fillStyle = '#e5bd63'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -7); ctx.lineTo(-4, 0); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.save(); ctx.fillStyle = 'rgba(244,231,203,.78)'; ctx.font = '700 10px Space Mono'; ctx.textAlign = 'center'; ctx.fillText(`${Math.round(dist(target, targetPos()) / 10)}m`, edgeX, edgeY + 22); ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = 'rgba(229,189,99,.75)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(sx, sy, 34 + Math.sin(elapsed * 4) * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(244,231,203,.78)'; ctx.font = '700 10px Space Mono'; ctx.textAlign = 'center'; ctx.fillText(`${Math.round(dist(target, targetPos()) / 10)}m`, sx, sy - 40); ctx.restore();
    }
  }

  function drawLighting() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const p = player.onFoot ? player : playerCar;
    if (!player.interior && p) drawCone(p.x, p.y, p.angle, 250, 'rgba(255,221,157,.1)');
    for (const c of police) { drawGlow(c.x, c.y, Math.sin(elapsed * 13 + c.siren) > 0 ? '#a7443b' : '#87aeb2', 55, .15); }
    ctx.restore();
  }

  function drawCone(x, y, angle, length, color) {
    const zoom = 1.08;
    const sx = W / 2 + (x - camera.x) * zoom;
    const sy = H / 2 + (y - camera.y) * zoom;
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(angle - .22) * length * zoom, sy + Math.sin(angle - .22) * length * zoom); ctx.lineTo(sx + Math.cos(angle + .22) * length * zoom, sy + Math.sin(angle + .22) * length * zoom); ctx.closePath(); ctx.fill();
  }

  function drawGlow(x, y, color, radius, alpha) {
    const zoom = 1.08; const sx = W / 2 + (x - camera.x) * zoom; const sy = H / 2 + (y - camera.y) * zoom;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, radius, 0, TAU); ctx.fill();
  }

  function rgba(hex, alpha) {
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  function drawInteriorOverlay() {
    // A connected room, painted as a spatial pocket over the street: no scene load, no teleport feel.
    const pulse = Math.sin(elapsed * 2) * .05;
    ctx.fillStyle = 'rgba(20,13,10,.95)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4a3324'; ctx.fillRect(95, 72, 770, 395);
    ctx.fillStyle = '#624936'; ctx.beginPath(); ctx.moveTo(95,72); ctx.lineTo(480,30); ctx.lineTo(865,72); ctx.lineTo(865,467); ctx.lineTo(95,467); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a5a3e'; ctx.fillRect(112, 310, 736, 140);
    ctx.strokeStyle = 'rgba(229,189,99,.28)'; ctx.lineWidth = 2; ctx.strokeRect(95,72,770,395);
    ctx.fillStyle = 'rgba(135,174,178,.14)'; ctx.fillRect(120,100,184,110); ctx.fillStyle = 'rgba(167,68,59,.16)'; ctx.fillRect(316,100,184,110); ctx.fillStyle = 'rgba(229,189,99,.12)'; ctx.fillRect(512,100,184,110);
    ctx.fillStyle = '#e0a96a'; ctx.fillRect(756, 104, 62, 4); ctx.fillStyle = '#e5bd63'; ctx.fillRect(756, 115, 43, 3);
    // Bar, table, and wanted-board geometry read as a saloon or livery from above.
    ctx.fillStyle = '#3b281c'; ctx.fillRect(170, 245, 175, 27); ctx.fillStyle = '#9b7049'; ctx.fillRect(187, 226, 140, 21); ctx.fillStyle = '#241a14'; ctx.fillRect(205, 231, 103, 11);
    ctx.fillStyle = '#35251b'; ctx.fillRect(630, 246, 150, 18); ctx.fillStyle = '#e5bd63'; ctx.fillRect(648, 236, 22, 8); ctx.fillStyle = '#a7443b'; ctx.fillRect(680, 236, 22, 8); ctx.fillStyle = '#87aeb2'; ctx.fillRect(712, 236, 22, 8);
    ctx.fillStyle = '#261b15'; ctx.fillRect(435, 330, 90, 90); ctx.strokeStyle = 'rgba(229,189,99,.32)'; ctx.strokeRect(435,330,90,90);
    const x = 480 + player.interiorPos.x * 1.8; const y = 340 + player.interiorPos.y * 1.2;
    ctx.fillStyle = 'rgba(17,11,8,.5)'; ctx.beginPath(); ctx.ellipse(x, y + 16, 16, 7, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(player.angle); ctx.fillStyle = '#3d5755'; ctx.fillRect(-8,-8,16,20); ctx.fillStyle = '#d5a77e'; ctx.fillRect(3,-12,9,9); ctx.fillStyle = '#e5bd63'; ctx.fillRect(6,-12,6,2); ctx.restore();
    ctx.fillStyle = 'rgba(244,231,203,.85)'; ctx.font = '700 12px Space Mono'; ctx.fillText('INTERIOR / POSSE CANNOT SEE YOU', 118, 98);
    ctx.fillStyle = 'rgba(199,183,155,.75)'; ctx.font = '11px Space Mono'; ctx.fillText('E  EXIT TO THE STREET', 118, 121);
    if (heat > 0) { ctx.fillStyle = `rgba(167,68,59,${.09 + pulse})`; ctx.fillRect(95, 73, 770, 3); }
  }

  function drawRain() {
    ctx.save();
    ctx.lineWidth = weather.wet ? 1 : 2;
    for (const d of rain) { ctx.strokeStyle = weather.wet ? `rgba(135,174,178,${d.alpha})` : `rgba(196,153,95,${d.alpha})`; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.slant, d.y + d.len); ctx.stroke(); }
    ctx.restore();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 600); g.addColorStop(0, 'rgba(2,5,10,0)'); g.addColorStop(1, 'rgba(2,5,10,.58)'); ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    if (heat >= 3 && Math.sin(elapsed * 11) > .65) { ctx.fillStyle = 'rgba(255,45,71,.055)'; ctx.fillRect(0,0,W,H); }
  }

  function drawMap() {
    if (!world) return;
    const mw = mapCanvas.width, mh = mapCanvas.height;
    mapCtx.clearRect(0,0,mw,mh); mapCtx.fillStyle = '#241a14'; mapCtx.fillRect(0,0,mw,mh);
    const sx = mw / WORLD_W, sy = mh / WORLD_H;
    for (const p of world.parks) { mapCtx.fillStyle = p.kind === 'yard' ? '#4a4436' : '#40543f'; mapCtx.fillRect(p.x*sx,p.y*sy,p.w*sx,p.h*sy); }
    mapCtx.strokeStyle = '#4b4036'; mapCtx.lineWidth = ROAD*sx;
    for (const x of world.roadsX) { mapCtx.beginPath(); mapCtx.moveTo(x*sx,0); mapCtx.lineTo(x*sx,mh); mapCtx.stroke(); }
    for (const y of world.roadsY) { mapCtx.beginPath(); mapCtx.moveTo(0,y*sy); mapCtx.lineTo(mw,y*sy); mapCtx.stroke(); }
    mapCtx.fillStyle = 'rgba(244,231,203,.22)'; for (const b of world.buildings) mapCtx.fillRect(b.x*sx,b.y*sy,b.w*sx,b.h*sy);
    const p = targetPos();
    const target = getMissionTarget();
    if (target) {
      mapCtx.strokeStyle = 'rgba(229,189,99,.55)'; mapCtx.lineWidth = 1; mapCtx.setLineDash([4, 4]); mapCtx.beginPath(); mapCtx.moveTo(p.x*sx, p.y*sy); mapCtx.lineTo(target.x*sx, target.y*sy); mapCtx.stroke(); mapCtx.setLineDash([]);
      mapCtx.fillStyle = '#e5bd63'; mapCtx.beginPath(); mapCtx.arc(target.x*sx,target.y*sy,4,0,TAU); mapCtx.fill();
    }
    if (lawSearch.ttl > 0) { mapCtx.strokeStyle = `rgba(167,68,59,${Math.min(.8, lawSearch.ttl / 9)})`; mapCtx.lineWidth = 2; mapCtx.setLineDash([3, 3]); mapCtx.beginPath(); mapCtx.arc(lawSearch.x*sx, lawSearch.y*sy, 15 + (9 - lawSearch.ttl) * 3, 0, TAU); mapCtx.stroke(); mapCtx.setLineDash([]); }
    for (const c of police) { mapCtx.fillStyle = '#a7443b'; mapCtx.fillRect(c.x*sx-2,c.y*sy-2,4,4); }
    mapCtx.save(); mapCtx.translate(p.x*sx,p.y*sy); mapCtx.rotate((p.angle || 0)); mapCtx.fillStyle = '#87aeb2'; mapCtx.beginPath(); mapCtx.moveTo(6,0); mapCtx.lineTo(-5,-4); mapCtx.lineTo(-5,4); mapCtx.closePath(); mapCtx.fill(); mapCtx.restore();
  }

  function shade(hex, amount) {
    if (!hex || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16); const r = clamp((n >> 16) + amount, 0, 255); const g = clamp(((n >> 8) & 255) + amount, 0, 255); const b = clamp((n & 255) + amount, 0, 255); return `rgb(${r},${g},${b})`;
  }

  function togglePause(force) {
    if (gameMode !== 'playing' && gameMode !== 'paused') return;
    const pause = typeof force === 'boolean' ? force : gameMode === 'playing';
    gameMode = pause ? 'paused' : 'playing';
    pauseScreen.hidden = !pause;
    if (pause) {
      $('pause-stats').innerHTML = `<div class="pause-stat"><b>${formatMoney(money)}</b><span>CASH</span></div><div class="pause-stat"><b>${careerStreak}</b><span>STREAK</span></div><div class="pause-stat"><b>${bestStreak}</b><span>BEST STREAK</span></div>`;
    } else { lastTime = performance.now(); requestAnimationFrame(loop); }
  }

  function ensureAudio() { if (!audioContext) { try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (audioContext && audioContext.state === 'suspended') audioContext.resume(); }
  function beep(freq, duration, type) { if (!audioContext) return; const o = audioContext.createOscillator(); const g = audioContext.createGain(); o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(.0001, audioContext.currentTime); g.gain.exponentialRampToValueAtTime(.055, audioContext.currentTime + .012); g.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration); o.connect(g); g.connect(audioContext.destination); o.start(); o.stop(audioContext.currentTime + duration + .02); }

  function setSeed() { const names = ['DUST','MESA','COTTONWOOD','BLACKWATER','CINDER','PRAIRIE']; seedText = `${choice(names)}-${String(10 + Math.floor(Math.random() * 890)).padStart(3,'0')}`; menuSeed.textContent = seedText; }

  document.addEventListener('keydown', (e) => {
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if (!keys[e.key]) justPressed[e.key.toLowerCase()] = true;
    keys[e.key] = true;
    if (e.key === 'Escape') togglePause();
  });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });
  $('career-btn').addEventListener('click', () => startRun('career'));
  $('endless-btn').addEventListener('click', () => startRun('endless'));
  $('reroll-btn').addEventListener('click', () => { setSeed(); ensureAudio(); beep(520,.06,'square'); });
  $('pause-btn').addEventListener('click', () => togglePause(true));
  $('resume-btn').addEventListener('click', () => togglePause(false));
  $('restart-btn').addEventListener('click', () => { pauseScreen.hidden = true; startRun(runMode); });

  // Touch controls are deliberately tiny: the game remains keyboard-first but playable on a phone.
  const stick = document.querySelector('.touch-stick');
  if (stick) {
    const moveTouch = (e) => { const t = e.touches[0]; const r = stick.getBoundingClientRect(); const dx = t.clientX - (r.left + r.width/2); const dy = t.clientY - (r.top + r.height/2); const mag = Math.min(1, Math.hypot(dx,dy)/(r.width*.45)); const ang = Math.atan2(dy,dx); touchVector = { x: Math.cos(ang)*mag, y: Math.sin(ang)*mag }; };
    stick.addEventListener('touchstart', (e) => { e.preventDefault(); moveTouch(e); }, {passive:false}); stick.addEventListener('touchmove', (e) => { e.preventDefault(); moveTouch(e); }, {passive:false}); stick.addEventListener('touchend', () => { touchVector = {x:0,y:0}; });
  }
  document.querySelectorAll('[data-touch]').forEach(btn => { const down = (e) => { e.preventDefault(); justPressed['touch'+btn.dataset.touch[0].toUpperCase()+btn.dataset.touch.slice(1)] = true; keys[' ' + btn.dataset.touch] = true; }; const up = () => { keys[' ' + btn.dataset.touch] = false; }; btn.addEventListener('touchstart', down, {passive:false}); btn.addEventListener('touchend', up); });

  // Let the title card feel alive even before the first run.
  loadCareer();
  menuSeed.textContent = seedText;
  ctx.fillStyle = '#090c15'; ctx.fillRect(0,0,W,H);
})();
