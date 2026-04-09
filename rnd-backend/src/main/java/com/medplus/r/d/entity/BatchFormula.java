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
import java.time.LocalDateTime;

@Entity
@Table(name = "batch_formulas", uniqueConstraints = {
    @UniqueConstraint(name = "uk_batch_formulas_batch_name", columnNames = "batch_name")
}, indexes = {
    @Index(name = "idx_batch_formulas_project", columnList = "project_ref_id"),
    @Index(name = "idx_batch_formulas_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchFormula {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_ref_id", nullable = false)
    private Long projectRefId;

    @NotBlank
    @Column(name = "batch_name", nullable = false)
    private String batchName;

    @NotNull
    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal targetBatchSize;

    @NotNull
    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal currentTotalWeight;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String formulaSnapshot;

    @Column(columnDefinition = "TEXT")
    private String remark;

    @Column(nullable = false)
    private String status = "PENDING";

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
