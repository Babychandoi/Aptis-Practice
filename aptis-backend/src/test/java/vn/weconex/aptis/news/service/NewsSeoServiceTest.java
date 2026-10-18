package vn.weconex.aptis.news.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.Optional;
import javax.imageio.ImageIO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.common.util.Enums.AssetType;
import vn.weconex.aptis.common.util.Enums.AssetStatus;
import vn.weconex.aptis.news.domain.NewsPost;
import vn.weconex.aptis.news.repository.NewsPostRepository;
import vn.weconex.aptis.news.web.NewsSeoController;

class NewsSeoServiceTest {
    NewsPostRepository posts = mock(NewsPostRepository.class);
    AssetRepository assets = mock(AssetRepository.class);
    MinioStorageClient storage = mock(MinioStorageClient.class);
    NewsSeoService service;
    NewsPost post;

    @BeforeEach void setUp() {
        service = new NewsSeoService(posts, assets, storage, new ObjectMapper(), "https://aptispractices.io.vn");
        post = new NewsPost(); post.setSlug("du-doan-13-10"); post.setTitle("Dự đoán 13/10 & luyện thi");
        post.setBody("## Reading\n\n**Chủ đề ưu tiên**\n\n- Four-day work week\n- Mountain summits");
        post.setPublishedAt(Instant.parse("2026-10-13T01:00:00Z"));
        post.setUpdatedAt(Instant.parse("2026-10-13T02:00:00Z")); post.setStatus(NewsPost.PostStatus.PUBLISHED);
        when(posts.findBySlug(post.getSlug())).thenReturn(Optional.of(post));
    }
    @Test void returnsUniqueMetadataAndFullArticleInInitialHtml() {
        post.setExcerpt("Ôn Reading và Listening đúng trọng tâm.");
        String html = service.article(post);
        assertThat(html).contains("<title>Dự đoán 13/10 &amp; luyện thi | Aptis Practice</title>")
                .contains("content=\"article\"").contains("https://aptispractices.io.vn/bang-tin/du-doan-13-10")
                .contains("/news-images/du-doan-13-10?v=").contains("Ôn Reading và Listening đúng trọng tâm.")
                .contains("<h2>Reading</h2>").contains("<strong>Chủ đề ưu tiên</strong>")
                .contains("BlogPosting").contains("datePublished").contains("news-bootstrap.js");
        verify(posts, never()).incrementViewCount(any());
    }
    @Test void hiddenArticlesAndUnknownSlugsAre404AndNoindex() {
        var controller = new NewsSeoController(service);
        post.setStatus(NewsPost.PostStatus.DRAFT);
        var response = controller.article(post.getSlug());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).contains("noindex").doesNotContain(post.getBody());
        post.setStatus(NewsPost.PostStatus.ARCHIVED);
        assertThat(service.published(post.getSlug())).isEmpty();
        assertThat(service.published("not-found")).isEmpty();
        assertThat(service.published("../admin")).isEmpty();
    }
    @Test void rawHtmlJavascriptLinksAndClosingScriptCannotExecute() {
        post.setTitle("</title><script>alert(1)</script>");
        post.setBody("<script>alert(2)</script>\n\n[click](javascript:alert%281%29)\n\n![x](javascript:alert%281%29)");
        String html = service.article(post);
        assertThat(html).doesNotContain("<script>alert(").doesNotContain("href=\"javascript:")
                .doesNotContain("src=\"javascript:").contains("\\u003c/script\\u003e");
    }
    @Test void fallbackDescriptionsDoNotContainMarkdownSyntaxOrImageUrls() {
        post.setBody("# Chủ đề\n\n**Luyện tập** [ở đây](https://example.com) ![ảnh](/private/image.png)");
        assertThat(service.metadata(post).description()).isEqualTo("Chủ đề Luyện tập ở đây");
    }
    @Test void generatedImagesArePng1200By630AndDifferBetweenArticles() throws Exception {
        byte[] first = service.image(post).bytes();
        var image = ImageIO.read(new ByteArrayInputStream(first));
        assertThat(image.getWidth()).isEqualTo(1200); assertThat(image.getHeight()).isEqualTo(630);
        assertThat(service.image(post).bytes()).isSameAs(first);
        post.setId("different-post"); post.setTitle("Một bài viết khác");
        assertThat(service.image(post).bytes()).isNotEqualTo(first);
    }
    @Test void uploadedNewsImageIsPreferredButPrivateAssetsCannotBeExposed() throws Exception {
        post.setCoverAssetId("cover"); Asset asset = new Asset(); asset.setStatus(AssetStatus.READY);
        asset.setAssetType(AssetType.NEWS_IMAGE); asset.setMimeType("image/jpeg");
        asset.setBucketName("public"); asset.setObjectKey("news/cover.jpg");
        when(assets.findById("cover")).thenReturn(Optional.of(asset));
        when(storage.download("public", "news/cover.jpg")).thenReturn(new byte[]{1, 2, 3});
        assertThat(service.image(post).mimeType()).isEqualTo("image/jpeg");
        assertThat(service.metadata(post).imageWidth()).isNull();
        asset.setAssetType(AssetType.USER_RECORDING);
        assertThat(service.image(post).mimeType()).isEqualTo("image/png");
        verify(storage, times(1)).download(any(), any());
    }
    @Test void firstInlineNewsImageIsUsedOnlyAfterAssetTypeValidation() throws Exception {
        String id = "12345678-1234-1234-1234-123456789abc";
        post.setBody("![Bìa](/api/v1/news/images/" + id + ")\n\nNội dung.");
        Asset image = new Asset(); image.setStatus(AssetStatus.READY); image.setAssetType(AssetType.NEWS_IMAGE);
        image.setMimeType("image/png"); image.setBucketName("public"); image.setObjectKey("news/image.png");
        when(assets.findById(id)).thenReturn(Optional.of(image));
        when(storage.download("public", "news/image.png")).thenReturn(new byte[]{1});
        assertThat(service.image(post).bytes()).containsExactly(1);
        image.setStatus(AssetStatus.UPLOADING);
        assertThat(service.image(post).bytes().length).isGreaterThan(1000);
    }
    @Test void sitemapAndFeedIncludeOnlyPublishedRepositoryResults() {
        when(posts.findPublishedFeed(any())).thenReturn(new PageImpl<>(java.util.List.of(post)));
        assertThat(service.sitemap()).contains("/bang-tin/du-doan-13-10</loc>").contains("<lastmod>2026-10-13T02:00:00Z</lastmod>");
        assertThat(service.feed()).contains("<h1>Bảng tin</h1>").contains("href=\"/bang-tin/du-doan-13-10\"");
    }
}
