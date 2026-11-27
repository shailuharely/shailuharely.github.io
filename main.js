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
  document.querySelectorAll('.zoom').forEach(target => target.addEventListener('click', () => {
    const img = target.matches('img') ? target : target.querySelector('img');
    const big = box.querySelector('img');
    big.src = img.src; big.alt = img.alt; box.showModal();
  }));
  box.addEventListener('click', e => { if (e.target === box) box.close(); });
}

// Animations
const calmMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Run a handler at most once per screen refresh, so scrolling stays smooth
const perFrame = handler => {
  let queued = false, latest;
  return event => {
    latest = event;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; handler(latest); });
  };
};

// Scroll progress bar
const progress = document.querySelector('.progress');
if (progress) {
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
  };
  addEventListener('scroll', perFrame(update), { passive: true });
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
    const t = Math.min((now - began) / 600, 1);
    number.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + suffix;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), { threshold: 0.05 });
document.querySelectorAll('.stats>div, .logos, main h2, .feature, .role-box li, .games .card, .bento .card, .timeline li, .quote, .contact, .challenge, .case figure, .grad figure')
  .forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 4) * 40 + 'ms';
    // Drop the stagger once shown, so hover effects respond immediately
    el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
    revealer.observe(el);
  });

// Floating hero icons follow the pointer a little
const stage = document.getElementById('stage');
if (stage && !calmMotion) {
  addEventListener('pointermove', perFrame(e => {
    if (stage.classList.contains('resting')) return;
    stage.style.setProperty('--mx', (e.clientX / innerWidth - 0.5).toFixed(3));
    stage.style.setProperty('--my', (e.clientY / innerHeight - 0.5).toFixed(3));
  }), { passive: true });
}
// Pause the looping hero animations once they are off screen
if (stage) new IntersectionObserver(entries => stage.classList.toggle('resting', !entries[0].isIntersecting)).observe(stage);

// Game icons: a different hover effect every time, and rotating icons around the portrait
const EFFECTS = ['spin', 'jelly', 'hop', 'flip', 'wiggle', 'zoomy'];
function playEffect(link) {
  const img = link.querySelector('img');
  const choices = EFFECTS.filter(name => name !== link.dataset.fx);
  const next = choices[Math.floor(Math.random() * choices.length)];
  img.classList.remove(...EFFECTS.map(name => 'fx-' + name), 'swap');
  void img.offsetWidth;
  link.dataset.fx = next;
  img.classList.add('fx-' + next);
}
document.querySelectorAll('.icon-link, .float').forEach(link => {
  link.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') playEffect(link); });
  link.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') playEffect(link); });
  link.addEventListener('focus', () => playEffect(link));
});

const slots = [...document.querySelectorAll('.float')];
if (slots.length) {
  // The game library is the single list of games
  const games = [...document.querySelectorAll('.icon-link')].map(a => ({
    url: a.href,
    src: a.querySelector('img').getAttribute('src'),
    name: a.closest('li').querySelector('h3').textContent
  }));
  let turn = 0, holdUntil = 0;
  const busy = slot => slot.matches(':hover') || slot === document.activeElement;
  const swapIcon = slot => {
    const shown = slots.map(s => s.href);
    const spare = games.filter(g => !shown.includes(g.url));
    if (!spare.length) return;
    const game = spare[Math.floor(Math.random() * spare.length)];
    const img = slot.querySelector('img');
    slot.href = game.url;
    slot.setAttribute('aria-label', 'Open ' + game.name + ' on Google Play');
    slot.querySelector('.tip').textContent = game.name + ' ↗';
    img.src = game.src;
    img.className = '';
    void img.offsetWidth;
    img.className = 'swap';
  };
  slots.forEach(slot => {
    // After the mouse leaves, show a different game for next time
    slot.addEventListener('pointerleave', e => {
      if (e.pointerType === 'mouse' && !calmMotion) setTimeout(() => { if (!busy(slot)) swapIcon(slot); }, 350);
    });
    // Never change an icon while someone is tapping it
    slot.addEventListener('pointerdown', () => { holdUntil = Date.now() + 5000; });
  });
  if (!calmMotion) setInterval(() => {
    if (document.hidden || Date.now() < holdUntil || slots.some(busy)) return;
    swapIcon(slots[turn++ % slots.length]);
  }, 3200);
}

