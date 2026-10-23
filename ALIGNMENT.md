# 1.0.1 cue overlap fix

修复JSON3同窗口相邻字幕时间重叠：上一条双语字幕在下一条开始时结束。保留开始时间、文本ID、不同窗口和正常空隙。缓存与Key不变。

122项模拟回归测试通过。用户截图显示中文落后一段，但缺少原始字幕响应，尚不能确认时间重叠就是截图的根因。此分支仅修复可复现的JSON3重叠，不宣称解决译文语义串句、播放器裁行或其他格式问题。

试用插件：https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/fix/cue-overlap-v101/plugins/YouTube-translate.plugin 。关闭旧插件并更新脚本，保留缓存。尚未合并main。
