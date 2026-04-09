package com.medplus.r.d.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateProjectNameRequest {
    @NotBlank(message = "Project name is required")
    private String projectName;
}
