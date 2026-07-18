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

function snippet(key, isVideo) {
  // 用協定相對網址（//...）避免檔案內出現 http 字面；fetch 失敗一律靜默不影響作品
  // 動畫：打開就算一次遊玩；遊戲：第一次操作才算遊玩
  const playPart = isVideo
    ? '  ping(K+"-p"); ping("site-total-plays");'
    : [
        '  var done=false;',
        '  function once(){ if(done)return; done=true; ping(K+"-p"); ping("site-total-plays");',
        '    window.removeEventListener("pointerdown",once); window.removeEventListener("keydown",once); }',
        '  window.addEventListener("pointerdown",once,{once:false}); window.addEventListener("keydown",once,{once:false});',
      ].join('\n');
  return [
    '<script>/* ' + MARK + ' */',
    '(function(){',
    '  try{ if(window.top!==window.self) return; }catch(e){ return; } /* 在作品館內由作品館計數與投票 */',
    '  var NS="ai-future-camp", K=' + JSON.stringify(key) + ';',
    '  var API="//abacus.jasoncameron.dev/";',
    '  function ping(n){ try{ var p=fetch(API+"hit/"+NS+"/"+n,{mode:"no-cors",keepalive:true}); if(p&&p.catch) p.catch(function(){}); }catch(e){} }',
    '  function read(n,cb){ try{ fetch(API+"get/"+NS+"/"+n).then(function(r){ return r.status===404?{value:0}:r.json(); }).then(function(j){ cb(j.value||j.count||0); }).catch(function(){ cb(null); }); }catch(e){ cb(null); } }',
    '  ping(K+"-v");',
    playPart,
    '  /* 投票鈕：非常好玩/好玩——與作品館同一計數器，任何網頁打開都同步 */',
    '  function initVotes(){',
    '    if(!document.body) return;',
    '    var wrap=document.createElement("div");',
    '    wrap.style.cssText="position:fixed;right:10px;bottom:10px;z-index:99999;display:flex;gap:6px;font-family:sans-serif;opacity:.92";',
    '    var LS="voted-"+K;',
    '    var defs=[["-love","\\u2764\\uFE0F","\\u975e\\u5e38\\u597d\\u73a9","#ff6cc7"],["-like","\\ud83d\\udc4d","\\u597d\\u73a9","#38e1ff"]];',
    '    var btns={};',
    '    function refresh(){',
    '      var voted=null; try{ voted=localStorage.getItem(LS); }catch(e){}',
    '      defs.forEach(function(d){',
    '        var b=btns[d[0]];',
    '        b.style.boxShadow=(voted===d[0])?"0 0 0 2px "+d[3]:"0 2px 8px rgba(0,0,0,.35)";',
    '        read(K+d[0],function(n){ read(K+d[0]+"-c",function(c){',
    '          if(n===null) return;',
    '          b.querySelector("i").textContent=Math.max(0,(n||0)-(c||0));',
    '        }); });',
    '      });',
    '    }',
    '    defs.forEach(function(d){',
    '      var b=document.createElement("button");',
    '      b.type="button"; b.title=d[2];',
    '      b.style.cssText="min-height:42px;padding:8px 14px;border:none;border-radius:999px;background:rgba(15,18,32,.88);color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;touch-action:manipulation";',
    '      b.innerHTML=d[1]+" "+d[2]+" <i style=\\"font-style:normal;color:"+d[3]+"\\">0</i>";',
    '      b.addEventListener("click",function(){',
    '        var prev=null; try{ prev=localStorage.getItem(LS); }catch(e){}',
    '        if(prev===d[0]){ ping(K+d[0]+"-c"); try{ localStorage.removeItem(LS); }catch(e){} }',
    '        else{ if(prev){ ping(K+prev+"-c"); } ping(K+d[0]); try{ localStorage.setItem(LS,d[0]); }catch(e){} }',
    '        setTimeout(refresh,600);',
    '      });',
    '      btns[d[0]]=b; wrap.appendChild(b);',
    '    });',
    '    document.body.appendChild(wrap);',
    '    refresh();',
    '    setInterval(function(){ if(!document.hidden) refresh(); },10000); /* 每10秒同步別人投的票 */',
    '  }',
    '  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initVotes); else initVotes();',
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
    // 已有舊信標就先移除再重植（規則可能更新）
    s = s.replace(new RegExp('<script>/\\* ' + MARK + ' \\*/[\\s\\S]*?</script>\\n?', 'g'), '');
    if (s.includes(MARK)) { skipped++; continue; }
    const isVideo = /(^|\/)videos$/.test(cat);
    const snip = snippet(keyFor(cat, f), isVideo);
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
