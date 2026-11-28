// Turkey Run! — the rules and the state, with no drawing and no browser
// in it. The turkey runs right through four stages of autumn countryside
// while the farmer chases from behind; ovens and fences block the ground,
// the farmer throws carving knives, and corn, golden pumpkins and feathers
// reward a bold run. step() advances one fixed step and returns what
// happened as bit flags, so the caller can react without the world knowing
// about screens or sound. Nothing here allocates after createWorld returns,
// and every random choice comes from the seeded generator, so the same
// seed and the same inputs always give the same run.
import {
  FIELD, PX_PER_M, TURKEY_X, TOTAL_DISTANCE, TURKEY, FARMER, LIVES,
  OBSTACLE, KNIFE, PICKUP, HIDE, STAGES,
} from './config.js';

export const KIND_OVEN = 0;
export const KIND_FENCE = 1;
export const KIND_BALE = 2;
export const KIND_HAYSTACK = 3;
export const KIND_CORN = 4;
export const KIND_PUMPKIN = 5;
export const KIND_FEATHER = 6;
export const KIND_KNIFE = 7;

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_STAGE = 4;
export const EVENT_OVER = 8;
export const EVENT_ESCAPED = 16;
export const EVENT_THROW = 32;
export const EVENT_HIDE = 64;
export const EVENT_PUMPKIN = 128;

const STAGE_LEN = TOTAL_DISTANCE / STAGES.length;
const MAX_PARTICLES = 140;

