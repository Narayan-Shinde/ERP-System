package com.erp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.Set;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String userId;
    private String username;
    private String fullName;
    private Set<String> roles;
    private String email;
    private String phone;
    private boolean active;
}