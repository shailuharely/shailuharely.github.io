// Mobile menu
const menuBtn = document.querySelector('.menu-btn');
const menu = document.getElementById('menu');
if (menuBtn) {
  const setMenu = open => { menu.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); };
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
}

// Contact form: static hosting has no server, so open a pre-filled email instead
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);
    const subject = data.get('service') + ' enquiry from ' + data.get('name');
    const body = 'Name: ' + data.get('name') + '\nEmail: ' + data.get('email') +
      '\nService: ' + data.get('service') + '\n\n' + data.get('message');
    location.href = 'mailto:shailuharely@gmail.com?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  });
}

// Click a case-study image to enlarge it
const box = document.getElementById('lightbox');
if (box) {
  document.querySelectorAll('img.zoom').forEach(img => img.addEventListener('click', () => {
    const big = box.querySelector('img');
    big.src = img.src; big.alt = img.alt; box.showModal();
  }));
  box.addEventListener('click', e => { if (e.target === box) box.close(); });
}

// Animations
const calmMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Geometric confetti from the middle of an element
window.burst = el => {
  if (calmMotion) return;
  const r = el.getBoundingClientRect();
  const colours = ['#6952F5', '#D5F45B', '#FF8A65', '#75C7FF', '#FFD166'];
  for (let i = 0; i < 36; i++) {
    const bit = document.createElement('span');
    bit.className = 'confetti';
    bit.style.cssText = 'left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height / 2) + 'px;background:' +
      colours[i % 5] + ';border-radius:' + (i % 3 ? '3px' : '50%') +
      ';--x:' + (Math.random() * 420 - 210) + 'px;--y:' + (Math.random() * 360 - 220) + 'px';
    document.body.appendChild(bit);
    setTimeout(() => bit.remove(), 1000);
  }
};

// Scroll progress bar
const progress = document.querySelector('.progress');
if (progress) {
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
  };
  addEventListener('scroll', update, { passive: true });
  update();
}

// Highlight the current section in the menu
const navLinks = [...document.querySelectorAll('.nav nav a[href^="#"]')];
if (navLinks.length) {
  const spy = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.hash === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(s => spy.observe(s));
}

// Reveal blocks as they scroll into view, and count the career stats up once
const revealer = new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  revealer.unobserve(e.target);
  const number = e.target.querySelector('[data-count]');
  if (!number || calmMotion) return;
  const [, target, suffix] = number.textContent.match(/(\d+)(.*)/);
  const began = performance.now();
  const step = now => {
    const t = Math.min((now - began) / 900, 1);
    number.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + suffix;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), { threshold: 0.12 });
document.querySelectorAll('.stats>div, .logos, main h2, .feature, .role-box li, .games .card, .console, .bento .card, .timeline li, .quote, .contact, .challenge, .case figure')
  .forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 4) * 60 + 'ms';
    // Drop the stagger once shown, so hover effects respond immediately
    el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
    revealer.observe(el);
  });

// Floating hero icons follow the pointer a little
const stage = document.getElementById('stage');
if (stage && !calmMotion) {
  addEventListener('pointermove', e => {
    stage.style.setProperty('--mx', (e.clientX / innerWidth - 0.5).toFixed(3));
    stage.style.setProperty('--my', (e.clientY / innerHeight - 0.5).toFixed(3));
  }, { passive: true });
}

// Mini sorting puzzle. Edit GROUPS to change the level.
const board = document.getElementById('board');
if (board) {
  const GROUPS = {
    Animals: [['🐶','Dog'], ['🦊','Fox'], ['🐼','Panda'], ['🦆','Duck']],
    Magic:   [['🧙','Wizard'], ['🔮','Orb'], ['🦄','Unicorn'], ['🧪','Potion']],
    Food:    [['🍰','Cake'], ['🍕','Pizza'], ['🍎','Apple'], ['🍩','Donut']]
  };
  const bins = document.getElementById('bins');
  const status = document.getElementById('status');
  let picked, moves, mistakes, counts;

  const shuffle = list => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const showScore = () => {
    document.getElementById('moves').textContent = moves;
    document.getElementById('mistakes').textContent = mistakes;
  };

  function choose(tile) {
    board.querySelectorAll('.tile').forEach(t => t.setAttribute('aria-pressed', t === tile));
    picked = tile;
    status.textContent = '';
  }

  function drop(bin, group) {
    if (!picked) { status.textContent = 'Pick a card first.'; return; }
    moves++;
    if (picked.dataset.group === group) {
      picked.remove(); picked = null;
      counts[group]++;
      bin.querySelector('small').textContent = counts[group] + ' / ' + GROUPS[group].length;
      bin.classList.toggle('done', counts[group] === GROUPS[group].length);
      if (!board.children.length) window.burst(bins);
      status.textContent = board.children.length ? 'Nice!' :
        'Level cleared in ' + moves + ' moves with ' + mistakes + ' mistake' + (mistakes === 1 ? '' : 's') + '. 🎉';
    } else {
      mistakes++;
      bin.classList.remove('wrong'); void bin.offsetWidth; bin.classList.add('wrong');
      status.textContent = 'Not that group. Try again.';
    }
    showScore();
  }

  function start() {
    picked = null; moves = 0; mistakes = 0; counts = {};
    board.textContent = ''; bins.textContent = ''; status.textContent = '';
    const cards = [];
    Object.entries(GROUPS).forEach(([group, items]) => {
      counts[group] = 0;
      items.forEach(([icon, name]) => cards.push({ group, icon, name }));
      const bin = document.createElement('button');
      bin.type = 'button'; bin.className = 'bin';
      bin.innerHTML = group + '<small>0 / ' + items.length + '</small>';
      bin.addEventListener('click', () => drop(bin, group));
      bins.appendChild(bin);
    });
    shuffle(cards).forEach(card => {
      const tile = document.createElement('button');
      tile.type = 'button'; tile.className = 'tile'; tile.dataset.group = card.group;
      tile.setAttribute('aria-pressed', 'false');
      tile.innerHTML = '<i aria-hidden="true">' + card.icon + '</i>' + card.name;
      tile.addEventListener('click', () => choose(tile));
      board.appendChild(tile);
    });
    showScore();
  }

  document.getElementById('restart').addEventListener('click', start);
  start();
}
