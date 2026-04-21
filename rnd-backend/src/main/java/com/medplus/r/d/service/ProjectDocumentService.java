package com.medplus.r.d.service;

import com.medplus.r.d.dto.PagedResponse;
import com.medplus.r.d.dto.ProjectDocumentDTO;
import com.medplus.r.d.entity.Project;
import com.medplus.r.d.entity.ProjectDocument;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.ProjectDocumentRepository;
import com.medplus.r.d.repository.ProjectRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
public class ProjectDocumentService {

    private static final Pattern BENCHMARK_SUFFIX_PATTERN =
            Pattern.compile("^(.*BCHMK-)(\\d+)$", Pattern.CASE_INSENSITIVE);

    private final ProjectRepository projectRepository;
    private final ProjectDocumentRepository projectDocumentRepository;
    private final ImageUploadClient imageUploadClient;

    public ProjectDocumentService(
            ProjectRepository projectRepository,
            ProjectDocumentRepository projectDocumentRepository,
            ImageUploadClient imageUploadClient) {
        this.projectRepository = projectRepository;
        this.projectDocumentRepository = projectDocumentRepository;
        this.imageUploadClient = imageUploadClient;
    }

    @Transactional(readOnly = true)
    public PagedResponse<ProjectDocumentDTO> getByProjectRefId(Long projectRefId, int page, int size) {
        Project project = getProject(projectRefId);
        Page<ProjectDocumentDTO> documents = projectDocumentRepository
                .findByProject_IdOrderByUploadedAtDesc(
                        project.getId(),
                        PageRequest.of(Math.max(page, 0), Math.max(size, 1),
                                Sort.by(Sort.Direction.DESC, "uploadedAt")))
                .map(this::toDto);
        return PagedResponse.from(documents);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ProjectDocumentDTO> getByBenchmarkId(String benchmarkId, int page, int size) {
        String requestedBenchmarkId = (benchmarkId == null ? "" : benchmarkId).trim();
        List<String> candidates = buildBenchmarkCandidates(requestedBenchmarkId);

        Project project = null;
        for (String candidate : candidates) {
            project = projectRepository.findByBenchmarkId(candidate).orElse(null);
            if (project != null) {
                break;
            }
        }

        if (project == null) {
            throw new ResourceNotFoundException("Project not found for benchmarkId: " + benchmarkId);
        }

        Page<ProjectDocumentDTO> documents = projectDocumentRepository
                .findByProject_IdOrderByUploadedAtDesc(
                        project.getId(),
                        PageRequest.of(Math.max(page, 0), Math.max(size, 1),
                                Sort.by(Sort.Direction.DESC, "uploadedAt")))
                .map(this::toDto);
        return PagedResponse.from(documents);
    }

    public ProjectDocumentDTO upload(Long projectRefId, MultipartFile file, String uploadedBy) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please upload a non-empty file");
        }

        String rawName = file.getOriginalFilename();
        if (!StringUtils.hasText(rawName) || rawName.contains("..")) {
            throw new IllegalArgumentException("Invalid file name");
        }

        Project project = getProject(projectRefId);
        String originalName = StringUtils.cleanPath(rawName);
        String contentType = StringUtils.hasText(file.getContentType())
                ? file.getContentType()
                : "application/octet-stream";

        ImageUploadClient.ImageUploadResult uploadResult;
        try {
            uploadResult = imageUploadClient.upload(file);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read file content for upload", ex);
        }

        ProjectDocument document = new ProjectDocument();
        document.setProject(project);
        document.setOriginalFileName(originalName);
        document.setContentType(contentType);
        document.setFileSize(file.getSize());
        document.setUploadedBy(StringUtils.hasText(uploadedBy) ? uploadedBy : "Unknown");
        document.setImageServerUrl(uploadResult.imageServerUrl());
        document.setImagePath(uploadResult.imagePath());
        document.setThumbnailPath(uploadResult.thumbnailPath());
        document.setOriginalImageName(uploadResult.originalImageName());

        return toDto(projectDocumentRepository.save(document));
    }

    @Transactional(readOnly = true)
    public ProjectDocument getDocument(Long projectRefId, Long documentId) {
        getProject(projectRefId);
        return projectDocumentRepository.findByIdAndProject_Id(documentId, projectRefId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
    }

    private Project getProject(Long projectRefId) {
        return projectRepository.findById(projectRefId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectRefId));
    }

    private List<String> buildBenchmarkCandidates(String value) {
        Set<String> candidates = new LinkedHashSet<>();
        candidates.add(value);

        Matcher matcher = BENCHMARK_SUFFIX_PATTERN.matcher(value);
        if (matcher.matches()) {
            String prefix = matcher.group(1);
            int sequence = Integer.parseInt(matcher.group(2));
            candidates.add(prefix + sequence);
            candidates.add(prefix + String.format("%02d", sequence));
            candidates.add(prefix + String.format("%03d", sequence));
        }

        return new ArrayList<>(candidates);
    }

    private ProjectDocumentDTO toDto(ProjectDocument document) {
        Project project = document.getProject();
        String base          = document.getImageServerUrl();
        String imagePath     = document.getImagePath();
        String thumbnailPath = document.getThumbnailPath();
        String fullImageUrl     = (base != null && imagePath != null)     ? base + "/" + imagePath     : imagePath;
        String fullThumbnailUrl = (base != null && thumbnailPath != null) ? base + "/" + thumbnailPath : thumbnailPath;

        return new ProjectDocumentDTO(
                document.getId(),
                project.getId(),
                project.getProjectId(),
                project.getBenchmarkId(),
                project.getProjectName(),
                document.getOriginalFileName(),
                document.getContentType(),
                document.getFileSize(),
                document.getUploadedBy(),
                document.getUploadedAt(),
                base,
                imagePath,
                thumbnailPath,
                document.getOriginalImageName(),
                fullImageUrl,
                fullThumbnailUrl
        );
    }
}
