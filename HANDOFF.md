# HANDOFF — turkey-run-game-01 "Turkey Run!"

## 🔄 打磨第 12 轮（2026-11-27，备用建议 1+2 全做 + 揪出 ovenInFrame 选帧漏洞）

- Commit：`6229290`（待 push 后 `git ls-remote` 确认）——本轮改 `game/src/shots.js`、`shots.json` + 2 张截图（1-play、4-end）；`main.ts`、`world.js`、`config.js`、`render.js`、`vendor/` 未动。shots.js 经 3 次独立编辑改完（end 注释→play 注释→ovenInFrame 规则），每处改完都单独重拍并目视验证过（另有一次封面首选帧返工，见失败/回滚）。
- **评审文件版本**：开工时 `JUDGE-REVIEW.md` 仍是第 9 轮版（两次评审，第 1 次 21:37、第 2 次 21:40，针对第 8/9 轮），无针对第 10/11 轮的新评审，本轮按任务书 HANDOFF 备用建议做。**`JUDGE-REVIEW.md` 本轮未修改、未提交**（评委的文件，工作区里仍是 untracked 状态；只对指定 4 个文件 `git add`，未动它）。
- 画面改进（逐张截图验证过，另裁剪放大验证结束帧火鸡头、标题火鸡、危险帧刀位、封面右缘，拼了一张 2×2 总览图模拟评委半尺寸视角检查）：
  1. **封面有刀有连击（备用建议 1，本轮主攻）**：探针先算过——seed 7 的 40 秒里“跃起 + 烤箱入画 + 近刀”帧是 **0 帧**（那一跃里唯一的刀在 d≈24m，已按第 11 轮规则淡到 alpha 0.2，几乎不可见；连击也是 0）。只换选帧修不掉，改换封面种子：把现行选帧规则原样套到 seed 1–60 探一遍，10 个种子同时满足“跃起 + 近刀（距火鸡 <300px）+ 连击 ≥2”；挑了 seed 54——刀距火鸡仅 66px、在火鸡头高、COMBO x4、y=100 中弧（不是跃顶）。新封面（319m、674 分）：COMBO x4 pill 在左上、飞刀拖着白轨迹从火鸡喙边擦过、农夫 28m 在左缘、两座烤箱火焰完整。shots.json 里 play 种子 7→54；分镜规则本身一个字没动。
  2. **结束帧火鸡头顶的刀没了（备用建议 2）**：探针把短视 end pilot 在 seed 1–150 跑了一遍，25 个逃脱；其中 8 个终局没有任何刀落在火鸡头附近（200×110 框内零刀）。挑了其中分数最高的 seed 146（6535 分、30 玉米、连击 x5、躲刀 26、剩 2 命，火鸡庆祝跃起 playerY=88）。新结束帧：ESCAPED! 金字 + 烟花 + 分数面板全在，火鸡头顶干干净净——剩下的刀只有一把贴地从火鸡左侧滑过（读作擦身而过的险情）和一把已淡出到看不见的远刀。代价：分数 7415→6535，仍是高分逃脱，净收益为正。shots.json 里 end 种子 19→146。裁剪放大验证过：火鸡喙离副标题 "The…" 约 40px，不碰字；FREEDOM 被火鸡尾巴半遮是既有布局（火鸡在栅栏前），可接受。
  3. **ovenInFrame 右缘规则的真漏洞（本轮意外收获，修掉未回滚）**：seed 54 的首选帧拍出来一看，右缘有一块完整的 OVEN! 标签、下面一个南瓜——却没有烤箱。探针 dump 证实：那座烤箱 sx=1282，炉身完全在屏外；旧规则两条右缘检查都要 `sx < 1280` 才触发，sx=1282 正好漏网，而标签翻到左侧的逻辑（`lx = sx - lw - 8`）仍把它画进屏内。规则改成按炉身算：任何烤箱炉身不完全在屏内（`sx < 0 || sx + w > 1280`）该帧即不合格。修后 seed 54 在同一轮里重选到更晚的一跃（37.6 秒、674 分、刀在头高 160px 处、COMBO x4），右缘第二座烤箱完整入画、标签正确翻到左侧。游戏内渲染未动——游玩时标签提前半拍出现是合理的危险预告，只修选帧。
  4. **危险帧刀贴农夫（备用建议 3）：量过，保留不动**：裁剪放大实测——刀身离农夫右缘约 125px，拖尾左端离农夫约 35px；拖尾横过的是栅栏，不是农夫身体，读作刀从农夫方向飞向火鸡的轨迹，而非贴着农夫。HANDOFF 写的“可接受”成立，本轮不调。
- 截图变化：play 674 分/319m（新分镜：中弧跃起 + 近刀 + COMBO x4 + 双烤箱）、danger 1660 分/720m（未变）、start 0 分（未变）、end 6535 分（seed 146 ESCAPED，头顶无刀）；文件 67.6/81.0/61.8/85.3 KiB。2×2 总览图半尺寸检查通过：封面刀+连击+双烤箱、标题大字、危险绿、结束粉紫，四帧主体、HUD、结束金字均清晰。
- 实测（只改分镜种子 + 选帧规则，world.js 未动、没碰任何 random()，数据与第 5–11 轮完全一致，符合预期）：
  - 基础 pilot：逃脱 1/20，分数 1402–6295，距离 547–1500m；强 pilot：3/20，中位距离 1064m，中位分数 3479。
  - 确定性：同一 seed 两次 byte-identical（hash e6bac207…，与第 5–11 轮相同）。
  - 公平性仍成立：无操作 94m 被抓（93 分）、一直冲不跳 121m 被抓、随机按键 215m 被抓。
- 失败/回滚：**封面首选帧返工**——seed 54 第一版帧右缘飘着无根 OVEN! 标签（见上），当场把 ovenInFrame 改成炉身规则、重探重拍后定稿；是规则修复，不是回滚种子。另一次探针结论本身：“只换封面选帧条件”的方案被探针否决（seed 7 里 0 帧满足），改成换种子，未产生过坏代码。
- 验证：4 张截图 1280×480 JPEG q82（62–85 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；main.ts 两次输出 byte-identical（diff -r 干净；dossier 528,663 字节）；kit CLI check 两次结果一致（4 passed、1 failed=transcripts_present 未传 transcripts、15 skipped；两次日志仅时间戳不同）；vendor sha 未变（dc671875…）。基线重拍先验证过：改动前 4 张截图与已提交版本 byte-identical，拍摄管线可信。
- 下一轮建议：① 等评委对第 10/11/12 轮的新评审（JUDGE-REVIEW.md 若更新，按最新版最优先的 3–5 条改）；若无新评审，可从：危险帧的刀离火鸡仍较远（同一次跃起里只有 7 个候选帧，探针先行）、标题火鸡在棕色山丘前偏暗偏小、封面火鸡跃的是栅栏而非正下方的烤箱（可探“跃起正下方就是烤箱 + 近刀 + 连击”的种子）；② 难度：仍先看人类实测反馈，暂不再调数值；③ pilot 改进仍先做死因诊断再动手。

## 🔄 打磨第 11 轮（2026-11-27，评委次要问题 5 项全做）

