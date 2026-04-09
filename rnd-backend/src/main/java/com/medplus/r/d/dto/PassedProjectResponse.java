package com.medplus.r.d.dto;

import com.medplus.r.d.entity.BatchFormula;
import com.medplus.r.d.entity.Project;
import com.medplus.r.d.entity.StabilityProtocol;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PassedProjectResponse {
    private Project project;
    private List<PassedProtocolSummary> passedProtocols;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PassedProtocolSummary {
        private StabilityProtocol protocol;
        private BatchFormula linkedBatch;
        private Long existingProcedureFileId;
    }
}
