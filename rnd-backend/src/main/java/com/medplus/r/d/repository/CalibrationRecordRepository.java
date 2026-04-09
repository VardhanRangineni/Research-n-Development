package com.medplus.r.d.repository;

import com.medplus.r.d.entity.CalibrationRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CalibrationRecordRepository extends JpaRepository<CalibrationRecord, Long> {
    List<CalibrationRecord> findByEquipmentId(Long equipmentId);
}
