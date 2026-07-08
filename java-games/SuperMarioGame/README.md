# 超級瑪莉 (Super Mario) - Java 版

用純 Java (Swing) 寫的橫向卷軸平台遊戲，靈感來自超級瑪莉。

## 玩法

- ← / → 或 A / D：左右移動
- 空白鍵 / ↑ / W：跳躍
- 踩在敵人頭上可以消滅敵人並得分
- 收集金幣得分，走到旗子處過關
- 掉出畫面或碰到敵人會扣一條命，生命歸零遊戲結束

## 執行方式

需要安裝 JDK 17 以上版本。

```bash
cd java-games/SuperMarioGame
javac -d out src/*.java
java -cp out Main
```

## 專案結構

- `Main.java` - 進入點，建立視窗
- `GamePanel.java` - 主遊戲迴圈、輸入處理、碰撞偵測、畫面繪製
- `Player.java` - 玩家角色（移動、跳躍、重力）
- `Enemy.java` - 敵人（左右巡邏、可被踩死）
- `Platform.java` - 地板與空中平台
- `Coin.java` - 金幣
- `Level.java` - 關卡資料（平台、金幣、敵人、終點旗）
- `Rect.java` - 簡單的矩形碰撞工具類別
