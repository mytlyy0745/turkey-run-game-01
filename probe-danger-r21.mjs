// Danger-frame probe, round 21 (finals): knife-distance-first selection.
// Replicates the shots.js danger autopilot run (90 s, HORIZON_PLAY) for
// seeds 1..500 and, per seed, keeps the frame where a knife is CLOSEST
// (true 2-D centre-to-turkey-rect distance, same geometry the round 15/16
// probes used: turkey rect x [330,392], top 400-y-74, bottom 400-y;
// knife centre sx = 330 + (e.x-distance)*16, cy = 400-e.y) among frames
// where the turkey is airborne over an oven. Tier A keeps the established
// jump floor (y 150..185, head clear of the HUD, feet clear of flames);
// tier B records y 120..150 as fallback only. A frame beats seed 19's
// current pick (47 px, knife BELOW the feet, 3265 pts) only if the knife
// is closer AND at body/beak level (side) or ahead, with a score that is
// not a collapse (>= 1500) — a closer knife under the feet is not better,
// it is the same weak story.
import { createRandom } from './game/src/random.js';
import { createWorld, KIND_OVEN, KIND_KNIFE, EVENT_OVER, EVENT_ESCAPED } from './game/src/world.js';
import { autopilot, HORIZON_PLAY } from './game/src/shots.js';
import { STEP, TURKEY, TURKEY_X, PX_PER_M, FIELD } from './game/src/config.js';

function ovenUnder(state) {
  for (const e of state.entities) {
    if (!e.active || e.kind !== KIND_OVEN) continue;
    const sx = TURKEY_X + (e.x - state.distance) * PX_PER_M;
    if (sx < TURKEY_X + TURKEY.width && sx + e.w * PX_PER_M > TURKEY_X) return true;
  }
  return false;
}
function ovenInFrame(state) {
  let ok = false;
  for (const e of state.entities) {
    if (!e.active || e.kind !== KIND_OVEN) continue;
    const sx = TURKEY_X + (e.x - state.distance) * PX_PER_M;
    if (sx < 0 || sx + e.w * PX_PER_M > FIELD.width) return false;
    if (sx > 480 && sx < 1150) ok = true;
  }
  return ok;
}
// True 2-D distance from a point to the turkey's collision rect.
function rectDist(px, py, rx0, ry0, rx1, ry1) {
  const dx = px < rx0 ? rx0 - px : px > rx1 ? px - rx1 : 0;
  const dy = py < ry0 ? ry0 - py : py > ry1 ? py - ry1 : 0;
  return Math.hypot(dx, dy);
}

function probeSeed(seed) {
  const world = createWorld(createRandom(seed));
  world.reset();
  let bestA = null, bestB = null;
  const steps = Math.floor(90 / STEP);
  for (let i = 0; i < steps; i += 1) {
    const events = world.step(STEP, autopilot(world.state, HORIZON_PLAY), false);
    const s = world.state;
    if (events & (EVENT_OVER | EVENT_ESCAPED)) break;
    if (s.elapsed < 25) continue;
    const y = s.player.y;
    const tier = y >= 150 && y < 185 ? 'A' : y >= 120 && y < 150 ? 'B' : null;
    if (!tier || !ovenUnder(s)) continue;
    const top = FIELD.groundY - TURKEY.height - y;
    const bot = FIELD.groundY - y;
    for (const e of s.entities) {
      if (!e.active || e.kind !== KIND_KNIFE) continue;
      const d = e.x - s.distance;
      if (d < -6 || d > 14) continue;
      const sx = TURKEY_X + d * PX_PER_M;
      const cy = FIELD.groundY - e.y;
      if (sx < -40 || sx > FIELD.width + 40 || cy < 0 || cy > FIELD.height) continue;
      const dist = rectDist(sx, cy, TURKEY_X, top, TURKEY_X + TURKEY.width, bot);
      const pos = cy < top ? 'above' : cy > bot ? 'below' : 'side';
      const horiz = sx < TURKEY_X ? 'behind' : sx > TURKEY_X + TURKEY.width ? 'ahead' : 'overlap';
      const cand = { seed, dist: Math.round(dist * 10) / 10, elapsed: +s.elapsed.toFixed(2), y: Math.round(y), score: Math.floor(s.score), dist_m: Math.floor(s.distance), combo: s.combo, bestCombo: s.bestCombo, lives: s.lives, stage: s.stage, knifeX: Math.round(sx), knifeY: Math.round(cy), knifeH: e.y, pos, horiz, shield: !!s.player.shield, pumpkin: s.player.pumpkin > 0, ovenInFrame: ovenInFrame(s), gap: +s.farmer.gap.toFixed(1) };
      const slot = tier === 'A' ? bestA : bestB;
      // Min distance wins; near-tie (<3 px) prefers the higher score.
      const better = !slot || cand.dist < slot.dist - 3 || (Math.abs(cand.dist - slot.dist) <= 3 && cand.score > slot.score);
      if (better) { if (tier === 'A') bestA = cand; else bestB = cand; }
    }
  }
  return { bestA, bestB };
}

