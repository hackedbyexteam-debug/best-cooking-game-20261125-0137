// Dapur Senja — input.js
// Mouse and keyboard, translated into game verbs: pick up an ingredient,
// use a station, add to a plate, serve a plate. The game never reads the
// pointer position anywhere else.

export function createInput() {
  return {
    hand: null, // ingredient id carried, or null
    hover: null, // { kind, id } of the hotspot under the cursor
    pointer: { x: 0, y: 0 },
    keys: new Set(),
  };
}

// Hotspots are rectangles the renderer and the click handler agree on.
// Each one names a verb the game understands.
export function buildHotspots(layout) {
  const spots = [];
  for (const bin of layout.bins) spots.push({ kind: 'bin', id: bin.id, rect: bin.rect });
  for (const stove of layout.stoves) spots.push({ kind: 'stove', id: stove.id, rect: stove.rect });
  spots.push({ kind: 'board', id: 0, rect: layout.board.rect });
  for (const plate of layout.plates) spots.push({ kind: 'plate', id: plate.id, rect: plate.rect });
  for (const order of layout.orders) spots.push({ kind: 'order', id: order.id, rect: order.rect });
  spots.push({ kind: 'serve', id: 0, rect: layout.serve.rect });
  spots.push({ kind: 'trash', id: 0, rect: layout.trash.rect });
  return spots;
}

export function hotspotAt(spots, x, y) {
  for (let i = spots.length - 1; i >= 0; i--) {
    const r = spots[i].rect;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return spots[i];
  }
  return null;
}

export function describeHand(input) {
  return input.hand;
}
