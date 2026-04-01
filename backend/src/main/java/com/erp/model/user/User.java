package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.HashSet;

@Data
@NoArgsConstructor
@Document(collection = "users")
public class User {
    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String email;

    private String password;
    private String fullName;
    private String phone;
    private boolean active = true;
    private Set<String> roles = new HashSet<>();
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime lastLogin;

    public enum Role {
        ROLE_ADMIN,
        ROLE_ACCOUNTANT,
        ROLE_SALES_EXECUTIVE,
        ROLE_PURCHASE_EXECUTIVE,
        ROLE_MANAGER
    }
}
