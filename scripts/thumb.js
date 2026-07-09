// 為每個作品產生「精彩畫面」縮圖：
// 在多個時間點各截一張（含互動觸發），用色彩豐富度評分，自動挑最精彩的一張。
// 有效的 canvas 只截主畫面區域；縮圖檔名用 URL 安全的 slug。
// 用法: node scripts/thumb.js <chrome執行檔路徑> [--force] [--only 檔名.html ...]
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { thumbSlug } = require('./slug');

const ROOT = path.resolve(__dirname, '..');
const CHROME = process.argv[2];
const FORCE = process.argv.includes('--force');
const pickIdx = process.argv.indexOf('--pick'); // 搭配 --only 使用：強制取第 N 個時間點的畫面（0/1/2）
const PICK = pickIdx > -1 ? parseInt(process.argv[pickIdx + 1], 10) : null;
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? process.argv.slice(onlyIdx + 1).filter(a => a !== '--pick' && a !== String(PICK)) : null;

async function grabFrame(page) {
  // 文章式頁面的動畫常在下方：先把最大的主畫面元素捲進視窗中央
  const scrolled = await page.evaluate(() => {
    function area(el) {
      const r = el.getBoundingClientRect();
      return Math.max(0, r.width) * Math.max(0, r.height);
    }
    let best = null, bestArea = 0;
    for (const el of document.querySelectorAll('canvas, svg, video')) {
      const a = area(el);
      if (a > bestArea) { bestArea = a; best = el; }
    }
    if (!best) return false;
    const r = best.getBoundingClientRect();
    if (r.top > innerHeight * 0.7 || r.bottom < innerHeight * 0.3) {
      best.scrollIntoView({ block: 'center', behavior: 'instant' });
      return true;
    }
    return false;
  });
  if (scrolled) await page.waitForTimeout(400);

  // 找最大的 canvas/svg/video，只截主畫面
  const target = await page.evaluate(() => {
    function area(el) {
      const r = el.getBoundingClientRect();
      return Math.max(0, r.width) * Math.max(0, r.height);
    }
    let best = null, bestArea = 0;
    for (const el of document.querySelectorAll('canvas, svg, video')) {
      const a = area(el);
      if (a > bestArea) { bestArea = a; best = el; }
    }
    // 夠大的主畫面才裁切：占視窗 8% 以上，或本身至少 300x180
    if (!best) return null;
    const r = best.getBoundingClientRect();
    const bigEnough = bestArea >= innerWidth * innerHeight * 0.08 || (r.width >= 300 && r.height >= 180);
    if (!bigEnough) return null;
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const vp = page.viewportSize();
  const clip = target && {
    x: Math.max(0, target.x),
    y: Math.max(0, target.y),
    width: Math.min(target.w, vp.width - Math.max(0, target.x)),
    height: Math.min(target.h, vp.height - Math.max(0, target.y)),
  };
  if (clip && clip.width >= 100 && clip.height >= 100) {
    try { return await page.screenshot({ clip, type: 'jpeg', quality: 72 }); } catch (e) {}
  }
  return await page.screenshot({ type: 'jpeg', quality: 72 });
}

// 評分：色彩變化越豐富分數越高，避免選到全黑/全白/單色畫面
async function scoreFrame(scorer, buf) {
  return await scorer.evaluate(async (b64) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/jpeg;base64,' + b64; });
    const c = document.createElement('canvas');
    c.width = 96; c.height = 60;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, 96, 60);
    const d = g.getImageData(0, 0, 96, 60).data;
    const n = d.length / 4;
    let mr = 0, mg = 0, mb = 0;
    for (let i = 0; i < d.length; i += 4) { mr += d[i]; mg += d[i + 1]; mb += d[i + 2]; }
    mr /= n; mg /= n; mb /= n;
    let v = 0, colorful = 0;
    for (let i = 0; i < d.length; i += 4) {
      const dr = d[i] - mr, dg = d[i + 1] - mg, db = d[i + 2] - mb;
      v += dr * dr + dg * dg + db * db;
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (mx - mn > 30) colorful++;
    }
    return Math.sqrt(v / n) + (colorful / n) * 120;
  }, buf.toString('base64'));
}

