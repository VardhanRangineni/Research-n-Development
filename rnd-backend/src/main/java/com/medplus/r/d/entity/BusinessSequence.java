package com.medplus.r.d.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "business_sequences")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessSequence {

    @Id
    @Column(name = "sequence_name", length = 80, nullable = false)
    private String name;

    @Column(name = "current_value", nullable = false)
    private Long currentValue;
}