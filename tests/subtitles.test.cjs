'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../src/core.js');
const root = path.resolve(__dirname, '..');
const fixture = format => fs.readFileSync(path.join(__dirname, 'fixtures', `manual.${format}`), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const requestURL = 'https://www.youtube.com/api/timedtext?v=synthetic&lang=en&signature=PRIVATE_SENTINEL';
function harness(mode = 'translate', options = {}) {
  const store = Object.assign({'ytloon.deepseek.key': 'TEST_ONLY_NOT_A_REAL_CREDENTIAL'}, options.store);
  const results = [], calls = [], logs = [], timers = new Map(); let serial = 0;
  const ctx = {
    $request: {url: options.url || requestURL},
    $response: {status: options.status || 200, headers: {'Content-Type': 'application/json', 'Content-Length': '9', 'Content-Encoding': 'gzip', ETag: 'stale'}, body: options.body === undefined ? fixture('json3') : options.body},
    $argument: options.args === undefined ? {enabled: true} : options.args,
    $done: r => results.push(plain(r)),
    $persistentStore: {read: k => store[k], write: (v, k) => { if (options.storageFails) return false; if (v == null) delete store[k]; else store[k] = v; return true; }},
    $httpClient: {post: (opt, cb) => { calls.push({options: plain(opt), cb}); if (options.throwHTTP) throw new Error('network PRIVATE_SENTINEL'); }},
    console: {log: message => logs.push(message)},
    setTimeout: fn => { timers.set(++serial, fn); return serial; }, clearTimeout: id => timers.delete(id)
  };
  if (options.noClearTimeout) delete ctx.clearTimeout;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'dist', `yt-${mode}.js`), 'utf8'), ctx, {timeout: 1000});
  return {store, results, calls, logs, timers, respond(index = 0, customize) {
    const call = calls[index], input = JSON.parse(JSON.parse(call.options.body).messages[1].content).subtitles;
    let outer = {choices: [{finish_reason: 'stop', message: {content: JSON.stringify({translations: input.map(c => ({id: c.id, text: '译文 ' + c.id}))})}}]};
    if (customize) outer = customize(outer, input);
    call.cb(null, {status: 200}, typeof outer === 'string' ? outer : JSON.stringify(outer));
  }, deadline() { Array.from(timers.values()).forEach(fn => fn()); }};
}

