package com.erp.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class AuditLogService {

    @Autowired(required = false)
    private MongoTemplate mongoTemplate;

    public void log(String action, String module, String description) {
        if (mongoTemplate == null) return;
        try {
            String username = "system";
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()
                    && !"anonymousUser".equals(auth.getPrincipal()))
                username = auth.getName();

            Map<String, Object> entry = new HashMap<>();
            entry.put("username",    username);
            entry.put("action",      action);
            entry.put("module",      module);
            entry.put("description", description);
            entry.put("timestamp",   LocalDateTime.now().toString());
            mongoTemplate.save(entry, "audit_logs");
        } catch (Exception e) {
        }
    }

    public void logCreate(String module, String description)  { log("CREATE",  module, description); }
    public void logUpdate(String module, String description)  { log("UPDATE",  module, description); }
    public void logDelete(String module, String description)  { log("DELETE",  module, description); }
    public void logPayment(String module, String description) { log("PAYMENT", module, description); }
    public void logReturn(String module, String description)  { log("RETURN",  module, description); }
}
