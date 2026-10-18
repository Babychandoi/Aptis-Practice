package vn.weconex.aptis.news.service;

import java.awt.Color;
import java.awt.Font;
import java.awt.GradientPaint;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import javax.imageio.ImageIO;
import vn.weconex.aptis.news.domain.NewsPost;

/** Text-based share card when an article has no uploaded public cover. */
public final class NewsShareImage {
    private NewsShareImage() {}

    public static byte[] render(NewsPost post) throws IOException {
        BufferedImage image = new BufferedImage(1200, 630, BufferedImage.TYPE_INT_RGB);
        var g = image.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g.setPaint(new GradientPaint(0, 0, new Color(17, 24, 39), 1200, 630, new Color(64, 42, 144)));
            g.fillRect(0, 0, 1200, 630);
            g.setColor(new Color(104, 87, 240));
            g.fillRoundRect(72, 70, 250, 48, 24, 24);
            g.setColor(Color.WHITE);
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 22));
            g.drawString("APTIS PRACTICE", 94, 102);
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 58));
            List<String> lines = wrap(post.getTitle(), g.getFontMetrics(), 1050);
            if (lines.size() > 4) {
                g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 48));
                lines = wrap(post.getTitle(), g.getFontMetrics(), 1050);
            }
            for (int i = 0; i < Math.min(lines.size(), 4); i++) {
                g.drawString(lines.get(i), 72, 218 + i * 74);
            }
            g.setColor(new Color(208, 205, 250));
            g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 24));
            String date = post.getPublishedAt() == null ? "Bảng tin" : DateTimeFormatter.ofPattern("dd/MM/yyyy")
                    .withZone(ZoneId.of("Asia/Ho_Chi_Minh")).format(post.getPublishedAt());
            g.drawString("BẢNG TIN  ·  " + date, 72, 548);
            g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 20));
            g.drawString("aptispractices.io.vn", 72, 585);
        } finally { g.dispose(); }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }

    private static List<String> wrap(String text, java.awt.FontMetrics metrics, int width) {
        List<String> lines = new ArrayList<>();
        String line = "";
        for (String word : text.replaceAll("\\s+", " ").trim().split(" ")) {
            String candidate = line.isEmpty() ? word : line + " " + word;
            if (!line.isEmpty() && metrics.stringWidth(candidate) > width) { lines.add(line); line = word; }
            else line = candidate;
        }
        if (!line.isEmpty()) lines.add(line);
        return lines;
    }
}
