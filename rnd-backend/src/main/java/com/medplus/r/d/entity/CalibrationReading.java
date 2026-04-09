package com.medplus.r.d.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CalibrationReading implements Serializable {
    private Double expected;
    private Double actual;
    private String unit;
}
