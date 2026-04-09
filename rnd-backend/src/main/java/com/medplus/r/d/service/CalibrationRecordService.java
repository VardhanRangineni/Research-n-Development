package com.medplus.r.d.service;

import com.medplus.r.d.entity.CalibrationRecord;
import com.medplus.r.d.entity.Equipment;
import com.medplus.r.d.entity.CalibrationFrequency;
import com.medplus.r.d.entity.EquipmentStatus;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.CalibrationRecordRepository;
import com.medplus.r.d.repository.EquipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.util.List;

@Service
public class CalibrationRecordService {

    private static final Logger logger = LoggerFactory.getLogger(CalibrationRecordService.class);

    @Autowired
    private CalibrationRecordRepository calibrationRecordRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    public List<CalibrationRecord> getAllRecords() {
        return calibrationRecordRepository.findAll();
    }

    public List<CalibrationRecord> getRecordsByEquipmentId(Long equipmentId) {
        return calibrationRecordRepository.findByEquipmentId(equipmentId);
    }

    public CalibrationRecord createRecord(CalibrationRecord record) {
        if (record.getDate() == null) {
            record.setDate(LocalDate.now());
        }

        Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipment", record.getEquipmentId()));

        equipment.setLastCalibration(record.getDate());

        if ("Pass".equalsIgnoreCase(record.getStatus())) {
            try {
                LocalDate lastCalDate = record.getDate();
                LocalDate nextCalDate = lastCalDate;
                CalibrationFrequency freq = equipment.getFrequency();

                if (freq != null) {
                    switch (freq) {
                        case NONE:
                            nextCalDate = lastCalDate;
                            break;
                        case DAILY:
                            nextCalDate = lastCalDate.plusDays(1);
                            break;
                        case WEEKLY:
                            nextCalDate = lastCalDate.plusWeeks(1);
                            break;
                        case MONTHLY:
                            nextCalDate = lastCalDate.plusMonths(1);
                            break;
                        case QUARTERLY:
                            nextCalDate = lastCalDate.plusMonths(3);
                            break;
                        case HALFYEARLY:
                            nextCalDate = lastCalDate.plusMonths(6);
                            break;
                        case YEARLY:
                            nextCalDate = lastCalDate.plusYears(1);
                            break;
                        default:
                            nextCalDate = lastCalDate;
                            break;
                    }
                }
                equipment.setNextCalibration(nextCalDate);
                equipment.setStatus(EquipmentStatus.ACTIVE);
            } catch (Exception e) {
                logger.error("Failed to calculate next calibration date for equipment {}: {}",
                        record.getEquipmentId(), e.getMessage());
            }
        }
        equipmentRepository.save(equipment);

        return calibrationRecordRepository.save(record);
    }
}
