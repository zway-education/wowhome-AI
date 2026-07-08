// 產生 manifest.json：作品清單 + 縮圖檔名 + 作者
// 作者來源（優先順序）：authors.json 覆寫 > 作品 HTML 內的 <meta name="author" content="...">
// 用法: node scripts/build-manifest.js
const fs = require('fs');
const path = require('path');
const { thumbSlug } = require('./slug');

const ROOT = path.resolve(__dirname, '..');

let overrides = {};
const overridePath = path.join(ROOT, 'authors.json');
if (fs.existsSync(overridePath)) {
  try { overrides = JSON.parse(fs.readFileSync(overridePath, 'utf8')); } catch (e) {
    console.error('authors.json 格式錯誤，忽略：' + e.message);
  }
}

function metaAuthor(htmlPath) {
  try {
    const head = fs.readFileSync(htmlPath, 'utf8').slice(0, 4000);
    const m = head.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i)
          || head.match(/<meta\s+content=["']([^"']+)["']\s+name=["']author["']/i);
    return m ? m[1].trim() : '';
  } catch (e) { return ''; }
}

const manifest = {};
for (const cat of ['games', 'videos']) {
  const dir = path.join(ROOT, cat);
  manifest[cat] = [];
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(f => /\.html?$/i.test(f)).sort()) {
    const entry = {
      file: f,
      title: f.replace(/\.html?$/i, ''),
      thumb: thumbSlug(f),
    };
    const author = overrides[cat + '/' + f] || metaAuthor(path.join(dir, f));
    if (author) entry.author = author;
    manifest[cat].push(entry);
  }
}

fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
console.log('manifest.json 已更新: games=' + manifest.games.length + ' videos=' + manifest.videos.length);
