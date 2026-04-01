package com.erp.repository;

import com.erp.model.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    List<AuditLog> findByUsername(String username);
    List<AuditLog> findByModule(String module);
    List<AuditLog> findByAction(String action);
    List<AuditLog> findByTimestampBetween(LocalDateTime from, LocalDateTime to);
    List<AuditLog> findByUsernameAndTimestampBetween(String username, LocalDateTime from, LocalDateTime to);
    List<AuditLog> findTop100ByOrderByTimestampDesc();
}