function overlaps(ax, aw, ay, ah, bx, bw, by, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function createWorld(random) {
  // Two random streams. Gameplay decisions — obstacle patterns,
  // knife timing, spawn gaps — come from the injected generator, so
  // the same seed and inputs always give the same run. Cosmetic
  // effects — dust, embers, feather bursts, leaves — draw from a
  // separate stream seeded from the first gameplay draw, so a visual
  // fix can never silently reshuffle the run: before this split,
  // gating ember spawns changed how many draws the particle code
  // took and the autopilot escape rate jumped 3/20 to 8/20 with no
  // tuning change at all. Visual work must never move the difficulty.
  let pstate = (random() * 4294967296) >>> 0;
  function prandom() {
    pstate = (Math.imul(pstate, 1664525) + 1013904223) >>> 0;
    return pstate / 4294967296;
  }
  // One flat pool of entities; kinds tell the renderer what to draw.
  const entities = [];
  for (let i = 0; i < 96; i += 1) {
    entities.push({ active: false, kind: KIND_CORN, x: 0, y: 0, w: 0, h: 0, vx: 0, taken: false });
  }
  const particles = [];
  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    particles.push({ active: false, kind: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2 });
  }
  // Ambient scenery the renderer places from the seed: hills, trees,
  // fences, pumpkins and clouds, each fixed to a world distance.
  const scenery = [];
  for (let i = 0; i < 90; i += 1) {
    scenery.push({
      at: (i / 90) * TOTAL_DISTANCE + prandom() * 14,
      kind: Math.floor(prandom() * 5), // 0 tree, 1 fence, 2 pumpkin, 3 hay, 4 bush
      seed: prandom(),
      lane: prandom(),
    });
  }
  const clouds = [];
  for (let i = 0; i < 9; i += 1) {
    clouds.push({ x: prandom() * FIELD.width, y: 26 + prandom() * 90, s: 0.6 + prandom() * 0.9, v: 4 + prandom() * 7 });
  }
  const leaves = [];
  for (let i = 0; i < 26; i += 1) {
    leaves.push({ x: prandom() * FIELD.width, y: prandom() * FIELD.height, s: 3 + prandom() * 4, v: 12 + prandom() * 22, ph: prandom() * 6.28 });
  }

  const player = {
    y: 0, vy: 0, ducking: false, hiding: 0, hideCool: 0, invulnerable: 0,
    stamina: TURKEY.staminaMax, dashing: false, shield: false, pumpkin: 0,
    runPhase: 0, squash: 0, dead: false,
  };
  const farmer = { gap: FARMER.gapStart, surge: 0, windup: 0, throwTimer: KNIFE.firstThrowAt, anim: 0 };
  const state = {
    player, farmer, entities, particles, scenery, clouds, leaves,
    distance: 0, score: 0, lives: LIVES, stage: 0, elapsed: 0,
    combo: 0, comboTimer: 0, bestCombo: 0, corn: 0, pumpkins: 0, feathers: 0,
    hides: 0, knivesDodged: 0, over: false, escaped: false,
    nextSpawnAt: 26, flash: '', flashTimer: 0, banner: '', bannerTimer: 0,
    speed: 0, // m/s this step, for the HUD and the farmer chase
    shake: 0, hitFlash: 0, pop: 0, popKind: 0, comboPop: 0, // feel timers, decayed in step()
  };

  function reset() {
    player.y = 0; player.vy = 0; player.ducking = false; player.hiding = 0;
    player.hideCool = 0; player.invulnerable = 0; player.stamina = TURKEY.staminaMax;
    player.dashing = false; player.shield = false; player.pumpkin = 0;
    player.runPhase = 0; player.squash = 0; player.dead = false;
    farmer.gap = FARMER.gapStart; farmer.surge = 0; farmer.windup = 0;
    farmer.throwTimer = KNIFE.firstThrowAt; farmer.anim = 0;
    for (const e of entities) { e.active = false; e.taken = false; }
    for (const p of particles) p.active = false;
    state.distance = 0; state.score = 0; state.lives = LIVES; state.stage = 0;
    state.elapsed = 0; state.combo = 0; state.comboTimer = 0; state.bestCombo = 0;
    state.corn = 0; state.pumpkins = 0; state.feathers = 0; state.hides = 0;
    state.knivesDodged = 0; state.over = false; state.escaped = false;
    state.nextSpawnAt = 26; state.flash = ''; state.flashTimer = 0;
    state.banner = STAGES[0].name; state.bannerTimer = 2.6; state.speed = 0;
    state.shake = 0; state.hitFlash = 0; state.pop = 0; state.popKind = 0; state.comboPop = 0;
  }

  function freeEntity() {
    for (let i = 0; i < entities.length; i += 1) {
      if (!entities[i].active) {
        // A reused slot must not carry the last occupant's flags: a corn
        // kernel collected earlier leaves taken=true, and an oven reusing
        // that slot would otherwise be invisible yet still deadly.
        entities[i].taken = false;
        return entities[i];
      }
    }
    return null;
  }
  function freeParticle() {
    for (let i = 0; i < particles.length; i += 1) if (!particles[i].active) return particles[i];
    return null;
  }
  function burst(x, y, kind, n, spread, up) {
    for (let i = 0; i < n; i += 1) {
      const p = freeParticle();
      if (!p) return;
      p.active = true; p.kind = kind; p.x = x; p.y = y;
      p.vx = (prandom() - 0.5) * spread - 30; p.vy = -prandom() * up - 20;
      p.max = 0.5 + prandom() * 0.6; p.life = p.max; p.size = 3 + prandom() * 5;
    }
  }
  function dust() {
    const p = freeParticle();
    if (!p) return;
    p.active = true; p.kind = 0; p.x = TURKEY_X + 6; p.y = FIELD.groundY - 4;
    p.vx = -60 - prandom() * 40; p.vy = -14 - prandom() * 22;
    p.max = 0.5; p.life = 0.5; p.size = 4 + prandom() * 5;
  }
  function ember(x, y) {
    const p = freeParticle();
    if (!p) return;
    p.active = true; p.kind = 2; p.x = x + (prandom() - 0.5) * 60; p.y = y;
    p.vx = (prandom() - 0.5) * 14; p.vy = -26 - prandom() * 40;
    p.max = 0.7 + prandom() * 0.5; p.life = p.max; p.size = 2 + prandom() * 3;
  }

  function spawnPattern(at) {
    const roll = random();
    const e = freeEntity();
    if (!e) return;
    if (roll < 0.24) { // a glowing oven squatting on the path — jump it
      e.active = true; e.kind = KIND_OVEN; e.x = at; e.y = 0;
      e.w = OBSTACLE.ovenWidthM; e.h = 56;
    } else if (roll < 0.5) { // a farm fence — jump it
      e.active = true; e.kind = KIND_FENCE; e.x = at; e.y = 0;
      e.w = OBSTACLE.fenceWidthM; e.h = 44;
    } else if (roll < 0.68) { // a round hay bale — jump it
      e.active = true; e.kind = KIND_BALE; e.x = at; e.y = 0;
      e.w = OBSTACLE.baleWidthM; e.h = 40;
    } else if (roll < 0.8) { // a haystack to hide in — duck beside it
      e.active = true; e.kind = KIND_HAYSTACK; e.x = at; e.y = 0;
      e.w = 4.2; e.h = 72;
    } else { // a corn arc — three kernels over a low fence
      const f = freeEntity();
      if (f) { f.active = true; f.kind = KIND_FENCE; f.x = at; f.y = 0; f.w = OBSTACLE.fenceWidthM; f.h = 36; }
      for (let i = 0; i < 3; i += 1) {
        const c = freeEntity();
        if (!c) break;
        c.active = true; c.kind = KIND_CORN; c.x = at - 1.6 + i * 1.6; c.taken = false;
        c.y = i === 1 ? 86 : 40; c.w = 0.9; c.h = 0.9;
      }
    }
    // Rare treats, seeded by distance so a run always has a few.
    const treat = random();
    if (treat < 0.055) {
      const p = freeEntity();
      if (p) { p.active = true; p.kind = KIND_PUMPKIN; p.x = at + 6 + random() * 4; p.y = 36; p.w = 1.2; p.h = 1.2; p.taken = false; }
    } else if (treat < 0.11) {
      const p = freeEntity();
      if (p) { p.active = true; p.kind = KIND_FEATHER; p.x = at + 6 + random() * 4; p.y = 62; p.w = 1; p.h = 1; p.taken = false; }
    } else if (treat < 0.3) {
      for (let i = 0; i < 2; i += 1) {
        const c = freeEntity();
        if (!c) break;
        c.active = true; c.kind = KIND_CORN; c.x = at + 3 + i * 2.2; c.taken = false;
        c.y = 30; c.w = 0.9; c.h = 0.9;
      }
    }
  }

  function throwKnife() {
    const e = freeEntity();
    if (!e) return;
    e.active = true; e.kind = KIND_KNIFE; e.x = state.distance - farmer.gap;
    e.y = random() < 0.5 ? KNIFE.highY : KNIFE.lowY; e.w = 1.1; e.h = 0.6;
    e.vx = KNIFE.speed;
    farmer.windup = 0.45;
  }

  function hurt(events, knifeHit) {
    if (player.invulnerable > 0 || player.pumpkin > 0) return events;
    // Hit feedback only: white flash, plus shake for a knife hit.
    state.hitFlash = 0.22;
    if (knifeHit) state.shake = 1;
    if (player.shield) {
      player.shield = false;
      farmer.gap = Math.max(0, farmer.gap - FARMER.shieldCost);
      burst(TURKEY_X + 30, FIELD.groundY - 60, 1, 10, 160, 120);
      state.flash = 'SHIELD SHATTERED!'; state.flashTimer = 1.2;
      return events | EVENT_HIT;
    }
    state.lives -= 1;
    player.invulnerable = TURKEY.invulnerable;
    player.squash = 1;
    farmer.gap = Math.max(0, farmer.gap - FARMER.hitCost);
    farmer.surge = FARMER.surgeTime;
    state.combo = 0; state.comboTimer = 0;
    burst(TURKEY_X + 30, FIELD.groundY - 60, 1, 16, 260, 220);
    state.flash = state.lives > 0 ? 'OUCH! HE\'S CLOSER!' : '';
    state.flashTimer = 1.4;
    events |= EVENT_HIT;
    if (state.lives <= 0) {
      state.over = true;
      player.dead = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  function collectCorn() {
    state.corn += 1;
    state.combo = Math.min(PICKUP.comboMax, state.combo + 1);
    state.comboTimer = PICKUP.comboWindow;
    state.comboPop = 0.22; // COMBO pill bounce
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    state.score += PICKUP.cornPoints * state.combo;
    state.pop = 0.35; state.popKind = 0; // pickup pop ring
    // Dropped kernels distract the farmer: every corn buys a little room.
    farmer.gap = Math.min(FARMER.gapMax, farmer.gap + 0.5);
    burst(TURKEY_X + 30, FIELD.groundY - 70 - player.y, 3, 6, 120, 140);
  }

  // input: { jump, dash, duck, left, right } — booleans this step.
  function step(dt, input, harmless) {
    let events = 0;
    // Feel timers decay first, so none freezes on the end screen.
    if (state.shake > 0) state.shake -= dt * 2.5;
    if (state.hitFlash > 0) state.hitFlash -= dt;
    if (state.pop > 0) state.pop -= dt;
    if (state.comboPop > 0) state.comboPop -= dt;
    if (state.over || state.escaped) return events;
    state.elapsed += dt;
    const stage = Math.min(STAGES.length - 1, Math.floor(state.distance / STAGE_LEN));
    if (stage !== state.stage) {
      state.stage = stage;
      state.banner = STAGES[stage].name;
      state.bannerTimer = 2.6;
      state.score += PICKUP.stageBonus;
      state.flash = `${STAGES[stage].name}  +${PICKUP.stageBonus}`;
      state.flashTimer = 1.6;
      events |= EVENT_STAGE;
    }
    if (state.flashTimer > 0) state.flashTimer -= dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    // --- the turkey ---
    const onGround = player.y <= 0;
    player.ducking = !!input.duck && onGround && player.hiding <= 0;
    // Jump buffering lives in input.js: pilots drive step() directly,
    // so a buffer here moved the end pilot's lives 2 -> 4 and put a
    // shield ring on the hero turkey. See input.js takeActions().
    if (input.jump && onGround && player.hiding <= 0) {
      player.vy = TURKEY.jumpVel;
      player.y = 0.1;
      dust(); dust();
    }
    player.vy -= TURKEY.gravity * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) {
      if (player.vy < -500) { player.squash = 1; dust(); dust(); dust(); dust(); dust(); }
      player.y = 0; player.vy = 0;
    }
    if (player.squash > 0) player.squash = Math.max(0, player.squash - dt * 3);
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.pumpkin > 0) player.pumpkin -= dt;
    if (player.hideCool > 0) player.hideCool -= dt;

    // Hiding: duck beside a haystack and the farmer loses the trail.
    if (player.hiding > 0) {
      player.hiding -= dt;
      if (player.hiding <= 0) player.hiding = 0;
    } else if (input.duck && onGround && player.hideCool <= 0) {
      for (const e of entities) {
        if (e.active && e.kind === KIND_HAYSTACK && Math.abs(e.x - state.distance) < 3.2) {
          player.hiding = HIDE.time;
          player.hideCool = HIDE.cooldown;
          farmer.gap = Math.min(FARMER.gapMax, farmer.gap + FARMER.hideBonus);
          state.hides += 1;
          state.flash = 'HIDDEN! HE RAN PAST!';
          state.flashTimer = 1.4;
          events |= EVENT_HIDE;
          break;
        }
      }
    }

    // Speed: cruise, plus a lean, minus easing off, plus a dash.
    const wantDash = !!input.dash && player.stamina > 1 && player.hiding <= 0;
    player.dashing = wantDash;
    if (wantDash) player.stamina = Math.max(0, player.stamina - TURKEY.staminaDrain * dt);
    else player.stamina = Math.min(TURKEY.staminaMax, player.stamina + TURKEY.staminaRegen * dt);
    let speed = TURKEY.cruise;
    if (input.right) speed += TURKEY.push;
    if (input.left) speed -= TURKEY.ease;
    if (wantDash) speed += TURKEY.dashBonus;
    if (player.pumpkin > 0) speed += 2.0;
    if (player.hiding > 0) speed = 0;
    if (player.dead) speed = 0;
    state.speed = speed;
    if (!harmless) state.distance += speed * dt;
    player.runPhase += dt * (4 + speed * 1.1);

    // --- the farmer ---
    farmer.anim += dt * (6 + speed);
    if (farmer.surge > 0) farmer.surge -= dt;
    if (farmer.windup > 0) farmer.windup -= dt;
    let farmerSpeed = FARMER.base + FARMER.perStage * state.stage;
    if (farmer.gap > FARMER.catchUpGap) farmerSpeed += FARMER.catchUp;
    if (farmer.surge > 0) farmerSpeed += FARMER.surge;
    if (farmer.windup > 0) farmerSpeed -= FARMER.throwSlow;
    if (player.hiding > 0) farmerSpeed += 1.5; // he sprints past the haystack
    // The gap grows when the turkey outruns the farmer, and shrinks when
    // the farmer is faster — a caught turkey is a gap of zero.
    if (!harmless) farmer.gap += (speed - farmerSpeed) * dt;
    farmer.gap = Math.max(0, Math.min(FARMER.gapMax, farmer.gap));
    if (farmer.gap <= 0 && !harmless) {
      state.over = true;
      player.dead = true;
      events |= EVENT_OVER;
      return events;
    }

    // --- knives ---
    farmer.throwTimer -= dt;
    if (farmer.throwTimer <= 0 && !harmless) {
      throwKnife();
      farmer.throwTimer = KNIFE.interval[0] - (KNIFE.interval[0] - KNIFE.interval[1]) * (state.stage / (STAGES.length - 1)) + random() * 1.2;
      events |= EVENT_THROW;
    }

    // --- spawning ---
    while (state.distance + OBSTACLE.spawnAheadM > state.nextSpawnAt && state.nextSpawnAt < TOTAL_DISTANCE - 40) {
      spawnPattern(state.nextSpawnAt);
      state.nextSpawnAt += OBSTACLE.minGapM + random() * (OBSTACLE.maxGapM - OBSTACLE.minGapM);
    }

    // --- entities ---
    const px = TURKEY_X;
    const turkeyTop = FIELD.groundY - (player.ducking ? TURKEY.duckHeight : TURKEY.height) - player.y;
    const turkeyBot = FIELD.groundY - player.y;
    for (const e of entities) {
      if (!e.active) continue;
      if (e.kind === KIND_KNIFE) {
        e.x += e.vx * dt;
        if (e.x < state.distance - farmer.gap - 6 || e.x > state.distance + 70) {
          if (e.x > state.distance + 2 && !harmless) { state.knivesDodged += 1; state.score += 15; }
          e.active = false;
          continue;
        }
        if (harmless || player.hiding > 0 || player.invulnerable > 0 || player.pumpkin > 0) continue;
        const knifeScreenY = FIELD.groundY - e.y;
        const knifeScreenX = px + (e.x - state.distance) * PX_PER_M;
        const knifeH = 26;
        if (Math.abs(e.x - state.distance) < 1.0 && overlaps(px, TURKEY.width, turkeyTop, turkeyBot - turkeyTop, knifeScreenX - 16, 34, knifeScreenY - knifeH / 2, knifeH)) {
          e.active = false;
          events = hurt(events, true); // knife hit: shake the frame
          if (events & EVENT_OVER) return events;
        }
        continue;
      }
      const sx = px + (e.x - state.distance) * PX_PER_M;
      if (sx < -260 || sx > FIELD.width + 260) {
        if (sx < -260) e.active = false;
        continue;
      }
      if (harmless || player.hiding > 0) continue;
      const top = FIELD.groundY - e.h - (e.kind === KIND_CORN || e.kind === KIND_PUMPKIN || e.kind === KIND_FEATHER ? e.y : 0);
      const bot = FIELD.groundY - (e.kind === KIND_CORN || e.kind === KIND_PUMPKIN || e.kind === KIND_FEATHER ? e.y : 0);
      const wPx = e.w * PX_PER_M;
      if (e.kind === KIND_CORN || e.kind === KIND_PUMPKIN || e.kind === KIND_FEATHER) {
        if (e.taken) continue;
        const cx = sx + wPx / 2;
        if (Math.abs(cx - (px + TURKEY.width / 2)) < 46 && turkeyTop < bot && turkeyBot > top) {
          e.taken = true; e.active = false;
          if (e.kind === KIND_CORN) { collectCorn(); events |= EVENT_PICKUP; }
          else if (e.kind === KIND_PUMPKIN) {
            state.pumpkins += 1; player.pumpkin = PICKUP.pumpkinTime;
            farmer.gap = Math.min(FARMER.gapMax, farmer.gap + PICKUP.pumpkinGap);
            state.score += PICKUP.pumpkinPoints;
            state.pop = 0.35; state.popKind = 1;
            state.flash = 'GOLDEN PUMPKIN! UNTOUCHABLE!';
            state.flashTimer = 1.6;
            burst(TURKEY_X + 30, FIELD.groundY - 80, 3, 14, 200, 200);
            events |= EVENT_PUMPKIN;
          } else {
            state.feathers += 1; player.shield = true;
            state.score += 50;
            state.pop = 0.35; state.popKind = 2;
            state.flash = 'FEATHER SHIELD!';
            state.flashTimer = 1.4;
            events |= EVENT_PICKUP;
          }
        }
        continue;
      }
      // Solid hazards: oven, fence, bale, haystack.
      if (player.invulnerable > 0 || player.pumpkin > 0) {
        if (player.pumpkin > 0 && overlaps(px + 8, TURKEY.width - 16, turkeyTop, turkeyBot - turkeyTop, sx, wPx, FIELD.groundY - e.h, e.h)) {
          e.active = false; // golden turkey smashes straight through
          state.score += 40;
          burst(sx + wPx / 2, FIELD.groundY - e.h / 2, 0, 8, 200, 160);
        }
        continue;
      }
      if (overlaps(px + 10, TURKEY.width - 20, turkeyTop, turkeyBot - turkeyTop, sx, wPx, FIELD.groundY - e.h, e.h)) {
        if (e.kind === KIND_HAYSTACK) continue; // haystacks are soft — hiding spots, not walls
        e.active = false;
        events = hurt(events);
        if (events & EVENT_OVER) return events;
      }
    }

    // --- score from distance, and the finish line ---
    if (!harmless) state.score += speed * dt;
    if (state.distance >= TOTAL_DISTANCE && !harmless) {
      state.escaped = true;
      state.score += PICKUP.escapeBonus;
      events |= EVENT_ESCAPED;
      return events;
    }

    // --- particles: dust at the feet, embers over ovens, drifting leaves ---
    if (onGround && speed > 1 && player.hiding <= 0) {
      if (prandom() < dt * 9) dust();
    }
    // Embers only rise from an oven the turkey has not passed yet: a
    // passed oven's embers used to keep spawning and drift behind the
    // farmer in mid-air, a little rootless flame with no oven under
    // it. The centre-ahead test stops the spawn the moment the oven
    // is under the turkey, and the embers already up scroll away
    // with their oven (see the particle drift below) instead of
    // hanging around after it has gone.
    for (const e of entities) {
      if (e.active && e.kind === KIND_OVEN && e.x + e.w / 2 > state.distance) {
        const sx = px + (e.x - state.distance) * PX_PER_M;
        if (sx > -100 && sx < FIELD.width + 100 && prandom() < dt * 14) ember(sx + e.w * PX_PER_M / 2, FIELD.groundY - 60);
      }
    }
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      // Dust and feathers trail behind at a third of world speed, so
      // they hang in the air where the turkey was. Embers are pinned
      // to their oven, so they scroll at full world speed and stay
      // above it — at a third they lagged behind and floated over
      // the farmer long after the oven had scrolled past.
      const drift = p.kind === 2 ? 1 : 0.35;
      p.x += p.vx * dt - speed * PX_PER_M * dt * drift;
      p.y += p.vy * dt;
      if (p.kind === 0) p.vy -= 8 * dt;
      else if (p.kind === 1) { p.vy += 260 * dt; p.vx *= 0.98; }
    }
    for (const c of clouds) {
      c.x += c.v * dt;
      if (c.x > FIELD.width + 160) c.x = -160;
    }
    for (const l of leaves) {
      l.y += l.v * dt; l.x += Math.sin(state.elapsed * 1.4 + l.ph) * 22 * dt - speed * 2 * dt;
      if (l.y > FIELD.height) { l.y = -8; l.x = prandom() * FIELD.width; }
      if (l.x < -10) l.x = FIELD.width + 8;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
