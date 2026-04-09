package com.medplus.r.d.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class BatchFormulaCreateRequest {

    @NotBlank(message = "Batch name is required")
    private String batchName;

    @NotNull(message = "Target batch size is required")
    @DecimalMin(value = "0.0001", message = "Target batch size must be greater than zero")
    private BigDecimal targetBatchSize;

    @NotNull(message = "Current total weight is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Current total weight must be zero or greater")
    private BigDecimal currentTotalWeight;

    @NotBlank(message = "Formula snapshot is required")
    private String formulaSnapshot;
}
