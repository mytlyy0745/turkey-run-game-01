// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens:
// title, play, paused and game over (caught or escaped).
//
// ?seed=N fixes the run. ?shot=start|play|danger|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_OVER, EVENT_ESCAPED, EVENT_PICKUP, EVENT_PUMPKIN, EVENT_STAGE, EVENT_THROW } from './world.js';
import { ACTION_JUMP, ACTION_PAUSE, ACTION_MUTE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const MAX_STEPS = 5; // per frame: after a hitch, drop the backlog instead of
// catching up in one long burst (spiral-of-death guard). The world only
// ever sees fixed STEPs, so a dropped backlog costs game time, never
// determinism — pilots call step() directly and are unaffected.

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let jumpQueued = false;
  // Render interpolation (visual only, never fed back into the world):
  // the previous step boundary's scroll/jump/gap/elapsed, so a frame
  // drawn between two fixed steps can show where the run is *now*
  // instead of the last step — smooth on 120 Hz displays, identical
  // output on 60 Hz (alpha ~ 0) and in screenshots (runShot never
  // comes through here). Reused objects: no allocation per frame.
  const prev = { distance: 0, elapsed: 0, y: 0, gap: 24, runPhase: 0, anim: 0 };
  const viewPlayer = {};
  const viewFarmer = {};
  const view = {};
  function renderView() {
    const alpha = accumulator >= STEP ? 0 : accumulator / STEP;
    Object.assign(view, world.state);
    Object.assign(viewPlayer, world.state.player);
    Object.assign(viewFarmer, world.state.farmer);
    view.player = viewPlayer;
    view.farmer = viewFarmer;
    view.distance = prev.distance + (world.state.distance - prev.distance) * alpha;
    view.elapsed = prev.elapsed + (world.state.elapsed - prev.elapsed) * alpha;
    viewPlayer.y = prev.y + (world.state.player.y - prev.y) * alpha;
    viewPlayer.runPhase = prev.runPhase + (world.state.player.runPhase - prev.runPhase) * alpha;
    viewFarmer.gap = prev.gap + (world.state.farmer.gap - prev.gap) * alpha;
    viewFarmer.anim = prev.anim + (world.state.farmer.anim - prev.anim) * alpha;
    renderer.draw(view, screen, best);
  }

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    jumpQueued = false;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startWind();
    audio.gobble();
    announce(`Run! ${LIVES} lives. Outrun the farmer.`);
  }

  function endGame(escaped) {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = Math.floor(world.state.score);
      saveBest(best);
    }
    if (escaped) audio.escaped();
    else audio.caught();
    announce(escaped ? `Escaped! Score ${Math.floor(world.state.score)}.` : `Caught. Score ${Math.floor(world.state.score)}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      startGame();
      return;
    }
    if (actions & ACTION_JUMP) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_PLAY) jumpQueued = true;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { jump: false, dash: false, duck: false, left: false, right: false }, true);
      return;
    }
    const held = input.held();
    const events = world.step(STEP, {
      jump: jumpQueued, dash: held.dash, duck: held.duck, left: held.left, right: held.right,
    }, false);
    jumpQueued = false;
    if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_ESCAPED) endGame(true);
    else if (events & EVENT_HIT) announce(world.state.lives === 1 ? 'Hit! 1 life left.' : `Hit! ${world.state.lives} lives left.`);
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_PICKUP) audio.pickup(world.state.combo);
    if (events & EVENT_PUMPKIN) audio.pumpkin();
    if (events & EVENT_STAGE) audio.stage();
    if (events & EVENT_THROW) audio.knife();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    prev.distance = world.state.distance;
    prev.elapsed = world.state.elapsed;
    prev.y = world.state.player.y;
    prev.gap = world.state.farmer.gap;
    prev.runPhase = world.state.player.runPhase;
    prev.anim = world.state.farmer.anim;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let steps = 0;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY) && steps < MAX_STEPS) {
        step();
        accumulator -= STEP;
        steps += 1;
      }
      if (accumulator >= STEP) accumulator = 0;
    } else {
      accumulator = 0;
    }
    renderView();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Turkey Run. Press Space or click to run.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
