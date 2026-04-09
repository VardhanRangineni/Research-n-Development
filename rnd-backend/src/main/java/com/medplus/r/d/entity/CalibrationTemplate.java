package com.medplus.r.d.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CalibrationTemplate implements Serializable {
    private List<Double> expectedValues;
    private Double errorMargin;
    private String unit;
}
