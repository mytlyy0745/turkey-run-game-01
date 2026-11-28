// Keyboard and pointer input for Turkey Run! Held keys steer the run;
// one-shot presses (jump, pause, mute, restart) are queued as flags and
// taken once by the loop, so a press between two frames is never lost and
// never counted twice. The mouse jumps on click and dashes while held.
export const ACTION_JUMP = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const JUMP = new Set(['ArrowUp', 'KeyW', 'Space']);
const DUCK = new Set(['ArrowDown', 'KeyS']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR', 'Enter']);

export function createInput(target) {
  let left = false;
  let right = false;
  let duck = false;
  let dash = false;
  let actions = 0;
  let jumpBuf = 0; // frames left of a buffered jump press (~0.1 s at 60 fps)

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (JUMP.has(event.code)) {
      if (!event.repeat) { actions |= ACTION_JUMP; jumpBuf = 6; }
    } else if (DUCK.has(event.code)) duck = true;
    else if (DASH.has(event.code)) dash = true;
    else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (DUCK.has(event.code)) duck = false;
    else if (DASH.has(event.code)) dash = false;
  });
  window.addEventListener('blur', () => {
    left = false; right = false; duck = false; dash = false; jumpBuf = 0;
  });
  target.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    actions |= ACTION_JUMP;
    jumpBuf = 6;
  });

  return {
    // The held steering state the world reads every step.
    held() {
      return { left, right, duck, dash };
    },
    takeActions() {
      // Buffered jump: re-assert for a few frames, so the next
      // grounded step jumps. Never while duck is held (that would
      // jump the bird into the high knife it was ducking). Pilots
      // drive world.step() directly, so their runs are untouched.
      if (jumpBuf > 0) {
        jumpBuf -= 1;
        if (!duck) actions |= ACTION_JUMP;
      }
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
