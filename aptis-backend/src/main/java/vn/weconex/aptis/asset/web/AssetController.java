package vn.weconex.aptis.asset.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.asset.service.AssetService;
import vn.weconex.aptis.common.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetService assetService;
    private final CurrentUser currentUser;

    @PostMapping("/upload-url")
    @ResponseStatus(HttpStatus.CREATED)
    public AssetDtos.UploadUrlResponse createUploadUrl(
            @Valid @RequestBody AssetDtos.UploadUrlRequest request) {

        return assetService.createUploadUrl(currentUser.require(), request);
    }

    @PostMapping("/{assetId}/complete")
    public AssetDtos.AssetResponse complete(
            @PathVariable String assetId,
            @RequestBody(required = false) AssetDtos.CompleteUploadRequest request) {

        return assetService.completeUpload(currentUser.require(), assetId, request);
    }

    @GetMapping("/{assetId}/signed-url")
    public AssetDtos.AssetResponse signedUrl(@PathVariable String assetId) {
        return assetService.signedUrl(currentUser.require(), assetId);
    }

    @DeleteMapping("/{assetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String assetId) {
        assetService.delete(currentUser.require(), assetId);
    }
}
