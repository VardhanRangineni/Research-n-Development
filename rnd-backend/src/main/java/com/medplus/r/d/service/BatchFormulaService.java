package com.medplus.r.d.service;

import com.medplus.r.d.dto.BatchFormulaCreateRequest;
import com.medplus.r.d.entity.BatchFormula;
import com.medplus.r.d.entity.Project;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.BatchFormulaRepository;
import com.medplus.r.d.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class BatchFormulaService {

    @Autowired
    private BatchFormulaRepository batchFormulaRepository;

    @Autowired
    private ProjectRepository projectRepository;

    public List<BatchFormula> getByProject(Long projectId) {
        validateProject(projectId);
        return batchFormulaRepository.findByProjectRefIdOrderByCreatedAtDesc(projectId);
    }

    public BatchFormula getById(Long projectId, Long batchId) {
        validateProject(projectId);
        BatchFormula batchFormula = batchFormulaRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch formula", batchId));

        if (!projectId.equals(batchFormula.getProjectRefId())) {
            throw new IllegalArgumentException("Batch formula does not belong to the selected project");
        }

        return batchFormula;
    }

    @Transactional
    public BatchFormula create(Long projectId, BatchFormulaCreateRequest request) {
        Project project = validateAndGetProject(projectId);
        String normalizedBatchName = request.getBatchName().trim();

        String lifecycle = project.getLifecycleStage() == null
                ? "FORMULATION"
                : project.getLifecycleStage().trim().toUpperCase(Locale.ROOT);
        if ("ARCHIVED".equals(lifecycle)) {
            throw new IllegalArgumentException("Archived project cannot create new trial batches");
        }

        if (batchFormulaRepository.existsByBatchNameIgnoreCase(normalizedBatchName)) {
            throw new IllegalArgumentException("Batch name already exists. Please use a unique batch name.");
        }

        BatchFormula batchFormula = new BatchFormula();
        batchFormula.setProjectRefId(projectId);
        batchFormula.setBatchName(normalizedBatchName);
        batchFormula.setTargetBatchSize(request.getTargetBatchSize());
        batchFormula.setCurrentTotalWeight(request.getCurrentTotalWeight());
        batchFormula.setFormulaSnapshot(request.getFormulaSnapshot().trim());
        batchFormula.setStatus("PENDING");
        batchFormula.setRemark(null);

        BatchFormula saved = batchFormulaRepository.save(batchFormula);

        if (!"BATCH_TRIAL".equalsIgnoreCase(project.getLifecycleStage())) {
            project.setLifecycleStage("BATCH_TRIAL");
            projectRepository.save(project);
        }

        return saved;
    }

    @Transactional
    public BatchFormula updateRemark(Long projectId, Long batchId, String remark) {
        BatchFormula batchFormula = getById(projectId, batchId);
        String currentStatus = batchFormula.getStatus() == null ? "" : batchFormula.getStatus().trim().toUpperCase(Locale.ROOT);
        if ("DISCARDED".equals(currentStatus)) {
            throw new IllegalArgumentException("Discarded batch is locked and cannot be edited");
        }
        batchFormula.setRemark(remark.trim());
        return batchFormulaRepository.save(batchFormula);
    }

    @Transactional
    public BatchFormula applyDecision(Long projectId, Long batchId, String status, String remark) {
        BatchFormula batchFormula = getById(projectId, batchId);

        String currentStatus = batchFormula.getStatus() == null ? "" : batchFormula.getStatus().trim().toUpperCase(Locale.ROOT);
        if ("DISCARDED".equals(currentStatus)) {
            throw new IllegalArgumentException("Discarded batch cannot be approved again");
        }
        if ("APPROVED".equals(currentStatus)) {
            throw new IllegalArgumentException("Batch is already approved");
        }

        String normalizedStatus = status.trim().toUpperCase(Locale.ROOT);
        if (!"APPROVED".equals(normalizedStatus)) {
            throw new IllegalArgumentException("Status must be APPROVED");
        }

        if (remark == null || remark.trim().isEmpty()) {
            throw new IllegalArgumentException("Remark is required before approving a batch");
        }

        batchFormula.setStatus(normalizedStatus);
        batchFormula.setRemark(remark.trim());
        return batchFormulaRepository.save(batchFormula);
    }

    private void validateProject(Long projectId) {
        validateAndGetProject(projectId);
    }

    private Project validateAndGetProject(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
    }
}
