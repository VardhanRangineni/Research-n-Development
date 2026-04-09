package com.medplus.r.d.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Data
public class StabilityObservationUpsertRequest {

    @NotBlank(message = "Condition is required")
    private String conditionLabel;

    @NotBlank(message = "Interval is required")
    private String intervalLabel;

    private Map<String, StabilityMeasurementRequest> measurements;

    private String resultStatus;

    private BigDecimal initialWeight;

    private BigDecimal currentWeight;

    private String note;

    private LocalDate observedOn;
}
