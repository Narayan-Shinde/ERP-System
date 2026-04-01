package com.erp.repository;

import com.erp.model.GstConfiguration;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface GstConfigurationRepository extends MongoRepository<GstConfiguration, String> {
    Optional<GstConfiguration> findByHsnCode(String hsnCode);
    List<GstConfiguration> findByGstRate(double gstRate);
}
