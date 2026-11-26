// Playable demos: Mirror Twins and Light Mixer.
(() => {
  const $ = id => document.getElementById(id);

  /* Best scores, kept on the visitor's own device */
  const readBest = key => {
    try { const v = localStorage.getItem('pf-best-' + key); return v === null ? null : Number(v); } catch { return null; }
  };
  const showBest = (key, id) => { const v = readBest(key); $(id).textContent = v === null ? '–' : v; };
  const saveBest = (key, value, id) => {
    const old = readBest(key);
    if (old !== null && value >= old) return;
    try { localStorage.setItem('pf-best-' + key, value); } catch { /* storage can be blocked */ }
    $(id).textContent = value;
  };

  /* Sound: synthesised, and off until the visitor turns it on */
  let audio = null, soundOn = false;
  const TUNES = { tap: [440], good: [523, 784], bad: [196, 147], win: [523, 659, 784, 1047] };
  const sfx = name => {
    if (!soundOn || !audio) return;
    TUNES[name].forEach((pitch, i) => {
      const osc = audio.createOscillator(), gain = audio.createGain(), at = audio.currentTime + i * 0.09;
      osc.type = 'triangle'; osc.frequency.value = pitch;
      gain.gain.setValueAtTime(0.12, at); gain.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
      osc.connect(gain).connect(audio.destination); osc.start(at); osc.stop(at + 0.13);
    });
  };
  $('sound').addEventListener('click', () => {
    soundOn = !soundOn;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (soundOn && !audio && Context) audio = new Context();
    if (soundOn && audio) audio.resume();
    $('sound').textContent = soundOn ? '🔊 Sound on' : '🔇 Sound off';
    $('sound').setAttribute('aria-pressed', soundOn);
    sfx('good');
  });

  /* Tabs */
  const tabs = [...document.querySelectorAll('[role=tab]')];
  function openTab(tab) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => openTab(tab));
    tab.addEventListener('keydown', e => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      openTab(next); next.focus();
    });
  });

  /* Mirror Twins: one control moves both twins; left and right are mirrored */
  (() => {
    const N = 6;
    // par is the fewest moves possible, found by searching every position
    const LEVELS = [
      { walls: [6, 29, 33], a: 24, b: 34, goalA: 31, goalB: 28, par: 6, hint: 'Press right: one twin goes right, its mirror goes left.' },
      { walls: [9, 15, 17, 19, 26, 34], a: 1, b: 29, goalA: 31, goalB: 23, par: 11, hint: 'A wall stops only the twin that hits it. Use that to pull them apart.' },
      { walls: [4, 7, 13, 18, 21, 24, 26, 30], a: 25, b: 15, goalA: 0, goalB: 33, par: 15, hint: 'Plan which twin should wait against a wall.' }
    ];
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const board = $('twins-board');
    let index = 0, level, a, b, moves, history, won;

    const cells = Array.from({ length: N * N }, () => board.appendChild(document.createElement('span')));
    const twinA = board.appendChild(document.createElement('i'));
    const twinB = board.appendChild(document.createElement('i'));
    twinA.className = 'twin a'; twinA.textContent = 'A';
    twinB.className = 'twin b'; twinB.textContent = 'B';

    const slide = (pos, dx, dy) => {
      const x = pos % N + dx, y = Math.floor(pos / N) + dy, to = y * N + x;
      return x < 0 || y < 0 || x >= N || y >= N || level.walls.includes(to) ? pos : to;
    };
    const place = (el, pos) => { el.style.left = (pos % N) * 100 / N + '%'; el.style.top = Math.floor(pos / N) * 100 / N + '%'; };
    const where = pos => 'row ' + (Math.floor(pos / N) + 1) + ' column ' + (pos % N + 1);

    function draw() {
      place(twinA, a); place(twinB, b);
      twinA.classList.toggle('home', a === level.goalA);
      twinB.classList.toggle('home', b === level.goalB);
      $('twins-level').textContent = (index + 1) + ' of ' + LEVELS.length;
      $('twins-moves').textContent = moves;
      $('twins-undo').disabled = won || !history.length;
      board.setAttribute('aria-label', 'Twin A at ' + where(a) + ', home at ' + where(level.goalA) +
        '. Twin B at ' + where(b) + ', home at ' + where(level.goalB) + '. Walls at ' + level.walls.map(where).join(', '));
    }

    function load() {
      level = LEVELS[index]; a = level.a; b = level.b; moves = 0; history = []; won = false;
      cells.forEach((cell, i) => {
        cell.className = level.walls.includes(i) ? 'wall' : i === level.goalA ? 'goal a' : i === level.goalB ? 'goal b' : '';
        cell.textContent = i === level.goalA ? 'A' : i === level.goalB ? 'B' : '';
      });
      $('twins-status').textContent = level.hint;
      $('twins-next').hidden = true;
      showBest('twins-' + index, 'twins-best');
      draw();
    }

    function move(name) {
      if (won) return;
      const [dx, dy] = DIRS[name];
      const nextA = slide(a, dx, dy), nextB = slide(b, -dx, dy);
      if (nextA === a && nextB === b) { sfx('bad'); return; }
      history.push([a, b]);
      a = nextA; b = nextB; moves++;
      won = a === level.goalA && b === level.goalB;
      draw();
      if (!won) return sfx('tap');
      const stars = moves <= level.par ? 3 : moves <= level.par + 4 ? 2 : 1;
      $('twins-status').textContent = 'Both home in ' + moves + ' moves! ' + '⭐'.repeat(stars) + ' Fewest possible: ' + level.par + '.';
      saveBest('twins-' + index, moves, 'twins-best');
      $('twins-next').textContent = index === LEVELS.length - 1 ? 'Play from level 1' : 'Next level →';
      $('twins-next').hidden = false;
      window.burst(board); sfx('win');
    }

    document.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => move(button.dataset.move)));
    $('panel-twins').addEventListener('keydown', e => {
      const name = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
      if (name) { e.preventDefault(); move(name); }
    });
    let start = null;
    board.addEventListener('pointerdown', e => { start = [e.clientX, e.clientY]; board.setPointerCapture(e.pointerId); });
    board.addEventListener('pointerup', e => {
      if (!start) return;
      const dx = e.clientX - start[0], dy = e.clientY - start[1];
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    board.addEventListener('pointercancel', () => { start = null; });
    $('twins-undo').addEventListener('click', () => {
      if (won || !history.length) return;
      [a, b] = history.pop(); moves++; draw(); sfx('tap');
    });
    $('twins-reset').addEventListener('click', load);
    $('twins-next').addEventListener('click', () => { index = (index + 1) % LEVELS.length; load(); board.focus(); });
    load();
  })();

  /* Light Mixer: drag coloured lamps until every spot gets exactly the light it asks for */
  (() => {
    // The stage is 100 by 100 units and each lamp lights a circle of radius 26
    const RADIUS = 26;
    const NAMES = { r: 'red', g: 'green', b: 'blue' };
    const MIXES = { r: ['Red', '#ff4d4d'], g: ['Green', '#3fe05a'], b: ['Blue', '#5b7cff'], rg: ['Yellow', '#ffe94d'], rb: ['Pink', '#ff5cf0'], gb: ['Cyan', '#4df3ff'], rgb: ['White', '#ffffff'], '': ['Keep dark', '#171822'] };
    const LEVELS = [
      { lamps: 'rg', targets: [[51, 50, 'rg'], [22, 50, 'r'], [80, 50, 'g']], hint: 'Red light plus green light makes yellow. Drag the lamps.' },
      { lamps: 'rgb', targets: [[50, 47, 'rgb'], [50, 29, 'rg'], [34, 57, 'rb'], [66, 57, 'gb']], hint: 'All three lights together make white.' },
      { lamps: 'rgb', targets: [[41, 35, 'rg'], [55, 52.5, 'gb'], [52, 86, 'b'], [14, 30, 'r'], [20, 70, ''], [80, 52, '']], hint: 'Some spots must stay dark. Keep every light off them.' }
    ];
    const STARTS = { r: [14, 90], g: [86, 90], b: [50, 12] };
    const stage = $('mix-stage');
    let index = 0, level, lamps, spots, won, dragging = null;

    const clamp = v => Math.max(4, Math.min(96, v));
    const lightAt = (x, y) => [...level.lamps].filter(id => Math.hypot(x - lamps[id].x, y - lamps[id].y) <= RADIUS).join('');

    function update() {
      let correct = 0;
      spots.forEach(({ el, x, y, want }) => {
        const ok = lightAt(x, y) === want;
        if (ok) correct++;
        el.classList.toggle('ok', ok);
        el.querySelector('b').textContent = ok ? '✓' : '';
      });
      [...level.lamps].forEach(id => {
        const lamp = lamps[id];
        [lamp.glow, lamp.handle].forEach(el => { el.style.left = lamp.x + '%'; el.style.top = lamp.y + '%'; });
      });
      $('mix-count').textContent = correct + ' / ' + spots.length;
      return correct === spots.length;
    }

    function finish() {
      if (won || !update()) return;
      won = true; dragging = null;
      $('mix-status').textContent = index === LEVELS.length - 1 ? 'Every level lit! 🎉' : 'Perfect mix! 🎉';
      $('mix-next').textContent = index === LEVELS.length - 1 ? 'Play from level 1' : 'Next level →';
      $('mix-next').hidden = false;
      window.burst(stage); sfx('win');
    }

    function moveLamp(id, x, y) {
      if (won) return;
      const before = $('mix-count').textContent;
      lamps[id].x = clamp(x); lamps[id].y = clamp(y);
      update();
      if (parseInt($('mix-count').textContent, 10) > parseInt(before, 10)) sfx('tap');
    }

    function load() {
      level = LEVELS[index]; won = false; lamps = {}; stage.textContent = '';
      [...level.lamps].forEach(id => {
        const glow = stage.appendChild(document.createElement('span'));
        glow.className = 'glow ' + id;
        const handle = stage.appendChild(document.createElement('button'));
        handle.type = 'button'; handle.className = 'lamp ' + id; handle.dataset.id = id;
        handle.textContent = id.toUpperCase();
        handle.setAttribute('aria-label', NAMES[id] + ' lamp. Move with the arrow keys.');
        lamps[id] = { x: STARTS[id][0], y: STARTS[id][1], glow, handle };
        handle.addEventListener('pointerdown', e => { e.preventDefault(); handle.focus(); dragging = id; });
        handle.addEventListener('keydown', e => {
          const d = { ArrowUp: [0, -2], ArrowDown: [0, 2], ArrowLeft: [-2, 0], ArrowRight: [2, 0] }[e.key];
          if (!d) return;
          e.preventDefault();
          moveLamp(id, lamps[id].x + d[0], lamps[id].y + d[1]);
          finish();
        });
      });
      spots = level.targets.map(([x, y, want]) => {
        const el = stage.appendChild(document.createElement('span'));
        el.className = 'spot' + (want ? '' : ' dark');
        el.style.left = x + '%'; el.style.top = y + '%';
        el.style.setProperty('--want', MIXES[want][1]);
        el.innerHTML = '<b></b><small>' + MIXES[want][0] + '</small>';
        return { el, x, y, want };
      });
      $('mix-level').textContent = (index + 1) + ' of ' + LEVELS.length;
      $('mix-status').textContent = level.hint;
      $('mix-next').hidden = true;
      update();
    }

    addEventListener('pointermove', e => {
      if (!dragging) return;
      const r = stage.getBoundingClientRect();
      moveLamp(dragging, (e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100);
    });
    addEventListener('pointerup', () => { if (dragging) { dragging = null; finish(); } });
    addEventListener('pointercancel', () => { dragging = null; });
    $('mix-reset').addEventListener('click', load);
    $('mix-next').addEventListener('click', () => { index = (index + 1) % LEVELS.length; load(); });
    load();
  })();
})();
