package com.erp.repository;
import com.erp.model.Expense;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends MongoRepository<Expense, String> {
    List<Expense> findByActiveTrue();
    List<Expense> findByActiveTrueAndExpenseDateBetween(LocalDate from, LocalDate to);
    List<Expense> findByExpenseDateBetween(LocalDate from, LocalDate to);
    List<Expense> findByFinancialYear(String financialYear);
    List<Expense> findByExpenseHeadId(String headId);
}