async function shootOne(ctx, scorer, htmlPath, outPath) {
  const page = await ctx.newPage();
  try {
    await page.goto('file://' + htmlPath, { waitUntil: 'load', timeout: 20000 });
    const candidates = [];

    // 第 1 張：載入後 1.5 秒（開頭畫面，通常有主視覺）
    await page.waitForTimeout(1500);
    candidates.push(await grabFrame(page));

    // 觸發互動（啟動需要點擊的遊戲/動畫）：優先點「開始」類按鈕，其次點畫面中央
    try {
      const clicked = await page.evaluate(() => {
        const words = ['開始', 'START', 'Start', 'PLAY', 'Play', '播放', 'GO'];
        const els = document.querySelectorAll('button, a, div, span');
        for (const el of els) {
          const t = (el.textContent || '').trim();
          if (!t || t.length > 12) continue;
          if (words.some(w => t.includes(w))) {
            const r = el.getBoundingClientRect();
            if (r.width > 10 && r.height > 10) { el.click(); return true; }
          }
        }
        return false;
      });
      const vp = page.viewportSize();
      if (!clicked) await page.mouse.click(vp.width / 2, vp.height / 2);
      await page.keyboard.press('Enter');
    } catch (e) {}

    // 第 2 張：互動後 5 秒（進行中的畫面）
    await page.waitForTimeout(5000);
    candidates.push(await grabFrame(page));

    // 第 3 張：再過 6 秒（動畫中後段）
    await page.waitForTimeout(6000);
    candidates.push(await grabFrame(page));

    if (PICK !== null && candidates[PICK]) {
      fs.writeFileSync(outPath, candidates[PICK]);
      return;
    }
    // 加權：中後段（遊戲進行中）的畫面優先，開頭畫面（常是文字說明）權重最低
    const WEIGHTS = [1.0, 1.35, 1.5];
    let best = null, bestScore = -1;
    for (let i = 0; i < candidates.length; i++) {
      let s = 0;
      try { s = await scoreFrame(scorer, candidates[i]); } catch (e) {}
      s *= WEIGHTS[i] || 1;
      if (s > bestScore) { bestScore = s; best = candidates[i]; }
    }
    fs.writeFileSync(outPath, best);
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-gpu', '--mute-audio'],
  });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
  const scorer = await ctx.newPage();
  await scorer.goto('about:blank');

  let ok = 0, fail = 0;
  const wanted = new Set();
  for (const cat of ['games', 'videos', 'pro/games', 'pro/videos']) {
    const dir = path.join(ROOT, cat);
    if (!fs.existsSync(dir)) continue;
    fs.mkdirSync(path.join(ROOT, 'thumbs', cat), { recursive: true });
    for (const f of fs.readdirSync(dir).filter(f => /\.html?$/i.test(f))) {
      const out = path.join(ROOT, 'thumbs', cat, thumbSlug(f));
      wanted.add(path.join('thumbs', cat, thumbSlug(f)));
      if (only && !only.includes(f)) continue;
      if (!FORCE && !only && fs.existsSync(out)) continue; // 已有縮圖就跳過（Action 增量模式）
      try {
        await shootOne(ctx, scorer, path.join(dir, f), out);
        console.log('OK  ' + cat + '/' + f);
        ok++;
      } catch (e) {
        console.log('FAIL ' + cat + '/' + f + ' :: ' + e.message.split('\n')[0]);
        fail++;
      }
    }
  }

  // 清掉孤兒縮圖（作品已刪除或改名）
  for (const cat of ['games', 'videos', 'pro/games', 'pro/videos']) {
    const tdir = path.join(ROOT, 'thumbs', cat);
    if (!fs.existsSync(tdir)) continue;
    for (const t of fs.readdirSync(tdir)) {
      if (!wanted.has(path.join('thumbs', cat, t))) {
        fs.unlinkSync(path.join(tdir, t));
        console.log('清除孤兒縮圖 ' + cat + '/' + t);
      }
    }
  }

  await browser.close();
  console.log(`done ok=${ok} fail=${fail}`);
})();
