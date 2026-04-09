package com.medplus.r.d.repository;

import com.medplus.r.d.entity.StabilityObservation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StabilityObservationRepository extends JpaRepository<StabilityObservation, Long> {
    List<StabilityObservation> findByProtocolRefIdOrderByConditionLabelAscIntervalLabelAsc(Long protocolRefId);

    Page<StabilityObservation> findByProtocolRefIdOrderByConditionLabelAscIntervalLabelAsc(Long protocolRefId, Pageable pageable);

    List<StabilityObservation> findByProtocolRefIdInOrderByProtocolRefIdAscConditionLabelAscIntervalLabelAsc(List<Long> protocolRefIds);

    List<StabilityObservation> findByProtocolRefId(Long protocolRefId);

    Optional<StabilityObservation> findByProtocolRefIdAndConditionLabelIgnoreCaseAndIntervalLabelIgnoreCase(
            Long protocolRefId,
            String conditionLabel,
            String intervalLabel
    );

        Optional<StabilityObservation> findByProtocolRefIdAndConditionLabelIgnoreCaseAndIntervalLabelIgnoreCaseAndObservedOnIsNotNull(
            Long protocolRefId,
            String conditionLabel,
            String intervalLabel
        );

    void deleteByProtocolRefId(Long protocolRefId);
}
