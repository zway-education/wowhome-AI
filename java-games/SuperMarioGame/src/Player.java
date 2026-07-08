import java.awt.Color;
import java.awt.Graphics2D;

public class Player {
    public Rect rect;
    public double vx = 0, vy = 0;
    public boolean onGround = false;
    public boolean facingRight = true;
    public int lives = 3;
    public int score = 0;

    private static final double SPEED = 4.0;
    private static final double JUMP_FORCE = -13.5;
    private static final double GRAVITY = 0.6;
    private static final double MAX_FALL = 15;

    public Player(double x, double y) {
        this.rect = new Rect(x, y, 30, 40);
    }

    public void moveLeft() {
        vx = -SPEED;
        facingRight = false;
    }

    public void moveRight() {
        vx = SPEED;
        facingRight = true;
    }

    public void stop() {
        vx = 0;
    }

    public void jump() {
        if (onGround) {
            vy = JUMP_FORCE;
            onGround = false;
        }
    }

    public void applyGravity() {
        vy += GRAVITY;
        if (vy > MAX_FALL) vy = MAX_FALL;
    }

    public void reset(double x, double y) {
        rect.x = x;
        rect.y = y;
        vx = 0;
        vy = 0;
    }

    public void draw(Graphics2D g, int camX) {
        int sx = (int) rect.x - camX;
        int sy = (int) rect.y;
        g.setColor(new Color(210, 30, 30));
        g.fillRect(sx, sy, (int) rect.w, 16);
        g.setColor(new Color(255, 200, 160));
        g.fillRect(sx + 4, sy + 14, (int) rect.w - 8, 12);
        g.setColor(new Color(30, 60, 200));
        g.fillRect(sx, sy + 24, (int) rect.w, 16);
        g.setColor(new Color(90, 50, 20));
        g.fillRect(sx, sy + 36, 8, 4);
        g.fillRect(sx + (int) rect.w - 8, sy + 36, 8, 4);
    }
}
