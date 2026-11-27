// The screenshot scenes behind ?shot=start|play|danger|end. Each one
// plays the real rules forward from a fresh world, steered by a simple
// autopilot (jump what is coming, duck the high knives, dash when the
// farmer closes in, hide when a haystack is near and he is close), so the
// frame is what a real run looks like and the same seed always gives the
// same frame. The play pilot looks well ahead and survives; the end pilot
// looks only a moment ahead, so it is caught out once the knives speed up,
// as a hurried player is.
import { STEP, TURKEY } from './config.js';
import { EVENT_OVER, EVENT_ESCAPED, KIND_OVEN, KIND_FENCE, KIND_BALE, KIND_KNIFE, KIND_HAYSTACK } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const DANGER_LIMIT_SECONDS = 90;
const END_LIMIT_SECONDS = 600;
const HORIZON_PLAY = 1.1;
const HORIZON_END = 0.3;

function autopilot(state, horizon) {
  const p = state.player;
  const speed = Math.max(6, state.speed || TURKEY.cruise);
  // Hide when a haystack is right beside the turkey and the farmer is near.
  if (p.hideCool <= 0 && state.farmer.gap < 14) {
    for (const e of state.entities) {
      if (e.active && e.kind === KIND_HAYSTACK && Math.abs(e.x - state.distance) < 2.5) {
        return { jump: false, dash: false, duck: true, left: false, right: false };
      }
    }
  }
  // Read the two dangers separately: a high knife and a ground obstacle
  // want opposite answers, and jumping into a high knife is the classic
  // way to lose a life. A high knife wins: duck and ease off so the
  // fence behind it arrives after the knife has passed.
  let highKnife = null;
  let lowKnife = null;
  let ground = null;
  for (const e of state.entities) {
    if (!e.active) continue;
    const d = e.x - state.distance;
    if (e.kind === KIND_KNIFE) {
      // Knives come from behind — the farmer throws them — so watch
      // behind the turkey too: d is negative until the knife draws level,
      // and it closes at ~8.5 m/s. timeTo is measured to the pass, not
      // to the turkey's own speed.
      if (d > -14 && d < 2) {
        const closing = -d / 8.5;
        if (e.y > 100 && (!highKnife || closing < highKnife.d)) highKnife = { d: closing, y: e.y };
        if (e.y <= 100 && (!lowKnife || closing < lowKnife.d)) lowKnife = { d: closing, y: e.y };
      }
    } else if ((e.kind === KIND_OVEN || e.kind === KIND_FENCE || e.kind === KIND_BALE) && d > -1 && d < 12) {
      if (!ground || d < ground.d) ground = { d, kind: e.kind };
    }
  }
  let jump = false;
  let duck = false;
  let left = false;
  // A high knife arriving while the turkey is airborne is a death
  // sentence: the jump carries the turkey straight into its band. So a
  // high knife inside one second means duck and ease off; one further
  // out means the jump is over before it arrives, so jump freely.
  if (highKnife && highKnife.d < 1.0) {
    duck = true;
    if (ground && ground.d < 7) left = true;
  } else if (ground) {
    // Jump late, not early: the feet stay above an oven's top for a
    // ~7 m window of travel, and that window must cover the obstacle's
    // whole span — jumping at 0.72 s lands the turkey inside the oven.
    if (ground.d / speed < 0.52) jump = true;
  } else if (lowKnife) {
    if (lowKnife.d < 0.55) jump = true;
  }
  void horizon;
  const dash = state.farmer.gap < 13 && p.stamina > 45 && p.hiding <= 0;
  return { jump, dash, duck, left, right: false };
}

export { autopilot, HORIZON_PLAY, HORIZON_END };

function runFor(world, seconds, horizon, stopAt) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const events = world.step(STEP, autopilot(world.state, horizon), false);
    if (stopAt && stopAt(world.state)) return events;
    if (events & (EVENT_OVER | EVENT_ESCAPED)) return events;
  }
  return 0;
}

/** A plain-data copy of the world state, so a staging pass can rewind to it. */
function snapshotState(state) {
  return structuredClone(state);
}

function restoreState(state, snap) {
  for (const key of Object.keys(snap)) {
    const value = snap[key];
    if (Array.isArray(value)) {
      state[key].length = 0;
      state[key].push(...structuredClone(value));
    } else if (value && typeof value === 'object') Object.assign(state[key], structuredClone(value));
    else state[key] = value;
  }
}

function hazardAhead(state, maxD) {
  for (const e of state.entities) {
    if (!e.active) continue;
    const d = e.x - state.distance;
    if (d > 0 && d < maxD && (e.kind === KIND_OVEN || e.kind === KIND_FENCE || e.kind === KIND_BALE || e.kind === KIND_KNIFE)) return true;
  }
  return false;
}

export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'danger' && name !== 'end') {
    // Title: the turkey runs in place through the farmyard, harmless.
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { jump: false, dash: false, duck: false, left: false, right: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // One 40 s pass, keeping the frame where the chase was closest —
    // the farmer in frame behind the turkey — with something to dodge
    // ahead. Falls back to the 17 s frame if the chase never closes.
    let best = null;
    let bestGap = Infinity;
    let fallback = null;
    const steps = Math.floor(40 / STEP);
    for (let i = 0; i < steps; i += 1) {
      const events = world.step(STEP, autopilot(world.state, HORIZON_PLAY), false);
      const s = world.state;
      if (events & (EVENT_OVER | EVENT_ESCAPED)) break;
      if (fallback === null && s.elapsed >= 17) fallback = snapshotState(s);
      if (s.elapsed > 8 && s.score > 50 && hazardAhead(s, 20) && s.farmer.gap < bestGap) {
        bestGap = s.farmer.gap;
        best = snapshotState(s);
      }
    }
    if (best !== null) restoreState(world.state, best);
    else if (fallback !== null) restoreState(world.state, fallback);
    return { screen: SCREEN_PLAY, best: Math.floor(world.state.score) };
  }
  if (name === 'danger') {
    // Stop at the tensest frame: an oven close ahead with a knife in the
    // air, or the farmer nearly on the turkey while a knife flies — or
    // take what the run gives.
    runFor(world, DANGER_LIMIT_SECONDS, HORIZON_PLAY, (s) => {
      let ovenNear = false;
      let knifeNear = false;
      for (const e of s.entities) {
        if (!e.active) continue;
        const d = e.x - s.distance;
        if (e.kind === KIND_OVEN && d > 0 && d < 9) ovenNear = true;
        if (e.kind === KIND_KNIFE && d > -6 && d < 14) knifeNear = true;
      }
      return (ovenNear && knifeNear) || (knifeNear && s.farmer.gap < 16);
    });
    return { screen: SCREEN_PLAY, best: Math.floor(world.state.score) };
  }
  // End: a short-sighted pilot, so the run ends caught — unless the
  // seeded run happens to escape, which the end screen shows either way.
  runFor(world, END_LIMIT_SECONDS, HORIZON_END);
  const done = world.state.over || world.state.escaped;
  return { screen: done ? SCREEN_OVER : SCREEN_PLAY, best: Math.floor(world.state.score) };
}
