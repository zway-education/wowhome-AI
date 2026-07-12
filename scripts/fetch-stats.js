// 伺服器端統計快照：把所有作品的計數器（瀏覽/遊玩/評分）從 Abacus 抓下來寫成 stats.json。
// 頁面載入時先讀這份快照瞬間顯示，再對可見卡片做即時更新——避免瀏覽器現場查數百個計數器
// 造成的緩慢與速率限制。由 GitHub Actions 排程執行（.github/workflows/stats.yml）。
// 用法: node scripts/fetch-stats.js
const fs = require('fs');
const path = require('path');
const { thumbSlug } = require('./slug');

const ROOT = path.resolve(__dirname, '..');
const NS = 'ai-future-camp';
const BASE = 'https://abacus.jasoncameron.dev/get/' + NS + '/';

function keysFor(cat, file) {
  const slug = thumbSlug(file).replace(/\.jpg$/i, '');
  return cat.startsWith('pro/') ? 'pro-' + slug : slug;
}

async function getCount(name) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 1200 * attempt));
    try {
      const r = await fetch(BASE + name, { signal: AbortSignal.timeout(8000) });
      if (r.status === 404) return 0; // 尚未有人計數
      if (r.ok) { const j = await r.json(); return j.value ?? j.count ?? 0; }
    } catch (e) {}
  }
  return null; // 查不到就別寫進快照，前端會保留上次的值
}

async function main() {
  const works = [];
  for (const cat of ['games', 'videos', 'pro/games', 'pro/videos']) {
    const dir = path.join(ROOT, cat);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => /\.html?$/i.test(f))) {
      works.push(keysFor(cat, f));
    }
  }
  const stats = {};
  let done = 0;
  // 節流：同時 6 個查詢
  const queue = [...works];
  async function worker() {
    while (queue.length) {
      const key = queue.shift();
      const [v, p, love, loveC, like, likeC] = await Promise.all([
        getCount(key + '-v'), getCount(key + '-p'),
        getCount(key + '-love'), getCount(key + '-love-c'),
        getCount(key + '-like'), getCount(key + '-like-c'),
      ]);
      if (v === null && p === null) continue; // 全查不到就跳過
      stats[key] = {
        v: v || 0, p: p || 0,
        love: Math.max(0, (love || 0) - (loveC || 0)),
        like: Math.max(0, (like || 0) - (likeC || 0)),
      };
      done++;
    }
  }
  await Promise.all(Array.from({ length: 1 }, worker)); // 逐一查（每作品內部已並行6個）
  const total = await getCount('site-total-plays');
  const out = { updated: new Date().toISOString(), total: total || 0, works: stats };
  fs.writeFileSync(path.join(ROOT, 'stats.json'), JSON.stringify(out), 'utf8');
  console.log('stats.json 已更新：' + done + '/' + works.length + ' 個作品，總遊玩 ' + (total || 0));
}

main().catch(e => { console.error(e); process.exit(1); });
