package com.medplus.r.d.service;

import com.medplus.r.d.dto.PagedResponse;
import com.medplus.r.d.dto.ProjectDocumentDTO;
import com.medplus.r.d.entity.Project;
import com.medplus.r.d.entity.ProjectDocument;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.ProjectDocumentRepository;
import com.medplus.r.d.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
public class ProjectDocumentService {

    private static final Pattern BENCHMARK_SUFFIX_PATTERN = Pattern.compile("^(.*BCHMK-)(\\d+)$", Pattern.CASE_INSENSITIVE);

    private final ProjectRepository projectRepository;
    private final ProjectDocumentRepository projectDocumentRepository;
    private final Path storageRoot;

    public ProjectDocumentService(
            ProjectRepository projectRepository,
            ProjectDocumentRepository projectDocumentRepository,
            @Value("${app.documents.storage-dir:uploads/project-documents}") String storageDir) {
        this.projectRepository = projectRepository;
        this.projectDocumentRepository = projectDocumentRepository;
        this.storageRoot = Paths.get(storageDir).toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.storageRoot);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to initialize document storage directory", ex);
        }
    }

    @Transactional(readOnly = true)
    public PagedResponse<ProjectDocumentDTO> getByProjectRefId(Long projectRefId, int page, int size) {
        Project project = getProject(projectRefId);
        Page<ProjectDocumentDTO> documents = projectDocumentRepository
                .findByProject_IdOrderByUploadedAtDesc(project.getId(), PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "uploadedAt")))
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
            .findByProject_IdOrderByUploadedAtDesc(project.getId(), PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "uploadedAt")))
            .map(this::toDto);
        return PagedResponse.from(documents);
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

    public ProjectDocumentDTO upload(Long projectRefId, MultipartFile file, String uploadedBy) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please upload a non-empty file");
        }

        Project project = getProject(projectRefId);
        String originalName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "document" : file.getOriginalFilename());
        if (!StringUtils.hasText(originalName) || originalName.contains("..")) {
            throw new IllegalArgumentException("Invalid file name");
        }
        String storedName = UUID.randomUUID() + "_" + originalName;
        String contentType = StringUtils.hasText(file.getContentType()) ? file.getContentType() : "application/octet-stream";
        Path target = storageRoot.resolve(storedName).normalize();
        if (!target.startsWith(storageRoot)) {
            throw new IllegalArgumentException("Invalid file path");
        }

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            ProjectDocument document = new ProjectDocument();
            document.setProject(project);
            document.setOriginalFileName(originalName);
            document.setStoredFileName(storedName);
            document.setContentType(contentType);
            document.setFileSize(file.getSize());
            document.setUploadedBy(StringUtils.hasText(uploadedBy) ? uploadedBy : "Unknown");

            return toDto(projectDocumentRepository.save(document));
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to store document", ex);
        } catch (RuntimeException ex) {
            try {
                Files.deleteIfExists(target);
            } catch (IOException cleanupEx) {
                throw new IllegalStateException("Failed to persist document metadata and rollback file storage", cleanupEx);
            }
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public ProjectDocument getDocument(Long projectRefId, Long documentId) {
        getProject(projectRefId);
        return projectDocumentRepository.findByIdAndProject_Id(documentId, projectRefId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
    }

    @Transactional(readOnly = true)
    public Resource loadAsResource(ProjectDocument document) {
        try {
            Path filePath = storageRoot.resolve(document.getStoredFileName()).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists()) {
                throw new ResourceNotFoundException("Document file not found for id: " + document.getId());
            }
            return resource;
        } catch (MalformedURLException ex) {
            throw new IllegalStateException("Failed to load document file", ex);
        }
    }

    private Project getProject(Long projectRefId) {
        return projectRepository.findById(projectRefId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectRefId));
    }

    private ProjectDocumentDTO toDto(ProjectDocument document) {
        Project project = document.getProject();
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
                String.format("/api/projects/%d/documents/%d/download", project.getId(), document.getId())
        );
    }
}
