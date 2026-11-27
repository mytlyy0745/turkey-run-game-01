# turkey-run-game-01

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/mytlyy0745/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/mytlyy0745/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

**Turkey Run!** — a little 2D canvas escape game in plain HTML and JavaScript, no libraries, no network. You are the turkey, and Thanksgiving is coming: sprint 1,500 m from the farmyard through the woods and along the riverbank to the freedom fence, with the farmer hot on your tail the whole way. Jump the fences and the glowing ovens, duck the carving knives he throws at you, hide in a haystack when he gets too close, and eat corn to build a combo — grab a golden pumpkin and nothing can touch you for a while. Three lives, four stages, one fence between you and dinner.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser and press Space (or click) to run.

## How to play

- **↑ / W / Space** — jump (fences, hay bales, glowing ovens, low knives).
- **↓ / S** — duck the high knives; duck beside a haystack to hide (the farmer runs past and loses ground).
- **Shift** — dash (drains the blue stamina bar, it refills as you run).
- **← / → or A / D** — ease off to time a jump, or lean forward for a little extra speed.
- **Mouse** — click to jump.
- **P** — pause, **M** — mute, **R** — restart.

The farmer never stops: stand still and he catches you, and every hit costs a life and lets him gain eight metres. Corn builds a combo (up to x5), a golden pumpkin makes you untouchable and pushes him back, and a feather gives you a shield that eats one hit. Reach the freedom fence at 1,500 m and you are a free bird.

## Scoring

- **Distance** — 1 point per metre run.
- **Corn** — 25 points each, multiplied by your combo (up to x5); a hit breaks the chain.
- **Golden pumpkin** — 150 points, plus 5 seconds of invincibility.
- **Feather shield** — 50 points, absorbs the next hit.
- **Knives dodged** — 15 points each; smashing through an obstacle while golden pays 40.
- **Stage bonus** — 200 points for entering each new stage; **escaping** pays 1,000.

A good run clears 2,000; escaping with a hot combo is worth much more.

Screenshots in `screenshots/` are real renders of the game itself, staged deterministically with `?shot=start|play|danger|end&seed=7` (see `shots.json`), each 1280×480. `main.ts` hands the game in: it copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=89k0z65b&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
