// Dapur Senja — main.ts (Node 22, standard library only)
// The hand-in program: it copies this repository's game/ and screenshots/
// into the grader's output directory and writes dossier.json with the
// vendored make.fun library, exactly as the competition's rules describe.
// It is deterministic on purpose: the grader runs it twice and both runs
// must write the same bytes, so it reads nothing outside this repository
// and stamps nothing with the time. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
// Only copy screenshots when the folder holds at least one shot, so an
// empty folder never leaves a stale image behind from an earlier run.
if (existsSync(join(here, 'screenshots')) && readdirSync(join(here, 'screenshots')).length > 0) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps mirror the gate's own limits, so a local run refuses what the
// scorer would refuse: at most 4 screenshots of 256 KiB each, at most 993
// files / 48 MiB under game/, paths under 1,000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
