package com.medplus.r.d.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BenchmarkDTO {
    private Long id;
    private String projectId;

    @NotBlank(message = "Competitor name is required")
    private String competitorName;

    @NotBlank(message = "Product name is required")
    private String productName;

    private String segment;
    private String claimedBenefits;
    private String ingredientsList;
}
