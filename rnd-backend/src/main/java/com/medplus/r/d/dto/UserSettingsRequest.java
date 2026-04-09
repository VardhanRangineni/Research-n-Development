package com.medplus.r.d.dto;

import lombok.Data;

import java.util.List;

@Data
public class UserSettingsRequest {
    private String username;
    private String email;
    private String password;
    private String role;
    private List<String> allowedPages;
}
