# Danger-frame probe, finals round 21 (2026-11-28)

## Rule change (game/src/shots.js, danger branch only)

Old rule: stop at the FIRST frame with y in [150,185] and oven+knife near.
New rule: scan the whole 90 s, keep the frame where a knife is CLOSEST
to the turkey — true 2-D centre-to-body-rect distance — among frames
where the turkey is airborne over an oven (y in [120,185], ovenUnder).
Ties within 3 px prefer the higher score.

## Probe (probe-danger-r21.mjs, seeds 1–500, 90 s each)

Geometry (same as rounds 15/16): turkey rect x [330,392],
top 400−y−74, bottom 400−y; knife centre sx = 330+(e.x−distance)*16,
cy = 400−e.y. Tier A = y 150–185 (old floor), tier B = y 120–150.

## Findings

- Tier A: 407/500 seeds have a frame. The minimum is **46.6 px, hit by
  dozens of seeds with identical geometry** (high knife y=108, cy=292;
  feet at y=155): the 47 px figure is a STRUCTURAL FLOOR, not a
  seed-specific value. No seed has a knife at body/beak level (pos=side)
  with dist < 100 px and score ≥ 1500 — zero such frames in tier A.
  Reason: a high knife can only be at feet level or below while the
  bird is airborne over an oven (cy=292 vs body top 171–215); a low
  knife (cy=368) is 120+ px under the feet. So "knife truly close
  AND at body level" does not exist in the sim.
- Tier B: 417/500 seeds. Minimum **15.9 px at y≈124** — the knife
  grazes the feet on the way up (dy = 124−108 = 16). Same geometry
  across the top seeds; the new rule picks this frame.
- Seed 19 under the new rule: 3264 pts, y=123.9, knife (385,292),
  15.9 px, combo x0, 3 lives, stage 1. Seed 249: **3585 pts, combo x2,
  2 lives**, knife (387,292), 15.9 px, stage 1 — same knife story,
  better numbers, one life closer to the pot. Runner-up 62: 3352 pts,
  combo x0, stage 2 (riverbank blue — would change the frame's whole
  colour story), rejected.

## Decision

**danger seed 19 → 249** (shots.json). Visually confirmed: in 249 the
blade flies horizontal, tip grazing the feet, with the oven and OVEN!
label clear below. The O-nick on the label (a corn kernel over the
"O") is pre-existing in seed 19's frame too — a world entity, not
caused by this round.

## Right-half fill (game/src/render.js, drawHills, SCREEN_PLAY only)

Added, all screen-x filtered to 700–1280 (turkey/knife/OVEN! are all
left of x=520): second barn on the far ridge (~x760), oak on the near
ridge (~x900, canopy top ~y277), second shrub far right (~x1150),
hay bale on the track verge (~x1160), fence run along the track edge
(x 724–980, rails y 368/382 — below the OVEN! label band). Phases
tuned to the danger frame's scroll (655 m). Play screens only, so the
title and end frames are byte-identical (md5 verified).

## Verification (2026-11-28, worktree turkey-run-game-01-danger)

- Screenshots 1280×480, q82: 1-play 66,936 B; 2-start 81,463 B;
  3-danger 69,055 B; 4-end 90,831 B — all ≤ 256 KiB.
- 0 console errors, 0 external requests (CDP shot tool, port 9341).
- `node --check` passes on all game/src/*.js; vendor/ untouched.
- `main.ts` twice → byte-identical outputs (diff -r clean).
- Pilot no-regression (shots autopilot, 20 seeds): escaped 3/20,
  matching the QA baseline; world/config untouched, difficulty unchanged.
