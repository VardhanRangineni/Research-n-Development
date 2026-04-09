package com.medplus.r.d.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

public enum EquipmentStatus {
    ACTIVE("Active"),
    INACTIVE("Inactive"),
    MAINTENANCE("Under Maintenance"),
    CALIBRATION_OVERDUE("Calibration Overdue"),
    MACHINE_REMOVED("Machine Removed"),
    MACHINE_NOT_IN_USE("Machine Not in Use");

    private final String label;

    EquipmentStatus(String label) {
        this.label = label;
    }

    @JsonValue
    public String getLabel() {
        return label;
    }

    @JsonCreator
    public static EquipmentStatus fromValue(String value) {
        EquipmentStatus parsed = fromValueOrNull(value);
        if (parsed == null) {
            throw new IllegalArgumentException("Invalid equipment status: " + value);
        }
        return parsed;
    }

    public static EquipmentStatus fromValueOrNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = normalize(value);

        for (EquipmentStatus status : values()) {
            if (normalize(status.name()).equals(normalized) || normalize(status.label).equals(normalized)) {
                return status;
            }
        }

        return null;
    }

    private static String normalize(String value) {
        return value.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }
}
