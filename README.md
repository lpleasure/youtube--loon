# v0.1.5 实验修复分支

请先阅读 [本次验证与安装说明](VALIDATION-v0.1.5.md)。本次修复长轨道缓存容量和预翻译恢复，尚未达到首次双语加载提速与真机错误率验收。下方为历史版本说明。

# YouTube × Loon × DeepSeek 双语字幕

实验版 0.1.4（长视频修复分支）。用于 iPhone 官方 YouTube App 的字幕响应改写：译文在上、原文在下，支持格式写入水平居中设置。部分设备已获用户成功反馈，不代表所有版本和字幕轨道兼容；居中效果及本次故障恢复仍需真机验证。

## 0.1.4 长视频使用方法

本版取消默认前 4 批/4 次调用限制。所有未缓存字幕批次都会进入队列，默认并发 8（本地设置可选 1–12）；Response 仍在约 22 秒结束。缓存扩大为最多 6,000 条、4 MiB、7 天。容量仍是有限的，超过容量不能保证整片重放均命中。

1. 安装 [0.1.4 翻译订阅](https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/fix/long-video-v014/plugins/YouTube-translate.plugin)，关闭旧翻译插件，更新脚本并确认日志 version=0.1.4。保留已有 Key 和缓存，翻译起点设为 0。
2. 长视频首次打开字幕后，若仍只有一部分翻译，安装 [最近字幕预翻译任务](https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/fix/long-video-v014/plugins/YouTube-prewarm.plugin)。在 Loon 中手动运行 YTSubs prewarm，最多等待约 270 秒（外层超时 300 秒）。它会从已捕获字幕的开头补齐未缓存句子，不使用手动起点过滤。
3. 完成后重新打开视频或切换字幕，尝试触发新的字幕请求。新响应会加载已完成缓存。若预翻译因截止时间结束，可以再次手动运行继续；鉴权或限流冷却期间先等待并解决原因。

预翻译任务使用同一 DeepSeek Key，可能翻译完整长轨道；不再以节省 API 费用为目的限制 4 次调用。仍保留并发、截止时间、严格校验、有限重试和鉴权/限流停止，防止错误请求无限循环。每个原始批次最多二分一层，子批失败保留原文。Response 每次请求最多等待 22 秒，手动任务单次 HTTP 最多 30 秒，整体 270 秒。

任务只处理最近捕获且有待翻译的一个轨道；本地保存该字幕正文、语言和模型设置，30 分钟内可运行，不保存签名 URL、Cookie 或 Key 到任务记录。新轨道会覆盖旧任务。数据仅保存在 Loon 本地（备份可能包含），clear-cache.js 和 remove-local-data.js 均清除该任务。任务到期后不会执行，记录会由后续捕获覆盖或由清理脚本删除。预翻译每完成约 96 句会保存一次进度，正常结束再保存余下结果；系统强制终止可能丢失最后一个未保存片段。

注意：这仍依赖客户端实际请求字幕。Loon Response 无法读取播放器进度、修改已交付轨道或强制 YouTube 重新下载；若 App 只缓存一次完整轨道，预翻译后需要找到能触发新请求的操作。响应本来没有后段字幕、滚动追加或不支持的字幕格式无法由此补齐。多实例同时运行可能重复调用或发生存储覆盖，避免同时启动多个预翻译任务。旧语法用户可继续用对应翻译插件，但本次预翻译任务配置采用现代 Generic 语法，需要 Loon 3.5.1(983)+。

验证见 [VALIDATION-v0.1.4.md](VALIDATION-v0.1.4.md)。以下 0.1.3 小节保留为历史说明，其中四次调用和旧缓存上限已由本节替代。

## Loon 远程订阅

在 Loon 的插件管理中添加下面的远程插件地址。先使用无 API 验证版，确认画面显示后再改用翻译版；两个插件不要同时启用。

- [无 API 注入验证版](https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/main/plugins/YouTube-probe.plugin)
- [DeepSeek 双语翻译版](https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/main/plugins/YouTube-translate.plugin)

如果已在本地成功使用本插件，先关闭原来的本地插件，再添加对应远程版，并检查“允许翻译”开关。Key 和缓存存储名称保持一致，无需重新输入 Key。更新脚本后重开 YouTube 视频触发新字幕请求。

