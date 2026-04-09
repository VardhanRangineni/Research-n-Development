package com.medplus.r.d.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "procedure_rows", uniqueConstraints = {
    @UniqueConstraint(name = "uk_procedure_rows_section_order", columnNames = {"section_ref_id", "row_order"})
}, indexes = {
    @Index(name = "idx_procedure_rows_section", columnList = "section_ref_id")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProcedureRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "section_ref_id", nullable = false)
    private Long sectionRefId;

    @Column(columnDefinition = "TEXT")
    private String nameOfMaterial;

    @Column(name = "formula_qty_per_100_kg", length = 120)
    private String formulaQtyPer100Kg;

    @Column(length = 120)
    private String actualQty;

    @Column(length = 120)
    private String standardTime;

    @Column(length = 120)
    private String rpm;

    @Column(name = "row_order", nullable = false)
    private Integer rowOrder;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
