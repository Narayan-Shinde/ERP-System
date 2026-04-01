package com.erp.repository;
import com.erp.model.Warehouse;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
public interface WarehouseRepository extends MongoRepository<Warehouse, String> {
    List<Warehouse> findByActiveTrue();
}
