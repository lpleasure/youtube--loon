// Explicit manual action: deletes only this project's four keys.
(function () {
  let ok = true;
  ["ytloon.cache.v1", "ytloon.cooldown.v1", "ytloon.settings.v1", "ytloon.deepseek.key"].forEach(function (key) {
    if (!$persistentStore.write(undefined, key)) ok = false;
  });
  console.log(ok ? "[YTSubs] 本插件本地数据已删除。" : "[YTSubs] 清理可能未完成。");
  $done({});
})();
