package com.erp.repository;
import com.erp.model.LedgerTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDate;
import java.util.List;

public interface LedgerTransactionRepository extends MongoRepository<LedgerTransaction, String> {
    List<LedgerTransaction> findByLedgerAccountId(String id);
    List<LedgerTransaction> findByLedgerAccountIdOrderByTransactionDateAsc(String id);
    List<LedgerTransaction> findByLedgerAccountIdAndTransactionDateBetween(String id, LocalDate from, LocalDate to);
    List<LedgerTransaction> findByTransactionDateBetween(LocalDate from, LocalDate to);
    List<LedgerTransaction> findByFinancialYear(String fy);
    List<LedgerTransaction> findByVoucherType(String type);
    List<LedgerTransaction> findByVoucherNumber(String voucherNumber);
    boolean existsByVoucherNumberAndLedgerAccountId(String voucherNumber, String ledgerAccountId);
    long countByLedgerAccountId(String ledgerAccountId);
    List<LedgerTransaction> findAllByOrderByTransactionDateAsc();
}
