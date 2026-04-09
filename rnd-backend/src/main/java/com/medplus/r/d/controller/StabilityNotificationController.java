package com.medplus.r.d.controller;

import com.medplus.r.d.dto.StabilityNotificationResponse;
import com.medplus.r.d.dto.NotificationResponse;
import com.medplus.r.d.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/stability")
public class StabilityNotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping("/notifications")
    public ResponseEntity<List<StabilityNotificationResponse>> getNotifications() {
        List<NotificationResponse> notifications = notificationService.getNotifications();
        List<StabilityNotificationResponse> stabilityNotifications = new ArrayList<>();

        for (NotificationResponse item : notifications) {
            if (!"STABILITY".equalsIgnoreCase(item.getSource())) {
                continue;
            }

            stabilityNotifications.add(new StabilityNotificationResponse(
                    item.getType(),
                    item.getProjectRefId(),
                    item.getProjectId(),
                    item.getProjectName(),
                    item.getProtocolId(),
                    item.getProtocolName(),
                    item.getConditionLabel(),
                    item.getIntervalLabel(),
                    item.getDueDate(),
                    item.getMessage()
            ));
        }

        return ResponseEntity.ok(stabilityNotifications);
    }
}
