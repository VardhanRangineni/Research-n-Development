package com.medplus.r.d.controller;

import com.medplus.r.d.dto.BatchFormulaDecisionRequest;
import com.medplus.r.d.dto.BatchFormulaCreateRequest;
import com.medplus.r.d.dto.BatchFormulaRemarkRequest;
import com.medplus.r.d.entity.BatchFormula;
import com.medplus.r.d.service.BatchFormulaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/batches")
public class BatchFormulaController {

    @Autowired
    private BatchFormulaService batchFormulaService;

    @GetMapping
    public ResponseEntity<List<BatchFormula>> getBatchesByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(batchFormulaService.getByProject(projectId));
    }

    @GetMapping("/{batchId}")
    public ResponseEntity<BatchFormula> getBatch(@PathVariable Long projectId, @PathVariable Long batchId) {
        return ResponseEntity.ok(batchFormulaService.getById(projectId, batchId));
    }

    @PostMapping
    public ResponseEntity<BatchFormula> createBatch(@PathVariable Long projectId,
                                                    @Valid @RequestBody BatchFormulaCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(batchFormulaService.create(projectId, request));
    }

    @PutMapping("/{batchId}/remark")
    public ResponseEntity<BatchFormula> updateRemark(@PathVariable Long projectId,
                                                     @PathVariable Long batchId,
                                                     @Valid @RequestBody BatchFormulaRemarkRequest request) {
        return ResponseEntity.ok(batchFormulaService.updateRemark(projectId, batchId, request.getRemark()));
    }

    @PutMapping("/{batchId}/decision")
    public ResponseEntity<BatchFormula> applyDecision(@PathVariable Long projectId,
                                                      @PathVariable Long batchId,
                                                      @Valid @RequestBody BatchFormulaDecisionRequest request) {
        return ResponseEntity.ok(batchFormulaService.applyDecision(projectId, batchId, request.getStatus(), request.getRemark()));
    }
}
