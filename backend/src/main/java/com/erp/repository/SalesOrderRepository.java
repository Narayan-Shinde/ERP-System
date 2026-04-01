package com.erp.repository;
import com.erp.model.SalesOrder;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
public interface SalesOrderRepository extends MongoRepository<SalesOrder, String> {
    List<SalesOrder> findByCustomerId(String customerId);
    List<SalesOrder> findByStatus(String status);
    List<SalesOrder> findByFinancialYear(String financialYear);
}
