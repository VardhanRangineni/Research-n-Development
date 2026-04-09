package com.medplus.r.d.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "calibration_records")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CalibrationRecord implements Serializable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Equipment ID is required")
    @Column(nullable = false)
    private Long equipmentId;

    @NotBlank(message = "Machine ID is required")
    @Column(nullable = false)
    private String machineId;

    @NotBlank(message = "Instrument Type is required")
    @Column(nullable = false)
    private String instrumentType;

    @NotNull(message = "Calibration date is required")
    @Column(nullable = false)
    private LocalDate date;

    @NotBlank(message = "Calibration status is required")
    @Column(nullable = false)
    private String status; // "Pass" or "Fail"

    // Store JSON array of readings as a native String
    @Column(columnDefinition = "json")
    private String readings;

    private String doneBy; // name of who did the calibration

    @Column(length = 1000)
    private String note; // optional note

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
