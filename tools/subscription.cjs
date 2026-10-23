'use strict';
// Public repository coordinates only. Never read a key or local Loon storage.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'subscription.json'), 'utf8'));
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.repository) ||
    !/^[A-Za-z0-9_-][A-Za-z0-9_./-]*$/.test(config.ref) || config.ref.includes('..')) {
  throw new Error('Invalid public repository/ref in subscription.json');
}
const base = `https://raw.githubusercontent.com/${config.repository}/${config.ref}/dist`;
const out = path.join(root, 'plugins');
fs.mkdirSync(out, {recursive:true});
for (const mode of ['translate','prewarm']) {
  for (const legacy of ['']) {
    if (mode === 'prewarm' && legacy) continue;
    const name = `YouTube-${mode}${legacy}.plugin`;
    const input = fs.readFileSync(path.join(root,'dist',name),'utf8');
    const body = input.replace(/yt-(probe|translate|prewarm)\.js/g, `${base}/yt-$1.js`);
    fs.writeFileSync(path.join(out,name),body);
  }
}
console.log('Prepared remote response/probe/prewarm subscription configurations in plugins/.');
