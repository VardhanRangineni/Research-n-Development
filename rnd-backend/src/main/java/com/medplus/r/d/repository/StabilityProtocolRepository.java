package com.medplus.r.d.repository;

import com.medplus.r.d.entity.StabilityProtocol;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StabilityProtocolRepository extends JpaRepository<StabilityProtocol, Long> {
    List<StabilityProtocol> findByProjectRefIdOrderByCreatedAtDesc(Long projectRefId);

    Page<StabilityProtocol> findByProjectRefIdOrderByCreatedAtDesc(Long projectRefId, Pageable pageable);

    List<StabilityProtocol> findByStatusIgnoreCaseOrderByCreatedAtDesc(String status);

    List<StabilityProtocol> findAllByOrderByCreatedAtDesc();

    void deleteByProjectRefId(Long projectRefId);
}
