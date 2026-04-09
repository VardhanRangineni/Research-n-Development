package com.medplus.r.d.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class StabilitySimpleResultRequest {

    @NotBlank(message = "Result is required")
    @Pattern(regexp = "(?i)^(PASS|FAIL)$", message = "Result must be PASS or FAIL")
    private String result;

    private String reason;

    private String companyName;
    private String dateOfIssue;
    private String brandName;
    private String revisionNo;
    private String productName;
    private String revisionDate;
    private String shelfLife;
    private String issuedBy;
    private String mrfNo;
    private String docNo;
}
