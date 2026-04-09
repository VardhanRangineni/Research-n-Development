package com.medplus.r.d.controller;

import com.medplus.r.d.dto.BulkImportResponseDTO;
import com.medplus.r.d.entity.Equipment;
import com.medplus.r.d.service.EquipmentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    @Autowired
    private EquipmentService equipmentService;

    @GetMapping
    public ResponseEntity<List<Equipment>> getAllEquipment() {
        return ResponseEntity.ok(equipmentService.getAllEquipment());
    }

    @GetMapping("/calibration-eligible")
    public ResponseEntity<List<Equipment>> getCalibrationEligibleEquipment() {
        return ResponseEntity.ok(equipmentService.getCalibrationEligibleEquipment());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Equipment> getEquipmentById(@PathVariable Long id) {
        return ResponseEntity.ok(equipmentService.getEquipmentById(id));
    }

    @PostMapping
    public ResponseEntity<Equipment> createEquipment(@Valid @RequestBody Equipment equipment) {
        return ResponseEntity.status(HttpStatus.CREATED).body(equipmentService.createEquipment(equipment));
    }

    @PostMapping("/bulk")
    public ResponseEntity<BulkImportResponseDTO> createEquipmentBulk(@RequestBody List<Equipment> equipmentList) {
        return ResponseEntity.ok(equipmentService.createEquipmentBulk(equipmentList));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Equipment> updateEquipment(@PathVariable Long id,
            @Valid @RequestBody Equipment equipmentDetails) {
        return ResponseEntity.ok(equipmentService.updateEquipment(id, equipmentDetails));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEquipment(@PathVariable Long id) {
        equipmentService.deleteEquipment(id);
        return ResponseEntity.noContent().build();
    }
}
