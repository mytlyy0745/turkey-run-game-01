# HANDOFF — turkey-run-game-01 "Turkey Run!"

## 🔄 打磨第 1 轮（2026-11-27，画面优先 + 难度实测）

- Commit：`（见本轮提交后 git log）`——本轮只改 `game/src/config.js`、`game/src/render.js`、4 张截图；`main.ts`、`shots.js`、`world.js`、`vendor/` 未动。
- 画面改进（逐张截图验证过）：
  1. 天空中间带不再空：新增 3 朵中层大软云（y 150–226，随时间漂移）+ 下层 3 只鸟群；太阳改到云层之后画，不再被云遮成淡斑。
  2. 远山加深 + 三层山脊：各阶段 hillFar/hillNear 加深提饱和，新增 hillMid 中间脊（视差 0.18）；远脊上加红色谷仓剪影（与 ridge() 同一套数学，保证落在山脊线上），农场辨识度上来。
  3. 农夫“25m”标签：钳制 x 16→34（全身入画），标签加深色 pill 底，不再贴左缘裁切。
  4. 火鸡不再藏树后：树/灌木景物若落在火鸡左右 150/110 px 内直接不画——标题火鸡完全露出，游玩火鸡也不再与树冠糊在一起。
  5. HUD 标记：🦃/🧑‍🌾 emoji（缩小后糊成一团）改成金/红实心三角，骑在进度条顶缘，追得紧时农夫三角左移 14 px 防重叠。
  6. 火鸡、农夫脚下加柔和接触阴影（跳起时阴影缩小），落地感有了。
  7. “OVEN!” 警示只画在火鸡前方的烤箱上：已跑过的烤箱标签不再撞上农夫的头。
  8. 结束画面：逃脱遮罩 0.45→0.30 更亮，烟花加大加十字星芒，标题后加金色光晕；FREEDOM 字左移 20 px，不再被分数面板切掉半个 M。
  9. 4 颗爱心：HUD 爱心间距 34→30 px，4 颗仍在面板内。
- 难度实测（不是凭感觉调）：
  - 先写更强 pilot（/tmp/test-turkey-strong.mjs：干草堆躲藏阈值 14→22m、gap<20 就冲刺、安全直道攒距离、gap 紧时前倾 +0.9 m/s、早躲高飞刀）：逃脱仍是 1/20，中位距离 607m——难度是真的高，不是 pilot 弱。
  - 死因诊断（/tmp/diag-turkey.mjs）：19/20 死于 3 命打光，0 次死于 gap 归零；死时 gap 多在 10–50m——杀手是命中，不是追赶。
  - 只动一个杠杆：LIVES 3→4。重测：基础 pilot 1/20→3/20（分数 711–6540），强 pilot 1/20→2/20（中位距离 607→862m）。没叠加第二处放宽，免得调过头。
  - 公平性仍成立：无操作 103m 被抓（353 分）、一直冲不跳 155m 被抓、随机按键 215m 被抓，无免费赢法。
  - 确定性：同一 seed 两次 byte-identical（新 hash 021b49ed…，LIVES 改了所以与 v1 的 474e07d9… 不同，是预期的）。
- 失败/回滚：无需要回滚的尝试。强 pilot 本身是个教训：seed 7 上强 pilot 反而比基础 pilot 死得早（876m vs 逃脱）——激进冲刺/前倾会打乱跳跃时机，说明 pilot 天花板在反应式设计本身，不在参数上；下一轮如要继续提 pilot 应做前瞻链式跳跃，而非加大侵略性。
- 验证：4 张截图 1280×480 JPEG q82（51–71 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；kit check 两次输出 byte-identical（dossier 412,302 字节，总输出 740,065 字节）。标题截图与第 1 遍修改后 byte-identical（第 2 遍没动标题画面，预期内）。
- 下一轮建议：① 火鸡造型本身还没动——尾巴/翅膀动画幅度、跳跃姿态是下一轮画面主攻；② 地面“v”形草叶噪点感重、泥土路带偏平，可做地面层次；③ 标题画面左右下角仍偏空，可加南瓜堆/栅栏前景；④ 难度：LIVES=4 后先看人类实测反馈，暂不再动；⑤ 强 pilot 的链式跳跃前瞻（连续两个障碍提前规划）可作为 shots autopilot 的改进，顺带可能再提一点逃脱率。

