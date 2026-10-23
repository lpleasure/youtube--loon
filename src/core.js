/* Original implementation. No dependencies; shared by Node tests and Loon bundles. */
var YTSubs = (function () {
  "use strict";
  var URL_RE = /^https:\/\/(?:www\.youtube\.com|m\.youtube\.com|youtube\.com|video\.google\.com)\/api\/timedtext(?:\?|$)/;
  function fail(code, detail) { var e = new Error(code); e.code = code; e.detail = detail; throw e; }
  function clean(s) { return s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim(); }
  function escapeXML(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
  function decode(s) {
    if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/.test(s)) fail("XML_ENTITY");
    return s.replace(/&(#x[\da-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, function (_, k) {
      var named = {amp: "&", lt: "<", gt: ">", quot: '"', apos: "'"};
      if (k[0] !== "#") return named[k];
      var n = k[1].toLowerCase() === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      if (!Number.isFinite(n) || n < 1 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) fail("XML_ENTITY");
      return String.fromCodePoint(n);
    });
  }
  function query(url, name) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(url || "");
    try { return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : ""; } catch (_) { return ""; }
  }
  function statusOK(response) { return Number(response && response.status) === 200; }
  function bilingual(source, translated) { return clean(translated) + "\n" + source; }
  function centerAnchor(value) {
    var n = value === undefined || value === null ? 7 : Number(value);
    return Number.isInteger(n) && n >= 0 && n <= 8 ? Math.floor(n / 3) * 3 + 1 : 7;
  }
  function centerJSON(doc) {
    var positions = Array.isArray(doc.wpWinPositions) && doc.wpWinPositions.length ? doc.wpWinPositions : [{}];
    var styles = Array.isArray(doc.wsWinStyles) && doc.wsWinStyles.length ? doc.wsWinStyles : [{}];
    doc.wpWinPositions = positions.map(function (p) {
      p = Object.assign({}, p);
      p.apPoint = centerAnchor(p.apPoint); p.ahHorPos = 50;
      if (!Number.isFinite(p.avVerPos)) p.avVerPos = 95;
      return p;
    });
    doc.wsWinStyles = styles.map(function (s) { return Object.assign({}, s, {juJustifCode: 2}); });
    var windows = Object.create(null);
    doc.events.forEach(function (e) { if (e.id !== undefined) windows[e.id] = e; });
    doc.events.forEach(function (e) {
      if (e.id === undefined && !e.segs) return;
      var parent = windows[e.wWinId] || {};
      if (!Number.isInteger(e.wpWinPosId) || !doc.wpWinPositions[e.wpWinPosId]) e.wpWinPosId = Number.isInteger(parent.wpWinPosId) && doc.wpWinPositions[parent.wpWinPosId] ? parent.wpWinPosId : 0;
      if (!Number.isInteger(e.wsWinStyleId) || !doc.wsWinStyles[e.wsWinStyleId]) e.wsWinStyleId = Number.isInteger(parent.wsWinStyleId) && doc.wsWinStyles[parent.wsWinStyleId] ? parent.wsWinStyleId : 0;
    });
  }
  function attr(tag, key) {
    var m = new RegExp("\\s" + key + "\\s*=\\s*([\"'])(.*?)\\1").exec(tag);
    return m ? m[2] : undefined;
  }
  function setAttr(tag, key, value) {
    var re = new RegExp("\\s+" + key + "\\s*=\\s*(?:\"[^\"]*\"|'[^']*')", "g");
    return tag.replace(re, "").replace(/\s*(\/?>)$/, ' ' + key + '="' + value + '"$1');
  }
  function centerXML(body) {
    var ids = {wp: Object.create(null), ws: Object.create(null)};
    body = body.replace(/<(wp|ws)\b[^>]*>/g, function (tag, type) {
      var id = attr(tag, "id"); if (id !== undefined) ids[type][id] = true;
      if (type === "ws") return setAttr(tag, "ju", 2);
      return setAttr(setAttr(tag, "ap", centerAnchor(attr(tag, "ap"))), "ah", 50);
    });
    function spare(type) { var id = 0; while (ids[type][id]) id++; return String(id); }
    var wp = spare("wp"), ws = spare("ws");
    var defaults = '<wp id="' + wp + '" ap="7" ah="50" av="95"/><ws id="' + ws + '" ju="2"/>';
    if (/<\/head\s*>/.test(body)) body = body.replace(/<\/head\s*>/, defaults + "</head>");
    else if (/<head\b[^>]*\/>/.test(body)) body = body.replace(/<head\b[^>]*\/>/, "<head>" + defaults + "</head>");
    else body = body.replace(/<body\b/, "<head>" + defaults + "</head><body");
    return body.replace(/<p\b[^>]*>/g, function (tag) {
      if (!ids.wp[attr(tag, "wp")]) tag = setAttr(tag, "wp", wp);
      if (!ids.ws[attr(tag, "ws")]) tag = setAttr(tag, "ws", ws);
      return tag;
    });
  }
  function parse(body) {
    if (typeof body !== "string" || !body.trim()) fail("EMPTY_OR_BINARY");
    if (body.length > 4000000) fail("BODY_LIMIT");
    var s = body.replace(/^\uFEFF/, "").trim();
    if (s[0] === "{") return json3(body);
    if (/^WEBVTT(?:\s|$)/.test(s)) return vtt(body);
    if (/^(?:<\?xml[^?]*\?>\s*)?<(?:timedtext|transcript)\b/.test(s)) return xml(body);
    fail("UNSUPPORTED_FORMAT");
  }
  // Sentence reconstruction is restricted to word-timed JSON3 tracks.
  // No estimated character timings: unsupported timing remains unchanged.
  function sentenceParse(body) {
    var original = parse(body);
    if (original.format !== "json3") return original;
    var source = JSON.parse(body.replace(/^\uFEFF/, "")), events = source.events.filter(function (e) { return e.segs && e.segs.some(function (s) { return s.utf8.trim(); }); });
    var timed = 0, windowID;
    if (!events.length || events.some(function (e, i) {
      if (!i) windowID = e.wWinId;
      if (e.wWinId !== windowID) return true;
      var last = -1;
      return e.segs.some(function (s, j) {
        var offset = s.tOffsetMs === undefined && j === 0 ? 0 : s.tOffsetMs;
        if (!Number.isFinite(offset) || offset < last || offset < 0 || offset >= e.dDurationMs) return true;
        last = offset; if (j) timed++; return false;
      });
    }) || timed < 3) return original;
    var tokens = [];
    events.forEach(function (e) { e.segs.forEach(function (s) {
      if (s.utf8.trim()) tokens.push({text: s.utf8, start: e.tStartMs + (s.tOffsetMs || 0), end: e.tStartMs + e.dDurationMs});
    }); });
    // Repeated/overlapping word timestamps need a track-specific deduplicator.
    if (tokens.some(function (t, i) { return i && t.start <= tokens[i - 1].start; })) return original;
    var rebuilt = [], current = null;
    function flush(end) {
      if (!current) return;
      rebuilt.push({tStartMs: current.start, dDurationMs: Math.max(1, end - current.start), segs: [{utf8: current.text.trim()}]}); current = null;
    }
    tokens.forEach(function (t, i) {
      var previous = tokens[i - 1];
      if (current && (t.start - current.start >= 12000 || current.text.length + t.text.length > 240 || previous.end + 1500 < t.start)) flush(Math.min(previous.end, t.start));
      if (!current) current = {start: t.start, text: ""};
      current.text += (current.text && !/\s$/.test(current.text) && !/^\s|^[,.;:!?]/.test(t.text) ? " " : "") + t.text;
      var next = tokens[i + 1];
      if (/[.!?]["'’”)]*\s*$/.test(t.text) || !next) flush(next ? Math.min(t.end, next.start) : t.end);
    });
    var normalized = {events: rebuilt};
    var result = parse(JSON.stringify(normalized));
    // With no translations, keep the exact upstream response.
    var render = result.render;
    result.render = function (translations) { return Object.keys(translations).length ? render(translations) : body; };
    return result;
  }
  function json3(body) {
    var doc;
    try { doc = JSON.parse(body.replace(/^\uFEFF/, "")); } catch (_) { fail("INVALID_JSON"); }
    if (!Array.isArray(doc.events)) fail("NOT_JSON3");
    var cues = [];
    doc.events.forEach(function (e, index) {
      if (!e || typeof e !== "object") fail("INVALID_EVENT");
      if (e.aAppend) fail("ROLLING_UNSUPPORTED");
      if (e.segs === undefined) return;
      if (!Array.isArray(e.segs)) fail("INVALID_SEGS");
      if (e.segs.some(function (seg) { return !seg || typeof seg.utf8 !== "string"; })) fail("INVALID_SEGS");
      var text = clean(e.segs.map(function (seg) { return seg.utf8; }).join(""));
      if (!text) return;
      if (!Number.isFinite(e.tStartMs) || e.tStartMs < 0 || !Number.isFinite(e.dDurationMs) || e.dDurationMs <= 0) fail("INVALID_TIMING");
      cues.push({id: cues.length, index: index, text: text, startSeconds: e.tStartMs / 1000});
    });
    return {format: "json3", cues: cues, render: function (translations) {
      if (!Object.keys(translations).length) return body;
      var clone = JSON.parse(body.replace(/^\uFEFF/, ""));
      cues.forEach(function (c) {
        if (translations[c.id]) clone.events[c.index].segs = [{utf8: bilingual(c.text, translations[c.id])}];
      });
      // Whole bilingual cues replace word-timed segments. Adjacent cues in the
      // same window must not remain active together after replacement.
      var windows = Object.create(null);
      cues.forEach(function (c) {
        var e = clone.events[c.index], key = String(e.wWinId === undefined ? "default" : e.wWinId);
        (windows[key] || (windows[key] = [])).push(c);
      });
      Object.keys(windows).forEach(function (key) {
        var ordered = windows[key].slice().sort(function (a, b) { return a.startSeconds - b.startSeconds || a.id - b.id; });
        for (var i = 0; i + 1 < ordered.length; i++) {
          var current = ordered[i], next = ordered[i + 1];
          var event = clone.events[current.index], nextEvent = clone.events[next.index];
          var gap = nextEvent.tStartMs - event.tStartMs;
          if (gap > 0 && (translations[current.id] || translations[next.id]) && event.dDurationMs > gap) event.dDurationMs = gap;
        }
      });
      centerJSON(clone);
      return JSON.stringify(clone);
    }};
  }
  // Deliberately small XML subset. Preserve text/timing; normalize SRV3 horizontal layout.
  // Full XML/TTML, CDATA, DTDs, roll-up and arbitrary inline markup are unsupported.
  function xml(body) {
    if (/<!|<\?(?!xml\s)/i.test(body)) fail("XML_UNSUPPORTED");
    var envelope = body.replace(/^\uFEFF/, "").replace(/^\s*<\?xml[^?]*\?>/, ""), tags = [], roots = 0, cursor = 0;
    var token = /<[^>]*>/g, part;
    while ((part = token.exec(envelope))) {
      var between = envelope.slice(cursor, part.index);
      if (between.indexOf("<") !== -1 || (!tags.length && between.trim())) fail("INVALID_XML");
      decode(between);
      var close = /^<\/([A-Za-z][\w.-]*)\s*>$/.exec(part[0]);
      if (close) { if (tags.pop() !== close[1]) fail("INVALID_XML"); }
      else {
        var open = /^<([A-Za-z][\w.-]*)((?:\s+[A-Za-z][\w.:-]*\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))*)\s*(\/?)>$/.exec(part[0]);
        if (!open) fail("INVALID_XML");
        if (!tags.length) roots++;
        if (!open[3]) tags.push(open[1]);
      }
      cursor = token.lastIndex;
    }
    if (tags.length || roots !== 1 || envelope.slice(cursor).trim()) fail("INVALID_XML");
    var isSrv = /<timedtext\b[^>]*\bformat=["']3["']/.test(body);
    var legacy = /<transcript(?:\s[^<>]*)?>/.test(body);
    if (!isSrv && !legacy) fail("XML_FORMAT_UNSUPPORTED");
    if (isSrv && /<p\b[^>]*\ba=["']1["']/.test(body)) fail("ROLLING_UNSUPPORTED");
    var tag = isSrv ? "p" : "text", cues = [], matches = [], match;
    var re = new RegExp("<" + tag + "(\\s[^<>]*|)>([\\s\\S]*?)<\\/" + tag + "\\s*>", "g");
    while ((match = re.exec(body))) {
      var attrs = match[1], inner = match[2];
      var start = new RegExp("\\b" + (isSrv ? "t" : "start") + "=[\"'](\\d+(?:\\.\\d+)?)[\"']").exec(attrs);
      var duration = new RegExp("\\b" + (isSrv ? "d" : "dur") + "=[\"'](\\d+(?:\\.\\d+)?)[\"']").exec(attrs);
      if (!start || !duration || Number(duration[1]) <= 0) fail("INVALID_TIMING");
      // Validate balanced s/br tags without pretending to be a general XML parser.
      var stack = 0;
      inner.replace(/<[^>]*>/g, function (t) {
        if (/^<s(?:\s[^<>]*)?>$/.test(t)) { if (stack) fail("XML_INLINE_UNSUPPORTED"); stack++; }
        else if (/^<\/s\s*>$/.test(t)) { if (--stack !== 0) fail("INVALID_XML"); }
        else if (!/^<br\s*\/>$/.test(t)) fail("XML_INLINE_UNSUPPORTED");
        return t;
      });
      if (stack) fail("INVALID_XML");
      var text = clean(decode(inner.replace(/<br\s*\/>/g, "\n").replace(/<\/?s\b[^>]*>/g, "")));
      var openLength = match[0].indexOf(">") + 1;
      if (text) cues.push({id: cues.length, text: text, startSeconds: Number(start[1]) / (isSrv ? 1000 : 1), begin: match.index + openLength, end: match.index + openLength + inner.length});
      matches.push(match[0]);
    }
    // Reject unmatched cue tags and malformed root/body envelopes.
    var opens = body.match(new RegExp("<" + tag + "(?:\\s|>)", "g")) || [];
    if (opens.length !== matches.length || !(isSrv ? /<body\b[^>]*>[\s\S]*<\/body>\s*<\/timedtext>\s*$/ : /<\/transcript>\s*$/).test(body)) fail("INVALID_XML");
    return {format: isSrv ? "srv3" : "srv1", cues: cues, render: function (translations) {
      var output = body;
      cues.slice().reverse().forEach(function (c) {
        if (!translations[c.id]) return;
        var joined = escapeXML(bilingual(c.text, translations[c.id]));
        if (isSrv) joined = "<s>" + joined + "</s>";
        output = output.slice(0, c.begin) + joined + output.slice(c.end);
      });
      return isSrv && Object.keys(translations).length ? centerXML(output) : output;
    }};
  }
  function vtt(body) {
    var newline = body.indexOf("\r\n") !== -1 ? "\r\n" : "\n";
    var blocks = body.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split(/\n\n+/), cues = [];
    blocks.forEach(function (block, index) {
      if (!index || /^(NOTE|STYLE|REGION)(?:\s|$)/.test(block) || !block.trim()) return;
      var lines = block.split("\n"), at = lines.findIndex(function (l) { return l.indexOf(" --> ") !== -1; });
      if (at < 0 || at > 1) fail("INVALID_VTT");
      var m = /^((?:\d{2,}:)?\d{2}:\d{2}\.\d{3}) --> ((?:\d{2,}:)?\d{2}:\d{2}\.\d{3})(?:\s.*)?$/.exec(lines[at]);
      if (!m) fail("INVALID_TIMING");
      function seconds(time) { var p = time.split(":").map(Number); if (p[p.length - 1] >= 60 || p[p.length - 2] >= 60) fail("INVALID_TIMING"); return p.reduce(function (a, n) { return a * 60 + n; }, 0); }
      if (seconds(m[2]) <= seconds(m[1])) fail("INVALID_TIMING");
      var raw = lines.slice(at + 1).join("\n");
      var text = clean(decode(raw.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ")));
      if (text) cues.push({id: cues.length, index: index, text: text, startSeconds: seconds(m[1]), timingLine: at});
    });
    return {format: "vtt", cues: cues, render: function (translations) {
      var copy = blocks.slice();
      if (!Object.keys(translations).length) return body;
      cues.forEach(function (c) {
        if (!translations[c.id]) return;
        var lines = copy[c.index].replace(/\n+$/, "").split("\n");
        lines[c.timingLine] = lines[c.timingLine].replace(/\s+(?:align|position|size|region):[^\s]+/g, "") + " align:center position:50%,center size:100%";
        lines.splice(c.timingLine + 1, 0, escapeXML(clean(translations[c.id]).replace(/\s+/g, " ")));
        copy[c.index] = lines.join("\n");
      });
      return copy.join("\n\n").replace(/\n/g, newline);
    }};
  }
  function headers(original) {
    var out = {};
    Object.keys(original || {}).forEach(function (k) {
      if (!/^(content-length|content-encoding|transfer-encoding|etag|content-md5|digest|cache-control|expires|last-modified)$/i.test(k)) out[k] = original[k];
    });
    out["Cache-Control"] = "no-store";
    return out;
  }
  function args(raw) {
    if (raw && typeof raw === "object") return raw;
    var out = {};
    String(raw || "").split("&").forEach(function (pair) {
      var i = pair.indexOf("=");
      if (i > 0) { try { out[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1)); } catch (_) {} }
    });
    return out;
  }
  function validateReply(data, batch) {
    if (typeof data !== "string" || data.length > 100000) fail("API_BODY_LIMIT");
    var outer, result;
    try { outer = JSON.parse(data); } catch (_) { fail("API_JSON_OUTER"); }
    var choice = outer && Array.isArray(outer.choices) && outer.choices[0];
    if (!choice || !choice.message || typeof choice.message.content !== "string") fail("API_SCHEMA", "ENVELOPE");
    if (choice.finish_reason !== "stop") {
      // Only fixed codes leave the validator; never log provider-controlled values.
      if (choice.finish_reason === "length") fail("API_FINISH_LENGTH");
      if (choice.finish_reason === "content_filter") fail("API_FINISH_FILTER");
      fail("API_FINISH_OTHER");
    }
    try { result = JSON.parse(choice.message.content); } catch (_) { fail("API_JSON_INNER", choice.message.content.trim() ? "INVALID_JSON" : "EMPTY_CONTENT"); }
    var expected = Object.create(null), found = Object.create(null);
    batch.forEach(function (c) { expected[c.id] = true; });
    if (!result || !Array.isArray(result.translations) || result.translations.length !== batch.length) fail("API_SCHEMA", "COUNT_OR_SHAPE");
    result.translations.forEach(function (item) {
      if (!item || !Number.isInteger(item.id) || !expected[item.id] || found[item.id] || typeof item.text !== "string" || !clean(item.text) || item.text.length > 1600) fail("API_SCHEMA", "ID_OR_TEXT");
      found[item.id] = clean(item.text).replace(/\s+/g, " ");
    });
    return found;
  }
  function utf8size(s) { return encodeURIComponent(s).replace(/%[A-F\d]{2}/gi, "x").length; }
  return {URL_RE: URL_RE, parse: parse, sentenceParse: sentenceParse, query: query, statusOK: statusOK, headers: headers, args: args, validateReply: validateReply, utf8size: utf8size};
})();
if (typeof module !== "undefined" && module.exports) module.exports = YTSubs;
