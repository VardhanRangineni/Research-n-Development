package com.medplus.r.d.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSettingsResponse {
    private Long id;
    private String username;
    private String email;
    private String role;
    private List<String> allowedPages;
}
