# 1.0.3 iOS SRV3 sentence synchronization

补充SRV3整句重建，保留SRV3输出。使用s元素的相对时间；缺少逐词时间时，在原段落内按文本长度估算，不代表音频强制对齐。标点、无标点长句仍可能无法理想切分。

整句SRV3采用新缓存标识，保留旧缓存和Key。第一次可能重新翻译，后续可命中新缓存。日志增加sentence字段，区分srv3_wordtimed、srv3_estimated和fallback。

128项模拟测试通过；用户已反馈手机试用成功，自动测试未使用实际视频字幕正文。多窗口等不安全输入回退旧处理；本版不保证所有轨道均能重建。

正式版入口：https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/main/plugins/YouTube-translate.plugin 。关闭试用分支插件，更新正式插件与脚本，核对version=1.0.3及sentence字段。
