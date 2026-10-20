'use strict';
// Offline only. Reports structure, not subtitle text, header values, or signed URLs.
const fs = require('node:fs');
const C = require('../src/core.js');
const input = process.argv[2];
if (!input) throw new Error('Usage: node tools/inspect-har.cjs /path/to/capture.har');
const har = JSON.parse(fs.readFileSync(input, 'utf8'));
const entries = har.log && har.log.entries;
if (!Array.isArray(entries)) throw new Error('Invalid HAR: log.entries required');
const found = [];
for (const entry of entries) {
  let url;
  try { url = new URL(entry.request.url); } catch (_) { continue; }
  if (!/(^|\.)(youtube\.com|googlevideo\.com|google\.com|googleapis\.com)$/.test(url.hostname)) continue;
  if (!/timedtext|caption|transcript|\/player$/.test(url.pathname)) continue;
  const response = entry.response || {}, content = response.content || {};
  const record = {host: url.hostname, path: url.pathname, queryNames: Array.from(url.searchParams.keys()), status: response.status, mime: content.mimeType || '', capturedBytes: 0, pluginURLMatch: C.URL_RE.test(url.href)};
  if (typeof content.text === 'string') {
    const body = content.encoding === 'base64' ? Buffer.from(content.text, 'base64').toString('utf8') : content.text;
    record.capturedBytes = Buffer.byteLength(body);
    try { const doc = C.parse(body); record.format = doc.format; record.cues = doc.cues.length; }
    catch (e) { record.parseResult = e.code || 'UNSUPPORTED'; }
  } else record.parseResult = 'BODY_NOT_CAPTURED';
  found.push(record);
}
console.log(JSON.stringify({totalEntries: entries.length, relevantEntries: found.length, entries: found, note: 'No raw URLs, query values, headers, video titles or subtitle text included. Review paths before sharing.'}, null, 2));
