package com.medplus.r.d.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

public enum CalibrationFrequency {
    NONE("None"),
    DAILY("Daily"),
    WEEKLY("Weekly"),
    MONTHLY("Monthly"),
    QUARTERLY("Quarterly"),
    HALFYEARLY("HalfYearly"),
    YEARLY("Yearly");

    private final String label;

    CalibrationFrequency(String label) {
        this.label = label;
    }

    @JsonValue
    public String getLabel() {
        return label;
    }

    @JsonCreator
    public static CalibrationFrequency fromValue(String value) {
        CalibrationFrequency parsed = fromValueOrNull(value);
        if (parsed == null) {
            throw new IllegalArgumentException("Invalid calibration frequency: " + value);
        }
        return parsed;
    }

    public static CalibrationFrequency fromValueOrNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = normalize(value);
        for (CalibrationFrequency frequency : values()) {
            if (normalize(frequency.name()).equals(normalized) || normalize(frequency.label).equals(normalized)) {
                return frequency;
            }
        }

        if ("HALFYEAR".equals(normalized) || "SEMIANNUAL".equals(normalized)) {
            return HALFYEARLY;
        }

        return null;
    }

    private static String normalize(String value) {
        return value.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }
}