从 0.1.2 更新：使用下方“0.1.3 分支试用与后段字幕”中的订阅，更新插件与脚本后确认日志 version=0.1.3；保留本地 Key 和缓存。上方 main 链接仍是主分支版本。

本分支 plugins/ 内引用脚本也指向 fix/subtitle-recovery-v013，可直接试用。合并前保留该分支；若日后改回 main，请修改 subscription.json 并重新构建，以免插件和脚本版本混用。

本仓库只包含代码、配置、人工测试样例和通用说明，不包含个人抓包、设备记录、运行日志或真实 API Key。

`package.json` 中的 `"private": true` 只用于阻止误发 npm 包，与 GitHub 仓库公开/私有无关。

## 远程订阅配置

仓库地址和更新分支记录在 `subscription.json`。构建会同时生成本地版和远程订阅版：

```sh
node tools/build.cjs
node --test tests/*.test.cjs
```

1. `src/` 为源码；`dist/*.js` 为可独立运行的脚本；`dist/*.plugin` 是本地配置。
2. `plugins/*.plugin` 是 Loon 远程订阅入口，引用 `dist/*.js` 的绝对 Raw URL。
3. 修改源码后，构建并测试，再同时提交源码、`dist/` 与 `plugins/`。
4. `main` 地址随提交更新；也可将 `subscription.json` 的 `ref` 固定为已有提交来锁定脚本版本。是否已刷新，以 Loon 实际更新结果为准。
5. Fork 到其他仓库后，先更改 `subscription.json` 的 `repository` 与 `ref` 并重新构建，避免继续引用原仓库脚本。

私有仓库需要额外下载认证，本包没有把 GitHub Token 放入订阅 URL 的机制。远程脚本可以访问 Loon 脚本存储，只订阅自己信任的仓库与版本。

## 使用

1. 首次使用先启用 probe，关闭其他同类字幕脚本，按 Loon 引导设置 MitM 证书信任。
2. 在官方 YouTube App 选择有原文字幕的视频并开启字幕，重新打开视频以触发字幕请求。
3. 前五条非空字幕上方应出现 `[LOON 双语注入测试]`。该验证脚本不调用 API。
4. 确认画面显示标记后关闭 probe，改用 translate，并在插件参数中打开“允许翻译”。
5. 中文应在原文上方；长句可能折行。probe 和 translate 不应同时启用。

新版配置适用 Loon 3.5.1 (983)+；`.legacy.plugin` 使用旧语法。远程链接下载失败与字幕改写失败是不同问题，应分别检查 Loon 下载错误与 `[YTSubs]` 日志。

## API Key 只保存在设备本地

在 Loon 新建临时本地脚本，复制 `local-setup.example.js`，仅在设备上替换 `LOCAL_KEY` 占位符并手动运行一次。保存成功后清掉编辑器里的 Key 并删除临时脚本。

- 不要将填写过 Key 的副本提交到仓库，无论仓库公开还是私有。
- 仓库中的设置模板只能保留 `PASTE_KEY_ON_IPHONE_ONLY` 占位符。
- 运行脚本从 Loon 本地存储读取 Key，向固定 DeepSeek HTTPS API 发送认证头和需翻译的字幕。不会发送 YouTube Cookie、签名 URL 或视频 ID。
- 本地脚本存储不是 Keychain，不保证与其他脚本隔离；备份/同步也可能包含本地数据，不要公开这些备份。
- 更新订阅不需要重新填写 Key，翻译缓存也可继续使用。
- `clear-cache.js` 只清理本插件缓存与冷却；`remove-local-data.js` 还会删除本插件 Key 和设置。

## 范围与限制

- 仅处理候选域名下 `/api/timedtext` 的 HTTP 200 文本响应。
- 支持 JSON3、受限 SRV3、旧 transcript/SRV1、WebVTT；保留 cue 起点和时长。
- JSON3/SRV3 合并逐词片段，修改水平窗口位置与文字对齐，保留有效垂直位置；不保证逐词高亮或复杂样式。
- WebVTT 修改已翻译 cue 的水平位置；SRV1 只支持上下换序，居中由播放器决定。
- 不支持滚动追加、protobuf、SRV2、TTML、CDATA、复杂内联 XML；无字幕的视频不会自动生成字幕。
- 每个响应最多 4 批、4 次 API 调用（含重试），每批最多 24 个不同句子、2,400 字符，并发最多 2；重试会占用后续批次的调用名额，超出范围保留原文。
- 单请求最多 12 秒，按剩余时间缩短；全局主动等待最多约 22 秒，Loon 外层仍为 25 秒。只在剩余请求时间至少 4 秒时发起调用，并预留 0.5 秒完成处理。原 8 秒对网络及模型延迟的容忍度较低，但旧日志不足以证明此次故障是超时；12 秒是有界折中，仍需设备验证。
- 缓存有效 7 天，最多 400 条且不超过 256 KiB，保存原文和译文。
- 失败批次保留原文，成功批次仍可显示。可识别的临时故障最多延迟 0.75 秒重试一次，详见下表；已发出的请求（包括超时请求）可能产生费用，脚本无法撤销服务端生成。
- 多个字幕响应并发时可能重复请求，单响应限制不是账号总预算。

