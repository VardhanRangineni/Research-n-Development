package com.medplus.r.d.service;

import com.medplus.r.d.dto.PagedResponse;
import com.medplus.r.d.entity.Project;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.BenchmarkRepository;
import com.medplus.r.d.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ProjectService {

    private static final String PROJECT_PREFIX = "MED/R&D/PRJ-";
    private static final Pattern PROJECT_ID_PATTERN = Pattern.compile("^MED/R&D/PRJ-(\\d+)$", Pattern.CASE_INSENSITIVE);

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private BenchmarkRepository benchmarkRepository;

    @Autowired
    private BusinessSequenceService businessSequenceService;

    public PagedResponse<Project> getAllProjects(int page, int size, String query) {
        normalizeLegacyProjectIds();
        syncProjectsFromBenchmarks();
        List<Project> projects = projectRepository.findAllVisibleProjects();
        projects.forEach(project -> {
            String beforeStage = project.getLifecycleStage();
            Integer beforeCycle = project.getTrialCycle();
            ensureWorkflowDefaults(project);
            if (!project.getLifecycleStage().equals(beforeStage) || !project.getTrialCycle().equals(beforeCycle)) {
                projectRepository.save(project);
            }
        });

            String normalizedQuery = StringUtils.hasText(query) ? query.trim() : null;
            return PagedResponse.from(projectRepository.findAllVisibleProjects(
                normalizedQuery,
                PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "id"))
            ));
    }

    public Project getProjectById(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));
        String beforeStage = project.getLifecycleStage();
        Integer beforeCycle = project.getTrialCycle();
        ensureWorkflowDefaults(project);
        if (!project.getLifecycleStage().equals(beforeStage) || !project.getTrialCycle().equals(beforeCycle)) {
            return projectRepository.save(project);
        }
        return project;
    }

    public String generateNextProjectId() {
        long nextNumber = businessSequenceService.nextValue(
                "project-business-id",
                projectRepository.findMaxProjectSequence() == null ? 0L : projectRepository.findMaxProjectSequence()
        );
        return PROJECT_PREFIX + String.format("%02d", nextNumber);
    }

    public Project createProjectForBenchmark(String projectId, String benchmarkId) {
        Project project = new Project();
        project.setProjectId(projectId);
        project.setBenchmarkId(benchmarkId);
        project.setStatus("Draft");
        project.setLifecycleStage("FORMULATION");
        project.setTrialCycle(1);
        project.setProjectName(null);
        return projectRepository.save(project);
    }

    public Project updateProjectName(Long id, String projectName) {
        Project project = getProjectById(id);
        project.setProjectName(projectName.trim());
        project.setStatus("Active");
        ensureWorkflowDefaults(project);
        return projectRepository.save(project);
    }

    public void deleteByProjectId(String projectId) {
        if (projectId == null || projectId.trim().isEmpty()) {
            return;
        }
        projectRepository.findByProjectId(projectId.trim())
                .ifPresent(projectRepository::delete);
    }

    public void markProjectStoppedByProjectId(String projectId) {
        if (projectId == null || projectId.trim().isEmpty()) {
            return;
        }

        projectRepository.findByProjectId(projectId.trim()).ifPresent(project -> {
            project.setStatus("Stopped");
            projectRepository.save(project);
        });
    }

    private void syncProjectsFromBenchmarks() {
        benchmarkRepository.findAll().forEach(benchmark -> {
            String benchmarkProjectId = benchmark.getProjectId();
            String benchmarkBusinessId = benchmark.getBenchmarkId();

            if (benchmarkProjectId == null || benchmarkProjectId.trim().isEmpty()
                    || benchmarkBusinessId == null || benchmarkBusinessId.trim().isEmpty()) {
                return;
            }

            boolean exists = projectRepository.findByBenchmarkId(benchmarkBusinessId).isPresent()
                    || projectRepository.existsByProjectId(benchmarkProjectId);

            if (!exists) {
                createProjectForBenchmark(benchmarkProjectId, benchmarkBusinessId);
            }
        });
    }

    private void normalizeLegacyProjectIds() {
        projectRepository.findAll().forEach(project -> {
            String currentProjectId = project.getProjectId();
            if (currentProjectId == null || !currentProjectId.startsWith("MED/R&D/BCHMK-")) {
                return;
            }

            String normalizedProjectId = currentProjectId.replace("MED/R&D/BCHMK-", "MED/R&D/PRJ-");
            if (projectRepository.existsByProjectId(normalizedProjectId)) {
                return;
            }

            project.setProjectId(normalizedProjectId);
            ensureWorkflowDefaults(project);
            projectRepository.save(project);

            if (project.getBenchmarkId() != null && !project.getBenchmarkId().isBlank()) {
                benchmarkRepository.findByBenchmarkId(project.getBenchmarkId()).ifPresent(benchmark -> {
                    benchmark.setProjectId(normalizedProjectId);
                    benchmarkRepository.save(benchmark);
                });
            }
        });
    }

    private void ensureWorkflowDefaults(Project project) {
        if (project.getLifecycleStage() == null || project.getLifecycleStage().isBlank()) {
            project.setLifecycleStage("FORMULATION");
        }
        if (project.getTrialCycle() == null || project.getTrialCycle() < 1) {
            project.setTrialCycle(1);
        }
    }
}
