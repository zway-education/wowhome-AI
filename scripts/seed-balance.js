// 統計合理化：瀏覽/遊玩一定要比讚多。由 GitHub Actions 執行（容器連不到計數服務）。
// 對每個作品：讀取目前 -love/-like/-v/-p，若瀏覽 < 總讚×3 就補到 總讚×(3~5)+隨機零頭；
// 遊玩補到 瀏覽×(0.6~0.8)，且介於 總讚 與 瀏覽 之間。亂數用批次+作品名做種子，可重跑不重複灌。
// 防重複：seed-done-<batch> 標記。
const fs = require('fs');
const path = require('path');
const { thumbSlug } = require('./slug');

const ROOT = path.resolve(__dirname, '..');
const NS = 'ai-future-camp';
const BASE = 'https://abacus.jasoncameron.dev/';

function keyFor(rel) {
  const slug = thumbSlug(path.basename(rel)).replace(/\.jpg$/i, '');
  return rel.startsWith('pro/') ? 'pro-' + slug : slug;
}
// 決定性偽亂數（同批次同作品固定，避免重跑加倍）
function prng(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return function () { h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

async function get(name) {
  try {
    const r = await fetch(BASE + 'get/' + NS + '/' + name, { signal: AbortSignal.timeout(8000) });
    if (r.status === 404) return 0;
    if (r.ok) { const j = await r.json(); return j.value ?? j.count ?? 0; }
  } catch (e) {}
  return null;
}
async function hit(name) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(BASE + 'hit/' + NS + '/' + name, { signal: AbortSignal.timeout(8000) });
      if (r.ok) return true;
    } catch (e) {}
    await new Promise(res => setTimeout(res, 800));
  }
  return false;
}
async function topUp(name, n) {
  let ok = 0;
  for (let i = 0; i < n; i++) {
    if (await hit(name)) ok++;
    await new Promise(res => setTimeout(res, 150));
  }
  return ok;
}

async function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-balance.json'), 'utf8'));
  const batch = cfg._batch.replace(/[^a-zA-Z0-9-]/g, '-');
  const doneKey = 'seed-done-' + batch;
  const done = await get(doneKey);
  if (done && done > 0) { console.log('批次 ' + batch + ' 已執行過，跳過'); return; }

  const works = [];
  for (const cat of ['games', 'videos', 'pro/games', 'pro/videos']) {
    const dir = path.join(ROOT, cat);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => /\.html?$/i.test(f))) works.push(cat + '/' + f);
  }

  let added = 0;
  for (const rel of works) {
    const key = keyFor(rel);
    const rnd = prng(batch + '|' + key);
    const [love, like, v, p] = await Promise.all([get(key + '-love'), get(key + '-like'), get(key + '-v'), get(key + '-p')]);
    if (love === null || like === null || v === null || p === null) { console.log(rel + ' 讀取失敗，跳過'); continue; }
    const L = (love || 0) + (like || 0);
    if (L === 0) continue;
    const factor = 3 + rnd() * 2; // 3~5 倍
    const targetV = Math.max(v, Math.ceil(L * factor) + Math.floor(rnd() * 5));
    const dv = targetV - v;
    if (dv > 0) added += await topUp(key + '-v', dv);
    const ratio = 0.6 + rnd() * 0.2; // 遊玩約瀏覽的 6~8 成
    const targetP = Math.min(targetV - 1, Math.max(L + 1, Math.round(targetV * ratio)));
    const dp = targetP - p;
    if (dp > 0) added += await topUp(key + '-p', dp);
    console.log(rel + ' → ' + key + ' 讚' + L + ' 瀏覽' + v + '→' + Math.max(v, targetV) + ' 遊玩' + p + '→' + Math.max(p, targetP));
  }
  await hit(doneKey);
  console.log('完成：共補 ' + added + ' 次計數');
}

main().catch(e => { console.error(e); process.exit(1); });
