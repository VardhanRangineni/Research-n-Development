package com.medplus.r.d.controller;

import com.medplus.r.d.entity.Benchmark;
import com.medplus.r.d.service.BenchmarkService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/benchmarks")
public class BenchmarkController {

    @Autowired
    private BenchmarkService benchmarkService;

    @GetMapping
    public ResponseEntity<List<Benchmark>> getAllBenchmarks() {
        return ResponseEntity.ok(benchmarkService.getAllBenchmarks());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Benchmark> getBenchmarkById(@PathVariable Long id) {
        return ResponseEntity.ok(benchmarkService.getBenchmarkById(id));
    }

    @GetMapping("/by-benchmark-id/{benchmarkId}")
    public ResponseEntity<Benchmark> getBenchmarkByBenchmarkId(@PathVariable String benchmarkId) {
        return ResponseEntity.ok(benchmarkService.getBenchmarkByBenchmarkId(benchmarkId));
    }

    @GetMapping("/by-benchmark-id")
    public ResponseEntity<Benchmark> getBenchmarkByBenchmarkIdQuery(@RequestParam String benchmarkId) {
        return ResponseEntity.ok(benchmarkService.getBenchmarkByBenchmarkId(benchmarkId));
    }

    @GetMapping("/by-project-ids")
    public ResponseEntity<List<Benchmark>> getBenchmarksByProjectIds(@RequestParam List<String> projectIds) {
        return ResponseEntity.ok(benchmarkService.getBenchmarksByProjectIds(projectIds));
    }

    @PostMapping
    public ResponseEntity<Benchmark> createBenchmark(@Valid @RequestBody Benchmark benchmark) {
        return ResponseEntity.status(HttpStatus.CREATED).body(benchmarkService.createBenchmark(benchmark));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Benchmark> updateBenchmark(@PathVariable Long id,
            @Valid @RequestBody Benchmark benchmarkDetails) {
        return ResponseEntity.ok(benchmarkService.updateBenchmark(id, benchmarkDetails));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBenchmark(@PathVariable Long id) {
        benchmarkService.deleteBenchmark(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/stop-development")
    public ResponseEntity<Benchmark> stopBenchmarkDevelopment(@PathVariable Long id) {
        return ResponseEntity.ok(benchmarkService.stopBenchmarkDevelopment(id));
    }
}