## ⚠️ Li 2026-11-27 20:31 指示：画面第一（适用于初版及全部 20 轮打磨）

AI 评委看截图两两对比打分，画面直接决定胜率，视觉表现是最高优先级。做每个决定先问“画面能不能肉眼可见地变好”，再考虑玩法和机制。重点：场景辨识度和美感（农场、感恩节氛围）、火鸡和农夫的造型与动画、光影和色彩层次、粒子/特效（羽毛、尘土、光晕）、HUD 清晰度和美观、标题画面和结束画面的视觉冲击力。截图是验证标准：每改完一处就重拍截图，用截图本身验证画面是不是真的变好了，不要只看代码。玩法机制仍然要做，但一轮里画面和玩法冲突时，优先画面。

## ⚠️ 评委规则（已 live 核实，2026-11-27）+ 长期规矩

Li 定死的长期规矩（已写进 AGENTS.md、MEMORY.md、make.fun 技能）：以后所有 make.fun 任务，都以评委打分规则为首要目标。动手前先读官方评分规则，再动手；优化方向以评委实际看到和打分的东西为准，不要凭感觉、不要优化评委看不到的东西。

- 评委：z-ai/glm-5.3-flash（OpenRouter，superbot，reasoning effort high）。每次调用读两个作品，各自以 dossier 的 judge view 呈现：**一张截图总览图（contact sheet）+ 源码大纲（每个文件的路径、大小、声明）**，二选一，margin 1–5，每对两个顺序各比一次。排名按 Bradley-Terry 胜率。
- 所以评委实际看到的只有两样：① 4 张截图拼成的一张总览图；② 源码大纲。优化只针对这两样。
- 截图总览图含义：4 张截图会被拼成一张图、缩小呈现——每张截图必须在缩小后依然清晰可读：主体要大、对比要强、不要用小字、不要堆细碎细节。
- 源码大纲含义：大纲列每个文件的路径、大小和声明（函数/类名）——文件要用描述性名字，顶层声明要用清晰易懂的名字（例如 TurkeyPlayer、FarmerAI、OvenHazard、KnifeThrower、ParticleSystem、HUD 等），模块结构要合理（像飞行游戏的 config/random/world/input/audio/render/shots/main 那样），让评委一眼看懂游戏的规模和结构。不要一个巨型文件，也不要几十个碎文件。
- **截图 gate：3–4 张，每张 ≤256 KiB，且尺寸上限是 1280×480 像素**（resolution Gate 原文）。飞行游戏用的 1280×720，这次不能照搬。dossier.json ≤1.5 MiB。
- 其余 gate：game/ 纯文件 ≤993 个文件/目录、≤48 MiB；所有引用必须是 data: URI 或 game/ 内文件；无网络。
- 盲轮 4 轮，cutoff：2026-11-27 22:00 CST、2026-11-28 10:00 CST、2026-11-28 22:00 CST、2026-11-29 10:00 CST（决赛）。提交后按轮次出排名（GET /api/competitions/turkey-run-game-01/rounds 可查自己的排名和上下 5 名）。按原计划 20 轮打磨后统一提交，不用提前交。
- 前 3 名赛后会被 make.fun 团队人工实测（桌面 Chrome、断网运行），所以游戏必须真正能离线运行、真正可玩；第 4–20 名只按评委打分发奖。奖金 USDC（Solana）发放。
- 本初版已按此执行：逻辑场 1280×480（为总览图可读性而定）、主体大而清晰、文件按 config/random/world/input/audio/render/shots/main 分工、函数名均为描述性名字（drawTurkey、drawFarmer、drawOven、drawHud、drawTitle、drawOver、spawnPattern、throwKnife、collectCorn、autopilot、stageShot）。

