package vn.weconex.aptis.asset.service;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.security.AuthPrincipal;
import vn.weconex.aptis.common.util.Enums.AssetStatus;
import vn.weconex.aptis.common.util.Enums.AssetType;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.content.mongo.QuestionSetDocumentRepository;
import vn.weconex.aptis.content.service.ContentAccessService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cổng entitlement cho signed URL của asset nội dung.
 *
 * <p>Trước khi có cổng này, mọi tài khoản đã đăng nhập biết assetId đều xin
 * được signed URL — audio bài Premium rò ra chỉ bằng cách gửi assetId cho
 * người khác. Các test dưới đây khóa lại hành vi đó.
 */
class AssetServiceTest {

    private static final String CONTENT_ASSET_ID = "asset-audio-1";
    private static final String QUESTION_SET_ID = "qs-premium-1";
    private static final String STUDENT_ID = "user-student";

    private AssetRepository assetRepository;
    private MinioStorageClient storageClient;
    private QuestionSetDocumentRepository documentRepository;
    private ContentAccessService contentAccessService;
    private AssetService service;

    @BeforeEach
    void setUp() {
        assetRepository = mock(AssetRepository.class);
        storageClient = mock(MinioStorageClient.class);
        documentRepository = mock(QuestionSetDocumentRepository.class);
        contentAccessService = mock(ContentAccessService.class);

        // properties chỉ dùng ở luồng upload, signedUrl không chạm tới
        service = new AssetService(
                assetRepository, storageClient, documentRepository, contentAccessService, null);

        when(storageClient.presignedDownloadUrl(anyString(), anyString()))
                .thenReturn("https://minio.local/signed");
    }

    @Test
    void hocVienKhongCoQuyenThiKhongXinDuocSignedUrlCuaAssetPremium() {
        givenContentAsset();
        givenAssetBelongsTo(QUESTION_SET_ID);
        when(contentAccessService.canAccessAny(STUDENT_ID, List.of(QUESTION_SET_ID)))
                .thenReturn(false);

        assertThatThrownBy(() -> service.signedUrl(student(), CONTENT_ASSET_ID))
                .isInstanceOf(ApiException.class)
                .extracting(error -> ((ApiException) error).code())
                .isEqualTo(ErrorCode.FORBIDDEN);

        // Không được ký URL rồi mới chặn — chặn phải xảy ra trước khi chạm storage
        verify(storageClient, never()).presignedDownloadUrl(anyString(), anyString());
    }

    @Test
    void hocVienCoQuyenThiVanXinDuocSignedUrl() {
        givenContentAsset();
        givenAssetBelongsTo(QUESTION_SET_ID);
        when(contentAccessService.canAccessAny(STUDENT_ID, List.of(QUESTION_SET_ID)))
                .thenReturn(true);

        assertThat(service.signedUrl(student(), CONTENT_ASSET_ID).signedUrl())
                .isEqualTo("https://minio.local/signed");
    }

    /** Asset mồ côi: từ chối thay vì cho qua (fail closed). */
    @Test
    void assetKhongThuocBoNaoThiHocVienBiTuChoi() {
        givenContentAsset();
        when(documentRepository.findByAssetId(CONTENT_ASSET_ID)).thenReturn(List.of());
        when(contentAccessService.canAccessAny(anyString(), anyList())).thenReturn(false);

        assertThatThrownBy(() -> service.signedUrl(student(), CONTENT_ASSET_ID))
                .isInstanceOf(ApiException.class);
    }

    /** Biên tập viên phải nghe được file vừa tải lên, kể cả khi chưa gắn vào đề. */
    @Test
    void nguoiCoQuyenAssetWriteKhongCanEntitlement() {
        givenContentAsset();
        AuthPrincipal editor = new AuthPrincipal(
                "user-editor", Set.of("CONTENT_EDITOR"), Set.of("asset:write"));

        assertThat(service.signedUrl(editor, CONTENT_ASSET_ID).signedUrl())
                .isEqualTo("https://minio.local/signed");

        verify(documentRepository, never()).findByAssetId(anyString());
    }

    /** Ghi âm của học viên đi theo nhánh chủ sở hữu, không qua cổng nội dung. */
    @Test
    void ghiAmCuaChinhHocVienKhongQuaCongNoiDung() {
        Asset recording = asset(AssetType.USER_RECORDING);
        recording.setOwnerUserId(STUDENT_ID);
        when(assetRepository.findById(CONTENT_ASSET_ID)).thenReturn(Optional.of(recording));

        assertThat(service.signedUrl(student(), CONTENT_ASSET_ID).signedUrl())
                .isEqualTo("https://minio.local/signed");

        verify(contentAccessService, never()).canAccessAny(anyString(), anyList());
    }

    // -----------------------------------------------------------------

    private void givenContentAsset() {
        when(assetRepository.findById(CONTENT_ASSET_ID))
                .thenReturn(Optional.of(asset(AssetType.AUDIO)));
    }

    private void givenAssetBelongsTo(String questionSetId) {
        QuestionSetDocument document = new QuestionSetDocument();
        document.setQuestionSetId(questionSetId);
        when(documentRepository.findByAssetId(CONTENT_ASSET_ID)).thenReturn(List.of(document));
    }

    private static Asset asset(AssetType type) {
        Asset asset = new Asset();
        asset.setId(CONTENT_ASSET_ID);
        asset.setBucketName("aptis-content");
        asset.setObjectKey("content/audio.mp3");
        asset.setAssetType(type);
        asset.setMimeType("audio/mpeg");
        asset.setStatus(AssetStatus.READY);
        return asset;
    }

    private static AuthPrincipal student() {
        return new AuthPrincipal(STUDENT_ID, Set.of("STUDENT"), Set.of());
    }
}
