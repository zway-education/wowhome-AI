// 把 seed-votes.json 的隨機讚數種進 Abacus 計數器（<key>-love / <key>-like 各 hit N 次）。
// 由 GitHub Actions 執行（.github/workflows/seed-votes.yml）；容器環境連不到計數服務。
// 防重複：成功後 hit 一次 seed-done-<batch>，再次執行同批次先查該計數器 >0 就跳過。
const fs = require('fs');
const path = require('path');
const { thumbSlug } = require('./slug');

const NS = 'ai-future-camp';
const BASE = 'https://abacus.jasoncameron.dev/';

function keyFor(rel) {
  const slug = thumbSlug(path.basename(rel)).replace(/\.jpg$/i, '');
  return rel.startsWith('pro/') ? 'pro-' + slug : slug;
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

async function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-votes.json'), 'utf8'));
  const batch = cfg._batch.replace(/[^a-zA-Z0-9-]/g, '-');
  const doneKey = 'seed-done-' + batch;
  const done = await get(doneKey);
  if (done && done > 0) { console.log('批次 ' + batch + ' 已執行過，跳過'); return; }

  let total = 0, works = 0;
  for (const [rel, v] of Object.entries(cfg.counts)) {
    const key = keyFor(rel);
    let ok = 0;
    for (const [suffix, n] of [['-love', v.love], ['-like', v.like]]) {
      for (let i = 0; i < n; i++) {
        if (await hit(key + suffix)) ok++;
        await new Promise(res => setTimeout(res, 150)); // 節流，遠低於 30次/10秒 上限
      }
    }
    total += ok; works++;
    console.log(rel + ' → ' + key + ' ❤' + v.love + ' 👍' + v.like + '（成功 ' + ok + '）');
  }
  await hit(doneKey);
  console.log('完成：' + works + ' 個遊戲共 +' + total + ' 個讚');
}

main().catch(e => { console.error(e); process.exit(1); });