## Entry

- Competition: `turkey-run-game-01` ($250 pot, 1st $50, 2nd $35, 3rd $25, 4–10th $10, 11–20th $7; free entry)
- Entries close: 2026-11-29T02:00:00Z (2026-11-29 10:00 CST) · Blind rounds: 2026-11-27 22:00, 2026-11-28 10:00, 2026-11-28 22:00 CST, final 2026-11-29 10:00 CST
- Repo: https://github.com/mytlyy0745/turkey-run-game-01 (public, created 2026-11-27T12:46:36Z — after the 10:00 CST opening)
- Commit: `a90d3e7004f6b74ff99b65ba6f89e767a6f85aaf` on `main` (confirmed via `git ls-remote`)
- Repo About: homepage https://make.fun/bounty/turkey-run-game-01, topics makefun, ai-agents, bounties, games; description mentions make.fun
- Builder agent id: `ee607766-fcf1-44b1-b0ed-9d40d94a383a`
- **NOT SUBMITTED — 初版 only. 提交由协调员在 20 轮打磨后统一做。**

## The game — Turkey Run!

Original 2D canvas side-view runner, plain HTML/JS, no libraries, no network, static files under `game/`. A turkey sprints 1,500 m from the farmyard to the freedom fence while the farmer chases from behind:

1. **The Farmyard** (0–375 m) — fences, hay bales, pumpkins, barn country.
2. **The Woods** (375–750 m) — darker green oaks, more falling leaves.
3. **The Riverbank** (750–1125 m) — blue water ribbon, reeds.
4. **The Freedom Fence** (1125–1500 m) — sunset purple, white picket gate at the finish.

- **Farmer AI**: gap in metres; he gains on hits and surges, eases off to throw knives, rubber-bands when the gap is wide. Gap 0 = caught. The farmer is always drawn at the left edge (clamped) so the chase reads in every frame; the true gap is shown in metres above him and on the progress bar.
- **Hazards**: glowing ovens (jump over, 3.4 m wide), fences, hay bales, carving knives thrown by the farmer (high = duck, low = jump; they come from behind, closing at ~8.5 m/s).
- **Pickups**: corn kernels (+25 × combo up to x5, each kernel also distracts the farmer +0.5 m), golden pumpkin (+150, 5 s invincible + farmer pushed back 12 m, smashes through obstacles), feather shield (+50, eats one hit).
- **Hide**: duck beside a haystack to hide 1.4 s (farmer runs past, +14 m; 8 s cooldown).
- **Dash**: Shift, +3.6 m/s, drains stamina (42/s, refills 20/s). ←/→ ease off / lean forward to time jumps.
- **HUD**: big SCORE, escape progress bar with stage ticks + turkey/farmer markers, 3 hearts, combo pill, stamina bar, stage banner, flash messages, danger vignette when the farmer is close.
- **Screens**: title (TURKEY RUN! + instructions + best), pause, end (ESCAPED! with fireworks + stats + RANK: FREE BIRD, or CAUGHT FOR DINNER). Controls: ↑/W/Space jump, ↓/S duck/hide, Shift dash, P pause, M mute, R restart, mouse click jumps. WebAudio synth sounds (gobble, whoosh, chimes, sizzle, fanfares, wind).

## Files

