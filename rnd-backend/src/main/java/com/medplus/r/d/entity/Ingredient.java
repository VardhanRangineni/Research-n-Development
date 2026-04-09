package com.medplus.r.d.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ingredients")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Ingredient {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "ERP code is required")
    @Column(nullable = false, unique = true)
    private String erpCode;

    @NotBlank(message = "Trade name is required")
    @Column(nullable = false)
    private String tradeName;

    @NotBlank(message = "INCI name is required")
    @Column(nullable = false)
    private String inciName;

    @NotBlank(message = "Supplier name is required")
    @Column(nullable = false)
    private String supplierName;

    @Column(name = "ingredient_function")
    private String function;

    private String grade;

    private String casNumber;

    private String ecNo;

    private String price;

    private String uom;

    private String safetyLevel;

    private String complianceStatus;

    /**
     * Specific Gravity (optional). Only relevant for liquid ingredients (UOM = ml).
     * Used to convert Volume (mL) → Weight (g): weight = volumeMl × specificGravity.
     */
    @DecimalMin(value = "0.0001", message = "Specific gravity must be greater than zero")
    @Column(name = "specific_gravity", precision = 10, scale = 6)
    private BigDecimal specificGravity;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
