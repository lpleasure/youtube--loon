# 1.0.3 iOS SRV3 sentence synchronization

补充SRV3整句重建，保留SRV3输出。使用s元素的相对时间；缺少逐词时间时，在原段落内按文本长度估算，不代表音频强制对齐。标点、无标点长句仍可能无法理想切分。

整句SRV3采用新缓存标识，保留旧缓存和Key。第一次可能重新翻译，后续可命中新缓存。日志增加sentence字段，区分srv3_wordtimed、srv3_estimated和fallback。

128项模拟测试通过，尚未取得实际视频字幕正文或完成手机验证。多窗口等不安全输入回退旧处理；本版不保证所有轨道均能重建。

关闭原翻译插件，安装试用插件并更新脚本：https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/fix/ios-srv3-sync-v103/plugins/YouTube-translate.plugin 。重新打开视频并触发字幕请求，核对version=1.0.3及sentence字段。未合并main。