const results = [];
for (let seed = 1; seed <= 500; seed += 1) {
  const r = probeSeed(seed);
  if (r.bestA) results.push(r.bestA);
  if (r.bestB) results.push({ ...r.bestB, tier: 'B' });
}
const a = results.filter((r) => !r.tier);
const b = results.filter((r) => r.tier === 'B');
a.sort((x, y) => x.dist - y.dist || y.score - x.score);
b.sort((x, y) => x.dist - y.dist || y.score - x.score);
console.log(`tier A (y 150-185, oven under): ${a.length}/500 seeds have a frame`);
console.log(`tier B (y 120-150, oven under): ${b.length}/500 seeds have a frame`);
console.log('--- TOP 25 tier A by knife distance ---');
for (const r of a.slice(0, 25)) console.log(`seed ${r.seed} dist ${r.dist}px ${r.pos}/${r.horiz} knife(${r.knifeX},${r.knifeY}) y=${r.y} t=${r.elapsed}s score ${r.score} ${r.dist_m}m combo x${r.combo} lives ${r.lives} stage ${r.stage} shield ${r.shield} pump ${r.pumpkin} ovenFrame ${r.ovenInFrame} gap ${r.gap}`);
console.log('--- tier A with dist < 47 AND score >= 1500 ---');
for (const r of a.filter((r) => r.dist < 47 && r.score >= 1500)) console.log(`seed ${r.seed} dist ${r.dist}px ${r.pos}/${r.horiz} knife(${r.knifeX},${r.knifeY}) y=${r.y} t=${r.elapsed}s score ${r.score} ${r.dist_m}m combo x${r.combo} lives ${r.lives} stage ${r.stage} shield ${r.shield} pump ${r.pumpkin} ovenFrame ${r.ovenInFrame}`);
console.log('--- tier A side/ahead knives (pos=side), dist < 100, score >= 1500, sorted by dist ---');
for (const r of a.filter((r) => r.pos === 'side' && r.dist < 100 && r.score >= 1500).sort((x, y) => x.dist - y.dist).slice(0, 15)) console.log(`seed ${r.seed} dist ${r.dist}px ${r.pos}/${r.horiz} knife(${r.knifeX},${r.knifeY}) y=${r.y} t=${r.elapsed}s score ${r.score} ${r.dist_m}m combo x${r.combo} lives ${r.lives} stage ${r.stage} shield ${r.shield} pump ${r.pumpkin} ovenFrame ${r.ovenInFrame}`);
console.log('--- TOP 10 tier B by knife distance ---');
for (const r of b.slice(0, 10)) console.log(`seed ${r.seed} dist ${r.dist}px ${r.pos}/${r.horiz} knife(${r.knifeX},${r.knifeY}) y=${r.y} t=${r.elapsed}s score ${r.score} ${r.dist_m}m combo x${r.combo} lives ${r.lives} stage ${r.stage} shield ${r.shield} pump ${r.pumpkin} ovenFrame ${r.ovenInFrame}`);
console.log('--- seed 19 reference (probe-best, same rule) ---');
for (const r of a.filter((r) => r.seed === 19)) console.log(JSON.stringify(r));
for (const r of b.filter((r) => r.seed === 19)) console.log('B:', JSON.stringify(r));
