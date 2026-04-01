package com.erp.repository;
import com.erp.model.CompanySettings;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;
public interface CompanySettingsRepository extends MongoRepository<CompanySettings, String> {
    Optional<CompanySettings> findFirstByOrderByCreatedAtAsc();
}
