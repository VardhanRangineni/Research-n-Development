package com.medplus.r.d.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class BatchFormulaDecisionRequest {

    @NotBlank(message = "Status is required")
    @Pattern(regexp = "(?i)^APPROVED$", message = "Status must be APPROVED")
    private String status;

    @NotBlank(message = "Remark is required")
    private String remark;
}
