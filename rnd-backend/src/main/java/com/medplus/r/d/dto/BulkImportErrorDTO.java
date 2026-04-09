package com.medplus.r.d.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkImportErrorDTO {
    private int rowNumber;
    private String identifier;
    private String message;
}