for (const format of ['json3', 'srv3', 'srv1', 'vtt']) {
  test(`${format}: merges original and translation into same cue`, () => {
    const d = C.parse(fixture(format));
    assert.equal(d.format, format); assert.equal(d.cues.length, 2);
    assert.equal(d.cues[0].text, 'Hello world & friends.');
    const output = d.render({0: '你好 <世界> & 朋友', 1: '欢迎'}), parsed = C.parse(output);
    assert.equal(parsed.cues[0].text, '你好 <世界> & 朋友\nHello world & friends.');
    assert.equal(parsed.cues[1].text, '欢迎\nWelcome!');
  });
  test(`${format}: probe injects first cues without any network`, () => {
    const h = harness('probe', {body: fixture(format)});
    assert.equal(h.calls.length, 0); assert.equal(h.results.length, 1);
    assert.ok(h.results[0].body.includes(C.MARKER));
    assert.equal(h.results[0].headers['Content-Length'], undefined);
  });
}
test('JSON3 retains event timings, window definitions and unrelated properties', () => {
  const original = JSON.parse(fixture('json3'));
  const output = JSON.parse(C.parse(fixture('json3')).render({0: '你好'}));
  assert.deepEqual(output.events[0], original.events[0]);
  assert.deepEqual(output.events[2].segs, original.events[2].segs);
  assert.equal(output.events[2].tStartMs, original.events[2].tStartMs);
  assert.equal(output.events[2].dDurationMs, original.events[2].dDurationMs);
  assert.equal(output.wpWinPositions[0].ahHorPos, 50);
  assert.equal(output.events[1].tStartMs, 1000); assert.equal(output.events[1].dDurationMs, 2500);
  assert.equal(output.events[1].wWinId, 1);
});
test('SRV3 retains pen and timing attributes while updating layout', () => {
  const input = fixture('srv3'), out = C.parse(input).render({0: '测试'});
  assert.equal(input.match(/<pen\b[^>]*>/)[0], out.match(/<pen\b[^>]*>/)[0]);
  assert.ok(out.includes('<p t="1000" d="2500" wp="0"'));
});
test('VTT keeps header, note, cue identifier, settings and CRLF', () => {
  const out = C.parse(fixture('vtt').replace(/\n/g, '\r\n')).render({1: '欢迎'});
  assert.ok(out.includes('Language: en\r\n')); assert.ok(out.includes('NOTE Synthetic'));
  assert.ok(out.includes('1\r\n00:00:01.000 --> 00:00:03.500 align:start position:10%'));
  assert.ok(out.includes('欢迎\r\nWelcome!')); assert.equal(/[^\r]\n/.test(out), false);
});
test('VTT final newline does not create a detached translated block', () => {
  const out = C.parse(fixture('vtt')).render({1: '欢迎'});
  assert.ok(out.includes('欢迎\nWelcome!')); assert.equal(C.parse(out).cues.length, 2);
});
for (const [name, body] of [
  ['invalid JSON', '{oops'], ['HTML error', '<html>error</html>'], ['binary', new Uint8Array([1,2])],
  ['empty body', ''], ['body limit', 'x'.repeat(1000001)], ['protobuf-like', '\u0000\u0001abc'],
  ['rolling JSON', JSON.stringify({events: [{aAppend: 1}]})],
  ['rolling XML', '<timedtext format="3"><body><p a="1" t="0" d="2">a</p></body></timedtext>'],
  ['DTD', '<!DOCTYPE x><transcript></transcript>'],
  ['mismatched XML', '<transcript><text start="0" dur="1">x</text></wrong>'],
  ['unsupported XML inline', '<transcript><text start="0" dur="1"><i>x</i></text></transcript>'],
  ['bad entity', '<transcript><text start="0" dur="1">&fake;</text></transcript>'],
  ['invalid uppercase XML entity', '<transcript><text start="0" dur="1">&AMP;</text></transcript>'],
  ['bad timing', 'WEBVTT\n\n00:00:06.000 --> 00:00:05.000\nx'],
  ['invalid JSON3 timing', JSON.stringify({events: [{tStartMs: -1, dDurationMs: 3, segs: [{utf8: 'x'}]}]})]
]) test(`${name}: original response passes through without API`, () => {
  const h = harness('translate', {body}); assert.deepEqual(h.results, [{}]); assert.equal(h.calls.length, 0);
});
test('probe applied twice passes through unchanged', () => {
  const a = harness('probe'); const b = harness('probe', {body: a.results[0].body}); assert.deepEqual(b.results, [{}]);
});
test('URL allowlist rejects lookalike and unrelated endpoints', () => {
  for (const url of ['https://www.youtube.com.evil.invalid/api/timedtext', 'https://www.youtube.com/api/timedtextother', 'https://youtubei.googleapis.com/youtubei/v1/player', 'http://www.youtube.com/api/timedtext']) {
    assert.equal(C.URL_RE.test(url), false); assert.equal(harness('translate', {url}).calls.length, 0);
  }
  assert.equal(C.URL_RE.test('https://video.google.com/api/timedtext?x=1'), true);
});
test('non-200 responses pass through untouched', () => { assert.deepEqual(harness('translate', {status: 403}).results, [{}]); });
test('translation disabled by default with no local settings', () => { assert.equal(harness('translate', {args: null}).calls.length, 0); });
test('missing local key causes zero requests', () => {
  const h = harness('translate', {store: {'ytloon.deepseek.key': ''}}); assert.equal(h.calls.length, 0); assert.deepEqual(h.results, [{}]);
});
test('valid API result is merged; key and signed URL never appear in logs/cache/payload', () => {
  const h = harness(); assert.equal(h.calls.length, 1);
  const opt = h.calls[0].options, payload = JSON.parse(opt.body);
  assert.equal(opt.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(opt.insecure, false); assert.equal(opt['auto-redirect'], false); assert.equal(opt['auto-cookie'], false);
  assert.equal(payload.response_format.type, 'json_object'); assert.equal(payload.thinking.type, 'disabled');
  assert.equal(payload.stream, false); assert.ok(opt.timeout <= 8000);
  h.respond(); assert.equal(h.results.length, 1); assert.ok(h.results[0].body.includes('译文'));
  assert.ok(h.store['ytloon.cache.v1']);
  for (const text of [h.logs.join(' '), h.store['ytloon.cache.v1'], opt.body]) {
    assert.equal(text.includes('TEST_ONLY_NOT_A_REAL_CREDENTIAL'), false); assert.equal(text.includes('PRIVATE_SENTINEL'), false);
  }
});
test('cached replay requires zero HTTP requests even after key is removed', () => {
  const a = harness(); a.respond();
  const b = harness('translate', {store: Object.assign({}, a.store, {'ytloon.deepseek.key': ''})});
  assert.equal(b.calls.length, 0); assert.ok(b.results[0].body.includes('译文'));
});
test('expired cache, model, target and source changes each miss cache', () => {
  const a = harness(); a.respond();
  const expired = JSON.parse(a.store['ytloon.cache.v1']).map(r => ({...r, expires: 1}));
  assert.equal(harness('translate', {store: {...a.store, 'ytloon.cache.v1': JSON.stringify(expired)}}).calls.length, 1);
  for (const args of [{enabled:true, model:'different-model'}, {enabled:true, target:'ja'}]) assert.equal(harness('translate', {store:a.store, args}).calls.length, 1);
  assert.equal(harness('translate', {store:a.store, url:requestURL.replace('lang=en', 'lang=ja')}).calls.length, 1);
});
test('cache corruption recovers; storage failure still returns valid translated subtitles', () => {
  const h = harness('translate', {store:{'ytloon.cache.v1':'broken'}, storageFails:true}); h.respond();
  assert.ok(h.results[0].body.includes('译文')); assert.ok(h.logs.some(x => x.includes('cache_write_failed')));
});
for (const status of [401,403,429,500,302]) test(`HTTP ${status} falls back and starts cooldown`, () => {
  const h = harness(); h.calls[0].cb(null, {status}, 'PRIVATE_SERVER_BODY');
  assert.deepEqual(h.results, [{}]); assert.ok(Number(h.store['ytloon.cooldown.v1']) > Date.now());
  assert.equal(harness('translate', {store:h.store}).calls.length, 0);
  assert.equal(h.logs.join(' ').includes('PRIVATE_SERVER_BODY'), false);
});
test('network error and synchronous HTTP throw each finish once', () => {
  const h = harness(); h.calls[0].cb('PRIVATE_SENTINEL', null, null); assert.deepEqual(h.results,[{}]);
  const b = harness('translate', {throwHTTP:true}); assert.deepEqual(b.results,[{}]);
  assert.equal(h.logs.join(' ').includes('PRIVATE_SENTINEL'), false);
});
for (const [name, transform] of [
  ['invalid outer JSON', () => 'not json'],
  ['truncated finish reason', x => { x.choices[0].finish_reason = 'length'; return x; }],
  ['empty result', x => { x.choices[0].message.content = ''; return x; }],
  ['missing id', x => { x.choices[0].message.content = '{"translations":[{"id":0,"text":"one"}]}'; return x; }],
  ['duplicate id', x => { x.choices[0].message.content = '{"translations":[{"id":0,"text":"one"},{"id":0,"text":"two"}]}'; return x; }],
  ['unknown id', x => { x.choices[0].message.content = '{"translations":[{"id":0,"text":"one"},{"id":9,"text":"two"}]}'; return x; }]
]) test(`${name}: rejects whole batch, no bad cache`, () => {
  const h = harness(); h.respond(0, transform); assert.deepEqual(h.results,[{}]); assert.equal(h.store['ytloon.cache.v1'],undefined);
});
test('global deadline ignores late and duplicate callbacks; done exactly once', () => {
  const h = harness(); h.deadline(); h.respond(); h.respond(); assert.deepEqual(h.results,[{}]); assert.equal(h.store['ytloon.cache.v1'],undefined);
});
test('identical source cue is translated once then mapped to all IDs', () => {
  const body = JSON.stringify({events:[0,1].map(i=>({tStartMs:i*1000,dDurationMs:900,segs:[{utf8:'same'}]}))});
  const h = harness('translate',{body});
  assert.equal(JSON.parse(JSON.parse(h.calls[0].options.body).messages[1].content).subtitles.length,1);
  h.respond(); assert.equal((h.results[0].body.match(/译文/g)||[]).length,2);
});
test('bounded requests: max two active and four total, remainder stays original', () => {
  const body = JSON.stringify({events:Array.from({length:150},(_,i)=>({tStartMs:i*1000,dDurationMs:900,segs:[{utf8:`cue ${i}`}]}))});
  const h = harness('translate',{body}); assert.equal(h.calls.length,2);
  h.respond(0); assert.equal(h.calls.length,3); h.respond(1); assert.equal(h.calls.length,4);
  h.respond(2); h.respond(3); assert.equal(h.results.length,1); assert.equal(h.calls.length,4);
  const events=JSON.parse(h.results[0].body).events;
  assert.equal(events.filter(e=>e.segs[0].utf8.includes('译文')).length,96);
  assert.equal(events[149].segs[0].utf8,'cue 149');
});
test('partial success survives a second batch failure', () => {
  const body = JSON.stringify({events:Array.from({length:30},(_,i)=>({tStartMs:i*1000,dDurationMs:900,segs:[{utf8:`cue ${i}`}]}))});
  const h = harness('translate',{body}); h.respond(0); h.calls[1].cb(null,{status:429},'');
  assert.ok(h.results[0].body.includes('译文')); assert.equal(JSON.parse(h.results[0].body).events[29].segs[0].utf8,'cue 29');
});
test('header adjustment removes stale metadata and preserves Content-Type', () => {
  assert.deepEqual(C.headers({'content-length':'1','CONTENT-ENCODING':'gzip',ETag:'x','Content-Type':'text/vtt','Cache-Control':'public',Server:'test'}),{'Content-Type':'text/vtt',Server:'test','Cache-Control':'no-store'});
});
test('UTF8 cache size counts Chinese and emoji correctly', () => { assert.equal(C.utf8size('a中😀'),Buffer.byteLength('a中😀')); });
test('distribution probe contains no HTTP client and new/legacy configs are distinct', () => {
  assert.equal(fs.readFileSync(path.join(root,'dist/yt-probe.js'),'utf8').includes('$httpClient'),false);
  const modern=fs.readFileSync(path.join(root,'dist/YouTube-translate.plugin'),'utf8');
  const legacy=fs.readFileSync(path.join(root,'dist/YouTube-translate.legacy.plugin'),'utf8');
  assert.ok(modern.includes('requires_body=true')); assert.ok(modern.includes('${enabled}'));
  assert.ok(legacy.includes('requires-body=true')); assert.ok(legacy.includes('http-response'));
  assert.equal(modern.includes('api_key'),false); assert.equal(legacy.includes('api_key'),false);
  const ruleRegex = new RegExp(modern.match(/~= \/(.*)\/ then/)[1]);
  assert.equal(ruleRegex.test(requestURL),true); assert.equal(ruleRegex.test(requestURL.replace('youtube.com','youtube.com.invalid')),false);
});
test('cache capacity is bounded by both bytes and record count', () => {
  const records = Array.from({length:500},(_,i)=>({k:'old'+i,v:'中'.repeat(800),expires:Date.now()+100000}));
  const h = harness('translate',{store:{'ytloon.cache.v1':JSON.stringify(records)}}); h.respond();
  const saved=h.store['ytloon.cache.v1']; assert.ok(Buffer.byteLength(saved)<=262144); assert.ok(JSON.parse(saved).length<=400);
});
test('cache merges fresh concurrent entries at completion', () => {
  const h=harness(); h.store['ytloon.cache.v1']=JSON.stringify([{k:'parallel',v:'其他',expires:Date.now()+10000}]);
  h.respond(); assert.ok(JSON.parse(h.store['ytloon.cache.v1']).some(r=>r.k==='parallel'));
});
test('API reordered IDs map to correct cues', () => {
  const h=harness(); h.respond(0,(x)=>{const content=JSON.parse(x.choices[0].message.content); content.translations.reverse(); x.choices[0].message.content=JSON.stringify(content); return x;});
  assert.ok(JSON.parse(h.results[0].body).events[1].segs[0].utf8.startsWith('译文 0\n'));
});
test('API translations are escaped for XML and VTT', () => {
  for (const format of ['srv3','srv1','vtt']) {
    const h=harness('translate',{body:fixture(format)});
    h.respond(0,(x,input)=>{x.choices[0].message.content=JSON.stringify({translations:input.map(c=>({id:c.id,text:'<script> & 文'}))});return x;});
    assert.ok(h.results[0].body.includes('&lt;script&gt; &amp; 文')); assert.equal(h.results[0].body.includes('<script>'),false);
  }
});
test('new config overrides local defaults and legacy query string is parsed', () => {
  const h=harness('translate',{args:'enabled=true&target=ja&model=deepseek-flash'});
  assert.ok(JSON.parse(h.calls[0].options.body).messages[0].content.includes('into ja'));
  assert.equal(harness('translate',{args:{enabled:false},store:{'ytloon.settings.v1':'{"enabled":true}'}}).calls.length,0);
});
test('overlong cues stay original without an API request', () => {
  const body=JSON.stringify({events:[{tStartMs:0,dDurationMs:1000,segs:[{utf8:'a'.repeat(801)}]}]});
  const h=harness('translate',{body}); assert.equal(h.calls.length,0); assert.deepEqual(h.results,[{}]);
});
test('JSON3 centers left/right windows and preserves vertical placement, rows and styles', () => {
  const input=JSON.parse(fixture('json3'));
  input.wpWinPositions=[{apPoint:6,ahHorPos:20,avVerPos:90,rcRows:3},{apPoint:2,ahHorPos:80,avVerPos:8}];
  input.wsWinStyles=[{juJustifCode:0,mhModeHint:1},{juJustifCode:1,sdScrollDir:3}];
  input.events[1].wpWinPosId=1; input.events[1].wsWinStyleId=1;
  const out=JSON.parse(C.parse(JSON.stringify(input)).render({0:'中文'}));
  assert.deepEqual(out.wpWinPositions,[{apPoint:7,ahHorPos:50,avVerPos:90,rcRows:3},{apPoint:1,ahHorPos:50,avVerPos:8}]);
  assert.equal(out.wsWinStyles[0].juJustifCode,2); assert.equal(out.wsWinStyles[1].juJustifCode,2);
  assert.equal(out.wsWinStyles[0].mhModeHint,1); assert.equal(out.wsWinStyles[1].sdScrollDir,3);
  assert.equal(out.events[1].wpWinPosId,1); assert.equal(out.events[1].wsWinStyleId,1);
  assert.equal(out.events[1].segs[0].utf8,'中文\nHello world & friends.');
});
test('JSON3 missing layout arrays receive referenced centered defaults', () => {
  const input={events:[{tStartMs:10,dDurationMs:2000,segs:[{utf8:'Original'}]}]};
  const out=JSON.parse(C.parse(JSON.stringify(input)).render({0:'中文'}));
  const e=out.events[0], p=out.wpWinPositions[e.wpWinPosId], s=out.wsWinStyles[e.wsWinStyleId];
  assert.equal(p.apPoint,7); assert.equal(p.ahHorPos,50); assert.equal(s.juJustifCode,2);
  assert.equal(e.tStartMs,10); assert.equal(e.dDurationMs,2000);
});
test('JSON3 cues inherit the correct parent window instead of moving to default window', () => {
  const input={wpWinPositions:[{apPoint:6,avVerPos:95},{apPoint:2,avVerPos:5}],wsWinStyles:[{},{juJustifCode:1}],events:[
    {id:8,tStartMs:0,wpWinPosId:1,wsWinStyleId:1},
    {wWinId:8,tStartMs:100,dDurationMs:1000,segs:[{utf8:'Original'}]}
  ]};
  const out=JSON.parse(C.parse(JSON.stringify(input)).render({0:'中文'}));
  assert.equal(out.events[1].wpWinPosId,1); assert.equal(out.events[1].wsWinStyleId,1);
  assert.equal(out.wpWinPositions[1].avVerPos,5); assert.equal(out.wpWinPositions[1].apPoint,1);
});
test('SRV3 centers existing layouts and supplies referenced defaults without ID collisions', () => {
  const body='<timedtext format="3"><head><wp id="0" ap="6" ah="20" av="90"/><ws id="0" ju="0" pd="0"/></head><body><p t="100" d="2000" wp="0" ws="0">Original</p><p t="3000" d="1000">Other</p></body></timedtext>';
  const out=C.parse(body).render({0:'中文'});
  assert.equal(C.parse(out).cues[0].text,'中文\nOriginal');
  const existingPos=out.match(/<wp id="0"[^>]*>/)[0], existingStyle=out.match(/<ws id="0"[^>]*>/)[0];
  assert.ok(existingPos.includes('ap="7"')); assert.ok(existingPos.includes('ah="50"')); assert.ok(existingPos.includes('av="90"'));
  assert.ok(existingStyle.includes('ju="2"')); assert.ok(existingStyle.includes('pd="0"'));
  assert.ok(out.includes('<p t="3000" d="1000" wp="1" ws="1">Other</p>'));
  assert.equal((out.match(/<wp id="0"/g)||[]).length,1);
});
test('SRV3 absent or self-closing head is expanded into a valid centered document', () => {
  for (const head of ['','<head/>','<head></head>']) {
    const out=C.parse('<timedtext format="3">'+head+'<body><p t="0" d="1000">Original</p></body></timedtext>').render({0:'中文'});
    assert.equal(C.parse(out).cues.length,1); assert.ok(out.includes('ju="2"')); assert.ok(out.includes('ah="50"'));
    assert.equal((out.match(/<head>/g)||[]).length,1);
  }
});
test('VTT translated cue centers and removes conflicting region while preserving timestamps and markup', () => {
  const input='WEBVTT\n\nlabel\n00:00:01.000 --> 00:00:02.000 align:start position:10% size:30% region:left line:90%\n<c.yellow>Original</c>\n';
  const out=C.parse(input).render({0:'中文'});
  assert.ok(out.includes('label\n00:00:01.000 --> 00:00:02.000 line:90% align:center position:50%,center size:100%'));
  assert.ok(out.includes('\n中文\n<c.yellow>Original</c>'));
  assert.equal(out.includes('region:left'),false); assert.equal(out.includes('align:start'),false);
});
test('empty translation map keeps every original format byte-for-byte', () => {
  for (const f of ['json3','srv3','srv1','vtt']) assert.equal(C.parse(fixture(f)).render({}),fixture(f));
});
test('Loon runtime without clearTimeout still returns once and ignores its late timer', () => {
  const h=harness('translate',{noClearTimeout:true}); h.respond(); h.deadline();
  assert.equal(h.results.length,1); assert.ok(h.results[0].body.includes('译文'));
});
