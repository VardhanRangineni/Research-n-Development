package com.medplus.r.d.controller;

import com.medplus.r.d.dto.AuditTrailResponse;
import com.medplus.r.d.dto.PagedResponse;
import com.medplus.r.d.dto.ProjectDocumentDTO;
import com.medplus.r.d.service.AuditTrailService;
import com.medplus.r.d.service.ProjectDocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit")
public class AuditTrailController {

    @Autowired
    private AuditTrailService auditTrailService;

    @Autowired
    private ProjectDocumentService projectDocumentService;

    @GetMapping("/trail")
    public ResponseEntity<AuditTrailResponse> getAuditTrail(@RequestParam String benchmarkId) {
        return ResponseEntity.ok(auditTrailService.getTrailByBenchmarkId(benchmarkId));
    }

    @GetMapping("/documents")
    public ResponseEntity<PagedResponse<ProjectDocumentDTO>> getAuditDocuments(
            @RequestParam String benchmarkId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(projectDocumentService.getByBenchmarkId(benchmarkId, page, size));
    }
}
