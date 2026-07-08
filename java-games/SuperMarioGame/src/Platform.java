import java.awt.Color;
import java.awt.Graphics2D;

public class Platform {
    public Rect rect;
    public boolean isGround;

    public Platform(double x, double y, double w, double h, boolean isGround) {
        this.rect = new Rect(x, y, w, h);
        this.isGround = isGround;
    }

    public void draw(Graphics2D g, int camX) {
        int sx = (int) rect.x - camX;
        if (isGround) {
            g.setColor(new Color(155, 103, 60));
            g.fillRect(sx, (int) rect.y, (int) rect.w, (int) rect.h);
            g.setColor(new Color(94, 168, 58));
            g.fillRect(sx, (int) rect.y, (int) rect.w, 10);
        } else {
            g.setColor(new Color(196, 128, 60));
            g.fillRect(sx, (int) rect.y, (int) rect.w, (int) rect.h);
            g.setColor(new Color(139, 87, 42));
            g.drawRect(sx, (int) rect.y, (int) rect.w, (int) rect.h);
        }
    }
}
