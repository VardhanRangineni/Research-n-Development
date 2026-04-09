package com.medplus.r.d.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

@Data
@AllArgsConstructor
public class StabilityNotificationResponse {
    private String type;
    private Long projectRefId;
    private String projectId;
    private String projectName;
    private Long protocolId;
    private String protocolName;
    private String conditionLabel;
    private String intervalLabel;
    private LocalDate dueDate;
    private String message;
}