- Commit：`9c49278`（待 push 后 `git ls-remote` 确认）——本轮改 `game/src/config.js`、`game/src/render.js`、`game/src/shots.js` + 4 张截图；`main.ts`、`world.js`、`vendor/` 未动。render.js 经 7 次独立编辑、shots.js 经 3 次、config.js 经 1 次改完，每处改完都单独重拍并目视验证过（另有一次副标题底板返工 + 一次结束羽毛 HUD 返工，见失败/回滚）。
- **评审文件版本**：开工时 `JUDGE-REVIEW.md` 仍是第 9 轮版（两次评审，第 1 次 21:37、第 2 次 21:40，针对第 8/9 轮），本轮按任务书 + 该文件次要问题清单的 5 项全做。**`JUDGE-REVIEW.md` 本轮未修改、未提交**（评委的文件，工作区里仍是 untracked 状态；中途一次 `git add -A` 曾把它误 stage，当场 `git reset` 撤回，未提交）。
- 画面改进（逐张截图验证过，另裁剪放大验证副标题底板、结束副标题、危险帧刀位，拼了一张 2×2 总览图模拟评委半尺寸视角检查）：
  1. **标题副标题对比度（次要问题 1）**：副标题 "Escape the farm…" 下垫深色 pill（`rgba(20,8,2,0.55)`，x 300–980 × y 149–183），白字不再直接印橙天。第一版 pill 宽 600px 太窄，裁剪放大发现 "Escape" 的 E 和 "farmer." 的尾巴都露在板外；实测文字宽 ~650px 后加宽到 680px，两边各留 ~15px，重拍验证整行字都在板上。半尺寸下副标题一行清晰可读。
  2. **结束帧烟花加亮 + 避开文字（次要问题 2）**：旧烟花是 24 颗 5–9px 小点绕标题中心一圈，白点正压在 "dinner" 词上。新烟花是两簇侧爆（中心 180,150 与 1100,150，各 12 颗 8–12px 金/橙/白大点 + 每三颗一道十字星芒），亮度与尺寸都上了一个档；位置卡在 HUD 之下（y≥101）、副标题之外（x 91–269 / 1011–1189，文字在 x 400–880）、分数面板之上（y≤199）。飘落金羽毛改只落两侧（x 外三分之一），且从 y=90 起落、不再飘过 HUD——旧版有一片羽毛正压在 HUD 的 "ESCAPE" 标签上，重拍后 HUD 干净。裁剪放大验证："no Thanksgiving dinner tonight." 全行无白点。
  3. **危险帧刀贴近火鸡（次要问题 3）**：探针先算过再动手——90 秒整跑里，"烤箱在前 + 刀在火鸡 ±3m 内 + 火鸡腾空" 的帧是 **0 帧**；现行停帧条件的 7 个候选帧全在同一次跃起里，且每帧都带一把已飞过的远刀（d≈52m，sx≈1165，飞向谷仓）。所以只换选帧修不掉，改了两处合力：① 渲染层——已飞过火鸡的刀按距离淡出（d>8m 起淡，d=28m 归零；刀只能向右飞、比火鸡快，飞过之后永不再构成威胁，淡出不改任何碰撞——碰撞只在 |d|<1m 查，那里 alpha 恒为 1；也不碰玩法随机流）。远刀消失后，帧里唯一的刀就是火鸡身后 94px 的那把（sx~260，拖着白轨迹追向火鸡尾巴）。② 分镜层——危险帧跃起下限 120→150，取同一次跃起里更晚的帧（火鸡更高、离烤箱火焰更远，刀也最近）。新危险帧（720m、1660 分）：火鸡腾空、脚离火焰约 50px，刀在左缘追着火鸡，右缘再无无关的刀。结束帧头顶那把刀（d=0.54）不受影响，仍在；结束帧另一把远刀（d=40）顺带淡出，画面更干净。
  4. **三帧橙色调拉开（次要问题 4）**：阶段色调强化——树林（危险帧所在阶段）天空从淡黄橙改成**绿色**（skyTop #bfe3a1 / skyMid #8cc47a / skyBot #5d9a58，山脊同步加深绿），河边改成**蓝色**（skyTop #a8d8f0 / skyMid #7fb8e0 / skyBot #5a90c0，山脊灰绿），自由栅栏顶色更粉（skyTop #ff9d5c→#ff8a7a）。总览图半尺寸下四帧现在是：封面橙、标题橙（文字主导）、危险**绿**、结束**粉紫**，一目了然。农场（封面/标题）橙色未动。
  5. **封面右缘烤箱彻底干净（次要问题 5，自行判断后做了）**：`ovenInFrame()` 加“右缘无烤箱”约束——任何烤箱左缘 ≥1150 或右缘越过 1280，该帧即不合格。探针：40 秒里有烤箱入画的跃帧 20 帧，其中右缘干净的 7 帧，仍够挑最高跃帧。新封面（206m、311 分）：火鸡正越过正前方完整的烤箱（sx 376），第二座烤箱完整在 826，右缘是树 + 谷仓，再无半截烤箱。代价：新封面没有飞刀（唯一一把刀 d=25，已按新规则淡到 0.15 近乎不可见）和连击 pill；火鸡直接越烤箱的故事更强，净收益为正，保留。
- 截图变化：play 311 分/206m（新分镜：火鸡正越前方烤箱）、danger 1660 分/720m（同一次跃起的更晚帧，y~155）、start 0 分（副标题底板）、end 7415 分（seed 19 ESCAPED，烟花两侧大爆）；文件 65.1/81.0/61.8/85.1 KiB。2×2 总览图半尺寸检查通过：四帧主体、OVEN! 标签、HUD、标题、结束金字均清晰，危险绿、结束粉紫与封面橙一眼区分。
- 实测（只改渲染 + 分镜 + 阶段配色，world.js 未动、没碰任何 random()，数据与第 5–10 轮完全一致，符合预期）：
  - 基础 pilot：逃脱 1/20，分数 1402–6295，距离 547–1500m；强 pilot：3/20，中位距离 1064m，中位分数 3479。
  - 确定性：同一 seed 两次 byte-identical（hash e6bac207…，与第 5–10 轮相同）。
  - 公平性仍成立：无操作 94m 被抓（93 分）、一直冲不跳 121m 被抓、随机按键 215m 被抓。
- 失败/回滚：① 副标题底板第一版宽 600px 太窄（文字两端露板外），裁剪放大发现后加宽到 680px 重拍验证通过——是调参迭代，不是回滚。② 结束羽毛第一版仍飘过 HUD（白羽毛压在 "ESCAPE" 标签上），改成从 y=90 起落重拍验证通过。③ 探针 bug 一次：`step` 返回的非终局事件（EVENT_HIT/PICKUP）被当成终局 break，险些得出“紧刀帧 0 帧”的错误扫描结论，修正 break 条件为 `ev & 24`（OVER|ESCAPED）后重探才确认。④ 探针结论本身：只收紧危险帧选帧条件的方案被探针否决（0 帧满足），改成“淡出已飞过刀 + 取更晚跃帧”的组合方案，未产生过坏代码。
- 验证：4 张截图 1280×480 JPEG q82（62–85 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；main.ts 两次输出 byte-identical（diff -r 干净；dossier 524,033 字节）；kit CLI `makefun check --repo . --worktree` 两次结果一致：4 passed、1 failed（transcripts_present——未传 transcripts，提交时由协调员随 transcripts 一起处理）、15 skipped；vendor sha 未变（dc671875…）。基线重拍先验证过：改动前 4 张截图与已提交版本 byte-identical，拍摄管线可信。
- 下一轮建议：① 评委的 5 个优先问题已在第 10 轮做完、5 个次要问题本轮做完——下一轮等评委对第 10/11 轮的新评审（JUDGE-REVIEW.md 若更新，按最新版最优先的 3–5 条改）；若无新评审，可从：封面无刀无连击略素（可在干净帧里优先挑带近刀/连击的帧）、结束帧火鸡头顶的飞刀是 seed 19 终局自带的（如评委介意可换 end 种子）、危险帧左缘刀贴着农夫（刀与农夫靴子约 40px，可接受）；② 难度：仍先看人类实测反馈，暂不再调数值；③ pilot 改进仍先做死因诊断再动手。


## 🔄 打磨第 10 轮（2026-11-27，评委 top 5 + 标题谷仓出面板 + 山脊灌木 + 跃起云）

