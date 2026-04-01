package com.erp.controller;

import com.erp.model.AuditLog;
import com.erp.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit")
@CrossOrigin(origins = "*")
public class AuditLogController {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @GetMapping
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public List<AuditLog> getRecentLogs() {
        return auditLogRepository.findTop100ByOrderByTimestampDesc();
    }

    @GetMapping("/by-user/{username}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public List<AuditLog> getLogsByUser(@PathVariable String username) {
        return auditLogRepository.findByUsername(username);
    }

    @GetMapping("/by-module/{module}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public List<AuditLog> getLogsByModule(@PathVariable String module) {
        return auditLogRepository.findByModule(module);
    }

    @GetMapping("/by-action/{action}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public List<AuditLog> getLogsByAction(@PathVariable String action) {
        return auditLogRepository.findByAction(action);
    }

    @GetMapping("/by-date")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public List<AuditLog> getLogsByDate(@RequestParam String fromDate, @RequestParam String toDate) {
        return auditLogRepository.findByTimestampBetween(
            LocalDateTime.parse(fromDate + "T00:00:00"),
            LocalDateTime.parse(toDate + "T23:59:59")
        );
    }

    @DeleteMapping("/clear")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> clearOldLogs() {
        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6);
        List<AuditLog> oldLogs = auditLogRepository.findByTimestampBetween(
            LocalDateTime.of(2020, 1, 1, 0, 0), sixMonthsAgo);
        auditLogRepository.deleteAll(oldLogs);
        return ResponseEntity.ok("Deleted " + oldLogs.size() + " old audit log entries");
    }
}