- `main.ts` — hand-in program, written in my own words (NOT the kit starter): clears the output dir's *contents* only (never removes the dir itself — grader bind-mounts it), copies `game/` + `screenshots/`, validates 3–4 screenshots ≤256 KiB, writes `dossier.json` via kit's `buildDossier`.
- `game/index.html` + `game/src/` — `config.js` (tuning + 4 stage palettes), `random.js` (mulberry32), `world.js` (rules, DOM-free, deterministic), `input.js`, `audio.js` (WebAudio synth), `render.js` (all drawing: layered autumn skies, parallax hills, turkey, farmer, ovens, HUD, panels), `shots.js` (autopilot + deterministic shot staging with min-gap snapshot rewind), `main.js` (boot/loop/screens, `?shot=` + `window.__shotReady`).
- `vendor/makefun-game.ts` — kit's copy, byte-identical (sha256 dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129).
- `screenshots/` — 4 real renders, **1280×480** JPEG q82, each ≤256 KiB: `1-play.jpg` (cover: farmer at left edge, turkey jumping through corn, HUD), `2-start.jpg` (title), `3-danger.jpg` (two glowing ovens + flying knife + shield turkey, 1 life), `4-end.jpg` (ESCAPED! + score panel).
- `README.md` (live readme_template: 3 badges + bounty links + referral 89k0z65b), `LICENSE` (MIT, kit's), `serve.ts`, `shots.json`, `prompt.txt` (opening prompt verbatim).

## Verification results (v1, all in this session)

- **Headless playtest** (`/tmp/test-turkey.mjs`, drives the real world rules with the shots autopilot, 20 seeds): **escaped 1/20, score 611–6540, distance 281–1500 m**. Seed 7 (screenshot seed): ESCAPED, 6540, 44 corn, best combo x5, 26 knives dodged. Many runs reach 900–1300 m. A blind autopilot escapes rarely; a human who seeks pumpkins and times dashes should do better — polish rounds should re-check this number.
- **Determinism**: same seed twice → byte-identical snapshot (sha256 474e07d9… both runs).
- **Fairness**: no-input → caught at 82 m, score 307, 0 lives; always-dash-no-jump → caught at 82 m; random keys → caught at 185 m. No free win.
- **Kit check**: `MAKEFUN_OUTPUT_DIR=out1/out2 node main.ts` → byte-identical (`diff -r` clean); dossier.json 378,243 bytes (< 1.5 MiB); out total 679,326 bytes.
- **Browser**: headless Chrome via file:// + pure-Node CDP client (`/tmp/cdp-turkey.mjs`), 1280×480, JPEG q82. All 4 shots: 0 console errors, 0 external requests, all 9 files load. `node --check` clean on every game file, main.ts, serve.ts. Local HTTP serve (`node serve.ts`): index 200, main.js 200, no `http` references in index.html.
- **Screenshots visually inspected one by one** (this is what caught the bugs below): turkey, farmer, ovens, knives, HUD, stage banners all read at a glance; contact-sheet readability is the v1 bar and it passes.
- **Bugs found and fixed during validation (revision pass)**:
  1. `ridge()` in render.js referenced an undefined `state` → Uncaught exception, no render at all. Fixed by passing state in.
  2. Jump too short/early: oven 5.6 m could not be cleared; jump trigger 0.72 s landed the turkey inside the oven. Fixed: jumpVel 860→1000, gravity 2500→2100, oven 5.6→3.4 m, trigger 0.52 s (feet-above-top window must cover the whole span).
  3. Autopilot ignored knives from behind (they are thrown by the farmer) → fixed: knife watch window d∈[−14, 2], closing speed 8.5 m/s.
  4. Autopilot jumped into high knives → fixed: high knife <1.0 s away means duck+ease, not jump.
  5. **Farmer-gap sign inverted**: `gap += (farmerSpeed − speed)` made the gap shrink when the turkey outran the farmer — dashing was suicidal. Fixed to `(speed − farmerSpeed)`; farmer base retuned 8.35→8.0→8.3. (This was the single biggest tuning bug; found by tracing gap vs speed.)
  6. **Invisible-but-deadly ovens**: entity pool reuse carried `taken=true` from a collected corn into a reused oven slot, and the renderer skipped `taken` entities — the oven never drew but still hit. Found by pixel-scanning the danger shot. Fixed in `freeEntity()` (reset `taken` on hand-out).
  7. End shot showed the play screen after escaping: `stageShot('end')` only returned OVER for `over`, not `escaped`. Fixed.
  8. Title instruction panel overflowed (lines ran past the panel edges). Fixed: panel 600→780 wide, lines shortened.
  9. HUD progress markers overlapped the ESCAPE label. Fixed: markers drawn inside the bar.
  10. End-screen stats line overflowed its panel. Fixed: shortened line.
  11. Farmer never visible in the cover shot (gap ~31 m → off-screen). Fixed two ways: play staging rewinds to the min-gap frame in 40 s (structuredClone snapshot/restore), and the farmer is now always drawn clamped to the left edge with the true gap in metres above him.

## Known v1 weaknesses (for the 20 polish rounds — visuals first)

- The mid-sky band is still fairly empty in play shots; the far hills are pale and flat. More clouds/birds/layering would help the contact sheet.
- The farmer's "25m" label sits tight to the left edge (partially clipped at x=0). Nudge it right.
- The title turkey is half-hidden behind a scenery tree on seed 7 — the title staging could pick a clearer spot.
- Autopilot escape rate 1/20 is on the hard side; a human should escape more often, but verify with a stronger pilot before loosening.
- The play shot's turkey sometimes overlaps a mid-ground tree; layering (turkey always in front of trees) could be cleaner.
- No `window.__world` debug hook is left in the game (removed after use).

## Session files (work dir)

- `~/workspace/make-fun/turkey-run-game-01/prompt.txt` — opening prompt, verbatim
- `~/workspace/make-fun/turkey-run-game-01/HANDOFF.md` — this file
- `~/workspace/make-fun/turkey-run-game-01/STATUS.md` — v1 report
- `~/workspace/make-fun/turkey-run-game-01-kit/` + `~/workspace/make-fun/turkey-kit.zip` — downloaded kit (not committed)
- Repo files: `main.ts`, `serve.ts`, `shots.json`, `README.md`, `LICENSE`, `.gitignore`, `prompt.txt`, `game/`, `screenshots/`, `vendor/`
- Test scripts (not committed): `/tmp/test-turkey.mjs`, `/tmp/debug-turkey.mjs`, `/tmp/debug-turkey2.mjs`, `/tmp/debug-turkey3.mjs`, `/tmp/debug-danger.mjs`, `/tmp/cdp-turkey.mjs`, `/tmp/debug-cdp-turkey.mjs`, `/tmp/debug-browser-danger.mjs`
- Screenshot tooling: headless-shell Chrome at `~/.cache/ms-playwright/chromium_headless_shell-1200/.../chrome-headless-shell`, `--remote-debugging-port=9222 --allow-file-access-from-files`, file:// + pure-Node CDP client; viewport forced with `Emulation.setDeviceMetricsOverride` 1280×480. Traps: `pkill -f` with the pattern in the same command line kills your own shell (use a bracketed pattern like `809[1]`); the CDP client must wait for `window.__shotReady` per navigation, not reuse a stale tab's flag.

## For the parent (submit step — after 20 polish rounds, when Li says so)

- Bundle transcripts for this session + parent chain (`node cli/makefun.mjs bundle` from the unpacked kit), then `submit --competition turkey-run-game-01 --repo-url https://github.com/mytlyy0745/turkey-run-game-01 --commit <final-sha> --title "Turkey Run!" --bundle <file> --keypair <file>`.
- No entry fee (entry_fee null). Verify the submission live via `/api/agents/me` (stage scored, 0 failed checks).
- Blind round cutoffs: 2026-11-27 22:00, 2026-11-28 10:00, 2026-11-28 22:00 CST; final 2026-11-29 10:00 CST. Check rounds at GET /api/competitions/turkey-run-game-01/rounds.
