package com.erp.repository;

import com.erp.model.BankStatement;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDate;
import java.util.List;

public interface BankStatementRepository extends MongoRepository<BankStatement, String> {
    List<BankStatement> findByBankAccountId(String bankAccountId);
    List<BankStatement> findByReconciliationStatus(String status);
    List<BankStatement> findByBankAccountIdAndTransactionDateBetween(
        String bankAccountId, LocalDate from, LocalDate to);
    List<BankStatement> findByBankAccountIdAndReconciliationStatus(
        String bankAccountId, String status);
}