- Commit：`c0e0c326f9539ff1144ac80e82f4113aa05fafd6`（`git ls-remote` 确认在 main 上）——本轮改 `game/src/render.js`、`game/src/shots.js` + 4 张截图；`main.ts`、`world.js`、`config.js`、`vendor/` 未动。render.js 经 6 次独立编辑、shots.js 经 3 次独立编辑改完，每处改完都单独重拍并裁剪放大验证过（另有一次 play 分镜返工，见失败/回滚）。
- **流程变化（Li 2026-11-27 21:35 指示）**：专职视觉评委并行评审，意见写进 `JUDGE-REVIEW.md`，打磨手动手前先读它。本轮开工时该文件**还不存在**（评委 21:37 才写出第 1 次评审、21:40 写出第 2 次评审，针对第 8/9 轮），所以先按 HANDOFF 备用建议做了三处（标题谷仓、危险帧灌木、跃起云），做到一半时文件出现，读完后把评委最优先的 5 个问题并入本轮、同一 commit 提交。**`JUDGE-REVIEW.md` 本轮未修改、未提交**（它是评委的文件，工作区里仍是 untracked 状态，留给评委/协调员处理）。
- 画面改进（逐张截图验证过，另裁剪放大验证标题谷仓、危险帧灌木、结束帧火鸡头、封面跃起云，拼了一张 2×2 总览图模拟评委半尺寸视角检查）：
  1. **危险帧火鸡腾空越过烤箱（评委第 1 优先，本轮主攻）**：分镜改动——danger 停帧条件加 `player.y > 120`（原只禁 y≥185 防斩首）。旧帧火鸡站在地面、身体压着烤箱、火焰从头顶窜出，读作“火鸡正在被烤”；新帧（720m、1660 分、剩 2 命）火鸡在烤箱正上方 3m 处腾空，脚离火焰舌尖约 22px 天空带，头顶是开阔天空，OVEN! 标签在烤箱右侧、飞刀在右缘、农夫在左缘，一眼看懂“躲过去了”。探针先算过：新帧烤箱在火鸡正下方、飞刀轨迹与谷仓无交叠。
  2. **结束帧火鸡放大 + 庆祝姿态 + 农夫缩小（评委第 2 优先）**：drawField 里 ESCAPED 分支火鸡 scale 1.12→**1.4**、强制跳跃姿态（翅膀张开、尾巴扇全开，drawTurkey 新增 `celebrate` 参数），农夫 scale 1.22→**1.0**（drawFarmer 新增 `scale` 参数，距离标签高度随缩放重算，仍浮在帽顶上方 50px）。旧帧火鸡躲在白栅栏后、比农夫还小；新帧大火鸡跃在栅栏前、护盾环衬托，农夫退居左缘。核查过：火鸡右缘（喙尖 ~431、护盾环 ~432）离分数面板左缘（470）留约 38px；头顶（y~260）离副标题（y~192）留约 55px；尾巴不压 FREEDOM 字。结束帧一把飞刀正擦过火鸡头顶飞过（seed 19 终局状态自带），读作惊险逃脱而非瑕疵，保留。
  3. **中层天空填空（评委第 3 优先）**：三处合力——① drawSky 新增一朵**定锚淡云**（620,215，alpha 0.38，随时间缓摆，像太阳旁的高云一样不随世界滚动），正好落在危险帧中空的中层天空；标题/结束帧里它被说明面板/分数面板盖住，无干扰。② 跃起云（见下）。③ 危险帧山脊灌木（见下）。半尺寸总览里 play/danger 的天空不再是平涂色块。
  4. **封面火鸡落回画面中心（评委第 4 优先）**：play 跃帧上限 185→**135**（中弧跳跃，不再是跃顶），火鸡脚 y~265、身体居中；另加 `ovenInFrame()` 要求——跃帧必须有烤箱完整入画（屏内 x 480–1150），见失败/回滚。新封面：180m、284 分、COMBO x2，火鸡中弧跃起、主烤箱完整带火焰+标签、飞刀在左、玉米在中。
  5. **"Xm" 距离标签离边（评委第 5 优先）**：农夫钳制在左缘时标签 pill 左缘原来 x=14，半尺寸下读作贴边裁切；现标签中心 `max(fx+6, 50)`，pill 左缘 **24px**，四帧的 31m/24m/38m/37m 全部离边。核查过评委自己的 r9 截图：字本身没被切，是边距太小造成的观感，已按评委建议右移。
  6. **标题谷仓完全出面板（HANDOFF 建议 1）**：标题屏谷仓改用**仅标题的相位**（drawHills 新增 `screen` 参数，标题相位 -360→+190，即 +550px）。探针先算过：全局移相位会把危险帧谷仓推到火鸡头/烤箱上、把结束帧谷仓藏进分数面板后留鬼影，所以只动标题屏。标题帧两谷仓现为 x~190 与 x~1170，都完整露在说明面板（250–1030）之外，面板底边金线干净无谷仓底片。标题屏在真实游玩里也是固定场景（distance 0），相位只影响标题构图。
  7. **危险帧左缘山脊灌木（HANDOFF 建议 2）**：drawHills 新增一丛低灌木，与谷仓同走 0.12 视差、贴在远山脊线上（相位 offset 210）。危险帧落在 x~169、离火鸡 161px（禁区 150px 之外）、农夫之右、火鸡之左，填补左缘中景；标题帧在屏外、封面在右缘烤箱后、结束帧在栅栏后（裁剪放大确认不碰火鸡头，距头顶约 60px）。特意做成低灌木而非小树：树干会在结束帧火鸡头顶竖一根线，灌木不会。
  8. **跃起云（HANDOFF 建议 3）**：drawSky 新增一朵淡云，alpha 随跳跃高度淡入（`clamp(player.y/140)`，满跳 0.42），落在火鸡喙右侧跳跃高度（~495,178，随时间缓漂）。落地时消失，不挤 HUD、标题文字与结束画面。封面帧火鸡跃起时云清晰可见，危险帧火鸡落地时云不可见（player.y=16），不抢戏。
- 截图变化：play 284 分/179m（新分镜：中弧跃帧 + 烤箱入画）、danger 1660 分/720m（新分镜：腾空越烤箱）、start 0 分（标题，谷仓出面板）、end 7415 分（seed 19 ESCAPED，火鸡放大）；文件 64.5/76.4/60.7/81.4 KiB。2×2 总览图半尺寸检查通过：封面火鸡居中、标题双谷仓对称、危险帧火鸡腾空、结束帧大火鸡在栅栏前，四帧 OVEN! 标签、HUD、结束金字均清晰。
- 实测（只改渲染 + 分镜，world.js 未动、没碰任何 random()，数据与第 5–9 轮完全一致，符合预期）：
  - 基础 pilot：逃脱 1/20，分数 1402–6295，距离 547–1500m；强 pilot：3/20，中位距离 1064m，中位分数 3479。
  - 确定性：同一 seed 两次 byte-identical（hash e6bac207…，与第 5–9 轮相同）。
  - 公平性仍成立：无操作 94m 被抓（93 分）、一直冲不跳 121m 被抓、随机按键 215m 被抓。
