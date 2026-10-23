# 1.0.2 sentence synchronization

JSON3字幕具备单调逐词时间且只有一个字幕窗口时，按标点重组句子，再翻译。中文与整句英文写入同一条字幕，共用开始与结束时间。最长12秒或240字符附近分段，防止无标点长句无限合并。

124项模拟测试通过。样例根据用户截图台词构造，并非实际下载的视频轨道。视频xNzYtLNEZjg在1:35附近的原始字幕尚未取得，未验证该设备效果。

缺少逐词时间、多窗口、重复时间、滚动追加、XML/VTT不会进行这项整句重建；缩写或缺少标点可能无法得到理想分句。iOS播放器字号、换行、背景外观仍由播放器决定。

保留本地Key及缓存。新整句使用完整原文作为缓存键，因此旧碎片缓存可能无法命中并会重新翻译。无需清空全部缓存。

试用：https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/fix/sentence-sync-v102/plugins/YouTube-translate.plugin 。关闭其他翻译插件，更新脚本，重新打开视频。尚未合并main。
