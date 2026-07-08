import java.awt.Color;
import java.awt.Graphics2D;

public class Coin {
    public Rect rect;
    public boolean collected = false;
    private int animTick = 0;

    public Coin(double x, double y) {
        this.rect = new Rect(x, y, 20, 20);
    }

    public void update() {
        animTick++;
    }

    public void draw(Graphics2D g, int camX) {
        if (collected) return;
        int bob = (int) (Math.sin(animTick * 0.15) * 3);
        int sx = (int) rect.x - camX;
        int sy = (int) rect.y + bob;
        g.setColor(new Color(255, 215, 0));
        g.fillOval(sx, sy, (int) rect.w, (int) rect.h);
        g.setColor(new Color(200, 150, 0));
        g.drawOval(sx, sy, (int) rect.w, (int) rect.h);
    }
}