- 失败/回滚：**play 分镜第一版返工**——跃顶上限 185→135 后选到的帧火鸡正跳过一座谷仓顶、烤箱完全出画、右缘只剩半截 OVEN! 标签（比旧帧更弱）。当场修：跃帧加 `ovenInFrame()` 约束（须有烤箱完整入画），重拍后新封面（284 分）火鸡、烤箱、飞刀、玉米、连击全齐，才定稿。另一次探针验证：标题谷仓全局移相位的方案在动手前被探针否决（危险帧/结束帧会变差），改成仅标题相位，未产生过坏代码。
- 验证：4 张截图 1280×480 JPEG q82（60–82 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；kit check 两次输出 byte-identical（diff -r 干净；dossier 515,907 字节，总输出 930,961 字节）；vendor sha 未变（dc671875…）。基线重拍先验证过：改动前 4 张截图与已提交版本 byte-identical，拍摄管线可信。
- 下一轮建议：① 评委次要问题还没动，按顺序：标题副标题对比度低（白字印橙天，加深色底板或描边）、结束帧烟花太淡且白点压在 "dinner" 词上、危险帧右边的刀离火鸡太远、三帧橙色调太接近（可强化阶段色调区分）；② 结束帧火鸡头顶的飞刀是 seed 19 终局自带的，如评委介意可换 end 种子或在分镜里避开刀近头的帧；③ 封面右缘仍有一座刚入画的烤箱（只露 26px + 完整标签），读作入画物体可接受，如想彻底干净可在 `ovenInFrame` 里再加“右缘 1150–1280 内无烤箱”的约束，但会收紧选帧；④ 难度：仍先看人类实测反馈，暂不再调数值；⑤ pilot 改进仍先做死因诊断再动手。

## 🔄 打磨第 9 轮（2026-11-27，标题面板上移 + 谷仓让位飞刀 + 结束帧草丛）

- Commit：`2b6e9e704f90cc4cd8aa1e9145c08ca7588ec5c0`（`git ls-remote` 确认在 main 上）——本轮只改 `game/src/render.js` + 4 张截图；`main.ts`、`world.js`、`config.js`、`shots.js`、`vendor/` 未动。render.js 经 3 次独立编辑改完（标题面板→谷仓相位→结束草丛），每处改完都单独重拍并裁剪放大验证过。
- 画面改进（逐张截图验证过，另裁剪放大验证标题火鸡头顶、危险帧右缘、结束帧空地，拼了一张 2×2 总览图模拟评委半尺寸视角检查）：
  1. **标题说明面板上移 8px（本轮主攻）**：先量后动——像素扫描确认火鸡头顶（红肉垂尖 y≈302）离面板底边金线（y≈296）只有约 5px，与第 6、8 轮记录一致。面板 pill y=196→188、三行文字 226/254/280→218/246/272，底边 296→288；重拍后像素复量：面板金线 y=288，头顶 y=302，间隙 **14px**。副标题（基线 y=176，下行字母到 ~181）离面板顶边仍留 7px，BEST 行（y=322）离面板底边 34px。标题帧验证：火鸡头与面板金边之间有了一条清晰的天空带，半尺寸下也看得出分离。
  2. **危险帧飞刀轨迹与谷仓分开**：谷仓相位整体左移 150px（drawHills 里 `-210`→`-360`，`by` 仍按同一山脊数学重算，谷仓始终贴在山脊线上）。改前飞刀（刀身 y~270–300）正穿谷仓中部，白轨迹横过谷仓白门；改后谷仓中心 ~940、飞刀轨迹左端 ~1062，中间约 90px 开阔天空，刀与轨迹全程无遮挡。纯渲染相位改动，不碰飞刀高度带（KNIFE.highY/lowY 未动，玩法零变化）。副作用逐帧核查过：play 帧两谷仓移到 267/987，均干净地落在山脊上，不碰火鸡尾巴（尾下缘与谷仓顶差 ~45px）；结束帧两谷仓移到 130/1110，都完整可见、分别在农夫与栅栏两侧加深；标题帧谷仓仍在面板后，只在面板底边中央露出一小片带白门的谷仓底（22px 高），读作面板后的远景，不算瑕疵——把它彻底移出面板 x 范围会把危险帧的谷仓推到烤箱身后，反而糊了危险帧的主体，所以留着。危险帧左缘旧谷仓（x~110）移出画面，是小幅背景损失，可接受。
  3. **结束帧农夫与自由栅栏之间加草丛**：drawOver 的 ESCAPED 分支里，在 x=128–238 的地面上加 4 丛三叶草（高 12–18px，第四阶段草色 #d99a44 / 深色 #4e3018）+ 2 朵野花 + 1 片落叶，呼应封面的草缘。位置卡在体力条顶边（y=428）之上、SHIELD 标签之右，不碰任何 HUD。结束帧验证：农夫靴子到栅栏之间的土路不再是空地，草丛与原有草缘连成一片，不抢火鸡与栅栏。只画在 ESCAPED 分支（此时距离固定 1500m、栅栏固定在 x=330），CAUGHT 帧不受影响。
- 截图变化：play 289 分/184m、danger 1659 分/719m、end 7415 分（seed 19 ESCAPED）——三帧分数与第 6、7、8 轮完全相同；文件 64.1/75.7/58.7/80.9 KiB。2×2 总览图半尺寸检查通过：四帧主体、OVEN! 标签、标题、结束金字均清晰，危险帧飞刀在缩小后仍一眼可见且身后是干净天空。
- 实测（纯渲染改动，world.js 未动、没碰任何 random()，数据与第 5、6、7、8 轮完全一致，符合预期）：
  - 基础 pilot：逃脱 1/20，分数 1402–6295，距离 547–1500m；强 pilot：3/20，中位距离 1064m，中位分数 3479。
  - 确定性：同一 seed 两次 byte-identical（hash e6bac207…，与第 5、6、7、8 轮相同）。
  - 公平性仍成立：无操作 94m 被抓（93 分）、一直冲不跳 121m 被抓、随机按键 215m 被抓。
- 失败/回滚：无需要回滚的尝试。一次“量了再动”的验证：标题右缘裁剪放大后确认新相位下谷仓没有卡在右缘被裁（标题帧谷仓仍在面板后、右缘干净），才定稿；结束草丛第一版位置经裁剪放大确认不压体力条才保留。
- 验证：4 张截图 1280×480 JPEG q82（59–81 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；kit check 两次输出 byte-identical（diff -r 干净；dossier 505,012 字节，总输出 910,476 字节；两次日志仅输出目录路径不同）；vendor sha 未变（dc671875…）。基线重拍先验证过：改动前 4 张截图与已提交版本 byte-identical，拍摄管线可信。
- 下一轮建议：① 标题帧面板底边中央露出的谷仓底片（22px）可留意——如之后动谷仓相位，优先让标题谷仓完全藏进面板后或完全露在面板外；② 危险帧左缘谷仓已出画，左缘中景略空，可考虑在农夫身后远处补一棵小树或一丛灌木（须避开火鸡左右 150px 的禁区规则）；③ play 封面火鸡跃起时身后的云层仍偏素，可考虑在跃起高度附近加一朵淡云；④ 难度：仍先看人类实测反馈，暂不再调数值；⑤ pilot 改进仍先做死因诊断再动手。

## 🔄 打磨第 8 轮（2026-11-27，农夫脚下光斑 + 地面添花 + 标题底行下移）

- Commit：`48e88d192dc4bb899aeef5f408578e9bf778121e`（`git ls-remote` 确认在 main 上）——本轮只改 `game/src/render.js` + 4 张截图；`main.ts`、`world.js`、`config.js`、`shots.js`、`vendor/` 未动。render.js 经 5 次独立编辑改完（光斑→光斑加亮→草丛→落叶+野花→标题底行）。
- 画面改进（逐张截图验证过，另裁剪放大验证农夫靴区、拼了一张 2×2 总览图模拟评委半尺寸视角检查）：
  1. **农夫脚下浅色地面光斑（本轮主攻）**：drawFarmer 里在接触阴影之前加一池压扁的暖色阳光（径向渐变，rx 92、纵向压 0.25，中心 `rgba(247,220,158,0.55)` 向四周淡出到 0）。危险帧验证：靴子现在踩在一片暖光地上，棕色靴子与身后淡出的栅栏/干草彻底分开，像洒在土路上的阳光而不是色块。第一版 alpha 0.42 / 半径 78 在树林阶段（地面更暗）下仍偏淡，裁剪放大对比后加亮到 0.55 / 92 才定稿；标题、结束帧左缘农夫脚下顺带同样提亮。
  2. **封面空地加草/落叶点缀**：drawGround 的确定性地面细节加量——草丛 26→34 丛、平铺落叶 14→20 片，另加 10 朵两点小野花（橙/金/红，3px+2px）。封面验证：农夫与中部烤箱之间的土路不再是大片空地，草缘与落叶把路带填满了，但一朵花都不抢主体。全部是 scroll 的纯函数，不调 `random()`，不碰玩法随机流。
  3. **标题底部说明文字行下移**：`A 1,500 m dash…` 从 y=452 移到 y=462（+10px），火鸡尾巴底到文字顶的间隙约 47px→57px，底边仍留 ~14px。标题帧验证：尾巴与文字行之间有了呼吸空间，文字不贴底边。
