// Turkey Run! — the hand-in program (Node 22, standard library only).
//
// It gathers this repository's game/ and screenshots/ into the output
// directory and writes dossier.json there — the summary the make.fun judge
// reads — using the vendored library from vendor/makefun-game.ts.
//
// The grader runs it as `node main.ts` with MAKEFUN_OUTPUT_DIR=/output.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// One caution baked in from earlier entries: the output directory itself
// must never be removed (the grader bind-mounts it, and removing it fails
// with EBUSY). Only its contents are cleared, entry by entry, before the
// fresh copy goes in.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

// Clear the output directory's contents, leaving the directory itself.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

// The game first, then the screenshots beside it.
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

// Refuse a broken hand-in early: the gate wants 3–4 screenshots, each at
// most 256 KiB, so check that here instead of shipping a bad dossier.
const shots = readdirSync(join(outDir, 'screenshots')).filter((n) => !n.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3-4 screenshots, found ${shots.length}`);
}
for (const shot of shots) {
  const bytes = statSync(join(outDir, 'screenshots', shot)).size;
  if (bytes > 262144) throw new Error(`screenshot ${shot} is ${bytes} bytes, over the 256 KiB cap`);
}

// Caps the sealed gate enforces (kit RULES.txt): at most 4 screenshots of
// at most 256 KiB; game/ at most 993 files and 48 MiB, paths at most
// 1000 bytes; the dossier's text at most 160 KiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Turkey Run! handed in: ${shots.length} screenshots, dossier ${dossier.length} bytes -> ${outDir}`);
