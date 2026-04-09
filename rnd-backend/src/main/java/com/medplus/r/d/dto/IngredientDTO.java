package com.medplus.r.d.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IngredientDTO {
    private Long id;

    @NotBlank(message = "ERP code is required")
    private String erpCode;

    @NotBlank(message = "Trade name is required")
    private String tradeName;

    @NotBlank(message = "INCI name is required")
    private String inciName;

    @NotBlank(message = "Supplier name is required")
    private String supplierName;

    private String function;
    private String grade;
    private String casNumber;
    private String ecNo;
    private String price;
    private String uom;
    private String safetyLevel;
    private String complianceStatus;
}
