package com.medplus.r.d.controller;

import com.medplus.r.d.dto.PagedResponse;
import com.medplus.r.d.dto.ProjectDocumentDTO;
import com.medplus.r.d.entity.ProjectDocument;
import com.medplus.r.d.service.ProjectDocumentService;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/projects/{projectRefId}/documents")
public class ProjectDocumentController {

    private final ProjectDocumentService projectDocumentService;

    public ProjectDocumentController(ProjectDocumentService projectDocumentService) {
        this.projectDocumentService = projectDocumentService;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<ProjectDocumentDTO>> listByProject(
            @PathVariable Long projectRefId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(projectDocumentService.getByProjectRefId(projectRefId, page, size));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProjectDocumentDTO> upload(
            @PathVariable Long projectRefId,
            @RequestPart("file") MultipartFile file,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "Unknown";
        return ResponseEntity.ok(projectDocumentService.upload(projectRefId, file, username));
    }

    @GetMapping("/{documentId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long projectRefId, @PathVariable Long documentId) {
        ProjectDocument document = projectDocumentService.getDocument(projectRefId, documentId);
        Resource resource = projectDocumentService.loadAsResource(document);

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(document.getContentType());
        } catch (Exception ex) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.inline().filename(document.getOriginalFileName()).build());

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(mediaType)
                .body(resource);
    }
}
