package com.medplus.r.d.controller;

import com.medplus.r.d.dto.StabilityObservationUpsertRequest;
import com.medplus.r.d.dto.PagedResponse;
import com.medplus.r.d.dto.StabilityGateCriteriaRequest;
import com.medplus.r.d.dto.StabilityGateDecisionRequest;
import com.medplus.r.d.dto.StabilityGateDecisionResponse;
import com.medplus.r.d.dto.StabilityProtocolCreateRequest;
import com.medplus.r.d.dto.StabilitySimpleResultRequest;
import com.medplus.r.d.dto.StabilityProtocolUpdateRequest;
import com.medplus.r.d.entity.StabilityGateCriteria;
import com.medplus.r.d.entity.StabilityObservation;
import com.medplus.r.d.entity.StabilityProtocol;
import com.medplus.r.d.service.StabilityService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects/{projectId}/stability-protocols")
public class StabilityController {

    @Autowired
    private StabilityService stabilityService;

    @GetMapping
    public ResponseEntity<PagedResponse<StabilityProtocol>> getProtocols(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        return ResponseEntity.ok(stabilityService.getProtocolsByProject(projectId, page, size));
    }

    @GetMapping("/{protocolId}")
    public ResponseEntity<StabilityProtocol> getProtocol(@PathVariable Long projectId,
                                                         @PathVariable Long protocolId) {
        return ResponseEntity.ok(stabilityService.getProtocol(projectId, protocolId));
    }

    @PostMapping
    public ResponseEntity<StabilityProtocol> createProtocol(@PathVariable Long projectId,
                                                            @Valid @RequestBody StabilityProtocolCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stabilityService.createProtocol(projectId, request));
    }

    @PutMapping("/{protocolId}/config")
    public ResponseEntity<StabilityProtocol> updateProtocolConfig(@PathVariable Long projectId,
                                                                  @PathVariable Long protocolId,
                                                                  @Valid @RequestBody StabilityProtocolUpdateRequest request) {
        return ResponseEntity.ok(stabilityService.updateProtocolConfig(projectId, protocolId, request));
    }

    @GetMapping("/{protocolId}/observations")
    public ResponseEntity<PagedResponse<StabilityObservation>> getObservations(@PathVariable Long projectId,
                                                                               @PathVariable Long protocolId,
                                                                               @RequestParam(defaultValue = "0") int page,
                                                                               @RequestParam(defaultValue = "500") int size) {
        return ResponseEntity.ok(stabilityService.getObservations(projectId, protocolId, page, size));
    }

    @PutMapping("/{protocolId}/observations")
    public ResponseEntity<StabilityObservation> upsertObservation(@PathVariable Long projectId,
                                                                  @PathVariable Long protocolId,
                                                                  @Valid @RequestBody StabilityObservationUpsertRequest request) {
        return ResponseEntity.ok(stabilityService.upsertObservation(projectId, protocolId, request));
    }

    @GetMapping("/{protocolId}/gate/criteria")
    public ResponseEntity<StabilityGateCriteria> getGateCriteria(@PathVariable Long projectId,
                                                                 @PathVariable Long protocolId) {
        return ResponseEntity.ok(stabilityService.getGateCriteria(projectId, protocolId));
    }

    @PutMapping("/{protocolId}/gate/criteria")
    public ResponseEntity<StabilityGateCriteria> saveGateCriteria(@PathVariable Long projectId,
                                                                  @PathVariable Long protocolId,
                                                                  @RequestBody StabilityGateCriteriaRequest request) {
        return ResponseEntity.ok(stabilityService.saveGateCriteria(projectId, protocolId, request));
    }

    @PostMapping("/{protocolId}/gate/decide")
    public ResponseEntity<StabilityGateDecisionResponse> decideGate(@PathVariable Long projectId,
                                                                    @PathVariable Long protocolId,
                                                                    @Valid @RequestBody StabilityGateDecisionRequest request) {
        return ResponseEntity.ok(stabilityService.evaluateAndApplyGateDecision(projectId, protocolId, request));
    }

    @PostMapping("/simple-result")
    public ResponseEntity<Map<String, String>> applySimpleResult(@PathVariable Long projectId,
                                                                 @Valid @RequestBody StabilitySimpleResultRequest request) {
        String message = stabilityService.applySimpleResult(projectId, request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/{protocolId}/simple-result")
    public ResponseEntity<Map<String, String>> applySimpleResultForProtocol(@PathVariable Long projectId,
                                                                             @PathVariable Long protocolId,
                                                                             @Valid @RequestBody StabilitySimpleResultRequest request) {
        String message = stabilityService.applySimpleResultForProtocol(projectId, protocolId, request);
        return ResponseEntity.ok(Map.of("message", message));
    }
}
