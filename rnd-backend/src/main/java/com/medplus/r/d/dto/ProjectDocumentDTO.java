package com.medplus.r.d.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDocumentDTO {
    private Long id;
    private Long projectRefId;
    private String projectId;
    private String benchmarkId;
    private String projectName;
    private String originalFileName;
    private String contentType;
    private Long fileSize;
    private String uploadedBy;
    private LocalDateTime uploadedAt;
    private String downloadUrl;
}
