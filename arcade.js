// Playable demos: tabs, Colour Sort, Connect Fuel, Melon Shot.
// (Category Match lives in main.js.)
(() => {
  const $ = id => document.getElementById(id);
  const random = n => Math.floor(Math.random() * n);
  const SHAPES = ['●', '▲', '■', '★'];
  const NAMES = ['coral circle', 'blue triangle', 'lime square', 'purple star'];

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
    let tubes, picked, moves, won;
    const solved = state => state.every(t => !t.length || (t.length === SIZE && t.every(b => b === t[0])));
    const canMove = (state, a, b) => a !== b && state[a].length > 0 && state[b].length < SIZE &&
      (!state[b].length || state[b][state[b].length - 1] === state[a][state[a].length - 1]);

    // Search every line of play so that only winnable puzzles are dealt
    function solvable(start) {
      const seen = new Set();
      const stack = [start];
      while (stack.length) {
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
        const balls = [0, 1, 2].flatMap(c => Array(SIZE).fill(c));
        for (let i = balls.length - 1; i > 0; i--) { const j = random(i + 1); [balls[i], balls[j]] = [balls[j], balls[i]]; }
        state = [balls.slice(0, 4), balls.slice(4, 8), balls.slice(8), [], []];
      } while (solved(state) || !solvable(state));
      return state;
    }

    const buttons = Array.from({ length: 5 }, (_, i) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'tube';
      button.addEventListener('click', () => tap(i));
      $('tubes').appendChild(button);
      return button;
    });

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
        return;
      }
      tubes[i].push(tubes[picked].pop());
      picked = null; moves++; draw(i);
      if (solved(tubes)) { won = true; status.textContent = 'Sorted in ' + moves + ' moves! 🎉'; window.burst($('tubes')); }
      else if (!tubes.some((_, a) => tubes.some((_, b) => canMove(tubes, a, b)))) status.textContent = 'No moves left. Try a new puzzle.';
    }

    function reset() { tubes = deal(); picked = null; moves = 0; won = false; $('sort-status').textContent = ''; draw(); }
    $('sort-reset').addEventListener('click', reset);
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
      draw();
    }

    function pop() {
      if (over()) return;
      if (chain.length < 3) { $('con-status').textContent = 'Link at least 3 balls.'; return; }
      moves--; fuel += chain.length;
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
      if (fuel >= GOAL) { $('con-status').textContent = 'Finish line reached! 🏁'; window.burst(board); }
      else if (!moves) $('con-status').textContent = 'Out of moves at ' + Math.round(fuel / GOAL * 100) + '%. Try again.';
      else $('con-status').textContent = '+' + size + ' fuel';
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
        score++; status.textContent = 'Juicy hit! +1';
        melon.classList.remove('hit'); void melon.offsetWidth; melon.classList.add('hit');
      } else if (Math.abs(offset - 76) <= 20) {
        score--; status.textContent = 'Careful! You hit a bystander. −1';
      } else status.textContent = 'Missed.';
      arrows--; show();
      arrow.classList.remove('fly'); arrow.style.bottom = '';
      flying = false; button.disabled = false;
      if (!arrows) {
        const final = score;
        stop(); button.textContent = 'Play again';
        status.textContent = 'Final score: ' + final + ' out of 5' + (final >= 4 ? '. Sharp shooting! 🎯' : '.');
        if (final >= 4) window.burst($('range'));
      }
    }

    button.addEventListener('click', () => {
      if (!running) return start();
      if (flying) return;
      flying = true;
      void arrow.offsetWidth;
      arrow.classList.add('fly'); arrow.style.bottom = '168px';
      timer = setTimeout(land, 150);
    });

    // Stop the animation when the demo is scrolled out of view
    new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stopArchery(); }).observe($('range'));
  })();
})();
