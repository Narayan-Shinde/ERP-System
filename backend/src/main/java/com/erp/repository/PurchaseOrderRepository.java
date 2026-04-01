package com.erp.repository;

import com.erp.model.PurchaseOrder;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PurchaseOrderRepository extends MongoRepository<PurchaseOrder, String> {
    List<PurchaseOrder> findBySupplierId(String supplierId);
    List<PurchaseOrder> findByStatus(String status);
    List<PurchaseOrder> findByFinancialYear(String financialYear);
}
