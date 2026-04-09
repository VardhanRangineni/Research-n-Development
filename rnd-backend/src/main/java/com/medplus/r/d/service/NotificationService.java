package com.medplus.r.d.service;

import com.medplus.r.d.dto.NotificationResponse;
import com.medplus.r.d.dto.StabilityNotificationResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private StabilityService stabilityService;

    public List<NotificationResponse> getNotifications() {
        List<NotificationResponse> notifications = new ArrayList<>();

        List<StabilityNotificationResponse> stabilityNotifications = stabilityService.getNotifications();
        for (StabilityNotificationResponse item : stabilityNotifications) {
            notifications.add(new NotificationResponse(
                    "STABILITY",
                    item.getType(),
                    "Stability Testing",
                    item.getMessage(),
                    item.getDueDate(),
                    item.getProjectRefId(),
                    item.getProjectId(),
                    item.getProjectName(),
                    item.getProtocolId(),
                    item.getProtocolName(),
                    item.getConditionLabel(),
                    item.getIntervalLabel()
            ));
        }

        notifications.sort(Comparator.comparing(NotificationResponse::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())));
        return notifications;
    }
}
