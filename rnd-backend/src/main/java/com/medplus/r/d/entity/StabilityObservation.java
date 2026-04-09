package com.medplus.r.d.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "stability_observations", uniqueConstraints = {
    @UniqueConstraint(name = "uk_stability_observations_protocol_condition_interval", columnNames = {"protocol_ref_id", "condition_label", "interval_label"})
}, indexes = {
    @Index(name = "idx_stability_observations_protocol", columnList = "protocol_ref_id"),
    @Index(name = "idx_stability_observations_observed_on", columnList = "observed_on")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StabilityObservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "protocol_ref_id", nullable = false)
    private Long protocolRefId;

    @NotBlank
    @Column(name = "condition_label", nullable = false, length = 120)
    private String conditionLabel;

    @NotBlank
    @Column(name = "interval_label", nullable = false, length = 120)
    private String intervalLabel;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String measurementsJson;

    @NotBlank
    @Column(nullable = false, length = 8)
    private String resultStatus;

    @Column(precision = 14, scale = 4)
    private BigDecimal initialWeight;

    @Column(precision = 14, scale = 4)
    private BigDecimal currentWeight;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "observed_on")
    private LocalDate observedOn;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
