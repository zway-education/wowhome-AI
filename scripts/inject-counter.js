// 在每個作品檔案植入「自我計數」信標：不論作品從哪裡被打開（作品館 iframe、獨立網址、
// 分享連結、GitHub 直連）都會回報一次瀏覽/遊玩到 Abacus 計數服務。
// 在作品館 iframe 內時偵測到自己不是最上層文件，就交給作品館計數，避免重複。
// key 推導與作品館一致（thumbSlug；pro 版加 'pro-' 前綴），統計數據不會斷。
const fs = require('fs');
const path = require('path');
const { thumbSlug } = require('./slug');

const ROOT = path.resolve(__dirname, '..');
const MARK = 'AI-CAMP-STATS-BEACON';

function keyFor(cat, file) {
  const slug = thumbSlug(file).replace(/\.jpg$/i, '');
  return cat.startsWith('pro/') ? 'pro-' + slug : slug;
}

function snippet(key) {
  // 用協定相對網址（//...）避免檔案內出現 http 字面；fetch 失敗一律靜默不影響作品
  return [
    '<script>/* ' + MARK + ' */',
    '(function(){',
    '  try{ if(window.top!==window.self) return; }catch(e){ return; } /* 在作品館內由作品館計數 */',
    '  var NS="ai-future-camp", K=' + JSON.stringify(key) + ';',
    '  function ping(n){ try{ var p=fetch("//abacus.jasoncameron.dev/hit/"+NS+"/"+n,{mode:"no-cors",keepalive:true}); if(p&&p.catch) p.catch(function(){}); }catch(e){} }',
    '  ping(K+"-v");',
    '  var done=false;',
    '  function once(){ if(done)return; done=true; ping(K+"-p"); ping("site-total-plays");',
    '    window.removeEventListener("pointerdown",once); window.removeEventListener("keydown",once); }',
    '  window.addEventListener("pointerdown",once,{once:false}); window.addEventListener("keydown",once,{once:false});',
    '})();',
    '</script>',
  ].join('\n');
}

let injected = 0, skipped = 0;
for (const cat of ['games', 'videos', 'pro/games', 'pro/videos']) {
  const dir = path.join(ROOT, cat);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(f => /\.html?$/i.test(f))) {
    const fp = path.join(dir, f);
    let s = fs.readFileSync(fp, 'utf8');
    if (s.includes(MARK)) { skipped++; continue; }
    const snip = snippet(keyFor(cat, f));
    // 插在最後一個 </body> 之前；沒有就 </html> 之前；再沒有就直接附加
    if (/<\/body>/i.test(s)) {
      s = s.replace(/([\s\S]*)<\/body>/i, (m, pre) => pre + snip + '\n</body>');
    } else if (/<\/html>/i.test(s)) {
      s = s.replace(/([\s\S]*)<\/html>/i, (m, pre) => pre + snip + '\n</html>');
    } else {
      s = s + '\n' + snip + '\n';
    }
    fs.writeFileSync(fp, s, 'utf8');
    injected++;
  }
}
console.log('植入計數信標：新增 ' + injected + ' 檔，已存在略過 ' + skipped + ' 檔');
