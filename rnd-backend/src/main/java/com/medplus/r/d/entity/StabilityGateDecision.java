package com.medplus.r.d.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "stability_gate_decisions")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StabilityGateDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long projectRefId;

    @Column(nullable = false)
    private Long protocolRefId;

    @Column(nullable = false)
    private Long batchRefId;

    private Long generatedBatchRefId;

    @Column(nullable = false, length = 12)
    private String outcome;

    @Column(columnDefinition = "TEXT")
    private String decisionReason;

    @Column(columnDefinition = "TEXT")
    private String measuredValuesJson;

    @Column(columnDefinition = "TEXT")
    private String ruleChecksJson;

    @Column(length = 120)
    private String decidedBy;

    private LocalDateTime decidedAt;

    @Column(columnDefinition = "TEXT")
    private String suspectedIngredientsJson;

    @Column(length = 64)
    private String rcaCategory;

    @Column(columnDefinition = "TEXT")
    private String rcaFailureNote;

    @Column(columnDefinition = "TEXT")
    private String rcaCorrectiveAction;

    @Column(columnDefinition = "TEXT")
    private String mfrSnapshotJson;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
