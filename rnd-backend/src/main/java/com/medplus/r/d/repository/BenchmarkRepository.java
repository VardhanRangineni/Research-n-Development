package com.medplus.r.d.repository;

import com.medplus.r.d.entity.Benchmark;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BenchmarkRepository extends JpaRepository<Benchmark, Long> {
	@Query("select b.projectId from Benchmark b where b.projectId is not null")
	List<String> findAllProjectIds();

	@Query("select b.benchmarkId from Benchmark b where b.benchmarkId is not null")
	List<String> findAllBenchmarkIds();

	Optional<Benchmark> findByBenchmarkId(String benchmarkId);

	List<Benchmark> findByProjectIdIn(List<String> projectIds);

	@Query(value = "select coalesce(max(cast(substring_index(benchmark_id, '-', -1) as unsigned)), 0) from benchmarks where benchmark_id like 'MED/R&D/BCHMK-%'", nativeQuery = true)
	Long findMaxBenchmarkSequence();
}
