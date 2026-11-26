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
