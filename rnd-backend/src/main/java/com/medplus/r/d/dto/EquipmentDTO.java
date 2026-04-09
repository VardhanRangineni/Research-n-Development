package com.medplus.r.d.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentDTO {
    private Long id;

    @NotBlank(message = "Machine ID is required")
    private String machineId;

    @NotBlank(message = "Instrument Type is required")
    private String instrumentType;

    @NotBlank(message = "Equipment name is required")
    private String name;

    private String model;
    private String serialNumber;
    private LocalDate lastCalibration;
    private LocalDate nextCalibration;
    private String frequency;
    private String status;

    // Calibration template fields (flattened for API simplicity)
    private java.util.List<Double> expectedValues;
    private Double errorMargin;
    private String unit;
}
