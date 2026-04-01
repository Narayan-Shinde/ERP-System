package com.erp.repository;
import com.erp.model.ExpenseHead;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
public interface ExpenseHeadRepository extends MongoRepository<ExpenseHead, String> {
    List<ExpenseHead> findByActiveTrue();
    List<ExpenseHead> findByCategory(String category);
}
