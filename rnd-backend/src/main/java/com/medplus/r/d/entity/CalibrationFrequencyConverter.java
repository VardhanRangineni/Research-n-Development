package com.medplus.r.d.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class CalibrationFrequencyConverter implements AttributeConverter<CalibrationFrequency, String> {

    @Override
    public String convertToDatabaseColumn(CalibrationFrequency attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public CalibrationFrequency convertToEntityAttribute(String dbData) {
        return CalibrationFrequency.fromValueOrNull(dbData);
    }
}
