package com.medplus.r.d.service;

import com.medplus.r.d.dto.PassedProjectResponse;
import com.medplus.r.d.dto.ProcedureFileRequest;
import com.medplus.r.d.dto.ProcedureFileResponse;
import com.medplus.r.d.dto.ProcedureRowRequest;
import com.medplus.r.d.dto.ProcedureSectionRequest;
import com.medplus.r.d.entity.BatchFormula;
import com.medplus.r.d.entity.ProcedureFile;
import com.medplus.r.d.entity.ProcedureRow;
import com.medplus.r.d.entity.ProcedureSection;
import com.medplus.r.d.entity.Project;
import com.medplus.r.d.entity.StabilityProtocol;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.BatchFormulaRepository;
import com.medplus.r.d.repository.ProcedureFileRepository;
import com.medplus.r.d.repository.ProcedureRowRepository;
import com.medplus.r.d.repository.ProcedureSectionRepository;
import com.medplus.r.d.repository.ProjectRepository;
import com.medplus.r.d.repository.StabilityProtocolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProcedureService {

    @Autowired
    private ProcedureFileRepository procedureFileRepository;

    @Autowired
    private ProcedureSectionRepository procedureSectionRepository;

    @Autowired
    private ProcedureRowRepository procedureRowRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private StabilityProtocolRepository stabilityProtocolRepository;

    @Autowired
    private BatchFormulaRepository batchFormulaRepository;

    // ── Passed-projects query ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PassedProjectResponse> getProjectsWithPassedStability() {
        List<StabilityProtocol> passedProtocols = stabilityProtocolRepository
            .findByStatusIgnoreCaseOrderByCreatedAtDesc("PASSED");

        if (passedProtocols.isEmpty()) {
            return List.of();
        }

        Set<Long> projectIds = passedProtocols.stream()
            .map(StabilityProtocol::getProjectRefId)
            .collect(Collectors.toCollection(HashSet::new));
        Set<Long> batchFormulaIds = passedProtocols.stream()
            .map(StabilityProtocol::getBatchFormulaRefId)
            .collect(Collectors.toCollection(HashSet::new));
        List<Long> protocolIds = passedProtocols.stream()
            .map(StabilityProtocol::getId)
            .collect(Collectors.toList());

        Map<Long, Project> projectsById = projectRepository.findAllById(projectIds).stream()
            .collect(Collectors.toMap(Project::getId, Function.identity()));
        Map<Long, BatchFormula> batchesById = batchFormulaIds.isEmpty()
            ? Map.of()
            : batchFormulaRepository.findByIdIn(new ArrayList<>(batchFormulaIds)).stream()
            .collect(Collectors.toMap(BatchFormula::getId, Function.identity()));
        Map<Long, Long> latestProcedureIdsByProtocol = procedureFileRepository
            .findByProtocolRefIdInOrderByProtocolRefIdAscCreatedAtDesc(protocolIds)
            .stream()
            .collect(Collectors.toMap(
                ProcedureFile::getProtocolRefId,
                ProcedureFile::getId,
                (existing, ignored) -> existing,
                LinkedHashMap::new
            ));

        Map<Long, List<StabilityProtocol>> byProject = passedProtocols.stream()
            .collect(Collectors.groupingBy(StabilityProtocol::getProjectRefId, LinkedHashMap::new, Collectors.toList()));

        List<PassedProjectResponse> result = new ArrayList<>();
        for (Map.Entry<Long, List<StabilityProtocol>> entry : byProject.entrySet()) {
            Project project = projectsById.get(entry.getKey());
            if (project == null) continue;

            List<PassedProjectResponse.PassedProtocolSummary> summaries = entry.getValue()
                    .stream()
                    .map(protocol -> {
                BatchFormula linkedBatch = batchesById.get(protocol.getBatchFormulaRefId());
                Long existingFileId = latestProcedureIdsByProtocol.get(protocol.getId());
                        return new PassedProjectResponse.PassedProtocolSummary(protocol, linkedBatch, existingFileId);
                    })
                    .collect(Collectors.toList());

            result.add(new PassedProjectResponse(project, summaries));
        }

        return result;
    }

    // ── Procedure File CRUD ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ProcedureFileResponse> getProceduresByProject(Long projectRefId) {
        List<ProcedureFile> files = procedureFileRepository.findByProjectRefIdOrderByCreatedAtDesc(projectRefId);
        return files.stream().map(this::buildFullResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProcedureFileResponse getProcedureById(Long id) {
        ProcedureFile file = procedureFileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProcedureFile", id));
        return buildFullResponse(file);
    }

    public ProcedureFileResponse createProcedureFile(ProcedureFileRequest request) {
        validateCreateRequest(request);

        // Best-practice: keep one procedure format per protocol and treat subsequent
        // create calls as updates for idempotent behavior from the UI.
        ProcedureFile file = procedureFileRepository
                .findFirstByProtocolRefIdOrderByCreatedAtDesc(request.getProtocolRefId())
                .orElseGet(ProcedureFile::new);

        applyFileRequest(file, request);
        ProcedureFile saved = procedureFileRepository.save(file);
        return buildFullResponse(saved);
    }

    public ProcedureFileResponse updateProcedureFile(Long id, ProcedureFileRequest request) {
        ProcedureFile file = procedureFileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProcedureFile", id));
        applyFileRequest(file, request);
        validateFileReferences(file.getProjectRefId(), file.getProtocolRefId());
        return buildFullResponse(procedureFileRepository.save(file));
    }

    public void deleteProcedureFile(Long id) {
        ProcedureFile file = procedureFileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProcedureFile", id));
        List<ProcedureSection> sections = procedureSectionRepository
                .findByProcedureFileRefIdOrderByStepNoAsc(file.getId());
        for (ProcedureSection section : sections) {
            procedureRowRepository.deleteBySectionRefId(section.getId());
        }
        procedureSectionRepository.deleteByProcedureFileRefId(id);
        procedureFileRepository.delete(file);
    }

    // ── Section CRUD ───────────────────────────────────────────────────────────

    public ProcedureFileResponse.SectionResponse addSection(Long fileId, ProcedureSectionRequest request) {
        procedureFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("ProcedureFile", fileId));

        int currentCount = procedureSectionRepository.countByProcedureFileRefId(fileId);

        ProcedureSection section = new ProcedureSection();
        section.setProcedureFileRefId(fileId);
        section.setStepNo(currentCount + 1);
        section.setDescriptionOfProcess(request.getDescriptionOfProcess());

        ProcedureSection saved = procedureSectionRepository.save(section);
        return ProcedureFileResponse.fromSection(saved, List.of());
    }

    public ProcedureFileResponse.SectionResponse updateSection(Long fileId, Long sectionId,
            ProcedureSectionRequest request) {
        ProcedureSection section = procedureSectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("ProcedureSection", sectionId));

        if (!section.getProcedureFileRefId().equals(fileId)) {
            throw new ResourceNotFoundException("ProcedureSection", sectionId);
        }

        section.setDescriptionOfProcess(request.getDescriptionOfProcess());
        ProcedureSection saved = procedureSectionRepository.save(section);

        List<ProcedureRow> rows = procedureRowRepository.findBySectionRefIdOrderByRowOrderAsc(sectionId);
        List<ProcedureFileResponse.RowResponse> rowResponses = rows.stream()
                .map(ProcedureFileResponse::fromRow).collect(Collectors.toList());
        return ProcedureFileResponse.fromSection(saved, rowResponses);
    }

    public void deleteSection(Long fileId, Long sectionId) {
        ProcedureSection section = procedureSectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("ProcedureSection", sectionId));

        if (!section.getProcedureFileRefId().equals(fileId)) {
            throw new ResourceNotFoundException("ProcedureSection", sectionId);
        }

        procedureRowRepository.deleteBySectionRefId(sectionId);
        procedureSectionRepository.delete(section);

        // Re-number remaining steps
        List<ProcedureSection> remaining = procedureSectionRepository
                .findByProcedureFileRefIdOrderByStepNoAsc(fileId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setStepNo(i + 1);
        }
        procedureSectionRepository.saveAll(remaining);
    }

    // ── Row CRUD ───────────────────────────────────────────────────────────────

    public ProcedureFileResponse.RowResponse addRow(Long fileId, Long sectionId, ProcedureRowRequest request) {
        ProcedureSection section = procedureSectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("ProcedureSection", sectionId));

        if (!section.getProcedureFileRefId().equals(fileId)) {
            throw new ResourceNotFoundException("ProcedureSection", sectionId);
        }

        int currentCount = procedureRowRepository.countBySectionRefId(sectionId);

        ProcedureRow row = new ProcedureRow();
        row.setSectionRefId(sectionId);
        row.setNameOfMaterial(request.getNameOfMaterial());
        row.setFormulaQtyPer100Kg(request.getFormulaQtyPer100Kg());
        row.setActualQty(request.getActualQty());
        row.setStandardTime(request.getStandardTime());
        row.setRpm(request.getRpm());
        row.setRowOrder(currentCount + 1);

        return ProcedureFileResponse.fromRow(procedureRowRepository.save(row));
    }

    public ProcedureFileResponse.RowResponse updateRow(Long fileId, Long sectionId, Long rowId,
            ProcedureRowRequest request) {
        ProcedureSection section = procedureSectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("ProcedureSection", sectionId));

        if (!section.getProcedureFileRefId().equals(fileId)) {
            throw new ResourceNotFoundException("ProcedureSection", sectionId);
        }

        ProcedureRow row = procedureRowRepository.findById(rowId)
                .orElseThrow(() -> new ResourceNotFoundException("ProcedureRow", rowId));

        if (!row.getSectionRefId().equals(sectionId)) {
            throw new ResourceNotFoundException("ProcedureRow", rowId);
        }

        row.setNameOfMaterial(request.getNameOfMaterial());
        row.setFormulaQtyPer100Kg(request.getFormulaQtyPer100Kg());
        row.setActualQty(request.getActualQty());
        row.setStandardTime(request.getStandardTime());
        row.setRpm(request.getRpm());

        return ProcedureFileResponse.fromRow(procedureRowRepository.save(row));
    }

    public void deleteRow(Long fileId, Long sectionId, Long rowId) {
        ProcedureSection section = procedureSectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("ProcedureSection", sectionId));

        if (!section.getProcedureFileRefId().equals(fileId)) {
            throw new ResourceNotFoundException("ProcedureSection", sectionId);
        }

        ProcedureRow row = procedureRowRepository.findById(rowId)
                .orElseThrow(() -> new ResourceNotFoundException("ProcedureRow", rowId));

        if (!row.getSectionRefId().equals(sectionId)) {
            throw new ResourceNotFoundException("ProcedureRow", rowId);
        }

        procedureRowRepository.delete(row);

        // Re-order remaining rows
        List<ProcedureRow> remaining = procedureRowRepository.findBySectionRefIdOrderByRowOrderAsc(sectionId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setRowOrder(i + 1);
        }
        procedureRowRepository.saveAll(remaining);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private void applyFileRequest(ProcedureFile file, ProcedureFileRequest request) {
        if (request.getProjectRefId() != null) file.setProjectRefId(request.getProjectRefId());
        if (request.getProtocolRefId() != null) file.setProtocolRefId(request.getProtocolRefId());
        file.setProductName(request.getProductName());
        file.setBrandName(request.getBrandName());
        file.setMfrNo(request.getMfrNo());
        file.setBatchNo(request.getBatchNo());
        file.setBatchSize(request.getBatchSize());
        file.setMfgDate(request.getMfgDate());
        file.setDateOfCompletion(request.getDateOfCompletion());
        file.setRevisionNo(request.getRevisionNo());
        file.setRevisionDate(request.getRevisionDate());
        file.setDocumentNo(request.getDocumentNo());
        file.setShelfLife(request.getShelfLife());
        file.setMixerCapacity(request.getMixerCapacity());
    }

    private void validateCreateRequest(ProcedureFileRequest request) {
        if (request == null || request.getProjectRefId() == null || request.getProtocolRefId() == null) {
            throw new IllegalArgumentException("projectRefId and protocolRefId are required.");
        }
        validateFileReferences(request.getProjectRefId(), request.getProtocolRefId());
    }

    private void validateFileReferences(Long projectRefId, Long protocolRefId) {
        projectRepository.findById(projectRefId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectRefId));

        StabilityProtocol protocol = stabilityProtocolRepository.findById(protocolRefId)
                .orElseThrow(() -> new ResourceNotFoundException("StabilityProtocol", protocolRefId));

        if (!projectRefId.equals(protocol.getProjectRefId())) {
            throw new IllegalArgumentException("protocolRefId does not belong to the given projectRefId.");
        }
    }

    private ProcedureFileResponse buildFullResponse(ProcedureFile file) {
        List<ProcedureSection> sections = procedureSectionRepository
                .findByProcedureFileRefIdOrderByStepNoAsc(file.getId());

        List<ProcedureFileResponse.SectionResponse> sectionResponses = sections.stream().map(section -> {
            List<ProcedureRow> rows = procedureRowRepository
                    .findBySectionRefIdOrderByRowOrderAsc(section.getId());
            List<ProcedureFileResponse.RowResponse> rowResponses = rows.stream()
                    .map(ProcedureFileResponse::fromRow).collect(Collectors.toList());
            return ProcedureFileResponse.fromSection(section, rowResponses);
        }).collect(Collectors.toList());

        return ProcedureFileResponse.from(file, sectionResponses);
    }
}
