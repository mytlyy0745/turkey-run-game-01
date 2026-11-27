// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x480 playfield is scaled to fit the window and centred. Every
// picture is drawn from code — layered autumn skies, parallax hills,
// trees, fences and pumpkins, a turkey you can recognise at a glance and
// a farmer in hot pursuit, with dust, feathers, embers and falling leaves
// on top, and a big clear HUD. No image, font or sound ever leaves game/.
import { FIELD, PX_PER_M, TURKEY_X, TOTAL_DISTANCE, TURKEY, FARMER, LIVES, FONT, PALETTE, STAGES } from './config.js';
import { KIND_OVEN, KIND_FENCE, KIND_BALE, KIND_HAYSTACK, KIND_CORN, KIND_PUMPKIN, KIND_FEATHER, KIND_KNIFE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const STAGE_LEN = TOTAL_DISTANCE / STAGES.length;

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

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
  function drawSky(state, stage) {
    const g = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    g.addColorStop(0, stage.skyTop);
    g.addColorStop(0.55, stage.skyMid);
    g.addColorStop(1, stage.skyBot);
    context.fillStyle = g;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);
    // Clouds drift on the wind — the high ones from the world, plus three
    // big soft ones lower down, so the middle of the sky is never empty.
    for (const c of state.clouds) {
      context.fillStyle = 'rgba(255,248,230,0.85)';
      ellipse(c.x, c.y, 52 * c.s, 17 * c.s, 'rgba(255,248,230,0.85)');
      ellipse(c.x - 34 * c.s, c.y + 7 * c.s, 34 * c.s, 13 * c.s, 'rgba(255,248,230,0.8)');
      ellipse(c.x + 36 * c.s, c.y + 8 * c.s, 36 * c.s, 12 * c.s, 'rgba(255,248,230,0.8)');
    }
    for (let i = 0; i < 3; i += 1) {
      const cx = ((i * 520 + state.elapsed * 9 - state.distance * 2) % (FIELD.width + 360) + FIELD.width + 360) % (FIELD.width + 360) - 180;
      const cy = 150 + i * 38;
      const cs = 1.15 + (i % 2) * 0.35;
      context.fillStyle = 'rgba(255,240,214,0.5)';
      ellipse(cx, cy, 66 * cs, 18 * cs, 'rgba(255,240,214,0.5)');
      ellipse(cx - 44 * cs, cy + 7, 42 * cs, 13 * cs, 'rgba(255,240,214,0.45)');
      ellipse(cx + 46 * cs, cy + 8, 44 * cs, 12 * cs, 'rgba(255,240,214,0.45)');
    }
    // Low autumn sun with a warm halo, drawn AFTER the clouds so it
    // stays a bright disc instead of hiding behind one.
    const sunX = 1020, sunY = 86;
    const glow = context.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
    glow.addColorStop(0, stage.sunGlow);
    glow.addColorStop(1, 'rgba(255,200,90,0)');
    context.fillStyle = glow;
    context.fillRect(sunX - 140, sunY - 140, 280, 280);
    context.fillStyle = stage.sun;
    context.beginPath();
    context.arc(sunX, sunY, 36, 0, Math.PI * 2);
    context.fill();
    // Two birds crossing the evening sky, and a lower flock of three.
    const bx = (state.elapsed * 26) % (FIELD.width + 200) - 100;
    const by = 62 + Math.sin(state.elapsed * 0.8) * 10;
    context.strokeStyle = 'rgba(60,30,10,0.75)';
    context.lineWidth = 3;
    for (const off of [0, 46]) {
      const flap = Math.sin(state.elapsed * 6 + off) * 5;
      context.beginPath();
      context.moveTo(bx + off - 10, by + flap);
      context.quadraticCurveTo(bx + off, by - 4, bx + off + 10, by + flap);
      context.stroke();
    }
    const fx2 = (FIELD.width + 200 - (state.elapsed * 18) % (FIELD.width + 200)) - 100;
    const fy2 = 152 + Math.sin(state.elapsed * 0.6 + 2) * 8;
    context.strokeStyle = 'rgba(60,30,10,0.6)';
    context.lineWidth = 2.5;
    for (const off of [0, 34, 62]) {
      const flap = Math.sin(state.elapsed * 5 + off) * 4;
      context.beginPath();
      context.moveTo(fx2 + off - 8, fy2 + flap);
      context.quadraticCurveTo(fx2 + off, fy2 - 3, fx2 + off + 8, fy2 + flap);
      context.stroke();
    }
  }

  function ridge(state, offset, amp, base, color, par) {
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
  }
  function stateScroll(state) { return state.distance * PX_PER_M; }

  function drawHills(state, stage) {
    ridge(state, 0, 46, 340, stage.hillFar, 0.12);
    ridge(state, 150, 38, 352, stage.hillMid, 0.18);
    ridge(state, 300, 30, 366, stage.hillNear, 0.25);
    // A red barn silhouette rides the far ridge — the farm reads at a
    // glance even before any fence or pumpkin scrolls past.
    const scroll = stateScroll(state);
    const shift = (scroll * 0.12) % 640;
    for (let i = 0; i < 2; i += 1) {
      const bx = ((i * 980 - scroll * 0.12) % (FIELD.width + 420) + FIELD.width + 420) % (FIELD.width + 420) - 210;
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
  }

  // ---- ground and mid scenery ----
  function drawGround(state, stage) {
    const g = context.createLinearGradient(0, FIELD.groundY, 0, FIELD.height);
    g.addColorStop(0, stage.ground);
    g.addColorStop(1, stage.groundDark);
    context.fillStyle = g;
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
    // Pebbles and fallen leaves on the track, scrolling with the world.
    const leafCols = ['#e8a13a', '#d94f30', '#f2c14e'];
    for (let i = 0; i < 34; i += 1) {
      const wx = i * 197 + ((i * 89) % 60);
      const sx = ((wx - scroll) % (FIELD.width + 120) + FIELD.width + 120) % (FIELD.width + 120) - 60;
      const py = FIELD.groundY + 40 + ((i * 37) % 32);
      if (i % 3 === 0) ellipse(sx, py, 3 + (i % 3), 2, 'rgba(90,55,20,0.5)');
      else if (i % 5 === 0) ellipse(sx, py, 5, 3, leafCols[i % 3]);
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
    for (let i = 0; i < 26; i += 1) {
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
    for (let i = 0; i < 14; i += 1) {
      const wx = i * 263 + ((i * 71) % 80);
      const sx = ((wx - scroll) % (FIELD.width + 120) + FIELD.width + 120) % (FIELD.width + 120) - 60;
      const ly = FIELD.groundY + 8 + ((i * 29) % 22);
      ellipse(sx, ly, 6, 3.5, leafCols[i % 3]);
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
    context.fillStyle = '#d9a83e';
    context.beginPath();
    context.arc(x, gy - 20 * s, 20 * s, Math.PI, 0);
    context.closePath();
    context.fill();
    context.strokeStyle = '#b8892a';
    context.lineWidth = 2;
    for (let i = -2; i <= 2; i += 1) {
      context.beginPath();
      context.moveTo(x + i * 9 * s, gy - 38 * s);
      context.lineTo(x + i * 11 * s, gy - 4 * s);
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
    text('FREEDOM', fx - 20, FIELD.groundY - 132, 26, '#ffd23e', 'center', '900');
  }

  // ---- hazards and pickups ----
  function drawOven(sx, wPx) {
    const gy = FIELD.groundY;
    // Heat glow on the ground around it.
    const glow = context.createRadialGradient(sx + wPx / 2, gy - 30, 6, sx + wPx / 2, gy - 30, 130);
    glow.addColorStop(0, 'rgba(255,122,30,0.5)');
    glow.addColorStop(1, 'rgba(255,122,30,0)');
    context.fillStyle = glow;
    context.fillRect(sx - 90, gy - 120, wPx + 180, 130);
    // Body, chimney and glowing door.
    context.fillStyle = PALETTE.ovenBody;
    pill(sx, gy - 56, wPx, 56, 8, PALETTE.ovenBody);
    context.fillStyle = '#2a2a33';
    context.fillRect(sx + wPx - 26, gy - 82, 18, 28);
    const door = context.createLinearGradient(0, gy - 52, 0, gy - 8);
    door.addColorStop(0, '#ffd23e');
    door.addColorStop(0.5, '#ff7a1e');
    door.addColorStop(1, '#c22e00');
    context.fillStyle = door;
    pill(sx + wPx / 2 - 22, gy - 40, 44, 34, 6, door);
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
    // collide with him.
    if (sx > TURKEY_X) text('OVEN!', sx + wPx / 2, gy - 88, 20, '#ffb03a', 'center', '900');
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
    context.strokeStyle = '#d9a41e';
    context.lineWidth = 1.5;
    for (let i = -1; i <= 1; i += 1) {
      context.beginPath();
      context.moveTo(sx + 8 + i * 5, cy - 11);
      context.lineTo(sx + 8 + i * 5, cy + 11);
      context.stroke();
    }
    const glint = context.createRadialGradient(sx + 4, cy - 6, 1, sx + 4, cy - 6, 12);
    glint.addColorStop(0, 'rgba(255,255,255,0.7)');
    glint.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = glint;
    context.fillRect(sx - 8, cy - 18, 24, 24);
  }

  function drawGoldenPumpkin(sx, y, t) {
    const bob = Math.sin(t * 2.4) * 4;
    const glow = context.createRadialGradient(sx, FIELD.groundY - y + bob, 4, sx, FIELD.groundY - y + bob, 46);
    glow.addColorStop(0, 'rgba(255,210,62,0.65)');
    glow.addColorStop(1, 'rgba(255,210,62,0)');
    context.fillStyle = glow;
    context.fillRect(sx - 50, FIELD.groundY - y - 50 + bob, 100, 100);
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
    const glow = context.createRadialGradient(sx, cy, 2, sx, cy, 30);
    glow.addColorStop(0, 'rgba(255,255,255,0.5)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = glow;
    context.fillRect(sx - 30, cy - 30, 60, 60);
  }

  // A carving knife in flight — bigger than before, with a dark outline
  // so the blade reads against bright sky and dark ground alike, two
  // faint ghost blades trailing it, and a long white speed streak
  // streaming BEHIND it (knives fly to the right, so the trail runs
  // left). In the contact sheet the old knife was a sliver you could
  // barely see; this one is visible at a glance.
  function drawKnife(sx, y, t) {
    const cy = FIELD.groundY - y;
    const spin = t * 9;
    // Ghost blades: afterimages of the spin, fading with distance.
    for (const [off, a] of [[-36, 0.3], [-68, 0.15]]) {
      context.save();
      context.translate(sx + off, cy);
      context.rotate(spin);
      context.globalAlpha = a;
      context.fillStyle = PALETTE.knifeBlade;
      context.beginPath();
      context.moveTo(-24, -8);
      context.lineTo(18, -8);
      context.lineTo(32, 0);
      context.lineTo(18, 8);
      context.lineTo(-24, 8);
      context.closePath();
      context.fill();
      context.restore();
    }
    context.globalAlpha = 1;
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
    // The blade itself, ~35% longer and wider than before.
    context.save();
    context.translate(sx, cy);
    context.rotate(spin);
    context.fillStyle = PALETTE.knifeBlade;
    context.beginPath();
    context.moveTo(-24, -8);
    context.lineTo(18, -8);
    context.lineTo(32, 0);
    context.lineTo(18, 8);
    context.lineTo(-24, 8);
    context.closePath();
    context.fill();
    context.strokeStyle = 'rgba(20,20,30,0.8)';
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = PALETTE.knifeHandle;
    context.fillRect(-40, -8, 17, 16);
    context.fillStyle = 'rgba(20,20,30,0.5)';
    context.fillRect(-40, -8, 4, 16);
    context.restore();
  }

  // ---- the turkey ----
  // Four poses that read at a glance: a pumping run, a stretched jump
  // with wings thrown wide, a low slide, and a dazed hurt wobble. The
  // tail fan, wing angle, legs and eye all change with the pose, so the
  // bird looks alive instead of like one frozen cut-out.
  function drawTurkey(state) {
    const p = state.player;
    const gy = FIELD.groundY;
    const air = p.y > 0;
    const squashY = p.squash > 0 ? 1 - p.squash * 0.18 : 1;
    const squashX = p.squash > 0 ? 1 + p.squash * 0.18 : 1;
    const cx = TURKEY_X + TURKEY.width / 2;
    const feetY = gy - p.y;
    const ducking = p.ducking || p.hiding > 0;
    const bodyH = ducking ? 46 : 74;
    const bodyW = ducking ? 74 : 62;
    const blink = p.invulnerable > 0 && Math.floor(p.invulnerable * 10) % 2 === 0;
    if (blink || p.hiding > 0) return; // hidden behind the haystack, or blinking off
    const pose = air ? 'jump' : ducking ? 'slide' : p.squash > 0.4 ? 'hurt' : 'run';
    const runBob = pose === 'run' ? Math.sin(p.runPhase * 2) * 3 : 0;
    const tilt = pose === 'jump' ? -0.16 : pose === 'slide' ? 0.14 : pose === 'hurt' ? -0.1 + Math.sin(state.elapsed * 18) * 0.06 : 0.05 + Math.sin(p.runPhase * 2) * 0.02;
    // A soft contact shadow grounds the turkey, even mid-jump.
    ellipse(cx, gy + 4, 34 * (1 - clamp(p.y / 320, 0, 0.45)), 7, 'rgba(20,10,2,0.28)');
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
    // Landing dust ring: a flat ring that spreads and fades as the
    // squash settles, so a landing reads even in a still frame.
    if (p.squash > 0 && !air) {
      const k = 1 - p.squash;
      context.strokeStyle = `rgba(240,214,170,${p.squash * 0.55})`;
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(cx, gy + 3, 22 + k * 42, 6 + k * 5, 0, 0, Math.PI * 2);
      context.stroke();
    }
    context.save();
    context.translate(cx, feetY + runBob);
    context.rotate(tilt);
    context.scale(squashX * (pose === 'jump' ? 0.96 : 1), squashY * (pose === 'jump' ? 1.06 : 1));
    if (p.pumpkin > 0) {
      const glow = context.createRadialGradient(0, -44, 6, 0, -44, 110);
      glow.addColorStop(0, 'rgba(255,210,62,0.55)');
      glow.addColorStop(1, 'rgba(255,210,62,0)');
      context.fillStyle = glow;
      context.fillRect(-110, -160, 220, 220);
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
    // in a slide and droops when hurt.
    const tailSpread = pose === 'jump' ? 1.3 : pose === 'slide' ? 0.4 : pose === 'hurt' ? 0.55 : 1 + Math.sin(p.runPhase * 2) * 0.18;
    const tailLift = pose === 'jump' ? -0.35 : pose === 'slide' ? 0.3 : pose === 'hurt' ? 0.35 : 0;
    for (let i = -2; i <= 2; i += 1) {
      const ang = i * 0.42 * tailSpread;
      const len = (pose === 'jump' ? 58 : 48) - Math.abs(i) * 5;
      const col = PALETTE.tail[i + 2];
      context.save();
      context.translate(-6, -bodyH + 26);
      context.rotate(ang - 0.5 + tailLift);
      context.fillStyle = col;
      context.beginPath();
      context.ellipse(0, -len / 2, 15, len / 2, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(60,25,5,0.55)';
      context.beginPath();
      context.ellipse(0, -len + 12, 6, 8, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    // Legs — a big two-beat stride while running, tucked up in the air,
    // stretched out behind in a slide, splayed when hurt.
    const legSwing = Math.sin(p.runPhase * 2);
    context.strokeStyle = '#e8a33c';
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.beginPath();
    if (pose === 'jump') {
      context.moveTo(-4, -14);
      context.lineTo(2, -2);
      context.moveTo(10, -14);
      context.lineTo(16, -4);
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
      context.moveTo(-4, -14);
      context.lineTo(-4 + legSwing * 15, 0);
      context.moveTo(10, -14);
      context.lineTo(10 - legSwing * 15, 0);
    }
    context.stroke();
    if (pose === 'run') {
      // Little feet at the end of each stride.
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(-4 + legSwing * 15, 0);
      context.lineTo(-4 + legSwing * 15 + 8, 0);
      context.moveTo(10 - legSwing * 15, 0);
      context.lineTo(10 - legSwing * 15 + 8, 0);
      context.stroke();
    }
    // Far wing: a darker sliver behind the body, visible when raised.
    if (pose === 'jump' || pose === 'hurt') {
      context.save();
      context.translate(-6, -bodyH / 2 - 10);
      context.rotate(pose === 'jump' ? -1.0 + Math.sin(state.elapsed * 16) * 0.3 : -0.7 + Math.sin(state.elapsed * 20) * 0.3);
      context.fillStyle = PALETTE.turkeyDark;
      context.beginPath();
      context.ellipse(-6, -4, 18, 11, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    // Plump body with scalloped feather rows.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.ellipse(6, -bodyH / 2 - 6, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.turkeyLight;
    for (let r = 0; r < 3; r += 1) {
      for (let i = 0; i < 3; i += 1) {
        context.beginPath();
        context.arc(-8 + i * 16, -bodyH + 22 + r * 16, 8, 0, Math.PI);
        context.fill();
      }
    }
    // Near wing — pumping while running, thrown wide on a jump, tucked
    // flat in a slide, flailing when hurt. A lighter brown with a dark
    // outline, so it reads against the darker body instead of melting
    // into it.
    const wingFlap = pose === 'jump' ? -1.25 + Math.sin(state.elapsed * 16) * 0.35 : pose === 'slide' ? 0.55 : pose === 'hurt' ? -0.9 + Math.sin(state.elapsed * 20) * 0.3 : Math.sin(p.runPhase * 2) * 0.4 - 0.15;
    const wingLen = pose === 'jump' ? 26 : 20;
    const wingH = pose === 'jump' ? 14 : 12;
    context.save();
    context.translate(2, -bodyH / 2 - 8);
    context.rotate(wingFlap);
    context.fillStyle = '#a06830';
    context.strokeStyle = '#5a3a1a';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(-4, 0, wingLen, wingH, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = 'rgba(255,246,224,0.35)';
    context.beginPath();
    context.ellipse(-8, -3, 8, 4, 0, 0, Math.PI * 2);
    context.fill();
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
    // never buried under the feathers: a white flash that sells the
    // blow in the same frame the feather burst flies.
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
  // Three states that read at a glance, to match the turkey's four
  // poses: a leaning run with pumping arms and kicked-up dust, a windup
  // with the knife cocked high behind his head (and a white throw arc),
  // and a close-chase lunge with an angry shouting face. He is drawn
  // ~22% bigger than before, so the second lead still reads when the
  // contact sheet shrinks — a thin stick figure did not.
  function drawFarmer(state) {
    const f = state.farmer;
    const gap = f.gap;
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
    if (gap > 22) {
      const label = `${Math.round(gap)}m`;
      pill(fx - 20, gy - 214, 52, 26, 9, 'rgba(20,10,2,0.65)');
      text(label, fx + 6, gy - 195, 17, '#ffd9d0', 'center', '800');
    }
    // Soft contact shadow under the farmer, wider now he is bigger.
    ellipse(fx + 4, gy + 4, 32, 7, 'rgba(20,10,2,0.28)');
    context.save();
    context.translate(fx, gy - bob);
    // Lean into the chase — further forward the closer he gets; he
    // rocks back a little while winding up a throw.
    context.rotate(windup ? -0.06 : close ? 0.16 : 0.11);
    context.scale(1.22, 1.22);
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
      context.strokeStyle = '#24497f';
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
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(-14, -78, 34, 42);
    context.fillStyle = PALETTE.farmerShirt;
    context.fillRect(-16, -96, 38, 22);
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(-12, -96, 6, 22);
    context.fillRect(8, -96, 6, 22);
    context.fillStyle = '#ffd23e';
    context.beginPath();
    context.arc(-9, -76, 2.2, 0, Math.PI * 2);
    context.arc(11, -76, 2.2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.35)';
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
    context.strokeStyle = PALETTE.farmerShirtDark;
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
    context.fillStyle = '#c0392b';
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
    // Additive pass first: embers and sparkles glow against sky and
    // ground alike instead of sitting on top as flat discs.
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const p of state.particles) {
      if (!p.active) continue;
      const a = clamp(p.life / p.max, 0, 1);
      if (p.kind === 2) { // embers — a rising flame tongue
        const h = p.size * (2.4 + (1 - a) * 1.8);
        const g = context.createRadialGradient(p.x, p.y, 0, p.x, p.y - h * 0.4, h);
        g.addColorStop(0, `rgba(255,220,110,${0.85 * a})`);
        g.addColorStop(0.5, `rgba(255,122,30,${0.6 * a})`);
        g.addColorStop(1, 'rgba(255,80,10,0)');
        context.fillStyle = g;
        context.beginPath();
        context.ellipse(p.x, p.y - h * 0.3, p.size * 1.2, h, 0, 0, Math.PI * 2);
        context.fill();
        // Bright core so the flame reads even at contact-sheet size.
        context.fillStyle = `rgba(255,240,170,${0.9 * a})`;
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
      if (!p.active) continue;
      const a = clamp(p.life / p.max, 0, 1);
      if (p.kind === 0) { // dust — soft puff, pale core, grows as it fades
        const r = p.size * (1.6 - a * 0.6);
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
      context.fillStyle = 'rgba(232,161,58,0.85)';
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
    const g = context.createRadialGradient(640, 240, 170, 640, 240, 480);
    g.addColorStop(0, 'rgba(200,20,10,0)');
    g.addColorStop(1, `rgba(200,20,10,${a})`);
    context.fillStyle = g;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  // ---- HUD ----
  function drawHud(state, best) {
    const stage = STAGES[state.stage];
    pill(14, 12, 1260, 66, 14, 'rgba(20,10,2,0.72)', 'rgba(242,193,78,0.55)');
    // Score, big and left.
    text('SCORE', 34, 34, 15, PALETTE.muted, 'left', '800');
    text(String(Math.floor(state.score)), 34, 66, 34, PALETTE.text, 'left', '900');
    // Distance progress bar in the middle, with stage ticks.
    const barX = 300, barW = 620, barY = 26;
    text('ESCAPE', barX, 34, 15, PALETTE.muted, 'left', '800');
    pill(barX, barY + 12, barW, 16, 8, 'rgba(255,255,255,0.16)');
    const prog = clamp(state.distance / TOTAL_DISTANCE, 0, 1);
    const pg = context.createLinearGradient(barX, 0, barX + barW, 0);
    pg.addColorStop(0, '#ffd23e');
    pg.addColorStop(1, '#ff7a1e');
    pill(barX, barY + 12, Math.max(16, barW * prog), 16, 8, pg);
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
    // Hearts on the right.
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
    // Combo pill under the score.
    if (state.combo >= 2) {
      pill(30, 86, 150, 34, 10, 'rgba(255,122,30,0.9)');
      text(`COMBO x${state.combo}`, 105, 110, 20, '#fff6e0', 'center', '900');
    }
    // Stamina bar, bottom left, with a dash hint.
    pill(24, 428, 220, 14, 7, 'rgba(20,10,2,0.6)');
    const sg = context.createLinearGradient(24, 0, 244, 0);
    sg.addColorStop(0, '#7dd3fc');
    sg.addColorStop(1, '#38bdf8');
    pill(24, 428, Math.max(10, 220 * state.player.stamina / TURKEY.staminaMax), 14, 7, sg);
    text('DASH — SHIFT', 254, 440, 14, 'rgba(255,246,224,0.85)', 'left', '700');
    if (state.player.shield) text('🛡 SHIELD', 24, 412, 16, '#fff', 'left', '800');
    if (state.player.pumpkin > 0) text(`★ GOLDEN ${Math.ceil(state.player.pumpkin)}s`, 24, 392, 18, '#ffd23e', 'left', '900');
    // Stage name, small, bottom right.
    text(`${stage.name}  •  BEST ${Math.max(best, Math.floor(state.score))}`, 1256, 440, 14, 'rgba(255,246,224,0.8)', 'right', '700');
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
    const g = context.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, 'rgba(20,8,2,0.55)');
    g.addColorStop(0.35, 'rgba(20,8,2,0)');
    g.addColorStop(0.75, 'rgba(20,8,2,0.15)');
    g.addColorStop(1, 'rgba(20,8,2,0.7)');
    context.fillStyle = g;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text('THANKSGIVING IS COMING…', 640, 72, 22, '#ffd23e', 'center', '900');
    context.save();
    context.shadowColor = 'rgba(255,122,30,0.8)';
    context.shadowBlur = 34;
    text('TURKEY RUN!', 640, 140, 88, '#fff6e0', 'center', '900');
    context.restore();
    text('Escape the farm. Dodge the oven. Outrun the farmer.', 640, 176, 24, '#ffe9b0', 'center', '700');
    pill(250, 196, 780, 100, 16, PALETTE.panel, PALETTE.panelEdge);
    text('↑ / SPACE — jump fences & ovens', 640, 226, 20, PALETTE.text, 'center', '700');
    text('SHIFT — dash   •   ↓ near hay — hide   •   ↓ — duck high knives', 640, 254, 20, PALETTE.text, 'center', '700');
    text('Corn = combo  •  Golden pumpkin = untouchable  •  Feather = shield', 640, 280, 19, PALETTE.muted, 'center', '700');
    if (best > 0) text(`BEST ESCAPE  ${best}`, 640, 322, 20, '#ffd23e', 'center', '900');
    const blink = Math.floor(state.elapsed * 2) % 2 === 0;
    if (blink) text('▶  PRESS SPACE OR CLICK TO RUN', 640, 362, 26, '#fff6e0', 'center', '900');
    text('A 1,500 m dash through the farmyard, the woods, the riverbank — to the freedom fence.', 640, 452, 16, 'rgba(255,246,224,0.75)', 'center', '700');
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
      // Golden fireworks of feathers over the freedom fence — bigger,
      // with a warm glow behind the headline so it punches through.
      const glow = context.createRadialGradient(640, 120, 10, 640, 120, 260);
      glow.addColorStop(0, 'rgba(255,190,60,0.5)');
      glow.addColorStop(1, 'rgba(255,190,60,0)');
      context.fillStyle = glow;
      context.fillRect(380, -40, 520, 320);
      for (let i = 0; i < 24; i += 1) {
        const a = (i / 24) * Math.PI * 2 + state.elapsed * 0.2;
        const r = 90 + ((i * 53) % 120);
        const fx = 640 + Math.cos(a) * r * 1.6;
        const fy = 140 + Math.sin(a) * r * 0.5;
        context.fillStyle = i % 3 === 0 ? '#ffd23e' : i % 3 === 1 ? '#ff7a1e' : '#fff6e0';
        context.beginPath();
        context.arc(fx, fy, 5 + (i % 3) * 2, 0, Math.PI * 2);
        context.fill();
        // Cross sparkle on every third burst.
        if (i % 3 === 0) {
          context.strokeStyle = 'rgba(255,246,224,0.9)';
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(fx - 10, fy);
          context.lineTo(fx + 10, fy);
          context.moveTo(fx, fy - 10);
          context.lineTo(fx, fy + 10);
          context.stroke();
        }
      }
      // Golden feathers drifting down through the fireworks — the
      // escape reads as a celebration, not just a headline.
      for (let i = 0; i < 8; i += 1) {
        const fx = 120 + i * 150 + Math.sin(state.elapsed * 0.9 + i * 2.1) * 22;
        const fy = ((state.elapsed * 26 + i * 97) % 480) - 20;
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
      text('ESCAPED!', 640, 132, 80, '#ffd23e', 'center', '900');
      text('The turkey made it past the freedom fence —', 640, 168, 22, PALETTE.text, 'center', '700');
      text('no Thanksgiving dinner tonight.', 640, 192, 22, PALETTE.text, 'center', '700');
    } else {
      text('CAUGHT FOR DINNER', 640, 132, 76, '#ff5a3c', 'center', '900');
      text('The farmer finally got his hands on you…', 640, 168, 22, PALETTE.text, 'center', '700');
      text('the oven was already warm.', 640, 192, 22, PALETTE.text, 'center', '700');
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
    if (blink) text('▶  PRESS SPACE OR CLICK TO RUN AGAIN  (R)', 700, 398, 22, '#fff6e0', 'center', '900');
  }

  // ---- one frame ----
  function drawField(state) {
    const stage = STAGES[state.stage];
    drawSky(state, stage);
    drawHills(state, stage);
    drawGround(state, stage);
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
      if (e.kind === KIND_OVEN) drawOven(sx, wPx);
      else if (e.kind === KIND_FENCE) drawFenceObstacle(sx, wPx, e.h);
      else if (e.kind === KIND_BALE) drawHayBale(sx, FIELD.groundY, e.w / 3.4);
      else if (e.kind === KIND_CORN) drawCorn(sx, e.y, t);
      else if (e.kind === KIND_PUMPKIN) drawGoldenPumpkin(sx, e.y, t);
      else if (e.kind === KIND_FEATHER) drawFeatherPickup(sx, e.y, t);
      else if (e.kind === KIND_KNIFE) drawKnife(sx, e.y, t);
      if (passed) context.restore();
    }
    drawTurkey(state);
    drawFarmer(state);
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
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) { drawHud(state, best); drawPaused(); }
    else if (screen === SCREEN_OVER) { drawHud(state, best); drawOver(state, best, state.escaped); }
    else drawHud(state, best);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
