(function () {
  "use strict";
  try {
    if (!YTSubs.URL_RE.test($request.url) || !YTSubs.statusOK($response)) return $done({});
    var doc = YTSubs.parse($response.body), added = {};
    doc.cues.slice(0, 5).forEach(function (cue) { added[cue.id] = YTSubs.MARKER; });
    console.log("[YTSubs probe] format=" + doc.format + " cues=" + doc.cues.length + " marked=" + Object.keys(added).length);
    if (!Object.keys(added).length) return $done({});
    $done({body: doc.render(added), headers: YTSubs.headers($response.headers)});
  } catch (e) {
    console.log("[YTSubs probe] passthrough=" + (e.code || "PARSE_ERROR"));
    $done({});
  }
})();
