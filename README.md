# YouTube × Loon × DeepSeek 双语字幕

实验版 0.1.2。用于 iPhone 官方 YouTube App 的字幕响应改写：译文在上、原文在下，支持格式写入水平居中设置。部分设备已获用户成功反馈，不代表所有版本和字幕轨道兼容；居中效果及本次故障恢复仍需真机验证。

## Loon 远程订阅

在 Loon 的插件管理中添加下面的远程插件地址。先使用无 API 验证版，确认画面显示后再改用翻译版；两个插件不要同时启用。

- [无 API 注入验证版](https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/main/plugins/YouTube-probe.plugin)
- [DeepSeek 双语翻译版](https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/main/plugins/YouTube-translate.plugin)

如果已在本地成功使用本插件，先关闭原来的本地插件，再添加对应远程版，并检查“允许翻译”开关。Key 和缓存存储名称保持一致，无需重新输入 Key。更新脚本后重开 YouTube 视频触发新字幕请求。

从 0.1.1 更新：等 0.1.2 合并到主分支后，在 Loon 更新已有远程插件及其引用脚本，确认插件说明为 0.1.2，翻译日志含 `version=0.1.2`，再重新打开视频。保持“允许翻译”开启。旧版继续使用对应的 `.legacy.plugin`，本地翻译设置不变。不要运行 `remove-local-data.js`；更新不需要删除 Key 或缓存。旧版本遗留冷却会自然到期，最长等待 5 分钟。

PR 合并前，默认订阅仍运行主分支版本。只替换插件下载地址中的分支名不足以测试 PR，因为其中的脚本地址仍指向 main；如需提前测试，可下载 PR 分支的 `dist/yt-translate.js` 和对应 `dist/YouTube-translate[.legacy].plugin`，按已有本地插件方式加载，并关闭原远程插件以免重复执行。

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

## 0.1.2 故障诊断与恢复

只记录固定错误类别、HTTP 状态、批次、尝试次数、耗时、超时上限、重试等待和冷却时长。不打印 API Key、Authorization、字幕、API 响应正文或原始错误对象。

| 日志类别 / 状态 | 当前响应行为 | 跨响应冷却 | 排查方式 |
| --- | --- | --- | --- |
| `HTTP_AUTH`，401 / 403 | 停止新批次，不重试 | 300 秒 | 仅在设备本地核对 Key、账号权限及访问限制 |
| `HTTP_RATE_LIMIT`，429 | 停止新批次，不立即重试 | 默认 60 秒；接受 Retry-After 秒数或日期，限制为 60–300 秒 | 等待后再试，减少并发播放或重复请求 |
| `HTTP_SERVER`，5xx | 时间和调用名额允许时重试一次 | 重试失败或不能重试时 10 秒 | 稍后再试；持续出现时检查服务状态 |
| `TIMEOUT` / `NETWORK_TEMPORARY` | 时间和调用名额允许时重试一次 | 重试失败或不能重试时 10 秒 | 检查网络、代理节点及耗时 |
| `NETWORK`，无法归类的网络/同步调用错误 | 不盲目重试 | 10 秒 | 检查连接、TLS 和 Loon 运行环境 |
| `HTTP_OTHER`，其他非 200 状态 | 停止新批次，不重试 | 60 秒 | 400/422 核对模型和参数；402 检查余额；3xx 检查访问路径，脚本禁止跟随重定向 |
| `API_JSON_OUTER` / `API_JSON_INNER` | 当前批次回退，继续其他批次，不重试 | 无 | API 外层响应或模型输出不是有效 JSON；若持续发生，记录类别和模型名称 |
| `API_SCHEMA` / `API_BODY_LIMIT` / `API_VALIDATION` | 当前批次回退，继续其他批次，不重试 | 无 | 返回结构、ID、空译文、长度等未通过严格校验 |
| `API_FINISH_LENGTH` / `API_FINISH_FILTER` / `API_FINISH_OTHER` | 当前批次回退，继续其他批次，不重试 | 无 | 分别表示截断、内容过滤或其他非 stop 原因；不会记录原始 finish_reason |
| `result=DEADLINE` | 结束等待，返回已完成译文和其余原文 | 不另加冷却 | 总时间不足或 HTTP 未回调；迟到回调被忽略 |

日志摘要中的 `sent` 和 `failed` 以调用尝试计数（包含重试），`translated` 和 `cached` 以字幕条数计数。一次失败后重试成功，摘要仍可能有 `failed=1`。并行成功不会清除其他请求的冷却，较短冷却不会覆盖较长冷却。旧缓存、`ytloon.deepseek.key`、`ytloon.cooldown.v1` 等存储键保持兼容。

本次不改默认模型、不放宽输出校验、不增加付费调用总上限。所有自动化用例使用人工字幕和模拟 API，没有读取手机 Key，也没有发起真实 DeepSeek 请求。

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
