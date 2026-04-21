package com.medplus.r.d.controller;

import com.medplus.r.d.dto.PagedResponse;
import com.medplus.r.d.dto.ProjectDocumentDTO;
import com.medplus.r.d.service.ProjectDocumentService;
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
}
