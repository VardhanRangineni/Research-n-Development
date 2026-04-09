package com.medplus.r.d.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class StabilityProtocolCreateRequest {

    @NotNull(message = "Batch formula id is required")
    private Long batchFormulaId;

    @NotBlank(message = "Protocol name is required")
    private String protocolName;

    @NotEmpty(message = "At least one chamber condition is required")
    private List<String> conditions;

    @NotEmpty(message = "At least one interval is required")
    private List<String> intervals;

    @NotEmpty(message = "At least one parameter is required")
    private List<String> parameters;

    private Map<String, String> parameterReferences;
}
