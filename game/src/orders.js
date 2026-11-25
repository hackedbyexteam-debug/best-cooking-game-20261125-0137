// Dapur Senja — orders.js
// The order board: spawning tickets, draining patience, matching a finished
// plate to the ticket that asked for it, and paying out.

import {
  MAX_ORDERS, ORDER_PATIENCE_SECONDS, patienceDrainPerSecond,
  orderSpawnIntervalSeconds, recipesForLevel, recipeForNeeds,
} from './config.js';

let nextOrderId = 1;

export function createOrderBoard() {
  return { orders: [], spawnTimer: 4, served: 0, expired: 0 };
}

export function pickRandomRecipe(level, random) {
  const pool = recipesForLevel(level);
  return pool[Math.floor(random() * pool.length)];
}

export function spawnOrder(board, level, random) {
  if (board.orders.length >= MAX_ORDERS) return null;
  const recipe = pickRandomRecipe(level, random);
  const order = {
    id: nextOrderId++,
    recipe,
    patience: ORDER_PATIENCE_SECONDS,
    maxPatience: ORDER_PATIENCE_SECONDS,
    age: 0,
    // A little wobble so tickets don't all look identical.
    tilt: (random() - 0.5) * 0.06,
  };
  board.orders.push(order);
  return order;
}

export function updateOrderBoard(board, dt, level, random) {
  board.spawnTimer -= dt;
  if (board.spawnTimer <= 0) {
    spawnOrder(board, level, random);
    board.spawnTimer = orderSpawnIntervalSeconds(level) * (0.85 + random() * 0.3);
  }
  const drain = patienceDrainPerSecond(level);
  const expired = [];
  for (const order of board.orders) {
    order.patience -= dt * drain;
    order.age += dt;
    if (order.patience <= 0) expired.push(order);
  }
  for (const order of expired) {
    board.orders = board.orders.filter((o) => o !== order);
    board.expired += 1;
  }
  return expired;
}

// Which open ticket does this plate satisfy? A plate matches when its
// ingredients are exactly one ticket's recipe, nothing more or less.
export function findMatchingOrder(board, plateNeeds) {
  const recipe = recipeForNeeds(plateNeeds);
  if (!recipe) return null;
  return board.orders.find((o) => o.recipe.id === recipe.id) ?? null;
}

export function serveOrder(board, order, comboMultiplier) {
  board.orders = board.orders.filter((o) => o !== order);
  board.served += 1;
  const base = order.recipe.price;
  const tip = Math.round((order.patience / order.maxPatience) * 30);
  const coins = (base + tip) * comboMultiplier;
  return { coins, base, tip, recipe: order.recipe };
}

export function patienceFraction(order) {
  return Math.max(0, order.patience / order.maxPatience);
}

export function isOrderUrgent(order) {
  return patienceFraction(order) < 0.35;
}
