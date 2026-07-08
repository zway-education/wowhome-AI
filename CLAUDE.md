# AI未來創作營隊 作品庫

這個 repo 收藏 AI 協作完成的網頁遊戲與動畫，並以 `index.html` 作品館在單一網頁展示全部作品。

## 開始做遊戲之前（必讀）

**製作任何遊戲前，先完整閱讀 `docs/遊戲設計指南.md`。** 品質標準是「超級瑪利歐水準」：
即時回饋、漸進難度、失敗不挫折、一眼看懂。指南內含可直接複製的遊戲迴圈骨架
（固定時間步進＋狀態機＋鍵盤/觸控輸入＋畫布縮放）、手感配方（震動、hit-stop、
squash & stretch、粒子、Web Audio 音效）、平台跳躍物理參數表與配色盤。

## 作品規範

- 每個作品是**一個完全自足的 HTML 檔**：CSS/JS 全部內嵌，零外部資源（不可用 CDN、Google Fonts、外連圖片）
- 可互動的「遊戲」放 `games/`；自動播放的「動畫/影片」放 `videos/`
- 檔名即作品標題（中文可），例如 `games/貪食蛇.html`；同名已存在就用 `標題-2.html`
- 必須同時支援電腦（鍵盤/滑鼠）與手機（觸控），畫布要能隨視窗縮放
- 在 `<head>` 加上作者標記：`<meta name="author" content="作者名字">`（作品館會顯示）

## 不要動的檔案

`index.html`、`manifest.json`、`thumbs/` 由系統維護：作品 push 到 `main` 後，
GitHub Actions 會自動更新清單、產生遊戲畫面縮圖。你只需要新增作品檔案本身。

## Git 流程

- 作品直接 commit 並 push 到 `main`（不開 PR）
- push 前先 `git pull --rebase origin main`；被拒絕就再 rebase 重推（最多 4 次）

## 相關網址

- 作品館（GitHub Pages）：https://zway-education.github.io/wowhome-AI/
