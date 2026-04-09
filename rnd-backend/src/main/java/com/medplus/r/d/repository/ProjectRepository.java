package com.medplus.r.d.repository;

import com.medplus.r.d.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    Optional<Project> findByProjectId(String projectId);

    Optional<Project> findByBenchmarkId(String benchmarkId);

    boolean existsByProjectId(String projectId);

    void deleteByProjectId(String projectId);

    @Query("select p.projectId from Project p where p.projectId is not null")
    List<String> findAllProjectIds();

        @Query("""
                        select p from Project p
                        where (p.status is null or lower(p.status) <> 'stopped')
                            and (:query is null
                                     or lower(coalesce(p.projectName, '')) like lower(concat('%', :query, '%'))
                                     or lower(coalesce(p.projectId, '')) like lower(concat('%', :query, '%'))
                                     or lower(coalesce(p.benchmarkId, '')) like lower(concat('%', :query, '%')))
                        """)
        Page<Project> findAllVisibleProjects(@Param("query") String query, Pageable pageable);

        @Query("select p from Project p where p.status is null or lower(p.status) <> 'stopped'")
    List<Project> findAllVisibleProjects();

        @Query(value = "select coalesce(max(cast(substring_index(project_id, '-', -1) as unsigned)), 0) from projects where project_id like 'MED/R&D/PRJ-%'", nativeQuery = true)
        Long findMaxProjectSequence();
}
