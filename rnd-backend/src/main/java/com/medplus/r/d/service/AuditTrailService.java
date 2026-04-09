package com.medplus.r.d.service;

import com.medplus.r.d.dto.AuditTrailResponse;
import com.medplus.r.d.entity.BatchFormula;
import com.medplus.r.d.entity.Benchmark;
import com.medplus.r.d.entity.Project;
import com.medplus.r.d.entity.StabilityObservation;
import com.medplus.r.d.entity.StabilityProtocol;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.BatchFormulaRepository;
import com.medplus.r.d.repository.BenchmarkRepository;
import com.medplus.r.d.repository.ProjectRepository;
import com.medplus.r.d.repository.StabilityObservationRepository;
import com.medplus.r.d.repository.StabilityProtocolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional(readOnly = true)
public class AuditTrailService {

    private static final Pattern BENCHMARK_SUFFIX_PATTERN = Pattern.compile("^(.*BCHMK-)(\\d+)$", Pattern.CASE_INSENSITIVE);

    @Autowired
    private BenchmarkRepository benchmarkRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private BatchFormulaRepository batchFormulaRepository;

    @Autowired
    private StabilityProtocolRepository stabilityProtocolRepository;

    @Autowired
    private StabilityObservationRepository stabilityObservationRepository;

    public AuditTrailResponse getTrailByBenchmarkId(String benchmarkId) {
        if (benchmarkId == null || benchmarkId.trim().isEmpty()) {
            throw new IllegalArgumentException("Benchmark ID is required");
        }

        String requestedBenchmarkId = benchmarkId.trim();
        List<String> candidates = buildBenchmarkCandidates(requestedBenchmarkId);

        Optional<Benchmark> benchmark = Optional.empty();
        String resolvedBenchmarkId = null;
        for (String candidate : candidates) {
            Optional<Benchmark> current = benchmarkRepository.findByBenchmarkId(candidate);
            if (current.isPresent()) {
                benchmark = current;
                resolvedBenchmarkId = candidate;
                break;
            }
        }

        Benchmark resolvedBenchmark = benchmark.orElseThrow(() -> new ResourceNotFoundException("Benchmark not found for benchmarkId: " + requestedBenchmarkId));

        Optional<Project> project = Optional.empty();
        for (String candidate : candidates) {
            Optional<Project> current = projectRepository.findByBenchmarkId(candidate);
            if (current.isPresent()) {
                project = current;
                break;
            }
        }

        Project resolvedProject = project.orElseThrow(() -> new ResourceNotFoundException("Project not found for benchmarkId: " + requestedBenchmarkId));

        List<BatchFormula> batches = batchFormulaRepository.findByProjectRefIdOrderByCreatedAtDesc(resolvedProject.getId());
        List<StabilityProtocol> stabilityProtocols = stabilityProtocolRepository.findByProjectRefIdOrderByCreatedAtDesc(resolvedProject.getId());

        List<Long> protocolIds = stabilityProtocols.stream()
            .map(StabilityProtocol::getId)
            .collect(Collectors.toList());

        List<StabilityObservation> stabilityObservations = protocolIds.isEmpty()
            ? List.of()
            : stabilityObservationRepository.findByProtocolRefIdInOrderByProtocolRefIdAscConditionLabelAscIntervalLabelAsc(protocolIds);

        return new AuditTrailResponse(
            resolvedBenchmarkId,
            resolvedBenchmark,
            resolvedProject,
            batches,
            stabilityProtocols,
            stabilityObservations
        );
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
}
