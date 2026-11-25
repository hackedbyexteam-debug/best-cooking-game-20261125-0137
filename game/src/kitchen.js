// Dapur Senja — kitchen.js
// The working kitchen: two stoves, one chopping board, two assembly plates.
// Ingredients go in raw, come out cooked or chopped, and land on a plate.

import { INGREDIENTS } from './config.js';

export function createKitchen() {
  return {
    stoves: [
      { id: 0, slot: null },
      { id: 1, slot: null },
    ],
    board: { slot: null },
    plates: [
      { id: 0, items: [] },
      { id: 1, items: [] },
    ],
  };
}

// A cooking slot holds one ingredient plus its progress, 0 to 1.
export function startCooking(slot, ingredientId) {
  const def = INGREDIENTS[ingredientId];
  if (!def || def.prep === 'none') return false;
  if (slot.slot) return false;
  slot.slot = { ingredientId, progress: 0, total: def.cookSeconds, done: false };
  return true;
}

export function updateKitchen(kitchen, dt) {
  const finished = [];
  for (const stove of kitchen.stoves) {
    if (stove.slot && !stove.slot.done) {
      stove.slot.progress += dt / stove.slot.total;
      if (stove.slot.progress >= 1) {
        stove.slot.progress = 1;
        stove.slot.done = true;
        finished.push({ station: 'stove', stationId: stove.id, ingredientId: stove.slot.ingredientId });
      }
    }
  }
  if (kitchen.board.slot && !kitchen.board.slot.done) {
    kitchen.board.slot.progress += dt / kitchen.board.slot.total;
    if (kitchen.board.slot.progress >= 1) {
      kitchen.board.slot.progress = 1;
      kitchen.board.slot.done = true;
      finished.push({ station: 'board', stationId: 0, ingredientId: kitchen.board.slot.ingredientId });
    }
  }
  return finished;
}

export function takeFinished(slot) {
  if (!slot.slot || !slot.slot.done) return null;
  const id = slot.slot.ingredientId;
  slot.slot = null;
  return id;
}

export function plateAdd(plate, ingredientId) {
  if (plate.items.length >= 4) return false;
  if (plate.items.includes(ingredientId)) return false;
  plate.items.push(ingredientId);
  return true;
}

export function plateClear(plate) {
  plate.items = [];
}

export function plateNeeds(plate) {
  return [...plate.items];
}

// The plate is "ready" when its contents are exactly some recipe.
export function plateRecipe(plate, recipeForNeedsFn) {
  if (plate.items.length === 0) return null;
  return recipeForNeedsFn(plate.items);
}

export function isIngredientCooked(ingredientId) {
  return INGREDIENTS[ingredientId]?.prep !== 'none';
}