## 0.1.3 故障诊断与恢复

只记录固定错误类别、HTTP 状态、批次、尝试次数、耗时、超时上限、重试等待和冷却时长。不打印 API Key、Authorization、字幕、API 响应正文或原始错误对象。

| 日志类别 / 状态 | 当前响应行为 | 跨响应冷却 | 排查方式 |
| --- | --- | --- | --- |
| `HTTP_AUTH`，401 / 403 | 停止新批次，不重试 | 300 秒 | 仅在设备本地核对 Key、账号权限及访问限制 |
| `HTTP_RATE_LIMIT`，429 | 停止新批次，不立即重试 | 默认 60 秒；接受 Retry-After 秒数或日期，限制为 60–300 秒 | 等待后再试，减少并发播放或重复请求 |
| `HTTP_SERVER`，5xx | 时间和调用名额允许时重试一次 | 重试失败或不能重试时 10 秒 | 稍后再试；持续出现时检查服务状态 |
| `TIMEOUT` / `NETWORK_TEMPORARY` | 时间和调用名额允许时重试一次 | 重试失败或不能重试时 10 秒 | 检查网络、代理节点及耗时 |
| `NETWORK`，无法归类的网络/同步调用错误 | 不盲目重试 | 10 秒 | 检查连接、TLS 和 Loon 运行环境 |
| `HTTP_OTHER`，其他非 200 状态 | 停止新批次，不重试 | 60 秒 | 400/422 核对模型和参数；402 检查余额；3xx 检查访问路径，脚本禁止跟随重定向 |
| `API_JSON_OUTER` | 当前批次回退，继续其他批次 | 无 | 外层不是合法 JSON |
| `API_JSON_INNER` / `API_SCHEMA` / `API_FINISH_LENGTH` | 名额与时间允许时，多条批次二分一次，单条延迟 750ms 重试一次；子批次失败回退 | 无 | 详见下方恢复规则 |
| `API_BODY_LIMIT` / `API_VALIDATION` | 当前批次回退，继续其他批次，不重试 | 无 | 返回结构、ID、空译文、长度等未通过严格校验 |
| `API_FINISH_FILTER` / `API_FINISH_OTHER` | 当前批次回退，继续其他批次，不重试 | 无 | 表示内容过滤或其他非 stop 原因；不会记录原始 finish_reason |
| `result=DEADLINE` | 结束等待，返回已完成译文和其余原文 | 不另加冷却 | 总时间不足或 HTTP 未回调；迟到回调被忽略 |

日志摘要中的 `sent` 和 `failed` 以调用尝试计数（包含重试），`translated` 和 `cached` 以字幕条数计数。一次失败后重试成功，摘要仍可能有 `failed=1`。并行成功不会清除其他请求的冷却，较短冷却不会覆盖较长冷却。旧缓存、`ytloon.deepseek.key`、`ytloon.cooldown.v1` 等存储键保持兼容。

本次不改默认模型、不放宽输出校验、不增加单响应付费调用总上限。所有自动化用例使用人工字幕和模拟 API，没有读取手机 Key，也没有发起真实 DeepSeek 请求。


## 0.1.3 历史：分支试用与后段字幕

修复分支：`fix/subtitle-recovery-v013`。试用订阅（仅安装其中一个翻译插件）：

- [Loon 3.5.1(983)+ 翻译插件](https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/fix/subtitle-recovery-v013/plugins/YouTube-translate.plugin)
- [旧语法翻译插件](https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/fix/subtitle-recovery-v013/plugins/YouTube-translate.legacy.plugin)

