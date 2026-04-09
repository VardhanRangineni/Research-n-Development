package com.medplus.r.d.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "benchmarks", indexes = {
    @Index(name = "idx_benchmarks_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Benchmark {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String projectId;

    @Column(unique = true)
    private String benchmarkId;

    @NotBlank(message = "Competitor name is required")
    @Column(nullable = false)
    private String competitorName;

    @NotBlank(message = "Product name is required")
    @Column(nullable = false)
    private String productName;

    private String segment;

    @Column(columnDefinition = "TEXT")
    private String claimedBenefits;

    @Column(columnDefinition = "TEXT")
    private String ingredientsList;

    @Column(nullable = false)
    private String status = "Active";

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
