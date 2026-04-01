package com.erp.repository;
import com.erp.model.PurchaseReturn;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PurchaseReturnRepository extends MongoRepository<PurchaseReturn, String> {
    List<PurchaseReturn> findBySupplierId(String supplierId);
    List<PurchaseReturn> findByFinancialYear(String financialYear);
}
