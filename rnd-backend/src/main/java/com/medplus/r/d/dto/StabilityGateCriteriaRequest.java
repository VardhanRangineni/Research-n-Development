package com.medplus.r.d.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class StabilityGateCriteriaRequest {
    private BigDecimal maxWeightLossPercent;
    private BigDecimal maxPhDrift;
    private List<String> mandatoryParameters;
    private Map<String, Map<String, BigDecimal>> conditionThresholds;
}
