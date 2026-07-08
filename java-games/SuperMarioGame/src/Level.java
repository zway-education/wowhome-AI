import java.util.ArrayList;
import java.util.List;

public class Level {
    public List<Platform> platforms = new ArrayList<>();
    public List<Coin> coins = new ArrayList<>();
    public List<Enemy> enemies = new ArrayList<>();
    public double flagX;
    public double startX = 60, startY = 300;
    public double levelWidth;

    public static Level buildLevel1() {
        Level lvl = new Level();

        lvl.platforms.add(new Platform(0, 400, 900, 100, true));
        lvl.platforms.add(new Platform(1000, 400, 500, 100, true));
        lvl.platforms.add(new Platform(1600, 400, 900, 100, true));

        lvl.platforms.add(new Platform(300, 320, 100, 20, false));
        lvl.platforms.add(new Platform(500, 260, 100, 20, false));
        lvl.platforms.add(new Platform(700, 320, 100, 20, false));
        lvl.platforms.add(new Platform(1100, 300, 120, 20, false));
        lvl.platforms.add(new Platform(1750, 300, 120, 20, false));
        lvl.platforms.add(new Platform(1950, 250, 120, 20, false));

        lvl.coins.add(new Coin(330, 280));
        lvl.coins.add(new Coin(530, 220));
        lvl.coins.add(new Coin(730, 280));
        lvl.coins.add(new Coin(1130, 260));
        lvl.coins.add(new Coin(1780, 260));
        lvl.coins.add(new Coin(1980, 210));
        lvl.coins.add(new Coin(1300, 360));
        lvl.coins.add(new Coin(1400, 360));
        lvl.coins.add(new Coin(1500, 360));

        lvl.enemies.add(new Enemy(600, 372, 450, 900));
        lvl.enemies.add(new Enemy(1200, 372, 1000, 1500));
        lvl.enemies.add(new Enemy(1900, 372, 1600, 2400));
        lvl.enemies.add(new Enemy(2200, 372, 2000, 2450));

        lvl.flagX = 2850;
        lvl.levelWidth = 3000;
        return lvl;
    }
}
