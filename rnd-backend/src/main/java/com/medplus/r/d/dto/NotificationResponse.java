package com.medplus.r.d.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

@Data
@AllArgsConstructor
public class NotificationResponse {
    private String source;
    private String type;
    private String title;
    private String message;
    private LocalDate dueDate;
    private Long projectRefId;
    private String projectId;
    private String projectName;
    private Long protocolId;
    private String protocolName;
    private String conditionLabel;
    private String intervalLabel;
}
