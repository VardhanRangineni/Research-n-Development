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

import java.time.LocalDateTime;

@Entity
@Table(name = "stability_protocols", indexes = {
    @Index(name = "idx_stability_protocols_project", columnList = "project_ref_id"),
    @Index(name = "idx_stability_protocols_batch_formula", columnList = "batch_formula_ref_id"),
    @Index(name = "idx_stability_protocols_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StabilityProtocol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "project_ref_id", nullable = false)
    private Long projectRefId;

    @NotNull
    @Column(name = "batch_formula_ref_id", nullable = false)
    private Long batchFormulaRefId;

    @NotBlank
    @Column(nullable = false, length = 160)
    private String protocolName;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String conditionsJson;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String intervalsJson;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String parametersJson;

    @Column(columnDefinition = "TEXT")
    private String parameterReferencesJson;

    @Column(nullable = false, length = 24)
    private String status = "ACTIVE";

    @Column(columnDefinition = "TEXT")
    private String masterFormulaInfoJson;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
