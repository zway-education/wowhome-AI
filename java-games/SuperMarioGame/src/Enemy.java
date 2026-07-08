import java.awt.Color;
import java.awt.Graphics2D;

public class Enemy {
    public Rect rect;
    public double vx = -1.2;
    public boolean alive = true;
    private double patrolLeft, patrolRight;

    public Enemy(double x, double y, double patrolLeft, double patrolRight) {
        this.rect = new Rect(x, y, 28, 28);
        this.patrolLeft = patrolLeft;
        this.patrolRight = patrolRight;
    }

    public void update() {
        if (!alive) return;
        rect.x += vx;
        if (rect.x <= patrolLeft || rect.x + rect.w >= patrolRight) {
            vx = -vx;
        }
    }

    public void draw(Graphics2D g, int camX) {
        if (!alive) return;
        int sx = (int) rect.x - camX;
        int sy = (int) rect.y;
        g.setColor(new Color(155, 74, 40));
        g.fillOval(sx, sy, (int) rect.w, (int) rect.h);
        g.setColor(Color.WHITE);
        g.fillOval(sx + 4, sy + 8, 6, 6);
        g.fillOval(sx + 18, sy + 8, 6, 6);
        g.setColor(Color.BLACK);
        g.fillOval(sx + 6, sy + 10, 3, 3);
        g.fillOval(sx + 20, sy + 10, 3, 3);
    }
}
