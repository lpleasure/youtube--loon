// Manually run in Loon. Only this project's cache/cooldown are removed.
(function () {
  const a = $persistentStore.write(undefined, "ytloon.cache.v1");
  const b = $persistentStore.write(undefined, "ytloon.cooldown.v1");
  console.log(a && b ? "[YTSubs] 缓存与冷却记录已清除；Key 保留。" : "[YTSubs] 清理可能未完成。");
  $done({});
})();
