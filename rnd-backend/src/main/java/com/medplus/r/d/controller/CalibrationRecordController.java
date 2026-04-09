package com.medplus.r.d.controller;

import com.medplus.r.d.entity.CalibrationRecord;
import com.medplus.r.d.service.CalibrationRecordService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/calibration")
public class CalibrationRecordController {

    @Autowired
    private CalibrationRecordService calibrationRecordService;

    @GetMapping
    public ResponseEntity<List<CalibrationRecord>> getAllRecords() {
        return ResponseEntity.ok(calibrationRecordService.getAllRecords());
    }

    @GetMapping("/equipment/{equipmentId}")
    public ResponseEntity<List<CalibrationRecord>> getRecordsByEquipmentId(@PathVariable Long equipmentId) {
        return ResponseEntity.ok(calibrationRecordService.getRecordsByEquipmentId(equipmentId));
    }

    @PostMapping
    public ResponseEntity<CalibrationRecord> createRecord(@Valid @RequestBody CalibrationRecord record) {
        return ResponseEntity.status(HttpStatus.CREATED).body(calibrationRecordService.createRecord(record));
    }
}
