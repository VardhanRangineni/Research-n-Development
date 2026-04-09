package com.medplus.r.d.controller;

import com.medplus.r.d.dto.PagedResponse;
import com.medplus.r.d.dto.UpdateProjectNameRequest;
import com.medplus.r.d.entity.Project;
import com.medplus.r.d.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @GetMapping
    public ResponseEntity<PagedResponse<Project>> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(projectService.getAllProjects(page, size, q));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getProjectById(id));
    }

    @PutMapping("/{id}/name")
    public ResponseEntity<Project> updateProjectName(@PathVariable Long id,
            @Valid @RequestBody UpdateProjectNameRequest request) {
        return ResponseEntity.ok(projectService.updateProjectName(id, request.getProjectName()));
    }
}
