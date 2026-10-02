/* IMPOSTOR // Skeldrift Station
   A dependency-free, single-file-per-concern social deduction game.
   map.js  -> geometry + pathfinding, minigames.js -> task minigames, this -> everything else. */
(function () {
  'use strict';

  const M = window.GameMap;
  const MG = window.Minigames;

  /* ============================ constants ============================ */
  const PLAYER_R = 17;
  const SPEED = 218;
  const KILL_RANGE = 92;
  const KILL_COOLDOWN = 24;
  const FIRST_KILL_DELAY = 12;
  const USE_RANGE = 78;
  const REPORT_RANGE = 110;
  const VENT_RANGE = 52;
  const EMERGENCY_RANGE = 96;
  const TASKS_EACH = 6;
  const CRITICAL_TIME = 45;
  const SAB_COOLDOWN = 26;
  const DISCUSS_TIME = 14;
  const VOTE_TIME = 22;

  const PALETTE = [
    { name: 'RED',    hex: '#c51111', dark: '#7a0838' },
    { name: 'BLUE',   hex: '#132ed1', dark: '#09158e' },
    { name: 'GREEN',  hex: '#117f2d', dark: '#0a4d2a' },
    { name: 'PINK',   hex: '#ed54ba', dark: '#ab2bad' },
    { name: 'ORANGE', hex: '#ef7d0d', dark: '#b33e15' },
    { name: 'YELLOW', hex: '#f5f557', dark: '#c38823' },
    { name: 'BLACK',  hex: '#3f474e', dark: '#1e1f26' },
    { name: 'WHITE',  hex: '#d6e0f0', dark: '#8394bf' },
    { name: 'PURPLE', hex: '#6b2fbb', dark: '#3b177c' },
    { name: 'BROWN',  hex: '#71491e', dark: '#5e2615' },
    { name: 'CYAN',   hex: '#38fedc', dark: '#24a8be' },
    { name: 'LIME',   hex: '#50ef39', dark: '#15a742' }
  ];

  /* ============================ dom ============================ */
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const hud = $('hud');
  const taskItems = $('task-items');
  const taskbarFill = $('taskbar-fill');
  const roleChip = $('role-chip');
  const roleChipText = $('role-chip-text');
  const toasts = $('toasts');
  const btnUse = $('btn-use');
  const btnKill = $('btn-kill');
  const btnReport = $('btn-report');
  const btnSab = $('btn-sabotage');
  const btnMap = $('btn-map');
  const killCdEl = $('kill-cd');
  const sabBanner = $('sabotage-banner');
  const sabText = $('sabotage-text');
  const sabTimerEl = $('sabotage-timer');
  const menuScreen = $('menu');
  const revealScreen = $('reveal');
  const taskModal = $('task-modal');
  const taskTitle = $('task-title');
  const taskBody = $('task-body');
  const taskHint = $('task-hint');
  const mapScreen = $('map-screen');
  const mapCanvas = $('map-canvas');
  const mapCtx = mapCanvas.getContext('2d');
  const sabRow = $('sabotage-row');
  const sabCdEl = $('sab-cd');
  const meetingScreen = $('meeting');
  const meetingTitle = $('meeting-title');
  const meetingPhase = $('meeting-phase');
  const meetingTime = $('meeting-time');
  const voteGrid = $('vote-grid');
  const chatLog = $('chat-log');
  const skipBtn = $('skip-vote');
  const voteHint = $('vote-hint');
  const ejectScreen = $('eject');
  const ejectCanvas = $('eject-canvas');
  const ejectCtx = ejectCanvas.getContext('2d');
  const ejectText = $('eject-text');
  const ejectSub = $('eject-sub');
  const overScreen = $('over');
  const overTitle = $('over-title');
  const overSub = $('over-sub');
  const overCrew = $('over-crew');

  /* ============================ state ============================ */
  const S = {
    phase: 'menu',
    rolePick: 'random',
    actors: [],
    player: null,
    bodies: [],
    tasksTotal: 0,
    tasksDone: 0,
    sab: null,          // { type, timer, critical }
    sabCd: 0,
    emergencyUsed: false,
    emergencyCd: 12,
    meeting: null,
    activeTask: null,
    cleanupTask: null,
    time: 0,
    winner: null,
    cam: { x: 0, y: 0 },
    shake: 0,
    useTarget: null,
    killTarget: null,
    reportTarget: null
  };

  /* ============================ audio ============================ */
  let AC = null;
  function ac() {
    if (!AC) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      AC = new C();
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function beep(freq, dur, type, gain, slideTo) {
    const a = ac();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), a.currentTime + dur);
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(gain || 0.14, a.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur + 0.02);
  }
  const SFX = {
    step() { beep(120 + Math.random() * 30, 0.05, 'sine', 0.03); },
    task() { beep(660, 0.1, 'square', 0.1); setTimeout(() => beep(990, 0.16, 'square', 0.1), 110); },
    kill() { beep(220, 0.45, 'sawtooth', 0.25, 48); },
    report() { beep(300, 0.3, 'square', 0.16, 900); setTimeout(() => beep(240, 0.5, 'sawtooth', 0.14, 120), 260); },
    meeting() { beep(880, 0.2, 'square', 0.14); setTimeout(() => beep(660, 0.35, 'square', 0.14), 200); },
    sabotage() { beep(440, 0.5, 'sawtooth', 0.14, 180); },
    vent() { beep(180, 0.2, 'sine', 0.14, 520); },
    eject() { beep(500, 0.9, 'sine', 0.12, 60); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'square', 0.12), i * 150)); },
    lose() { [440, 349, 262].forEach((f, i) => setTimeout(() => beep(f, 0.35, 'sawtooth', 0.12), i * 220)); },
    click() { beep(520, 0.05, 'square', 0.07); }
  };

  /* ============================ helpers ============================ */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function rr(c, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rad, y);
    c.lineTo(x + w - rad, y);
    c.quadraticCurveTo(x + w, y, x + w, y + rad);
    c.lineTo(x + w, y + h - rad);
    c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    c.lineTo(x + rad, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - rad);
    c.lineTo(x, y + rad);
    c.quadraticCurveTo(x, y, x + rad, y);
    c.closePath();
  }
  function toast(text, kind) {
    const n = document.createElement('div');
    n.className = 'toast' + (kind ? ' ' + kind : '');
    n.textContent = text;
    toasts.appendChild(n);
    setTimeout(() => {
      n.style.transition = 'opacity .4s';
      n.style.opacity = '0';
      setTimeout(() => n.remove(), 420);
    }, 2600);
  }
  function crewSVG(hex, dark, size, dead) {
    const s = size || 40;
    return '<svg width="' + s + '" height="' + (s * 1.16) + '" viewBox="0 0 100 116">' +
      (dead ? '' : '<ellipse cx="52" cy="110" rx="30" ry="6" fill="#00000033"/>') +
      '<rect x="4" y="38" width="22" height="44" rx="11" fill="' + dark + '"/>' +
      '<path d="M26 44c0-22 13-36 30-36s30 14 30 36v44c0 10-8 18-18 18H44c-10 0-18-8-18-18z" fill="' + hex + '"/>' +
      '<rect x="34" y="96" width="18" height="18" rx="6" fill="' + dark + '"/>' +
      '<rect x="58" y="96" width="18" height="18" rx="6" fill="' + dark + '"/>' +
      '<path d="M52 26c17 0 28 8 28 18s-11 14-28 14-24-6-24-14 7-18 24-18z" fill="#9ad7e8"/>' +
      '<path d="M58 30c10 0 16 4 16 8s-6 6-14 6-12-2-12-6 2-8 10-8z" fill="#cdeef7"/>' +
      '</svg>';
  }

  /* ============================ round setup ============================ */
  function makeActor(idx, pal, isPlayer) {
    return {
      id: idx,
      name: pal.name,
      color: pal.hex,
      dark: pal.dark,
      x: M.SPAWN.x + Math.cos((idx / 9) * Math.PI * 2) * 95,
      y: M.SPAWN.y + Math.sin((idx / 9) * Math.PI * 2) * 95,
      r: PLAYER_R,
      facing: 1,
      walk: 0,
      moving: false,
      alive: true,
      isPlayer: !!isPlayer,
      impostor: false,
      tasks: [],
      path: [],
      goal: null,
      goalKind: 'task',
      workTimer: 0,
      thinkTimer: 0,
      stuck: 0,
      lastX: 0,
      lastY: 0,
      killCd: FIRST_KILL_DELAY,
      ghost: false,
      inVent: -1,
      suspicion: {},
      sawKill: null,
      alibi: 'Cafeteria',
      ejected: false
    };
  }

  function startRound() {
    const pals = shuffle(PALETTE).slice(0, 9);
    S.actors = pals.map((p, i) => makeActor(i, p, false));
    S.bodies = [];
    S.sab = null;
    S.sabCd = 18;
    S.emergencyUsed = false;
    S.emergencyCd = 10;
    S.meeting = null;
    S.winner = null;
    S.time = 0;
    S.shake = 0;

    // roles
    const order = shuffle(S.actors.slice());
    const impostors = [order[0], order[1]];
    impostors.forEach((a) => { a.impostor = true; });

    // the human
    let me;
    if (S.rolePick === 'impostor') me = impostors[0];
    else if (S.rolePick === 'crew') me = order.find((a) => !a.impostor);
    else me = order[Math.floor(Math.random() * order.length)];
    me.isPlayer = true;
    S.player = me;

    // spawn positions around the cafeteria table
    S.actors.forEach((a, i) => {
      const ang = (i / S.actors.length) * Math.PI * 2;
      const p = M.clampToWalkable(M.SPAWN.x + Math.cos(ang) * 110, M.SPAWN.y + Math.sin(ang) * 95, PLAYER_R);
      a.x = p.x; a.y = p.y; a.lastX = p.x; a.lastY = p.y;
      a.killCd = FIRST_KILL_DELAY;
      a.suspicion = {};
    });

    // tasks
    S.tasksTotal = 0;
    S.tasksDone = 0;
    S.actors.forEach((a) => {
      const list = shuffle(M.TASKS).slice(0, TASKS_EACH);
      a.tasks = list.map((t) => ({ ref: t, done: false }));
      if (!a.impostor) S.tasksTotal += TASKS_EACH;
    });

    S.cam.x = S.player.x;
    S.cam.y = S.player.y;

    renderTaskList();
    updateTaskbar();
    roleChip.classList.toggle('imp', S.player.impostor);
    roleChipText.textContent = S.player.impostor ? 'IMPOSTOR · ' + S.player.name : 'CREWMATE · ' + S.player.name;
    btnKill.hidden = !S.player.impostor;
    btnSab.hidden = !S.player.impostor;
    sabRow.hidden = !S.player.impostor;

    showReveal();
  }

  function showReveal() {
    setPhase('reveal');
    const imp = S.player.impostor;
    const roleEl = $('reveal-role');
    roleEl.textContent = imp ? 'IMPOSTOR' : 'CREWMATE';
    roleEl.classList.toggle('imp', imp);
    $('reveal-sub').textContent = imp
      ? 'Sabotage the station and eliminate the crew. Do not get caught.'
      : 'Finish your tasks and find the impostors before they finish you.';
    const crew = $('reveal-crew');
    crew.innerHTML = '';
    S.actors.forEach((a) => {
      const d = document.createElement('div');
      d.className = 'mini' + (imp && a.impostor ? ' imp' : '');
      d.innerHTML = crewSVG(a.color, a.dark, 44);
      d.title = a.name + (a.isPlayer ? ' (you)' : '');
      crew.appendChild(d);
    });
    hud.hidden = true;
  }

  /* ============================ phases ============================ */
  function setPhase(p) {
    S.phase = p;
    menuScreen.hidden = p !== 'menu';
    menuScreen.classList.toggle('active', p === 'menu');
    revealScreen.hidden = p !== 'reveal';
    revealScreen.classList.toggle('active', p === 'reveal');
    taskModal.hidden = p !== 'task';
    taskModal.classList.toggle('active', p === 'task');
    mapScreen.hidden = p !== 'map';
    mapScreen.classList.toggle('active', p === 'map');
    meetingScreen.hidden = p !== 'meeting';
    meetingScreen.classList.toggle('active', p === 'meeting');
    ejectScreen.hidden = p !== 'eject';
    ejectScreen.classList.toggle('active', p === 'eject');
    overScreen.hidden = p !== 'over';
    overScreen.classList.toggle('active', p === 'over');
    hud.hidden = !(p === 'play' || p === 'task' || p === 'map');
  }

  /* ============================ input ============================ */
  const keys = Object.create(null);
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['tab', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) e.preventDefault();
    if (keys[k]) return;
    keys[k] = true;
    if (S.phase === 'play') {
      if (k === 'e') doUse();
      else if (k === 'q') doKill();
      else if (k === 'r') doReport();
      else if (k === 'f' && S.player.impostor) openMap();
      else if (k === 'tab') openMap();
      else if (k === ' ' && S.player.inVent >= 0) ventHop();
    } else if (S.phase === 'task') {
      if (k === 'escape') closeTask();
    } else if (S.phase === 'map') {
      if (k === 'escape' || k === 'tab' || k === 'f') closeMap();
    } else if (S.phase === 'reveal') {
      if (k === 'enter' || k === ' ') beginPlay();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  /* virtual thumb-stick for touch devices */
  const stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
  function touchPos(t) { return { x: t.clientX, y: t.clientY }; }
  canvas.addEventListener('touchstart', (e) => {
    if (S.phase !== 'play' || stick.active) return;
    const t = e.changedTouches[0];
    const p = touchPos(t);
    stick.active = true; stick.id = t.identifier;
    stick.ox = p.x; stick.oy = p.y; stick.x = p.x; stick.y = p.y;
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    if (!stick.active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== stick.id) continue;
      const p = touchPos(t);
      stick.x = p.x; stick.y = p.y;
    }
    e.preventDefault();
  }, { passive: false });
  function endTouch(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === stick.id) { stick.active = false; stick.id = null; }
    }
  }
  canvas.addEventListener('touchend', endTouch);
  canvas.addEventListener('touchcancel', endTouch);

  function axis() {
    if (stick.active) {
      const dx = stick.x - stick.ox, dy = stick.y - stick.oy;
      const m = Math.hypot(dx, dy);
      if (m > 8) {
        const k = Math.min(1, m / 60) / m;
        return { x: dx * k, y: dy * k };
      }
      return { x: 0, y: 0 };
    }
    let x = 0, y = 0;
    if (keys['a'] || keys['arrowleft']) x -= 1;
    if (keys['d'] || keys['arrowright']) x += 1;
    if (keys['w'] || keys['arrowup']) y -= 1;
    if (keys['s'] || keys['arrowdown']) y += 1;
    const m = Math.hypot(x, y);
    if (m > 0) { x /= m; y /= m; }
    return { x, y };
  }

  /* ============================ movement ============================ */
  function tryMove(a, dx, dy) {
    if (dx !== 0 && M.canStand(a.x + dx, a.y, a.r)) a.x += dx;
    if (dy !== 0 && M.canStand(a.x, a.y + dy, a.r)) a.y += dy;
  }
  function followPath(a, dt, speed) {
    if (!a.path.length) return false;
    const wp = a.path[0];
    const dx = wp.x - a.x, dy = wp.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 12) { a.path.shift(); return a.path.length > 0; }
    const vx = (dx / d) * speed, vy = (dy / d) * speed;
    tryMove(a, vx * dt, vy * dt);
    if (vx < -4) a.facing = -1; else if (vx > 4) a.facing = 1;
    a.walk += dt * 9;
    a.moving = true;
    return true;
  }
  function goTo(a, x, y) {
    const p = M.clampToWalkable(x, y, a.r);
    a.path = M.findPath(a.x, a.y, p.x, p.y);
    a.goal = { x: p.x, y: p.y };
  }

  /* ============================ visibility ============================ */
  function visionRadius(a) {
    const lightsOut = S.sab && S.sab.type === 'lights';
    if (a.impostor) return lightsOut ? 380 : 440;
    return lightsOut ? 135 : 320;
  }
  function canSee(a, b) {
    const d = dist(a, b);
    if (d > visionRadius(a)) return false;
    return M.lineOfSight(a.x, a.y, b.x, b.y);
  }

  /* ============================ AI ============================ */
  function aliveCrew() { return S.actors.filter((a) => a.alive && !a.impostor); }
  function aliveImpostors() { return S.actors.filter((a) => a.alive && a.impostor); }

  function nextTaskFor(a) {
    const left = a.tasks.filter((t) => !t.done);
    if (!left.length) return null;
    // closest remaining task keeps the AI looking purposeful
    left.sort((p, q) => Math.hypot(p.ref.x - a.x, p.ref.y - a.y) - Math.hypot(q.ref.x - a.x, q.ref.y - a.y));
    return left[Math.random() < 0.65 ? 0 : Math.floor(Math.random() * left.length)];
  }

  function aiThink(a) {
    a.moving = false;
    // critical sabotage: crew (and non-killing impostors) respond
    if (S.sab && S.sab.critical && !a.impostor) {
      const fp = M.FIX_POINTS[S.sab.type];
      a.goalKind = 'fix';
      a.fixType = S.sab.type;
      goTo(a, fp.x, fp.y);
      return;
    }
    if (S.sab && S.sab.type === 'lights' && !a.impostor && Math.random() < 0.35) {
      const fp = M.FIX_POINTS.lights;
      a.goalKind = 'fix';
      a.fixType = 'lights';
      goTo(a, fp.x, fp.y);
      return;
    }
    if (a.impostor) {
      // hunt an isolated crewmate
      const prey = aliveCrew()
        .map((c) => ({ c, d: Math.hypot(c.x - a.x, c.y - a.y) }))
        .sort((p, q) => p.d - q.d)[0];
      if (prey && a.killCd <= 0 && prey.d < 720) {
        a.goalKind = 'hunt';
        a.huntId = prey.c.id;
        goTo(a, prey.c.x, prey.c.y);
        return;
      }
    }
    const t = nextTaskFor(a);
    a.goalKind = 'task';
    if (t) { a.activeTask = t; goTo(a, t.ref.x, t.ref.y); }
    else { const p = M.randomWalkable(); a.activeTask = null; goTo(a, p.x, p.y); }
  }

  function aiUpdate(a, dt) {
    if (!a.alive) return;
    a.killCd = Math.max(0, a.killCd - dt);
    a.moving = false;

    if (a.workTimer > 0) {
      a.workTimer -= dt;
      if (a.workTimer <= 0) {
        if (a.goalKind === 'fix') {
          const fp = S.sab && M.FIX_POINTS[S.sab.type];
          if (S.sab && a.fixType === S.sab.type && Math.hypot(fp.x - a.x, fp.y - a.y) < 100) fixSabotage(a);
        } else if (a.goalKind === 'task' && a.activeTask && !a.activeTask.done) {
          a.activeTask.done = true;
          if (!a.impostor) { S.tasksDone++; updateTaskbar(); checkWin(); }
        }
        a.activeTask = null;
        a.thinkTimer = 0;
      }
      return;
    }

    // report a body if one is in plain sight
    if (!a.impostor) {
      for (let i = 0; i < S.bodies.length; i++) {
        const b = S.bodies[i];
        if (!b.reported && Math.hypot(b.x - a.x, b.y - a.y) < 130 && M.lineOfSight(a.x, a.y, b.x, b.y)) {
          callMeeting(a, b);
          return;
        }
      }
    }

    // impostor kill attempt
    if (a.impostor && a.killCd <= 0) {
      const targets = aliveCrew();
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        if (Math.hypot(t.x - a.x, t.y - a.y) < KILL_RANGE && M.lineOfSight(a.x, a.y, t.x, t.y)) {
          if (isolated(a, t)) { performKill(a, t); return; }
        }
      }
    }

    a.thinkTimer -= dt;
    if (!a.path.length || a.thinkTimer <= 0) {
      if (!a.path.length) {
        // arrived
        if (a.goalKind === 'task' && a.activeTask) { a.workTimer = rnd(4.5, 9); a.moving = false; return; }
        if (a.goalKind === 'fix') {
          const near = S.sab && Math.hypot(M.FIX_POINTS[S.sab.type].x - a.x, M.FIX_POINTS[S.sab.type].y - a.y) < 90;
          if (near) { a.workTimer = rnd(2.5, 4); return; }
        }
      }
      aiThink(a);
      a.thinkTimer = a.goalKind === 'hunt' ? rnd(0.5, 1.1) : rnd(2.5, 5);
    }

    const speed = SPEED * (a.impostor && a.goalKind === 'hunt' ? 1.02 : 0.94);
    followPath(a, dt, speed);

    // stuck detection
    if (Math.hypot(a.x - a.lastX, a.y - a.lastY) < 2) {
      a.stuck += dt;
      if (a.stuck > 1.1) { a.stuck = 0; a.path = []; aiThink(a); }
    } else { a.stuck = 0; }
    a.lastX = a.x; a.lastY = a.y;
    a.alibi = M.roomAt(a.x, a.y);
  }

  function isolated(killer, victim) {
    for (let i = 0; i < S.actors.length; i++) {
      const o = S.actors[i];
      if (!o.alive || o === killer || o === victim || o.impostor) continue;
      if (Math.hypot(o.x - killer.x, o.y - killer.y) < 330 && M.lineOfSight(o.x, o.y, killer.x, killer.y)) return false;
    }
    return true;
  }

  /* ============================ kills & bodies ============================ */
  function performKill(killer, victim) {
    victim.alive = false;
    victim.path = [];
    killer.killCd = KILL_COOLDOWN;
    killer.x = victim.x + rnd(-6, 6);
    killer.y = victim.y + rnd(-6, 6);
    S.bodies.push({
      x: victim.x, y: victim.y, color: victim.color, dark: victim.dark,
      name: victim.name, reported: false, room: M.roomAt(victim.x, victim.y), killer: killer.name
    });
    if (!victim.impostor && !victim.isPlayer) {
      // remove that crewmate's unfinished tasks from the goal so crew can still win
      const left = victim.tasks.filter((t) => !t.done).length;
      S.tasksTotal -= left;
      updateTaskbar();
    }
    SFX.kill();
    S.shake = 10;

    // witnesses
    S.actors.forEach((w) => {
      if (!w.alive || w === killer || w === victim) return;
      const d = Math.hypot(w.x - killer.x, w.y - killer.y);
      if (d < visionRadius(w) + 40 && M.lineOfSight(w.x, w.y, killer.x, killer.y)) {
        if (w.isPlayer) toast('You saw ' + killer.name + ' kill ' + victim.name + '!', 'bad');
        else { w.sawKill = { killer: killer.name, victim: victim.name, room: M.roomAt(killer.x, killer.y) }; w.suspicion[killer.name] = (w.suspicion[killer.name] || 0) + 100; }
      }
    });

    if (victim.isPlayer) { becomeGhost('You were murdered by ' + killer.name + '. Finish your tasks as a ghost.'); }
    if (killer.isPlayer) toast('You eliminated ' + victim.name + '.', 'bad');
    checkWin();

    // AI impostors sometimes duck into a vent after a kill
    if (!killer.isPlayer && Math.random() < 0.45) {
      const near = M.VENTS.map((v, i) => ({ v, i, d: Math.hypot(v.x - killer.x, v.y - killer.y) }))
        .sort((p, q) => p.d - q.d)[0];
      if (near && near.d < 420) {
        const group = M.VENTS.filter((v, i) => v.g === near.v.g && i !== near.i);
        if (group.length) {
          const dest = pick(group);
          const p = M.clampToWalkable(dest.x, dest.y, killer.r);
          killer.x = p.x; killer.y = p.y; killer.path = [];
        }
      }
    }
  }

  function becomeGhost(msg) {
    const p = S.player;
    p.alive = false;
    p.ghost = true;
    p.inVent = -1;
    btnKill.hidden = true;
    btnSab.hidden = true;
    sabRow.hidden = true;
    roleChip.classList.add('imp');
    roleChipText.textContent = 'GHOST · ' + p.name;
    toast(msg, 'bad');
    SFX.lose();
  }

  function doKill() {
    if (!S.player.impostor || !S.player.alive || S.player.killCd > 0 || S.player.inVent >= 0) return;
    const t = S.killTarget;
    if (!t) return;
    performKill(S.player, t);
  }

  function doReport() {
    if (!S.player.alive) return;
    const b = S.reportTarget;
    if (!b) return;
    callMeeting(S.player, b);
  }

  /* ============================ use / interactions ============================ */
  function nearestVent(a) {
    let best = -1, bd = 1e9;
    M.VENTS.forEach((v, i) => {
      const d = Math.hypot(v.x - a.x, v.y - a.y);
      if (d < bd) { bd = d; best = i; }
    });
    return { index: best, d: bd };
  }

  function computeTargets() {
    const p = S.player;
    S.useTarget = null;
    S.killTarget = null;
    S.reportTarget = null;
    if (!p.alive && !p.ghost) return;
    if (p.ghost) {
      let gd = USE_RANGE, g = null;
      p.tasks.forEach((t) => {
        if (t.done) return;
        const d = Math.hypot(t.ref.x - p.x, t.ref.y - p.y);
        if (d < gd) { gd = d; g = t; }
      });
      if (g) S.useTarget = { kind: 'task', label: g.ref.name, task: g };
      return;
    }

    if (p.inVent >= 0) {
      S.useTarget = { kind: 'ventExit', label: 'EXIT VENT' };
      return;
    }

    // bodies
    let bd = REPORT_RANGE;
    S.bodies.forEach((b) => {
      if (b.reported) return;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < bd) { bd = d; S.reportTarget = b; }
    });

    // kill target
    if (p.impostor && p.killCd <= 0) {
      let kd = KILL_RANGE;
      S.actors.forEach((a) => {
        if (!a.alive || a.impostor || a === p) return;
        const d = dist(a, p);
        if (d < kd && M.lineOfSight(p.x, p.y, a.x, a.y)) { kd = d; S.killTarget = a; }
      });
    }

    // sabotage fix station
    if (S.sab) {
      const fp = M.FIX_POINTS[S.sab.type];
      if (Math.hypot(fp.x - p.x, fp.y - p.y) < USE_RANGE + 18) {
        S.useTarget = { kind: 'fix', label: fp.name, fix: fp };
        return;
      }
    }

    // own task
    let td = USE_RANGE, found = null;
    p.tasks.forEach((t) => {
      if (t.done) return;
      const d = Math.hypot(t.ref.x - p.x, t.ref.y - p.y);
      if (d < td) { td = d; found = t; }
    });
    if (found) { S.useTarget = { kind: 'task', label: found.ref.name, task: found }; return; }

    // vent
    if (p.impostor) {
      const nv = nearestVent(p);
      if (nv.d < VENT_RANGE) { S.useTarget = { kind: 'vent', label: 'ENTER VENT', vent: nv.index }; return; }
    }

    // emergency button
    const ed = Math.hypot(M.EMERGENCY.x - p.x, M.EMERGENCY.y - p.y);
    if (ed < EMERGENCY_RANGE) {
      S.useTarget = { kind: 'emergency', label: S.emergencyUsed ? 'BUTTON USED' : 'EMERGENCY MEETING', disabled: S.emergencyUsed || S.emergencyCd > 0 };
    }
  }

  function doUse() {
    const t = S.useTarget;
    if (!t) return;
    SFX.click();
    if (t.kind === 'task') openTask(t.task.ref, (ok) => {
      if (!ok) return;
      if (S.player.impostor) { t.task.done = true; renderTaskList(); toast('Faked ' + t.task.ref.name + '.', ''); return; }
      if (!t.task.done) {
        t.task.done = true;
        S.tasksDone++;
        SFX.task();
        renderTaskList();
        updateTaskbar();
        toast(t.task.ref.name + ' complete', 'good');
        checkWin();
      }
    });
    else if (t.kind === 'fix') openTask({ name: t.fix.name, game: t.fix.game }, (ok) => {
      if (ok && S.sab) { fixSabotage(S.player); }
    });
    else if (t.kind === 'vent') {
      S.player.inVent = t.vent;
      const v = M.VENTS[t.vent];
      S.player.x = v.x; S.player.y = v.y;
      SFX.vent();
      toast('In vent — SPACE to travel, E to climb out.', '');
    } else if (t.kind === 'ventExit') {
      const v = M.VENTS[S.player.inVent];
      const p = M.clampToWalkable(v.x, v.y + 24, S.player.r);
      S.player.x = p.x; S.player.y = p.y;
      S.player.inVent = -1;
      SFX.vent();
    } else if (t.kind === 'emergency') {
      if (S.emergencyUsed || S.emergencyCd > 0) { toast('The button is locked.', 'bad'); return; }
      S.emergencyUsed = true;
      callMeeting(S.player, null);
    }
  }

  function ventHop() {
    const cur = S.player.inVent;
    if (cur < 0) return;
    const group = [];
    M.VENTS.forEach((v, i) => { if (v.g === M.VENTS[cur].g) group.push(i); });
    if (group.length < 2) return;
    const nextIdx = group[(group.indexOf(cur) + 1) % group.length];
    S.player.inVent = nextIdx;
    S.player.x = M.VENTS[nextIdx].x;
    S.player.y = M.VENTS[nextIdx].y;
    S.cam.x = S.player.x; S.cam.y = S.player.y;
    SFX.vent();
    toast('Vented to ' + M.VENTS[nextIdx].room, '');
  }

  /* ============================ tasks UI ============================ */
  function renderTaskList() {
    taskItems.innerHTML = '';
    const fake = S.player.impostor;
    S.player.tasks.forEach((t) => {
      const li = document.createElement('li');
      li.className = (t.done ? 'done ' : '') + (fake ? 'fake' : '');
      li.innerHTML = t.ref.name + ' <span>' + t.ref.room + '</span>';
      taskItems.appendChild(li);
    });
    if (fake) {
      const li = document.createElement('li');
      li.className = 'fake';
      li.innerHTML = '<span>(fake tasks — blend in)</span>';
      taskItems.appendChild(li);
    }
  }
  function updateTaskbar() {
    const pct = S.tasksTotal > 0 ? Math.max(0, Math.min(100, (S.tasksDone / S.tasksTotal) * 100)) : 0;
    taskbarFill.style.width = pct + '%';
  }

  function openTask(ref, cb) {
    S.activeTask = { ref, cb };
    taskTitle.textContent = ref.name.toUpperCase() + (ref.room ? ' // ' + ref.room.toUpperCase() : '');
    taskHint.textContent = '';
    setPhase('task');
    S.cleanupTask = MG.start(ref.game, taskBody, taskHint, (ok) => {
      const fn = S.activeTask && S.activeTask.cb;
      closeTask();
      if (fn) fn(ok);
    });
  }
  function closeTask() {
    if (S.cleanupTask) { try { S.cleanupTask(); } catch (e) { /* ignore */ } S.cleanupTask = null; }
    S.activeTask = null;
    taskBody.innerHTML = '';
    if (S.phase === 'task') setPhase('play');
  }
  $('task-close').addEventListener('click', closeTask);

  /* ============================ sabotage ============================ */
  function startSabotage(type) {
    if (S.sab || S.sabCd > 0) return;
    const critical = type === 'o2' || type === 'reactor';
    S.sab = { type, timer: critical ? CRITICAL_TIME : 0, critical };
    S.sabCd = SAB_COOLDOWN;
    SFX.sabotage();
    const labels = {
      lights: 'LIGHTS SABOTAGED', comms: 'COMMS DISABLED',
      o2: 'OXYGEN DEPLETING', reactor: 'REACTOR MELTDOWN'
    };
    sabText.textContent = labels[type];
    sabBanner.hidden = false;
    toast(labels[type] + ' — fix in ' + M.FIX_POINTS[type].room, 'bad');
    // every AI recalculates
    S.actors.forEach((a) => { if (!a.isPlayer) { a.path = []; a.thinkTimer = 0; a.workTimer = 0; } });
  }
  function fixSabotage(by) {
    if (!S.sab) return;
    const t = S.sab.type;
    S.sab = null;
    sabBanner.hidden = true;
    toast((t === 'lights' ? 'Lights' : t === 'comms' ? 'Comms' : t === 'o2' ? 'Oxygen' : 'Reactor') +
      ' restored by ' + (by.isPlayer ? 'you' : by.name) + '.', 'good');
    SFX.task();
    S.actors.forEach((a) => { if (!a.isPlayer) { a.path = []; a.thinkTimer = 0; a.workTimer = 0; } });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.sab-btn'), (b) => {
    b.addEventListener('click', () => {
      if (!S.player.impostor) return;
      if (S.sab || S.sabCd > 0) return;
      startSabotage(b.dataset.sab);
      closeMap();
    });
  });

  /* ============================ meetings ============================ */
  const SMALL_TALK = [
    'where?', 'I was doing wires', 'I just came from {room}', 'anyone with {name}?',
    'that is sus', 'I was in {room} the whole time', '{name} was with me', 'no clue, skip?',
    'medbay scan vouches me', 'I saw nothing', 'reactor was empty', 'who was in {room}?'
  ];

  function callMeeting(caller, body) {
    if (S.phase === 'meeting' || S.winner) return;
    if (S.phase === 'task') closeTask();
    if (S.phase === 'map') closeMap();
    if (body) body.reported = true;
    S.bodies = [];
    SFX.report();
    setTimeout(() => SFX.meeting(), 400);

    const alive = S.actors.filter((a) => a.alive);
    S.meeting = {
      caller, body,
      phase: 'discuss',
      t: DISCUSS_TIME,
      votes: {},        // voterName -> targetName|'skip'
      playerVoted: false,
      chat: [],
      pending: []
    };

    meetingTitle.textContent = body ? 'DEAD BODY REPORTED' : 'EMERGENCY MEETING';
    chatLog.innerHTML = '';
    addChat(null, body
      ? (caller.isPlayer ? 'You' : caller.name) + ' reported ' + body.name + '\u2019s body in ' + body.room + '.'
      : (caller.isPlayer ? 'You' : caller.name) + ' called an emergency meeting.', true);

    // queue AI chatter
    let delay = 1.2;
    const speakers = shuffle(alive.filter((a) => !a.isPlayer));
    speakers.slice(0, 6).forEach((sp) => {
      let line;
      if (sp.sawKill && Math.random() < 0.92) {
        line = 'it was ' + sp.sawKill.killer + '. I watched them do it in ' + sp.sawKill.room + '.';
      } else if (sp.impostor && Math.random() < 0.55) {
        const scape = pick(alive.filter((a) => a !== sp)) || sp;
        line = pick(['{name} was acting weird', 'I was in {room} alone, sorry', 'kinda sus of {name}'])
          .replace('{name}', scape.name).replace('{room}', sp.alibi);
      } else {
        const other = pick(alive.filter((a) => a !== sp)) || sp;
        line = pick(SMALL_TALK).replace('{room}', sp.alibi).replace('{name}', other.isPlayer ? 'you' : other.name);
      }
      S.meeting.pending.push({ t: delay, who: sp, line });
      delay += rnd(1.2, 2.4);
    });

    // a witness names the killer out loud — the rest of the crew can bandwagon
    const witness = alive.find((a) => !a.isPlayer && a.sawKill && S.actors.some((q) => q.name === a.sawKill.killer && q.alive));
    S.meeting.accused = witness ? witness.sawKill.killer : null;

    buildVoteGrid();
    meetingPhase.textContent = 'DISCUSS';
    voteHint.textContent = 'Discussion — voting opens soon.';
    skipBtn.disabled = true;
    setPhase('meeting');
  }

  function addChat(who, line, sys) {
    const p = document.createElement('p');
    if (sys) { p.className = 'sys'; p.textContent = line; }
    else p.innerHTML = '<b style="color:' + who.color + '">' + (who.isPlayer ? 'YOU' : who.name) + ':</b> ' + line;
    chatLog.appendChild(p);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function buildVoteGrid() {
    voteGrid.innerHTML = '';
    S.actors.forEach((a) => {
      const card = document.createElement('div');
      card.className = 'vote-card' + (a.alive ? '' : ' dead');
      card.dataset.name = a.name;
      card.innerHTML = crewSVG(a.color, a.dark, 34) +
        '<div><div class="nm" style="color:' + a.color + '">' + a.name + (a.isPlayer ? ' (you)' : '') + '</div>' +
        '<div class="st">' + (a.alive ? (a.ejected ? 'EJECTED' : 'ALIVE') : 'DEAD') + '</div></div>' +
        '<div class="votes"></div>';
      if (a.alive) {
        card.addEventListener('click', () => castPlayerVote(a.name, card));
      }
      voteGrid.appendChild(card);
    });
  }

  function castPlayerVote(target, card) {
    const m = S.meeting;
    if (!m || m.phase !== 'vote' || m.playerVoted || !S.player.alive) return;
    m.votes[S.player.name] = target;
    m.playerVoted = true;
    SFX.click();
    if (card) card.classList.add('picked');
    skipBtn.disabled = true;
    voteHint.textContent = 'Vote locked: ' + (target === 'skip' ? 'SKIP' : target);
    paintVotes();
  }
  skipBtn.addEventListener('click', () => castPlayerVote('skip', null));

  function paintVotes() {
    const m = S.meeting;
    if (!m) return;
    Array.prototype.forEach.call(voteGrid.children, (card) => {
      const box = card.querySelector('.votes');
      box.innerHTML = '';
      Object.keys(m.votes).forEach((voter) => {
        if (m.votes[voter] === card.dataset.name) {
          const a = S.actors.find((q) => q.name === voter);
          const i = document.createElement('i');
          i.style.background = a ? a.color : '#888';
          box.appendChild(i);
        }
      });
    });
    const skipped = Object.keys(m.votes).filter((v) => m.votes[v] === 'skip').length;
    skipBtn.textContent = skipped ? 'SKIP VOTE (' + skipped + ')' : 'SKIP VOTE';
  }

  function aiVote(a) {
    const m = S.meeting;
    if (!m || m.votes[a.name]) return;
    const alive = S.actors.filter((q) => q.alive && q !== a);
    let target = 'skip';
    if (a.impostor) {
      const crew = alive.filter((q) => !q.impostor);
      if (crew.length) {
        // frame whoever already has heat, otherwise random
        crew.sort((p, q) => votesAgainst(q.name) - votesAgainst(p.name));
        target = (votesAgainst(crew[0].name) > 0 || Math.random() < 0.7) ? crew[0].name : pick(crew).name;
      }
    } else if (a.sawKill && S.actors.some((q) => q.name === a.sawKill.killer && q.alive)) {
      target = a.sawKill.killer;
    } else if (m.accused && Math.random() < 0.7 && m.accused !== a.name) {
      target = m.accused;
    } else {
      // follow the loudest accusation, else mostly skip
      const accused = Object.keys(m.votes).map((k) => m.votes[k]).filter((v) => v !== 'skip' && v !== a.name);
      if (accused.length && Math.random() < 0.5) target = pick(accused);
      else if (Math.random() < 0.4) target = pick(alive).name;
      else target = 'skip';
    }
    m.votes[a.name] = target;
    paintVotes();
  }
  function votesAgainst(name) {
    const m = S.meeting;
    let n = 0;
    Object.keys(m.votes).forEach((k) => { if (m.votes[k] === name) n++; });
    return n;
  }

  function updateMeeting(dt) {
    const m = S.meeting;
    if (!m) return;
    m.t -= dt;
    meetingTime.textContent = Math.max(0, Math.ceil(m.t));

    // chatter
    for (let i = m.pending.length - 1; i >= 0; i--) {
      m.pending[i].t -= dt;
      if (m.pending[i].t <= 0) {
        addChat(m.pending[i].who, m.pending[i].line, false);
        m.pending.splice(i, 1);
      }
    }

    if (m.phase === 'discuss') {
      if (m.t <= 0) {
        m.phase = 'vote';
        m.t = VOTE_TIME;
        meetingPhase.textContent = 'VOTE';
        voteHint.textContent = S.player.alive ? 'Click a crewmate to vote, or skip.' : 'You are dead — spectating.';
        skipBtn.disabled = !S.player.alive;
        addChat(null, 'Voting is open.', true);
        // schedule AI votes
        m.aiQueue = shuffle(S.actors.filter((a) => a.alive && !a.isPlayer))
          .map((a, i) => ({ a, t: 2 + i * rnd(1.4, 2.6) }));
      }
    } else if (m.phase === 'vote') {
      if (m.aiQueue) {
        m.aiQueue.forEach((q) => {
          if (q.t > 0) {
            q.t -= dt;
            if (q.t <= 0) aiVote(q.a);
          }
        });
      }
      const aliveCount = S.actors.filter((a) => a.alive).length;
      const allVoted = Object.keys(m.votes).length >= aliveCount;
      if (m.t <= 0 || allVoted) { resolveVote(); }
    }
  }

  function resolveVote() {
    const m = S.meeting;
    const tally = {};
    Object.keys(m.votes).forEach((v) => {
      const t = m.votes[v];
      tally[t] = (tally[t] || 0) + 1;
    });
    let top = null, topN = 0, tie = false;
    Object.keys(tally).forEach((k) => {
      if (tally[k] > topN) { top = k; topN = tally[k]; tie = false; }
      else if (tally[k] === topN) tie = true;
    });
    S.meeting = null;
    const skipped = !top || top === 'skip' || tie || topN === 0;
    if (skipped) {
      showEject(null, tie && top !== 'skip' ? 'No one was ejected. (Tie)' : 'No one was ejected. (Skipped)');
    } else {
      const victim = S.actors.find((a) => a.name === top);
      if (!victim) { showEject(null, 'No one was ejected.'); return; }
      victim.alive = false;
      victim.ejected = true;
      if (!victim.impostor && !victim.isPlayer) {
        const left = victim.tasks.filter((t) => !t.done).length;
        S.tasksTotal -= left;
        updateTaskbar();
      }
      const remaining = aliveImpostors().length;
      const line = victim.name + ' was ' + (victim.impostor ? '' : 'not ') + 'an Impostor.';
      const sub = remaining === 0 ? 'No Impostors remain.' : remaining + ' Impostor' + (remaining > 1 ? 's' : '') + ' remain' + (remaining > 1 ? '' : 's') + '.';
      showEject(victim, line, sub);
    }
  }

  /* ============================ eject cutscene ============================ */
  let ejectAnim = null;
  function showEject(victim, line, sub) {
    setPhase('eject');
    SFX.eject();
    ejectText.textContent = line;
    ejectSub.textContent = sub || '';
    const start = performance.now();
    const dur = 3600;
    if (ejectAnim) cancelAnimationFrame(ejectAnim);
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const c = ejectCtx;
      c.clearRect(0, 0, ejectCanvas.width, ejectCanvas.height);
      // stars
      c.fillStyle = '#ffffff33';
      for (let i = 0; i < 70; i++) {
        const sx = (i * 137 + ((now / 24) % ejectCanvas.width)) % ejectCanvas.width;
        const sy = (i * 83) % ejectCanvas.height;
        c.fillRect(sx, sy, 2, 2);
      }
      if (victim) {
        const x = -80 + p * (ejectCanvas.width + 160);
        const y = ejectCanvas.height / 2 + Math.sin(p * 6) * 26;
        c.save();
        c.translate(x, y);
        c.rotate(p * 7);
        drawCrew(c, 0, 0, 46, victim.color, victim.dark, 1, 0, false);
        c.restore();
      } else {
        c.fillStyle = '#8ea0c0';
        c.font = '600 22px Verdana, sans-serif';
        c.textAlign = 'center';
        c.fillText('. . .', ejectCanvas.width / 2, ejectCanvas.height / 2);
      }
      if (p < 1) ejectAnim = requestAnimationFrame(frame);
      else afterEject();
    }
    ejectAnim = requestAnimationFrame(frame);
  }

  function afterEject() {
    if (checkWin()) return;
    if (S.player.ejected && !S.player.ghost) becomeGhost('You were ejected into the void. Spectate as a ghost.');
    // reset positions to cafeteria
    S.actors.forEach((a, i) => {
      if (!a.alive && !a.ghost) return;
      const ang = (i / S.actors.length) * Math.PI * 2;
      const p = M.clampToWalkable(M.SPAWN.x + Math.cos(ang) * 110, M.SPAWN.y + Math.sin(ang) * 95, a.r);
      a.x = p.x; a.y = p.y; a.path = []; a.thinkTimer = 0; a.workTimer = 0;
      a.killCd = Math.max(a.killCd, 14);
      a.sawKill = null;
      a.inVent = -1;
    });
    S.bodies = [];
    if (S.sab) { S.sab = null; sabBanner.hidden = true; }
    S.sabCd = Math.max(S.sabCd, 12);
    S.emergencyCd = 15;
    S.cam.x = S.player.x; S.cam.y = S.player.y;
    setPhase('play');
  }

  /* ============================ win / lose ============================ */
  function checkWin() {
    if (S.winner) return true;
    const imps = aliveImpostors().length;
    const crew = aliveCrew().length;
    if (imps === 0) { endRound('crew', 'All impostors were ejected.'); return true; }
    if (imps >= crew) { endRound('impostor', 'The impostors outnumber the crew.'); return true; }
    if (S.tasksTotal > 0 && S.tasksDone >= S.tasksTotal) { endRound('crew', 'The crew finished every task.'); return true; }
    return false;
  }

  function endRound(winner, reason) {
    if (S.winner) return;
    S.winner = winner;
    const playerWon = (winner === 'impostor') === S.player.impostor;
    overTitle.textContent = winner === 'impostor' ? 'IMPOSTORS WIN' : 'CREWMATES WIN';
    overTitle.classList.toggle('imp', winner === 'impostor');
    overSub.textContent = reason + '  ' + (playerWon ? 'VICTORY — you win.' : 'DEFEAT — better luck next round.');
    overCrew.innerHTML = '';
    S.actors.forEach((a) => {
      const d = document.createElement('div');
      d.className = 'slot' + (a.impostor ? ' imp' : '') + (a.alive ? '' : ' gone');
      d.innerHTML = crewSVG(a.color, a.dark, 46, !a.alive) + '<div>' + a.name + (a.impostor ? ' ✖' : '') + '</div>';
      overCrew.appendChild(d);
    });
    if (playerWon) SFX.win(); else SFX.lose();
    setTimeout(() => setPhase('over'), 500);
  }

  /* ============================ map overlay ============================ */
  function openMap() {
    if (S.phase !== 'play') return;
    setPhase('map');
    drawMap();
  }
  function closeMap() { if (S.phase === 'map') setPhase('play'); }
  $('map-close').addEventListener('click', closeMap);
  btnMap.addEventListener('click', () => (S.phase === 'map' ? closeMap() : openMap()));

  function drawMap() {
    const c = mapCtx;
    const W = mapCanvas.width, H = mapCanvas.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#060a14';
    c.fillRect(0, 0, W, H);
    const pad = 20;
    const sc = Math.min((W - pad * 2) / M.WORLD.w, (H - pad * 2) / M.WORLD.h);
    const ox = (W - M.WORLD.w * sc) / 2;
    const oy = (H - M.WORLD.h * sc) / 2;
    const X = (x) => ox + x * sc;
    const Y = (y) => oy + y * sc;

    M.RECTS.forEach((r) => {
      c.fillStyle = r.room ? '#1b2847' : '#141d33';
      c.strokeStyle = '#33496f';
      c.lineWidth = 2;
      c.fillRect(X(r.x), Y(r.y), r.w * sc, r.h * sc);
    });
    M.ROOMS.forEach((r) => {
      c.strokeStyle = '#3e5a8c';
      c.strokeRect(X(r.x), Y(r.y), r.w * sc, r.h * sc);
      c.fillStyle = '#7f93b8';
      c.font = '600 11px Verdana, sans-serif';
      c.textAlign = 'center';
      c.fillText(r.name.toUpperCase(), X(r.x + r.w / 2), Y(r.y + r.h / 2) + 4);
    });
    // player's tasks
    if (!(S.sab && S.sab.type === 'comms')) {
      S.player.tasks.forEach((t) => {
        if (t.done) return;
        c.fillStyle = '#ffd23f';
        c.beginPath();
        c.arc(X(t.ref.x), Y(t.ref.y), 6, 0, Math.PI * 2);
        c.fill();
      });
    }
    if (S.player.impostor) {
      M.VENTS.forEach((v) => {
        c.fillStyle = '#b05bff';
        c.fillRect(X(v.x) - 4, Y(v.y) - 4, 8, 8);
      });
    }
    if (S.sab) {
      const fp = M.FIX_POINTS[S.sab.type];
      c.strokeStyle = '#ff3b4e';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(X(fp.x), Y(fp.y), 12, 0, Math.PI * 2);
      c.stroke();
    }
    // self
    c.fillStyle = S.player.color;
    c.strokeStyle = '#fff';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(X(S.player.x), Y(S.player.y), 8, 0, Math.PI * 2);
    c.fill(); c.stroke();
  }

  /* ============================ drawing the world ============================ */
  function drawCrew(c, x, y, r, color, dark, facing, walk, dead) {
    c.save();
    c.translate(x, y);
    if (dead) {
      c.rotate(Math.PI / 2);
      c.globalAlpha = 1;
    }
    c.scale(facing, 1);
    const bob = dead ? 0 : Math.sin(walk) * 2;
    // shadow
    if (!dead) {
      c.fillStyle = 'rgba(0,0,0,.35)';
      c.beginPath();
      c.ellipse(0, r * 0.95, r * 0.8, r * 0.26, 0, 0, Math.PI * 2);
      c.fill();
    }
    // backpack
    c.fillStyle = dark;
    rr(c, -r * 1.02, -r * 0.5 + bob, r * 0.5, r * 1.0, r * 0.22);
    c.fill();
    // legs
    const legSwing = dead ? 0 : Math.sin(walk) * r * 0.16;
    c.fillStyle = dark;
    rr(c, -r * 0.5 + legSwing, r * 0.55, r * 0.42, r * 0.42, r * 0.14); c.fill();
    rr(c, r * 0.08 - legSwing, r * 0.55, r * 0.42, r * 0.42, r * 0.14); c.fill();
    // body
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(-r * 0.62, r * 0.6 + bob);
    c.lineTo(-r * 0.62, -r * 0.25 + bob);
    c.quadraticCurveTo(-r * 0.62, -r * 1.15 + bob, 0, -r * 1.15 + bob);
    c.quadraticCurveTo(r * 0.68, -r * 1.15 + bob, r * 0.68, -r * 0.25 + bob);
    c.lineTo(r * 0.68, r * 0.6 + bob);
    c.quadraticCurveTo(r * 0.68, r * 0.78 + bob, r * 0.4, r * 0.78 + bob);
    c.lineTo(-r * 0.34, r * 0.78 + bob);
    c.quadraticCurveTo(-r * 0.62, r * 0.78 + bob, -r * 0.62, r * 0.6 + bob);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,.35)';
    c.lineWidth = 2;
    c.stroke();
    // visor
    c.fillStyle = '#9ad7e8';
    c.beginPath();
    c.ellipse(r * 0.2, -r * 0.6 + bob, r * 0.46, r * 0.3, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)';
    c.lineWidth = 1.5;
    c.stroke();
    c.fillStyle = '#d7f1fa';
    c.beginPath();
    c.ellipse(r * 0.34, -r * 0.68 + bob, r * 0.18, r * 0.11, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawWorld(dt) {
    const w = canvas.width / DPR, h = canvas.height / DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, w, h);

    // camera
    const focus = S.player;
    S.cam.x += (focus.x - S.cam.x) * Math.min(1, dt * 7);
    S.cam.y += (focus.y - S.cam.y) * Math.min(1, dt * 7);
    let camX = S.cam.x, camY = S.cam.y;
    const halfW = w / 2, halfH = h / 2;
    if (M.WORLD.w > w) camX = Math.max(halfW - 60, Math.min(M.WORLD.w - halfW + 60, camX));
    else camX = M.WORLD.w / 2;
    if (M.WORLD.h > h) camY = Math.max(halfH - 60, Math.min(M.WORLD.h - halfH + 60, camY));
    else camY = M.WORLD.h / 2;
    let sx = 0, sy = 0;
    if (S.shake > 0) {
      sx = rnd(-S.shake, S.shake);
      sy = rnd(-S.shake, S.shake);
      S.shake = Math.max(0, S.shake - dt * 24);
    }
    ctx.save();
    ctx.translate(halfW - camX + sx, halfH - camY + sy);

    // walls (inflated silhouette) then floor
    ctx.fillStyle = '#131b30';
    M.RECTS.forEach((r) => { ctx.fillRect(r.x - 16, r.y - 16, r.w + 32, r.h + 32); });
    ctx.fillStyle = '#1d2744';
    M.RECTS.forEach((r) => { ctx.fillRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16); });
    M.RECTS.forEach((r) => {
      ctx.fillStyle = r.room ? '#39456b' : '#2e395c';
      ctx.fillRect(r.x, r.y, r.w, r.h);
    });
    // floor grid
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= M.WORLD.w; gx += 60) { ctx.moveTo(gx, 0); ctx.lineTo(gx, M.WORLD.h); }
    for (let gy = 0; gy <= M.WORLD.h; gy += 60) { ctx.moveTo(0, gy); ctx.lineTo(M.WORLD.w, gy); }
    ctx.stroke();

    // room names
    ctx.textAlign = 'center';
    M.ROOMS.forEach((r) => {
      ctx.fillStyle = 'rgba(190,210,255,.14)';
      ctx.font = '800 26px Verdana, sans-serif';
      ctx.fillText(r.name.toUpperCase(), r.x + r.w / 2, r.y + r.h / 2 + 8);
    });

    // emergency button table
    ctx.save();
    ctx.translate(M.EMERGENCY.x, M.EMERGENCY.y);
    ctx.fillStyle = '#2a3658';
    ctx.beginPath(); ctx.ellipse(0, 10, 86, 54, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#44538a';
    ctx.beginPath(); ctx.ellipse(0, 0, 86, 54, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c51111';
    ctx.beginPath(); ctx.arc(0, -4, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff6b78'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();

    // vents
    M.VENTS.forEach((v, i) => {
      const imp = S.player.impostor;
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.fillStyle = imp ? '#4a2a6b' : '#2b3550';
      rr(ctx, -18, -14, 36, 28, 5); ctx.fill();
      ctx.strokeStyle = imp ? '#b05bff' : '#49567d';
      ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = imp ? '#d9b3ff' : '#5d6c96';
      ctx.lineWidth = 2;
      for (let k = -8; k <= 8; k += 8) {
        ctx.beginPath(); ctx.moveTo(-12, k); ctx.lineTo(12, k); ctx.stroke();
      }
      ctx.restore();
    });

    // task consoles
    M.TASKS.forEach((t) => {
      const mine = S.player.tasks.find((q) => q.ref.id === t.id);
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.fillStyle = '#202b4a';
      rr(ctx, -20, -22, 40, 36, 6); ctx.fill();
      ctx.strokeStyle = '#3f538a';
      ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = mine && !mine.done ? '#ffd23f' : '#5a79b5';
      rr(ctx, -13, -16, 26, 17, 3); ctx.fill();
      if (mine && !mine.done) {
        const pulse = 1 + Math.sin(S.time * 4) * 0.12;
        ctx.save();
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.moveTo(0, -56); ctx.lineTo(12, -40); ctx.lineTo(-12, -40);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#40320a';
        ctx.fillRect(-2, -52, 4, 7);
        ctx.fillRect(-2, -44, 4, 3);
        ctx.restore();
      }
      ctx.restore();
    });

    // sabotage fix marker
    if (S.sab) {
      const fp = M.FIX_POINTS[S.sab.type];
      ctx.save();
      ctx.translate(fp.x, fp.y);
      const pulse = 1 + Math.sin(S.time * 7) * 0.16;
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = '#ff3b4e';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ff3b4e';
      ctx.font = '800 22px Verdana, sans-serif';
      ctx.fillText('!', 0, 8);
      ctx.restore();
    }

    // bodies
    S.bodies.forEach((b) => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = 'rgba(140,10,20,.6)';
      ctx.beginPath(); ctx.ellipse(0, 10, 34, 18, 0, 0, Math.PI * 2); ctx.fill();
      drawCrew(ctx, 0, 0, 17, b.color, b.dark, 1, 0, true);
      // bone
      ctx.fillStyle = '#e9eef7';
      ctx.fillRect(10, -16, 4, 14);
      ctx.beginPath(); ctx.arc(12, -18, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // actors
    const vis = visionRadius(S.player);
    S.actors.forEach((a) => {
      if (!a.alive && !(a.isPlayer && a.ghost)) return;
      if (a.inVent >= 0 && !a.isPlayer) return;
      if (!a.isPlayer && !S.player.ghost) {
        const d = dist(a, S.player);
        if (d > vis + 30) return;
        if (!M.lineOfSight(a.x, a.y, S.player.x, S.player.y)) return;
      }
      if (a.isPlayer && a.ghost) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        drawCrew(ctx, a.x, a.y, a.r, a.color, a.dark, a.facing, a.walk, false);
        ctx.restore();
        ctx.font = '700 13px Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9fb4dd';
        ctx.fillText('GHOST', a.x, a.y - a.r * 1.7);
        return;
      }
      if (a.isPlayer && a.inVent >= 0) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        drawCrew(ctx, a.x, a.y - 6, a.r * 0.7, a.color, a.dark, a.facing, a.walk, false);
        ctx.restore();
      } else {
        drawCrew(ctx, a.x, a.y, a.r, a.color, a.dark, a.facing, a.walk, false);
      }
      // name tag
      ctx.font = '700 13px Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.fillStyle = a.isPlayer ? '#ffffff' : (S.player.impostor && a.impostor ? '#ff6b78' : '#dbe6ff');
      const tag = a.name + (a.isPlayer ? '' : '');
      ctx.strokeText(tag, a.x, a.y - a.r * 1.7);
      ctx.fillText(tag, a.x, a.y - a.r * 1.7);
      if (a !== S.player && a.workTimer > 0) {
        ctx.fillStyle = '#ffd23f';
        ctx.font = '700 12px Verdana, sans-serif';
        ctx.fillText('working…', a.x, a.y - a.r * 1.7 - 15);
      }
    });

    ctx.restore();

    // vision mask
    const px = halfW - camX + sx + S.player.x;
    const py = halfH - camY + sy + S.player.y;
    if (!S.player.ghost) {
      const grd = ctx.createRadialGradient(px, py, Math.max(10, vis * 0.45), px, py, vis * 1.45);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(0.55, 'rgba(0,0,0,.25)');
      grd.addColorStop(1, S.sab && S.sab.type === 'lights' ? 'rgba(0,0,0,.985)' : 'rgba(0,0,0,.93)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      if (S.sab && S.sab.type === 'lights') {
        ctx.fillStyle = 'rgba(10,0,14,.25)';
        ctx.fillRect(0, 0, w, h);
      }
    }

    if (stick.active) {
      const dx = stick.x - stick.ox, dy = stick.y - stick.oy;
      const m = Math.hypot(dx, dy);
      const k = m > 60 ? 60 / m : 1;
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 62, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); ctx.arc(stick.ox + dx * k, stick.oy + dy * k, 26, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ============================ hud update ============================ */
  function updateHud() {
    const p = S.player;
    // comms sabotage blacks out the task list and the task bar
    const commsOut = !!(S.sab && S.sab.type === 'comms');
    taskItems.style.visibility = commsOut ? 'hidden' : 'visible';
    taskbarFill.parentElement.style.opacity = commsOut ? '0.15' : '1';
    if (p.ghost) {
      btnReport.classList.add('dim');
      btnUse.classList.toggle('ready', !!S.useTarget);
      btnUse.classList.toggle('dim', !S.useTarget);
      btnUse.querySelector('span').textContent = 'USE';
      return;
    }
    const t = S.useTarget;
    btnUse.classList.toggle('dim', !t || t.disabled);
    btnUse.classList.toggle('ready', !!t && !t.disabled);
    btnUse.querySelector('span').textContent = t ? (t.kind === 'task' ? 'USE' : t.kind === 'fix' ? 'FIX' : t.kind === 'vent' ? 'VENT' : t.kind === 'ventExit' ? 'OUT' : 'MEET') : 'USE';
    btnUse.title = t ? t.label : 'Nothing in range';
    btnReport.classList.toggle('dim', !S.reportTarget);
    if (p.impostor) {
      btnKill.classList.toggle('dim', !S.killTarget || p.killCd > 0);
      killCdEl.textContent = p.killCd > 0 ? Math.ceil(p.killCd) + 's' : '';
      btnSab.classList.toggle('dim', !!S.sab || S.sabCd > 0);
    }
    if (S.sab) {
      if (S.sab.critical) {
        const m = Math.floor(S.sab.timer / 60);
        const s = Math.floor(S.sab.timer % 60);
        sabTimerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
      } else sabTimerEl.textContent = '';
    }
    const sabReady = !S.sab && S.sabCd <= 0;
    Array.prototype.forEach.call(document.querySelectorAll('.sab-btn'), (b) => { b.disabled = !sabReady; });
    sabCdEl.textContent = sabReady ? 'READY' : (S.sab ? 'SABOTAGE ACTIVE' : 'COOLDOWN ' + Math.ceil(S.sabCd) + 's');
  }

  /* ============================ main loop ============================ */
  let DPR = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * DPR);
    canvas.height = Math.floor(window.innerHeight * DPR);
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  let stepTimer = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (S.phase === 'play') {
      S.time += dt;
      const p = S.player;
      // player movement
      if (p.alive || p.ghost) {
        const a = axis();
        const spd = p.inVent >= 0 ? 0 : (p.ghost ? SPEED * 1.25 : SPEED);
        if ((a.x || a.y) && spd > 0) {
          if (p.ghost) {
            p.x = Math.max(20, Math.min(M.WORLD.w - 20, p.x + a.x * spd * dt));
            p.y = Math.max(20, Math.min(M.WORLD.h - 20, p.y + a.y * spd * dt));
          } else tryMove(p, a.x * spd * dt, a.y * spd * dt);
          if (a.x < -0.1) p.facing = -1; else if (a.x > 0.1) p.facing = 1;
          p.walk += dt * 10;
          p.moving = true;
          stepTimer -= dt;
          if (stepTimer <= 0) { if (!p.ghost) SFX.step(); stepTimer = 0.32; }
        } else { p.moving = false; }
        p.killCd = Math.max(0, p.killCd - dt);
      }
      S.sabCd = Math.max(0, S.sabCd - dt);
      S.emergencyCd = Math.max(0, S.emergencyCd - dt);

      // AI
      S.actors.forEach((a) => { if (!a.isPlayer) aiUpdate(a, dt); });

      // AI impostor sabotage
      if (!S.sab && S.sabCd <= 0 && !S.player.impostor) {
        if (Math.random() < dt * 0.05) {
          startSabotage(pick(['lights', 'lights', 'comms', 'reactor', 'o2']));
        }
      }

      // sabotage timers
      if (S.sab && S.sab.critical) {
        S.sab.timer -= dt;
        if (S.sab.timer <= 0) {
          endRound('impostor', S.sab.type === 'o2' ? 'Oxygen ran out.' : 'The reactor melted down.');
        }
      }

      computeTargets();
      updateHud();
      checkWin();
    } else if (S.phase === 'meeting') {
      updateMeeting(dt);
    }

    if (S.phase === 'play' || S.phase === 'task' || S.phase === 'map') {
      drawWorld(S.phase === 'play' ? dt : 0);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ============================ buttons / menu ============================ */
  btnUse.addEventListener('click', doUse);
  btnKill.addEventListener('click', doKill);
  btnReport.addEventListener('click', doReport);
  btnSab.addEventListener('click', openMap);

  Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), (b) => {
    b.addEventListener('click', () => {
      Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), (q) => q.classList.remove('active'));
      b.classList.add('active');
      S.rolePick = b.dataset.role;
      SFX.click();
    });
  });
  $('start-btn').addEventListener('click', () => { ac(); startRound(); });
  $('reveal-btn').addEventListener('click', beginPlay);
  $('again-btn').addEventListener('click', () => { setPhase('menu'); });

  function beginPlay() {
    setPhase('play');
    hud.hidden = false;
    last = performance.now();
    if (S.player.impostor) toast('Kill cooldown starts at ' + FIRST_KILL_DELAY + 's.', 'bad');
    else toast('Find a task console marked with a yellow arrow.', '');
  }

  window.__IMPOSTOR = S;
  setPhase('menu');
})();
