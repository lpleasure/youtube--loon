# YouTube × Loon × DeepSeek 双语字幕

实验版 0.1.1。用于 iPhone 官方 YouTube App 的字幕响应改写：译文在上、原文在下，支持格式写入水平居中设置。部分设备已获用户成功反馈，不代表所有版本和字幕轨道兼容；新版居中效果仍需真机验证。

## Loon 远程订阅

在 Loon 的插件管理中添加下面的远程插件地址。先使用无 API 验证版，确认画面显示后再改用翻译版；两个插件不要同时启用。

- [无 API 注入验证版](https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/main/plugins/YouTube-probe.plugin)
- [DeepSeek 双语翻译版](https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/main/plugins/YouTube-translate.plugin)

如果已在本地成功使用本插件，先关闭原来的本地插件，再添加对应远程版，并检查“允许翻译”开关。Key 和缓存存储名称保持一致，无需重新输入 Key。更新脚本后重开 YouTube 视频触发新字幕请求。

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

## API Key 只保存在手机本地

在 Loon 新建临时本地脚本，复制 `local-setup.example.js`，仅在手机上替换 `LOCAL_KEY` 占位符并手动运行一次。保存成功后清掉编辑器里的 Key 并删除临时脚本。

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
- 每个响应最多 4 批，每批最多 24 个不同句子、2,400 字符，并发最多 2；超出范围保留原文。
- 单请求最多约 8 秒，整体主动等待约 18 秒。已经发出的请求可能仍产生费用。
- 缓存有效 7 天，最多 400 条且不超过 256 KiB，保存原文和译文。
- 失败批次保留原文，成功批次仍可显示；有冷却，无当前响应内自动重试。
- 多个字幕响应并发时可能重复请求，单响应限制不是账号总预算。

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
