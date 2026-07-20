// 在每部動畫/影片作品植入通用播放控制列：暫停/繼續、重播、速度(0.5x/1x/2x)、經過時間。
// 原理：接管 requestAnimationFrame / performance.now / Date.now / setTimeout / setInterval 成「虛擬時鐘」，
// 暫停時凍結虛擬時間並暫停所有 AudioContext 與 <audio>/<video>，不需逐部改寫動畫程式。
// 控制列固定在左下角（右下角留給投票鈕），支援觸控。重複執行會先移除舊版再重植。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MARK = 'AI-CAMP-VIDEO-CONTROLS';

const SNIPPET = [
  '<script>/* ' + MARK + ' */',
  '(function(){',
  '  var ORAF=window.requestAnimationFrame.bind(window), OST=window.setTimeout.bind(window), OSI=window.setInterval.bind(window);',
  '  var realNow=performance.now.bind(performance), D0=Date.now(), P0=realNow();',
  '  var acc=0, lastReal=P0, paused=false, speed=1;',
  '  function vnow(){ var r=realNow(); if(!paused){ acc+=(r-lastReal)*speed; } lastReal=r; return acc; }',
  '  try{ performance.now=function(){ return vnow(); }; }catch(e){}',
  '  try{ Date.now=function(){ return D0+Math.round(vnow()); }; }catch(e){}',
  '  window.requestAnimationFrame=function(cb){ return ORAF(function tick(){ if(paused){ ORAF(tick); } else { cb(vnow()); } }); };',
  '  window.setTimeout=function(fn,ms){ var a=[].slice.call(arguments,2);',
  '    return OST(function f(){ if(paused){ OST(f,120); } else if(typeof fn==="function"){ fn.apply(null,a); } },ms); };',
  '  window.setInterval=function(fn,ms){ var a=[].slice.call(arguments,2);',
  '    return OSI(function(){ if(!paused&&typeof fn==="function"){ fn.apply(null,a); } },ms); };',
  '  var ctxs=[];',
  '  ["AudioContext","webkitAudioContext"].forEach(function(n){',
  '    var C=window[n]; if(!C) return;',
  '    var W=function(){ var c=new (Function.prototype.bind.apply(C,[null].concat([].slice.call(arguments))))(); ctxs.push(c); return c; };',
  '    W.prototype=C.prototype; window[n]=W;',
  '  });',
  '  function setPaused(p){',
  '    vnow(); paused=p;',
  '    ctxs.forEach(function(c){ try{ p?c.suspend():c.resume(); }catch(e){} });',
  '    [].forEach.call(document.querySelectorAll("audio,video"),function(m){ try{ p?m.pause():m.play(); }catch(e){} });',
  '  }',
  '  function fmt(ms){ var s=Math.floor(ms/1000); return Math.floor(s/60)+":"+("0"+(s%60)).slice(-2); }',
  '  function init(){',
  '    if(!document.body) return;',
  '    var bar=document.createElement("div");',
  '    bar.style.cssText="position:fixed;left:10px;bottom:10px;z-index:99998;display:flex;gap:6px;align-items:center;"+',
  '      "font-family:sans-serif;background:rgba(15,18,32,.88);border-radius:999px;padding:6px 10px;box-shadow:0 2px 10px rgba(0,0,0,.4)";',
  '    function mkbtn(txt,title){ var b=document.createElement("button"); b.type="button"; b.title=title;',
  '      b.style.cssText="min-width:42px;min-height:36px;border:none;border-radius:999px;background:rgba(255,255,255,.12);"+',
  '        "color:#fff;font-size:15px;cursor:pointer;touch-action:manipulation;padding:4px 10px"; b.textContent=txt; return b; }',
  '    var bPlay=mkbtn("\\u23F8","\\u66AB\\u505C/\\u7E7C\\u7E8C");',
  '    var bRe=mkbtn("\\u23EA","\\u91CD\\u64AD");',
  '    var bSp=mkbtn("1x","\\u64AD\\u653E\\u901F\\u5EA6");',
  '    var tEl=document.createElement("span"); tEl.style.cssText="color:#9fd8ff;font-size:13px;min-width:38px;text-align:center"; tEl.textContent="0:00";',
  '    bPlay.addEventListener("click",function(){ setPaused(!paused); bPlay.textContent=paused?"\\u25B6":"\\u23F8"; });',
  '    bRe.addEventListener("click",function(){ location.reload(); });',
  '    var speeds=[1,2,0.5];',
  '    bSp.addEventListener("click",function(){ vnow(); speed=speeds[(speeds.indexOf(speed)+1)%speeds.length]; bSp.textContent=(speed===0.5?"0.5":speed)+"x"; });',
  '    bar.appendChild(bPlay); bar.appendChild(bRe); bar.appendChild(bSp); bar.appendChild(tEl);',
  '    document.body.appendChild(bar);',
  '    (function upd(){ tEl.textContent=fmt(vnow()); OST(upd,500); })();',
  '  }',
  '  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();',
  '})();',
  '</script>',
].join('\n');

let injected = 0;
for (const cat of ['videos', 'pro/videos']) {
  const dir = path.join(ROOT, cat);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(f => /\.html?$/i.test(f))) {
    const fp = path.join(dir, f);
    let s = fs.readFileSync(fp, 'utf8');
    s = s.replace(new RegExp('<script>/\\* ' + MARK + ' \\*/[\\s\\S]*?</script>\\n?', 'g'), '');
    // 放在最後（信標之後）：接管時鐘只影響後續的 rAF/setTimeout 呼叫，動畫主迴圈每幀都會重新呼叫所以有效
    if (/<\/body>/i.test(s)) {
      s = s.replace(/([\s\S]*)<\/body>/i, (m, pre) => pre + SNIPPET + '\n</body>');
    } else if (/<\/html>/i.test(s)) {
      s = s.replace(/([\s\S]*)<\/html>/i, (m, pre) => pre + SNIPPET + '\n</html>');
    } else {
      s = s + '\n' + SNIPPET + '\n';
    }
    fs.writeFileSync(fp, s, 'utf8');
    injected++;
  }
}
console.log('植入影片控制列：' + injected + ' 檔');
