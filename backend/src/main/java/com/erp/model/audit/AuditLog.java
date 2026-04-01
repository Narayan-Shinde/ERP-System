package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "audit_logs")
public class AuditLog {
    @Id
    private String id;
    private String username;
    private String userId;
    private String action;          // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW
    private String module;          // PURCHASE, SALES, EXPENSE, ACCOUNTING, LEDGER, INVENTORY, GST, USER
    private String entityType;      // Supplier, Customer, Invoice, etc.
    private String entityId;
    private String description;
    private String ipAddress;
    private String oldValue;        // JSON of old record (for UPDATE/DELETE)
    private String newValue;        // JSON of new record (for CREATE/UPDATE)
    private String status;          // SUCCESS, FAILURE
    private LocalDateTime timestamp = LocalDateTime.now();
}
