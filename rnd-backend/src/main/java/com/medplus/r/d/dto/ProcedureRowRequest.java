package com.medplus.r.d.dto;

import lombok.Data;

@Data
public class ProcedureRowRequest {
    private String nameOfMaterial;
    private String formulaQtyPer100Kg;
    private String actualQty;
    private String standardTime;
    private String rpm;
}
