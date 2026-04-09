package com.medplus.r.d.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "equipment")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Equipment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Machine ID is required")
    @Column(nullable = false, unique = true)
    private String machineId;

    @NotBlank(message = "Instrument Type is required")
    @Column(nullable = false)
    private String instrumentType;

    @NotBlank(message = "Equipment name is required")
    @Column(nullable = false)
    private String name;

    private String model;
    private String serialNumber;

    private LocalDate lastCalibration;
    private LocalDate nextCalibration;

    @Convert(converter = CalibrationFrequencyConverter.class)
    private CalibrationFrequency frequency;

    @Convert(converter = EquipmentStatusConverter.class)
    private EquipmentStatus status;

    @JdbcTypeCode(SqlTypes.JSON)
    private CalibrationTemplate calibrationTemplate;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
