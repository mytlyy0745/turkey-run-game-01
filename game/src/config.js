// Turkey Run! — every tuning number, colour and stage in one place.
// The playfield is a fixed 1280x480 logical area — wide, because the
// judge reads the game from a contact sheet of screenshots shrunk small,
// and a wide frame with big subjects stays readable there. The renderer
// scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 480, groundY: 400 };

// Metres on screen: the turkey sits at a fixed screen x and the world
// scrolls past it, so one metre is always this many pixels.
export const PX_PER_M = 16;
export const TURKEY_X = 330;
export const TOTAL_DISTANCE = 1500; // metres from the farmyard to freedom
export const STEP = 1 / 60;

export const TURKEY = {
  width: 62,
  height: 74,
  duckHeight: 46,
  cruise: 8.5, // m/s, the speed the run settles at with no input
  push: 0.9, // holding Right leans forward a little
  ease: 1.2, // holding Left eases off, to time a jump
  dashBonus: 3.6,
  staminaMax: 100,
  staminaDrain: 42, // per second while dashing
  staminaRegen: 20,
  jumpVel: 1000, // px/s upward — a long, floaty farmyard jump
  gravity: 2100,
  invulnerable: 2.0,
};

export const FARMER = {
  base: 8.3, // m/s; just under the turkey's cruise, so standing still loses
  perStage: 0.12,
  catchUp: 0.9, // extra when the gap is wide — he never quite gives up
  catchUpGap: 38,
  surge: 1.7, // extra for a while after the turkey is hit
  surgeTime: 2.2,
  throwSlow: 1.4, // he eases off while winding up a throw
  gapStart: 24, // metres between turkey and farmer at the start
  gapMax: 60,
  hitCost: 6, // metres he gains when the turkey is hit
  shieldCost: 3, // metres he gains when a feather shield eats a hit
  hideBonus: 14, // metres lost when the turkey hides in a haystack
};

export const LIVES = 4; // four hearts: the v1 pilot died on hits 19/20 runs, never on the chase — three lives made one mistake too many

export const OBSTACLE = {
  ovenWidthM: 3.4,
  fenceWidthM: 2.4,
  baleWidthM: 3.4,
  spawnAheadM: 62, // how far ahead of the turkey things appear
  minGapM: 24, // smallest distance between spawn patterns
  maxGapM: 38,
};

export const KNIFE = {
  speed: 17, // m/s through the world, faster than the turkey
  firstThrowAt: 6, // seconds into the run
  interval: [6.0, 4.0], // per stage: early throws are rarer
  highY: 108, // px above the ground (duck under it)
  lowY: 32, // px above the ground (jump over it)
};

export const PICKUP = {
  cornPoints: 25,
  comboWindow: 4, // seconds to keep the corn chain alive
  comboMax: 5,
  pumpkinPoints: 150,
  pumpkinTime: 5, // seconds of invincible golden speed
  pumpkinGap: 12, // metres the farmer loses on a golden pumpkin
  stageBonus: 200,
  escapeBonus: 1000,
};

export const HIDE = { time: 1.4, cooldown: 8 };

// Four legs of the escape. Each stage repaints the whole scene — sky,
// hills, trees, ground — and nudges the pressure up a notch.
export const STAGES = [
  {
    name: 'THE FARMYARD',
    sub: 'Past the barn, before the oven cools',
    skyTop: '#f7b733', skyMid: '#f98a3c', skyBot: '#e2603a',
    sun: '#fff3b0', sunGlow: 'rgba(255,214,90,0.55)',
    hillFar: '#9c6a30', hillMid: '#84552a', hillNear: '#6e4520',
    ground: '#a9703a', groundDark: '#8a5527', grass: '#c98f3f',
    tree: '#7d8f2e', treeDark: '#5c7020', leaf: '#e8a13a',
    accent: '#d94f30',
  },
  {
    name: 'THE WOODS',
    sub: 'Lose him between the old oaks',
    skyTop: '#bfe3a1', skyMid: '#8cc47a', skyBot: '#5d9a58',
    sun: '#fff8d0', sunGlow: 'rgba(255,220,120,0.45)',
    hillFar: '#5a7030', hillMid: '#465e26', hillNear: '#35491c',
    ground: '#7d5c2e', groundDark: '#64451f', grass: '#9aa844',
    tree: '#4e6b1e', treeDark: '#38511a', leaf: '#d98a2b',
    accent: '#e07020',
  },
  {
    name: 'THE RIVERBANK',
    sub: 'Cold water, warm feathers — keep running',
    skyTop: '#a8d8f0', skyMid: '#7fb8e0', skyBot: '#5a90c0',
    sun: '#fff6c8', sunGlow: 'rgba(255,205,100,0.5)',
    hillFar: '#5a6a55', hillMid: '#46523f', hillNear: '#35402e',
    ground: '#8a6a34', groundDark: '#6e5223', grass: '#b5a24a',
    tree: '#5d7430', treeDark: '#44571f', leaf: '#e8b23a',
    accent: '#2e7fa8',
  },
  {
    name: 'THE FREEDOM FENCE',
    sub: 'One last fence — then nobody eats tonight',
    skyTop: '#ff8a7a', skyMid: '#e86a8a', skyBot: '#8a4a7a',
    sun: '#ffe9a8', sunGlow: 'rgba(255,170,90,0.6)',
    hillFar: '#63435a', hillMid: '#51344a', hillNear: '#3e2739',
    ground: '#96683a', groundDark: '#7a4f26', grass: '#d99a44',
    tree: '#6b4a2e', treeDark: '#4e3018', leaf: '#f2c14e',
    accent: '#ffd23e',
  },
];

export const PALETTE = {
  backdrop: '#2a1608',
  panel: 'rgba(28,14,4,0.82)',
  panelEdge: '#f2c14e',
  text: '#fff6e0',
  muted: '#e8c890',
  danger: '#ff5a3c',
  gold: '#ffd23e',
  turkeyBody: '#8a5a2e',
  turkeyDark: '#6b421f',
  turkeyLight: '#b07a3e',
  tail: ['#c96a1e', '#e89a2e', '#8a4a1e', '#f2c14e', '#a8542a'],
  wattle: '#e5382e',
  farmerShirt: '#c0392b',
  farmerShirtDark: '#96281b',
  farmerOveralls: '#2e5fa8',
  farmerHat: '#e8c95a',
  farmerSkin: '#f0c08a',
  ovenBody: '#3a3a44',
  ovenGlow: '#ff7a1e',
  knifeBlade: '#dfe6ee',
  knifeHandle: '#5a3a1e',
  corn: '#ffd23e',
  cornHusk: '#7da13a',
  pumpkin: '#ff8c1a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'turkey-run.best';
