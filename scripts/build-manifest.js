// 產生 manifest.json：作品清單 + 縮圖檔名 + 作者
// 作者來源（優先順序）：authors.json 覆寫 > 作品 HTML 內的 <meta name="author" content="...">
// 用法: node scripts/build-manifest.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { thumbSlug } = require('./slug');

const ROOT = path.resolve(__dirname, '..');

// 取檔案最後一次 git 提交日期（YYYY-MM-DD）作為更新時間
function lastUpdated(relPath) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', relPath],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    return out || '';
  } catch (e) { return ''; }
}

let overrides = {};
const overridePath = path.join(ROOT, 'authors.json');
if (fs.existsSync(overridePath)) {
  try { overrides = JSON.parse(fs.readFileSync(overridePath, 'utf8')); } catch (e) {
    console.error('authors.json 格式錯誤，忽略：' + e.message);
  }
}

// 內嵌封面（避開會擋圖片檔的網路環境）
let previews = {};
const previewPath = path.join(ROOT, 'previews.json');
if (fs.existsSync(previewPath)) {
  try { previews = JSON.parse(fs.readFileSync(previewPath, 'utf8')); } catch (e) {
    console.error('previews.json 格式錯誤，忽略：' + e.message);
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
for (const cat of ['games', 'videos', 'pro/games', 'pro/videos']) {
  const dir = path.join(ROOT, cat);
  manifest[cat] = [];
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(f => /\.html?$/i.test(f)).sort()) {
    const entry = {
      file: f,
      title: f.replace(/\.html?$/i, ''),
      thumb: thumbSlug(f),
    };
    const baseCat = cat.replace(/^pro\//, '');
    const author = overrides[cat + '/' + f] || overrides[baseCat + '/' + f] || metaAuthor(path.join(dir, f));
    if (author) entry.author = author;
    const pv = previews[cat + '/' + thumbSlug(f)];
    if (pv) entry.preview = pv;
    const upd = lastUpdated(cat + '/' + f);
    if (upd) entry.updated = upd;
    manifest[cat].push(entry);
  }
}

fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
console.log('manifest.json 已更新: games=' + manifest.games.length + ' videos=' + manifest.videos.length);
