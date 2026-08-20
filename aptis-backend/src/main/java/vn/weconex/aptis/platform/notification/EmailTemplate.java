package vn.weconex.aptis.platform.notification;

import java.util.ArrayList;
import java.util.List;

/**
 * Dựng HTML cho email hệ thống.
 *
 * <p>Thư dạng text thuần với một URL trần trông hệt email lừa đảo, và bộ lọc
 * spam cũng đánh giá thấp. Ở đây trả về HTML có nhận diện thương hiệu, kèm bản
 * text thuần song song cho client không đọc HTML.
 *
 * <p>Ba giới hạn của HTML email quyết định cách viết dưới đây:
 * <ol>
 *   <li>Gmail cắt bỏ thẻ style trong nhiều trường hợp, nên mọi style phải viết
 *       inline trực tiếp trên từng thẻ.</li>
 *   <li>Outlook (engine Word) không hỗ trợ flexbox/grid, nên bố cục dùng table
 *       — cách duy nhất chạy đúng ở mọi client.</li>
 *   <li>Không nhúng ảnh từ ngoài: nhiều client chặn ảnh mặc định, logo dạng ảnh
 *       sẽ thành ô vuông trống. Dùng chữ và màu thay cho ảnh.</li>
 * </ol>
 */
public final class EmailTemplate {

    /** Primary Electric Violet — khớp brand-600 của giao diện web. */
    private static final String BRAND = "#5b52e8";
    private static final String BRAND_DARK = "#3d35c4";
    private static final String INK = "#15161a";
    private static final String MUTED = "#6b7280";
    private static final String BORDER = "#e5e7eb";
    private static final String SURFACE = "#f5f5f2";

    private static final String FONT_STACK =
            "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif";

    private EmailTemplate() {
    }

    /** Một email hoàn chỉnh: có bản HTML và bản text thuần tương ứng. */
    public record Rendered(String html, String text) {
    }

    /** Nút bấm chính trong thư. */
    public record Action(String label, String url) {
    }

    public static Builder builder(String heading) {
        return new Builder(heading);
    }

    public static final class Builder {
        private final String heading;
        private String intro;
        private final List<String> paragraphs = new ArrayList<>();
        private final List<String[]> facts = new ArrayList<>();
        private Action action;
        private String actionNote;
        private String footerNote;

        private Builder(String heading) {
            this.heading = heading;
        }

        /** Câu mở đầu, đậm hơn phần thân. */
        public Builder intro(String value) {
            this.intro = value;
            return this;
        }

        public Builder paragraph(String value) {
            this.paragraphs.add(value);
            return this;
        }

        /** Dòng dữ liệu dạng nhãn — giá trị (mã đơn, số tiền...). */
        public Builder fact(String label, String value) {
            this.facts.add(new String[] {label, value});
            return this;
        }

        public Builder action(String label, String url) {
            this.action = new Action(label, url);
            return this;
        }

        /** Ghi chú nhỏ dưới nút, ví dụ thời hạn hiệu lực của liên kết. */
        public Builder actionNote(String value) {
            this.actionNote = value;
            return this;
        }

        public Builder footerNote(String value) {
            this.footerNote = value;
            return this;
        }

        public Rendered build() {
            return new Rendered(renderHtml(), renderText());
        }

        private String renderHtml() {
            StringBuilder body = new StringBuilder();

            if (intro != null) {
                body.append("<p style=\"margin:0 0 16px;font-size:16px;line-height:26px;color:")
                        .append(INK).append(";\">").append(escape(intro)).append("</p>");
            }

            for (String paragraph : paragraphs) {
                body.append("<p style=\"margin:0 0 16px;font-size:15px;line-height:24px;color:")
                        .append(MUTED).append(";\">").append(escape(paragraph)).append("</p>");
            }

            if (!facts.isEmpty()) {
                body.append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"")
                        .append(" width=\"100%\" style=\"margin:0 0 20px;border:1px solid ")
                        .append(BORDER).append(";border-radius:10px;background:")
                        .append(SURFACE).append(";\">");
                for (String[] fact : facts) {
                    body.append("<tr><td style=\"padding:10px 16px;font-size:13px;color:")
                            .append(MUTED).append(";white-space:nowrap;\">").append(escape(fact[0]))
                            .append("</td><td style=\"padding:10px 16px;font-size:14px;")
                            .append("font-weight:600;text-align:right;color:").append(INK)
                            .append(";\">").append(escape(fact[1])).append("</td></tr>");
                }
                body.append("</table>");
            }

