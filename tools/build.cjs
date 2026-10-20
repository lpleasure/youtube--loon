'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.mkdirSync(out, {recursive: true});
const core = fs.readFileSync(path.join(root, 'src/core.js'), 'utf8');
for (const mode of ['probe', 'translate']) {
  const runtime = fs.readFileSync(path.join(root, `src/${mode}.js`), 'utf8');
  fs.writeFileSync(path.join(out, `yt-${mode}.js`), `/* YT Loon 0.1.1 EXPERIMENTAL. Generated: edit src/, run npm run build. */\n${core}\n${runtime}`);
}
const regex = '^https:\\/\\/(?:www\\.youtube\\.com|m\\.youtube\\.com|youtube\\.com|video\\.google\\.com)\\/api\\/timedtext(?:\\?|$)';
for (const mode of ['probe', 'translate']) {
  const title = mode === 'probe' ? 'YouTube 字幕注入验证（无 API）' : 'YouTube DeepSeek 双语字幕（实验版）';
  const common = `#!name = ${title}\n#!desc = 0.1.1；中文在上与居中待真机确认；与其他字幕重写插件互斥；密钥只存本地\n#!system = iOS,iPadOS\n#!date = 2026-10-20\n`;
  const args = mode === 'translate' ? '[Argument]\nenabled = switch,false,type=boolean,tag=允许翻译,desc=先完成无 API 注入测试再开启\ntarget = input,"zh-Hans",type=string,tag=目标语言\nmodel = input,"deepseek-flash",type=string,tag=DeepSeek 模型\n' : '';
  const params = mode === 'translate' ? ', {${enabled}, ${target}, ${model}}' : '';
  const mitm = '\n[Mitm]\nhostname = www.youtube.com, m.youtube.com, youtube.com, video.google.com\n';
  fs.writeFileSync(path.join(out, `YouTube-${mode}.plugin`), common + '#!loon_version = 3.5.1(983)\n' + args + `[Script]\nresponse if \${url} ~= /${regex}/ then script("yt-${mode}.js"${params}) with requires_body=true, binary_body_mode=false, timeout=${mode === 'probe' ? 5 : 25}, tag="YTSubs ${mode}"\n` + mitm);
  fs.writeFileSync(path.join(out, `YouTube-${mode}.legacy.plugin`), common + '# 旧版 Script 语法；翻译设置由手机本地 setup 脚本写入。\n[Script]\n' + `http-response ${regex} script-path=yt-${mode}.js,requires-body=true,binary-body-mode=false,timeout=${mode === 'probe' ? 5 : 25},tag=YTSubs ${mode}\n` + mitm);
}
console.log('Built 2 standalone scripts and 4 local-file plugin configurations.');
if (fs.existsSync(path.join(root, 'subscription.json'))) require('./subscription.cjs');