- 截图变化：play 289 分/184m、danger 1659 分/719m、end 7415 分（seed 19 ESCAPED）——三帧分数与第 6、7 轮完全相同；文件 64.1/75.6/59.1/80.0 KiB。2×2 总览图半尺寸检查通过：四帧主体、OVEN! 标签、标题、结束金字均清晰，农夫光斑在半尺寸下仍看得见。
- 实测（纯渲染改动，world.js 未动、没碰任何 random()，数据与第 5、6、7 轮完全一致，符合预期）：
  - 基础 pilot：逃脱 1/20，分数 1402–6295，距离 547–1500m；强 pilot：3/20，中位距离 1064m，中位分数 3479。
  - 确定性：同一 seed 两次 byte-identical（hash e6bac207…，与第 5、6、7 轮相同）。
  - 公平性仍成立：无操作 94m 被抓（93 分）、一直冲不跳 121m 被抓、随机按键 215m 被抓。
- 失败/回滚：光斑第一版太淡（alpha 0.42 / 半径 78），裁剪放大后发现树林暗地里几乎看不出，已加亮到 0.55 / 92 重拍验证通过——是调参迭代，不是回滚。另一次操作失误与游戏无关：拼总览图的 Python 脚本文件名拼了两次 `.jpg`（`1-play.jpg.jpg`），报错后修正重拼。
- 验证：4 张截图 1280×480 JPEG q82（59–80 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；kit check 两次输出 byte-identical（diff -r 干净；dossier 502,349 字节，总输出 905,371 字节；两次日志仅输出目录路径不同）；vendor sha 未变（dc671875…）。基线重拍先验证过：改动前 4 张截图与已提交版本 byte-identical，拍摄管线可信。
- 下一轮建议：① 标题火鸡头顶离说明面板底边仍只有约 4px，是标题帧最紧的一处，可考虑面板上移几 px 或标题火鸡微缩；② 危险帧右缘飞刀轨迹与谷仓剪影轻微交叠，可微调飞刀高度带或谷仓位置；③ 结束帧农夫与自由栅栏之间仍有一小片空地，可加一丛草呼应封面；④ 难度：仍先看人类实测反馈，暂不再调数值；⑤ pilot 改进仍先做死因诊断再动手。

## 🔄 打磨第 7 轮（2026-11-27，OVEN! 标签移位 + 烤箱火焰加粗 + 结束提示加 pill）

- Commit：`eb0ffc83b95140c47467f7a10c2cf0f4e55738a4`（`git ls-remote` 确认在 main 上）——本轮只改 `game/src/render.js` + 4 张截图；`main.ts`、`world.js`、`config.js`、`shots.js`、`vendor/` 未动。render.js 经 4 次独立编辑改完（火焰舌+暖光→标签移位→调用点传 t→结束提示 pill）。
- 画面改进（逐张截图验证过，另拼了一张 2×2 总览图模拟评委半尺寸视角检查）：
  1. **"OVEN!" 标签移到烤箱侧面（本轮主攻）**：旧标签在烤箱正上方（gy-88），正好撞上跃过烤箱的火鸡头部和上窜的火焰舌，半尺寸下是半遮的橙色糊块。现改为烤箱右侧、与炉身同高的深色 pill（`rgba(30,12,4,0.8)` + 金边），文字 20px #ffb03a 居中其中；烤箱贴右缘时自动翻到左侧，永不裁切。危险帧验证：标签完整落在烤箱右侧空地上，火鸡头、火焰舌都碰不到它；封面两烤箱的标签也都清晰，右缘烤箱的标签正确翻到了左侧。
  2. **烤箱火焰加粗 + 暖光圈**：drawOven 本体新增三道常燃火焰舌（中高 46px、两侧 30/32px，橙→黄渐变 + 亮芯，随时间闪烁微摆），地面热光晕半径 130→165、alpha 0.5→0.62，另加炉口上方暖光晕（半径 88）。原来只有余烬粒子那几缕淡火苗，半尺寸下烤箱像个黑盒子；现在封面中部烤箱是一簇明亮的火焰，缩略图里一眼认出是“危险的烤箱”。标题帧的烤箱也顺带变醒目。火焰画在炉身之后、炉门之前，底座藏进炉体，已跑过的烤箱仍随 0.28 淡出（火焰一起淡，不会留下无根火）。
  3. **结束帧重跑提示加 pill 底并下移**：`▶ PRESS SPACE OR CLICK TO RUN AGAIN (R)` 从 y=398 裸字改为 y=407、下面垫深色 pill（435–965 × 384–416，金边），与自由栅栏和路过的飞刀彻底隔开；pill 底边离体力条（y=428）仍留 12px。结束帧验证：提示在深色 pill 上全程清晰，飞刀从 pill 后穿过也不影响阅读。
- 截图变化：play 289 分/184m、danger 1659 分/719m、end 7415 分（seed 19 ESCAPED）——三帧分数与第 6 轮完全相同；文件 63.0/74.8/57.8/79.3 KiB。2×2 总览图半尺寸检查通过：四帧的 OVEN! 标签、烤箱火焰、结束提示在缩小后均清晰可读。
- 实测（纯渲染改动，world.js 未动、没碰任何 random()，数据与第 5、6 轮完全一致，符合预期）：
  - 基础 pilot：逃脱 1/20，分数 1402–6295，距离 547–1500m；强 pilot：3/20，中位距离 1064m，中位分数 3479。
  - 确定性：同一 seed 两次 byte-identical（hash e6bac207…，与第 5、6 轮相同）。
  - 公平性仍成立：无操作 94m 被抓（93 分）、一直冲不跳 121m 被抓、随机按键 215m 被抓。
- 失败/回滚：无需要回滚的尝试。一次操作失误与游戏无关：启动 Chrome 前 `pkill -f` 的 pattern 命中了自己的 shell（已知陷阱），命令被 SIGTERM 杀掉，改用不带 pkill 的启动方式后正常。
- 验证：4 张截图 1280×480 JPEG q82（58–79 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；kit check 两次输出 byte-identical（diff -r 干净；dossier 495,010 字节，总输出 892,085 字节；两次日志仅输出目录路径不同）；vendor sha 未变（dc671875…）。
- 下一轮建议：① 危险帧左缘农夫身后的干草/树与农夫靴子仍有轻微糊在一起的感觉，可考虑农夫脚下加一小片浅色地面光斑提亮；② 封面火鸡跃起时左下角农夫与烤箱之间的大片空地略空，可加一丛草或落叶点缀，但别抢主体；③ 标题帧底部说明文字行与火鸡尾巴轻微贴近，可微调面板或火鸡站位；④ 难度：仍先看人类实测反馈，暂不再调数值；⑤ pilot 改进仍先做死因诊断再动手。

## 🔄 打磨第 6 轮（2026-11-27，火鸡放大 + 结束帧 ESCAPED + 太阳出 HUD + 鸟群内收）

