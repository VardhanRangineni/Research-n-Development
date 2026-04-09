package com.medplus.r.d.service;

import com.medplus.r.d.dto.BulkImportErrorDTO;
import com.medplus.r.d.dto.BulkImportResponseDTO;
import com.medplus.r.d.entity.CalibrationFrequency;
import com.medplus.r.d.entity.Equipment;
import com.medplus.r.d.entity.EquipmentStatus;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.EquipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class EquipmentService {

    private static final Set<EquipmentStatus> EXCLUDED_CALIBRATION_STATUSES = EnumSet.of(EquipmentStatus.INACTIVE);

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Transactional
    public List<Equipment> getAllEquipment() {
        sanitizeInvalidCalibrationTemplates();
        return equipmentRepository.findAll();
    }

    @Transactional
    public List<Equipment> getCalibrationEligibleEquipment() {
        sanitizeInvalidCalibrationTemplates();
        return equipmentRepository.findAll().stream()
                .filter(equipment -> !EXCLUDED_CALIBRATION_STATUSES.contains(equipment.getStatus()))
                .collect(Collectors.toList());
    }

    public Equipment getEquipmentById(Long id) {
        return equipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment", id));
    }

    public Equipment createEquipment(Equipment equipment) {
        return equipmentRepository.save(equipment);
    }

    public BulkImportResponseDTO createEquipmentBulk(List<Equipment> equipmentList) {
        if (equipmentList == null || equipmentList.isEmpty()) {
            return new BulkImportResponseDTO(0, 0, 0, new ArrayList<>());
        }

        List<BulkImportErrorDTO> errors = new ArrayList<>();
        Set<String> seenMachineIds = new HashSet<>();
        int createdCount = 0;

        for (int i = 0; i < equipmentList.size(); i++) {
            Equipment equipment = equipmentList.get(i);
            int rowNumber = i + 1;

            if (equipment == null) {
                errors.add(new BulkImportErrorDTO(rowNumber, null, "Row is empty"));
                continue;
            }

            String machineId = normalize(equipment.getMachineId());
            String instrumentType = normalize(equipment.getInstrumentType());
            String name = normalize(equipment.getName());
            CalibrationFrequency frequency = equipment.getFrequency();
            EquipmentStatus status = equipment.getStatus();

            if (machineId == null || instrumentType == null || name == null) {
                errors.add(new BulkImportErrorDTO(rowNumber, machineId,
                        "machineId, instrumentType and name are required"));
                continue;
            }

            if (!seenMachineIds.add(machineId.toLowerCase(Locale.ROOT))) {
                errors.add(new BulkImportErrorDTO(rowNumber, machineId, "Duplicate machineId in upload payload"));
                continue;
            }

            if (equipmentRepository.existsByMachineId(machineId)) {
                errors.add(new BulkImportErrorDTO(rowNumber, machineId, "machineId already exists"));
                continue;
            }

            equipment.setMachineId(machineId);
            equipment.setInstrumentType(instrumentType);
            equipment.setName(name);
            equipment.setModel(normalize(equipment.getModel()));
            equipment.setSerialNumber(normalize(equipment.getSerialNumber()));
            equipment.setFrequency(frequency == null ? CalibrationFrequency.DAILY : frequency);
            equipment.setStatus(status == null ? EquipmentStatus.ACTIVE : status);

            try {
                equipmentRepository.saveAndFlush(equipment);
                createdCount++;
            } catch (DataIntegrityViolationException ex) {
                errors.add(new BulkImportErrorDTO(rowNumber, machineId,
                        "Failed to save equipment due to data integrity constraints"));
            }
        }

        int total = equipmentList.size();
        int failed = total - createdCount;
        return new BulkImportResponseDTO(total, createdCount, failed, errors);
    }

    public Equipment updateEquipment(Long id, Equipment equipmentDetails) {
        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment", id));
        equipment.setMachineId(equipmentDetails.getMachineId());
        equipment.setInstrumentType(equipmentDetails.getInstrumentType());
        equipment.setName(equipmentDetails.getName());
        equipment.setModel(equipmentDetails.getModel());
        equipment.setSerialNumber(equipmentDetails.getSerialNumber());
        equipment.setLastCalibration(equipmentDetails.getLastCalibration());
        equipment.setNextCalibration(equipmentDetails.getNextCalibration());
        equipment.setFrequency(equipmentDetails.getFrequency());
        equipment.setStatus(equipmentDetails.getStatus());
        equipment.setCalibrationTemplate(equipmentDetails.getCalibrationTemplate());
        return equipmentRepository.save(equipment);
    }

    public void deleteEquipment(Long id) {
        if (!equipmentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Equipment", id);
        }
        equipmentRepository.deleteById(id);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void sanitizeInvalidCalibrationTemplates() {
        List<Long> invalidIds = equipmentRepository.findInvalidCalibrationTemplateIds();
        if (invalidIds == null || invalidIds.isEmpty()) {
            return;
        }
        equipmentRepository.clearCalibrationTemplateByIds(invalidIds);
    }
}
