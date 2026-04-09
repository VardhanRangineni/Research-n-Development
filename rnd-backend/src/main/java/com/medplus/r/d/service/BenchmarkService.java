package com.medplus.r.d.service;

import com.medplus.r.d.entity.Benchmark;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.BenchmarkRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BenchmarkService {

    private static final String BENCHMARK_PREFIX = "MED/R&D/BCHMK-";

    @Autowired
    private BenchmarkRepository benchmarkRepository;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private BusinessSequenceService businessSequenceService;

    public List<Benchmark> getAllBenchmarks() {
        backfillMissingBenchmarkIds();
        return benchmarkRepository.findAll();
    }

    public List<Benchmark> getBenchmarksByProjectIds(List<String> projectIds) {
        if (projectIds == null || projectIds.isEmpty()) {
            return List.of();
        }
        return benchmarkRepository.findByProjectIdIn(projectIds);
    }

    public Benchmark getBenchmarkById(Long id) {
        Benchmark benchmark = benchmarkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Benchmark", id));

        if (benchmark.getBenchmarkId() == null || benchmark.getBenchmarkId().isBlank()) {
            benchmark.setBenchmarkId(generateNextBenchmarkId());
            benchmark = benchmarkRepository.save(benchmark);
        }

        return benchmark;
    }

    public Benchmark getBenchmarkByBenchmarkId(String benchmarkId) {
        if (benchmarkId == null || benchmarkId.trim().isEmpty()) {
            throw new IllegalArgumentException("Benchmark ID is required");
        }

        Benchmark benchmark = benchmarkRepository.findByBenchmarkId(benchmarkId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Benchmark not found for ID: " + benchmarkId));

        if (benchmark.getBenchmarkId() == null || benchmark.getBenchmarkId().isBlank()) {
            benchmark.setBenchmarkId(generateNextBenchmarkId());
            benchmark = benchmarkRepository.save(benchmark);
        }

        return benchmark;
    }

    public Benchmark createBenchmark(Benchmark benchmark) {
        benchmark.setProjectId(projectService.generateNextProjectId());
        benchmark.setBenchmarkId(generateNextBenchmarkId());
        benchmark.setStatus("Active");
        Benchmark savedBenchmark = benchmarkRepository.save(benchmark);
        projectService.createProjectForBenchmark(savedBenchmark.getProjectId(), savedBenchmark.getBenchmarkId());
        return savedBenchmark;
    }

    public Benchmark updateBenchmark(Long id, Benchmark benchmarkDetails) {
        Benchmark benchmark = benchmarkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Benchmark", id));
        if (benchmark.getProjectId() == null || benchmark.getProjectId().trim().isEmpty()) {
            benchmark.setProjectId(projectService.generateNextProjectId());
        }
        if (benchmark.getBenchmarkId() == null || benchmark.getBenchmarkId().trim().isEmpty()) {
            benchmark.setBenchmarkId(generateNextBenchmarkId());
        }
        benchmark.setCompetitorName(benchmarkDetails.getCompetitorName());
        benchmark.setProductName(benchmarkDetails.getProductName());
        benchmark.setSegment(benchmarkDetails.getSegment());
        benchmark.setClaimedBenefits(benchmarkDetails.getClaimedBenefits());
        benchmark.setIngredientsList(benchmarkDetails.getIngredientsList());
        benchmark.setStatus((benchmark.getStatus() == null || benchmark.getStatus().isBlank()) ? "Active" : benchmark.getStatus());
        return benchmarkRepository.save(benchmark);
    }

    public Benchmark stopBenchmarkDevelopment(Long id) {
        Benchmark benchmark = benchmarkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Benchmark", id));

        benchmark.setStatus("Stopped");
        projectService.markProjectStoppedByProjectId(benchmark.getProjectId());
        return benchmarkRepository.save(benchmark);
    }

    private String generateNextBenchmarkId() {
        long nextNumber = businessSequenceService.nextValue(
                "benchmark-business-id",
                benchmarkRepository.findMaxBenchmarkSequence() == null ? 0L : benchmarkRepository.findMaxBenchmarkSequence()
        );
        return BENCHMARK_PREFIX + String.format("%02d", nextNumber);
    }

    private void backfillMissingBenchmarkIds() {
        benchmarkRepository.findAll().forEach(benchmark -> {
            if (benchmark.getBenchmarkId() == null || benchmark.getBenchmarkId().isBlank()) {
                benchmark.setBenchmarkId(generateNextBenchmarkId());
                benchmarkRepository.save(benchmark);
            }
        });
    }

    public void deleteBenchmark(Long id) {
        Benchmark benchmark = benchmarkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Benchmark", id));

        projectService.deleteByProjectId(benchmark.getProjectId());
        benchmarkRepository.deleteById(id);
    }
}