- Commit：`29d52dbcaafb4c208679780290ebd8a77fbc3b69`（`git ls-remote` 确认在 main 上）——本轮改 `game/src/render.js`、`game/src/shots.js`、`shots.json` + 4 张截图；`main.ts`、`world.js`、`config.js`、`vendor/` 未动。render.js 经 9 次独立编辑改完（太阳→鸟群两处→火鸡缩放三处→drawField 传 screen 三处），shots.js 经 4 次（play 注释+上限→danger 上限→end 注释），shots.json 改 end 种子。
- 画面改进（逐张截图验证过，另用裁剪放大验证封面火鸡头顶间隙与标题左上角，并拼了一张 2×2 总览图模拟评委半尺寸视角检查）：
  1. **结束画面改 ESCAPED（本轮主攻）**：探针（/tmp/probe-end-r6.mjs）把短视 end pilot 在 70 个种子上跑了一遍，9 个逃脱；挑了最好的 seed 19（7415 分、43 玉米、连击 x5、躲刀 29、剩 2 命），shots.json 里 4-end.jpg 的种子 7→19。结束帧现在是金色 ESCAPED! 大字 + 烟花点 + 飘落金羽毛 + RANK: FREE BIRD + 满格进度条，火鸡带护盾环站在自由栅栏前完整可见。半尺寸下金色标题仍是最醒目的元素。
  2. **火鸡放大 12%**：drawTurkey 加 scale 参数，以脚为支点缩放（脚不离地），play/danger/over/pause 用 1.12，标题保持 1.0——标题火鸡头顶离说明面板底边本来只剩 4 px，统一放大头会钻进面板，是量过之后才决定分开的。接触阴影同步放大。封面火鸡的尾巴扇、头、肉垂在总览图里都更清楚。
  3. **太阳不再被 HUD 切半**：太阳圆心 y 86→116，整轮圆盘落在 HUD 条（底边 y=78）之下，play/danger/title 三帧右上都是一轮完整的太阳（之前顶部 28 px 藏在 HUD 半透明条后，是半个暗太阳）。
  4. **标题左上鸟群内收**：上层双鸟路径从 x=-100 起改为 90..1110，下层三鸟从贴右缘改为 90..1190。标题帧验证：双鸟落在 x≈245 起，左缘只剩柔云，有呼吸空间。
  5. **选帧上限同步收紧防“斩首”回潮**：火鸡变大后头顶高 ~15 px，play/danger 的跃顶上限 200→185。裁剪放大验证：封面火鸡头顶（红肉垂顶）离 HUD 底边约 15 px，头完整露出。
- 截图变化：play 289 分/184m（比第 5 轮 288/183m 晚一帧，是上限收紧后选了另一帧快照，不是逻辑变化）；danger 同帧 1659 分/719m，火鸡更大、头顶仍清；标题鸟群+太阳已变；结束帧从 CAUGHT（2370 分）换成 ESCAPED（7415 分）。2×2 总览图半尺寸检查通过：四帧主体、HUD、标题、结束金字均清晰。
- 实测（纯渲染 + 分镜改动，world.js 未动、没碰任何 random()，数据与第 5 轮完全一致，符合预期）：
  - 基础 pilot：逃脱 1/20，分数 1402–6295，距离 547–1500m；强 pilot：3/20，中位距离 1064m，中位分数 3479。
  - 确定性：同一 seed 两次 byte-identical（hash e6bac207…，与第 5 轮相同）。
  - 公平性仍成立：无操作 94m 被抓（93 分）、一直冲不跳 121m 被抓、随机按键 215m 被抓。
- 失败/回滚：无需要回滚的尝试。一次“差点走回头路”在动手前拦下：最初想全画面统一放大火鸡，量了标题帧才发现头顶离面板只剩 4 px，改成分画面缩放才提交，没产生过坏代码。截图脚本（/tmp/cdp-turkey.mjs）本轮加了种子参数（默认 7），end 拍 19——脚本在 /tmp，不在仓库里。
- 验证：4 张截图 1280×480 JPEG q82（58–79 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；kit check 两次输出 byte-identical（dossier 484,876 字节，总输出 873,631 字节）；vendor sha 未变（dc671875…）。
- 下一轮建议：① 危险帧的 "OVEN!" 标签常被火鸡头/火焰半遮，可把标签再抬高或移到烤箱侧面；② play 封面中部烤箱的火焰舌在总览图半尺寸下仍偏淡，可考虑把火焰画得更粗或加一圈暖光；③ 结束帧 ESCAPED 已固定，但 "PRESS SPACE…" 重跑提示与栅栏轻微重叠，可下移几 px 或加 pill 底；④ 难度：仍先看人类实测反馈，暂不再调数值；⑤ pilot 改进仍先做死因诊断再动手。

## 🔄 打磨第 5 轮（2026-11-27，无根余烬根治 + 跳跃风线 + 标题右上填空 + RNG 双流 + 截图分镜升级）

- Commit：`dbcb94bbc5ae9689b8788a12f418ac31864c32b9`（`git ls-remote` 确认在 main 上）——本轮改 `game/src/render.js`、`game/src/world.js`、`game/src/shots.js` + 4 张截图；`main.ts`、`config.js`、`vendor/` 未动。render.js 经 3 次独立编辑改完（标题天空→风线→风线加粗→余烬守卫），world.js 经 6 次（余烬两处→双流种子→景物/粒子/落叶分流→生成检查→落叶），shots.js 经 3 次（play 选跃→danger 延后→跃顶限高 + 注释）。
- 画面改进（逐张截图验证过，另用 /tmp/r5-wind.html 定格卡放大验证风线 + 余烬守卫，裁剪放大验证农夫区干净、烤箱火焰、火鸡头部，并拼了一张 2×2 总览图模拟评委半尺寸视角检查）：
  1. **无根余烬根治（本轮主攻，三层）**：① world 里余烬只在烤箱中心仍在火鸡前方时生成；② 余烬粒子改按世界全速漂移（原来 0.35 倍速，烤箱跑过去了余烬还留在原地），始终贴在自家烤箱上方；③ render 里余烬守卫：每颗余烬只在附近 30 px 内有活烤箱时才画，没烤箱（被撞碎/砸掉的烤箱留下的孤儿余烬）直接不画，已跑过的烤箱的余烬随烤箱一起以 0.28 淡出。定格卡验证：农夫身上/头顶零火焰（孤儿余烬两颗故意摆在农夫头顶，一颗都没画出来），已跑过烤箱上方只有一缕淡淡的火苗，前方烤箱火焰舌完整。
  2. **跳跃风线**：火鸡跳跃姿态时身后两道淡白风线（上强下弱）+ 一片飘落的羽毛，强度随跳跃高度变化；封面帧火鸡正好在跃起最高点附近，风线清晰可见。定格卡 + 封面截图双重验证。
  3. **标题右上角填空**：太阳右上加一朵轻柔的高云（1175,40 附近缓摆）+ 一只远飞的小鸟（太阳光晕里剪影滑翔），标题角落不再是空白。
  4. **截图分镜升级（本轮新增）**：play 封面改选“跃过障碍的最高一跃”（不再只看农夫最近），danger 帧延后到 25 s 之后才取（开局 80 m 的烤箱+飞刀不再冒充危险帧），两处都加“火鸡头部必须露出 HUD 横条”的限高（y<200）——第一版分镜火鸡跃到顶点时头部藏进 HUD 半透明条里，放大裁剪才发现像被斩首，已修掉。
