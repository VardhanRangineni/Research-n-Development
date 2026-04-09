package com.medplus.r.d.controller;

import com.medplus.r.d.dto.UserSettingsRequest;
import com.medplus.r.d.dto.UserSettingsResponse;
import com.medplus.r.d.service.UserSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class UserSettingsController {

    @Autowired
    private UserSettingsService userSettingsService;

    @GetMapping("/roles")
    public ResponseEntity<Map<String, List<String>>> getRoles() {
        return ResponseEntity.ok(Map.of("roles", userSettingsService.getAssignableRoles()));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserSettingsResponse>> getUsers() {
        return ResponseEntity.ok(userSettingsService.getAllUsers());
    }

    @PostMapping("/users")
    public ResponseEntity<UserSettingsResponse> createUser(@RequestBody UserSettingsRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userSettingsService.createUser(request));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserSettingsResponse> updateUser(@PathVariable Long id,
                                                           @RequestBody UserSettingsRequest request) {
        return ResponseEntity.ok(userSettingsService.updateUser(id, request));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userSettingsService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
