package com.medplus.r.d.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BatchFormulaRemarkRequest {

    @NotBlank(message = "Remark is required")
    private String remark;
}