- 截图变化：play 封面 288 分/183m（火鸡跃起 + 风线 + COMBO x2 + 飞刀 + 双烤箱火焰）；danger 1659 分/719m/剩 2 命（火鸡跃过烤箱、左右各一把飞刀、THE WOODS）；标题右上云+鸟；结束画面本轮是 CAUGHT FOR DINNER（860m/2370 分，短视 pilot 被抓，红字大标题半尺寸下依然醒目）。2×2 总览图半尺寸检查通过：四帧主体、HUD、标题、结束大字均清晰，play 与 danger 不再是重复帧。
- 实测（注意： pilot 数字变了，原因是下面的 RNG 分流重洗了障碍序列，不是调了难度——LIVES 仍是 4，所有速度/伤害/生成参数都没动）：
  - 基础 pilot：逃脱 1/20（第 4 轮 3/20），分数 1402–6295，距离 547–1500m；强 pilot：3/20（第 4 轮 2/20），中位距离 1064m（第 4 轮 862m），中位分数 3479（第 4 轮 3160）。
  - 确定性：同一 seed 两次 byte-identical（新 hash e6bac207…，分流改了随机序列所以与第 4 轮的 021b49ed… 不同，是预期的）。
  - 公平性仍成立：无操作 94m 被抓（93 分）、一直冲不跳 121m 被抓、随机按键 215m 被抓。
  - 余烬探针（/tmp/probe-ember-r5.mjs，真规则跑 6108 步）：41,645 次余烬观测里 259 次是烤箱被撞碎/砸掉后留下的孤儿——render 守卫把它们全部拦下不画，定格卡实测确认农夫区零火焰。
- 失败/回滚：**余烬修第一版后 pilot 逃脱率 3/20→8/20**——只改了余烬生成条件，余烬少调了几次 `random()`，共享随机流一变，整个障碍序列都被重洗。教训：视觉粒子绝不能和玩法共用一条随机流。已修：world 里分出 `prandom`  cosmetic 流（LCG，种子取自主流第一抽），景物/云/落叶/尘土/余烬/羽毛爆散全走 `prandom`，主 `random()` 只剩玩法抽取（pattern/treat/飞刀高度/投掷间隔/生成间距）。此后任何粒子/视觉改动都不会再动难度。另一次编辑中 `if (random() < dt * 9)` 的改写写成了新旧文本相同的空操作，当场发现并重改成 `prandom()`，未提交过坏代码。
- 验证：4 张截图 1280×480 JPEG q82（58–76 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；kit check 两次输出 byte-identical（dossier 458,335 字节，总输出 826,821 字节）；vendor sha 未变（dc671875…）。
- 下一轮建议：① 难度：base pilot 回到 1/20 是随机重洗的噪声（强 pilot 反而 2/20→3/20、中位距离上升），仍先看人类实测反馈，暂不再调数值；② 结束画面本轮是 CAUGHT（短视 pilot 被抓），ESCAPED 帧的烟花+金羽毛是第 4 轮验证过的，下一轮如想固定 ESCAPED 结束帧可在 end 分镜里优先挑逃脱帧；③ play 封面火鸡跃得很高（y~200 上限），如想让火鸡更大可把上限再放宽一点并改画 HUD 顺序；④ 标题画面：右上已填，但左上鸟群在标题帧偏左缘，可微调；⑤ pilot 改进仍先做死因诊断再动手。

## 🔄 打磨第 4 轮（2026-11-27，粒子/特效升级 + 已跑过烤箱淡出 + 标题南瓜堆移位）

- Commit：`f329fcba735b32700fdb2c26e3444bd8a015f670`（`git ls-remote` 确认在 main 上）——本轮只改 `game/src/render.js` + 4 张截图；`main.ts`、`shots.js`、`world.js`、`config.js`、`vendor/` 未动。render.js 经 6 次独立编辑改完（粒子→淡出→火鸡尘/星芒/光环→标题/结束→余烬放大→星芒改层）。
- 画面改进（逐张截图验证过，另用 /tmp/r4-particles.html 粒子定格卡放大验证四种粒子 + 南瓜光环 + 受伤星芒 + 风起农夫，并拼了一张 2×2 总览图模拟评委半尺寸视角检查）：
  1. **粒子/特效升级（本轮主攻）**：尘土改双层柔 puff（浅芯 + 随消散变大）；羽毛改泪滴形（棕身 + 浅色尖 + 羽轴线）；余烬改加色（'lighter'）火焰舌 + 亮芯，体积放大 ~1.5 倍，烤箱上方有可见火苗；玉米/南瓜金光改四点星芒（菱形 + 白芯），拾取帧一眼可见。火鸡跑动时脚后有相位驱动的扬尘（每步都有，不靠随机）；落地有扩散尘环；受伤有白色星芒闪（squash 驱动，随冲击衰减）；南瓜无敌加脉冲金环 + 6 颗轨道金色火花；结束画面 ESCAPED! 有 8 片金羽毛飘落。农夫扬尘也略加强（0.45→0.6）。
  2. **已跑过的烤箱淡出**：烤箱/栅栏/干草堆右缘跑过火鸡后以 0.28 透明度画，藏身草垛以 0.35 淡出（含 HIDE ↓ 标签）。危险帧验证：农夫全身清晰，淡掉的烤箱只剩幽影；前方烤箱仍全强度，视线落在真正的危险上。
  3. **标题南瓜堆移位**：左下三南瓜整体右移 ~55 px（96/142/118 → 152/198/174），与农夫靴子留出约 30 px 呼吸空间，仍不碰火鸡。
  4. 2×2 总览图半尺寸检查通过：四帧主体、HUD、标题、结束大字均清晰；危险帧火鸡身上的白色星芒在半尺寸下也看得见。
- 实测（纯渲染改动，逻辑未动，数据与第 1、2、3 轮完全一致，符合预期）：
  - 基础 pilot：逃脱 3/20，分数 711–6540，距离 306–1500m；强 pilot：2/20，中位距离 862m，中位分数 3160。
  - 确定性：同一 seed 两次 byte-identical（hash 021b49ed…，与第 1、2、3 轮相同）。
  - 公平性仍成立：无操作 103m 被抓（353 分）、一直冲不跳 155m 被抓、随机按键 215m 被抓。
- 失败/回滚：**星芒画层错误，已修掉未回滚**——定格卡第一版显示受伤星芒不可见：它画在南瓜光晕之后、尾巴/身体之前，被身体盖住了。改到护盾环之后（身体画完）重拍定格卡，星芒清晰可见。另一次编辑中误删了 `if (p.pumpkin > 0)` 的闭合 `}`，`node --check` 尚未跑到那一步时被读文件发现并当场补回（含金环/轨道火花），未提交过坏代码。教训：多层叠加的特效要按“背景→主体→闪光”顺序画，闪光类一律最后画。
- 验证：4 张截图 1280×480 JPEG q82（56–75 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；kit check 两次输出 byte-identical（dossier 461,004 字节，总输出 830,116 字节）；vendor sha 未变（dc671875…）。基线重拍与第 3 轮截图 byte-identical，拍摄管线先验证过再动手。
- 下一轮建议：① 危险帧已跑过烤箱的余烬会随世界滚动漂到农夫身后半空（无烤箱在下），像一小簇无根火苗，可让余烬随烤箱一起淡出（按烤箱的 passed 状态给余烬粒子降透明度，或余烬只在烤箱前方生成）；② play 封面火鸡在空中，脚下扬尘用不上，封面粒子仍偏素，可考虑跳跃时身后加两道淡风线；③ 标题画面右上角仍偏空（太阳附近），可加一只远飞的鸟或一朵云；④ 难度：仍先看人类实测反馈，暂不再动；⑤ pilot 改进仍先做死因诊断再动手。

