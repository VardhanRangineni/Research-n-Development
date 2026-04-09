package com.medplus.r.d.controller;

import com.medplus.r.d.dto.PassedProjectResponse;
import com.medplus.r.d.dto.ProcedureFileRequest;
import com.medplus.r.d.dto.ProcedureFileResponse;
import com.medplus.r.d.dto.ProcedureRowRequest;
import com.medplus.r.d.dto.ProcedureSectionRequest;
import com.medplus.r.d.service.ProcedureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/procedure-files")
public class ProcedureController {

    @Autowired
    private ProcedureService procedureService;

    // ── Projects with passed stability ─────────────────────────────────────────

    @GetMapping("/passed-projects")
    public ResponseEntity<List<PassedProjectResponse>> getPassedProjects() {
        return ResponseEntity.ok(procedureService.getProjectsWithPassedStability());
    }

    // ── Procedure File CRUD ────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<ProcedureFileResponse>> getByProject(
            @RequestParam Long projectRefId) {
        return ResponseEntity.ok(procedureService.getProceduresByProject(projectRefId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProcedureFileResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(procedureService.getProcedureById(id));
    }

    @PostMapping
    public ResponseEntity<ProcedureFileResponse> create(@RequestBody ProcedureFileRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(procedureService.createProcedureFile(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProcedureFileResponse> update(@PathVariable Long id,
            @RequestBody ProcedureFileRequest request) {
        return ResponseEntity.ok(procedureService.updateProcedureFile(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        procedureService.deleteProcedureFile(id);
        return ResponseEntity.noContent().build();
    }

    // ── Section CRUD ───────────────────────────────────────────────────────────

    @PostMapping("/{fileId}/sections")
    public ResponseEntity<ProcedureFileResponse.SectionResponse> addSection(
            @PathVariable Long fileId,
            @RequestBody ProcedureSectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(procedureService.addSection(fileId, request));
    }

    @PutMapping("/{fileId}/sections/{sectionId}")
    public ResponseEntity<ProcedureFileResponse.SectionResponse> updateSection(
            @PathVariable Long fileId,
            @PathVariable Long sectionId,
            @RequestBody ProcedureSectionRequest request) {
        return ResponseEntity.ok(procedureService.updateSection(fileId, sectionId, request));
    }

    @DeleteMapping("/{fileId}/sections/{sectionId}")
    public ResponseEntity<Void> deleteSection(@PathVariable Long fileId,
            @PathVariable Long sectionId) {
        procedureService.deleteSection(fileId, sectionId);
        return ResponseEntity.noContent().build();
    }

    // ── Row CRUD ───────────────────────────────────────────────────────────────

    @PostMapping("/{fileId}/sections/{sectionId}/rows")
    public ResponseEntity<ProcedureFileResponse.RowResponse> addRow(
            @PathVariable Long fileId,
            @PathVariable Long sectionId,
            @RequestBody ProcedureRowRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(procedureService.addRow(fileId, sectionId, request));
    }

    @PutMapping("/{fileId}/sections/{sectionId}/rows/{rowId}")
    public ResponseEntity<ProcedureFileResponse.RowResponse> updateRow(
            @PathVariable Long fileId,
            @PathVariable Long sectionId,
            @PathVariable Long rowId,
            @RequestBody ProcedureRowRequest request) {
        return ResponseEntity.ok(procedureService.updateRow(fileId, sectionId, rowId, request));
    }

    @DeleteMapping("/{fileId}/sections/{sectionId}/rows/{rowId}")
    public ResponseEntity<Void> deleteRow(
            @PathVariable Long fileId,
            @PathVariable Long sectionId,
            @PathVariable Long rowId) {
        procedureService.deleteRow(fileId, sectionId, rowId);
        return ResponseEntity.noContent().build();
    }
}
