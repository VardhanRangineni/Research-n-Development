package com.medplus.r.d.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medplus.r.d.dto.StabilityGateCriteriaRequest;
import com.medplus.r.d.dto.StabilityGateDecisionRequest;
import com.medplus.r.d.dto.StabilityGateDecisionResponse;
import com.medplus.r.d.dto.StabilitySimpleResultRequest;
import com.medplus.r.d.dto.StabilityMeasurementRequest;
import com.medplus.r.d.dto.StabilityNotificationResponse;
import com.medplus.r.d.dto.StabilityObservationUpsertRequest;
import com.medplus.r.d.dto.StabilityProtocolCreateRequest;
import com.medplus.r.d.dto.StabilityProtocolUpdateRequest;
import com.medplus.r.d.dto.PagedResponse;
import com.medplus.r.d.entity.BatchFormula;
import com.medplus.r.d.entity.Dossier;
import com.medplus.r.d.entity.Ingredient;
import com.medplus.r.d.entity.Project;
import com.medplus.r.d.entity.StabilityGateCriteria;
import com.medplus.r.d.entity.StabilityGateDecision;
import com.medplus.r.d.entity.StabilityObservation;
import com.medplus.r.d.entity.StabilityProtocol;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.BatchFormulaRepository;
import com.medplus.r.d.repository.DossierRepository;
import com.medplus.r.d.repository.ProjectRepository;
import com.medplus.r.d.repository.IngredientRepository;
import com.medplus.r.d.repository.StabilityGateCriteriaRepository;
import com.medplus.r.d.repository.StabilityGateDecisionRepository;
import com.medplus.r.d.repository.StabilityObservationRepository;
import com.medplus.r.d.repository.StabilityProtocolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.ArrayList;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StabilityService {

    @Autowired
    private StabilityProtocolRepository stabilityProtocolRepository;

    @Autowired
    private StabilityObservationRepository stabilityObservationRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private BatchFormulaRepository batchFormulaRepository;

    @Autowired
    private StabilityGateCriteriaRepository stabilityGateCriteriaRepository;

    @Autowired
    private StabilityGateDecisionRepository stabilityGateDecisionRepository;

    @Autowired
    private DossierRepository dossierRepository;

    @Autowired
    private IngredientRepository ingredientRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<StabilityProtocol> getProtocolsByProject(Long projectId) {
        validateProject(projectId);
        return stabilityProtocolRepository.findByProjectRefIdOrderByCreatedAtDesc(projectId);
    }

    public PagedResponse<StabilityProtocol> getProtocolsByProject(Long projectId, int page, int size) {
        validateProject(projectId);
        return PagedResponse.from(stabilityProtocolRepository.findByProjectRefIdOrderByCreatedAtDesc(
                projectId,
                PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"))
        ));
    }

    public StabilityProtocol getProtocol(Long projectId, Long protocolId) {
        validateProject(projectId);
        StabilityProtocol protocol = stabilityProtocolRepository.findById(protocolId)
                .orElseThrow(() -> new ResourceNotFoundException("Stability protocol", protocolId));
        if (!projectId.equals(protocol.getProjectRefId())) {
            throw new IllegalArgumentException("Stability protocol does not belong to selected project");
        }
        return protocol;
    }

    @Transactional
    public StabilityProtocol createProtocol(Long projectId, StabilityProtocolCreateRequest request) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));

        BatchFormula batchFormula = batchFormulaRepository.findById(request.getBatchFormulaId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch formula", request.getBatchFormulaId()));

        if (!projectId.equals(batchFormula.getProjectRefId())) {
            throw new IllegalArgumentException("Batch formula does not belong to selected project");
        }

        if (!"APPROVED".equalsIgnoreCase(batchFormula.getStatus())) {
            throw new IllegalArgumentException("Stability protocol can only be created for approved batches");
        }

        List<String> conditions = sanitize(request.getConditions(), "conditions");
        List<String> intervals = sanitize(request.getIntervals(), "intervals");
        List<String> parameters = sanitize(request.getParameters(), "parameters");
        Map<String, String> parameterReferences = normalizeParameterReferences(parameters, request.getParameterReferences());
        validateIntervals(intervals);

        StabilityProtocol protocol = new StabilityProtocol();
        protocol.setProjectRefId(projectId);
        protocol.setBatchFormulaRefId(batchFormula.getId());
        protocol.setProtocolName(request.getProtocolName().trim());
        protocol.setConditionsJson(toJson(conditions));
        protocol.setIntervalsJson(toJson(intervals));
        protocol.setParametersJson(toJson(parameters));
        protocol.setParameterReferencesJson(toJson(parameterReferences));
        protocol.setStatus("ACTIVE");

        StabilityProtocol saved = stabilityProtocolRepository.save(protocol);
        project.setLifecycleStage("STABILITY");
        projectRepository.save(project);
        return saved;
    }

    @Transactional
    public StabilityProtocol updateProtocolConfig(Long projectId, Long protocolId, StabilityProtocolUpdateRequest request) {
        StabilityProtocol protocol = getProtocol(projectId, protocolId);

        List<String> conditions = sanitize(request.getConditions(), "conditions");
        List<String> intervals = sanitize(request.getIntervals(), "intervals");
        List<String> parameters = sanitize(request.getParameters(), "parameters");
        Map<String, String> parameterReferences = normalizeParameterReferences(parameters, request.getParameterReferences());
        validateIntervals(intervals);

        protocol.setProtocolName(request.getProtocolName().trim());
        protocol.setConditionsJson(toJson(conditions));
        protocol.setIntervalsJson(toJson(intervals));
        protocol.setParametersJson(toJson(parameters));
        protocol.setParameterReferencesJson(toJson(parameterReferences));

        return stabilityProtocolRepository.save(protocol);
    }

    public List<StabilityObservation> getObservations(Long projectId, Long protocolId) {
        StabilityProtocol protocol = getProtocol(projectId, protocolId);
        return stabilityObservationRepository.findByProtocolRefIdOrderByConditionLabelAscIntervalLabelAsc(protocol.getId());
    }

    public PagedResponse<StabilityObservation> getObservations(Long projectId, Long protocolId, int page, int size) {
        StabilityProtocol protocol = getProtocol(projectId, protocolId);
        return PagedResponse.from(stabilityObservationRepository.findByProtocolRefIdOrderByConditionLabelAscIntervalLabelAsc(
                protocol.getId(),
                PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.ASC, "conditionLabel", "intervalLabel"))
        ));
    }

    public StabilityGateCriteria getGateCriteria(Long projectId, Long protocolId) {
        StabilityProtocol protocol = getProtocol(projectId, protocolId);
        return stabilityGateCriteriaRepository.findByProjectRefId(projectId)
                .orElseGet(() -> {
                    StabilityGateCriteria criteria = new StabilityGateCriteria();
                    criteria.setProjectRefId(projectId);
                    criteria.setMaxWeightLossPercent(new BigDecimal("5.0000"));
                    criteria.setMaxPhDrift(new BigDecimal("0.5000"));
                    criteria.setMandatoryParametersJson(protocol.getParametersJson());
                    criteria.setConditionThresholdsJson("{}");
                    return stabilityGateCriteriaRepository.save(criteria);
                });
    }

    @Transactional
    public StabilityGateCriteria saveGateCriteria(Long projectId, Long protocolId, StabilityGateCriteriaRequest request) {
        StabilityProtocol protocol = getProtocol(projectId, protocolId);

        StabilityGateCriteria criteria = stabilityGateCriteriaRepository.findByProjectRefId(projectId)
                .orElseGet(() -> {
                    StabilityGateCriteria created = new StabilityGateCriteria();
                    created.setProjectRefId(projectId);
                    return created;
                });

        List<String> fallbackParameters = parseJsonList(protocol.getParametersJson());
        List<String> mandatoryParameters = request.getMandatoryParameters() == null || request.getMandatoryParameters().isEmpty()
                ? fallbackParameters
                : sanitize(request.getMandatoryParameters(), "mandatory parameters");

        criteria.setMaxWeightLossPercent(request.getMaxWeightLossPercent() == null ? new BigDecimal("5.0000") : request.getMaxWeightLossPercent());
        criteria.setMaxPhDrift(request.getMaxPhDrift() == null ? new BigDecimal("0.5000") : request.getMaxPhDrift());
        criteria.setMandatoryParametersJson(toJson(mandatoryParameters));
        criteria.setConditionThresholdsJson(toJson(request.getConditionThresholds() == null ? Map.of() : request.getConditionThresholds()));

        return stabilityGateCriteriaRepository.save(criteria);
    }

    @Transactional
    public StabilityGateDecisionResponse evaluateAndApplyGateDecision(Long projectId,
                                                                      Long protocolId,
                                                                      StabilityGateDecisionRequest request) {
        StabilityProtocol protocol = getProtocol(projectId, protocolId);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        BatchFormula batchFormula = batchFormulaRepository.findById(protocol.getBatchFormulaRefId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch formula", protocol.getBatchFormulaRefId()));

        StabilityGateCriteria criteria = getGateCriteria(projectId, protocolId);
        List<StabilityObservation> observations = stabilityObservationRepository
                .findByProtocolRefIdOrderByConditionLabelAscIntervalLabelAsc(protocolId);

        Map<String, Object> measuredValues = new LinkedHashMap<>();
        Map<String, Object> ruleChecks = new LinkedHashMap<>();
        boolean hasFailure = false;

        BigDecimal weightLossPercent = null;
        if (request.getInitialWeight() != null && request.getCurrentWeight() != null
                && request.getInitialWeight().compareTo(BigDecimal.ZERO) > 0) {
            weightLossPercent = request.getInitialWeight()
                    .subtract(request.getCurrentWeight())
                    .multiply(new BigDecimal("100"))
                    .divide(request.getInitialWeight(), 4, java.math.RoundingMode.HALF_UP);
            measuredValues.put("initialWeight", request.getInitialWeight());
            measuredValues.put("currentWeight", request.getCurrentWeight());
            measuredValues.put("weightLossPercent", weightLossPercent);

            BigDecimal maxWeightLoss = criteria.getMaxWeightLossPercent() == null ? new BigDecimal("5.0000") : criteria.getMaxWeightLossPercent();
            boolean weightPass = weightLossPercent.compareTo(maxWeightLoss) <= 0;
            ruleChecks.put("weightLossRule", Map.of(
                    "maxAllowed", maxWeightLoss,
                    "actual", weightLossPercent,
                    "passed", weightPass
            ));
            if (!weightPass) {
                hasFailure = true;
            }
        }

        BigDecimal phDrift = null;
        if (request.getInitialPh() != null && request.getCurrentPh() != null) {
            phDrift = request.getInitialPh().subtract(request.getCurrentPh()).abs();
            measuredValues.put("initialPh", request.getInitialPh());
            measuredValues.put("currentPh", request.getCurrentPh());
            measuredValues.put("phDrift", phDrift);

            BigDecimal maxPhDrift = criteria.getMaxPhDrift() == null ? new BigDecimal("0.5000") : criteria.getMaxPhDrift();
            boolean phPass = phDrift.compareTo(maxPhDrift) <= 0;
            ruleChecks.put("phDriftRule", Map.of(
                    "maxAllowed", maxPhDrift,
                    "actual", phDrift,
                    "passed", phPass
            ));
            if (!phPass) {
                hasFailure = true;
            }
        }

        List<String> mandatoryParameters = parseJsonList(criteria.getMandatoryParametersJson() == null
                ? protocol.getParametersJson()
                : criteria.getMandatoryParametersJson());

        Map<String, Object> parameterChecks = new LinkedHashMap<>();
        for (String parameter : mandatoryParameters) {
            boolean anyPass = false;
            boolean anyFail = false;

            for (StabilityObservation observation : observations) {
                Map<String, Object> measurementMap = parseJsonMap(observation.getMeasurementsJson());
                Object measurementObj = measurementMap.get(parameter);
                if (!(measurementObj instanceof Map<?, ?> parsed)) {
                    continue;
                }

                Object statusObj = parsed.get("status");
                String status = statusObj == null ? "" : String.valueOf(statusObj).trim().toUpperCase(Locale.ROOT);
                if ("PASS".equals(status)) {
                    anyPass = true;
                }
                if ("FAIL".equals(status)) {
                    anyFail = true;
                }
            }

            boolean parameterPass = anyPass && !anyFail;
            parameterChecks.put(parameter, Map.of(
                    "anyPass", anyPass,
                    "anyFail", anyFail,
                    "passed", parameterPass
            ));
            if (!parameterPass) {
                hasFailure = true;
            }
        }
        ruleChecks.put("mandatoryParameterRules", parameterChecks);

        String outcome = hasFailure ? "FAIL" : "PASS";
        Long nextBatchId = null;
        Long dossierId = null;

        if ("FAIL".equals(outcome)) {
            if (request.getSuspectedIngredients() == null || request.getSuspectedIngredients().isEmpty()) {
                throw new IllegalArgumentException("Suspected ingredients are required for failed stability gate");
            }
            if (request.getRcaCategory() == null || request.getRcaCategory().trim().isEmpty()) {
                throw new IllegalArgumentException("RCA category is required for failed stability gate");
            }
            if (request.getRcaFailureNote() == null || request.getRcaFailureNote().trim().isEmpty()) {
                throw new IllegalArgumentException("Failure note is required for failed stability gate");
            }
            if (request.getRcaCorrectiveAction() == null || request.getRcaCorrectiveAction().trim().isEmpty()) {
                throw new IllegalArgumentException("Corrective action is required for failed stability gate");
            }

            protocol.setStatus("FAILED");

            batchFormula.setStatus("DISCARDED");
            String failRemark = "Stability failed: " + request.getDecisionReason().trim();
            String previousRemark = batchFormula.getRemark() == null ? "" : batchFormula.getRemark().trim();
            batchFormula.setRemark(previousRemark.isBlank() ? failRemark : previousRemark + " | " + failRemark);

            int nextCycle = (project.getTrialCycle() == null || project.getTrialCycle() < 1)
                    ? 2
                    : project.getTrialCycle() + 1;
            project.setTrialCycle(nextCycle);
            project.setLifecycleStage("FORMULATION");

            BatchFormula nextBatch = new BatchFormula();
            nextBatch.setProjectRefId(projectId);
            nextBatch.setBatchName(batchFormula.getBatchName() + "-CYCLE-" + nextCycle + "-DRAFT");
            nextBatch.setTargetBatchSize(batchFormula.getTargetBatchSize());
            nextBatch.setCurrentTotalWeight(batchFormula.getCurrentTotalWeight());
            nextBatch.setFormulaSnapshot(batchFormula.getFormulaSnapshot());
            nextBatch.setStatus("PENDING");
            nextBatch.setRemark("Auto-created from discarded batch #" + batchFormula.getId());
            nextBatchId = batchFormulaRepository.save(nextBatch).getId();
        } else {
            protocol.setStatus("PASSED");
            protocol.setMasterFormulaInfoJson(batchFormula.getFormulaSnapshot());

            project.setLifecycleStage("DOCUMENTATION");

            Dossier dossier = dossierRepository.findByProjectRefId(projectId).orElseGet(() -> {
                Dossier created = new Dossier();
                created.setProjectRefId(projectId);
                created.setStatus("DRAFT");
                created.setChecklistJson(toJson(Map.of(
                        "MFR", "PENDING",
                        "TOXICITY", "PENDING",
                        "INGREDIENT_SHORTLIST", "PENDING",
                        "STABILITY_6M", "PENDING",
                        "MANUFACTURING_BATCH_SHEETS", "PENDING",
                        "FLOW_CHARTS", "PENDING",
                        "VESSEL_CLEANING", "PENDING"
                )));
                return created;
            });
            dossier.setMfrSnapshotJson(batchFormula.getFormulaSnapshot());
            dossierId = dossierRepository.save(dossier).getId();
        }

        stabilityProtocolRepository.save(protocol);
        batchFormulaRepository.save(batchFormula);
        projectRepository.save(project);

        StabilityGateDecision gateDecision = new StabilityGateDecision();
        gateDecision.setProjectRefId(projectId);
        gateDecision.setProtocolRefId(protocolId);
        gateDecision.setBatchRefId(batchFormula.getId());
        gateDecision.setGeneratedBatchRefId(nextBatchId);
        gateDecision.setOutcome(outcome);
        gateDecision.setDecisionReason(request.getDecisionReason().trim());
        gateDecision.setMeasuredValuesJson(toJson(measuredValues));
        gateDecision.setRuleChecksJson(toJson(ruleChecks));
        gateDecision.setDecidedBy(request.getDecidedBy() == null ? "SYSTEM" : request.getDecidedBy().trim());
        gateDecision.setDecidedAt(LocalDateTime.now());
        gateDecision.setSuspectedIngredientsJson(toJson(request.getSuspectedIngredients() == null ? List.of() : request.getSuspectedIngredients()));
        gateDecision.setRcaCategory(request.getRcaCategory() == null ? null : request.getRcaCategory().trim());
        gateDecision.setRcaFailureNote(request.getRcaFailureNote() == null ? null : request.getRcaFailureNote().trim());
        gateDecision.setRcaCorrectiveAction(request.getRcaCorrectiveAction() == null ? null : request.getRcaCorrectiveAction().trim());
        gateDecision.setMfrSnapshotJson("PASS".equals(outcome) ? batchFormula.getFormulaSnapshot() : null);
        stabilityGateDecisionRepository.save(gateDecision);

        String message = "PASS".equals(outcome)
                ? "Stability gate passed. Project moved to DOCUMENTATION."
                : "Stability gate failed. Batch discarded and next trial draft created.";

        return new StabilityGateDecisionResponse(
                outcome,
                project.getLifecycleStage(),
                project.getTrialCycle(),
                "FAIL".equals(outcome) ? batchFormula.getId() : null,
                nextBatchId,
                dossierId,
                message
        );
    }

    @Transactional
    public String applySimpleResult(Long projectId, StabilitySimpleResultRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));

        String result = request.getResult().trim().toUpperCase(Locale.ROOT);
        if ("PASS".equals(result)) {
            project.setLifecycleStage("DOCUMENTATION");
            projectRepository.save(project);
            return "Stability marked as PASS.";
        }

        List<StabilityProtocol> protocols = stabilityProtocolRepository.findByProjectRefIdOrderByCreatedAtDesc(projectId);
        for (StabilityProtocol protocol : protocols) {
            stabilityObservationRepository.deleteByProtocolRefId(protocol.getId());
        }
        stabilityProtocolRepository.deleteByProjectRefId(projectId);

        project.setLifecycleStage("FORMULATION");
        projectRepository.save(project);

        return "Stability marked as FAIL. Stability table cleared. Please create new batch(es).";
    }

    @Transactional
    public String applySimpleResultForProtocol(Long projectId, Long protocolId, StabilitySimpleResultRequest request) {
        StabilityProtocol protocol = getProtocol(projectId, protocolId);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        BatchFormula batchFormula = batchFormulaRepository.findById(protocol.getBatchFormulaRefId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch formula", protocol.getBatchFormulaRefId()));

        String reason = request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("Reason is required");
        }

        String result = request.getResult().trim().toUpperCase(Locale.ROOT);
        if ("PASS".equals(result)) {
            if (isBlank(request.getCompanyName()) || isBlank(request.getDateOfIssue()) || isBlank(request.getBrandName())
                    || isBlank(request.getRevisionNo()) || isBlank(request.getProductName()) || isBlank(request.getRevisionDate())
                    || isBlank(request.getShelfLife()) || isBlank(request.getIssuedBy()) || isBlank(request.getMrfNo())
                    || isBlank(request.getDocNo())) {
                throw new IllegalArgumentException("All master formula header fields are required for PASS");
            }

            Map<String, Object> passInfo = new LinkedHashMap<>();
            passInfo.put("companyName", request.getCompanyName().trim());
            passInfo.put("dateOfIssue", request.getDateOfIssue().trim());
            passInfo.put("brandName", request.getBrandName().trim());
            passInfo.put("revisionNo", request.getRevisionNo().trim());
            passInfo.put("productName", request.getProductName().trim());
            passInfo.put("revisionDate", request.getRevisionDate().trim());
            passInfo.put("shelfLife", request.getShelfLife().trim());
            passInfo.put("issuedBy", request.getIssuedBy().trim());
            passInfo.put("mrfNo", request.getMrfNo().trim());
            passInfo.put("docNo", request.getDocNo().trim());
            passInfo.put("reasonForRevision", reason);

                List<Map<String, Object>> formulaItems = parseFormulaSnapshotItems(batchFormula.getFormulaSnapshot());

                List<Ingredient> allMasterIngredients = ingredientRepository.findAll();
                Map<String, Ingredient> ingredientsByErpCode = allMasterIngredients.stream()
                    .filter(ingredient -> ingredient.getErpCode() != null && !ingredient.getErpCode().isBlank())
                    .collect(Collectors.toMap(
                        ingredient -> ingredient.getErpCode().trim().toUpperCase(Locale.ROOT),
                        ingredient -> ingredient,
                        (first, second) -> first
                    ));
                Map<String, Ingredient> ingredientsByTradeName = allMasterIngredients.stream()
                    .filter(ingredient -> ingredient.getTradeName() != null && !ingredient.getTradeName().isBlank())
                    .collect(Collectors.toMap(
                        ingredient -> normalizeText(ingredient.getTradeName()),
                        ingredient -> ingredient,
                        (first, second) -> first
                    ));
                Map<String, Ingredient> ingredientsByInciName = allMasterIngredients.stream()
                    .filter(ingredient -> ingredient.getInciName() != null && !ingredient.getInciName().isBlank())
                    .collect(Collectors.toMap(
                        ingredient -> normalizeText(ingredient.getInciName()),
                        ingredient -> ingredient,
                        (first, second) -> first
                    ));

            List<Map<String, Object>> mfrIngredients = new ArrayList<>();
            for (int i = 0; i < formulaItems.size(); i++) {
                Map<String, Object> item = formulaItems.get(i);
                String erpCode = item.get("erpCode") == null ? "" : String.valueOf(item.get("erpCode")).trim();
                String ingredientName = asText(item.get("ingredientName"));
                String inciName = asText(item.get("inci"));

                Ingredient master = null;
                if (!erpCode.isEmpty()) {
                    master = ingredientsByErpCode.get(erpCode.toUpperCase(Locale.ROOT));
                }
                if (master == null && !"—".equals(ingredientName)) {
                    master = ingredientsByTradeName.get(normalizeText(ingredientName));
                }
                if (master == null && !"—".equals(inciName)) {
                    master = ingredientsByInciName.get(normalizeText(inciName));
                }

                BigDecimal percentage = BigDecimal.ZERO;
                Object actualPercent = item.get("actualPercent");
                if (actualPercent != null) {
                    try {
                        percentage = new BigDecimal(String.valueOf(actualPercent));
                    } catch (NumberFormatException ignored) {
                        percentage = BigDecimal.ZERO;
                    }
                }

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("srNo", i + 1);
                row.put("erpCode", master != null ? asText(master.getErpCode()) : (erpCode.isEmpty() ? "—" : erpCode));
                row.put("ingredientName", master != null ? asText(master.getTradeName()) : ingredientName);
                row.put("inci", master != null ? asText(master.getInciName()) : inciName);
                row.put("percentage", percentage);
                row.put("vendors", master != null ? asText(master.getSupplierName()) : asText(item.get("vendor")));
                row.put("function", master != null ? asText(master.getFunction()) : asText(item.get("function")));
                mfrIngredients.add(row);
            }

            passInfo.put("ingredients", mfrIngredients);

            protocol.setStatus("PASSED");
            protocol.setMasterFormulaInfoJson(toJson(passInfo));
            stabilityProtocolRepository.save(protocol);

            String passRemark = "Stability PASS: " + reason;
            String existingRemark = batchFormula.getRemark() == null ? "" : batchFormula.getRemark().trim();
            batchFormula.setRemark(existingRemark.isEmpty() ? passRemark : existingRemark + " | " + passRemark);
            batchFormulaRepository.save(batchFormula);

            return "Stability marked as PASS for this batch table.";
        }

        stabilityObservationRepository.deleteByProtocolRefId(protocolId);
        stabilityProtocolRepository.deleteById(protocolId);

        batchFormula.setStatus("DISCARDED");
        String existingRemark = batchFormula.getRemark() == null ? "" : batchFormula.getRemark().trim();
        String failNote = "Stability FAIL: " + reason;
        batchFormula.setRemark(existingRemark.isEmpty() ? failNote : existingRemark + " | " + failNote);
        batchFormulaRepository.save(batchFormula);

        project.setLifecycleStage("FORMULATION");
        projectRepository.save(project);

        return "Stability marked as FAIL for this batch table. Table cleared. Create new batch(es).";
    }

    private List<Map<String, Object>> parseFormulaSnapshotItems(String snapshot) {
        if (snapshot == null || snapshot.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(snapshot, new TypeReference<List<Map<String, Object>>>() {});
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    private String asText(Object value) {
        String text = value == null ? "" : String.valueOf(value).trim();
        return text.isEmpty() ? "—" : text;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    @Transactional
    public StabilityObservation upsertObservation(Long projectId, Long protocolId, StabilityObservationUpsertRequest request) {
        StabilityProtocol protocol = getProtocol(projectId, protocolId);

        String conditionLabel = request.getConditionLabel().trim();
        String intervalLabel = request.getIntervalLabel().trim();

        List<String> protocolConditions = parseJsonList(protocol.getConditionsJson());
        List<String> protocolIntervals = parseJsonList(protocol.getIntervalsJson());

        if (!containsIgnoreCase(protocolConditions, conditionLabel)) {
            throw new IllegalArgumentException("Condition is not configured in this protocol");
        }

        if (!containsIgnoreCase(protocolIntervals, intervalLabel)) {
            throw new IllegalArgumentException("Interval is not configured in this protocol");
        }

        if (isInitialInterval(intervalLabel)) {
            if (request.getObservedOn() == null) {
                throw new IllegalArgumentException("Observed date is required for Initial interval");
            }
        } else {
            StabilityObservation initialObservation = stabilityObservationRepository
                    .findByProtocolRefIdAndConditionLabelIgnoreCaseAndIntervalLabelIgnoreCaseAndObservedOnIsNotNull(protocolId, conditionLabel, "Initial")
                    .orElseThrow(() -> new IllegalArgumentException("Initial observation must be recorded first for this condition"));

            LocalDate dueDate = computeDueDate(initialObservation.getObservedOn(), intervalLabel);
            if (dueDate == null) {
                throw new IllegalArgumentException("Invalid interval format. Use Initial or numeric Day/Month intervals");
            }
        }

        Map<String, Map<String, String>> measurements = request.getMeasurements() == null
                ? new LinkedHashMap<>()
                : request.getMeasurements().entrySet().stream()
                .filter(entry -> entry.getKey() != null && !entry.getKey().isBlank())
                .collect(Collectors.toMap(
                        entry -> entry.getKey().trim(),
                entry -> normalizeMeasurement(entry.getValue()),
                        (first, second) -> second,
                        LinkedHashMap::new
                ));

        StabilityObservation observation = stabilityObservationRepository
                .findByProtocolRefIdAndConditionLabelIgnoreCaseAndIntervalLabelIgnoreCase(protocolId, conditionLabel, intervalLabel)
                .orElseGet(() -> {
                    StabilityObservation created = new StabilityObservation();
                    created.setProtocolRefId(protocolId);
                    created.setConditionLabel(conditionLabel);
                    created.setIntervalLabel(intervalLabel);
                    return created;
                });

        String normalizedStatus = deriveOverallStatus(measurements);

        observation.setMeasurementsJson(toJson(measurements));
        observation.setResultStatus(normalizedStatus);
        observation.setInitialWeight(request.getInitialWeight());
        observation.setCurrentWeight(request.getCurrentWeight());
        observation.setNote(request.getNote() == null ? null : request.getNote().trim());
        observation.setObservedOn(request.getObservedOn());

        return stabilityObservationRepository.save(observation);
    }

    public List<StabilityNotificationResponse> getNotifications() {
        LocalDate today = LocalDate.now();
        List<StabilityNotificationResponse> notifications = new ArrayList<>();
        List<StabilityProtocol> protocols = stabilityProtocolRepository.findAllByOrderByCreatedAtDesc();

        for (StabilityProtocol protocol : protocols) {
            Optional<Project> projectOpt = projectRepository.findById(protocol.getProjectRefId());
            if (projectOpt.isEmpty()) {
                continue;
            }

            Project project = projectOpt.get();
            List<String> conditions = parseJsonList(protocol.getConditionsJson());
            List<String> intervals = parseJsonList(protocol.getIntervalsJson());
            List<StabilityObservation> observations = stabilityObservationRepository.findByProtocolRefId(protocol.getId());

            Map<String, StabilityObservation> observationMap = observations.stream()
                    .collect(Collectors.toMap(
                            observation -> observation.getConditionLabel().trim().toLowerCase(Locale.ROOT)
                                    + "__"
                                    + observation.getIntervalLabel().trim().toLowerCase(Locale.ROOT),
                            observation -> observation,
                            (first, second) -> second,
                            LinkedHashMap::new
                    ));

            for (String condition : conditions) {
                StabilityObservation initialObservation = observationMap.get(
                        condition.trim().toLowerCase(Locale.ROOT) + "__initial"
                );

                if (initialObservation == null || initialObservation.getObservedOn() == null) {
                    continue;
                }

                for (String interval : intervals) {
                    if (isInitialInterval(interval)) {
                        continue;
                    }

                    LocalDate dueDate = computeDueDate(initialObservation.getObservedOn(), interval);
                    if (dueDate == null) {
                        continue;
                    }

                    String mapKey = condition.trim().toLowerCase(Locale.ROOT)
                            + "__"
                            + interval.trim().toLowerCase(Locale.ROOT);
                    StabilityObservation targetObservation = observationMap.get(mapKey);
                    boolean isTaken = targetObservation != null && targetObservation.getObservedOn() != null;
                    if (isTaken) {
                        continue;
                    }

                    if (today.equals(dueDate.minusDays(1))) {
                        notifications.add(new StabilityNotificationResponse(
                                "REMINDER",
                                project.getId(),
                                project.getProjectId(),
                                project.getProjectName(),
                                protocol.getId(),
                                protocol.getProtocolName(),
                                condition,
                                interval,
                                dueDate,
                                "Stability observation is due tomorrow"
                        ));
                    } else if (!today.isBefore(dueDate.plusDays(1))) {
                        notifications.add(new StabilityNotificationResponse(
                                "OVERDUE",
                                project.getId(),
                                project.getProjectId(),
                                project.getProjectName(),
                                protocol.getId(),
                                protocol.getProtocolName(),
                                condition,
                                interval,
                                dueDate,
                                "Stability observation is overdue"
                        ));
                    }
                }
            }
        }

        return notifications;
    }

    private void validateProject(Long projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new ResourceNotFoundException("Project", projectId);
        }
    }

    private List<String> sanitize(List<String> values, String fieldName) {
        if (values == null || values.isEmpty()) {
            throw new IllegalArgumentException("At least one " + fieldName + " value is required");
        }

        Set<String> cleaned = values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (cleaned.isEmpty()) {
            throw new IllegalArgumentException("At least one " + fieldName + " value is required");
        }

        return List.copyOf(cleaned);
    }

    private boolean containsIgnoreCase(List<String> values, String target) {
        String normalizedTarget = target.trim().toLowerCase(Locale.ROOT);
        return values.stream().anyMatch(value -> value.toLowerCase(Locale.ROOT).equals(normalizedTarget));
    }

    private void validateIntervals(List<String> intervals) {
        if (!containsIgnoreCase(intervals, "Initial")) {
            throw new IllegalArgumentException("Initial interval is mandatory");
        }

        for (String interval : intervals) {
            if (isInitialInterval(interval)) {
                continue;
            }
            if (computeDueDate(LocalDate.now(), interval) == null) {
                throw new IllegalArgumentException("Invalid interval format. Use Initial or numeric Day/Month intervals");
            }
        }
    }

    private boolean isInitialInterval(String intervalLabel) {
        return intervalLabel != null && "initial".equals(intervalLabel.trim().toLowerCase(Locale.ROOT));
    }

    private LocalDate computeDueDate(LocalDate initialDate, String intervalLabel) {
        if (initialDate == null || intervalLabel == null || intervalLabel.isBlank()) {
            return null;
        }

        if (isInitialInterval(intervalLabel)) {
            return initialDate;
        }

        String normalized = intervalLabel.trim().toLowerCase(Locale.ROOT);
        String[] parts = normalized.split("\\s+");
        if (parts.length < 2) {
            return null;
        }

        int amount;
        try {
            amount = Integer.parseInt(parts[0]);
        } catch (NumberFormatException ex) {
            return null;
        }

        if (amount <= 0) {
            return null;
        }

        String unit = parts[1];
        if (unit.startsWith("day")) {
            return initialDate.plusDays(amount);
        }

        if (unit.startsWith("month")) {
            return initialDate.plusMonths(amount);
        }

        return null;
    }

    private Map<String, String> normalizeMeasurement(StabilityMeasurementRequest measurementRequest) {
        String status = measurementRequest == null || measurementRequest.getStatus() == null
                ? "NA"
                : measurementRequest.getStatus().trim().toUpperCase(Locale.ROOT);

        if (!"PASS".equals(status) && !"FAIL".equals(status) && !"NA".equals(status)) {
            throw new IllegalArgumentException("Each measurement status must be PASS, FAIL or NA");
        }

        String value = measurementRequest == null || measurementRequest.getValue() == null
                ? ""
                : measurementRequest.getValue().trim();

        Map<String, String> normalized = new LinkedHashMap<>();
        normalized.put("status", status);
        normalized.put("value", value);
        return normalized;
    }

    private String deriveOverallStatus(Map<String, Map<String, String>> measurements) {
        if (measurements == null || measurements.isEmpty()) {
            return "NA";
        }

        boolean hasPass = false;
        for (Map<String, String> measurement : measurements.values()) {
            String status = measurement == null ? null : measurement.get("status");
            if ("FAIL".equals(status)) {
                return "FAIL";
            }
            if ("PASS".equals(status)) {
                hasPass = true;
            }
        }

        return hasPass ? "PASS" : "NA";
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Failed to serialize payload");
        }
    }

    private List<String> parseJsonList(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Invalid protocol configuration");
        }
    }

    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Invalid observation payload");
        }
    }

    private Map<String, String> normalizeParameterReferences(List<String> parameters,
                                                             Map<String, String> rawReferences) {
        Map<String, String> references = new LinkedHashMap<>();
        if (parameters == null || parameters.isEmpty()) {
            return references;
        }

        Map<String, String> input = rawReferences == null ? Map.of() : rawReferences;
        Map<String, String> normalizedLookup = new LinkedHashMap<>();
        input.forEach((key, value) -> {
            if (key == null || key.isBlank()) {
                return;
            }
            String cleanKey = key.trim();
            String cleanValue = value == null ? "" : value.trim();
            if (cleanValue.length() > 500) {
                throw new IllegalArgumentException("Reference value for parameter '" + cleanKey + "' is too long");
            }
            normalizedLookup.put(cleanKey.toLowerCase(Locale.ROOT), cleanValue);
        });

        for (String parameter : parameters) {
            String cleanParameter = parameter == null ? "" : parameter.trim();
            if (cleanParameter.isEmpty()) {
                continue;
            }
            String reference = normalizedLookup.getOrDefault(cleanParameter.toLowerCase(Locale.ROOT), "");
            references.put(cleanParameter, reference);
        }

        return references;
    }
}
