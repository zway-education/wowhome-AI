# wowhome-AI 🏠

AI 製作的遊戲與動畫作品收藏庫。

## 📂 結構

- `index.html` — 作品館首頁，在單一網頁中展示所有作品（點卡片即可遊玩／播放）
- `games/` — 可互動的遊戲（每個作品一個自足的 HTML 檔）
- `videos/` — 自動播放的動畫影片（每個作品一個自足的 HTML 檔）
- `manifest.json` — 作品清單，由 GitHub Actions 在每次 push 後自動更新

## 🌐 線上瀏覽

啟用 GitHub Pages（Settings → Pages → Deploy from a branch → `main` / root）後，作品館網址為：

https://zway-education.github.io/wowhome-AI/

## ➕ 新增作品

把完全自足的單一 HTML 檔放進 `games/` 或 `videos/`（檔名即作品標題），push 到 `main` 即可，首頁清單會自動更新。
