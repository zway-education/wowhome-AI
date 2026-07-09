// 把作品檔名轉成 URL 安全的縮圖檔名（英數 + 短雜湊），避免中文/空格網址在部分環境載入失敗
const crypto = require('crypto');

function thumbSlug(filename) {
  const base = filename.replace(/\.html?$/i, '');
  const ascii = base.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  const hash = crypto.createHash('sha1').update(filename, 'utf8').digest('hex').slice(0, 8);
  return (ascii ? ascii + '-' : 't-') + hash + '.jpg';
}

module.exports = { thumbSlug };
