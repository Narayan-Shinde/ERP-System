package com.erp.repository;

import com.erp.model.accounting.AccountingVoucher;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDate;
import java.util.List;

public interface AccountingVoucherRepository extends MongoRepository<AccountingVoucher, String> {
    List<AccountingVoucher> findByVoucherType(String voucherType);
    List<AccountingVoucher> findByFinancialYear(String financialYear);
    List<AccountingVoucher> findByVoucherDateBetween(LocalDate from, LocalDate to);
    boolean existsByNarrationAndVoucherDateAndTotalDebit(String narration, java.time.LocalDate voucherDate, double totalDebit);
    boolean existsByVoucherNumber(String voucherNumber);
    AccountingVoucher findByVoucherNumber(String voucherNumber);
}
