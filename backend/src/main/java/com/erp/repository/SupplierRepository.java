package com.erp.repository;

import com.erp.model.Supplier;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface SupplierRepository extends MongoRepository<Supplier, String> {
    List<Supplier> findByActiveTrue();
    List<Supplier> findByNameContainingIgnoreCase(String name);
    boolean existsByGstin(String gstin);
    Optional<Supplier> findBySupplierNameIgnoreCase(String supplierName);
    Optional<Supplier> findById(String id);
}
