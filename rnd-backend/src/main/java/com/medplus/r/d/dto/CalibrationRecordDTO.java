package com.medplus.r.d.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CalibrationRecordDTO {
    private Long id;

    @NotNull(message = "Equipment ID is required")
    private Long equipmentId;

    @NotBlank(message = "Machine ID is required")
    private String machineId;

    @NotBlank(message = "Instrument Type is required")
    private String instrumentType;

    @NotNull(message = "Calibration date is required")
    private LocalDate date;

    @NotBlank(message = "Calibration status is required")
    private String status;

    private String readings; // JSON string
    private String doneBy;
    private String note;
}