// Headline reveal: the name and role arrive one word at a time
let wordCount = 0;
function splitWords(node) {
  [...node.childNodes].forEach(child => {
    if (child.nodeType === Node.ELEMENT_NODE) return splitWords(child);
    const parts = child.textContent.split(/( +)/).filter(Boolean);
    child.replaceWith(...parts.map(part => {
      if (!part.trim()) return document.createTextNode(part);
      const word = document.createElement('span');
      word.className = 'word';
      word.style.setProperty('--i', wordCount++);
      word.textContent = part;
      return word;
    }));
  });
}
if (!calmMotion) document.querySelectorAll('.hero-copy h1, .hero-copy .role').forEach(el => {
  el.classList.add('split');
  splitWords(el);
});

// Cursor spotlight: a soft light follows the mouse across cards
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.games .card, .bento .card, .timeline li, .role-box li, .feature').forEach(card => {
    const light = document.createElement('i');
    light.className = 'spotlight';
    light.setAttribute('aria-hidden', 'true');
    card.classList.add('lit-card');
    card.appendChild(light);
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      light.style.setProperty('--sx', (e.clientX - r.left) + 'px');
      light.style.setProperty('--sy', (e.clientY - r.top) + 'px');
    });
  });
}

// Career line: fills as the visitor scrolls through the jobs
const career = document.querySelector('.timeline');
if (career) {
  const jobs = [...career.children];
  const fill = () => {
    const r = career.getBoundingClientRect();
    const amount = calmMotion ? 1 : Math.max(0, Math.min(1, (innerHeight * 0.9 - r.top) / (r.height + innerHeight * 0.3)));
    career.style.setProperty('--fill', amount.toFixed(3));
    // Side by side on wide screens, stacked on narrow ones
    const across = jobs[1].offsetTop === jobs[0].offsetTop;
    jobs.forEach(job => {
      // The timeline is positioned, so these offsets are measured from its own corner
      const at = across ? (job.offsetLeft + 33) / r.width : (job.offsetTop + 29) / r.height;
      job.classList.toggle('reached', amount >= at);
    });
  };
  addEventListener('scroll', perFrame(fill), { passive: true });
  addEventListener('resize', perFrame(fill));
  fill();
}

// Three puzzle tiles drop and snap into line under each section heading
document.querySelectorAll('main h2').forEach(heading => {
  const tiles = document.createElement('span');
  tiles.className = 'tiles';
  tiles.setAttribute('aria-hidden', 'true');
  tiles.innerHTML = '<i></i><i></i><i></i>';
  heading.appendChild(tiles);
});

// Tap pop: little puzzle pieces fly out wherever the visitor clicks or taps
if (!calmMotion && Element.prototype.animate) {
  const colours = ['#D5F45B', '#75C7FF', '#FF8A65', '#B9ABFF', '#FFD166'];
  addEventListener('click', e => {
    // Keyboard clicks have no position, and form fields should stay calm
    if (!e.detail || e.target.closest('input, textarea, select, label, dialog')) return;
    for (let i = 0; i < 6; i++) {
      const piece = document.createElement('span');
      piece.className = 'pop-piece';
      piece.style.cssText = 'left:' + (e.clientX - 5) + 'px;top:' + (e.clientY - 5) + 'px;background:' +
        colours[(i + e.clientX) % colours.length] + ';border-radius:' + (i % 2 ? '50%' : '3px');
      document.body.appendChild(piece);
      const angle = Math.PI * 2 * i / 6, reach = 34 + Math.random() * 18;
      piece.animate([
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + Math.cos(angle) * reach + 'px,' + Math.sin(angle) * reach + 'px) scale(.2) rotate(180deg)', opacity: 0 }
      ], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => piece.remove();
    }
  });
}
