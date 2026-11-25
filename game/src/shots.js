// Dapur Senja — shots.js
// Staged states for the screenshots, so each one shows the game at its
// best: the kitchen, the order board, ingredients on the counter, a dish
// mid-assembly, the timer, and a plate ready to serve. The game reads
// ?shot=start|play|rush|serve and freezes the clock on that scene.

import { INGREDIENTS } from './config.js';

function stageOrder(id, recipe, patience, maxPatience) {
  return { id, recipe, patience, maxPatience, age: 0, tilt: (id % 2 ? -0.03 : 0.03) };
}

export function applyShot(state, shot, recipesById) {
  const board = state.orders;
  const kitchen = state.kitchen;
  state.shotMode = shot;
  state.paused = true;

  if (shot === 'start') {
    // Title screen over a busy kitchen: two orders up, a plate half built.
    state.screen = 'title';
    board.orders = [
      stageOrder(1, recipesById['nasi-goreng'], 38, 48),
      stageOrder(2, recipesById['ayam-geprek'], 30, 48),
    ];
    kitchen.plates[0].items = ['nasi', 'telur'];
    kitchen.stoves[0].slot = { ingredientId: 'ayam', progress: 0.55, total: 4, done: false };
    kitchen.board.slot = { ingredientId: 'sayur', progress: 0.4, total: 2, done: false };
    state.elapsed = 12;
    state.coins = 120;
    state.score = 340;
    state.combo = 1;
    return;
  }

  state.screen = 'play';
  if (shot === 'play') {
    // Mid-game: three orders, one plate mid-assembly, stove and board busy.
    board.orders = [
      stageOrder(1, recipesById['nasi-goreng'], 34, 48),
      stageOrder(2, recipesById['mie-goreng'], 26, 48),
      stageOrder(3, recipesById['ayam-geprek'], 18, 48),
    ];
    kitchen.plates[0].items = ['nasi', 'telur'];
    kitchen.plates[1].items = ['mie'];
    kitchen.stoves[0].slot = { ingredientId: 'ayam', progress: 0.7, total: 4, done: false };
    kitchen.stoves[1].slot = { ingredientId: 'telur', progress: 0.45, total: 3, done: false };
    kitchen.board.slot = { ingredientId: 'sayur', progress: 0.6, total: 2, done: false };
    state.elapsed = 62;
    state.coins = 480;
    state.score = 1250;
    state.combo = 2;
    state.comboTimer = 6;
    return;
  }

  if (shot === 'rush') {
    // The rush: four orders, one about to expire, timer nearly out.
    board.orders = [
      stageOrder(1, recipesById['nasi-spesial'], 9, 48),
      stageOrder(2, recipesById['mie-ayam'], 22, 48),
      stageOrder(3, recipesById['nasi-ayam'], 31, 48),
      stageOrder(4, recipesById['mie-goreng'], 40, 48),
    ];
    kitchen.plates[0].items = ['nasi', 'ayam', 'telur'];
    kitchen.plates[1].items = ['mie', 'ayam'];
    kitchen.stoves[0].slot = { ingredientId: 'telur', progress: 0.9, total: 3, done: false };
    kitchen.board.slot = { ingredientId: 'sayur', progress: 0.8, total: 2, done: false };
    state.elapsed = 128;
    state.coins = 930;
    state.score = 2680;
    state.combo = 3;
    state.comboTimer = 8;
    state.hearts = 2;
    return;
  }

  if (shot === 'serve') {
    // The pay-off: a finished Nasi Goreng on the plate, its ticket waiting,
    // coins popping. The plate is picked up and ready to serve.
    board.orders = [
      stageOrder(1, recipesById['nasi-goreng'], 36, 48),
      stageOrder(2, recipesById['mie-goreng'], 24, 48),
    ];
    kitchen.plates[0].items = ['nasi', 'telur', 'sayur'];
    kitchen.plates[1].items = ['ayam'];
    kitchen.stoves[1].slot = { ingredientId: 'ayam', progress: 1, total: 4, done: true };
    state.elapsed = 45;
    state.coins = 610;
    state.score = 1740;
    state.combo = 2;
    state.comboTimer = 9;
    state.floaters = [
      { x: 640, y: 300, text: '+120 🪙', life: 1, maxLife: 1, color: '#ffc53d' },
      { x: 700, y: 340, text: 'COMBO x2!', life: 1, maxLife: 1, color: '#ff6b35' },
    ];
    return;
  }
}

export function ingredientEmoji(id) {
  return INGREDIENTS[id]?.emoji ?? '❓';
}
