package com.erp.repository;
import com.erp.model.SalesReturn;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
public interface SalesReturnRepository extends MongoRepository<SalesReturn, String> {
    List<SalesReturn> findByCustomerId(String customerId);
    List<SalesReturn> findByFinancialYear(String financialYear);
}
