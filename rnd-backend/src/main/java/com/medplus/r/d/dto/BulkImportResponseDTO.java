package com.medplus.r.d.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkImportResponseDTO {
    private int total;
    private int created;
    private int failed;
    private List<BulkImportErrorDTO> errors = new ArrayList<>();
}