更新/替换旧插件后刷新脚本缓存，日志应显示 `version=0.1.3`。已有本地 Key、缓存键及 prompt-v1 缓存继续有效；无需清空缓存。保持原来的 MitM 配置，关闭互斥字幕重写插件，先做 probe 测试后再启用翻译。不要同时开启 probe 和 translate。

新语法插件增加“翻译起点秒数” `start_seconds`，默认 0。观看 30 分钟之后的内容，可手动填 1800，随后重新打开视频或切换字幕语言，促使客户端重新请求字幕；脚本仅优先翻译响应中起点不小于该值的未缓存 cue。已有缓存仍会在整份响应中合并。看其他视频前记得改回 0：此参数是全局设置，不是单个视频的播放位置。

旧语法在手机本地设置脚本的 settings 对象中加入 `start_seconds: 1800`（例子提供变量）。不要把 Key 写进 GitHub。重新运行 setup 会同时更新其中的其他设置，先核对 enabled 值。

每个首次失败批次最多二分一层，只有至少剩余两个调用名额才排入两个子批次；恢复队列优先于普通批次。子批次仍必须完整通过原有 ID、数量、文本长度等校验，不从无效回复中抢救部分译文，不删除 markdown 包装、不猜测 ID。单条首次失败只延迟重试一次。网络重试、缩批、普通请求共同占用原有 4 次额度；不会递归或无限重试。预算不足、冷却、总时限或子批失败时保留原文，已成功的兄弟批次继续缓存和显示。

日志增加固定 detail（ENVELOPE / COUNT_OR_SHAPE / ID_OR_TEXT / INVALID_JSON / EMPTY_CONTENT）、cues、action（split/retry/fallback）、remaining_ms；结尾 untranslated 表示该响应仍未翻译的条数。failed 统计失败尝试，恢复成功后也可能大于零。COMPLETE_BOUNDED 只表示本次有界队列结束，不表示整部视频译完。

长视频限制：Response 脚本只在真实字幕 HTTP 响应到达时运行，不能实时读取播放器进度、主动改写已交给播放器的字幕，或保证拖动/切字幕触发新请求。对同一原始字幕再次请求时，会跳过有效缓存继续处理后面未缓存句子（测试验证 150 条字幕的第二次请求覆盖第 97–150 条）；这一缓存行为在 0.1.2 已存在，本次新增手动起点可避免总从开头补齐。播放器可能只下载一次完整轨道；缓存最多 400 条/256KiB，长视频反复刷新可能驱逐旧条目，因此不能保证全片覆盖。请求中本来没有的后段字幕也无法凭空补出。字幕起点按响应时间戳解释，分段流若重置时间戳，手动起点不适用。整片离线预翻译/播放器进度联动需要独立工具或客户端集成，超出本插件范围。

依据：[DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/) 说明 JSON 模式偶尔返回空内容；[Loon Script API](https://nsloon.app/docs/Script/script_api/) 记录请求/响应上下文，未提供播放器进度接口。这里的能力边界由该接口范围推断，并非真机验证结论。

验证详情见 [VALIDATION-v0.1.3.md](VALIDATION-v0.1.3.md)。所有 API 回复均为模拟数据；尚未验证真实 DeepSeek 账户、iPhone/Loon 导入和播放器画面。

## 开发与检查

Node.js 18+，不需要安装第三方依赖：

```sh
node tools/build.cjs
node --test tests/*.test.cjs
node tools/inspect-har.cjs /path/to/capture.har
```

测试样本全部人工构造，没有用户抓包内容；网络调用使用模拟接口。本地测试不能替代 Loon 配置导入和 iPhone 画面验证。

HAR 工具离线输出结构摘要，不打印查询值、Cookie 或字幕文本；它不是完整脱敏器。不要提交原始 HAR、真实 Key、证书私钥或完整 Loon 配置。

## 技术依据

[Loon Script](https://nsloon.app/en/docs/Script/script_v2/)、[Loon Script API](https://nsloon.app/docs/Script/script_api/)、[DeepSeek API](https://api-docs.deepseek.com/api/create-chat-completion/)、[YTSubConverter](https://github.com/arcusmaximus/YTSubConverter)、[SRV3 字段实现](https://raw.githubusercontent.com/tamnd/ytb-cli/main/pkg/srv3/srv3.go)、[WebVTT](https://www.w3.org/TR/webvtt1/)。