            if (action != null) {
                // Nút dùng thẻ a có padding chứ không phải button: button trong
                // email không bấm được ở nhiều client.
                body.append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"")
                        .append(" style=\"margin:0 0 14px;\"><tr><td style=\"border-radius:10px;background:")
                        .append(BRAND).append(";\"><a href=\"").append(escapeAttr(action.url()))
                        .append("\" style=\"display:inline-block;padding:13px 26px;font-size:15px;")
                        .append("font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;\">")
                        .append(escape(action.label())).append("</a></td></tr></table>");

                // In cả URL dạng chữ: một số client webmail bỏ href, và người
                // cẩn thận muốn xem đích trước khi bấm — thấy đúng tên miền
                // aptispractices.io.vn là dấu hiệu thư thật.
                body.append("<p style=\"margin:0 0 6px;font-size:12px;line-height:20px;color:")
                        .append(MUTED).append(";\">Nút không bấm được? Sao chép liên kết này vào")
                        .append(" trình duyệt:<br><span style=\"word-break:break-all;color:")
                        .append(BRAND_DARK).append(";\">").append(escape(action.url()))
                        .append("</span></p>");
            }

            if (actionNote != null) {
                body.append("<p style=\"margin:0;font-size:13px;line-height:21px;color:")
                        .append(MUTED).append(";\">").append(escape(actionNote)).append("</p>");
            }

            StringBuilder footer = new StringBuilder();
            if (footerNote != null) {
                footer.append("<p style=\"margin:0 0 8px;font-size:12px;line-height:20px;color:")
                        .append(MUTED).append(";\">").append(escape(footerNote)).append("</p>");
            }

            return new StringBuilder()
                    .append("<!DOCTYPE html><html lang=\"vi\"><head><meta charset=\"utf-8\">")
                    .append("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">")
                    .append("<title>").append(escape(heading)).append("</title></head>")
                    .append("<body style=\"margin:0;padding:0;background:").append(SURFACE).append(";\">")
                    .append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"")
                    .append(" width=\"100%\" style=\"background:").append(SURFACE)
                    .append(";padding:28px 12px;\"><tr><td align=\"center\">")
                    .append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"")
                    .append(" width=\"100%\" style=\"max-width:560px;background:#ffffff;border:1px solid ")
                    .append(BORDER).append(";border-radius:14px;font-family:").append(FONT_STACK)
                    .append(";\">")
                    .append("<tr><td style=\"padding:22px 28px;border-bottom:1px solid ")
                    .append(BORDER).append(";\">")
                    .append("<span style=\"font-size:17px;font-weight:800;letter-spacing:-.3px;color:")
                    .append(INK).append(";\">Aptis Practice</span>")
                    .append("<span style=\"font-size:11px;font-weight:700;letter-spacing:1.5px;color:")
                    .append(BRAND).append(";\">&nbsp;GENERAL</span>")
                    .append("</td></tr><tr><td style=\"padding:28px;\">")
                    .append("<h1 style=\"margin:0 0 18px;font-size:20px;line-height:28px;")
                    .append("font-weight:800;color:").append(INK).append(";\">")
                    .append(escape(heading)).append("</h1>")
                    .append(body)
                    .append("</td></tr><tr><td style=\"padding:18px 28px 24px;border-top:1px solid ")
                    .append(BORDER).append(";\">").append(footer)
                    .append("<p style=\"margin:0;font-size:12px;line-height:20px;color:").append(MUTED)
                    .append(";\">Email tự động từ Aptis Practice — vui lòng không trả lời thư này.</p>")
                    .append("</td></tr></table></td></tr></table></body></html>")
                    .toString();
        }

        private String renderText() {
            StringBuilder out = new StringBuilder();
            out.append(heading).append("\n\n");

            if (intro != null) {
                out.append(intro).append("\n\n");
            }
            for (String paragraph : paragraphs) {
                out.append(paragraph).append("\n\n");
            }
            for (String[] fact : facts) {
                out.append(fact[0]).append(": ").append(fact[1]).append('\n');
            }
            if (!facts.isEmpty()) {
                out.append('\n');
            }
            if (action != null) {
                out.append(action.label()).append(":\n").append(action.url()).append("\n\n");
            }
            if (actionNote != null) {
                out.append(actionNote).append("\n\n");
            }
            if (footerNote != null) {
                out.append(footerNote).append('\n');
            }
            out.append("---\nAptis Practice — email tự động, vui lòng không trả lời.\n");
            return out.toString();
        }
    }

    /**
     * Chống HTML injection: tên gói hay mã đơn đi vào thư đều từ dữ liệu, không
     * phải hằng số trong code.
     */
    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    /** URL nằm trong thuộc tính href nên phải bọc thêm dấu nháy đơn. */
    private static String escapeAttr(String value) {
        return escape(value).replace("'", "&#39;");
    }
}
