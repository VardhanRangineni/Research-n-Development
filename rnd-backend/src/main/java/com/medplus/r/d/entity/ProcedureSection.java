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
@Table(name = "procedure_sections", indexes = {
    @Index(name = "idx_procedure_sections_file", columnList = "procedure_file_ref_id"),
    @Index(name = "idx_procedure_sections_step_no", columnList = "step_no")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProcedureSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "procedure_file_ref_id", nullable = false)
    private Long procedureFileRefId;

    @Column(name = "step_no", nullable = false)
    private Integer stepNo;

    @Column(columnDefinition = "TEXT")
    private String descriptionOfProcess;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
