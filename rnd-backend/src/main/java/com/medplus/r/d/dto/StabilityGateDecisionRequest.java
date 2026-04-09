package com.medplus.r.d.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class StabilityGateDecisionRequest {

    private BigDecimal initialWeight;
    private BigDecimal currentWeight;
    private BigDecimal initialPh;
    private BigDecimal currentPh;

    @NotBlank(message = "Decision reason is required")
    private String decisionReason;

    private String decidedBy;

    private List<String> suspectedIngredients;
    private String rcaCategory;
    private String rcaFailureNote;
    private String rcaCorrectiveAction;
}
