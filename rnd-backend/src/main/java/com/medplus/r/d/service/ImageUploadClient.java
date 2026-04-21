package com.medplus.r.d.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Handles the 3-step external image upload flow:
 *   1. Obtain OAuth access token (cached until near-expiry)
 *   2. Fetch image server details (URL, upload token, clientId)
 *   3. Upload file to image server and return metadata paths
 */
@Slf4j
@Service
public class ImageUploadClient {

    private static final long TOKEN_EXPIRY_BUFFER_SECONDS = 60L;

    private final RestTemplate restTemplate;

    @Value("${image.upload.oauth.url}")
    private String oauthUrl;

    @Value("${image.upload.oauth.client-id}")
    private String oauthClientId;

    @Value("${image.upload.oauth.client-secret}")
    private String oauthClientSecret;

    @Value("${image.upload.transit.url}")
    private String transitUrl;

    @Value("${image.upload.transit.origin}")
    private String transitOrigin;

    @Value("${image.upload.transit.client-id}")
    private String transitClientId;

    private volatile String cachedAccessToken;
    private volatile Instant tokenExpiresAt = Instant.MIN;

    public ImageUploadClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public ImageUploadResult upload(MultipartFile file) throws IOException {
        String oauthToken = getAccessToken();
        ImageServerDetails serverDetails = fetchImageServerDetails(oauthToken);
        return uploadFile(serverDetails, file);
    }

    // ── Step 1: OAuth token with caching ──────────────────────────────────────

    private synchronized String getAccessToken() {
        if (cachedAccessToken != null &&
                Instant.now().isBefore(tokenExpiresAt.minusSeconds(TOKEN_EXPIRY_BUFFER_SECONDS))) {
            log.debug("Reusing cached OAuth access token");
            return cachedAccessToken;
        }
        log.debug("Fetching new OAuth access token");
        return fetchFreshAccessToken();
    }

    private String fetchFreshAccessToken() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(oauthClientId, oauthClientSecret);
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = restTemplate.exchange(
                oauthUrl, HttpMethod.POST, new HttpEntity<>(headers), Map.class);

        @SuppressWarnings("unchecked")
        Map<String, Object> body = response.getBody();
        if (body == null || !body.containsKey("access_token")) {
            throw new IllegalStateException("OAuth token response missing access_token field");
        }

        cachedAccessToken = (String) body.get("access_token");
        int expiresIn = body.containsKey("expires_in")
                ? ((Number) body.get("expires_in")).intValue()
                : 300;
        tokenExpiresAt = Instant.now().plusSeconds(expiresIn);
        log.debug("Obtained new OAuth token, expires in {}s", expiresIn);
        return cachedAccessToken;
    }

    // ── Step 2: Fetch image server details ────────────────────────────────────

    @SuppressWarnings("unchecked")
    private ImageServerDetails fetchImageServerDetails(String oauthToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(oauthToken);

        String url = UriComponentsBuilder.fromUriString(transitUrl)
                .queryParam("origin", transitOrigin)
                .queryParam("clientId", transitClientId)
                .toUriString();

        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);

        Map<String, Object> body = response.getBody();
        log.info("[ImageUpload] Transit endpoint raw response: {}", body);

        if (body == null || body.isEmpty()) {
            throw new IllegalStateException("Empty response from image-server transit endpoint");
        }

        // The response may be nested under a wrapper key
        Map<String, Object> payload = body;
        for (String wrapperKey : new String[]{"response", "data", "result"}) {
            if (body.containsKey(wrapperKey) && body.get(wrapperKey) instanceof Map) {
                payload = (Map<String, Object>) body.get(wrapperKey);
                log.info("[ImageUpload] Unwrapped payload from '{}' key", wrapperKey);
                break;
            }
        }

        String imageServerUrl = resolveField(payload, "imageServerUrl", "image_server_url", "serverUrl", "server_url", "url");
        String accessToken    = resolveField(payload, "accessToken", "access_token", "token", "uploadToken", "upload_token");
        String clientId       = resolveField(payload, "clientId", "client_id", "clientID");

        if (imageServerUrl == null) {
            throw new IllegalStateException(
                    "Could not find imageServerUrl in transit response. Actual keys: " + payload.keySet());
        }

        log.info("[ImageUpload] Resolved imageServerUrl={}, clientId={}", imageServerUrl, clientId);
        ImageServerDetails details = new ImageServerDetails();
        details.setImageServerUrl(imageServerUrl);
        details.setAccessToken(accessToken);
        details.setClientId(clientId);
        return details;
    }

    private String resolveField(Map<String, Object> map, String... candidates) {
        for (String key : candidates) {
            Object value = map.get(key);
            if (value instanceof String s && !s.isBlank()) {
                return s;
            }
        }
        return null;
    }

    // ── Step 3: Upload file to image server ───────────────────────────────────

    private ImageUploadResult uploadFile(ImageServerDetails serverDetails, MultipartFile file) throws IOException {
        String uploadUrl = UriComponentsBuilder
                .fromUriString(serverDetails.getImageServerUrl() + "/upload")
                .queryParam("token", serverDetails.getAccessToken())
                .queryParam("clientId", serverDetails.getClientId())
                .queryParam("imageType", "LT")
                .toUriString();

        log.info("[ImageUpload] Uploading to: {}", uploadUrl);
        log.info("[ImageUpload] File: name={}, size={}, contentType={}",
                file.getOriginalFilename(), file.getSize(), file.getContentType());

        ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("files", fileResource);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = restTemplate.exchange(
                uploadUrl, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);

        @SuppressWarnings("unchecked")
        Map<String, Object> responseBody = response.getBody();
        log.info("[ImageUpload] Upload raw response: {}", responseBody);

        if (responseBody == null || responseBody.isEmpty()) {
            throw new IllegalStateException("Empty response from image upload server");
        }

        // Unwrap nested payload — response key may be a Map or a List
        Map<String, Object> result = responseBody;
        for (String wrapperKey : new String[]{"response", "data", "result"}) {
            Object wrapped = responseBody.get(wrapperKey);
            if (wrapped instanceof Map) {
                result = (Map<String, Object>) wrapped;
                log.info("[ImageUpload] Upload: unwrapped Map from '{}' key", wrapperKey);
                break;
            } else if (wrapped instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map) {
                result = (Map<String, Object>) list.get(0);
                log.info("[ImageUpload] Upload: unwrapped List[0] from '{}' key", wrapperKey);
                break;
            }
        }

        log.info("[ImageUpload] Upload result keys: {}", result.keySet());

        String imagePath         = resolveField(result, "imagePath", "image_path", "path");
        String thumbnailPath     = resolveField(result, "thumbnailPath", "thumbnail_path", "thumbnail");
        String originalImageName = resolveField(result, "originalImageName", "original_image_name", "originalName", "fileName", "filename");

        log.info("[ImageUpload] Resolved imagePath={}, thumbnailPath={}, originalImageName={}", imagePath, thumbnailPath, originalImageName);
        return new ImageUploadResult(serverDetails.getImageServerUrl(), imagePath, thumbnailPath, originalImageName);
    }

    // ── Inner types ───────────────────────────────────────────────────────────

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ImageServerDetails {
        private String imageServerUrl;
        private String accessToken;
        private String clientId;
    }

    public record ImageUploadResult(String imageServerUrl, String imagePath, String thumbnailPath, String originalImageName) {}
}
