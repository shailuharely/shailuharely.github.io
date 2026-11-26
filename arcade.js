// Playable demos: tabs, Colour Sort, Connect Fuel, Melon Shot.
// (Category Match lives in main.js.)
(() => {
  const $ = id => document.getElementById(id);
  const random = n => Math.floor(Math.random() * n);
  const SHAPES = ['●', '▲', '■', '★'];
  const NAMES = ['coral circle', 'blue triangle', 'lime square', 'purple star'];

  /* Best scores, kept on the visitor's own device */
  const readBest = key => {
    try { const v = localStorage.getItem('pf-best-' + key); return v === null ? null : Number(v); } catch { return null; }
  };
  const showBest = (key, id) => { const v = readBest(key); $(id).textContent = v === null ? '–' : v; };
  window.saveBest = (key, value, lowerWins, id) => {
    const old = readBest(key);
    if (old !== null && (lowerWins ? value >= old : value <= old)) return;
    try { localStorage.setItem('pf-best-' + key, value); } catch { /* storage can be blocked */ }
    $(id).textContent = value;
  };
  showBest('connect', 'con-best'); showBest('archery', 'arc-best'); showBest('category', 'cat-best');

  /* Sound: synthesised, and off until the visitor turns it on */
  let audio = null, soundOn = false;
  const TUNES = { tap: [440], good: [523, 784], bad: [196, 147], win: [523, 659, 784, 1047] };
  window.sfx = name => {
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
    window.sfx('good');
  });

  /* Tabs */
  const tabs = [...document.querySelectorAll('[role=tab]')];
  let stopArchery = () => {};
  function openTab(tab) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (tab.id !== 'tab-archery') stopArchery();
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
  document.querySelectorAll('[data-demo]').forEach(link =>
    link.addEventListener('click', () => openTab($('tab-' + link.dataset.demo))));

  /* Colour Sort */
  (() => {
    const SIZE = 4;
    let tubes, picked, moves, won, history, buttons, level = 1;
    const solved = state => state.every(t => !t.length || (t.length === SIZE && t.every(b => b === t[0])));
    const canMove = (state, a, b) => a !== b && state[a].length > 0 && state[b].length < SIZE &&
      (!state[b].length || state[b][state[b].length - 1] === state[a][state[a].length - 1]);

    // Search every line of play so that only winnable puzzles are dealt
    function solvable(start) {
      const seen = new Set();
      const stack = [start];
      while (stack.length && seen.size < 150000) {
        const state = stack.pop();
        if (solved(state)) return true;
        for (let a = 0; a < state.length; a++) for (let b = 0; b < state.length; b++) {
          if (!canMove(state, a, b)) continue;
          const next = state.map(t => t.slice());
          next[b].push(next[a].pop());
          const key = next.map(t => t.join('')).sort().join('|');
          if (!seen.has(key)) { seen.add(key); stack.push(next); }
        }
      }
      return false;
    }

    function deal() {
      let state;
      do {
        // Level 1 has three colours; later levels have four
        const colours = level === 1 ? 3 : 4;
        const balls = Array.from({ length: colours }, (_, c) => Array(SIZE).fill(c)).flat();
        for (let i = balls.length - 1; i > 0; i--) { const j = random(i + 1); [balls[i], balls[j]] = [balls[j], balls[i]]; }
        state = Array.from({ length: colours }, (_, i) => balls.slice(i * SIZE, (i + 1) * SIZE)).concat([[], []]);
      } while (solved(state) || !solvable(state));
      return state;
    }

    function build(count) {
      $('tubes').textContent = '';
      buttons = Array.from({ length: count }, (_, i) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'tube';
        button.addEventListener('click', () => tap(i));
        $('tubes').appendChild(button);
        return button;
      });
    }

    function draw(dropped) {
      buttons.forEach((button, i) => {
        button.textContent = '';
        tubes[i].forEach((c, n) => {
          const ball = document.createElement('span');
          ball.className = 'ball c' + c + (i === dropped && n === tubes[i].length - 1 ? ' drop' : '');
          ball.textContent = SHAPES[c];
          button.appendChild(ball);
        });
        button.classList.toggle('done', tubes[i].length === SIZE && tubes[i].every(b => b === tubes[i][0]));
        button.setAttribute('aria-pressed', picked === i);
        button.setAttribute('aria-label', 'Tube ' + (i + 1) + ': ' +
          (tubes[i].length ? tubes[i].map(c => NAMES[c]).reverse().join(', ') + ' (top first)' : 'empty'));
      });
      $('sort-moves').textContent = moves;
      $('sort-level').textContent = level;
      $('sort-undo').disabled = won || !history.length;
    }

    function tap(i) {
      if (won) return;
      const status = $('sort-status');
      status.textContent = '';
      if (picked === null) { if (tubes[i].length) picked = i; return draw(); }
      if (picked === i) { picked = null; return draw(); }
      if (!canMove(tubes, picked, i)) {
        picked = null; draw();
        buttons[i].classList.remove('shake'); void buttons[i].offsetWidth; buttons[i].classList.add('shake');
        status.textContent = 'That ball can only go on the same colour or into an empty tube.';
        window.sfx('bad');
        return;
      }
      history.push([picked, i]);
      tubes[i].push(tubes[picked].pop());
      picked = null; moves++;
      won = solved(tubes);
      draw(i);
      if (won) {
        status.textContent = 'Level ' + level + ' sorted in ' + moves + ' moves! 🎉';
        window.saveBest('sort-' + Math.min(level, 2), moves, true, 'sort-best');
        $('sort-next').hidden = false;
        window.burst($('tubes')); window.sfx('win');
      } else {
        window.sfx('tap');
        if (!tubes.some((_, a) => tubes.some((_, b) => canMove(tubes, a, b)))) status.textContent = 'No moves left. Undo or try a new puzzle.';
      }
    }

    $('sort-undo').addEventListener('click', () => {
      if (won || !history.length) return;
      const [from, to] = history.pop();
      tubes[from].push(tubes[to].pop());
      picked = null; moves++; $('sort-status').textContent = 'Move undone.'; draw(from);
    });

    function reset() {
      tubes = deal(); picked = null; moves = 0; won = false; history = [];
      build(tubes.length);
      $('sort-status').textContent = ''; $('sort-next').hidden = true;
      showBest('sort-' + Math.min(level, 2), 'sort-best'); draw();
    }
    $('sort-reset').addEventListener('click', reset);
    $('sort-next').addEventListener('click', () => { level++; reset(); buttons[0].focus(); });
    reset();
  })();

  /* Connect Fuel */
  (() => {
    const W = 6, GOAL = 24, MOVES = 10;
    let grid, chain, moves, fuel, dragging, dragged;
    const board = $('balls');
    const adjacent = (a, b) => a !== b && Math.abs(a % W - b % W) <= 1 && Math.abs(Math.floor(a / W) - Math.floor(b / W)) <= 1;

    // Is there any group of 3 or more touching balls of one colour?
    function hasMove() {
      const seen = new Set();
      return grid.some((colour, start) => {
        if (seen.has(start)) return false;
        const group = [start]; seen.add(start);
        for (let n = 0; n < group.length; n++) grid.forEach((c, j) => {
          if (c === colour && !seen.has(j) && adjacent(group[n], j)) { seen.add(j); group.push(j); }
        });
        return group.length >= 3;
      });
    }

    const cells = Array.from({ length: W * W }, (_, i) => {
      const cell = document.createElement('button');
      cell.type = 'button'; cell.dataset.i = i;
      board.appendChild(cell);
      // Keyboard activation (Enter or Space) arrives as a click with detail 0
      cell.addEventListener('click', e => { if (e.detail === 0) press(i); });
      return cell;
    });

    function draw(fresh = []) {
      cells.forEach((cell, i) => {
        cell.className = 'ball c' + grid[i] + (chain.includes(i) ? ' sel' : '') + (fresh.includes(i) ? ' fall' : '');
        cell.textContent = SHAPES[grid[i]];
        cell.setAttribute('aria-label', NAMES[grid[i]] + ', row ' + (Math.floor(i / W) + 1) + ', column ' + (i % W + 1));
        cell.setAttribute('aria-pressed', chain.includes(i));
      });
      $('con-moves').textContent = moves;
      const done = Math.min(fuel / GOAL, 1) * 100;
      $('fuel').style.width = done + '%';
      $('bike').style.left = 'calc(' + done + '% - ' + (done * 0.62) + 'px)';
    }

    const over = () => fuel >= GOAL || moves <= 0;
    const fits = i => {
      const last = chain[chain.length - 1];
      return !chain.includes(i) && grid[i] === grid[last] && adjacent(i, last);
    };

    function press(i) {
      if (over()) return;
      if (chain.length >= 3 && chain[chain.length - 1] === i) return pop();
      if (chain.length && fits(i)) chain.push(i);
      else chain = chain.length === 1 && chain[0] === i ? [] : [i];
      $('con-status').textContent = chain.length >= 3 ? chain.length + ' linked. Pop it!' : '';
      window.sfx('tap');
      draw();
    }

    function pop() {
      if (over()) return;
      if (chain.length < 3) { $('con-status').textContent = 'Link at least 3 balls.'; return; }
      const bonus = chain.length >= 5 ? 2 : 0;
      moves--; fuel += chain.length + bonus;
      const gone = new Set(chain), fresh = [];
      for (let x = 0; x < W; x++) {
        const keep = [];
        for (let y = W - 1; y >= 0; y--) if (!gone.has(y * W + x)) keep.push(grid[y * W + x]);
        for (let y = W - 1, n = 0; y >= 0; y--, n++) {
          if (n < keep.length) grid[y * W + x] = keep[n];
          else { grid[y * W + x] = random(4); fresh.push(y * W + x); }
        }
      }
      while (!hasMove()) grid = grid.map(() => random(4));
      const size = chain.length;
      chain = []; draw(fresh);
      if (fuel >= GOAL) {
        const used = MOVES - moves;
        $('con-status').textContent = 'Finish line in ' + used + ' moves! ' + '⭐'.repeat(used <= 3 ? 3 : used <= 5 ? 2 : 1);
        window.saveBest('connect', used, true, 'con-best');
        window.burst(board); window.sfx('win');
      } else if (!moves) {
        $('con-status').textContent = 'Out of moves at ' + Math.round(fuel / GOAL * 100) + '%. Try again.';
        window.sfx('bad');
      } else {
        $('con-status').textContent = bonus ? 'Combo! +' + (size + bonus) + ' fuel' : '+' + size + ' fuel';
        window.sfx('good');
      }
    }

    board.addEventListener('pointerdown', e => {
      const cell = e.target.closest('button');
      if (!cell) return;
      e.preventDefault();
      dragging = true; dragged = false;
      press(+cell.dataset.i);
    });
    window.addEventListener('pointermove', e => {
      if (!dragging || !chain.length || over()) return;
      const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('#balls button');
      if (!cell) return;
      const i = +cell.dataset.i;
      if (i === chain[chain.length - 2]) chain.pop();
      else if (fits(i)) chain.push(i);
      else return;
      dragged = true; draw();
    });
    const release = () => {
      if (dragging && dragged && chain.length >= 3) pop();
      dragging = false;
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', () => { dragging = false; });

    function reset() {
      do grid = Array.from({ length: W * W }, () => random(4)); while (!hasMove());
      chain = []; moves = MOVES; fuel = 0; $('con-status').textContent = ''; draw();
    }
    $('con-pop').addEventListener('click', pop);
    $('con-reset').addEventListener('click', reset);
    reset();
  })();

  /* Melon Shot */
  (() => {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const button = $('arc-shoot'), mover = $('mover'), arrow = $('arrow'), status = $('arc-status');
    const melon = mover.querySelector('.melon');
    let running = false, flying = false, score, arrows, x = 0, phase = 0, last, frame, timer;

    const show = () => { $('arc-score').textContent = score; $('arc-arrows').textContent = arrows; };

    function tick(now) {
      const speed = (calm ? 0.001 : 0.0015) + Math.max(score, 0) * 0.0002;
      phase += Math.min(now - last, 50) * speed; last = now;
      const reach = Math.min(Math.max($('range').clientWidth / 2 - 100, 70), 150);
      x = Math.sin(phase) * reach;
      mover.style.transform = 'translateX(' + x + 'px)';
      frame = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(frame); clearTimeout(timer);
      running = flying = false;
      arrow.classList.remove('fly'); arrow.style.bottom = '';
      button.textContent = 'Start'; button.disabled = false;
    }
    stopArchery = () => { if (running) { stop(); status.textContent = ''; } };

    function start() {
      score = 0; arrows = 5; running = true; phase = Math.PI / 2; last = performance.now();
      button.textContent = 'Shoot'; status.textContent = ''; show();
      frame = requestAnimationFrame(tick);
    }

    function land() {
      // Melon sits at the centre of the mover; bystanders are 76px to each side
      const offset = Math.abs(x);
      if (offset <= 32) {
        score++; status.textContent = 'Juicy hit! +1'; window.sfx('good');
        melon.classList.remove('hit'); void melon.offsetWidth; melon.classList.add('hit');
      } else if (Math.abs(offset - 76) <= 20) {
        score--; status.textContent = 'Careful! You hit a bystander. −1'; window.sfx('bad');
      } else status.textContent = 'Missed.';
      arrows--; show();
      arrow.classList.remove('fly'); arrow.style.bottom = '';
      flying = false; button.disabled = false;
      if (!arrows) {
        const final = score;
        stop(); button.textContent = 'Play again';
        status.textContent = 'Final score: ' + final + ' out of 5' + (final >= 4 ? '. Sharp shooting! 🎯' : '.');
        window.saveBest('archery', final, false, 'arc-best');
        if (final >= 4) { window.burst($('range')); window.sfx('win'); }
      }
    }

    button.addEventListener('click', () => {
      if (!running) return start();
      if (flying) return;
      flying = true;
      window.sfx('tap');
      void arrow.offsetWidth;
      arrow.classList.add('fly'); arrow.style.bottom = '168px';
      timer = setTimeout(land, 150);
    });

    // Stop the animation when the demo is scrolled out of view
    new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stopArchery(); }).observe($('range'));
  })();
})();
