package com.erp.service;

import com.erp.model.LedgerAccount;
import com.erp.model.LedgerTransaction;
import com.erp.repository.LedgerAccountRepository;
import com.erp.repository.LedgerTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class OpeningBalanceService {

    @Autowired private LedgerAccountRepository ledgerRepo;
    @Autowired private LedgerTransactionRepository txnRepo;

    public LedgerAccount setOpeningBalance(String ledgerAccountId, double amount,
                                            String balanceType, String financialYear) {
        LedgerAccount account = ledgerRepo.findById(ledgerAccountId)
            .orElseThrow(() -> new RuntimeException("Ledger account not found: " + ledgerAccountId));

        account.setOpeningBalance(amount);
        account.setOpeningBalanceType(balanceType);
        account.setCurrentBalance(amount);
        account.setCurrentBalanceType(balanceType);
        ledgerRepo.save(account);

        LedgerTransaction txn = new LedgerTransaction();
        txn.setLedgerAccountId(ledgerAccountId);
        txn.setLedgerAccountName(account.getAccountName());
        txn.setTransactionDate(LocalDate.parse(financialYear.substring(0, 4) + "-04-01"));
        txn.setVoucherType("OPENING");
        txn.setVoucherNumber("OB-" + financialYear);
        txn.setEntryType(balanceType);
        txn.setAmount(amount);
        txn.setRunningBalance(amount);
        txn.setBalanceType(balanceType);
        txn.setNarration("Opening Balance - " + financialYear);
        txn.setFinancialYear(financialYear);
        txnRepo.save(txn);

        return account;
    }

    public void bulkSetOpeningBalance(List<Map<String, Object>> entries, String financialYear) {
        for (Map<String, Object> entry : entries) {
            String accountId = (String) entry.get("accountId");
            double amount = Double.parseDouble(entry.get("amount").toString());
            String balanceType = (String) entry.get("balanceType");
            setOpeningBalance(accountId, amount, balanceType, financialYear);
        }
    }

    public int carryForwardBalances(String previousYear, String newYear) {
        List<LedgerAccount> accounts = ledgerRepo.findByActiveTrue();
        int count = 0;

        for (LedgerAccount acc : accounts) {
            if ("INCOME".equals(acc.getAccountGroup()) || "EXPENSE".equals(acc.getAccountGroup())) {
                acc.setOpeningBalance(0);
                acc.setCurrentBalance(0);
            } else {
                acc.setOpeningBalance(acc.getCurrentBalance());
                acc.setOpeningBalanceType(acc.getCurrentBalanceType());
            }
            ledgerRepo.save(acc);
            count++;
        }
        return count;
    }
}
