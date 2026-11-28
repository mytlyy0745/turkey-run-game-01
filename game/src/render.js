// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x480 playfield is scaled to fit the window and centred. Every
// picture is drawn from code — layered autumn skies, parallax hills,
// trees, fences and pumpkins, a turkey you can recognise at a glance and
// a farmer in hot pursuit, with dust, feathers, embers and falling leaves
// on top, and a big clear HUD. No image, font or sound ever leaves game/.
import { FIELD, PX_PER_M, TURKEY_X, TOTAL_DISTANCE, TURKEY, FARMER, LIVES, FONT, PALETTE, STAGES, PICKUP } from './config.js';
import { KIND_OVEN, KIND_FENCE, KIND_BALE, KIND_HAYSTACK, KIND_CORN, KIND_PUMPKIN, KIND_FEATHER, KIND_KNIFE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const STAGE_LEN = TOTAL_DISTANCE / STAGES.length;

// Cool farmyard palette for the play screen only (see drawField): the
// title keeps the warm sunset, play goes cool so the contact sheet's
// top row is not one orange block twice. Single source for both the
// live override and the cached gradients below.
const COOL = {
  skyTop: '#aed6ea', skyMid: '#86b8d6', skyBot: '#6f9cc4',
  hillFar: '#7d7a52', hillMid: '#655f42', hillNear: '#4e4a33',
  ground: '#96703a', groundDark: '#77572a', grass: '#b9a24e',
};

// Per-frame constants hoisted out of the draw calls (smoothness pass):
// these arrays were rebuilt on every frame for identical contents.
const LEAF_COLS = ['#e8a13a', '#d94f30', '#f2c14e'];
const FLOWER_COLS = ['#e86a1e', '#f2c14e', '#d94f30'];
const TONGUES = [ // oven flame tongues; dx is a fraction of the oven width
  { dx: -0.26, h: 30, w: 13, ph: 0 },
  { dx: 0, h: 46, w: 20, ph: 1.3 },
  { dx: 0.26, h: 32, w: 13, ph: 2.6 },
];
const BIRD_PAIR = [[0, 0], [46, -6]];
const BIRD_FLOCK = [[0, 0], [34, -7], [62, 5]];
const END_TUFTS = [[128, 15, '#d99a44'], [168, 18, '#4e3018'], [208, 14, '#d99a44'], [238, 12, '#d99a44']];

// Draw at most this many particles a frame (pool is 140 in world.js;
// staged scenes peak at 39). A hard bound on the worst frame, never
// reached in normal play, so it changes no shipped screenshot.
const MAX_DRAW_PARTICLES = 100;

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  // Cached gradients + glow sprites (smoothness pass). Every gradient
  // below is fixed in field space — the draw transform is the same
  // each frame — so it is built once and reused instead of rebuilt
  // 60x/s for identical pixels (the play frame alone made 54
  // gradients a draw, 42 of them one radial per ember). A sprite is
  // the same idea for a position-dependent radial glow: one
  // pre-rendered falloff, drawn with drawImage at 2x the gradient
  // radius and centred on the gradient centre — the same circle the
  // gradient painted, no per-frame gradient object and no
  // per-particle template strings. Varying alpha comes from
  // globalAlpha, never from a rebuilt gradient.
  function glowSprite(stops, size, innerDyFrac) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    // innerDyFrac shifts the gradient's inner circle down by that
    // fraction of the radius (embers: the hot core sits 0.4 radii
    // below the flame's outer centre — a concentric sprite would
    // paint the lower flame ~0.2 alpha too dim).
    const g2 = g.createRadialGradient(size / 2, size / 2 + (innerDyFrac || 0) * size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, col] of stops) g2.addColorStop(o, col);
    g.fillStyle = g2;
    g.fillRect(0, 0, size, size);
    return c;
  }
  function skyGrad(s) {
    const g = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    g.addColorStop(0, s.skyTop);
    g.addColorStop(0.55, s.skyMid);
    g.addColorStop(1, s.skyBot);
    return g;
  }
  function groundGrad(s) {
    const g = context.createLinearGradient(0, FIELD.groundY, 0, FIELD.height);
    g.addColorStop(0, s.ground);
    g.addColorStop(1, s.groundDark);
    return g;
  }
  const skyGrads = STAGES.map(skyGrad);
  const skyGradCool = skyGrad(COOL);
  const groundGrads = STAGES.map(groundGrad);
  const groundGradCool = groundGrad(COOL);
  const hudProgGrad = (() => {
    const g = context.createLinearGradient(300, 0, 920, 0);
    g.addColorStop(0, '#ffd23e');
    g.addColorStop(1, '#ff7a1e');
    return g;
  })();
  const hudStamGrad = (() => {
    const g = context.createLinearGradient(24, 0, 244, 0);
    g.addColorStop(0, '#7dd3fc');
    g.addColorStop(1, '#38bdf8');
    return g;
  })();
  const titleGrad = (() => {
    const g = context.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, 'rgba(20,8,2,0.55)');
    g.addColorStop(0.35, 'rgba(20,8,2,0)');
    g.addColorStop(0.75, 'rgba(20,8,2,0.15)');
    g.addColorStop(1, 'rgba(20,8,2,0.7)');
    return g;
  })();
  const ovenDoorGrad = (() => {
    const g = context.createLinearGradient(0, FIELD.groundY - 52, 0, FIELD.groundY - 8);
    g.addColorStop(0, '#ffd23e');
    g.addColorStop(0.5, '#ff7a1e');
    g.addColorStop(1, '#c22e00');
    return g;
  })();
  const vignetteGrad = (() => {
    const g = context.createRadialGradient(640, 240, 170, 640, 240, 480);
    g.addColorStop(0, 'rgba(200,20,10,0)');
    g.addColorStop(1, 'rgba(200,20,10,1)');
    return g;
  })();
  // Title + escape hero glows: fixed centres (title dx 679, same
  // literal as drawField's turkeyDx), so cached like the rest.
  const titleGlowGrad = (() => {
    const gx = TURKEY_X + TURKEY.width / 2 + 679, gy = FIELD.groundY - 55;
    const g = context.createRadialGradient(gx, gy, 10, gx, gy, 170);
    g.addColorStop(0, 'rgba(255,232,170,0.6)');
    g.addColorStop(0.55, 'rgba(255,222,150,0.28)');
    g.addColorStop(1, 'rgba(255,222,150,0)');
    return g;
  })();
  const escapeGlowGrad = (() => {
    const gx = TURKEY_X + TURKEY.width / 2, gy = FIELD.groundY - 80;
    const g = context.createRadialGradient(gx, gy, 10, gx, gy, 210);
    g.addColorStop(0, 'rgba(255,232,170,0.62)');
    g.addColorStop(0.55, 'rgba(255,222,150,0.28)');
    g.addColorStop(1, 'rgba(255,222,150,0)');
    return g;
  })();
  const emberSprite = glowSprite([[0, 'rgba(255,220,110,0.85)'], [0.5, 'rgba(255,122,30,0.6)'], [1, 'rgba(255,80,10,0)']], 64, 0.4);
  const goldSprite = glowSprite([[0, 'rgba(255,210,62,0.65)'], [1, 'rgba(255,210,62,0)']], 128);
  const whiteGlintSprite = glowSprite([[0, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']], 24);
  const featherGlowSprite = glowSprite([[0, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']], 60);
  const farmerPatchSprite = glowSprite([[0, 'rgba(247,220,158,0.55)'], [1, 'rgba(247,220,158,0)']], 184);

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}|${weight || ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? weight + ' ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function pill(x, y, w, h, r, fill, stroke) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    if (stroke) { context.strokeStyle = stroke; context.lineWidth = 2; context.stroke(); }
  }

  function ellipse(x, y, rx, ry, color) {
    context.fillStyle = color;
    context.beginPath();
    context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
  }

  // ---- sky, sun, clouds, hills ----
  function drawSky(state, stage, screen) {
    // stage is the live view: the base stage object, or a fresh spread
    // when the play screen runs the cool farmyard override (COOL).
    context.fillStyle = stage === STAGES[state.stage] ? skyGrads[state.stage] : skyGradCool;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);
    // Clouds drift on the wind — the high ones from the world, plus three
    // big soft ones lower down, so the middle of the sky is never empty.
    for (const c of state.clouds) {
      // Warm underside shade: a cloud with a shaded belly reads as a
      // volume, not a flat white sticker cut out of the sky.
      ellipse(c.x, c.y + 9 * c.s, 48 * c.s, 11 * c.s, 'rgba(232,200,160,0.32)');
      ellipse(c.x, c.y, 52 * c.s, 17 * c.s, 'rgba(255,248,230,0.85)');
      ellipse(c.x - 34 * c.s, c.y + 7 * c.s, 34 * c.s, 13 * c.s, 'rgba(255,248,230,0.8)');
      ellipse(c.x + 36 * c.s, c.y + 8 * c.s, 36 * c.s, 12 * c.s, 'rgba(255,248,230,0.8)');
    }
    for (let i = 0; i < 3; i += 1) {
      const cx = ((i * 520 + state.elapsed * 9 - state.distance * 2) % (FIELD.width + 360) + FIELD.width + 360) % (FIELD.width + 360) - 180;
      const cy = 150 + i * 38;
      const cs = 1.15 + (i % 2) * 0.35;
      ellipse(cx, cy + 9, 60 * cs, 12 * cs, 'rgba(232,200,160,0.28)');
      ellipse(cx, cy, 66 * cs, 18 * cs, 'rgba(255,240,214,0.5)');
      ellipse(cx - 44 * cs, cy + 7, 42 * cs, 13 * cs, 'rgba(255,240,214,0.45)');
      ellipse(cx + 46 * cs, cy + 8, 44 * cs, 12 * cs, 'rgba(255,240,214,0.45)');
    }
    // A faint cloud that gathers beside the turkey at the top of a
    // leap (alpha follows the jump height) and fades out again on
    // the ground — never there while the bird is running, so it
    // never crowds the HUD, the title text or the end screen.
    const jumpK = clamp(state.player.y / 140, 0, 1);
    if (jumpK > 0.02) {
      const jx = 495 + Math.sin(state.elapsed * 0.3) * 26;
      const jy = 178 + Math.sin(state.elapsed * 0.45) * 5;
      const ja = 0.42 * jumpK;
      ellipse(jx, jy, 50, 13, `rgba(255,244,222,${ja})`);
      ellipse(jx - 34, jy + 6, 32, 10, `rgba(255,244,222,${ja * 0.9})`);
      ellipse(jx + 36, jy + 7, 34, 10, `rgba(255,244,222,${ja * 0.9})`);
    }
    // One anchored cloud low in the middle band: the danger frame's
    // mid-sky used to be a bare orange wash, and the play frame had
    // the same gap on the right. It bobs gently instead of scrolling,
    // so it is there in every frame — except the title and the end
    // screen, where the panels cover it.
    const mx = 620 + Math.sin(state.elapsed * 0.22) * 18;
    const my = 215 + Math.sin(state.elapsed * 0.4) * 4;
    ellipse(mx, my, 56, 14, 'rgba(255,244,222,0.38)');
    ellipse(mx - 38, my + 6, 36, 10, 'rgba(255,244,222,0.34)');
    ellipse(mx + 40, my + 7, 38, 10, 'rgba(255,244,222,0.34)');
    // Second anchored cloud, low in the right mid-band under the sun:
    // the play frame's sky right of the sun was a bare blue wash
    // (sun glow only) and the scrolling clouds never park there at
    // the shot moment. Same soft treatment as the mid cloud; the sun
    // glow washes over it warm. It sits below the sun disc, clear
    // of the turkey's flight, the OVEN! band and the hilltops.
    const rx = 980 + Math.sin(state.elapsed * 0.19 + 1) * 16;
    const ry = 238 + Math.sin(state.elapsed * 0.33 + 1) * 4;
    ellipse(rx, ry, 52, 13, 'rgba(255,244,222,0.36)');
    ellipse(rx - 36, ry + 6, 34, 10, 'rgba(255,244,222,0.32)');
    ellipse(rx + 38, ry + 7, 36, 10, 'rgba(255,244,222,0.32)');
    // Low autumn sun with a warm halo, drawn AFTER the clouds so it
    // stays a bright disc instead of hiding behind one. Its centre
    // sits at y=116 so the whole disc clears the HUD bar (which ends
    // at y=78) in play frames — at y=86 the top of the disc slid
    // behind the bar and read as a clipped half-sun.
    const sunX = 1020, sunY = 116;
    const glow = context.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
    glow.addColorStop(0, stage.sunGlow);
    glow.addColorStop(1, 'rgba(255,200,90,0)');
    context.fillStyle = glow;
    // The rect must cover the whole gradient radius: at ±140 the glow
    // was still ~0.16 alpha where the rect cut it, leaving a faint
    // square edge in the sky — a vertical seam beside the sun in the
    // danger frame. At ±190 the cut is at alpha 0.
    context.fillRect(sunX - 190, sunY - 190, 380, 380);
    // The disc is a gradient now, not a flat fill: a bright core
    // fading to the stage sun colour at the rim, so it reads as a
    // glowing ball instead of a flat pale coin.
    const disc = context.createRadialGradient(sunX - 8, sunY - 10, 4, sunX, sunY, 36);
    disc.addColorStop(0, '#fffdf0');
    disc.addColorStop(1, stage.sun);
    context.fillStyle = disc;
    context.beginPath();
    context.arc(sunX, sunY, 36, 0, Math.PI * 2);
    context.fill();
    // A warm rim around the disc: on the pale woods sky the pale sun
    // used to wash out into a faint blob, and on the farmyard orange
    // it was only the halo holding it together. The rim defines the
    // disc in every stage at contact-sheet size.
    context.strokeStyle = 'rgba(255,140,30,0.55)';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(sunX, sunY, 36, 0, Math.PI * 2);
    context.stroke();
    // The top-right corner by the sun used to sit empty, so a soft
    // high cloud is anchored there, bobbing gently, with one small
    // bird gliding below it in the sun's glow.
    const tx = 1175 + Math.sin(state.elapsed * 0.25) * 24;
    ellipse(tx, 40, 58, 14, 'rgba(255,244,222,0.6)');
    ellipse(tx - 38, 46, 34, 10, 'rgba(255,244,222,0.55)');
    ellipse(tx + 40, 47, 36, 10, 'rgba(255,244,222,0.55)');
    const dx = 1132 + Math.sin(state.elapsed * 0.3) * 18;
    const dy = 128 + Math.sin(state.elapsed * 0.5) * 6;
    const dflap = Math.sin(state.elapsed * 3.2) * 4;
    // Birds are sharp "V" gulls, not arcs: arcs in a row read as a
    // row of closed eyes (or a frowning mouth) at contact-sheet size.
    function gull(x, y, s, flap) {
      context.beginPath();
      context.moveTo(x - 10 * s, y - 2 * s - flap);
      context.lineTo(x, y + 4 * s);
      context.lineTo(x + 10 * s, y - 2 * s + flap);
      context.stroke();
    }
    context.strokeStyle = 'rgba(60,30,10,0.55)';
    context.lineWidth = 2.5;
    gull(dx, dy, 1, dflap);
    // Pair at by=102 in play (strokes y 82..113, 4 px clear of the
    // opaque HUD bar ending y=78) and at by=258 on the end screen
    // (open sky x 850..1056, y ~244..274, clear of E, pill, panel,
    // cloud, barn, ridge, fireworks — measured off the end frame);
    // the flock is staggered (0/-7/+5 px) so it never reads as eyes.
    const over = screen === SCREEN_OVER;
    const bx = over
      ? 850 + (state.elapsed * 20) % 160
      : 90 + (state.elapsed * 26) % (FIELD.width - 260);
    const by = (over ? 258 : 102) + Math.sin(state.elapsed * 0.8) * 7;
    context.strokeStyle = 'rgba(60,30,10,0.75)';
    context.lineWidth = 3;
    for (const [off, dy2] of BIRD_PAIR) {
      const flap = Math.sin(state.elapsed * 6 + off) * 5;
      gull(bx + off, by + dy2, 1, flap);
    }
    const fx2 = FIELD.width - 90 - (state.elapsed * 18) % (FIELD.width - 260);
    const fy2 = 152 + Math.sin(state.elapsed * 0.6 + 2) * 8;
    context.strokeStyle = 'rgba(60,30,10,0.6)';
    context.lineWidth = 2.5;
    for (const [off, dy2] of BIRD_FLOCK) {
      const flap = Math.sin(state.elapsed * 5 + off) * 4;
      gull(fx2 + off, fy2 + dy2, 1, flap);
    }
  }

  function ridge(state, offset, amp, base, color, par, haze) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    const shift = (stateScroll(state) * par) % 640;
    for (let x = 0; x <= FIELD.width; x += 16) {
      const wx = x + shift + offset;
      const y = base - Math.abs(Math.sin(wx * 0.006)) * amp - Math.sin(wx * 0.013) * amp * 0.35;
      context.lineTo(x, y);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
    // Atmospheric haze: the same ridge shape re-filled with a pale
    // wash, so the far hills lighten toward the sky and sit further
    // back than the near ones — depth, not three flat bands.
    if (haze) { context.fillStyle = haze; context.fill(); }
  }
  function stateScroll(state) { return state.distance * PX_PER_M; }

  function drawHills(state, stage, screen) {
    ridge(state, 0, 46, 340, stage.hillFar, 0.12, 'rgba(255,240,214,0.20)');
    ridge(state, 150, 38, 352, stage.hillMid, 0.18, 'rgba(255,240,214,0.10)');
    ridge(state, 300, 30, 366, stage.hillNear, 0.25);
    // Red barns ride the far ridge so the farm reads at a glance. Phases
    // keep them clear of the danger frame's knife (shifted 150 px left)
    // and the title panel (title-only phase +550 px, barns at ~190/~1170).
    const barnPhase = screen === SCREEN_TITLE ? 190 : -360;
    const scroll = stateScroll(state);
    const shift = (scroll * 0.12) % 640;
    for (let i = 0; i < 2; i += 1) {
      const bx = ((i * 980 - scroll * 0.12) % (FIELD.width + 420) + FIELD.width + 420) % (FIELD.width + 420) + barnPhase;
      // Same maths as the far ridge, so the barn sits on the hill line.
      const wx = bx + shift;
      const by = 340 - Math.abs(Math.sin(wx * 0.006)) * 46 - Math.sin(wx * 0.013) * 46 * 0.35;
      context.fillStyle = 'rgba(122,44,26,0.85)';
      context.fillRect(bx - 34, by - 34, 68, 34);
      context.beginPath();
      context.moveTo(bx - 40, by - 34);
      context.lineTo(bx, by - 52);
      context.lineTo(bx + 40, by - 34);
      context.closePath();
      context.fill();
      context.fillStyle = 'rgba(255,246,224,0.75)';
      context.fillRect(bx - 6, by - 22, 12, 22);
    }
    // One low shrub on the far ridge, riding the same 0.12 parallax
    // as the barns so it stays planted on the hill line: the danger
    // frame's left edge used to be empty midground — the farmer at
    // the edge, then bare sky and hill all the way to the turkey —
    // and this fills it without ever standing near the bird (it
    // keeps 150+ px clear of the turkey in every staged frame, and
    // in the title it sits off-screen). A low bush, not a tree: a
    // trunk would poke up beside the turkey's head in the end frame,
    // where this same shrub lands behind the freedom fence.
    const shx = ((210 - scroll * 0.12) % (FIELD.width + 420) + FIELD.width + 420) % (FIELD.width + 420) - 360;
    if (shx > -40 && shx < FIELD.width + 40) {
      const swx = shx + shift;
      const sby = 340 - Math.abs(Math.sin(swx * 0.006)) * 46 - Math.sin(swx * 0.013) * 46 * 0.35;
      ellipse(shx, sby - 8, 26, 12, stage.treeDark);
      ellipse(shx - 13, sby - 12, 15, 9, stage.tree);
      ellipse(shx + 14, sby - 11, 13, 8, stage.treeDark);
      context.fillStyle = stage.leaf;
      ellipse(shx - 8, sby - 16, 4, 3, stage.leaf);
      ellipse(shx + 6, sby - 18, 4, 3, stage.leaf);
      ellipse(shx + 16, sby - 14, 3.5, 2.5, stage.leaf);
    }
    // Right-band midground dressing (play only): a second barn, oak,
    // shrub, fence and bale ride the ridge maths, drawn only at x 700..1280
    // so the turkey/knife/OVEN! label (all left of x=520) are never covered.
    if (screen === SCREEN_PLAY) {
      const inBand = (x) => x >= 700 && x <= 1280;
      // Second barn on the far ridge, a little smaller than the pair.
      const b2x = ((678 - scroll * 0.12) % (FIELD.width + 420) + FIELD.width + 420) % (FIELD.width + 420) - 360;
      if (inBand(b2x)) {
        const bwx = b2x + shift;
        const bby = 340 - Math.abs(Math.sin(bwx * 0.006)) * 46 - Math.sin(bwx * 0.013) * 46 * 0.35;
        context.fillStyle = 'rgba(122,44,26,0.85)';
        context.fillRect(b2x - 29, bby - 29, 58, 29);
        context.beginPath();
        context.moveTo(b2x - 34, bby - 29);
        context.lineTo(b2x, bby - 44);
        context.lineTo(b2x + 34, bby - 29);
        context.closePath();
        context.fill();
        context.fillStyle = 'rgba(255,246,224,0.75)';
        context.fillRect(b2x - 5, bby - 19, 10, 19);
      }
      // Oak on the near ridge: canopy top ~y 277, well above the
      // OVEN! label band (y 335+) and clear of the turkey's flight.
      const ox = ((540 - scroll * 0.25) % (FIELD.width + 420) + FIELD.width + 420) % (FIELD.width + 420) - 360;
      if (inBand(ox)) {
        const nshift = (scroll * 0.25) % 640;
        const owx = ox + nshift;
        const ogy = 366 - Math.abs(Math.sin(owx * 0.006)) * 30 - Math.sin(owx * 0.013) * 30 * 0.35;
        drawTree(ox, ogy + 6, 0.95, stage, 0.37);
      }
      // Second shrub on the far ridge, far right.
      const s2x = ((1068 - scroll * 0.12) % (FIELD.width + 420) + FIELD.width + 420) % (FIELD.width + 420) - 360;
      if (inBand(s2x)) {
        const s2wx = s2x + shift;
        const s2by = 340 - Math.abs(Math.sin(s2wx * 0.006)) * 46 - Math.sin(s2wx * 0.013) * 46 * 0.35;
        ellipse(s2x, s2by - 8, 26, 12, stage.treeDark);
        ellipse(s2x - 13, s2by - 12, 15, 9, stage.tree);
        ellipse(s2x + 14, s2by - 11, 13, 8, stage.treeDark);
        context.fillStyle = stage.leaf;
        ellipse(s2x - 8, s2by - 16, 4, 3, stage.leaf);
        ellipse(s2x + 6, s2by - 18, 4, 3, stage.leaf);
        ellipse(s2x + 16, s2by - 14, 3.5, 2.5, stage.leaf);
      }
      // Hay bale on the track verge, far right, at full world speed.
      const hayx = ((100 - scroll) % (FIELD.width + 420) + FIELD.width + 420) % (FIELD.width + 420) - 360;
      if (inBand(hayx)) drawHayBale(hayx, FIELD.groundY, 1);
      // Fence run along the track edge, right band only, at full
      // world speed. Rails sit at y 368/382 and posts run 362..402:
      // below the OVEN! label band (labels end at y~360 in the play
      // frame, and the danger frame's label ends at x=517 anyway),
      // so a rail can never cross a label.
      for (let k = 0; k < 22; k += 1) {
        const fx = ((k * 64 - scroll) % 1400 + 1400) % 1400 - 60;
        if (fx >= 700 && fx <= 1020) drawFenceRun(fx, FIELD.groundY + 2, stage);
      }
    }
  }

  // ---- ground and mid scenery ----
  function drawGround(state, stage, screen) {
    context.fillStyle = stage === STAGES[state.stage] ? groundGrads[state.stage] : groundGradCool;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    // A dirt track the turkey runs on: a pale worn centre, two dark
    // wheel ruts, pebbles, footprints and fallen leaves — a road with
    // texture, not a flat band. The grass stays on the verge above the
    // track, in sparse three-blade tufts, so it reads as grass instead
    // of noise scribbled across the whole ground.
    context.fillStyle = 'rgba(60,32,8,0.35)';
    context.fillRect(0, FIELD.groundY + 34, FIELD.width, 44);
    context.fillStyle = 'rgba(233,190,120,0.22)';
    context.fillRect(0, FIELD.groundY + 40, FIELD.width, 32);
    const scroll = stateScroll(state);
    context.strokeStyle = 'rgba(60,32,8,0.4)';
    context.lineWidth = 5;
    for (const ry of [FIELD.groundY + 48, FIELD.groundY + 66]) {
      context.beginPath();
      for (let x = 0; x <= FIELD.width; x += 32) {
        const y = ry + Math.sin((x + scroll * 0.5) * 0.01) * 2;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    // Sun dapples on the track: soft warm pools of light, scrolling
    // with the world, so the dirt reads as sunlit instead of flat brown.
    for (let i = 0; i < 8; i += 1) {
      const wx = i * 397 + ((i * 113) % 90);
      const sx = ((wx - scroll) % (FIELD.width + 200) + FIELD.width + 200) % (FIELD.width + 200) - 100;
      ellipse(sx, FIELD.groundY + 52 + ((i * 29) % 18), 44 + (i % 3) * 14, 9, 'rgba(255,217,138,0.10)');
    }
    // Pebbles and fallen leaves on the track, scrolling with the world.
    for (let i = 0; i < 34; i += 1) {
      const wx = i * 197 + ((i * 89) % 60);
      const sx = ((wx - scroll) % (FIELD.width + 120) + FIELD.width + 120) % (FIELD.width + 120) - 60;
      const py = FIELD.groundY + 40 + ((i * 37) % 32);
      if (i % 3 === 0) ellipse(sx, py, 3 + (i % 3), 2, 'rgba(90,55,20,0.5)');
      else if (i % 5 === 0) ellipse(sx, py, 5, 3, LEAF_COLS[i % 3]);
    }
    // Footprints marching along the track — a pair per stride.
    context.fillStyle = 'rgba(60,32,8,0.35)';
    for (let i = 0; i < 14; i += 1) {
      const wx = i * 97;
      const sx = ((wx - scroll) % (FIELD.width + 120) + FIELD.width + 120) % (FIELD.width + 120) - 60;
      const fy = FIELD.groundY + 56 + (i % 2 === 0 ? -5 : 5);
      context.beginPath();
      context.ellipse(sx, fy, 4, 2.5, 0, 0, Math.PI * 2);
      context.fill();
    }
    // Grass tufts on the verge above the track, sparse and three-bladed.
    for (let i = 0; i < 40; i += 1) {
      const wx = i * 211 + ((i * 131) % 70);
      const sx = ((wx - scroll) % (FIELD.width + 120) + FIELD.width + 120) % (FIELD.width + 120) - 60;
      const gy = FIELD.groundY + 4 + ((i * 41) % 26);
      const h = 8 + (i % 3) * 4;
      context.strokeStyle = i % 4 === 0 ? stage.treeDark : stage.grass;
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(sx, gy);
      context.lineTo(sx - 4, gy - h);
      context.moveTo(sx, gy);
      context.lineTo(sx, gy - h - 3);
      context.moveTo(sx + 4, gy);
      context.lineTo(sx + 6, gy - h + 2);
      context.stroke();
    }
    // A few flat fallen leaves resting on the verge.
    for (let i = 0; i < 26; i += 1) {
      const wx = i * 263 + ((i * 71) % 80);
      const sx = ((wx - scroll) % (FIELD.width + 120) + FIELD.width + 120) % (FIELD.width + 120) - 60;
      const ly = FIELD.groundY + 8 + ((i * 29) % 22);
      ellipse(sx, ly, 6, 3.5, LEAF_COLS[i % 3]);
    }
    // A few tiny autumn wildflowers on the verge — small dots of
    // orange and gold that break up the long empty stretches of track
    // between the farmer and the next oven, without shouting for
    // attention. All three ground details are pure functions of the
    // scroll, so they never touch the gameplay random stream.
    for (let i = 0; i < 10; i += 1) {
      const wx = i * 331 + ((i * 97) % 90);
      const sx = ((wx - scroll) % (FIELD.width + 120) + FIELD.width + 120) % (FIELD.width + 120) - 60;
      const fy = FIELD.groundY + 10 + ((i * 53) % 20);
      ellipse(sx, fy, 3, 3, FLOWER_COLS[i % 3]);
      ellipse(sx + 4, fy - 4, 2, 2, FLOWER_COLS[(i + 1) % 3]);
    }
    for (const s of state.scenery) {
      const sx = TURKEY_X + (s.at - state.distance) * PX_PER_M;
      if (sx < -160 || sx > FIELD.width + 160) continue;
      // No tree or bush ever stands right behind the turkey: the bird
      // must read against open ground, not blend into a canopy.
      if ((s.kind === 0 && Math.abs(sx - TURKEY_X) < 150) || (s.kind === 4 && Math.abs(sx - TURKEY_X) < 110)) continue;
      const gy = FIELD.groundY;
      if (s.kind === 0) drawTree(sx, gy, 0.8 + s.lane * 0.5, stage, s.seed);
      else if (s.kind === 1) drawFenceRun(sx, gy, stage);
      else if (s.kind === 2) drawPumpkin(sx, gy - 12, 15 + s.lane * 8);
      else if (s.kind === 3) drawHayBale(sx, gy, 1);
      else {
        ellipse(sx, gy - 8, 26, 14, stage.treeDark);
        ellipse(sx - 12, gy - 14, 16, 10, stage.tree);
      }
    }
    // Play only, far-right verge pumpkin: the danger frame's near
    // ground right of the fence run is bare dirt. After the scenery
    // trees, so it fronts the canopy (in the hills it hid behind
    // the tree). Phase 400/1400: x~1051 in danger, off-band in play.
    if (screen === SCREEN_PLAY) {
      const pkx = ((400 - scroll) % 1400 + 1400) % 1400 - 60;
      if (pkx >= 700 && pkx <= 1280) drawPumpkin(pkx, FIELD.groundY - 12, 17);
    }
    // Foreground grass along the very bottom edge: bigger, darker
    // blades than the verge tufts, scrolling at full speed — a near
    // layer, so the bottom of the frame stops reading as flat dirt.
    // Title only skips it: the footer line sits at y=462 and the
    // blades would strike through it. Tops stay >=452, clear of the
    // stamina bar (ends 442) and the stage line (ends ~440).
    if (screen !== SCREEN_TITLE) {
      for (let i = 0; i < 12; i += 1) {
        const wx = i * 173 + ((i * 67) % 50);
        const sx = ((wx - scroll) % (FIELD.width + 120) + FIELD.width + 120) % (FIELD.width + 120) - 60;
        const gy = FIELD.groundY + 70 + ((i * 31) % 8);
        const h = 10 + (i % 3) * 4;
        context.strokeStyle = 'rgba(46,32,10,0.55)';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(sx, gy);
        context.lineTo(sx - 4, gy - h);
        context.moveTo(sx, gy);
        context.lineTo(sx + 5, gy - h + 2);
        context.stroke();
      }
    }
    // The riverbank stage gets its water ribbon.
    if (state.stage === 2) {
      context.fillStyle = 'rgba(70,140,190,0.85)';
      context.fillRect(0, FIELD.groundY + 62, FIELD.width, 16);
      context.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 8; i += 1) {
        const wx = ((i * 211 - scroll * 0.6) % (FIELD.width + 200) + FIELD.width + 200) % (FIELD.width + 200) - 100;
        context.fillRect(wx, FIELD.groundY + 66 + (i % 3) * 4, 46, 3);
      }
    }
    // End only: warm light pooled on the dirt under the hero
    // turkey, so its brown lower body (R~140) lifts off the dark
    // ground (R~140 there; the halo sits too high to light it).
    if (screen === SCREEN_OVER) ellipse(361, 424, 150, 24, 'rgba(255,214,130,0.22)');
    // The freedom fence: a white picket line at the finish.
    if (state.distance > TOTAL_DISTANCE - 130) {
      const fx = TURKEY_X + (TOTAL_DISTANCE - state.distance) * PX_PER_M;
      drawFinishGate(fx);
    }
  }

  function drawTree(x, gy, s, stage, seed) {
    const h = 88 * s;
    context.fillStyle = '#5a3a1a';
    context.fillRect(x - 4 * s, gy - h * 0.45, 8 * s, h * 0.45);
    ellipse(x, gy - h * 0.62, 34 * s, 30 * s, stage.tree);
    ellipse(x - 22 * s, gy - h * 0.48, 22 * s, 18 * s, stage.treeDark);
    ellipse(x + 22 * s, gy - h * 0.5, 22 * s, 18 * s, stage.tree);
    context.fillStyle = stage.leaf;
    for (let i = 0; i < 5; i += 1) {
      const a = seed * 40 + i * 1.3;
      ellipse(x + Math.sin(a) * 26 * s, gy - h * 0.62 + Math.cos(a) * 18 * s, 5 * s, 3.5 * s, stage.leaf);
    }
  }

  function drawFenceRun(x, gy, stage) {
    context.fillStyle = '#7a5230';
    context.fillRect(x - 30, gy - 34, 60, 5);
    context.fillRect(x - 30, gy - 20, 60, 5);
    context.fillRect(x - 26, gy - 40, 6, 40);
    context.fillRect(x + 20, gy - 40, 6, 40);
  }

  function drawPumpkin(x, gy, r) {
    // Contact shadow on the dirt under the pumpkin, so it sits on
    // the ground instead of floating a pixel above it.
    ellipse(x, gy + r * 0.8, r * 0.9, 4, 'rgba(20,10,2,0.25)');
    context.fillStyle = '#e86e10';
    context.beginPath();
    context.ellipse(x, gy, r, r * 0.82, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#c85a08';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x - r * 0.4, gy - r * 0.75);
    context.quadraticCurveTo(x - r * 0.5, gy, x - r * 0.4, gy + r * 0.75);
    context.moveTo(x + r * 0.4, gy - r * 0.75);
    context.quadraticCurveTo(x + r * 0.5, gy, x + r * 0.4, gy + r * 0.75);
    context.stroke();
    context.strokeStyle = '#3e6b1e';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x, gy - r * 0.8);
    context.quadraticCurveTo(x + 3, gy - r * 1.2, x + 10, gy - r * 1.15);
    context.stroke();
  }

  function drawHayBale(x, gy, s) {
    // Contact shadow under the dome, so the bale sits on the dirt.
    ellipse(x, gy + 2, 20 * s, 4, 'rgba(20,10,2,0.25)');
    context.fillStyle = '#d9a83e';
    context.beginPath();
    context.arc(x, gy - 20 * s, 20 * s, Math.PI, 0);
    context.closePath();
    context.fill();
    // Straw reads as horizontal bands across the dome, not vertical
    // bars: the old five vertical strokes made the bale read as an
    // upturned wire basket (in the danger frame two of them side by
    // side looked like cages). Two curved bands plus short diagonal
    // tufts at the crown keep the hay texture without the cage grid.
    context.strokeStyle = '#b8892a';
    context.lineWidth = 2;
    for (const hy of [-30, -20, -11]) {
      const half = Math.sqrt(Math.max(0, 1 - ((hy + 20) / 20) ** 2)) * 19 * s;
      context.beginPath();
      context.moveTo(x - half, gy + hy * s);
      context.quadraticCurveTo(x, gy + (hy - 4) * s, x + half, gy + hy * s);
      context.stroke();
    }
    context.strokeStyle = '#e8c95a';
    context.lineWidth = 2;
    for (let i = -1; i <= 1; i += 1) {
      context.beginPath();
      context.moveTo(x + i * 8 * s, gy - 38 * s);
      context.lineTo(x + i * 10 * s, gy - 30 * s);
      context.stroke();
    }
  }

  function drawFinishGate(fx) {
    context.fillStyle = 'rgba(255,210,62,0.25)';
    context.fillRect(fx - 8, FIELD.groundY - 180, 16, 180);
    for (let i = 0; i < 7; i += 1) {
      const px = fx - 60 + i * 20;
      context.fillStyle = '#fff6e0';
      context.fillRect(px, FIELD.groundY - 100, 14, 100);
      context.beginPath();
      context.moveTo(px, FIELD.groundY - 100);
      context.lineTo(px + 7, FIELD.groundY - 110);
      context.lineTo(px + 14, FIELD.groundY - 100);
      context.closePath();
      context.fill();
    }
    context.fillStyle = '#fff6e0';
    context.fillRect(fx - 70, FIELD.groundY - 80, 140, 8);
    // The label sits LEFT of the gate (centred on fx-140), not on it:
    // at the finish the hero turkey stands right in front of the
    // gate at 1.4x, and centred text was 77% covered by the bird —
    // only "FR" showed. Out here it reads over open sky, clear of
    // the turkey, the farmer (left edge) and the score panel, and it
    // still belongs to the gate it names. In the last 130 m of a run
    // the gate slides in from the right and the label travels with
    // it, always on the approach side.
    text('FREEDOM', fx - 140, FIELD.groundY - 132, 26, '#ffd23e', 'center', '900');
  }

  // ---- hazards and pickups ----
  function drawOven(sx, wPx, t) {
    const gy = FIELD.groundY;
    // Heat glow on the ground around it, plus a warm halo above the
    // mouth: at contact-sheet size the oven used to read as a plain
    // dark box with a thin wisp, so the glow now wraps the whole oven
    // and the halo lifts it off the sky behind it.
    const ocx = sx + wPx / 2;
    // Ground glow + halo stay live gradients, not sprites: the glow
    // covers ~12% of the frame and a pre-rendered sprite's
    // premultiplied-alpha rounding shifts the whole soft falloff by
    // a few levels (PNG diff: 11.9% of pixels, max Δ 8). Two
    // gradients per oven is cheap; the per-particle ember gradients
    // were the real churn (42/draw) and those stay sprites.
    const glow = context.createRadialGradient(ocx, gy - 30, 6, ocx, gy - 30, 165);
    glow.addColorStop(0, 'rgba(255,122,30,0.62)');
    glow.addColorStop(1, 'rgba(255,122,30,0)');
    context.fillStyle = glow;
    // The rect must cover the whole gradient radius (165): the old
    // 220x130 rect cut the glow at ~0.10 alpha, leaving a faint
    // rectangular edge around the oven (visible in the cover crop).
    context.fillRect(sx + wPx / 2 - 165, gy - 195, 330, 330);
    const halo = context.createRadialGradient(sx + wPx / 2, gy - 72, 4, sx + wPx / 2, gy - 72, 88);
    halo.addColorStop(0, 'rgba(255,150,50,0.4)');
    halo.addColorStop(1, 'rgba(255,150,50,0)');
    context.fillStyle = halo;
    context.fillRect(sx + wPx / 2 - 90, gy - 162, 180, 180);
    // Contact shadow under the body, so the oven sits on the dirt
    // instead of floating in its own glow.
    ellipse(sx + wPx / 2, gy + 3, wPx * 0.55, 5, 'rgba(20,10,2,0.3)');
    // Body, chimney and glowing door.
    context.fillStyle = PALETTE.ovenBody;
    pill(sx, gy - 56, wPx, 56, 8, PALETTE.ovenBody);
    context.fillStyle = '#2a2a33';
    context.fillRect(sx + wPx - 26, gy - 82, 18, 28);
    // Three permanent flame tongues licking out of the oven's top,
    // flickering with time so the oven reads as dangerous even in a
    // still frame: the drifting ember particles alone were too thin
    // and pale at half size. Tallest in the middle, swaying slightly.
    const cx = sx + wPx / 2;
    for (const tg of TONGUES) {
      const flick = 1 + Math.sin(t * 11 + tg.ph + sx * 0.13) * 0.16;
      const th = tg.h * flick;
      const tx = cx + tg.dx * wPx + Math.sin(t * 7 + tg.ph) * 2;
      const base = gy - 56;
      const fg = context.createLinearGradient(0, base - th, 0, base);
      fg.addColorStop(0, 'rgba(255,236,130,0.95)');
      fg.addColorStop(0.55, 'rgba(255,150,40,0.9)');
      fg.addColorStop(1, 'rgba(230,70,10,0.85)');
      context.fillStyle = fg;
      context.beginPath();
      context.moveTo(tx - tg.w / 2, base);
      context.quadraticCurveTo(tx - tg.w * 0.7, base - th * 0.55, tx, base - th);
      context.quadraticCurveTo(tx + tg.w * 0.7, base - th * 0.55, tx + tg.w / 2, base);
      context.closePath();
      context.fill();
      // Bright core so the middle tongue keeps a hot heart.
      context.fillStyle = 'rgba(255,246,200,0.9)';
      context.beginPath();
      context.ellipse(tx, base - th * 0.3, tg.w * 0.22, th * 0.28, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = ovenDoorGrad;
    pill(sx + wPx / 2 - 22, gy - 40, 44, 34, 6, ovenDoorGrad);
    context.strokeStyle = '#1c1c22';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(sx + wPx / 2 - 22, gy - 22);
    context.lineTo(sx + wPx / 2 + 22, gy - 22);
    context.stroke();
    // Danger chevrons above the oven.
    context.fillStyle = '#ffd23e';
    for (let i = 0; i < 3; i += 1) {
      const cx = sx + 14 + i * 26;
      context.beginPath();
      context.moveTo(cx, gy - 68);
      context.lineTo(cx + 10, gy - 60);
      context.lineTo(cx, gy - 52);
      context.lineTo(cx - 6, gy - 60);
      context.closePath();
      context.fill();
    }
    // The warning label only for an oven still ahead: one the turkey
    // already passed sits behind the farmer and its label would
    // collide with him. It hangs BESIDE the oven, not above it: above
    // was exactly where the jumping turkey's head and the flame
    // tongues crossed it, so at contact-sheet size it read as a
    // half-hidden orange smear. Beside the body, on a dark pill, it
    // stays clear of the turkey's flight path and of the flames; near
    // the right edge it flips to the oven's left side so it never
    // clips off-screen.
    if (sx > TURKEY_X) {
      const lw = 80;
      let lx = sx + wPx + 8;
      if (lx + lw > FIELD.width - 8) lx = sx - lw - 8;
      if (lx < 8) lx = 8;
      pill(lx, gy - 62, lw, 30, 9, 'rgba(30,12,4,0.8)', 'rgba(255,176,58,0.65)');
      text('OVEN!', lx + lw / 2, gy - 40, 20, '#ffb03a', 'center', '900');
    }
  }

  function drawFenceObstacle(sx, wPx, h) {
    const gy = FIELD.groundY;
    context.fillStyle = '#8a5a30';
    context.fillRect(sx, gy - h, wPx, 6);
    context.fillRect(sx, gy - h + 18, wPx, 6);
    context.fillRect(sx + 4, gy - h - 4, 7, h + 4);
    context.fillRect(sx + wPx - 11, gy - h - 4, 7, h + 4);
  }

  function drawCorn(sx, y, t) {
    const bob = Math.sin(t * 3 + sx * 0.05) * 3;
    const cy = FIELD.groundY - y + bob;
    context.fillStyle = PALETTE.cornHusk;
    context.beginPath();
    context.moveTo(sx - 4, cy + 12);
    context.lineTo(sx - 12, cy + 22);
    context.lineTo(sx + 2, cy + 16);
    context.closePath();
    context.fill();
    ellipse(sx + 8, cy, 11, 15, PALETTE.corn);
    // A dark gold outline so the cob reads as a cob, not a floating
    // yellow egg: at half size the un-outlined yellow ellipse (two of
    // them side by side in the danger frame) had no edge against the
    // pale ground and sky.
    context.strokeStyle = '#b8860b';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(sx + 8, cy, 11, 15, 0, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = '#d9a41e';
    context.lineWidth = 1.5;
    for (let i = -1; i <= 1; i += 1) {
      context.beginPath();
      context.moveTo(sx + 8 + i * 5, cy - 11);
      context.lineTo(sx + 8 + i * 5, cy + 11);
      context.stroke();
    }
    context.drawImage(whiteGlintSprite, sx - 8, cy - 18, 24, 24);
  }

  function drawGoldenPumpkin(sx, y, t) {
    const bob = Math.sin(t * 2.4) * 4;
    context.drawImage(goldSprite, sx - 46, FIELD.groundY - y - 46 + bob, 92, 92);
    drawPumpkin(sx, FIELD.groundY - y + bob, 20);
    context.fillStyle = '#fff6e0';
    context.beginPath();
    context.moveTo(sx, FIELD.groundY - y - 26 + bob);
    context.lineTo(sx + 5, FIELD.groundY - y - 16 + bob);
    context.lineTo(sx - 5, FIELD.groundY - y - 16 + bob);
    context.closePath();
    context.fill();
  }

  function drawFeatherPickup(sx, y, t) {
    const bob = Math.sin(t * 2.8 + 1) * 4;
    const cy = FIELD.groundY - y + bob;
    context.save();
    context.translate(sx, cy);
    context.rotate(Math.sin(t * 1.6) * 0.3);
    context.fillStyle = '#fff6e0';
    context.beginPath();
    context.ellipse(0, 0, 9, 18, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#c96a1e';
    context.beginPath();
    context.ellipse(0, -6, 5, 10, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.drawImage(featherGlowSprite, sx - 30, cy - 30, 60, 60);
  }

  // Carving knife in flight: thick blade + white halo under a dark edge
  // so it reads against sky and ground at half size; ghost blades and a
  // white speed streak trail behind it (knives fly right). Spent knives
  // fade out (alpha 1 until 8 m past the turkey, 0 by 28 m).
  function drawKnife(sx, y, t, alpha, aim) {
    const a = alpha === undefined ? 1 : alpha;
    const cy = FIELD.groundY - y;
    const spin = t * 9;
    // Ghost blades: afterimages of the spin, fading with distance.
    // Same thickened shape as the blade itself, so they read as
    // afterimages of this blade, not a thinner one behind it.
    for (const [off, ga] of [[-36, 0.3], [-68, 0.15]]) {
      context.save();
      context.translate(sx + off, cy);
      context.rotate(spin);
      context.globalAlpha = ga * a;
      context.fillStyle = PALETTE.knifeBlade;
      context.beginPath();
      context.moveTo(-24, -11);
      context.lineTo(18, -11);
      context.lineTo(32, 0);
      context.lineTo(18, 11);
      context.lineTo(-24, 11);
      context.closePath();
      context.fill();
      context.restore();
    }
    context.globalAlpha = a;
    // Long speed trail behind the blade.
    context.strokeStyle = 'rgba(255,255,255,0.85)';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(sx - 38, cy);
    context.lineTo(sx - 126, cy + 6);
    context.stroke();
    context.strokeStyle = 'rgba(255,255,255,0.4)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(sx - 38, cy - 10);
    context.lineTo(sx - 100, cy - 4);
    context.moveTo(sx - 38, cy + 10);
    context.lineTo(sx - 100, cy + 16);
    context.stroke();
    // Forward speed lines, only when aim is given (far knife on the
    // play screen): short faint streaks ahead of the blade along the
    // knife-to-turkey line, so the throw reads as aimed at the bird
    // instead of a blade lying at the farmer's feet.
    if (aim !== undefined) {
      const ca = Math.cos(aim), sa = Math.sin(aim);
      for (const [po, len, al, lw] of [[-9, 52, 0.32, 2], [0, 68, 0.5, 3], [9, 52, 0.32, 2]]) {
        const x0 = sx + ca * 36 - sa * po, y0 = cy + sa * 36 + ca * po;
        context.strokeStyle = `rgba(255,255,255,${al})`;
        context.lineWidth = lw;
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x0 + ca * len, y0 + sa * len);
        context.stroke();
      }
    }
    // The blade itself, ~35% longer and wider than before, and
    // ~35% thicker again in the finals details pass (half-height
    // 8 -> 11). Length, position and spin are untouched.
    context.save();
    context.translate(sx, cy);
    context.rotate(spin);
    context.beginPath();
    context.moveTo(-24, -11);
    context.lineTo(18, -11);
    context.lineTo(32, 0);
    context.lineTo(18, 11);
    context.lineTo(-24, 11);
    context.closePath();
    // White halo first, then the fill over its inner half, then the
    // dark edge: ~2 px of white rim survives outside the dark line.
    context.strokeStyle = 'rgba(255,255,255,0.95)';
    context.lineWidth = 6;
    context.stroke();
    context.fillStyle = PALETTE.knifeBlade;
    context.fill();
    context.strokeStyle = 'rgba(20,20,30,0.8)';
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = PALETTE.knifeHandle;
    context.fillRect(-40, -11, 17, 22);
    context.fillStyle = 'rgba(20,20,30,0.5)';
    context.fillRect(-40, -11, 4, 22);
    // The handle gets the same dark outline as the blade: in the
    // danger frame the handle crosses the oven's flame tongues, and
    // without an edge the dark wood melts into the orange flame.
    // The blade already had this outline; the handle was the only
    // un-outlined part of the knife. The white halo goes under the
    // dark edge here too: the dark edge alone left a faint residue
    // at half size. Only the three exposed sides are outlined —
    // the fourth butts against the blade, and a white rim there
    // would stripe across the blade's rear.
    context.beginPath();
    context.moveTo(-23, -11);
    context.lineTo(-40, -11);
    context.lineTo(-40, 11);
    context.lineTo(-23, 11);
    context.strokeStyle = 'rgba(255,255,255,0.95)';
    context.lineWidth = 6;
    context.stroke();
    context.strokeStyle = 'rgba(20,20,30,0.8)';
    context.lineWidth = 2;
    context.stroke();
    context.restore();
    // Never leak the fade to whatever is drawn next.
    context.globalAlpha = 1;
  }

  // A carving knife lying dropped flat on the dirt — the escape
  // screen's spent blade (see the KIND_KNIFE branch in drawField).
  // Same plan as the flying knife, minus everything that reads as
  // motion: no spin, no trail, no ghosts. Blade points right, the
  // way it was flying; handle on the left. Its bottom edge sits on
  // the ground line (y=400) with a small contact shadow under it,
  // so it reads as resting on the dirt, not floating above it. The
  // span (sx-40..sx+32) keeps it clear of the farmer (right edge
  // ~x85), the verge tufts (tops y~404..410, below the blade) and
  // the enlarged hero turkey's tail (left edge ~x253 at 1.8x).
  function drawDroppedKnife(sx) {
    const cy = FIELD.groundY - 6;
    ellipse(sx - 4, FIELD.groundY + 2, 34, 3, 'rgba(20,10,2,0.25)');
    context.fillStyle = PALETTE.knifeBlade;
    context.beginPath();
    context.moveTo(sx - 23, cy - 6);
    context.lineTo(sx + 18, cy - 6);
    context.lineTo(sx + 32, cy);
    context.lineTo(sx + 18, cy + 6);
    context.lineTo(sx - 23, cy + 6);
    context.closePath();
    context.fill();
    context.strokeStyle = 'rgba(20,20,30,0.8)';
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = PALETTE.knifeHandle;
    context.fillRect(sx - 40, cy - 6, 17, 12);
    context.fillStyle = 'rgba(20,20,30,0.5)';
    context.fillRect(sx - 40, cy - 6, 4, 12);
    context.strokeStyle = 'rgba(20,20,30,0.8)';
    context.lineWidth = 2;
    context.strokeRect(sx - 40, cy - 6, 17, 12);
  }

  // ---- the turkey ----
  // Four poses: pumping run, stretched jump, low slide, dazed hurt.
  // Tail, wings, legs and eye change with the pose; scale pivots on
  // the feet (1.12 play, 1.30 title, dx +679 title-only, centre 1040).
  function drawTurkey(state, scale, celebrate, dx) {
    const p = state.player;
    const gy = FIELD.groundY;
    const air = p.y > 0;
    const squashY = p.squash > 0 ? 1 - p.squash * 0.22 : 1;
    const squashX = p.squash > 0 ? 1 + p.squash * 0.22 : 1;
    // dx shifts the whole bird (shadow, dust, wind lines; the warm
    // glow is moved separately in drawField) without touching
    // TURKEY_X, so play, the end screen and every collision stay
    // exactly where they were — only the title passes a non-zero dx.
    const cx = TURKEY_X + TURKEY.width / 2 + (dx || 0);
    const feetY = gy - p.y;
    const ducking = p.ducking || p.hiding > 0;
    const bodyH = ducking ? 46 : 74;
    const bodyW = ducking ? 74 : 62;
    const blink = p.invulnerable > 0 && Math.floor(p.invulnerable * 10) % 2 === 0;
    if (blink || p.hiding > 0) return; // hidden behind the haystack, or blinking off
    // A celebrating turkey leaps with its wings thrown wide even
    // standing still — the escape frame's hero, mid-leap.
    const pose = celebrate ? 'jump' : air ? 'jump' : ducking ? 'slide' : p.squash > 0.4 ? 'hurt' : 'run';
    const runBob = pose === 'run' ? Math.sin(p.runPhase * 2) * 3 : 0;
    const tilt = pose === 'jump' ? -0.2 : pose === 'slide' ? 0.14 : pose === 'hurt' ? -0.1 + Math.sin(state.elapsed * 18) * 0.1 : 0.05 + Math.sin(p.runPhase * 2) * 0.02;
    // A soft contact shadow grounds the turkey, even mid-jump.
    ellipse(cx, gy + 4, 34 * scale * (1 - clamp(p.y / 320, 0, 0.45)), 7, 'rgba(20,10,2,0.28)');
    // Warm halo behind the bird, then the body outline below: the bird
    // must lift off the brown hills (start) and purple hills (end),
    // not print onto them. Halo first, so the body paints over it.
    const halo = context.createRadialGradient(cx, feetY - 44, 8, cx, feetY - 44, 125);
    halo.addColorStop(0, 'rgba(255,214,130,0.34)');
    halo.addColorStop(1, 'rgba(255,214,130,0)');
    context.fillStyle = halo;
    context.fillRect(cx - 125, feetY - 169, 250, 250);
    // Dust trailing the feet while running — phase-driven, so a puff
    // is in frame on every stride instead of only when the world's
    // random dust happens to fire.
    if (pose === 'run') {
      for (let i = 0; i < 2; i += 1) {
        const ph = (p.runPhase * 0.35 + i * 0.5) % 1;
        const dx = cx - 34 - ph * 46;
        const r = 4 + ph * 9;
        context.fillStyle = `rgba(214,178,120,${(1 - ph) * 0.45})`;
        context.beginPath();
        context.arc(dx, gy - 2 - ph * 6, r, 0, Math.PI * 2);
        context.fill();
      }
    }
    // Two pale wind lines streaming behind the bird in the air, plus
    // a loose feather on the lower one, so the leap has motion even
    // in a still frame; stronger the higher the jump.
    if (pose === 'jump') {
      const k = clamp(p.y / 120, 0.25, 1);
      context.lineCap = 'round';
      context.strokeStyle = `rgba(255,246,224,${0.44 * k})`;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(cx - 46, feetY - 36);
      context.quadraticCurveTo(cx - 100, feetY - 54, cx - 152, feetY - 60);
      context.stroke();
      context.strokeStyle = `rgba(255,246,224,${0.32 * k})`;
      context.lineWidth = 3.5;
      context.beginPath();
      context.moveTo(cx - 40, feetY - 12);
      context.quadraticCurveTo(cx - 86, feetY - 28, cx - 130, feetY - 32);
      context.stroke();
      context.save();
      context.translate(cx - 108, feetY - 46);
      context.rotate(-0.5 + Math.sin(state.elapsed * 4) * 0.2);
      context.fillStyle = `rgba(200,150,90,${0.55 * k})`;
      context.beginPath();
      context.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    // Landing dust ring: spreads and fades as the squash settles.
    if (p.squash > 0 && !air) {
      const k = 1 - p.squash;
      context.strokeStyle = `rgba(240,214,170,${p.squash * 0.7})`;
      context.lineWidth = 4;
      context.beginPath();
      context.ellipse(cx, gy + 3, 22 + k * 54, 6 + k * 6, 0, 0, Math.PI * 2);
      context.stroke();
    }
    context.save();
    context.translate(cx + (pose === 'hurt' ? Math.sin(state.elapsed * 28) * 4 : 0), feetY + runBob);
    context.rotate(tilt);
    context.scale(squashX * (pose === 'jump' ? 0.92 : 1) * scale, squashY * (pose === 'jump' ? 1.1 : 1) * scale);
    if (p.pumpkin > 0) {
      // Gold aura as the shared gold sprite: same circle, peak alpha
      // 0.55 via globalAlpha (sprite is baked at 0.65), clipped to
      // the old fillRect so the 6 px the sprite would overhang stays out.
      context.save();
      context.beginPath();
      context.rect(-110, -160, 220, 220);
      context.clip();
      context.globalAlpha = 0.55 / 0.65;
      context.drawImage(goldSprite, -110, -154, 220, 220);
      context.restore();
      // Orbiting golden sparks and a pulsing ring: the invincible aura
      // reads as a ring of light around the bird, not just a wash.
      context.strokeStyle = `rgba(255,210,62,${0.5 + Math.sin(state.elapsed * 5) * 0.2})`;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(4, -44, 66, 0, Math.PI * 2);
      context.stroke();
      for (let i = 0; i < 6; i += 1) {
        const a = state.elapsed * 3 + (i * Math.PI) / 3;
        context.fillStyle = `rgba(255,214,80,${0.65 + Math.sin(state.elapsed * 6 + i) * 0.3})`;
        context.beginPath();
        context.arc(4 + Math.cos(a) * 62, -44 + Math.sin(a) * 46, 4, 0, Math.PI * 2);
        context.fill();
      }
    }
    // Fanned tail feathers — the silhouette that says "turkey". The fan
    // wags as it runs, spreads wide and lifts in a jump, flattens back
    // in a slide and droops when hurt. Pale rim on each feather, so the
    // fan reads against the hills instead of melting into them.
    const tailSpread = pose === 'jump' ? 1.6 : pose === 'slide' ? 0.4 : pose === 'hurt' ? 0.55 : 1 + Math.sin(p.runPhase * 2) * 0.3;
    const tailLift = pose === 'jump' ? -0.5 : pose === 'slide' ? 0.3 : pose === 'hurt' ? 0.35 : 0;
    for (let i = -2; i <= 2; i += 1) {
      const ang = i * 0.42 * tailSpread;
      const len = (pose === 'jump' ? 62 : 48) - Math.abs(i) * 5;
      const col = PALETTE.tail[i + 2];
      context.save();
      context.translate(-6, -bodyH + 26);
      context.rotate(ang - 0.5 + tailLift);
      context.fillStyle = col;
      context.beginPath();
      context.ellipse(0, -len / 2, 15, len / 2, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(255,220,150,0.8)';
      context.lineWidth = 2.5;
      context.stroke();
      context.fillStyle = 'rgba(60,25,5,0.55)';
      context.beginPath();
      context.ellipse(0, -len + 12, 6, 8, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    // Legs — a big two-beat stride while running, kicked out in the air,
    // stretched out behind in a slide, splayed when hurt.
    const legSwing = Math.sin(p.runPhase * 2);
    context.strokeStyle = '#e8a33c';
    context.lineWidth = 6;
    context.lineCap = 'round';
    context.beginPath();
    if (pose === 'jump') {
      context.moveTo(-4, -14);
      context.lineTo(-16, 0);
      context.moveTo(10, -14);
      context.lineTo(8, 8);
    } else if (pose === 'slide') {
      context.moveTo(-4, -14);
      context.lineTo(-24, -2);
      context.moveTo(10, -14);
      context.lineTo(-14, -2);
    } else if (pose === 'hurt') {
      context.moveTo(-4, -14);
      context.lineTo(-16, 0);
      context.moveTo(10, -14);
      context.lineTo(22, 0);
    } else {
      // Bent knees — front knee forward, back knee back — so the stride
      // reads even in the frame where the feet cross mid-cycle.
      context.moveTo(-4, -14);
      context.lineTo(-4 + legSwing * 10 + 6, -7);
      context.lineTo(-4 + legSwing * 20, 0);
      context.moveTo(10, -14);
      context.lineTo(10 - legSwing * 10 - 6, -7);
      context.lineTo(10 - legSwing * 20, 0);
    }
    context.stroke();
    if (pose === 'run') {
      // Little feet at the end of each stride.
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(-4 + legSwing * 20, 0);
      context.lineTo(-4 + legSwing * 20 + 11, 0);
      context.moveTo(10 - legSwing * 20, 0);
      context.lineTo(10 - legSwing * 20 + 11, 0);
      context.stroke();
    }
    // Far wing: a darker sliver behind the body, raised in counter-phase
    // while running so both wings read as flapping, thrown wide on a jump.
    const farFlap = pose === 'jump' ? -1.2 + Math.sin(state.elapsed * 16) * 0.3 : pose === 'hurt' ? -0.7 + Math.sin(state.elapsed * 20) * 0.3 : pose === 'slide' ? 0.35 : -0.5 - Math.sin(p.runPhase * 2) * 0.3;
    context.save();
    context.translate(-6, -bodyH / 2 - 10);
    context.rotate(farFlap);
    context.fillStyle = PALETTE.turkeyDark;
    context.beginPath();
    context.ellipse(-6, -4, 18, 11, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
    // Plump body with scalloped feather rows, plus a dark outline so
    // the body holds its edge against the hills behind it.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.ellipse(6, -bodyH / 2 - 6, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#4a2c12';
    context.lineWidth = 3.5;
    context.stroke();
    context.fillStyle = PALETTE.turkeyLight;
    for (let r = 0; r < 3; r += 1) {
      for (let i = 0; i < 3; i += 1) {
        context.beginPath();
        context.arc(-8 + i * 16, -bodyH + 22 + r * 16, 8, 0, Math.PI);
        context.fill();
      }
    }
    // Near wing — pumping while running, thrown wide on a jump, tucked
    // flat in a slide, flailing when hurt. Bigger and paler than the
    // body, with a dark outline and tip ticks, so it reads as a wing
    // instead of melting into the body.
    const wingFlap = pose === 'jump' ? -2.1 + Math.sin(state.elapsed * 16) * 0.35 : pose === 'slide' ? 0.55 : pose === 'hurt' ? -1.0 + Math.sin(state.elapsed * 20) * 0.4 : Math.sin(p.runPhase * 2) * 0.55 - 0.25;
    const wingLen = pose === 'jump' ? 38 : 26;
    const wingH = pose === 'jump' ? 19 : 15;
    context.save();
    // On a jump the wing anchors at the top of the body and throws
    // up-back, clear of the body silhouette — centred on the body it
    // read as a belly patch, not a raised wing.
    context.translate(pose === 'jump' ? -4 : 2, pose === 'jump' ? -bodyH - 2 : -bodyH / 2 - 8);
    context.rotate(wingFlap);
    context.fillStyle = '#b57a35';
    context.strokeStyle = '#5a3a1a';
    context.lineWidth = 2.5;
    context.beginPath();
    context.ellipse(-4, 0, wingLen, wingH, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = 'rgba(255,246,224,0.35)';
    context.beginPath();
    context.ellipse(-8, -3, 8, 4, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#5a3a1a';
    context.lineWidth = 2;
    context.beginPath();
    for (let i = -1; i <= 1; i += 1) {
      context.moveTo(-wingLen + 4, i * 6);
      context.lineTo(-wingLen - 8, i * 8);
    }
    context.stroke();
    context.restore();
    // Neck, head, beak, wattle and a bright eye — the head rides higher
    // and the eye goes wide in a jump, narrows in a slide, and turns
    // into a dizzy X when hurt.
    const headX = 26 + (pose === 'slide' ? 6 : 0);
    const headY = -bodyH - 14 + (ducking ? 10 : 0) - (pose === 'jump' ? 8 : 0);
    context.fillStyle = PALETTE.turkeyBody;
    context.fillRect(headX - 6, headY + 6, 12, 18);
    context.fillStyle = '#d9c8a8';
    context.beginPath();
    context.arc(headX, headY, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.wattle;
    context.beginPath();
    context.ellipse(headX + 4, headY + 10, 4, 8, 0.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f2a93c';
    context.beginPath();
    context.moveTo(headX + 10, headY - 2);
    context.lineTo(headX + 24, headY + 2);
    context.lineTo(headX + 10, headY + 6);
    context.closePath();
    context.fill();
    if (pose === 'hurt') {
      context.strokeStyle = '#1c1410';
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(headX + 1, headY - 7);
      context.lineTo(headX + 7, headY - 1);
      context.moveTo(headX + 7, headY - 7);
      context.lineTo(headX + 1, headY - 1);
      context.stroke();
    } else if (pose === 'slide') {
      context.strokeStyle = '#1c1410';
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(headX + 1, headY - 4);
      context.lineTo(headX + 8, headY - 4);
      context.stroke();
    } else {
      context.fillStyle = '#1c1410';
      context.beginPath();
      context.arc(headX + 4, headY - 4, pose === 'jump' ? 3.4 : 2.6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fff';
      context.beginPath();
      context.arc(headX + 5, headY - 5, pose === 'jump' ? 1.4 : 1, 0, Math.PI * 2);
      context.fill();
    }
    // A red snood over the beak, and a feather shield ring when armed.
    context.fillStyle = PALETTE.wattle;
    context.beginPath();
    context.ellipse(headX + 8, headY - 10, 3, 6, 0.4, 0, Math.PI * 2);
    context.fill();
    if (p.shield) {
      context.strokeStyle = 'rgba(255,255,255,0.85)';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(4, -bodyH / 2 - 4, 52, 0, Math.PI * 2);
      context.stroke();
    }
    // Impact starburst on a fresh hit, drawn AFTER the body so it is
    // never buried under the feathers.
    if (pose === 'hurt') {
      const sa = clamp(p.squash, 0, 1);
      context.strokeStyle = `rgba(255,255,255,${0.9 * sa})`;
      context.lineWidth = 3;
      context.beginPath();
      for (let i = 0; i < 4; i += 1) {
        const a = (i * Math.PI) / 4;
        const r = 30 * sa + 8;
        context.moveTo(4 - Math.cos(a) * r, -44 - Math.sin(a) * r);
        context.lineTo(4 + Math.cos(a) * r, -44 + Math.sin(a) * r);
      }
      context.stroke();
    }
    // Dash speed lines streaming past the tail.
    if (p.dashing) {
      context.strokeStyle = 'rgba(255,246,224,0.5)';
      context.lineWidth = 3;
      context.beginPath();
      for (let i = 0; i < 3; i += 1) {
        const ly = -20 - i * 18;
        const lx = -52 - ((state.elapsed * 300 + i * 40) % 40);
        context.moveTo(lx, ly);
        context.lineTo(lx + 26, ly);
      }
      context.stroke();
    }
    context.restore();
  }

    // ---- the farmer ----
    // Three states: leaning run with pumping arms and dust, windup
    // with the knife cocked high, close-chase lunge with a shouting
    // face. Drawn ~22% bigger than before, so the second lead still
    // reads when the contact sheet shrinks.
  function drawFarmer(state, scale, screen) {
    const f = state.farmer;
    const gap = f.gap;
    // Muted once more (was #2e5fa8/#c0392b, then #47688f/#a05243): the
    // farmer was the most saturated figure in every frame; the turkey
    // must lead now.
    const OVERALLS = '#4b6584', SHIRT = '#93554a', SHIRT_DK = '#74483e', LEG = '#405773';
    // The pursuer is always on screen, clamped to the left edge: the
    // chase must read at a glance in every frame. The metres above him
    // and the progress bar give the true distance. The clamp keeps his
    // whole body on screen, and the label sits on a dark pill so it
    // never clips against the edge or washes out against the sky.
    const fx = Math.max(TURKEY_X - gap * PX_PER_M, 34);
    const gy = FIELD.groundY;
    const bob = Math.abs(Math.sin(f.anim)) * 6;
    const windup = f.windup > 0;
    const close = gap < 16;
    const surging = f.surge > 0;
    // No gap label on the title or the over screen: the race has
    // not started / is over, so the metres mean nothing there and
    // the pill is clutter at the left edge. It stays on every
    // screen where the chase is live.
    if (gap > 22 && screen !== SCREEN_TITLE && screen !== SCREEN_OVER) {
      const label = `${Math.round(gap)}m`;
      // The label never hugs the left edge: when the farmer is
      // clamped to the edge his label used to start at x=14, which
      // reads as clipped on the contact sheet. It now sits at least
      // 24 px in, centred on the farmer when he is further right.
      // Its height follows the farmer's scale, so it still floats
      // the same distance above his hat when he is drawn smaller.
      const labelCx = Math.max(fx + 6, 50);
      const labelTop = gy - 134 * scale - 50;
      pill(labelCx - 26, labelTop, 52, 26, 9, 'rgba(20,10,2,0.65)');
      text(label, labelCx, labelTop + 19, 17, '#ffd9d0', 'center', '800');
    }
    // A pool of sunlit dirt under his feet, drawn before the shadow,
    // so his dark boots read against the track.
    context.save();
    context.translate(fx + 4, gy + 6);
    context.scale(1, 0.25);
    context.beginPath();
    context.arc(0, 0, 78, 0, Math.PI * 2);
    context.clip();
    context.drawImage(farmerPatchSprite, -92, -92, 184, 184);
    context.restore();
    // Soft contact shadow under the farmer, wider now he is bigger.
    ellipse(fx + 4, gy + 4, 32, 7, 'rgba(20,10,2,0.28)');
    context.save();
    context.translate(fx, gy - bob);
    // Lean into the chase — further forward the closer he gets; he
    // rocks back a little while winding up a throw.
    context.rotate(windup ? -0.06 : close ? 0.16 : 0.11);
    context.scale(scale, scale);
    // Speed lines streaming behind him while he surges after a hit.
    if (surging) {
      context.strokeStyle = 'rgba(255,246,224,0.55)';
      context.lineWidth = 3;
      context.beginPath();
      for (let i = 0; i < 3; i += 1) {
        const ly = -34 - i * 24;
        const lx = -66 - ((state.elapsed * 260 + i * 36) % 36);
        context.moveTo(lx, ly);
        context.lineTo(lx + 30, ly);
      }
      context.stroke();
    }
    // Dust kicked up by each stride.
    const stride = Math.sin(f.anim);
    const dustA = Math.max(0, Math.sin(f.anim * 2)) * 0.6;
    context.fillStyle = `rgba(214,178,120,${dustA})`;
    context.beginPath();
    context.ellipse(-6 + stride * 14, -2, 9, 4, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(8 - stride * 14, -1, 7, 3.5, 0, 0, Math.PI * 2);
    context.fill();
    // Legs — bent knees, blue overalls, brown boots at the end of each
    // stride, instead of two straight sticks.
    function leg(hipX, kneeX, footX) {
      context.strokeStyle = LEG;
      context.lineWidth = 9;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(hipX, -38);
      context.lineTo(kneeX, -18);
      context.lineTo(footX, -2);
      context.stroke();
      context.fillStyle = '#3a2a18';
      context.beginPath();
      context.ellipse(footX + 3, -2, 8, 4.5, 0, 0, Math.PI * 2);
      context.fill();
    }
    leg(-5, -5 + stride * 8, -5 + stride * 15);
    leg(9, 9 - stride * 8, 9 - stride * 15);
    // Blue overalls over a red plaid shirt, with shoulder straps and
    // brass buttons — a farmer, not a red rectangle.
    context.fillStyle = OVERALLS;
    context.fillRect(-14, -78, 34, 42);
    context.fillStyle = SHIRT;
    context.fillRect(-16, -96, 38, 22);
    context.fillStyle = OVERALLS;
    context.fillRect(-12, -96, 6, 22);
    context.fillRect(8, -96, 6, 22);
    context.fillStyle = '#ffd23e';
    context.beginPath();
    context.arc(-9, -76, 2.2, 0, Math.PI * 2);
    context.arc(11, -76, 2.2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.22)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-18, -88);
    context.lineTo(24, -88);
    context.moveTo(-18, -80);
    context.lineTo(24, -80);
    context.moveTo(-2, -96);
    context.lineTo(-2, -74);
    context.moveTo(10, -96);
    context.lineTo(10, -74);
    context.stroke();
    // Arms — both pumping while he runs; the throwing arm cocks high
    // behind his head on a windup, knife in hand, with a white arc
    // showing the throw that is coming.
    const pump = Math.sin(f.anim) * 7;
    context.strokeStyle = SHIRT_DK;
    context.lineWidth = 9;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(-14, -92);
    context.lineTo(-26, -76 + pump);
    context.lineTo(-22, -62 + pump);
    context.stroke();
    context.beginPath();
    context.moveTo(20, -92);
    if (windup) {
      context.lineTo(36, -106);
      context.lineTo(48, -128);
    } else {
      context.lineTo(32, -76 - pump);
      context.lineTo(28, -62 - pump);
    }
    context.stroke();
    // Hands.
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(-22, -62 + pump, 5, 0, Math.PI * 2);
    context.fill();
    if (windup) {
      // The knife itself, drawn in the farmer's own coordinates — the
      // old code called drawKnife here with world heights, which put
      // the blade off the bottom of the screen, so his hand was empty.
      context.beginPath();
      context.arc(48, -128, 5, 0, Math.PI * 2);
      context.fill();
      context.save();
      context.translate(48, -128);
      context.rotate(-0.9);
      context.fillStyle = PALETTE.knifeBlade;
      context.beginPath();
      context.moveTo(-4, -4);
      context.lineTo(18, -4);
      context.lineTo(28, 0);
      context.lineTo(18, 4);
      context.lineTo(-4, 4);
      context.closePath();
      context.fill();
      context.strokeStyle = 'rgba(20,20,30,0.7)';
      context.lineWidth = 1.5;
      context.stroke();
      context.fillStyle = PALETTE.knifeHandle;
      context.fillRect(-14, -4, 11, 8);
      context.restore();
      // White throw arc sweeping over his head.
      context.strokeStyle = 'rgba(255,255,255,0.75)';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(20, -112, 34, -2.4, -0.6);
      context.stroke();
    } else {
      context.beginPath();
      context.arc(28, -62 - pump, 5, 0, Math.PI * 2);
      context.fill();
    }
    // Head: skin, a grey beard and nose, two eyes, and brows that
    // slant angry when he closes in — plus an open shouting mouth.
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(4, -108, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#8a8a8a';
    context.beginPath();
    context.arc(4, -99, 10, 0, Math.PI);
    context.fill();
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(18, -108, 3.5, 0, Math.PI * 2);
    context.fill();
    // Eyes.
    context.fillStyle = '#fff';
    context.beginPath();
    context.arc(7, -111, 3, 0, Math.PI * 2);
    context.arc(14, -111, 3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1c1410';
    context.beginPath();
    context.arc(8, -111, 1.6, 0, Math.PI * 2);
    context.arc(15, -111, 1.6, 0, Math.PI * 2);
    context.fill();
    // Brows: flat while cruising, slanted down toward the nose when
    // he is close or winding up — the chase reads on his face.
    context.strokeStyle = '#3a2a18';
    context.lineWidth = 2.5;
    context.beginPath();
    if (close || windup) {
      context.moveTo(3, -118);
      context.lineTo(10, -115);
      context.moveTo(17, -118);
      context.lineTo(11, -115);
    } else {
      context.moveTo(3, -117);
      context.lineTo(10, -117);
      context.moveTo(11, -117);
      context.lineTo(18, -117);
    }
    context.stroke();
    // Mouth: a small line while cruising, a wide shout when close.
    if (close || windup) {
      context.fillStyle = '#7a1e10';
      context.beginPath();
      context.ellipse(10, -99, 4.5, 5.5, 0, 0, Math.PI * 2);
      context.fill();
    } else {
      context.strokeStyle = '#7a4a28';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(7, -100);
      context.lineTo(13, -100);
      context.stroke();
    }
    // Straw hat, brim wide enough to read, with its red band.
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.ellipse(4, -118, 23, 6, 0, 0, Math.PI * 2);
    context.fill();
    context.fillRect(-8, -134, 22, 16);
    context.fillStyle = SHIRT;
    context.fillRect(-8, -121, 22, 4);
    // "!" when he is close enough to smell dinner.
    if (gap < 12) {
      const pulse = 0.7 + Math.sin(state.elapsed * 8) * 0.3;
      text('!', 4, -156, 30, `rgba(255,70,50,${pulse})`, 'center', '900');
    }
    context.restore();
  }

  // ---- particles, leaves, vignette ----
  // Four kinds, each with its own shape so the burst reads as what it
  // is instead of a scatter of grey dots: dust is a soft two-tone
  // puff that grows as it fades, feathers are brown teardrops with a
  // pale tip and a quill line, embers are rising flame tongues drawn
  // additively so they glow, and gold sparkles are four-point stars.
  function drawParticles(state) {
    let drawn = 0; // MAX_DRAW_PARTICLES bound, shared by both passes
    // Additive pass first: embers and sparkles glow against sky and
    // ground alike instead of sitting on top as flat discs.
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const p of state.particles) {
      if (!p.active || (p.kind !== 2 && p.kind !== 3)) continue;
      if (drawn >= MAX_DRAW_PARTICLES) break;
      drawn += 1;
      const a = clamp(p.life / p.max, 0, 1);
      if (p.kind === 2) { // embers — a rising flame tongue
        // An ember only burns above a live oven. If its oven was hit
        // or smashed away, the flame dies with it instead of hanging
        // in mid-air behind the farmer; a passed oven's embers fade
        // with it at the same 0.28 the oven itself fades to.
        let ovenAlpha = 0;
        for (const e of state.entities) {
          if (!e.active || e.kind !== KIND_OVEN) continue;
          const osx = TURKEY_X + (e.x - state.distance) * PX_PER_M;
          const wPx = e.w * PX_PER_M;
          if (p.x >= osx - 30 && p.x <= osx + wPx + 30) {
            ovenAlpha = osx + wPx < TURKEY_X ? 0.28 : 1;
            break;
          }
        }
        if (ovenAlpha === 0) continue;
        const ea = a * ovenAlpha;
        const h = p.size * (2.6 + (1 - a) * 1.8);
        // Ember glow as a sprite: the same radial circle the gradient
        // painted (centre p.y - h*0.4, radius h), clipped to the old
        // flame ellipse, alpha from globalAlpha — no gradient object
        // and no template strings per ember per frame.
        context.save();
        context.globalAlpha = ea;
        context.beginPath();
        context.ellipse(p.x, p.y - h * 0.3, p.size * 1.2, h, 0, 0, Math.PI * 2);
        context.clip();
        context.drawImage(emberSprite, p.x - h, p.y - h * 0.4 - h, h * 2, h * 2);
        context.restore();
        // Bright core so the flame reads even at contact-sheet size.
        context.fillStyle = `rgba(255,240,170,${0.9 * ea})`;
        context.beginPath();
        context.arc(p.x, p.y - h * 0.25, Math.max(2, p.size * 0.45), 0, Math.PI * 2);
        context.fill();
      } else if (p.kind === 3) { // golden sparkles — four-point stars
        const r = p.size * (0.7 + a * 0.9);
        context.fillStyle = `rgba(255,214,80,${0.95 * a})`;
        context.beginPath();
        context.moveTo(p.x, p.y - r * 1.7);
        context.quadraticCurveTo(p.x, p.y, p.x + r * 1.7, p.y);
        context.quadraticCurveTo(p.x, p.y, p.x, p.y + r * 1.7);
        context.quadraticCurveTo(p.x, p.y, p.x - r * 1.7, p.y);
        context.quadraticCurveTo(p.x, p.y, p.x, p.y - r * 1.7);
        context.fill();
        context.fillStyle = `rgba(255,255,255,${0.9 * a})`;
        context.beginPath();
        context.arc(p.x, p.y, r * 0.35, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.restore();
    for (const p of state.particles) {
      if (!p.active || (p.kind !== 0 && p.kind !== 1)) continue;
      if (drawn >= MAX_DRAW_PARTICLES) break;
      drawn += 1;
      const a = clamp(p.life / p.max, 0, 1);
      if (p.kind === 0) { // dust — soft puff, pale core, grows as it fades
        const r = p.size * (1.6 - a * 0.6);
        // A fainter outer halo, so the puff feathers into the air
        // instead of ending on a hard round edge.
        context.fillStyle = `rgba(214,178,120,${a * 0.22})`;
        context.beginPath();
        context.arc(p.x, p.y, r * 1.6, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = `rgba(214,178,120,${a * 0.55})`;
        context.beginPath();
        context.arc(p.x, p.y, r, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = `rgba(240,214,170,${a * 0.5})`;
        context.beginPath();
        context.arc(p.x - r * 0.2, p.y - r * 0.25, r * 0.55, 0, Math.PI * 2);
        context.fill();
      } else if (p.kind === 1) { // feathers — teardrop, pale tip, quill
        context.save();
        context.translate(p.x, p.y);
        context.rotate(p.life * 6);
        context.fillStyle = `rgba(150,90,40,${a})`;
        context.beginPath();
        context.ellipse(0, 0, p.size * 1.15, p.size * 0.6, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = `rgba(255,246,224,${a * 0.9})`;
        context.beginPath();
        context.ellipse(p.size * 0.55, 0, p.size * 0.45, p.size * 0.32, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = `rgba(60,25,5,${a * 0.8})`;
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(-p.size, 0);
        context.lineTo(p.size, 0);
        context.stroke();
        context.restore();
      }
    }
    for (const l of state.leaves) {
      context.save();
      context.translate(l.x, l.y);
      context.rotate(Math.sin(state.elapsed + l.ph) * 0.8);
      context.fillStyle = l.s > 5 ? 'rgba(217,79,48,0.85)' : 'rgba(232,161,58,0.85)';
      context.beginPath();
      context.ellipse(0, 0, l.s, l.s * 0.55, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  function drawDangerVignette(state) {
    const gap = state.farmer.gap;
    if (gap > 12) return;
    const a = (1 - gap / 12) * (0.35 + Math.sin(state.elapsed * 7) * 0.12);
    // Cached gradient (alpha 1 at the rim) + globalAlpha: identical
    // paint to a gradient rebuilt with the rim alpha baked in.
    context.save();
    context.globalAlpha = a;
    context.fillStyle = vignetteGrad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.restore();
  }

  // ---- HUD ----
  function drawHud(state, best, screen) {
    const stage = STAGES[state.stage];
    // The bar is OPAQUE now, not 0.72 alpha: a translucent bar let the
    // sky show through as smudges — clouds behind it read as grey
    // patches on the bar, and on the end frame the fireworks glow
    // behind it pushed one stretch of the bar to R=133 against R=76
    // elsewhere (std 22.9 in the plain bar zone, measured off the
    // screenshot). At contact-sheet size that reads as a dirty bar.
    // Opaque, the bar is one flat dark band in all four frames, and
    // the birds that used to show faintly through it simply pass
    // behind it, as they should.
    pill(14, 12, 1260, 66, 14, '#150b02', 'rgba(242,193,78,0.55)');
    // Score, big and left.
    text('SCORE', 34, 34, 15, PALETTE.muted, 'left', '800');
    text(String(Math.floor(state.score)), 34, 66, 34, PALETTE.text, 'left', '900');
    // Distance progress bar in the middle, with stage ticks.
    const barX = 300, barW = 620, barY = 26;
    text('ESCAPE', barX, 34, 15, PALETTE.muted, 'left', '800');
    pill(barX, barY + 12, barW, 16, 8, 'rgba(255,255,255,0.16)');
    const prog = clamp(state.distance / TOTAL_DISTANCE, 0, 1);
    pill(barX, barY + 12, Math.max(16, barW * prog), 16, 8, hudProgGrad);
    for (let i = 1; i < 4; i += 1) {
      const tx = barX + (barW * i) / 4;
      context.fillStyle = 'rgba(255,246,224,0.9)';
      context.fillRect(tx - 1, barY + 10, 2, 20);
    }
    // Turkey and farmer markers ride ON TOP of the bar as solid
    // triangles — emoji at 16 px turned to mush when the sheet shrinks.
    // They straddle the bar's top edge, clear of the ESCAPE label above.
    const tx = barX + barW * prog;
    const fxm = barX + barW * clamp((state.distance - state.farmer.gap) / TOTAL_DISTANCE, 0, 1);
    function marker(mx, color) {
      context.fillStyle = color;
      context.strokeStyle = 'rgba(20,10,2,0.8)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(mx - 8, barY + 8);
      context.lineTo(mx + 8, barY + 8);
      context.lineTo(mx, barY + 18);
      context.closePath();
      context.fill();
      context.stroke();
    }
    // When the chase is tight the two markers would sit on each other:
    // nudge the farmer's a little to the left so both still read.
    marker(tx, '#ffd23e');
    marker(Math.abs(tx - fxm) < 16 ? fxm - 14 : fxm, '#ff5a3c');
    text(`${Math.floor(state.distance)}m / ${TOTAL_DISTANCE}m`, barX + barW / 2, 66, 17, PALETTE.text, 'center', '700');
    // Hearts on the right — hidden on the end screen: the run is
    // over, so the lives left mean nothing there, and the headline
    // owns the frame, so the hearts are clutter. They stay on every
    // screen where the chase is still live. On the end screen the
    // same slot gets a gold rank pill instead: without it the top
    // bar's right end is an empty black hole (the only frame where
    // the HUD is visibly incomplete at contact-sheet size).
    if (screen !== SCREEN_OVER) {
      text('LIVES', 1150, 34, 15, PALETTE.muted, 'left', '800');
      for (let i = 0; i < LIVES; i += 1) {
        const hx = 1146 + i * 30;
        const alive = i < state.lives;
        context.fillStyle = alive ? '#ff5a3c' : 'rgba(255,255,255,0.18)';
        context.beginPath();
        context.arc(hx + 8, 52, 8, 0, Math.PI * 2);
        context.arc(hx + 20, 52, 8, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.moveTo(hx, 56);
        context.lineTo(hx + 28, 56);
        context.lineTo(hx + 14, 70);
        context.closePath();
        context.fill();
      }
    } else {
      pill(1136, 36, 130, 30, 10, 'rgba(255,210,62,0.95)');
      text(state.escaped ? '★ FREE BIRD' : '★ CAUGHT', 1201, 56, 15, '#3a2400', 'center', '900');
    }
    // COMBO pill bounces per pickup, gold at the x5 cap.
    if (state.combo >= 2) {
      const bp = 1 + 0.3 * Math.max(0, state.comboPop) / 0.22;
      const gold = state.combo >= PICKUP.comboMax;
      pill(105 - 75 * bp, 103 - 17 * bp, 150 * bp, 34 * bp, 10,
        gold ? 'rgba(255,210,62,0.95)' : 'rgba(255,122,30,0.9)');
      text(`COMBO x${state.combo}`, 105, 110, 20, gold ? '#3a2400' : '#fff6e0', 'center', '900');
    }
    // Stamina bar, bottom left, with a dash hint.
    pill(24, 428, 220, 14, 7, 'rgba(20,10,2,0.6)');
    pill(24, 428, Math.max(10, 220 * state.player.stamina / TURKEY.staminaMax), 14, 7, hudStamGrad);
    text('DASH — SHIFT', 254, 440, 16, 'rgba(255,246,224,0.9)', 'left', '700');
    if (state.player.shield) text('🛡 SHIELD', 24, 412, 16, '#fff', 'left', '800');
    if (state.player.pumpkin > 0) text(`★ GOLDEN ${Math.ceil(state.player.pumpkin)}s`, 24, 392, 18, '#ffd23e', 'left', '900');
    // Stage name, small, bottom right.
    text(`${stage.name}  •  BEST ${Math.max(best, Math.floor(state.score))}`, 1256, 440, 16, 'rgba(255,246,224,0.9)', 'right', '700');
    // Flash message, centre.
    if (state.flashTimer > 0 && state.flash) {
      const a = clamp(state.flashTimer, 0, 1);
      pill(390, 92, 500, 44, 12, `rgba(20,10,2,${0.75 * a})`, `rgba(242,193,78,${a})`);
      text(state.flash, 640, 122, 22, `rgba(255,246,224,${a})`, 'center', '900');
    }
    // Stage banner, big and fading.
    if (state.bannerTimer > 0 && state.banner) {
      const a = clamp(state.bannerTimer / 1.2, 0, 1);
      text(state.banner, 640, 168, 56, `rgba(255,246,224,${a})`, 'center', '900');
      text(STAGES[state.stage].sub, 640, 200, 20, `rgba(255,210,62,${a})`, 'center', '700');
    }
  }

  // ---- panels ----
  function drawTitle(state, best) {
    // A dark gradient at the top and bottom so the text reads over the scene.
    context.fillStyle = titleGrad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // The whole title text block sits 8 px higher (kicker 64, title 132,
    // subtitle 141, panel 180) so the 1.20 title turkey's head clears the
    // panel bottom (now y=268); the kicker sits on a dark pill for contrast.
    pill(420, 42, 440, 30, 12, 'rgba(20,8,2,0.45)');
    text('THANKSGIVING IS COMING…', 640, 64, 22, '#ffd23e', 'center', '900');
    context.save();
    context.shadowColor = 'rgba(255,122,30,0.8)';
    context.shadowBlur = 34;
    text('TURKEY RUN!', 640, 132, 88, '#fff6e0', 'center', '900');
    context.restore();
    // The subtitle sits on a dark pill now, not bare white on the
    // orange sky: at contact-sheet size the white text went grey and
    // tired against the bright sky. The pill is 680 px wide — the
    // line measures ~650 px at 24 px, so the text sits inside it
    // with ~15 px to spare each side (the first version was 600 px
    // and the ends of the line stuck out past the pill). It clears
    // the title above (top y=141) and the instruction panel below
    // (bottom y=175, panel top y=180).
    pill(300, 141, 680, 34, 12, 'rgba(20,8,2,0.55)');
    text('Escape the farm. Dodge the oven. Outrun the farmer.', 640, 168, 24, '#ffe9b0', 'center', '700');
    // The instruction panel sits 8 px higher than before (top y=180),
    // and its lines are tightened (210/238/264 -> 206/232/256, height
    // 100 -> 88, bottom y=268) so the title turkey can grow to 1.20:
    // the turkey's head used to clear its bottom edge by only ~10 px
    // at 1.09 — the tightest spot on the title frame, measured off
    // the screenshot, not guessed. The 26 px line spacing still
    // clears the 20 px text, and the panel still clears the subtitle
    // above it (whose descenders end ~y=173) by 7 px.
    pill(250, 180, 780, 88, 16, PALETTE.panel, PALETTE.panelEdge);
    text('↑ / SPACE — jump fences & ovens', 640, 206, 20, PALETTE.text, 'center', '700');
    text('SHIFT — dash   •   ↓ near hay — hide   •   ↓ — duck high knives', 640, 232, 20, PALETTE.text, 'center', '700');
    text('Corn = combo  •  Golden pumpkin = untouchable  •  Feather = shield', 640, 256, 19, PALETTE.muted, 'center', '700');
    if (best > 0) text(`BEST ESCAPE  ${best}`, 640, 314, 20, '#ffd23e', 'center', '900');
    const blink = Math.floor(state.elapsed * 2) % 2 === 0;
    if (blink) text('▶  PRESS SPACE OR CLICK TO RUN', 640, 354, 26, '#fff6e0', 'center', '900');
    // The closing line sits 10 px lower than before (y=462): the
    // turkey's tail fan used to end only ~47 px above it, and the line
    // reads as crowded under the bird. Now the tail has room to
    // breathe, and the line still clears the bottom edge by ~14 px.
    // It is 18 px, not 16: at contact-sheet size 16 px renders as
    // ~8 px, the smallest text on the title, and it is the only line
    // without a backing pill — 18 px at 0.9 alpha keeps it a readable
    // footer instead of a grey hairline. The line is ~775 px wide at
    // 18 px, still well inside the frame on its dark ground.
    text('A 1,500 m dash through the farmyard, the woods, the riverbank — to the freedom fence.', 640, 462, 18, 'rgba(255,246,224,0.9)', 'center', '700');
    // Foreground corners, so the bottom of the title is not empty stage:
    // a pumpkin pile on the left, a fence run and a hay bale on the
    // right. The pile sits clear of the farmer (left edge) with room to
    // breathe — it used to crowd his boots — and clear of the turkey.
    drawPumpkin(152, FIELD.groundY - 6, 26);
    drawPumpkin(198, FIELD.groundY - 4, 20);
    drawPumpkin(174, FIELD.groundY - 28, 17);
    drawFenceRun(1150, FIELD.groundY, STAGES[state.stage]);
    drawHayBale(1218, FIELD.groundY, 0.9);
    drawPumpkin(1096, FIELD.groundY - 4, 16);
  }

  function drawPaused() {
    context.fillStyle = 'rgba(20,8,2,0.6)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    pill(390, 150, 500, 170, 18, PALETTE.panel, PALETTE.panelEdge);
    text('PAUSED', 640, 212, 48, PALETTE.text, 'center', '900');
    text('The farmer waits. The oven stays hot.', 640, 248, 20, PALETTE.muted, 'center', '700');
    text('P — resume    M — mute    R — restart', 640, 286, 20, PALETTE.corn, 'center', '700');
  }

  function drawOver(state, best, escaped) {
    const score = Math.floor(state.score);
    context.fillStyle = escaped ? 'rgba(60,40,0,0.30)' : 'rgba(20,4,2,0.62)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    if (escaped) {
      // Golden fireworks flanking the headline (two bursts, not one
      // ring centred on it — the old ring put dots across the subtitle
      // lines). 12 dots each, 8–12 px, gold/orange/white, with cross
      // sparkles; clear of the HUD (dots below y≈105), the subtitle
      // (bursts at x 90–270 and 1010–1190, text lives 400–880) and the
      // score panel (dots above y≈195).
      const glow = context.createRadialGradient(640, 120, 10, 640, 120, 260);
      glow.addColorStop(0, 'rgba(255,190,60,0.5)');
      glow.addColorStop(1, 'rgba(255,190,60,0)');
      context.fillStyle = glow;
      // The rect must cover the whole gradient radius (260): the old
      // 520x320 rect cut it at 160 from centre, ~0.19 alpha, a hard
      // horizontal edge at y=280 across the frame.
      context.fillRect(380, -140, 520, 520);
      for (const [bcx, bcy] of [[180, 150], [1100, 150]]) {
        // A soft glow behind each burst, so the dots read as one
        // explosion of light instead of flat coloured bubbles.
        const bg = context.createRadialGradient(bcx, bcy, 6, bcx, bcy, 95);
        bg.addColorStop(0, 'rgba(255,190,60,0.30)');
        bg.addColorStop(1, 'rgba(255,190,60,0)');
        context.fillStyle = bg;
        context.fillRect(bcx - 95, bcy - 95, 190, 190);
        // Radial streaks from the burst centre first, then the dots
        // on top: the old bursts were dots alone, and at half size
        // they read as scattered bubbles floating over the headline.
        // Eight short rays make each cluster read as one explosion.
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2 + state.elapsed * 0.25;
          const r0 = 18 + (i % 2) * 8;
          const r1 = 62 + ((i * 29) % 34);
          context.strokeStyle = i % 2 === 0 ? 'rgba(255,210,62,0.75)' : 'rgba(255,246,224,0.7)';
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(bcx + Math.cos(a) * r0, bcy + Math.sin(a) * r0 * 0.55);
          context.lineTo(bcx + Math.cos(a) * r1, bcy + Math.sin(a) * r1 * 0.55);
          context.stroke();
        }
        for (let i = 0; i < 12; i += 1) {
          const a = (i / 12) * Math.PI * 2 + state.elapsed * 0.25;
          const r = 42 + ((i * 37) % 48);
          const fx = bcx + Math.cos(a) * r;
          const fy = bcy + Math.sin(a) * r * 0.55;
          context.fillStyle = i % 3 === 0 ? '#ffd23e' : i % 3 === 1 ? '#ff7a1e' : '#fff6e0';
          context.beginPath();
          context.arc(fx, fy, 8 + (i % 3) * 2, 0, Math.PI * 2);
          context.fill();
          // Cross sparkle on every third burst dot.
          if (i % 3 === 0) {
            context.strokeStyle = 'rgba(255,246,224,0.9)';
            context.lineWidth = 2.5;
            context.beginPath();
            context.moveTo(fx - 13, fy);
            context.lineTo(fx + 13, fy);
            context.moveTo(fx, fy - 13);
            context.lineTo(fx, fy + 13);
            context.stroke();
          }
        }
      }
      // Golden feathers drifting down through the fireworks — the
      // escape reads as a celebration, not just a headline. They fall
      // only in the outer thirds of the frame now: the old fall
      // crossed the whole width, so a feather could land on the
      // subtitle or the re-run prompt. The centre column stays clear.
      // They start below y=90, so none ever sits on the HUD bar, and
      // stay off the hero turkey: any feather whose centre would land
      // in the bird's box (x 240..460, y 225..410) is skipped.
      for (let i = 0; i < 8; i += 1) {
        const fx = (i < 4 ? 80 + i * 85 : 920 + (i - 4) * 85) + Math.sin(state.elapsed * 0.9 + i * 2.1) * 22;
        const fy = 90 + ((state.elapsed * 26 + i * 97) % 380);
        if (fx > 240 && fx < 460 && fy > 225 && fy < 410) continue;
        context.save();
        context.translate(fx, fy);
        context.rotate(Math.sin(state.elapsed + i) * 0.7);
        context.fillStyle = i % 2 === 0 ? 'rgba(255,214,80,0.9)' : 'rgba(255,246,224,0.9)';
        context.beginPath();
        context.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = 'rgba(150,90,40,0.7)';
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(-10, 0);
        context.lineTo(10, 0);
        context.stroke();
        context.restore();
      }
      // A tuft of verge grass and a couple of wildflowers on the bare
      // stretch between the farmer and the freedom fence: that patch
      // of track used to sit empty while the cover's verge is dotted
      // with grass and leaves, so the end frame now echoes the cover.
      // Only on the escape — the fence is at a fixed screen x here
      // (distance 1500), so the tufts can sit at fixed screen x too,
      // clear of the stamina bar below (top y=428) and the SHIELD
      // label to the left.
      for (const [gx, gh, gc] of END_TUFTS) {
        context.strokeStyle = gc;
        context.lineWidth = 2.5;
        context.beginPath();
        context.moveTo(gx, 422);
        context.lineTo(gx - 4, 422 - gh);
        context.moveTo(gx, 422);
        context.lineTo(gx, 422 - gh - 3);
        context.moveTo(gx + 4, 422);
        context.lineTo(gx + 6, 422 - gh + 2);
        context.stroke();
      }
      ellipse(150, 420, 3, 3, '#e86a1e');
      ellipse(196, 418, 3, 3, '#f2c14e');
      ellipse(226, 421, 6, 3.5, '#e8a13a');
      // The two-line subtitle sits on a dark pill, like the title's
      // kicker and subtitle: bare white 22 px type on the pink
      // sunset sky thinned out at contact-sheet size, and the pill
      // is the same visual language as the title screen. The pill
      // (384..896 x 144..206) clears everything around it — the
      // ESCAPED! title ends above it, the score panel starts 4 px
      // below it, the fireworks stay out at the sides, and even the
      // highest celebrate leap (seed 146's beak tip) stays ~4 px
      // clear of its bottom-left corner; the shipped seed 159's
      // hero head sits ~55 px below it.
      pill(384, 144, 512, 62, 12, 'rgba(20,8,2,0.5)');
      text('ESCAPED!', 640, 136, 80, '#ffd23e', 'center', '900');
      text('The turkey made it past the freedom fence —', 640, 172, 22, PALETTE.text, 'center', '700');
      text('no Thanksgiving dinner tonight.', 640, 196, 22, PALETTE.text, 'center', '700');
    } else {
      // Same subtitle pill as the escape branch: the caught lines sit
      // on the same pink sky at the same spot.
      pill(384, 144, 512, 62, 12, 'rgba(20,8,2,0.5)');
      text('CAUGHT FOR DINNER', 640, 136, 76, '#ff5a3c', 'center', '900');
      text('The farmer finally got his hands on you…', 640, 172, 22, PALETTE.text, 'center', '700');
      text('the oven was already warm.', 640, 196, 22, PALETTE.text, 'center', '700');
    }
    // The score panel sits to the RIGHT of centre, so the turkey at the
    // freedom fence (screen x ~330) is fully visible in the empty space
    // on the left — before, the centred panel covered half the bird.
    pill(470, 210, 460, 170, 18, PALETTE.panel, PALETTE.panelEdge);
    text(`SCORE  ${score}`, 700, 258, 32, PALETTE.text, 'center', '900');
    text(`BEST  ${Math.max(best, score)}`, 700, 290, 20, '#ffd23e', 'center', '800');
    text(`Distance ${Math.floor(state.distance)}m  •  Corn ${state.corn}  •  Combo x${state.bestCombo}  •  Knives ${state.knivesDodged}`, 700, 322, 17, PALETTE.muted, 'center', '700');
    if (escaped) text('RANK: FREE BIRD', 700, 350, 18, '#ffd23e', 'center', '900');
    else if (score >= 1200) text('RANK: SO CLOSE — ALMOST A FREE BIRD', 700, 350, 18, '#ffd23e', 'center', '900');
    else text('RANK: SUNDAY ROAST', 700, 350, 18, '#ffd23e', 'center', '900');
    const blink = Math.floor(state.elapsed * 2) % 2 === 0;
    // Dark pill under the re-run prompt and 8 px lower than before:
    // it used to sit bare over the freedom fence pickets (and a
    // passing knife could cross it), so at half size the white text
    // thinned out against the pale fence. The pill ends at y=416,
    // still 12 px clear of the stamina bar at y=428.
    if (blink) {
      pill(435, 384, 530, 32, 16, 'rgba(30,18,8,0.8)', 'rgba(255,210,62,0.5)');
      text('▶  PRESS SPACE OR CLICK TO RUN AGAIN  (R)', 700, 407, 22, '#fff6e0', 'center', '900');
    }
  }

  // ---- one frame ----
  function drawField(state, screen) {
    const stage = STAGES[state.stage];
    // Play farmyard goes cool (COOL) so the contact sheet's top row
    // is not one orange block twice; title/danger/end are untouched.
    // Turkey 1.12x in play, 1.30x on the title (moved right of the
    // panel, centre x 1040, dx +679: head top ~y270 clears the panel
    // right edge x=1030, beak ~1105 stays ~25 px clear of the barn
    // roof ~1130), 1.8x leaping on the escape screen (head top ~y257,
    // ~46 px clear of the subtitle pill; beak ~x427, ~43 px clear of
    // the score panel). All clearances measured off screenshots.
    const escaped = screen === SCREEN_OVER && state.escaped;
    const turkeyScale = screen === SCREEN_TITLE ? 1.30 : escaped ? 1.8 : 1.12;
    const turkeyDx = screen === SCREEN_TITLE ? 679 : 0;
    const playCool = screen === SCREEN_PLAY && state.stage === 0;
    const view = playCool ? { ...stage, ...COOL } : stage;
    drawSky(state, view, screen);
    drawHills(state, view, screen);
    drawGround(state, view, screen);
    const t = state.elapsed;
    // Pickups and hazards, in world order. Anything the turkey has
    // already run past fades to a ghost of itself: a passed oven used
    // to sit right on top of the farmer at the left edge and hide half
    // of him. Faded, the farmer always reads; the hazard ahead stays
    // at full strength, so the eye goes to the danger that matters.
    for (const e of state.entities) {
      if (!e.active || e.taken) continue;
      const sx = TURKEY_X + (e.x - state.distance) * PX_PER_M;
      if (sx < -260 || sx > FIELD.width + 260) continue;
      const wPx = e.w * PX_PER_M;
      const passed = (e.kind === KIND_OVEN || e.kind === KIND_FENCE || e.kind === KIND_BALE) && sx + wPx < TURKEY_X;
      if (passed) { context.save(); context.globalAlpha = 0.28; }
      if (e.kind === KIND_OVEN) drawOven(sx, wPx, t);
      else if (e.kind === KIND_FENCE) drawFenceObstacle(sx, wPx, e.h);
      else if (e.kind === KIND_BALE) drawHayBale(sx, FIELD.groundY, e.w / 3.4);
      else if (e.kind === KIND_CORN) drawCorn(sx, e.y, t);
      else if (e.kind === KIND_PUMPKIN) drawGoldenPumpkin(sx, e.y, t);
      else if (e.kind === KIND_FEATHER) drawFeatherPickup(sx, e.y, t);
      else if (e.kind === KIND_KNIFE) {
        // A knife that has already flown past the turkey is a spent
        // threat: it can never come back and hit the bird (knives
        // only fly right, faster than the turkey), so it fades out
        // instead of lingering as a lone blade on the right of the
        // frame. A knife still approaching or level with the turkey
        // is always at full strength. The fade never touches the
        // gameplay random stream and never changes a collision: hits
        // are only checked while |d| < 1 m, where alpha is 1.
        const kd = e.x - state.distance;
        const ka = kd > 8 ? clamp(1 - (kd - 8) / 20, 0, 1) : 1;
        // On the escape screen a knife left of the score panel is spent:
        // it lies dropped flat on the ground (same x, blade right, no spin
        // or trail) instead of a spinning blade cutting the FREEDOM label.
        // Knives at/right of the panel (sx >= 470) keep flying.
        // A far knife closing on the play screen gets forward lines along
        // the knife-to-turkey line; a close one keeps the true trail only.
        let aim;
        if (screen === SCREEN_PLAY && ka === 1) {
          const tdx = TURKEY_X + TURKEY.width / 2 - sx;
          if (tdx > 120) {
            const tdy = FIELD.groundY - state.player.y - TURKEY.height / 2 - (FIELD.groundY - e.y);
            aim = Math.atan2(tdy, tdx);
          }
        }
        if (ka > 0 && escaped && sx < 470) drawDroppedKnife(sx);
        else if (ka > 0) drawKnife(sx, e.y, t, ka, aim);
      }
      if (passed) context.restore();
    }
    // Title only: a pool of warm light behind the bird. On the title
    // the turkey stands against the near hill (#6e4520) in almost its
    // own browns (#8a5a2e body), so at half size it sank into the
    // hillside; the glow lifts the hill behind it into a lit backdrop
    // without moving the bird, and it never touches another screen —
    // the instruction panel is drawn on top of it afterwards. The
    // glow moves with the bird (gx follows turkeyDx): since round 21
    // the title bird stands at x=1040, and a glow left behind at
    // x=361 would light empty hillside while the bird stood dark.
    if (screen === SCREEN_TITLE) {
      const gx = TURKEY_X + TURKEY.width / 2 + turkeyDx;
      const gy = FIELD.groundY - 55;
      context.fillStyle = titleGlowGrad;
      context.fillRect(gx - 170, gy - 170, 340, 340);
    }
    // Escape only: a warm pool behind the hero turkey so the brown bird
    // reads against the dark-purple hill (r 210, bird's centre); drawn
    // before turkey/farmer, under the later score panel and pill.
    if (escaped) {
      const gx = TURKEY_X + TURKEY.width / 2;
      const gy = FIELD.groundY - 80;
      context.fillStyle = escapeGlowGrad;
      context.fillRect(gx - 210, gy - 210, 420, 420);
    }
    drawTurkey(state, turkeyScale, escaped, turkeyDx);
    // Pickup pop: gold ring + payoff text at the bird, 0.35 s.
    if (state.pop > 0 && screen === SCREEN_PLAY) {
      const pk = 1 - state.pop / 0.35;
      const pcx = TURKEY_X + TURKEY.width / 2 + turkeyDx;
      const pcy = FIELD.groundY - state.player.y - 44;
      context.strokeStyle = `rgba(255,210,62,${(1 - pk) * 0.9})`;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(pcx, pcy, 40 + pk * 34, 0, Math.PI * 2);
      context.stroke();
      const plabel = state.popKind === 0 ? `+${PICKUP.cornPoints * state.combo}`
        : state.popKind === 1 ? 'GOLDEN!' : 'SHIELD!';
      text(plabel, pcx, pcy - 52 - pk * 22, 22, '#ffd23e', 'center', '900');
    }
    drawFarmer(state, escaped ? 1.0 : 1.22, screen);
    // Haystacks stand in front, so a hiding turkey really disappears.
    // A passed haystack fades with the rest, for the same reason: the
    // farmer at the left edge must never hide behind one.
    for (const e of state.entities) {
      if (!e.active || e.kind !== KIND_HAYSTACK) continue;
      const sx = TURKEY_X + (e.x - state.distance) * PX_PER_M;
      if (sx < -260 || sx > FIELD.width + 260) continue;
      const passed = sx + 40 < TURKEY_X;
      if (passed) { context.save(); context.globalAlpha = 0.35; }
      drawHayBale(sx, FIELD.groundY, 1.9);
      text('HIDE ↓', sx, FIELD.groundY - 88, 18, '#fff6e0', 'center', '900');
      if (passed) context.restore();
    }
    drawParticles(state);
    drawDangerVignette(state);
  }

  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    // Knife-hit shake + white hit flash, play only: both are functions
    // of elapsed/state timers, so the same run paints the same frame,
    // and neither can freeze onto the end screen (step() stops there).
    const shx = screen === SCREEN_PLAY && state.shake > 0 ? Math.sin(state.elapsed * 71) * 5 * state.shake : 0;
    const shy = screen === SCREEN_PLAY && state.shake > 0 ? Math.cos(state.elapsed * 63) * 4 * state.shake : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shx * view.scale, view.y + shy * view.scale);
    drawField(state, screen);
    if (screen === SCREEN_PLAY && state.hitFlash > 0) {
      context.fillStyle = `rgba(255,255,255,${state.hitFlash * 1.2})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) { drawHud(state, best, screen); drawPaused(); }
    // Over screen: the celebration is drawn FIRST and the HUD last.
    // The end frame's gold glow and dim overlay used to paint over
    // the HUD bar (the bar measured R std 29.2 in its plain zone even
    // after the bar went opaque), and the headline's cap top sat at
    // y=75, 3 px under the bar's bottom edge — so the headline and
    // subtitle moved down 4 px as well, and the HUD is now the
    // topmost layer on every screen, identical in all four frames.
    else if (screen === SCREEN_OVER) { drawOver(state, best, state.escaped); drawHud(state, best, screen); }
    else drawHud(state, best, screen);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
