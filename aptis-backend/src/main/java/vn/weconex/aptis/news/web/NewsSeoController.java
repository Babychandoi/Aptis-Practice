package vn.weconex.aptis.news.web;

import java.io.IOException;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.news.service.NewsSeoService;

@RestController
@RequestMapping("/api/v1/news-seo")
@RequiredArgsConstructor
public class NewsSeoController {
    private final NewsSeoService seo;
    private static final MediaType HTML = MediaType.parseMediaType("text/html;charset=UTF-8");

    @GetMapping("/pages/{slug}")
    public ResponseEntity<String> article(@PathVariable String slug) {
        return seo.published(slug).map(post -> ResponseEntity.ok().contentType(HTML)
                .cacheControl(CacheControl.noCache()).body(seo.article(post)))
                .orElseGet(() -> ResponseEntity.status(404).contentType(HTML).cacheControl(CacheControl.noStore())
                        .header("X-Robots-Tag", "noindex").body(seo.notFound()));
    }
    @GetMapping("/feed")
    public ResponseEntity<String> feed() {
        return ResponseEntity.ok().contentType(HTML).cacheControl(CacheControl.noCache()).body(seo.feed());
    }
    @GetMapping("/metadata/{slug}")
    public NewsSeoService.Metadata metadata(@PathVariable String slug) {
        return seo.metadata(seo.published(slug).orElseThrow(() -> ApiException.notFound("NewsPost", slug)));
    }
    @GetMapping("/images/{slug}")
    public ResponseEntity<byte[]> image(@PathVariable String slug) throws IOException {
        var post = seo.published(slug).orElseThrow(() -> ApiException.notFound("NewsPost", slug));
        var image = seo.image(post);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.mimeType()))
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .eTag("\"" + post.getId() + "-" + post.getUpdatedAt().toEpochMilli() + "\"").body(image.bytes());
    }
    @GetMapping("/sitemap")
    public ResponseEntity<String> sitemap() {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/xml;charset=UTF-8"))
                .cacheControl(CacheControl.noCache()).body(seo.sitemap());
    }
}
