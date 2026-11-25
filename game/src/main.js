// Dapur Senja — main.js
// The game loop and the rules that tie the modules together: click a bin to
// pick up, click a station to cook or chop, click a plate to assemble, click
// a ticket to serve. Score, combo, hearts and the day timer live here.

import { DAY_LENGTH_SECONDS, MAX_HEARTS, COMBO_WINDOW_SECONDS, INGREDIENTS, INGREDIENT_ORDER, RECIPES, levelForElapsed } from './config.js';
import { createOrderBoard, updateOrderBoard, spawnOrder, findMatchingOrder, serveOrder } from './orders.js';
import { createKitchen, startCooking, updateKitchen, takeFinished, plateAdd, plateClear, plateNeeds, plateRecipe } from './kitchen.js';
import { createInput, buildHotspots, hotspotAt } from './input.js';
import { computeLayout, render } from './render.js';
import { ensureAudio, sfx, toggleMute } from './audio.js';
import { applyShot } from './shots.js';
import { recipeForNeeds } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const state = {
  screen: 'title', // title | play | over
  paused: false,
  shotMode: null,
  elapsed: 0,
  level: 1,
  coins: 0,
  score: 0,
  hearts: MAX_HEARTS,
  combo: 1,
  comboTimer: 0,
  lastServeAt: -999,
  orders: createOrderBoard(),
  kitchen: createKitchen(),
  input: createInput(),
  floaters: [],
  layout: null,
  hotspots: [],
  random: Math.random,
};

const recipesById = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

function resizeCanvas() {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
  canvas.width = 1280;
  canvas.height = 800;
  canvas.style.width = `${1280 * scale}px`;
  canvas.style.height = `${800 * scale}px`;
}

function toGameCoords(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 1280,
    y: ((event.clientY - rect.top) / rect.height) * 800,
  };
}

function announce(message) {
  if (statusEl) statusEl.textContent = message;
}

function addFloater(x, y, text, color) {
  state.floaters.push({ x, y, text, life: 1.4, maxLife: 1.4, color });
}

function resetGame() {
  state.screen = 'play';
  state.paused = false;
  state.elapsed = 0;
  state.level = 1;
  state.coins = 0;
  state.score = 0;
  state.hearts = MAX_HEARTS;
  state.combo = 1;
  state.comboTimer = 0;
  state.lastServeAt = -999;
  state.orders = createOrderBoard();
  state.kitchen = createKitchen();
  state.input.hand = null;
  state.floaters = [];
  spawnOrder(state.orders, 1, state.random);
  spawnOrder(state.orders, 1, state.random);
  announce('Hari baru dimulai. Dua pesanan masuk.');
}

function endDay() {
  state.screen = 'over';
  sfx.gameOver();
  announce(`Warung tutup. Skor akhir ${state.score}, ${state.coins} koin.`);
}

function serveReadyPlate(plateIndex) {
  const plate = state.kitchen.plates[plateIndex];
  if (!plate || plate.items.length === 0) return false;
  const order = findMatchingOrder(state.orders, plateNeeds(plate));
  if (!order) {
    sfx.bad();
    addFloater(640, 430, 'Tidak ada pesanan yang cocok!', '#ff4757');
    return false;
  }
  const now = state.elapsed;
  const inCombo = now - state.lastServeAt <= COMBO_WINDOW_SECONDS;
  state.combo = inCombo ? Math.min(5, state.combo + 1) : 1;
  state.comboTimer = COMBO_WINDOW_SECONDS;
  state.lastServeAt = now;
  const result = serveOrder(state.orders, order, state.combo);
  state.coins += result.coins;
  state.score += result.coins + state.combo * 10;
  plateClear(plate);
  sfx.coin();
  addFloater(640, 430, `+${result.coins} 🪙 ${result.recipe.name}`, '#ffc53d');
  if (state.combo > 1) addFloater(640, 470, `COMBO x${state.combo}!`, '#ff6b35');
  announce(`Terantar: ${result.recipe.name}, ${result.coins} koin.`);
  return true;
}

