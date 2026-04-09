package com.medplus.r.d.dto;

import com.medplus.r.d.entity.BatchFormula;
import com.medplus.r.d.entity.Benchmark;
import com.medplus.r.d.entity.Project;
import com.medplus.r.d.entity.StabilityObservation;
import com.medplus.r.d.entity.StabilityProtocol;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditTrailResponse {
    private String benchmarkId;
    private Benchmark benchmark;
    private Project project;
    private List<BatchFormula> batches;
    private List<StabilityProtocol> stabilityProtocols;
    private List<StabilityObservation> stabilityObservations;
}