- Commit：`a52f7e195872359502cdd8b00d33b7343c0ccf93`（`git ls-remote` 确认在 main 上）——本轮只改 `game/src/render.js` + 4 张截图；`main.ts`、`shots.js`、`world.js`、`config.js`、`vendor/` 未动。render.js 经 3 次独立编辑改完（飞刀→农夫→结束面板）。
- 画面改进（逐张截图验证过，另用 /tmp/farmer-test.html 三姿态定格逐个放大验证，并拼了一张 2×2 总览图模拟评委视角半尺寸检查）：
  1. **农夫三姿态**（本轮主攻，与火鸡四姿态对仗）：跑——身体前倾 0.11 rad（追近时 0.16）、双臂屈肘摆动、弯膝双腿 + 棕色靴子、脚下扬尘；风起——身体微后仰、手臂高举脑后、手握飞刀 + 头顶白色投掷弧；追近（gap<16m）——前倾更深、怒眉斜向鼻梁、张嘴大喊、红 "!" 脉冲；被击中后 surge 时身后三道速度线。整体放大 1.22 倍，背带裤加肩带 + 黄铜扣、红格衬衫加竖纹，草帽檐加宽——缩略图里也不再是细火柴人。
  2. **修掉一个真 bug**：旧代码风起时在农夫已平移的坐标系里调 `drawKnife(44, 118, …)`，drawKnife 内部又按世界高度算 y，刀被画到 y≈676 屏外，手里永远是空的。改前定格验证确认风起手是空的；改后刀直接画在农夫局部坐标里，手里有刀 + 投掷弧，定格验证通过。
  3. **结束画面火鸡完整可见**：分数面板从居中（390–890）移到右侧（470–930），文字重心 640→700；火鸡站在自由栅栏前（x~330）完全露出，FREEDOM 字也不再被面板压住。逃脱截图验证：整只火鸡 + 尾巴扇 + 栅栏全可见。
  4. **飞刀加粗**：刀身长 ~35%（刃 42→56 px、宽 10→16 px）+ 深色描边；轨迹改到正确的一侧——刀向右飞，白色长轨迹（126 px + 两条淡轨）拖在刀身左后方（旧轨迹画在前进方向右侧，是错的）；另加两道渐淡残影刀。危险帧验证：飞刀在总览图半尺寸下也一眼可见。
- 实测（纯渲染改动，逻辑未动，数据与第 1、2 轮完全一致，符合预期）：
  - 基础 pilot：逃脱 3/20，分数 711–6540，距离 306–1500m；强 pilot：2/20，中位距离 862m，中位分数 3160。
  - 确定性：同一 seed 两次 byte-identical（hash 021b49ed…，与第 1、2 轮相同）。
  - 公平性仍成立：无操作 103m 被抓（353 分）、一直冲不跳 155m 被抓、随机按键 215m 被抓。
- 失败/回滚：无需要回滚的尝试。Chrome 首次启动失败一次（root 下缺 --no-sandbox），加 flag 后正常，与游戏无关。
- 验证：4 张截图 1280×480 JPEG q82（56–75 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；kit check 两次输出 byte-identical（dossier 452,521 字节，总输出 813,727 字节）；vendor sha 未变（dc671875…）。
- 下一轮建议：① 火鸡与农夫都有姿态了，下一轮可做粒子/特效升级——火鸡受伤羽毛爆散、落地尘土、玉米拾取金光、南瓜无敌光环，目前粒子偏素；② 危险帧左缘农夫与已跑过的烤箱重叠，烤箱挡了农夫半身，可让已跑过的烤箱淡出或农夫跑过时烤箱不再画在同屏；③ 标题画面农夫与左下南瓜堆轻微贴边，可微调；④ 难度：仍先看人类实测反馈，暂不再动；⑤ pilot 改进仍先做死因诊断再动手。

## 🔄 打磨第 2 轮（2026-11-27，火鸡四姿态 + 地面层次 + 标题前景）

- Commit：`0dbfc9b897143fd5531eb68d9b8b2080c80af6e4`（`git ls-remote` 确认在 main 上）——本轮只改 `game/src/render.js` + 4 张截图；`main.ts`、`shots.js`、`world.js`、`config.js`、`vendor/` 未动。
- 画面改进（逐张截图验证过，另用 /tmp/pose-test.html 四姿态定格逐个放大验证）：
  1. **火鸡四姿态**（本轮主攻）：run / jump / slide / hurt 各不相同——跑：身体前倾 + 上下 bob、尾巴扇左右摇摆、双腿大步幅交替 + 黄色小脚、翅膀随步伐扇动；跳：身体拉长前倾 -0.16 rad、尾巴扇全开 1.3 倍 + 上抬、双腿收起、双翅张开（近翅竖起 + 远翅深色一角）、头抬高眼睛睁大；滑（蹲）：身体压低拉长、尾巴扇压扁 0.4、双腿向后拖、眼睛眯成一线；受伤：身体摇晃、尾巴下垂、双腿叉开、眼睛变 X。翅膀改浅棕 #a06830 + 深色描边，不再融进身体；冲刺时尾巴后拖三道速度线。
  2. **地面层次**：土路不再是平色带——浅色磨损路心 + 两条波浪形深色车辙 + 石子 + 脚印对 + 落叶；“v”形草叶 46 丛 → 26 丛三叶草，只长在路面上方的草缘（不再满屏噪点），另加 14 片平铺落叶点缀。
  3. **标题左右下角填满**：左下角南瓜堆（3 个南瓜叠放），右下角栅栏 + 干草堆 + 南瓜；均避开左缘农夫与火鸡，不遮底部说明文字。
  4. 4 张截图全部重拍并逐张目视验证：play 封面火鸡跃过玉米时尾巴扇 + 翅膀 + 黄脚都看得见；danger 护盾火鸡 + 烤箱 + 飞刀；标题两角已满；结束画面不变（本轮未动结束画，截图与第 1 轮同帧）。
- 实测（纯渲染改动，逻辑未动，数据与第 1 轮完全一致，符合预期）：
  - 基础 pilot：逃脱 3/20，分数 711–6540，距离 306–1500m；强 pilot：2/20，中位距离 862m，中位分数 3160。
  - 确定性：同一 seed 两次 byte-identical（hash 021b49ed…，与第 1 轮相同）。
  - 公平性仍成立：无操作 103m 被抓（353 分）、一直冲不跳 155m 被抓、随机按键 215m 被抓。
- 失败/回滚：**链式跳跃前瞻（shots autopilot）已实现后回滚**——连续两个障碍提前规划、链式时跳跃触发 0.52→0.62s。探针实测（/tmp/probe-chain.mjs）：20 种子、140,936 步里链式条件一次都没触发（12m 窗口内根本不存在第二个障碍，最近 pair 间距无穷大），因为生成器 pattern 间距最小 24m。改动对逃脱率/分数/确定性 hash 零影响，纯属死代码，已完整 revert，`git diff` 确认 shots.js 无改动。教训：先探针验证“这种局面是否真实存在”，再写前瞻逻辑；下一轮如要做 pilot 改进，应先从死因诊断里找真实存在的高频死因。
- 验证：4 张截图 1280×480 JPEG q82（54–74 KiB，均 ≤256 KiB），0 console 报错、0 外部请求、9 文件全加载；`node --check` 全过；kit check 两次输出 byte-identical（dossier 436,719 字节，总输出 784,435 字节）。
- 下一轮建议：① 农夫造型/动画还没动过——跑步姿态、扔刀风起动作、追近时的表情是下一轮主攻（与火鸡四姿态对仗）；② 结束画面火鸡被分数面板半遮，可把火鸡移到面板左侧空位或缩小面板；③ 危险帧的飞刀偏小，总览图里几乎看不见，可加粗刀身 + 更长的白色轨迹；④ 难度：LIVES=4 后仍先看人类实测反馈，暂不再动；⑤ pilot 改进先做死因诊断再动手，不要先写逻辑再验证局面存在。

## 🔄 打磨第 1 轮（2026-11-27，画面优先 + 难度实测）

- Commit：`39fc198490086dfefff102f393ec162e411f2a15`（`git ls-remote` 确认在 main 上）——本轮只改 `game/src/config.js`、`game/src/render.js`、4 张截图；`main.ts`、`shots.js`、`world.js`、`vendor/` 未动。
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
