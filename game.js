/* GETAWAY // a dependency-free neon-noir escape sandbox */
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
  let mission;
  let money = 460;
  let heat = 0;
  let camera = { x: 700, y: 700, shake: 0 };
  let rain = [];
  let toastQueue = [];
  let radioTimer = 0;
  let policeTimer = 0;
  let ambientTimer = 8;
  let missionNumber = 1;
  let audioContext = null;
  let touchVector = { x: 0, y: 0 };

  const VEHICLE_TYPES = {
    sedan: { name: 'NIGHTHAWK SEDAN', top: 235, accel: 145, brake: 235, turn: 2.35, grip: 0.86, weight: 1, color: '#cdd6ce', accent: '#53e6de', durability: 100 },
    compact: { name: 'KITE COMPACT', top: 218, accel: 170, brake: 245, turn: 2.8, grip: 0.93, weight: .72, color: '#d8ff62', accent: '#193b48', durability: 82 },
    muscle: { name: 'BANSHEE MUSCLE', top: 264, accel: 175, brake: 205, turn: 1.8, grip: 0.72, weight: 1.3, color: '#ff6370', accent: '#ffb45c', durability: 115 },
    sports: { name: 'VANTA SPORT', top: 292, accel: 205, brake: 270, turn: 2.5, grip: 0.82, weight: .9, color: '#6e84ff', accent: '#e9f0e5', durability: 75 },
    van: { name: 'BOXER VAN', top: 190, accel: 112, brake: 190, turn: 1.55, grip: .68, weight: 1.7, color: '#e6a45d', accent: '#242b39', durability: 145 },
    taxi: { name: 'METER TAXI', top: 220, accel: 140, brake: 220, turn: 2.25, grip: .84, weight: 1, color: '#ffd34f', accent: '#101827', durability: 95 },
    police: { name: 'METRO INTERCEPTOR', top: 270, accel: 188, brake: 255, turn: 2.4, grip: .9, weight: 1.15, color: '#d9e1e2', accent: '#1b2e43', durability: 130 }
  };

  const DISTRICTS = [
    { name: 'LOWER MERIDIAN', short: 'MERIDIAN', x: 300, y: 500, w: 1280, h: 1180, color: '#101b29', accent: '#53e6de' },
    { name: 'OLD QUARTER', short: 'OLD QUARTER', x: 300, y: 1850, w: 1280, h: 1220, color: '#211c2c', accent: '#ffb45c' },
    { name: 'NEON CORE', short: 'NEON CORE', x: 1660, y: 500, w: 1150, h: 1180, color: '#181a32', accent: '#c775ff' },
    { name: 'INDUSTRIAL BELT', short: 'INDUSTRIAL', x: 2850, y: 300, w: 1120, h: 1350, color: '#1b2027', accent: '#d8ff62' },
    { name: 'THE DOCKS', short: 'THE DOCKS', x: 2760, y: 1900, w: 1350, h: 1250, color: '#10242b', accent: '#53e6de' },
    { name: 'NORTH HILLS', short: 'NORTH HILLS', x: 1200, y: 50, w: 1300, h: 390, color: '#111d24', accent: '#d8ff62' }
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
      { x: 1310, y: 2570, name: 'MOTH MOTEL', type: 'ROOM', safe: true },
      { x: 3470, y: 2640, name: 'PIER 09', type: 'WAREHOUSE', safe: true }
    ];
    const neonWords = ['OPEN', 'MOTEL', 'RAMEN', '24 HRS', 'AUTO', 'LUCKY', 'VIDEO', 'NO EXIT'];

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
        if (roll < (district.name === 'THE DOCKS' ? .28 : .1)) {
          parks.push({ x: left, y: top, w: right - left, h: bottom - top, kind: district.name === 'THE DOCKS' ? 'yard' : 'park' });
          continue;
        }
        const cols = district.name === 'OLD QUARTER' ? 2 : (r() > .6 ? 2 : 1);
        const rows = district.name === 'OLD QUARTER' ? 2 : (r() > .62 ? 2 : 1);
        const gap = district.name === 'OLD QUARTER' ? 12 : 20;
        const cellW = (right - left - gap * (cols - 1)) / cols;
        const cellH = (bottom - top - gap * (rows - 1)) / rows;
        for (let cx = 0; cx < cols; cx++) {
          for (let cy = 0; cy < rows; cy++) {
            const bx = left + cx * (cellW + gap) + (r() * 8 - 4);
            const by = top + cy * (cellH + gap) + (r() * 8 - 4);
            const bw = Math.max(72, cellW - 8 - r() * 17);
            const bh = Math.max(72, cellH - 8 - r() * 17);
            const kind = pick(r, district.name === 'THE DOCKS' ? ['warehouse', 'warehouse', 'garage', 'office'] : district.name === 'NEON CORE' ? ['office', 'hotel', 'store', 'club'] : ['house', 'store', 'office', 'apartment', 'garage']);
            const b = { x: bx, y: by, w: bw, h: bh, z: 1 + Math.floor(r() * 3), kind, district: district.name, color: district.color, accent: district.accent, seed: r(), enterable: r() > .73 || kind === 'store' || kind === 'garage' };
            buildings.push(b);
            if (b.enterable && doors.length < 32) {
              doors.push({ x: b.x + b.w / 2, y: b.y + b.h + 10, building: b, label: kind === 'store' ? 'STORE' : kind.toUpperCase() });
            }
            if (r() > .58) props.push({ x: b.x + 12 + r() * Math.max(1, b.w - 24), y: b.y + 12 + r() * Math.max(1, b.h - 24), type: 'window', seed: r() });
          }
        }
      }
    }

    for (let i = 0; i < 18; i++) {
      const roadX = pick(r, roadsX);
      const roadY = pick(r, roadsY);
      jobSites.push({ x: roadX + (r() > .5 ? 64 : -64), y: roadY + (r() > .5 ? 64 : -64), label: pick(r, ['PAYPHONE', 'BACK DOOR', 'LOCKER', 'DROP POINT', 'SERVICE EXIT']) });
    }
    // Make the first job immediately legible at the starting hideout.
    jobSites.unshift({ x: hideouts[0].x, y: hideouts[0].y + 26, label: 'PAYPHONE' });

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
    return { seed, roadsX, roadsY, buildings, doors, parks, props, jobSites, hideouts, trafficCars, streetLights, neonWords };
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
    for (let i = 0; i < 135; i++) rain.push({ x: r() * W, y: r() * H, len: 5 + r() * 12, speed: 220 + r() * 260, alpha: .12 + r() * .36, slant: 4 + r() * 8 });
  }

  function newMission(isFirst = false) {
    const r = rngFrom(`${seedText}:job:${missionNumber}:${money}`);
    const types = [
      { key: 'delivery', title: 'COLD DELIVERY', description: 'A sealed package. No questions. No sirens.', risk: 1, radio: 'Keep it quiet. Quiet pays better.' },
      { key: 'recovery', title: 'RECOVER THE KEY', description: 'Somebody left a key where the cameras cannot see.', risk: 2, radio: 'One stop. One key. Then you disappear.' },
      { key: 'quiet', title: 'QUIET RUN', description: 'Across town, under the radar. Make it look boring.', risk: 1, radio: 'Boring is a superpower tonight.' },
      { key: 'extraction', title: 'EXTRACTION WINDOW', description: 'Get to the contact before the window closes.', risk: 3, radio: 'The window is open. It will not stay that way.' },
      { key: 'switch', title: 'BURN THE RIDE', description: 'Reach the handoff, then leave your problems behind.', risk: 2, radio: 'Every car tells a story. Change the ending.' }
    ];
    const type = isFirst ? types[0] : pick(r, types);
    const start = isFirst ? { x: world.hideouts[0].x, y: world.hideouts[0].y + 26, label: 'PAYPHONE' } : { ...pick(r, world.jobSites) };
    let destination = { ...pick(r, world.jobSites) };
    let tries = 0;
    while (dist(start, destination) < 700 && tries++ < 10) destination = { ...pick(r, world.jobSites) };
    const payout = 260 + type.risk * 160 + Math.floor(r() * 180);
    mission = { number: missionNumber, ...type, start, destination, payout, state: 'available', phase: 'accept', timer: 0, complication: pick(r, ['traffic surge', 'wet roads', 'construction ahead', 'a witness nearby', 'police saturation']), revealed: false, lastToast: 0 };
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
    resetRain();
    traffic = world.trafficCars.map(v => ({ ...v }));
    police = [];
    player = { x: world.hideouts[0].x, y: world.hideouts[0].y + 8, angle: 0, onFoot: false, crouching: false, hidden: false, stamina: 1, jump: 0, interior: null, interiorPos: { x: 0, y: 0 } };
    playerCar = makeVehicle(mode === 'endless' ? 'compact' : 'sedan', player.x, player.y, -Math.PI / 2, true);
    money = mode === 'endless' ? 0 : 460;
    heat = 0;
    missionNumber = 1;
    camera = { x: player.x, y: player.y, shake: 0 };
    toastQueue = [];
    newMission(true);
    notify(mode === 'endless' ? 'GETAWAY MODE // NO SAFETY NET' : 'THE NIGHT SHIFT IS LIVE', 'good');
    notify('Drive to the payphone. Press E to take the job.', '');
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
    if (v.health < 40 && Math.random() < .008) notify('ENGINE DAMAGE // HANDLING COMPROMISED', 'warn');
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
        notify('CONTACT // WITNESS REPORTED A COLLISION', 'warn');
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
        cop.lost = 0;
        heat = clamp(heat + dt * .035, 0, 5);
      } else if (cop.state === 'pursuit') {
        cop.lost += dt;
        if (cop.lost > 2.8) { cop.state = 'search'; cop.searchTime = 12; notify('NEGATIVE VISUAL // THEY ARE SEARCHING', 'good'); }
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
    if (!player.interior && !player.hidden && police.length === 0 && heat > 0) heat = Math.max(0, heat - dt * .025);
    if (player.interior || player.hidden) heat = Math.max(0, heat - dt * .055);
    if (heat < .3 && police.length === 0) player.hidden = false;
  }

  function updateMission(dt) {
    if (!mission) return;
    if (mission.state === 'active') {
      mission.timer += dt;
      if (mission.timer > 9 && !mission.revealed) { mission.revealed = true; notify('COMPLICATION // ' + mission.complication.toUpperCase(), 'warn'); addHeat(mission.risk * .15); }
      const target = mission.phase === 'drop' || mission.phase === 'escape' ? mission.destination : mission.start;
      if (dist(targetPos(), target) < 76 && mission.phase === 'drop' && justPressed.e) completeMission();
      if (dist(targetPos(), target) < 76 && mission.phase === 'escape' && !player.onFoot) completeMission();
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

  function weatherWet() { return true; }

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
    if (player.onFoot) {
      if (mission && mission.state === 'available' && dist(p, mission.start) < 90) { acceptMission(); return; }
      if (mission && mission.state === 'active' && mission.phase === 'drop' && dist(p, mission.destination) < 90) { completeMission(); return; }
      if (dist(p, playerCar) < 45) { enterVehicle(playerCar); return; }
      const abandoned = traffic.find(v => v.abandoned && dist(p, v) < 40);
      if (abandoned) { stealVehicle(abandoned); return; }
      const door = world.doors.find(d => dist(p, d) < 55);
      if (door) { enterInterior(door); return; }
    } else if (mission && mission.state === 'available' && dist(p, mission.start) < 90) {
      acceptMission(); return;
    } else if (mission && mission.state === 'active' && mission.phase === 'drop' && dist(p, mission.destination) < 90) {
      completeMission(); return;
    }
    if (!player.onFoot && Math.abs(playerCar.speed) < 35 && justPressed.e) exitVehicle();
  }

  function acceptMission() {
    mission.state = 'active';
    mission.phase = 'drop';
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
    money += mission.payout;
    addHeat(mission.risk * .72 + (mission.revealed ? .35 : 0));
    notify(`JOB COMPLETE // ${formatMoney(mission.payout)} CLEARED`, 'good');
    radio('Package delivered. The city did not get a name. Good work.');
    beep(720, .12, 'sine');
    beep(960, .1, 'sine');
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
    notify('ON FOOT // FIND COVER OR FIND ANOTHER RIDE', '');
    radio('Driver left the vehicle. Units, check the last known position.');
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
    notify('HOTWIRE // SOMEONE WILL NOTICE', 'warn');
    radio('Suspect may have changed vehicles. Update the description.');
  }

  function enterInterior(door) {
    if (!player.onFoot) { notify('EXIT THE VEHICLE FIRST', 'warn'); return; }
    player.interior = door;
    player.interiorPos = { x: 0, y: 54 };
    player.hidden = true;
    notify(`${door.label} // LINE OF SIGHT BROKEN`, 'good');
    radio('Visual lost at the last intersection. Check the doors.');
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
      if (after === 2) notify('SEARCH // POLICE ARE CHECKING THE AREA', 'warn');
      if (after === 3) notify('PURSUIT // LIGHTS IN THE MIRROR', 'warn');
      if (after >= 4) notify('HEAVY PURSUIT // ROADBLOCKS POSSIBLE', 'warn');
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
    notify(police.length > 1 ? 'BACKUP UNIT // INTERCEPT AHEAD' : 'UNIT DISPATCHED // KEEP MOVING', 'warn');
    radio(police.length > 1 ? 'All units, coordinate a containment.' : 'Unit 12, check the eastbound lanes.');
  }

  function crash(v, impact) {
    v.health = Math.max(0, v.health - impact * .09);
    v.speed *= -.28;
    camera.shake = Math.max(camera.shake, clamp(impact / 500, .08, .38));
    beep(75 + Math.random() * 25, .1, 'sawtooth');
    if (v.health < 22) notify('VEHICLE CRITICAL // FIND A SWITCH', 'warn');
    else if (impact > 90) notify('IMPACT // KEEP IT TOGETHER', 'warn');
  }

  function caught() {
    if (gameMode !== 'playing') return;
    money = Math.max(0, money - 180);
    heat = 0;
    police = [];
    player.onFoot = false;
    player.interior = null;
    player.hidden = false;
    playerCar = makeVehicle('sedan', world.hideouts[0].x, world.hideouts[0].y + 8, -Math.PI / 2, true);
    player.x = playerCar.x; player.y = playerCar.y;
    camera.x = player.x; camera.y = player.y;
    mission.state = 'available'; mission.phase = 'accept'; mission.timer = 0; mission.revealed = false;
    notify('CAUGHT // THE CITY TAKES A CUT', 'warn');
    radio('No charges filed. Yet. Keep your head down.');
    beep(90, .23, 'square');
  }

  function cityEvent() {
    if (heat > 2.5 && Math.random() < .5) { radio('Traffic camera is offline near the docks.'); notify('CITY NOTE // CAMERA GRID BLINKED OUT', 'good'); return; }
    const events = ['A taxi blocks the fast lane. Of course.', 'Construction crew ahead. Shortcut or detour?', 'A window light flickers three floors up.', 'Someone is running. Not your problem. Yet.', 'Rain is getting heavier over Meridian.'];
    radio(choice(events));
  }

  function radio(line) {
    $('radio-line').textContent = line;
    radioTimer = 11;
  }

  function cycleRadio() {
    const lines = heat > 2.5 ? ['Unit 12, suspect heading east.', 'Negative visual. Check the next intersection.', 'Do not let them reach the bridge.', 'All units, hold the perimeter.'] : ['Rain moving in from the east. Keep your headlights on.', 'Traffic is thin in the Old Quarter tonight.', 'City service says the docks are running late.', 'FM 99.6 — the station that never asks questions.'];
    radio(lines[Math.floor(Math.random() * lines.length)]);
    $('radio-source').textContent = heat > 2.5 ? 'POLICE BAND // OPEN CHANNEL' : 'FM 99.6 / CITY SERVICE';
  }

  function notify(text, type = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = text;
    $('toast-stack').appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function getMissionTarget() { if (!mission) return null; return mission.state === 'active' && mission.phase === 'drop' ? mission.destination : mission.start; }

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
    $('heat-stage').textContent = ['COLD', 'SUSPICION', 'SEARCH', 'PURSUIT', 'HEAVY', 'MAXIMUM'][stage];
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
    $('mission-description').textContent = state === 'available' ? `Drive to the ${mission.start.label.toLowerCase()} and press E to take the job.` : state === 'cooldown' ? 'Payment cleared. The next phone is already ringing.' : mission.phase === 'drop' ? `Reach the ${mission.destination.label.toLowerCase()} before the city notices.` : mission.description;
    $('mission-pay').textContent = state === 'cooldown' ? '+ ' + formatMoney(mission.payout) : formatMoney(mission.payout);
    $('mission-risk').textContent = state === 'active' ? `RISK / ${['LOW', 'MED', 'HIGH'][mission.risk - 1]}` : state === 'cooldown' ? 'STATUS / PAID' : 'STATUS / AVAILABLE';
    $('mission-clock').textContent = state === 'active' ? `${String(Math.floor(mission.timer / 60)).padStart(2, '0')}:${String(Math.floor(mission.timer % 60)).padStart(2, '0')}` : runMode === 'endless' ? 'ENDLESS' : 'READY';
    $('mission-kicker-text').textContent = state === 'active' ? (mission.phase === 'drop' ? 'ACTIVE JOB' : 'MOVE') : state === 'cooldown' ? 'JOB COMPLETE' : 'AVAILABLE JOB';
    $('mission-status-dot').style.background = state === 'cooldown' ? 'var(--cyan)' : state === 'active' ? 'var(--red)' : 'var(--acid)';
  }

  function getPrompt() {
    if (player.interior) return 'EXIT BUILDING';
    const p = targetPos();
    if (mission && mission.state === 'available' && dist(p, mission.start) < 90) return 'ACCEPT JOB';
    if (mission && mission.state === 'active' && mission.phase === 'drop' && dist(p, mission.destination) < 90) return 'MAKE THE DROP';
    if (player.onFoot) {
      if (dist(p, playerCar) < 45 && !playerCar.abandoned) return 'ENTER VEHICLE';
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
    ctx.fillStyle = '#09111c'; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    // District blocks / ambient color fields.
    for (const d of DISTRICTS) { ctx.fillStyle = d.color; ctx.fillRect(d.x, d.y, d.w, d.h); }
    drawParks();
    drawRoads();
    drawBuildings();
    drawProps();
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
      ctx.fillStyle = p.kind === 'yard' ? '#152c30' : '#142a28'; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = p.kind === 'yard' ? 'rgba(83,230,222,.16)' : 'rgba(216,255,98,.16)'; ctx.lineWidth = 3; ctx.strokeRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
      const count = Math.floor(p.w * p.h / 28000);
      for (let i = 0; i < count; i++) { const x = p.x + 25 + ((i * 73) % Math.max(30, p.w - 50)); const y = p.y + 30 + ((i * 47) % Math.max(30, p.h - 60)); drawTree(x, y, p.kind === 'yard'); }
    }
    // docks water and hard industrial geometry
    ctx.fillStyle = '#0b2730'; ctx.fillRect(3720, 1940, 480, 1260);
    ctx.strokeStyle = 'rgba(83,230,222,.23)'; ctx.lineWidth = 2;
    for (let y = 2000; y < 3200; y += 34) { ctx.beginPath(); ctx.moveTo(3740, y); ctx.lineTo(4170, y - 14); ctx.stroke(); }
    for (let x = 2820; x < 3700; x += 160) { ctx.fillStyle = '#27333a'; ctx.fillRect(x, 2220 + (x % 3) * 36, 92, 37); ctx.fillStyle = '#b46f52'; ctx.fillRect(x + 9, 2229 + (x % 3) * 36, 74, 5); }
  }

  function drawRoads() {
    for (const x of world.roadsX) {
      ctx.fillStyle = '#141b27'; ctx.fillRect(x - ROAD / 2, 0, ROAD, WORLD_H);
      ctx.fillStyle = 'rgba(83,230,222,.1)'; ctx.fillRect(x - ROAD / 2, 0, 4, WORLD_H); ctx.fillRect(x + ROAD / 2 - 4, 0, 4, WORLD_H);
      ctx.strokeStyle = 'rgba(224,227,200,.26)'; ctx.lineWidth = 3; ctx.setLineDash([32, 28]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const y of world.roadsY) {
      ctx.fillStyle = '#141b27'; ctx.fillRect(0, y - ROAD / 2, WORLD_W, ROAD);
      ctx.fillStyle = 'rgba(83,230,222,.1)'; ctx.fillRect(0, y - ROAD / 2, WORLD_W, 4); ctx.fillRect(0, y + ROAD / 2 - 4, WORLD_W, 4);
      ctx.strokeStyle = 'rgba(224,227,200,.26)'; ctx.lineWidth = 3; ctx.setLineDash([32, 28]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke(); ctx.setLineDash([]);
    }
    // A few deliberate crosswalks make intersections readable.
    for (const x of world.roadsX) for (const y of world.roadsY) {
      ctx.strokeStyle = 'rgba(216,255,98,.22)'; ctx.lineWidth = 4;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 11, y - 42); ctx.lineTo(x + i * 11, y - 22); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + i * 11, y + 22); ctx.lineTo(x + i * 11, y + 42); ctx.stroke(); }
    }
  }

  function drawBuildings() {
    for (const b of world.buildings) {
      const lift = b.z * 8;
      ctx.fillStyle = 'rgba(0,0,0,.36)'; ctx.fillRect(b.x + 18, b.y + 18, b.w, b.h);
      ctx.fillStyle = shade(b.color, -16); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w + lift, b.y + b.h + lift); ctx.lineTo(b.x + lift, b.y + b.h + lift); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(b.color, 9); ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(222,236,208,.14)'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
      // roof texture is deliberately chunky.
      ctx.fillStyle = 'rgba(255,255,255,.035)';
      for (let i = 0; i < Math.min(6, Math.floor(b.w / 28)); i++) ctx.fillRect(b.x + 12 + i * 28, b.y + 12 + ((b.seed * 17) % 18), 13, 4);
      if (b.enterable) { ctx.fillStyle = 'rgba(83,230,222,.18)'; ctx.fillRect(b.x + b.w / 2 - 6, b.y + b.h - 2, 12, 3); }
      if (b.kind === 'hotel' || b.kind === 'office') {
        ctx.fillStyle = 'rgba(216,255,98,.45)';
        for (let y = b.y + 20; y < b.y + b.h - 10; y += 20) for (let x = b.x + 17; x < b.x + b.w - 10; x += 24) if ((Math.floor(x + y + b.seed * 100) % 4) !== 0) ctx.fillRect(x, y, 7, 5);
      }
    }
  }

  function drawProps() {
    for (const l of world.streetLights) {
      ctx.strokeStyle = 'rgba(179,201,183,.28)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(l.x, l.y + 22); ctx.lineTo(l.x, l.y - 19); ctx.lineTo(l.x + 8, l.y - 24); ctx.stroke();
      ctx.fillStyle = `rgba(216,255,98,${.42 + Math.sin(elapsed * 2 + l.phase) * .08})`; ctx.fillRect(l.x + 5, l.y - 28, 9, 5);
    }
    for (const p of world.props) {
      if (p.type === 'window') { ctx.fillStyle = p.seed > .55 ? 'rgba(255,180,92,.38)' : 'rgba(83,230,222,.23)'; ctx.fillRect(p.x, p.y, 7, 4); }
    }
    // hand-painted signs at selected blocks
    const signData = [[1030,574,'NO EXIT','#ff4b61'],[2035,574,'MOTEL','#c775ff'],[2875,1000,'AUTO','#d8ff62'],[1180,1700,'RAMEN','#ffb45c'],[3340,2040,'PIER 09','#53e6de']];
    for (const [x, y, text, color] of signData) { ctx.fillStyle = 'rgba(6,9,15,.8)'; ctx.fillRect(x - 4, y - 18, text.length * 10 + 12, 24); ctx.strokeStyle = color; ctx.strokeRect(x - 4, y - 18, text.length * 10 + 12, 24); ctx.fillStyle = color; ctx.font = '700 10px Space Mono'; ctx.fillText(text, x + 2, y - 2); }
  }

  function drawTree(x, y, industrial) {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 8, 18, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = industrial ? '#33534b' : '#284d48'; ctx.fillRect(x - 3, y - 2, 6, 15);
    ctx.fillStyle = industrial ? '#547052' : '#406b52'; ctx.beginPath(); ctx.arc(x, y - 10, 14, 0, TAU); ctx.fill(); ctx.fillStyle = '#5f8154'; ctx.fillRect(x - 8, y - 17, 10, 6);
  }

  function drawVehicle(v, isPolice) {
    if (v.x < camera.x - 620 || v.x > camera.x + 620 || v.y < camera.y - 420 || v.y > camera.y + 420) return;
    ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.angle);
    const s = v.kind === 'van' ? 1.2 : v.kind === 'sports' ? .88 : 1;
    // low-res contact shadow
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(3, 7, 22 * s, 10 * s, 0, 0, TAU); ctx.fill();
    if (v.skid > .3 && v.isPlayer) { ctx.strokeStyle = 'rgba(8,10,13,.65)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(-40, -7); ctx.moveTo(-10, 7); ctx.lineTo(-40, 7); ctx.stroke(); }
    ctx.fillStyle = shade(v.spec.color, -24); ctx.beginPath(); ctx.roundRect(-21 * s, -10 * s, 42 * s, 20 * s, 4 * s); ctx.fill();
    ctx.fillStyle = v.spec.color; ctx.beginPath(); ctx.roundRect(-19 * s, -9 * s, 38 * s, 17 * s, 3 * s); ctx.fill();
    ctx.fillStyle = v.spec.accent; ctx.beginPath(); ctx.roundRect(-7 * s, -7 * s, 14 * s, 14 * s, 2 * s); ctx.fill();
    ctx.fillStyle = 'rgba(12,23,32,.88)'; ctx.fillRect(-5 * s, -6 * s, 10 * s, 12 * s);
    ctx.fillStyle = '#f4d8a1'; ctx.fillRect(16 * s, -7 * s, 4 * s, 4 * s); ctx.fillRect(16 * s, 3 * s, 4 * s, 4 * s);
    ctx.fillStyle = '#e64b5d'; ctx.fillRect(-20 * s, -7 * s, 3 * s, 4 * s); ctx.fillRect(-20 * s, 3 * s, 3 * s, 4 * s);
    ctx.fillStyle = '#080b11'; ctx.fillRect(-12 * s, -12 * s, 9 * s, 3 * s); ctx.fillRect(4 * s, -12 * s, 9 * s, 3 * s); ctx.fillRect(-12 * s, 9 * s, 9 * s, 3 * s); ctx.fillRect(4 * s, 9 * s, 9 * s, 3 * s);
    if (isPolice) { ctx.fillStyle = '#17212d'; ctx.fillRect(-6, -14, 12, 4); ctx.fillStyle = Math.sin(elapsed * 13 + v.siren) > 0 ? '#ff4b61' : '#53e6de'; ctx.fillRect(-5, -15, 5, 5); ctx.fillStyle = Math.sin(elapsed * 13 + v.siren) > 0 ? '#53e6de' : '#ff4b61'; ctx.fillRect(1, -15, 5, 5); }
    if (v.health < v.spec.durability * .42) { ctx.fillStyle = 'rgba(130,144,147,.35)'; ctx.fillRect(-16, -15, 5, 4); }
    if (v.health < v.spec.durability * .25 && Math.sin(elapsed * 8 + v.x) > -.4) { ctx.fillStyle = 'rgba(175,190,193,.38)'; ctx.beginPath(); ctx.arc(-22, 0, 5 + Math.sin(elapsed * 5) * 2, 0, TAU); ctx.fill(); }
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

  function drawJobMarker() {
    const target = getMissionTarget();
    if (!target || mission.state === 'cooldown') return;
    const pulse = 1 + Math.sin(elapsed * 4) * .15;
    ctx.save(); ctx.translate(target.x, target.y);
    ctx.strokeStyle = mission.state === 'active' ? '#ffb45c' : '#d8ff62'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 28 * pulse, 0, TAU); ctx.stroke();
    ctx.fillStyle = mission.state === 'active' ? 'rgba(255,180,92,.18)' : 'rgba(216,255,98,.14)'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f1f4dd'; ctx.font = '700 11px Space Mono'; ctx.textAlign = 'center'; ctx.fillText(mission.state === 'active' ? 'DROP' : 'JOB', 0, 4); ctx.restore();
  }

  function drawLighting() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const p = player.onFoot ? player : playerCar;
    if (!player.interior && p) drawCone(p.x, p.y, p.angle, 250, 'rgba(221,246,187,.09)');
    for (const c of police) { drawGlow(c.x, c.y, Math.sin(elapsed * 13 + c.siren) > 0 ? '#ff4b61' : '#53e6de', 55, .17); }
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
    ctx.fillStyle = 'rgba(5,8,14,.94)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#172333'; ctx.fillRect(95, 72, 770, 395);
    ctx.fillStyle = '#202c34'; ctx.beginPath(); ctx.moveTo(95,72); ctx.lineTo(480,30); ctx.lineTo(865,72); ctx.lineTo(865,467); ctx.lineTo(95,467); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#29363a'; ctx.fillRect(112, 310, 736, 140);
    ctx.strokeStyle = 'rgba(83,230,222,.23)'; ctx.lineWidth = 2; ctx.strokeRect(95,72,770,395);
    ctx.fillStyle = 'rgba(83,230,222,.12)'; ctx.fillRect(120,100,184,110); ctx.fillStyle = 'rgba(255,75,97,.13)'; ctx.fillRect(316,100,184,110); ctx.fillStyle = 'rgba(216,255,98,.1)'; ctx.fillRect(512,100,184,110);
    ctx.fillStyle = '#e8ad69'; ctx.fillRect(756, 104, 62, 4); ctx.fillStyle = '#d8ff62'; ctx.fillRect(756, 115, 43, 3);
    ctx.fillStyle = '#101a23'; ctx.fillRect(170, 245, 175, 27); ctx.fillStyle = '#4b6a68'; ctx.fillRect(187, 226, 140, 21); ctx.fillStyle = '#0d1720'; ctx.fillRect(205, 231, 103, 11);
    ctx.fillStyle = '#0f1923'; ctx.fillRect(630, 246, 150, 18); ctx.fillStyle = '#d8ff62'; ctx.fillRect(648, 236, 22, 8); ctx.fillStyle = '#ff4b61'; ctx.fillRect(680, 236, 22, 8); ctx.fillStyle = '#53e6de'; ctx.fillRect(712, 236, 22, 8);
    ctx.fillStyle = '#0a0e16'; ctx.fillRect(435, 330, 90, 90); ctx.strokeStyle = 'rgba(216,255,98,.28)'; ctx.strokeRect(435,330,90,90);
    const x = 480 + player.interiorPos.x * 1.8; const y = 340 + player.interiorPos.y * 1.2;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(x, y + 16, 16, 7, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(player.angle); ctx.fillStyle = '#284d52'; ctx.fillRect(-8,-8,16,20); ctx.fillStyle = '#d5a77e'; ctx.fillRect(3,-12,9,9); ctx.fillStyle = '#d8ff62'; ctx.fillRect(6,-12,6,2); ctx.restore();
    ctx.fillStyle = 'rgba(235,242,225,.8)'; ctx.font = '700 12px Space Mono'; ctx.fillText('INTERIOR / LINE OF SIGHT BROKEN', 118, 98);
    ctx.fillStyle = 'rgba(155,174,178,.7)'; ctx.font = '11px Space Mono'; ctx.fillText('E  EXIT TO STREET', 118, 121);
    if (heat > 0) { ctx.fillStyle = `rgba(255,75,97,${.09 + pulse})`; ctx.fillRect(95, 73, 770, 3); }
  }

  function drawRain() {
    ctx.save();
    ctx.lineWidth = 1;
    for (const d of rain) { ctx.strokeStyle = `rgba(123,211,220,${d.alpha})`; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.slant, d.y + d.len); ctx.stroke(); }
    ctx.restore();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 600); g.addColorStop(0, 'rgba(2,5,10,0)'); g.addColorStop(1, 'rgba(2,5,10,.58)'); ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    if (heat >= 3 && Math.sin(elapsed * 11) > .65) { ctx.fillStyle = 'rgba(255,45,71,.055)'; ctx.fillRect(0,0,W,H); }
  }

  function drawMap() {
    if (!world) return;
    const mw = mapCanvas.width, mh = mapCanvas.height;
    mapCtx.clearRect(0,0,mw,mh); mapCtx.fillStyle = '#0c1720'; mapCtx.fillRect(0,0,mw,mh);
    const sx = mw / WORLD_W, sy = mh / WORLD_H;
    for (const p of world.parks) { mapCtx.fillStyle = p.kind === 'yard' ? '#1b3b38' : '#1b4037'; mapCtx.fillRect(p.x*sx,p.y*sy,p.w*sx,p.h*sy); }
    mapCtx.strokeStyle = '#233544'; mapCtx.lineWidth = ROAD*sx;
    for (const x of world.roadsX) { mapCtx.beginPath(); mapCtx.moveTo(x*sx,0); mapCtx.lineTo(x*sx,mh); mapCtx.stroke(); }
    for (const y of world.roadsY) { mapCtx.beginPath(); mapCtx.moveTo(0,y*sy); mapCtx.lineTo(mw,y*sy); mapCtx.stroke(); }
    mapCtx.fillStyle = 'rgba(173,196,187,.22)'; for (const b of world.buildings) mapCtx.fillRect(b.x*sx,b.y*sy,b.w*sx,b.h*sy);
    const target = getMissionTarget(); if (target) { mapCtx.fillStyle = '#d8ff62'; mapCtx.beginPath(); mapCtx.arc(target.x*sx,target.y*sy,4,0,TAU); mapCtx.fill(); }
    for (const c of police) { mapCtx.fillStyle = '#ff4b61'; mapCtx.fillRect(c.x*sx-2,c.y*sy-2,4,4); }
    const p = targetPos(); mapCtx.save(); mapCtx.translate(p.x*sx,p.y*sy); mapCtx.rotate((p.angle || 0)); mapCtx.fillStyle = '#53e6de'; mapCtx.beginPath(); mapCtx.moveTo(6,0); mapCtx.lineTo(-5,-4); mapCtx.lineTo(-5,4); mapCtx.closePath(); mapCtx.fill(); mapCtx.restore();
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
      $('pause-stats').innerHTML = `<div class="pause-stat"><b>${formatMoney(money)}</b><span>CASH</span></div><div class="pause-stat"><b>${missionNumber - 1}</b><span>JOBS</span></div><div class="pause-stat"><b>${Math.ceil(heat)}/5</b><span>HEAT</span></div>`;
    } else { lastTime = performance.now(); requestAnimationFrame(loop); }
  }

  function ensureAudio() { if (!audioContext) { try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (audioContext && audioContext.state === 'suspended') audioContext.resume(); }
  function beep(freq, duration, type) { if (!audioContext) return; const o = audioContext.createOscillator(); const g = audioContext.createGain(); o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(.0001, audioContext.currentTime); g.gain.exponentialRampToValueAtTime(.055, audioContext.currentTime + .012); g.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration); o.connect(g); g.connect(audioContext.destination); o.start(); o.stop(audioContext.currentTime + duration + .02); }

  function setSeed() { const names = ['NIGHT','RAIN','MERCURY','STATIC','AFTERHOURS','NEON']; seedText = `${choice(names)}-${String(10 + Math.floor(Math.random() * 890)).padStart(3,'0')}`; menuSeed.textContent = seedText; }

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
  menuSeed.textContent = seedText;
  ctx.fillStyle = '#090c15'; ctx.fillRect(0,0,W,H);
})();
