/* IMPOSTOR // task minigames. Each builder renders into a container and
   calls done() when the task is finished. Builders return a cleanup fn. */
(function (global) {
  'use strict';

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function wrap(container) {
    const w = el('div', 'mg');
    const msg = el('div', 'mg-msg', '');
    container.appendChild(w);
    return { w, msg };
  }

  const builders = {};

  /* ---------------- wires ---------------- */
  builders.wires = function (c, done, hint) {
    hint.textContent = 'Click a wire on the left, then its match on the right.';
    const { w, msg } = wrap(c);
    const colors = shuffle(['#ff3b4e', '#39e07a', '#ffd23f', '#2ad1ff']).slice(0, 4);
    const right = shuffle(colors);
    const board = el('div', 'wires');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const L = el('div', 'wire-col');
    const R = el('div', 'wire-col');
    const lefts = [];
    const rights = [];
    colors.forEach((col, i) => {
      const d = el('div', 'wire left unlinked');
      d.style.background = col;
      d.dataset.color = col;
      d.dataset.i = String(i);
      L.appendChild(d); lefts.push(d);
    });
    right.forEach((col, i) => {
      const d = el('div', 'wire right unlinked');
      d.style.background = col;
      d.dataset.color = col;
      d.dataset.i = String(i);
      R.appendChild(d); rights.push(d);
    });
    board.appendChild(svg); board.appendChild(L); board.appendChild(R);
    w.appendChild(board); w.appendChild(msg);

    let sel = null;
    let linked = 0;
    function drawLine(a, b, col) {
      const br = board.getBoundingClientRect();
      const ar = a.getBoundingClientRect();
      const rr = b.getBoundingClientRect();
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(ar.right - br.left));
      line.setAttribute('y1', String(ar.top + ar.height / 2 - br.top));
      line.setAttribute('x2', String(rr.left - br.left));
      line.setAttribute('y2', String(rr.top + rr.height / 2 - br.top));
      line.setAttribute('stroke', col);
      line.setAttribute('stroke-width', '10');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    }
    function onLeft(e) {
      const t = e.currentTarget;
      if (t.classList.contains('linked')) return;
      lefts.forEach((n) => n.classList.remove('sel'));
      t.classList.add('sel');
      sel = t;
    }
    function onRight(e) {
      const t = e.currentTarget;
      if (!sel || t.classList.contains('linked')) return;
      if (t.dataset.color === sel.dataset.color) {
        sel.classList.remove('sel', 'unlinked');
        sel.classList.add('linked');
        t.classList.remove('unlinked');
        t.classList.add('linked');
        drawLine(sel, t, t.dataset.color);
        sel = null;
        linked++;
        msg.className = 'mg-msg ok';
        msg.textContent = linked + ' / 4 CONNECTED';
        if (linked === 4) setTimeout(() => done(true), 420);
      } else {
        msg.className = 'mg-msg err';
        msg.textContent = 'WRONG PAIR';
        sel.classList.remove('sel');
        sel = null;
      }
    }
    lefts.forEach((n) => n.addEventListener('click', onLeft));
    rights.forEach((n) => n.addEventListener('click', onRight));
    return function () {};
  };

  /* ---------------- swipe card ---------------- */
  builders.swipe = function (c, done, hint) {
    hint.textContent = 'Drag the card all the way across — not too fast, not too slow.';
    const { w, msg } = wrap(c);
    const slot = el('div', 'card-slot');
    const card = el('div', 'card', '<span class="stripe"></span><span class="chip"></span>');
    slot.appendChild(card);
    w.appendChild(slot); w.appendChild(msg);
    let dragging = false, startX = 0, startT = 0, x = 8;
    const maxX = 420 - 150 - 70;

    function pos(e) { return e.touches ? e.touches[0].clientX : e.clientX; }
    function down(e) {
      dragging = true; startX = pos(e) - x; startT = performance.now();
      card.style.cursor = 'grabbing'; e.preventDefault();
    }
    function move(e) {
      if (!dragging) return;
      x = Math.max(0, Math.min(maxX + 6, pos(e) - startX));
      card.style.left = x + 'px';
    }
    function up() {
      if (!dragging) return;
      dragging = false;
      card.style.cursor = 'grab';
      const dt = performance.now() - startT;
      if (x >= maxX - 6) {
        if (dt < 300) { msg.className = 'mg-msg err'; msg.textContent = 'TOO FAST — TRY AGAIN'; }
        else if (dt > 1400) { msg.className = 'mg-msg err'; msg.textContent = 'TOO SLOW — TRY AGAIN'; }
        else { msg.className = 'mg-msg ok'; msg.textContent = 'ACCEPTED'; setTimeout(() => done(true), 350); return; }
      } else {
        msg.className = 'mg-msg err'; msg.textContent = 'BAD READ — SWIPE FULLY ACROSS';
      }
      x = 8; card.style.left = '8px';
    }
    card.addEventListener('mousedown', down);
    card.addEventListener('touchstart', down, { passive: false });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return function () {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  };

  /* ---------------- download / upload / scan ---------------- */
  builders.download = function (c, done, hint) {
    hint.textContent = 'Start the transfer and wait for it to finish.';
    const { w, msg } = wrap(c);
    const box = el('div', 'progress-wrap', '<div class="progress"><i></i></div>');
    const fill = box.querySelector('i');
    const btn = el('button', 'mg-btn', 'START TRANSFER');
    w.appendChild(box); w.appendChild(btn); w.appendChild(msg);
    let raf = 0, t0 = 0, running = false;
    const DUR = 3400;
    function step(now) {
      const p = Math.min(1, (now - t0) / DUR);
      fill.style.width = (p * 100) + '%';
      msg.className = 'mg-msg';
      msg.textContent = Math.floor(p * 100) + '%';
      if (p >= 1) { msg.className = 'mg-msg ok'; msg.textContent = 'TRANSFER COMPLETE'; setTimeout(() => done(true), 320); return; }
      raf = requestAnimationFrame(step);
    }
    btn.addEventListener('click', () => {
      if (running) return;
      running = true; btn.disabled = true; t0 = performance.now();
      raf = requestAnimationFrame(step);
    });
    return function () { cancelAnimationFrame(raf); };
  };

  /* ---------------- hold lever (fuel / garbage / coolant) ---------------- */
  builders.hold = function (c, done, hint) {
    hint.textContent = 'Press and hold the lever until the tank is full.';
    const { w, msg } = wrap(c);
    const lever = el('div', 'lever', '<i></i><span>HOLD</span>');
    const fill = lever.querySelector('i');
    w.appendChild(lever); w.appendChild(msg);
    let v = 0, holding = false, last = performance.now(), raf = 0, finished = false;
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      v += holding ? dt * 42 : -dt * 26;
      v = Math.max(0, Math.min(100, v));
      fill.style.height = v + '%';
      if (v >= 100 && !finished) {
        finished = true;
        msg.className = 'mg-msg ok'; msg.textContent = 'FULL';
        setTimeout(() => done(true), 320);
        return;
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    const dn = (e) => { holding = true; e.preventDefault(); };
    const upf = () => { holding = false; };
    lever.addEventListener('mousedown', dn);
    lever.addEventListener('touchstart', dn, { passive: false });
    window.addEventListener('mouseup', upf);
    window.addEventListener('touchend', upf);
    return function () {
      cancelAnimationFrame(raf);
      window.removeEventListener('mouseup', upf);
      window.removeEventListener('touchend', upf);
    };
  };

  /* ---------------- simon (start reactor) ---------------- */
  builders.simon = function (c, done, hint) {
    hint.textContent = 'Watch the sequence, then repeat it.';
    const { w, msg } = wrap(c);
    const grid = el('div', 'pads');
    const pads = [];
    for (let i = 0; i < 9; i++) {
      const p = el('button', 'pad');
      p.dataset.i = String(i);
      grid.appendChild(p); pads.push(p);
    }
    w.appendChild(grid); w.appendChild(msg);
    let round = 1;
    const MAX = 4;
    let seq = [];
    let idx = 0;
    let accepting = false;
    const timers = [];
    function flash(i, cls, ms) {
      pads[i].classList.add(cls);
      timers.push(setTimeout(() => pads[i].classList.remove(cls), ms));
    }
    function playSeq() {
      accepting = false;
      msg.className = 'mg-msg';
      msg.textContent = 'WATCH — ROUND ' + round + ' / ' + MAX;
      seq = [];
      for (let i = 0; i < round + 1; i++) {
        let v = Math.floor(Math.random() * 9);
        while (i > 0 && v === seq[i - 1]) v = Math.floor(Math.random() * 9); // never flash the same pad twice in a row
        seq.push(v);
      }
      seq.forEach((v, k) => {
        timers.push(setTimeout(() => flash(v, 'lit', 380), 450 + k * 560));
      });
      timers.push(setTimeout(() => {
        accepting = true; idx = 0;
        msg.textContent = 'YOUR TURN';
      }, 450 + seq.length * 560));
    }
    function click(e) {
      if (!accepting) return;
      const i = Number(e.currentTarget.dataset.i);
      if (seq[idx] === i) {
        flash(i, 'lit', 200);
        idx++;
        if (idx >= seq.length) {
          accepting = false;
          if (round >= MAX) {
            msg.className = 'mg-msg ok'; msg.textContent = 'REACTOR ONLINE';
            timers.push(setTimeout(() => done(true), 450));
          } else {
            round++;
            msg.className = 'mg-msg ok'; msg.textContent = 'GOOD';
            timers.push(setTimeout(playSeq, 700));
          }
        }
      } else {
        accepting = false;
        flash(i, 'bad', 400);
        msg.className = 'mg-msg err'; msg.textContent = 'WRONG — RESTARTING';
        round = 1;
        timers.push(setTimeout(playSeq, 900));
      }
    }
    pads.forEach((p) => p.addEventListener('click', click));
    playSeq();
    return function () { timers.forEach(clearTimeout); };
  };

  /* ---------------- number order (manifolds / filter / comms) ---------------- */
  builders.order = function (c, done, hint) {
    hint.textContent = 'Click the numbers in ascending order.';
    const { w, msg } = wrap(c);
    const grid = el('div', 'num-grid');
    w.appendChild(grid); w.appendChild(msg);
    const N = 10;
    const spots = [];
    for (let i = 0; i < N; i++) {
      let x, y, ok = false, tries = 0;
      do {
        x = 14 + Math.random() * (460 - 80);
        y = 14 + Math.random() * (260 - 80);
        ok = spots.every((s) => Math.hypot(s.x - x, s.y - y) > 62);
        tries++;
      } while (!ok && tries < 200);
      spots.push({ x, y });
    }
    const order = shuffle(spots.map((_, i) => i + 1));
    const btns = [];
    order.forEach((num, i) => {
      const b = el('button', 'num', String(num));
      b.style.left = spots[i].x + 'px';
      b.style.top = spots[i].y + 'px';
      b.dataset.n = String(num);
      grid.appendChild(b); btns.push(b);
    });
    let next = 1;
    msg.textContent = 'NEXT: 1';
    btns.forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.n);
      if (n === next) {
        b.classList.add('off');
        b.disabled = true;
        next++;
        if (next > N) {
          msg.className = 'mg-msg ok'; msg.textContent = 'SEQUENCE CLEAR';
          setTimeout(() => done(true), 320);
        } else {
          msg.className = 'mg-msg'; msg.textContent = 'NEXT: ' + next;
        }
      } else {
        msg.className = 'mg-msg err'; msg.textContent = 'WRONG — RESET';
        next = 1;
        btns.forEach((q) => { q.classList.remove('off'); q.disabled = false; });
      }
    }));
    return function () {};
  };

  /* ---------------- toggles (shields / power / lights) ---------------- */
  builders.toggles = function (c, done, hint) {
    hint.textContent = 'Flip every switch into the ON position.';
    const { w, msg } = wrap(c);
    const row = el('div', 'toggle-row');
    const n = 6;
    const sw = [];
    for (let i = 0; i < n; i++) {
      const t = el('button', 'toggle', '<i></i>');
      if (Math.random() < 0.25) t.classList.add('on');
      row.appendChild(t); sw.push(t);
    }
    if (sw.every((s) => s.classList.contains('on'))) sw[0].classList.remove('on');
    w.appendChild(row); w.appendChild(msg);
    function check() {
      const on = sw.filter((s) => s.classList.contains('on')).length;
      msg.className = on === n ? 'mg-msg ok' : 'mg-msg';
      msg.textContent = on + ' / ' + n + ' ONLINE';
      if (on === n) setTimeout(() => done(true), 360);
    }
    sw.forEach((s) => s.addEventListener('click', () => { s.classList.toggle('on'); check(); }));
    check();
    return function () {};
  };

  /* ---------------- align sliders (calibrate / steering) ---------------- */
  builders.align = function (c, done, hint) {
    hint.textContent = 'Drag all three knobs into the green band.';
    const { w, msg } = wrap(c);
    const row = el('div', 'sliders');
    const cols = [];
    for (let i = 0; i < 3; i++) {
      const col = el('div', 'slider-col', '<div class="zone"></div>');
      const knob = el('div', 'knob');
      const start = 10 + Math.random() * 70;
      knob.style.top = start + '%';
      col.appendChild(knob);
      row.appendChild(col);
      cols.push({ col, knob });
    }
    w.appendChild(row); w.appendChild(msg);
    let drag = null;
    function clientY(e) { return e.touches ? e.touches[0].clientY : e.clientY; }
    function check() {
      let good = 0;
      cols.forEach((o) => {
        const p = parseFloat(o.knob.style.top);
        const ok = p >= 41 && p <= 53;
        o.knob.classList.toggle('good', ok);
        if (ok) good++;
      });
      msg.className = good === 3 ? 'mg-msg ok' : 'mg-msg';
      msg.textContent = good + ' / 3 ALIGNED';
      if (good === 3) { drag = null; setTimeout(() => done(true), 420); }
    }
    function move(e) {
      if (!drag) return;
      const r = drag.col.getBoundingClientRect();
      let p = ((clientY(e) - r.top - 17) / r.height) * 100;
      p = Math.max(0, Math.min(84, p));
      drag.knob.style.top = p + '%';
      check();
      e.preventDefault();
    }
    cols.forEach((o) => {
      const dn = (e) => { drag = o; o.knob.style.cursor = 'grabbing'; e.preventDefault(); };
      o.knob.addEventListener('mousedown', dn);
      o.knob.addEventListener('touchstart', dn, { passive: false });
    });
    const up = () => { drag = null; };
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    check();
    return function () {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  };

  /* ---------------- asteroids ---------------- */
  builders.asteroids = function (c, done, hint) {
    hint.textContent = 'Click the asteroids. Destroy 12 to clear the lane.';
    const { w, msg } = wrap(c);
    const cv = el('canvas', 'mg-canvas');
    cv.width = 540; cv.height = 300;
    w.appendChild(cv); w.appendChild(msg);
    const g = cv.getContext('2d');
    const rocks = [];
    const shots = [];
    let hits = 0, raf = 0, last = performance.now(), spawn = 0, alive = true;
    function addRock() {
      const edge = Math.random() < 0.5;
      const r = 14 + Math.random() * 14;
      rocks.push({
        x: edge ? -r : cv.width + r,
        y: 30 + Math.random() * (cv.height - 60),
        vx: (edge ? 1 : -1) * (26 + Math.random() * 42),
        vy: (Math.random() - 0.5) * 28,
        r, a: Math.random() * 6.28, s: 0.6 + Math.random()
      });
    }
    for (let i = 0; i < 5; i++) addRock();
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const mx = (e.clientX - r.left) * (cv.width / r.width);
      const my = (e.clientY - r.top) * (cv.height / r.height);
      shots.push({ x: mx, y: my, t: 0 });
      for (let i = rocks.length - 1; i >= 0; i--) {
        if (Math.hypot(rocks[i].x - mx, rocks[i].y - my) < rocks[i].r + 8) {
          rocks.splice(i, 1);
          hits++;
          msg.className = 'mg-msg ok';
          msg.textContent = hits + ' / 12 DESTROYED';
          if (hits >= 12) {
            alive = false;
            msg.textContent = 'LANE CLEAR';
            setTimeout(() => done(true), 320);
          }
          break;
        }
      }
    });
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      spawn -= dt;
      if (spawn <= 0 && rocks.length < 9) { addRock(); spawn = 0.5 + Math.random() * 0.6; }
      g.fillStyle = '#060a16';
      g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = '#ffffff22';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97 + 13) % cv.width;
        const sy = (i * 53 + 29) % cv.height;
        g.fillRect(sx, sy, 2, 2);
      }
      for (let i = rocks.length - 1; i >= 0; i--) {
        const o = rocks[i];
        o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.s * dt;
        if (o.x < -60 || o.x > cv.width + 60 || o.y < -60 || o.y > cv.height + 60) { rocks.splice(i, 1); continue; }
        g.save();
        g.translate(o.x, o.y); g.rotate(o.a);
        g.fillStyle = '#6b7488'; g.strokeStyle = '#99a3bb'; g.lineWidth = 2;
        g.beginPath();
        for (let k = 0; k < 7; k++) {
          const ang = (k / 7) * Math.PI * 2;
          const rr = o.r * (0.78 + ((k * 37) % 10) / 28);
          const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
          if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i]; s.t += dt;
        if (s.t > 0.25) { shots.splice(i, 1); continue; }
        g.strokeStyle = 'rgba(42,209,255,' + (1 - s.t / 0.25) + ')';
        g.lineWidth = 3;
        g.beginPath(); g.arc(s.x, s.y, 6 + s.t * 60, 0, Math.PI * 2); g.stroke();
      }
      if (alive) raf = requestAnimationFrame(loop);
    }
    msg.textContent = '0 / 12 DESTROYED';
    raf = requestAnimationFrame(loop);
    return function () { alive = false; cancelAnimationFrame(raf); };
  };

  global.Minigames = {
    /* returns cleanup() */
    start(type, container, hintEl, onDone) {
      container.innerHTML = '';
      const build = builders[type] || builders.download;
      return build(container, onDone, hintEl);
    },
    types: Object.keys(builders)
  };
})(window);
