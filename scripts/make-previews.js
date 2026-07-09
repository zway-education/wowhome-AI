// 把每張封面縮成 320 寬的小圖並轉成 base64 data URI，存進 previews.json
// 讓 manifest 直接內嵌封面 → 網頁不需另外下載圖片檔（避開會擋圖片的網路環境）
// 用法: node scripts/make-previews.js <chrome執行檔路徑>
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHROME = process.argv[2];

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'],
  });
  const page = await (await browser.newContext()).newPage();
  await page.goto('about:blank');

  const previews = {};
  let n = 0;
  for (const cat of ['games', 'videos', 'pro/games', 'pro/videos']) {
    const dir = path.join(ROOT, 'thumbs', cat);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => /\.jpe?g$/i.test(f))) {
      const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
      try {
        const dataUri = await page.evaluate(async (src) => {
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
          const w = 320, h = Math.round(img.height * (320 / img.width));
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          return c.toDataURL('image/jpeg', 0.55);
        }, 'data:image/jpeg;base64,' + b64);
        previews[cat + '/' + f] = dataUri;
        n++;
      } catch (e) {
        console.log('預覽失敗 ' + cat + '/' + f + ': ' + e.message.split('\n')[0]);
      }
    }
  }
  fs.writeFileSync(path.join(ROOT, 'previews.json'), JSON.stringify(previews));
  const kb = Math.round(fs.statSync(path.join(ROOT, 'previews.json')).size / 1024);
  console.log(`previews.json 完成：${n} 張內嵌封面，共 ${kb} KB`);
  await browser.close();
})();
