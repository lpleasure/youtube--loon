'use strict';
// Only rewrites public asset URLs. Never reads local settings or credentials.
const fs = require('node:fs');
const path = require('node:path');
const base = process.argv[2];
if (!base || !/^https:\/\/[^\s"'?#]+$/.test(base)) throw new Error('Usage: node tools/prepare-hosted.cjs https://raw.githubusercontent.com/OWNER/REPO/COMMIT/dist');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'release');
fs.mkdirSync(out, {recursive: true});
for (const name of fs.readdirSync(path.join(root, 'dist'))) {
  let body = fs.readFileSync(path.join(root, 'dist', name), 'utf8');
  if (name.endsWith('.plugin')) body = body.replace(/yt-(probe|translate)\.js/g, `${base.replace(/\/$/, '')}/yt-$1.js`);
  fs.writeFileSync(path.join(out, name), body);
}
console.log('Created release/ with explicit HTTPS script URLs. Nothing uploaded.');
