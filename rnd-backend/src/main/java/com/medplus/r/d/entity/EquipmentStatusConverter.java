package com.medplus.r.d.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class EquipmentStatusConverter implements AttributeConverter<EquipmentStatus, String> {

    @Override
    public String convertToDatabaseColumn(EquipmentStatus attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public EquipmentStatus convertToEntityAttribute(String dbData) {
        return EquipmentStatus.fromValueOrNull(dbData);
    }
}
