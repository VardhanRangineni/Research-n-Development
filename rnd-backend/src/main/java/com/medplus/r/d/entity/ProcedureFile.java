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
@Table(name = "procedure_files", uniqueConstraints = {
    @UniqueConstraint(name = "uk_procedure_files_protocol", columnNames = "protocol_ref_id")
}, indexes = {
    @Index(name = "idx_procedure_files_project", columnList = "project_ref_id"),
    @Index(name = "idx_procedure_files_protocol", columnList = "protocol_ref_id")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProcedureFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "project_ref_id", nullable = false)
    private Long projectRefId;

    @NotNull
    @Column(name = "protocol_ref_id", nullable = false)
    private Long protocolRefId;

    // Left-side header fields
    @Column(length = 255)
    private String productName;

    @Column(length = 255)
    private String brandName;

    @Column(length = 120)
    private String mfrNo;

    @Column(length = 120)
    private String batchNo;

    @Column(length = 120)
    private String batchSize;

    @Column(length = 120)
    private String mfgDate;

    @Column(length = 120)
    private String dateOfCompletion;

    // Right-side header fields
    @Column(length = 120)
    private String revisionNo;

    @Column(length = 120)
    private String revisionDate;

    @Column(length = 120)
    private String documentNo;

    @Column(length = 120)
    private String shelfLife;

    @Column(length = 120)
    private String mixerCapacity;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
