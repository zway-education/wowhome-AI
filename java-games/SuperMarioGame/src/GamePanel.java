import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import javax.swing.JPanel;
import javax.swing.Timer;

public class GamePanel extends JPanel {
    public static final int WIDTH = 900;
    public static final int HEIGHT = 500;
    private static final int FLOOR_Y = 500;

    private enum State { MENU, PLAYING, WIN, GAME_OVER }

    private State state = State.MENU;
    private Level level;
    private Player player;
    private int camX = 0;
    private Timer timer;
    private boolean leftPressed, rightPressed;

    public GamePanel() {
        setPreferredSize(new java.awt.Dimension(WIDTH, HEIGHT));
        setFocusable(true);
        setBackground(new Color(92, 148, 252));

        addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                handleKeyPress(e.getKeyCode());
            }

            @Override
            public void keyReleased(KeyEvent e) {
                handleKeyRelease(e.getKeyCode());
            }
        });

        resetGame();
    }

    private void resetGame() {
        level = Level.buildLevel1();
        player = new Player(level.startX, level.startY);
        camX = 0;
    }

    private void handleKeyPress(int code) {
        if (state == State.MENU && code == KeyEvent.VK_ENTER) {
            state = State.PLAYING;
            return;
        }
        if ((state == State.WIN || state == State.GAME_OVER) && code == KeyEvent.VK_ENTER) {
            resetGame();
            state = State.PLAYING;
            return;
        }
        if (state != State.PLAYING) return;

        if (code == KeyEvent.VK_LEFT || code == KeyEvent.VK_A) leftPressed = true;
        if (code == KeyEvent.VK_RIGHT || code == KeyEvent.VK_D) rightPressed = true;
        if (code == KeyEvent.VK_SPACE || code == KeyEvent.VK_UP || code == KeyEvent.VK_W) player.jump();
    }

    private void handleKeyRelease(int code) {
        if (code == KeyEvent.VK_LEFT || code == KeyEvent.VK_A) leftPressed = false;
        if (code == KeyEvent.VK_RIGHT || code == KeyEvent.VK_D) rightPressed = false;
    }

    public void startGame() {
        timer = new Timer(16, e -> {
            update();
            repaint();
        });
        timer.start();
    }

    private void update() {
        if (state != State.PLAYING) return;

        if (leftPressed) player.moveLeft();
        else if (rightPressed) player.moveRight();
        else player.stop();

        player.applyGravity();
        player.rect.x += player.vx;
        clampAndResolveHorizontal();

        player.rect.y += player.vy;
        player.onGround = false;
        resolveVertical();

        if (player.rect.x < 0) player.rect.x = 0;

        if (player.rect.y > FLOOR_Y + 100) {
            loseLife();
        }

        for (Coin c : level.coins) {
            c.update();
            if (!c.collected && player.rect.intersects(c.rect)) {
                c.collected = true;
                player.score += 100;
            }
        }

        for (Enemy en : level.enemies) {
            en.update();
            if (!en.alive) continue;
            if (player.rect.intersects(en.rect)) {
                boolean stomp = player.vy > 0 && (player.rect.y + player.rect.h - en.rect.y) < 18;
                if (stomp) {
                    en.alive = false;
                    player.vy = -8;
                    player.score += 200;
                } else {
                    loseLife();
                }
            }
        }

        if (player.rect.x + player.rect.w >= level.flagX) {
            state = State.WIN;
        }

        int target = (int) player.rect.x - WIDTH / 2 + (int) player.rect.w / 2;
        target = Math.max(0, Math.min(target, (int) level.levelWidth - WIDTH));
        camX = target;
    }

    private void loseLife() {
        player.lives--;
        if (player.lives <= 0) {
            state = State.GAME_OVER;
        } else {
            player.reset(level.startX, level.startY);
        }
    }

    private void clampAndResolveHorizontal() {
        for (Platform p : level.platforms) {
            if (player.rect.intersects(p.rect)) {
                if (player.vx > 0) {
                    player.rect.x = p.rect.x - player.rect.w;
                } else if (player.vx < 0) {
                    player.rect.x = p.rect.x + p.rect.w;
                }
            }
        }
    }

    private void resolveVertical() {
        for (Platform p : level.platforms) {
            if (player.rect.intersects(p.rect)) {
                if (player.vy > 0) {
                    player.rect.y = p.rect.y - player.rect.h;
                    player.vy = 0;
                    player.onGround = true;
                } else if (player.vy < 0) {
                    player.rect.y = p.rect.y + p.rect.h;
                    player.vy = 0;
                }
            }
        }
    }

    @Override
    protected void paintComponent(Graphics g0) {
        super.paintComponent(g0);
        Graphics2D g = (Graphics2D) g0;
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        drawClouds(g);

        switch (state) {
            case MENU -> drawMenu(g);
            case PLAYING -> drawGame(g);
            case WIN -> {
                drawGame(g);
                drawOverlay(g, "恭喜過關！", "按 ENTER 重新開始");
            }
            case GAME_OVER -> {
                drawGame(g);
                drawOverlay(g, "遊戲結束", "按 ENTER 重新開始");
            }
        }
    }

    private void drawClouds(Graphics2D g) {
        g.setColor(Color.WHITE);
        for (int i = 0; i < 6; i++) {
            int cx = (i * 300 - camX / 3) % (WIDTH + 200);
            if (cx < -100) cx += WIDTH + 200;
            g.fillOval(cx, 60, 60, 30);
            g.fillOval(cx + 25, 45, 50, 30);
            g.fillOval(cx + 55, 60, 50, 25);
        }
    }

    private void drawMenu(Graphics2D g) {
        g.setColor(Color.WHITE);
        g.setFont(new Font("Microsoft JhengHei", Font.BOLD, 48));
        drawCentered(g, "超級瑪莉 Java 版", 180);
        g.setFont(new Font("Microsoft JhengHei", Font.PLAIN, 20));
        drawCentered(g, "方向鍵/AD 移動，空白鍵/上鍵 跳躍", 260);
        drawCentered(g, "按 ENTER 開始遊戲", 320);
    }

    private void drawGame(Graphics2D g) {
        for (Platform p : level.platforms) p.draw(g, camX);
        for (Coin c : level.coins) c.draw(g, camX);
        for (Enemy e : level.enemies) e.draw(g, camX);

        int flagSx = (int) level.flagX - camX;
        g.setColor(new Color(60, 160, 60));
        g.fillRect(flagSx, 250, 8, 150);
        g.setColor(Color.RED);
        int[] xs = {flagSx + 8, flagSx + 40, flagSx + 8};
        int[] ys = {250, 265, 280};
        g.fillPolygon(xs, ys, 3);

        player.draw(g, camX);

        g.setColor(Color.WHITE);
        g.setFont(new Font("Microsoft JhengHei", Font.BOLD, 22));
        g.drawString("分數: " + player.score, 20, 30);
        g.drawString("生命: " + player.lives, 20, 58);
    }

    private void drawOverlay(Graphics2D g, String title, String subtitle) {
        g.setColor(new Color(0, 0, 0, 150));
        g.fillRect(0, 0, WIDTH, HEIGHT);
        g.setColor(Color.WHITE);
        g.setFont(new Font("Microsoft JhengHei", Font.BOLD, 44));
        drawCentered(g, title, 220);
        g.setFont(new Font("Microsoft JhengHei", Font.PLAIN, 22));
        drawCentered(g, subtitle, 280);
        drawCentered(g, "最終分數: " + player.score, 320);
    }

    private void drawCentered(Graphics2D g, String text, int y) {
        int textWidth = g.getFontMetrics().stringWidth(text);
        g.drawString(text, (WIDTH - textWidth) / 2, y);
    }
}
