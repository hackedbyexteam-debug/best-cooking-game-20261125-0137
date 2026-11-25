// Dapur Senja — render.js
// Every pixel the player sees: the dusk kitchen, the order board, the
// ingredient bins, the stoves, the chopping board, the plates and the serve
// window. It also owns the layout: the rectangles it draws are the same
// rectangles the click handler uses, so what you see is what you click.

import { COLORS, DAY_LENGTH_SECONDS, INGREDIENTS, INGREDIENT_ORDER, recipeForNeeds } from './config.js';
import { patienceFraction, isOrderUrgent } from './orders.js';

export function computeLayout(state) {
  const bins = INGREDIENT_ORDER.map((id, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    return { id, rect: { x: 28 + col * 140, y: 268 + row * 108, w: 128, h: 96 } };
  });
  const stoves = [
    { id: 0, rect: { x: 340, y: 268, w: 200, h: 130 } },
    { id: 1, rect: { x: 556, y: 268, w: 200, h: 130 } },
  ];
  const board = { rect: { x: 772, y: 268, w: 200, h: 130 } };
  const plates = [
    { id: 0, rect: { x: 340, y: 470, w: 300, h: 150 } },
    { id: 1, rect: { x: 672, y: 470, w: 300, h: 150 } },
  ];
  const orders = state.orders.orders.map((order, i) => ({
    id: order.id,
    rect: { x: 28 + i * 200, y: 92, w: 186, h: 108 },
  }));
  const serve = { rect: { x: 1000, y: 470, w: 252, h: 150 } };
  const trash = { rect: { x: 1000, y: 268, w: 120, h: 130 } };
  return { bins, stoves, board, plates, orders, serve, trash };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = '700', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function emoji(ctx, str, x, y, size) {
  ctx.font = `${size}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function progressRing(ctx, cx, cy, radius, fraction, color) {
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction);
  ctx.stroke();
}

export function render(ctx, state) {
  const W = 1280, H = 800;
  drawRoom(ctx, W, H);
  drawHud(ctx, state, W);
  const layout = state.layout;
  drawOrderBoard(ctx, state, layout);
  drawBins(ctx, state, layout);
  drawStoves(ctx, state, layout);
  drawChoppingBoard(ctx, state, layout);
  drawPlates(ctx, state, layout);
  drawServeWindow(ctx, state, layout);
  drawTrash(ctx, layout);
  drawFloaters(ctx, state);
  drawHand(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state, W, H);
  if (state.screen === 'over') drawGameOver(ctx, state, W, H);
  if (state.paused && state.screen === 'play' && !state.shotMode) drawPaused(ctx, W, H);
}

function drawRoom(ctx, W, H) {
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, W, H);
  // Tiled band behind the counters.
  ctx.fillStyle = COLORS.tile;
  ctx.fillRect(0, 208, W, 52);
  ctx.fillStyle = COLORS.tileDark;
  for (let x = 0; x < W; x += 64) ctx.fillRect(x, 208, 2, 52);
  ctx.fillRect(0, 232, W, 2);
  // Floor.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 640, W, H - 640);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let x = 0; x < W; x += 96) ctx.fillRect(x, 640, 48, H - 640);
  // Hanging lamps.
  for (const lx of [320, 640, 960]) {
    ctx.strokeStyle = '#1a1020';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx, 64); ctx.lineTo(lx, 96); ctx.stroke();
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath(); ctx.arc(lx, 104, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,197,61,0.18)';
    ctx.beginPath(); ctx.arc(lx, 104, 34, 0, Math.PI * 2); ctx.fill();
  }
  // String lights across the top.
  ctx.strokeStyle = 'rgba(255,197,61,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 70);
  ctx.quadraticCurveTo(W / 2, 96, W, 70);
  ctx.stroke();
}

function drawHud(ctx, state, W) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, W, 64);
  text(ctx, '🍲 DAPUR SENJA', 24, 42, 26, COLORS.gold, '800');
  text(ctx, 'Masak kilat warung senja', 250, 40, 14, COLORS.cream, '600');
  // Coins and score.
  text(ctx, `🪙 ${state.coins}`, 560, 42, 24, COLORS.gold, '800');
  text(ctx, `Skor ${state.score}`, 700, 42, 22, COLORS.cream, '700');
  if (state.combo > 1) {
    text(ctx, `🔥 COMBO x${state.combo}`, 830, 42, 20, COLORS.ember, '800');
  }
  // Hearts.
  for (let i = 0; i < 3; i++) {
    emoji(ctx, i < state.hearts ? '❤️' : '🖤', 1060 + i * 34, 34, 26);
  }
  // Day timer: a bar that drains across the whole day.
  const remain = Math.max(0, DAY_LENGTH_SECONDS - state.elapsed);
  const frac = remain / DAY_LENGTH_SECONDS;
  const bx = 1140, bw = 116;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, bx, 22, bw, 18, 9); ctx.fill();
  ctx.fillStyle = frac < 0.2 ? COLORS.danger : COLORS.ok;
  roundRect(ctx, bx, 22, bw * frac, 18, 9); ctx.fill();
  text(ctx, `⏱ ${Math.ceil(remain)} dtk`, bx + bw / 2, 54, 13, COLORS.cream, '700', 'center');
  text(ctx, `Level ${state.level}`, 470, 40, 16, COLORS.cream, '700');
}

function drawOrderBoard(ctx, state, layout) {
  text(ctx, '📋 PESANAN', 28, 84, 16, COLORS.cream, '800');
  text(ctx, 'Klik piring jadi → klik tiketnya untuk antar', 150, 84, 13, 'rgba(255,243,214,0.65)', '600');
  for (const spot of layout.orders) {
    const order = state.orders.orders.find((o) => o.id === spot.id);
    if (!order) continue;
    const r = spot.rect;
    const urgent = isOrderUrgent(order);
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.rotate(order.tilt);
    ctx.translate(-r.w / 2, -r.h / 2);
    ctx.fillStyle = urgent ? '#ffe1e1' : COLORS.board;
    roundRect(ctx, 0, 0, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = urgent ? COLORS.danger : COLORS.boardEdge;
    ctx.lineWidth = urgent ? 4 : 2;
    roundRect(ctx, 1, 1, r.w - 2, r.h - 2, 10); ctx.stroke();
    ctx.restore();
    const cx = r.x + r.w / 2;
    emoji(ctx, order.recipe.emoji, r.x + 34, r.y + 34, 34);
    text(ctx, order.recipe.name, r.x + 58, r.y + 30, 17, COLORS.ink, '800');
    text(ctx, `Rp ${order.recipe.price}`, r.x + 58, r.y + 52, 13, COLORS.inkSoft, '700');
    // Recipe needs as small emoji.
    order.recipe.needs.forEach((need, i) => {
      emoji(ctx, INGREDIENTS[need].emoji, r.x + 34 + i * 34, r.y + 76, 22);
    });
    // Patience bar.
    const frac = patienceFraction(order);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, r.x + 14, r.y + r.h - 16, r.w - 28, 8, 4); ctx.fill();
    ctx.fillStyle = frac < 0.35 ? COLORS.danger : frac < 0.6 ? '#ffa502' : COLORS.ok;
    roundRect(ctx, r.x + 14, r.y + r.h - 16, (r.w - 28) * frac, 8, 4); ctx.fill();
    if (urgent) text(ctx, 'BURU-BURU!', r.x + r.w - 14, r.y + 22, 12, COLORS.danger, '800', 'right');
  }
  if (state.orders.orders.length === 0) {
    text(ctx, 'Belum ada pesanan… pelanggan segera datang!', 28, 150, 15, 'rgba(255,243,214,0.6)', '600');
  }
}

function drawBins(ctx, state, layout) {
  text(ctx, '🥕 BAHAN — klik untuk ambil', 28, 252, 15, COLORS.cream, '800');
  for (const bin of layout.bins) {
    const def = INGREDIENTS[bin.id];
    const r = bin.rect;
    const hovered = state.input.hover?.kind === 'bin' && state.input.hover?.id === bin.id;
    ctx.fillStyle = hovered ? '#e8b06a' : COLORS.counterTop;
    roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
    ctx.fillStyle = COLORS.counterFront;
    roundRect(ctx, r.x, r.y + r.h - 18, r.w, 18, 8); ctx.fill();
    emoji(ctx, def.emoji, r.x + r.w / 2, r.y + 34, 40);
    text(ctx, def.name, r.x + r.w / 2, r.y + 72, 15, COLORS.ink, '800', 'center');
    const prepLabel = def.prep === 'stove' ? '🔥 kompor' : def.prep === 'board' ? '🔪 talenan' : 'siap pakai';
    text(ctx, prepLabel, r.x + r.w / 2, r.y + 90, 11, COLORS.inkSoft, '600', 'center');
    text(ctx, `[${def.key}]`, r.x + r.w - 10, r.y + 18, 11, 'rgba(42,26,18,0.55)', '700', 'right');
  }
  text(ctx, 'Tangan:', 28, 620, 14, COLORS.cream, '700');
  if (state.input.hand) {
    const def = INGREDIENTS[state.input.hand];
    emoji(ctx, def.emoji, 92, 612, 30);
    text(ctx, def.name, 116, 618, 15, COLORS.cream, '700');
  } else {
    text(ctx, 'kosong', 92, 618, 15, 'rgba(255,243,214,0.55)', '600');
  }
}

function drawStoves(ctx, state, layout) {
  text(ctx, '🔥 KOMPOR — masak bahan mentah', 340, 252, 15, COLORS.cream, '800');
  for (const stove of layout.stoves) {
    const r = stove.rect;
    const slot = state.kitchen.stoves[stove.id].slot;
    const hovered = state.input.hover?.kind === 'stove' && state.input.hover?.id === stove.id;
    ctx.fillStyle = hovered ? '#5a4a6e' : '#3d2b52';
    roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
    // Burner circles.
    ctx.fillStyle = '#241627';
    ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + 58, 44, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = slot ? COLORS.ember : '#4a355e';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + 58, 36, 0, Math.PI * 2); ctx.stroke();
    if (slot) {
      const def = INGREDIENTS[slot.ingredientId];
      emoji(ctx, def.emoji, r.x + r.w / 2, r.y + 58, 40);
      if (!slot.done) {
        progressRing(ctx, r.x + r.w / 2, r.y + 58, 52, slot.progress, COLORS.ember);
        text(ctx, 'memasak…', r.x + r.w / 2, r.y + 116, 13, COLORS.cream, '700', 'center');
      } else {
        text(ctx, '✅ MATANG! klik untuk ambil', r.x + r.w / 2, r.y + 116, 13, COLORS.ok, '800', 'center');
      }
    } else {
      text(ctx, 'kompor kosong', r.x + r.w / 2, r.y + 116, 13, 'rgba(255,243,214,0.55)', '600', 'center');
    }
  }
}

function drawChoppingBoard(ctx, state, layout) {
  const r = layout.board.rect;
  const slot = state.kitchen.board.slot;
  const hovered = state.input.hover?.kind === 'board';
  text(ctx, '🔪 TALENAN', 772, 252, 15, COLORS.cream, '800');
  ctx.fillStyle = hovered ? '#8a5a2b' : '#6b4423';
  roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
  ctx.fillStyle = COLORS.board;
  roundRect(ctx, r.x + 14, r.y + 14, r.w - 28, r.h - 44, 8); ctx.fill();
  if (slot) {
    const def = INGREDIENTS[slot.ingredientId];
    emoji(ctx, def.emoji, r.x + r.w / 2, r.y + 58, 40);
    if (!slot.done) {
      progressRing(ctx, r.x + r.w / 2, r.y + 58, 52, slot.progress, COLORS.ok);
      text(ctx, 'memotong…', r.x + r.w / 2, r.y + 116, 13, COLORS.ink, '700', 'center');
    } else {
      text(ctx, '✅ SIAP! klik untuk ambil', r.x + r.w / 2, r.y + 116, 13, COLORS.ok, '800', 'center');
    }
  } else {
    emoji(ctx, '🥬', r.x + r.w / 2, r.y + 58, 34);
    text(ctx, 'taruh sayur di sini', r.x + r.w / 2, r.y + 116, 13, COLORS.inkSoft, '600', 'center');
  }
}

function drawPlates(ctx, state, layout) {
  text(ctx, '🍽️ PIRING RAKIT — susun sesuai resep', 340, 452, 15, COLORS.cream, '800');
  for (const plateSpot of layout.plates) {
    const plate = state.kitchen.plates[plateSpot.id];
    const r = plateSpot.rect;
    const recipe = recipeForNeeds(plate.items);
    const hovered = state.input.hover?.kind === 'plate' && state.input.hover?.id === plate.id;
    ctx.fillStyle = hovered ? '#e8b06a' : COLORS.counterTop;
    roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
    // The plate itself.
    ctx.fillStyle = COLORS.plate;
    ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + 78, 118, 52, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d9c48f';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + 78, 118, 52, 0, 0, Math.PI * 2); ctx.stroke();
    if (plate.items.length === 0) {
      text(ctx, 'piring kosong', r.x + r.w / 2, r.y + 82, 14, 'rgba(42,26,18,0.5)', '600', 'center');
    } else {
      plate.items.forEach((id, i) => {
        emoji(ctx, INGREDIENTS[id].emoji, r.x + 70 + i * 52, r.y + 78, 38);
      });
    }
    if (recipe) {
      text(ctx, `✅ ${recipe.name} — siap antar!`, r.x + r.w / 2, r.y + 136, 15, COLORS.ok, '800', 'center');
    } else if (plate.items.length > 0) {
      text(ctx, 'belum jadi resep…', r.x + r.w / 2, r.y + 136, 14, COLORS.inkSoft, '600', 'center');
    } else {
      text(ctx, 'klik bahan matang untuk merakit', r.x + r.w / 2, r.y + 136, 13, 'rgba(42,26,18,0.55)', '600', 'center');
    }
  }
}

function drawServeWindow(ctx, state, layout) {
  const r = layout.serve.rect;
  const hovered = state.input.hover?.kind === 'serve';
  text(ctx, '🛎️ JENDELA ANTAR', 1000, 452, 15, COLORS.cream, '800');
  ctx.fillStyle = hovered ? '#2f9e6e' : '#247a55';
  roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(ctx, r.x + 12, r.y + 12, r.w - 24, 62, 8); ctx.fill();
  emoji(ctx, '🧑‍🍳', r.x + 46, r.y + 44, 36);
  text(ctx, 'PELANGGAN', r.x + 76, r.y + 38, 15, COLORS.cream, '800');
  text(ctx, 'menunggu di sini', r.x + 76, r.y + 58, 12, 'rgba(255,243,214,0.75)', '600');
  text(ctx, 'Klik tiket pesanan', r.x + r.w / 2, r.y + 104, 15, COLORS.cream, '800', 'center');
  text(ctx, 'untuk mengantar piring jadi', r.x + r.w / 2, r.y + 126, 13, 'rgba(255,243,214,0.8)', '600', 'center');
  const ready = state.kitchen.plates.some((p) => recipeForNeeds(p.items));
  if (ready) {
    ctx.fillStyle = COLORS.gold;
    roundRect(ctx, r.x + 40, r.y + 138, r.w - 80, 0, 0); ctx.fill();
    text(ctx, '✨ ADA PIRING SIAP!', r.x + r.w / 2, r.y + 144, 13, COLORS.gold, '800', 'center');
  }
}

function drawTrash(ctx, layout) {
  const r = layout.trash.rect;
  ctx.fillStyle = '#4a355e';
  roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
  emoji(ctx, '🗑️', r.x + r.w / 2, r.y + 52, 36);
  text(ctx, 'Buang', r.x + r.w / 2, r.y + 100, 13, COLORS.cream, '700', 'center');
  text(ctx, 'bahan', r.x + r.w / 2, r.y + 118, 13, COLORS.cream, '700', 'center');
}

function drawFloaters(ctx, state) {
  for (const f of state.floaters) {
    const alpha = Math.max(0, f.life / f.maxLife);
    ctx.globalAlpha = alpha;
    text(ctx, f.text, f.x, f.y - (1 - alpha) * 30, 24, f.color, '800', 'center');
    ctx.globalAlpha = 1;
  }
}

function drawHand(ctx, state) {
  if (!state.input.hand) return;
  const def = INGREDIENTS[state.input.hand];
  const { x, y } = state.input.pointer;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
  emoji(ctx, def.emoji, x, y, 34);
}

function dimScreen(ctx, W, H) {
  ctx.fillStyle = 'rgba(20,10,28,0.72)';
  ctx.fillRect(0, 0, W, H);
}

function drawTitle(ctx, state, W, H) {
  dimScreen(ctx, W, H);
  ctx.fillStyle = COLORS.board;
  roundRect(ctx, W / 2 - 360, 150, 720, 470, 20); ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 4;
  roundRect(ctx, W / 2 - 360, 150, 720, 470, 20); ctx.stroke();
  text(ctx, '🍲 DAPUR SENJA', W / 2, 230, 52, COLORS.ink, '800', 'center');
  text(ctx, 'Warung masak kilat di ujung senja', W / 2, 272, 19, COLORS.inkSoft, '600', 'center');
  const lines = [
    '1️⃣  Klik bahan di rak kiri untuk mengambilnya.',
    '2️⃣  Masak di kompor 🔥, potong sayur di talenan 🔪.',
    '3️⃣  Rakit di piring 🍽️ sesuai resep di tiket pesanan.',
    '4️⃣  Klik tiketnya sebelum waktunya habis — dapat tip!',
    '⌨️  Tombol 1–6 ambil bahan • Spasi antar piring siap • P jeda',
  ];
  lines.forEach((line, i) => text(ctx, line, W / 2, 330 + i * 36, 17, COLORS.ink, '600', 'center'));
  ctx.fillStyle = COLORS.ember;
  roundRect(ctx, W / 2 - 170, 540, 340, 56, 28); ctx.fill();
  text(ctx, '▶  MULAI MASAK', W / 2, 577, 24, '#fff', '800', 'center');
  text(ctx, '150 detik • 3 nyawa • makin sore makin ramai', W / 2, 640, 14, COLORS.inkSoft, '600', 'center');
  void state;
}

function drawGameOver(ctx, state, W, H) {
  dimScreen(ctx, W, H);
  ctx.fillStyle = COLORS.board;
  roundRect(ctx, W / 2 - 330, 180, 660, 400, 20); ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 4;
  roundRect(ctx, W / 2 - 330, 180, 660, 400, 20); ctx.stroke();
  text(ctx, '🌇 WARUNG TUTUP', W / 2, 260, 44, COLORS.ink, '800', 'center');
  text(ctx, `Pesanan terantar: ${state.orders.served}  •  Hangus: ${state.orders.expired}`, W / 2, 320, 19, COLORS.inkSoft, '700', 'center');
  text(ctx, `🪙 ${state.coins} koin`, W / 2, 380, 30, COLORS.gold, '800', 'center');
  text(ctx, `Skor akhir: ${state.score}`, W / 2, 428, 26, COLORS.ink, '800', 'center');
  const verdict = state.score >= 2500 ? '🏆 Koki Senja Legendaris!' : state.score >= 1200 ? '👏 Warungmu ramai, Koki!' : '🍳 Latihan lagi besok, ya!';
  text(ctx, verdict, W / 2, 478, 20, COLORS.ember, '800', 'center');
  ctx.fillStyle = COLORS.ember;
  roundRect(ctx, W / 2 - 150, 510, 300, 50, 25); ctx.fill();
  text(ctx, '↻  MAIN LAGI  (R)', W / 2, 543, 20, '#fff', '800', 'center');
}

function drawPaused(ctx, W, H) {
  ctx.fillStyle = 'rgba(20,10,28,0.55)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, '⏸ JEDA — tekan P untuk lanjut', W / 2, H / 2, 32, COLORS.cream, '800', 'center');
}
