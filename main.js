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
document.querySelectorAll('.stats>div, .logos, main h2, .feature, .role-box li, .games .card, .console, .bento .card, .timeline li, .quote, .contact, .challenge, .case figure, .grad figure')
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
