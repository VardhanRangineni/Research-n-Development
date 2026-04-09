package com.medplus.r.d.repository;

import com.medplus.r.d.entity.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {
	boolean existsByMachineId(String machineId);

	@Query(value = "SELECT id FROM equipment WHERE calibration_template IS NOT NULL AND JSON_VALID(calibration_template) = 0", nativeQuery = true)
	List<Long> findInvalidCalibrationTemplateIds();

	@Modifying
	@Query(value = "UPDATE equipment SET calibration_template = NULL WHERE id IN (:ids)", nativeQuery = true)
	int clearCalibrationTemplateByIds(@Param("ids") List<Long> ids);
}
