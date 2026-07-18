// 把 seed-views.json 的 Artifact 瀏覽次數加總進 Abacus 計數器（<key>-v 各 hit N 次）。
// 由 GitHub Actions 執行（.github/workflows/seed-views.yml）；容器環境連不到計數服務。
// 防重複：執行成功後把 _batch 寫進 done 標記計數器（seed-done-<batch> hit 一次），
// 再次執行同批次時先查該計數器 >0 就跳過。
const fs = require('fs');
const path = require('path');
const { thumbSlug } = require('./slug');

const ROOT = path.resolve(__dirname, '..');
const NS = 'ai-future-camp';
const BASE = 'https://abacus.jasoncameron.dev/';

function keyFor(rel) {
  const f = path.basename(rel);
  const slug = thumbSlug(f).replace(/\.jpg$/i, '');
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
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-views.json'), 'utf8'));
  const batch = cfg._batch.replace(/[^a-zA-Z0-9-]/g, '-');
  const doneKey = 'seed-done-' + batch;
  const done = await get(doneKey);
  if (done && done > 0) { console.log('批次 ' + batch + ' 已執行過，跳過'); return; }

  let total = 0, works = 0;
  for (const [rel, n] of Object.entries(cfg.counts)) {
    const key = keyFor(rel) + '-v';
    let ok = 0;
    for (let i = 0; i < n; i++) {
      if (await hit(key)) ok++;
      await new Promise(res => setTimeout(res, 120)); // 節流約 8/秒
    }
    total += ok; works++;
    console.log(rel + ' → ' + key + ' +' + ok + '/' + n);
  }
  await hit(doneKey); // 標記本批次完成
  console.log('完成：' + works + ' 個作品共 +' + total + ' 次瀏覽');
}

main().catch(e => { console.error(e); process.exit(1); });
