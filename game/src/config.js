// Dapur Senja — config.js
// Every tunable number, recipe and ingredient of the game lives here and
// nowhere else, so balancing the game means editing this one file.

export const VIEW = { width: 1280, height: 800 };

export const DAY_LENGTH_SECONDS = 150;
export const MAX_HEARTS = 3;
export const MAX_ORDERS = 4;
export const ORDER_PATIENCE_SECONDS = 48;
export const COMBO_WINDOW_SECONDS = 12;

// The kitchen's dusk palette: warm wood, teal tiles, ember orange.
export const COLORS = {
  wall: '#2b1d3a',
  wallBand: '#3a2447',
  floor: '#241627',
  counterTop: '#c98f4e',
  counterFront: '#8a5a2b',
  tile: '#1f7a6d',
  tileDark: '#176052',
  board: '#f7ead2',
  boardEdge: '#d9b380',
  plate: '#fdf6e3',
  ink: '#2a1a12',
  inkSoft: '#6b4a2f',
  gold: '#ffc53d',
  ember: '#ff6b35',
  danger: '#ff4757',
  ok: '#2ed573',
  cream: '#fff3d6',
};

export const INGREDIENTS = {
  nasi:   { id: 'nasi',   name: 'Nasi',   emoji: '🍚', color: '#f5f0e1', prep: 'stove', cookSeconds: 2.5, key: '1' },
  mie:    { id: 'mie',    name: 'Mie',    emoji: '🍜', color: '#f2c14e', prep: 'stove', cookSeconds: 2.5, key: '2' },
  ayam:   { id: 'ayam',   name: 'Ayam',   emoji: '🍗', color: '#e08a4e', prep: 'stove', cookSeconds: 4.0, key: '3' },
  telur:  { id: 'telur',  name: 'Telur',  emoji: '🥚', color: '#ffd93d', prep: 'stove', cookSeconds: 3.0, key: '4' },
  sayur:  { id: 'sayur',  name: 'Sayur',  emoji: '🥬', color: '#58b368', prep: 'board', cookSeconds: 2.0, key: '5' },
  sambal: { id: 'sambal', name: 'Sambal', emoji: '🌶️', color: '#e63946', prep: 'none',  cookSeconds: 0,   key: '6' },
};

export const INGREDIENT_ORDER = ['nasi', 'mie', 'ayam', 'telur', 'sayur', 'sambal'];

// A recipe is the set of ingredient ids a plate must hold, in any order.
// Bigger recipes pay more and unlock later in the day.
export const RECIPES = [
  { id: 'ayam-geprek', name: 'Ayam Geprek', emoji: '🍗', needs: ['ayam', 'sambal'],           price: 60,  unlockLevel: 1 },
  { id: 'nasi-goreng', name: 'Nasi Goreng', emoji: '🍚', needs: ['nasi', 'telur', 'sayur'],   price: 90,  unlockLevel: 1 },
  { id: 'mie-goreng',  name: 'Mie Goreng',  emoji: '🍜', needs: ['mie', 'telur', 'sayur'],    price: 90,  unlockLevel: 1 },
  { id: 'nasi-ayam',   name: 'Nasi Ayam',   emoji: '🍛', needs: ['nasi', 'ayam', 'sambal'],    price: 110, unlockLevel: 2 },
  { id: 'mie-ayam',    name: 'Mie Ayam',    emoji: '🍜', needs: ['mie', 'ayam', 'sayur'],     price: 110, unlockLevel: 2 },
  { id: 'nasi-spesial',name: 'Nasi Spesial',emoji: '🍛', needs: ['nasi', 'ayam', 'telur', 'sambal'], price: 150, unlockLevel: 3 },
];

export function recipesForLevel(level) {
  return RECIPES.filter((r) => r.unlockLevel <= level);
}

export function recipeForNeeds(needs) {
  const sorted = [...needs].sort();
  return RECIPES.find((r) => {
    const want = [...r.needs].sort();
    return want.length === sorted.length && want.every((id, i) => id === sorted[i]);
  }) ?? null;
}

// Patience drains faster as the day wears on, so the rush builds.
export function patienceDrainPerSecond(level) {
  return 1 + (level - 1) * 0.12;
}

export function orderSpawnIntervalSeconds(level) {
  return Math.max(4.5, 9 - level * 1.1);
}

export function levelForElapsed(elapsedSeconds) {
  if (elapsedSeconds < 50) return 1;
  if (elapsedSeconds < 100) return 2;
  return 3;
}