function handleClick(spot) {
  if (!spot) return;
  ensureAudio();
  const input = state.input;
  const kitchen = state.kitchen;

  if (spot.kind === 'bin') {
    const def = INGREDIENTS[spot.id];
    if (input.hand) {
      sfx.bad();
      addFloater(200, 240, 'Tanganmu penuh!', '#ff4757');
      return;
    }
    input.hand = spot.id;
    sfx.pickup();
    return;
  }

  if (spot.kind === 'stove') {
    const stove = kitchen.stoves[spot.id];
    if (stove.slot?.done) {
      input.hand = takeFinished(stove);
      sfx.pickup();
      return;
    }
    if (!input.hand) return;
    const def = INGREDIENTS[input.hand];
    if (def.prep !== 'stove') {
      sfx.bad();
      addFloater(440, 240, `${def.name} tidak dimasak di kompor`, '#ff4757');
      return;
    }
    if (startCooking(stove, input.hand)) {
      input.hand = null;
      sfx.sizzle();
    }
    return;
  }

  if (spot.kind === 'board') {
    const board = kitchen.board;
    if (board.slot?.done) {
      input.hand = takeFinished(board);
      sfx.pickup();
      return;
    }
    if (!input.hand) return;
    const def = INGREDIENTS[input.hand];
    if (def.prep !== 'board') {
      sfx.bad();
      addFloater(870, 240, `${def.name} tidak dipotong di talenan`, '#ff4757');
      return;
    }
    if (startCooking(board, input.hand)) {
      input.hand = null;
      sfx.chop();
    }
    return;
  }

  if (spot.kind === 'plate') {
    const plate = kitchen.plates[spot.id];
    if (!input.hand) {
      // Empty hand on a finished plate: serve it to its ticket.
      if (plateRecipe(plate, recipeForNeeds)) serveReadyPlate(spot.id);
      return;
    }
    if (plateAdd(plate, input.hand)) {
      input.hand = null;
      sfx.place();
      if (plateRecipe(plate, recipeForNeeds)) sfx.ding();
    } else {
      sfx.bad();
      addFloater(500, 450, 'Sudah ada di piring / piring penuh', '#ff4757');
    }
    return;
  }

  if (spot.kind === 'order') {
    // Clicking a ticket serves the first finished plate that matches it.
    for (let i = 0; i < kitchen.plates.length; i++) {
      const plate = kitchen.plates[i];
      const recipe = plateRecipe(plate, recipeForNeeds);
      if (!recipe) continue;
      const order = state.orders.orders.find((o) => o.id === spot.id);
      if (order && order.recipe.id === recipe.id) {
        serveReadyPlate(i);
        return;
      }
    }
    sfx.bad();
    addFloater(200, 200, 'Belum ada piring yang cocok untuk tiket ini', '#ff4757');
    return;
  }

  if (spot.kind === 'serve') {
    for (let i = 0; i < kitchen.plates.length; i++) {
      if (plateRecipe(kitchen.plates[i], recipeForNeeds)) {
        serveReadyPlate(i);
        return;
      }
    }
    sfx.bad();
    return;
  }

  if (spot.kind === 'trash') {
    if (input.hand) {
      input.hand = null;
      sfx.place();
    }
    return;
  }
}

canvas.addEventListener('pointermove', (event) => {
  const p = toGameCoords(event);
  state.input.pointer = p;
  state.input.hover = hotspotAt(state.hotspots, p.x, p.y);
});

canvas.addEventListener('pointerdown', (event) => {
  ensureAudio();
  const p = toGameCoords(event);
  state.input.pointer = p;
  if (state.screen === 'title') {
    // The big start button, or anywhere on the title card.
    if (p.y > 540 && p.y < 600 && p.x > 470 && p.x < 810) resetGame();
    else if (p.y > 150 && p.y < 620) resetGame();
    return;
  }
  if (state.screen === 'over') {
    if (p.y > 510 && p.y < 560 && p.x > 490 && p.x < 790) resetGame();
    return;
  }
  if (state.paused) return;
  handleClick(hotspotAt(state.hotspots, p.x, p.y));
});

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'm') {
    const nowMuted = toggleMute();
    announce(nowMuted ? 'Suara mati.' : 'Suara hidup.');
    return;
  }
  if (state.screen === 'title' && (key === 'enter' || key === ' ')) {
    resetGame();
    return;
  }
  if (state.screen === 'over' && (key === 'r' || key === 'enter')) {
    resetGame();
    return;
  }
  if (state.screen !== 'play') return;
  if (key === 'p') {
    state.paused = !state.paused;
    announce(state.paused ? 'Jeda.' : 'Lanjut.');
    return;
  }
  if (state.paused) return;
  if (key === ' ') {
    event.preventDefault();
    for (let i = 0; i < state.kitchen.plates.length; i++) {
      if (plateRecipe(state.kitchen.plates[i], recipeForNeeds)) {
        serveReadyPlate(i);
        return;
      }
    }
    return;
  }
  if (key === 'r') {
    resetGame();
    return;
  }
  const ingredientId = INGREDIENT_ORDER.find((id) => INGREDIENTS[id].key === key);
  if (ingredientId && !state.input.hand) {
    state.input.hand = ingredientId;
    sfx.pickup();
  }
});

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (state.screen === 'play' && !state.paused) {
    state.elapsed += dt;
    const newLevel = levelForElapsed(state.elapsed);
    if (newLevel !== state.level) {
      state.level = newLevel;
      sfx.levelUp();
      addFloater(640, 200, `LEVEL ${newLevel} — makin ramai!`, '#ff6b35');
      announce(`Level ${newLevel}. Pesanan makin cepat.`);
    }
    const before = state.orders.orders.length;
    const expired = updateOrderBoard(state.orders, dt, state.level, state.random);
    if (state.orders.orders.length > before) sfx.newOrder();
    if (expired.length > 0) {
      state.hearts -= expired.length;
      state.combo = 1;
      sfx.bad();
      addFloater(640, 200, `Pesanan hangus! -${expired.length} ❤️`, '#ff4757');
      announce('Satu pesanan hangus. Pelanggan kecewa.');
      if (state.hearts <= 0) {
        state.hearts = 0;
        endDay();
      }
    }
    const finished = updateKitchen(state.kitchen, dt);
    if (finished.length > 0) sfx.ding();
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }
    if (state.elapsed >= DAY_LENGTH_SECONDS) endDay();
  }

  for (const f of state.floaters) f.life -= dt;
  state.floaters = state.floaters.filter((f) => f.life > 0);

  state.layout = computeLayout(state);
  state.hotspots = buildHotspots(state.layout);
  render(ctx, state);
  requestAnimationFrame(frame);
}

function boot() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    applyShot(state, shot, recipesById);
  } else {
    spawnOrder(state.orders, 1, state.random);
  }
  state.layout = computeLayout(state);
  state.hotspots = buildHotspots(state.layout);
  requestAnimationFrame(frame);
}

boot();
