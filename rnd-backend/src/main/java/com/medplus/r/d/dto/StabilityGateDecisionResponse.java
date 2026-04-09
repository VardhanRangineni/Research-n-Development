package com.medplus.r.d.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StabilityGateDecisionResponse {
    private String outcome;
    private String projectLifecycleStage;
    private Integer trialCycle;
    private Long discardedBatchId;
    private Long nextBatchId;
    private Long dossierId;
    private String message;
}
