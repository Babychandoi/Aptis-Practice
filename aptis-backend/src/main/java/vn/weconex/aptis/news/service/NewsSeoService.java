package vn.weconex.aptis.news.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.common.util.Enums.AssetType;
import vn.weconex.aptis.news.domain.NewsPost;
import vn.weconex.aptis.news.repository.NewsPostRepository;

/** Public SEO reads published articles only, never questions, answers or user data. */
@Service
public class NewsSeoService {
    private static final Pattern INLINE_IMAGE = Pattern.compile("!\\[[^\\]]*]\\(/api/v1/news/images/([a-fA-F0-9-]{36})\\)");
    private final NewsPostRepository posts;
    private final AssetRepository assets;
    private final MinioStorageClient storage;
    private final ObjectMapper mapper;
    private final String origin;
    private final Parser parser = Parser.builder().build();
    private final HtmlRenderer markdown = HtmlRenderer.builder().escapeHtml(true).sanitizeUrls(true).build();
    // Small bounded cache; unpublished/archived status is checked before accessing it.
    private final Map<String, byte[]> imageCache = new LinkedHashMap<>(32, .75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<String, byte[]> entry) { return size() > 32; }
    };

    public NewsSeoService(NewsPostRepository posts, AssetRepository assets, MinioStorageClient storage,
            ObjectMapper mapper, @Value("${aptis.seo.public-origin:https://aptispractices.io.vn}") String origin) {
        this.posts = posts; this.assets = assets; this.storage = storage; this.mapper = mapper;
        this.origin = origin.replaceAll("/+$", "");
        java.net.URI uri = java.net.URI.create(this.origin);
        if (!List.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null
                || uri.getRawQuery() != null || uri.getRawFragment() != null || uri.getUserInfo() != null
                || (uri.getPath() != null && !uri.getPath().isEmpty())) {
            throw new IllegalArgumentException("SEO public origin must be a fixed HTTP(S) origin");
        }
    }

    public Optional<NewsPost> published(String slug) {
        if (!slug.matches("[a-z0-9-]{1,160}")) return Optional.empty();
        return posts.findBySlug(slug).filter(NewsPost::isPublished);
    }

    public record Metadata(String title, String description, String canonical, String image,
            String imageType, Integer imageWidth, Integer imageHeight, String publishedAt,
            String modifiedAt, Map<String, Object> jsonLd) {}
    public record ShareImage(byte[] bytes, String mimeType) {}

    private Optional<Asset> publicImage(NewsPost post) {
        String id = post.getCoverAssetId();
        if (id == null) {
            var match = INLINE_IMAGE.matcher(post.getBody());
            if (match.find()) id = match.group(1);
        }
        return id == null ? Optional.empty() : assets.findById(id)
                .filter(Asset::isReady).filter(a -> a.getAssetType() == AssetType.NEWS_IMAGE)
                .filter(a -> List.of("image/jpeg", "image/png", "image/webp", "image/gif").contains(a.getMimeType()));
    }

    public Metadata metadata(NewsPost post) {
        String canonical = origin + "/bang-tin/" + post.getSlug();
        String image = origin + "/news-images/" + post.getSlug() + "?v="
                + (post.getUpdatedAt() == null ? "1" : post.getUpdatedAt().toEpochMilli());
        var cover = publicImage(post);
        Map<String, Object> jsonLd = new LinkedHashMap<>();
        jsonLd.put("@context", "https://schema.org"); jsonLd.put("@type", "BlogPosting");
        jsonLd.put("headline", post.getTitle()); jsonLd.put("description", description(post));
        jsonLd.put("url", canonical); jsonLd.put("mainEntityOfPage", canonical);
        jsonLd.put("image", List.of(image)); jsonLd.put("inLanguage", "vi-VN");
        var organization = Map.of("@type", "Organization", "name", "Aptis Practice", "url", origin,
                "logo", Map.of("@type", "ImageObject", "url", origin + "/icon-512.png"));
        jsonLd.put("author", organization); jsonLd.put("publisher", organization);
        if (post.getPublishedAt() != null) jsonLd.put("datePublished", post.getPublishedAt().toString());
        if (post.getUpdatedAt() != null) jsonLd.put("dateModified", post.getUpdatedAt().toString());
        return new Metadata(post.getTitle() + " | Aptis Practice", description(post), canonical, image,
                cover.map(Asset::getMimeType).orElse("image/png"), cover.isPresent() ? cover.get().getWidth() : Integer.valueOf(1200),
                cover.isPresent() ? cover.get().getHeight() : Integer.valueOf(630),
                post.getPublishedAt() == null ? null : post.getPublishedAt().toString(),
                post.getUpdatedAt() == null ? null : post.getUpdatedAt().toString(), jsonLd);
    }

    public ShareImage image(NewsPost post) throws java.io.IOException {
        var cover = publicImage(post);
        if (cover.isPresent()) {
            Asset asset = cover.get();
            return new ShareImage(storage.download(asset.getBucketName(), asset.getObjectKey()), asset.getMimeType());
        }
        String key = post.getId() + ":" + post.getUpdatedAt();
        synchronized (imageCache) {
            byte[] content = imageCache.get(key);
            if (content == null) { content = NewsShareImage.render(post); imageCache.put(key, content); }
            return new ShareImage(content, "image/png");
        }
    }

    public String article(NewsPost post) {
        Metadata data = metadata(post);
        String content = "<article><h1>" + escape(post.getTitle()) + "</h1>"
                + (post.getPublishedAt() == null ? "" : "<p><time datetime=\"" + post.getPublishedAt() + "\">"
                    + post.getPublishedAt().atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate() + "</time></p>")
                + "<div class=\"news-content\">" + markdown.render(parser.parse(post.getBody())) + "</div>"
                + "<p><a href=\"/login\">Đăng nhập để luyện đề và tham gia bình luận</a></p></article>";
        return document(data, content, "article", true);
    }

    public String feed() {
        var data = new Metadata("Bảng tin | Aptis Practice", "Cách làm bài, dự đoán đề và thông báo mới nhất từ Aptis Practice.",
                origin + "/bang-tin", origin + "/og-image.jpg", "image/jpeg", 1200, 630, null, null,
                Map.of("@context", "https://schema.org", "@type", "CollectionPage", "name", "Bảng tin", "url", origin + "/bang-tin"));
        StringBuilder content = new StringBuilder("<h1>Bảng tin</h1><p>Hướng dẫn luyện thi và dự đoán đề Aptis.</p>");
        for (NewsPost post : posts.findPublishedFeed(PageRequest.of(0, 50))) {
            content.append("<article><h2><a href=\"/bang-tin/").append(escape(post.getSlug())).append("\">")
                    .append(escape(post.getTitle())).append("</a></h2><p>").append(escape(description(post))).append("</p></article>");
        }
        return document(data, content.toString(), "website", true);
    }

    public String notFound() {
        return "<!doctype html><html lang=\"vi\"><head><meta charset=\"UTF-8\"><meta name=\"robots\" content=\"noindex,follow\">"
                + "<title>Không tìm thấy bài viết | Aptis Practice</title></head><body><h1>Bài viết không tồn tại hoặc đã bị ẩn</h1>"
                + "<a href=\"/bang-tin\">Về bảng tin</a></body></html>";
    }

    public String sitemap() {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
        for (String path : List.of("/", "/login", "/register", "/bang-tin")) {
            xml.append("<url><loc>").append(escape(origin + path)).append("</loc></url>");
        }
        for (NewsPost post : posts.findPublishedFeed(PageRequest.of(0, 49996))) {
            xml.append("<url><loc>").append(escape(origin + "/bang-tin/" + post.getSlug())).append("</loc>");
            if (post.getUpdatedAt() != null) xml.append("<lastmod>").append(post.getUpdatedAt()).append("</lastmod>");
            xml.append("</url>");
        }
        return xml.append("</urlset>").toString();
    }

    private String document(Metadata data, String content, String type, boolean bootstrap) {
        StringBuilder head = new StringBuilder("<!doctype html><html lang=\"vi\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
        head.append("<title>").append(escape(data.title())).append("</title>")
                .append("<link rel=\"canonical\" href=\"").append(escape(data.canonical())).append("\">")
                .append("<link rel=\"icon\" href=\"/favicon.ico\"><link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\">")
                .append("<link rel=\"manifest\" href=\"/site.webmanifest\">");
        meta(head, "name", "description", data.description()); meta(head, "name", "robots", "index,follow,max-image-preview:large");
        meta(head, "property", "og:type", type); meta(head, "property", "og:site_name", "Aptis Practice");
        meta(head, "property", "og:locale", "vi_VN"); meta(head, "property", "og:title", data.title());
        meta(head, "property", "og:description", data.description()); meta(head, "property", "og:url", data.canonical());
        meta(head, "property", "og:image", data.image()); meta(head, "property", "og:image:alt", data.title());
        meta(head, "property", "og:image:type", data.imageType());
        if (data.imageWidth() != null) meta(head, "property", "og:image:width", data.imageWidth().toString());
        if (data.imageHeight() != null) meta(head, "property", "og:image:height", data.imageHeight().toString());
        meta(head, "property", "article:published_time", data.publishedAt()); meta(head, "property", "article:modified_time", data.modifiedAt());
        meta(head, "name", "twitter:card", "summary_large_image"); meta(head, "name", "twitter:title", data.title());
        meta(head, "name", "twitter:description", data.description()); meta(head, "name", "twitter:image", data.image());
        head.append("<script id=\"news-jsonld\" type=\"application/ld+json\">").append(json(data.jsonLd())).append("</script>")
                .append("<style>.news-server{font:16px/1.75 system-ui,sans-serif;color:#111827;max-width:860px;margin:24px auto;padding:24px}.news-server a{color:#5b52e8}.news-server img{max-width:100%;height:auto}.news-server h1{line-height:1.25;font-size:32px}.news-server pre{overflow:auto;background:#f1f5f9;padding:16px}.news-server nav{display:flex;justify-content:space-between;gap:16px;margin-bottom:32px}</style>")
                .append("</head><body><div id=\"root\"><main class=\"news-server\"><nav><a href=\"/bang-tin\">Aptis Practice · Bảng tin</a><a href=\"/login\">Đăng nhập</a></nav>")
                .append(content).append("</main></div>");
        if (bootstrap) head.append("<script type=\"module\" src=\"/news-bootstrap.js\"></script>");
        return head.append("</body></html>").toString();
    }

    private String json(Object value) {
        try { return mapper.writeValueAsString(value).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026"); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Cannot render news schema", ex); }
    }
    private static void meta(StringBuilder html, String kind, String key, String value) {
        if (value != null) html.append("<meta ").append(kind).append("=\"").append(key).append("\" content=\"").append(escape(value)).append("\">");
    }
    private static String escape(String text) { return HtmlUtils.htmlEscape(text == null ? "" : text, "UTF-8"); }
    static String description(NewsPost post) {
        String plain = post.getExcerpt() == null || post.getExcerpt().isBlank()
                ? post.getBody().replaceAll("!\\[[^]]*]\\([^)]*\\)", " ").replaceAll("\\[([^]]*)]\\([^)]*\\)", "$1")
                    .replaceAll("(?m)^#{1,6}\\s*", "").replaceAll("[*_`>]+", "") : post.getExcerpt();
        plain = plain.replaceAll("\\s+", " ").trim();
        return plain.length() <= 200 ? plain : plain.substring(0, 197).stripTrailing() + "…";
    }
}
