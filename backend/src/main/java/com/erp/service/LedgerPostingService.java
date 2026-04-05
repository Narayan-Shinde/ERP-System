package com.erp.service;

import com.erp.model.AccountingVoucher;
import com.erp.model.LedgerAccount;
import com.erp.model.LedgerTransaction;
import com.erp.repository.LedgerAccountRepository;
import com.erp.repository.LedgerTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Single engine for ledger balance movements and voucher posting.
 * Auto-posted and manual vouchers use the same rules; reversals/update use strip + repost or post reversal rows.
 */
@Service
public class LedgerPostingService {

    @Autowired
    private LedgerAccountRepository ledgerRepo;
    @Autowired
    private LedgerTransactionRepository txnRepo;

    public static final class BalanceState {
        public double balance;
        public String balanceType;

        public BalanceState(double balance, String balanceType) {
            this.balance = balance;
            this.balanceType = balanceType;
        }
    }

    /**
     * Core movement rule (must match historical AutoPosting behaviour).
     */
    public BalanceState applyMovement(double currentBal, String currentType, String entryType, double amount) {
        String ct = currentType != null ? currentType : "DEBIT";
        if (entryType.equals(ct)) {
            return new BalanceState(currentBal + amount, ct);
        }
        if (amount > currentBal) {
            return new BalanceState(amount - currentBal, entryType);
        }
        return new BalanceState(currentBal - amount, ct);
    }

    public void postLedgerEntry(LedgerAccount account, String entryType, double amount,
                                String voucherType, String voucherNumber,
                                String narration, String financialYear,
                                LocalDate transactionDate) {
        if (account == null || entryType == null) return;
        if (Math.abs(amount) < 0.0000001) return;

        LedgerAccount fresh = ledgerRepo.findById(account.getId()).orElse(account);
        double currentBal = fresh.getCurrentBalance();
        String currentType = fresh.getCurrentBalanceType() != null ? fresh.getCurrentBalanceType() : "DEBIT";

        BalanceState next = applyMovement(currentBal, currentType, entryType, amount);
        fresh.setCurrentBalance(next.balance);
        fresh.setCurrentBalanceType(next.balanceType);
        ledgerRepo.save(fresh);

        LedgerTransaction txn = new LedgerTransaction();
        txn.setLedgerAccountId(fresh.getId());
        txn.setLedgerAccountName(fresh.getAccountName());
        txn.setTransactionDate(transactionDate != null ? transactionDate : LocalDate.now());
        txn.setVoucherType(voucherType != null ? voucherType : "JOURNAL");
        txn.setVoucherNumber(voucherNumber);
        txn.setEntryType(entryType);
        txn.setAmount(amount);
        txn.setRunningBalance(next.balance);
        txn.setBalanceType(next.balanceType);
        txn.setNarration(narration);
        txn.setFinancialYear(financialYear != null ? financialYear : "2024-25");
        txn.setCreatedAt(LocalDateTime.now());
        txnRepo.save(txn);
    }

    /**
     * Post all lines of a saved voucher to ledgers (matched by active ledger account name, case-insensitive).
     */
    public void postVoucherToLedger(AccountingVoucher saved) {
        if (saved == null || saved.getVoucherNumber() == null || saved.getEntries() == null) return;
        LocalDate txnDate = saved.getVoucherDate() != null ? saved.getVoucherDate() : LocalDate.now();
        String vType = saved.getVoucherType() != null ? saved.getVoucherType() : "JOURNAL";
        String fy = saved.getFinancialYear();

        List<LedgerAccount> active = ledgerRepo.findByActiveTrue();
        for (AccountingVoucher.VoucherEntry entry : saved.getEntries()) {
            String entryLedgerName = entry.getLedgerName();
            if (entryLedgerName == null) continue;
            active.stream()
                    .filter(l -> entryLedgerName.equalsIgnoreCase(l.getAccountName()))
                    .findFirst()
                    .ifPresent(ledger -> {
                        if (txnRepo.existsByVoucherNumberAndLedgerAccountId(saved.getVoucherNumber(), ledger.getId())) {
                            return;
                        }
                        if (Math.abs(entry.getAmount()) < 0.0000001) return;
                        postLedgerEntry(ledger, entry.getEntryType(), entry.getAmount(),
                                vType, saved.getVoucherNumber(), saved.getNarration(), fy, txnDate);
                    });
        }
    }

    /**
     * Deletes all ledger lines for a voucher number and rebuilds current balance for every touched account
     * from opening balance + remaining transactions (stable order).
     */
    public void removePostingsForVoucherAndRecalculate(String voucherNumber) {
        if (voucherNumber == null || voucherNumber.isBlank()) return;
        List<LedgerTransaction> list = txnRepo.findByVoucherNumber(voucherNumber);
        if (list.isEmpty()) return;

        Set<String> ledgerIds = list.stream()
                .map(LedgerTransaction::getLedgerAccountId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        txnRepo.deleteAll(list);

        for (String ledgerId : ledgerIds) {
            recalculateLedgerBalanceFromTransactions(ledgerId);
        }
    }

    public void recalculateLedgerBalanceFromTransactions(String ledgerAccountId) {
        if (ledgerAccountId == null) return;
        LedgerAccount acc = ledgerRepo.findById(ledgerAccountId).orElse(null);
        if (acc == null) return;

        List<LedgerTransaction> txns = txnRepo.findByLedgerAccountId(ledgerAccountId);
        txns.sort(Comparator
                .comparing(LedgerTransaction::getTransactionDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(t -> t.getCreatedAt() != null ? t.getCreatedAt() : LocalDateTime.MIN));

        double bal = acc.getOpeningBalance();
        String typ = acc.getOpeningBalanceType() != null ? acc.getOpeningBalanceType() : "DEBIT";

        for (LedgerTransaction t : txns) {
            if (t.getEntryType() == null || Math.abs(t.getAmount()) < 0.0000001) continue;
            BalanceState next = applyMovement(bal, typ, t.getEntryType(), t.getAmount());
            bal = next.balance;
            typ = next.balanceType;
            t.setRunningBalance(bal);
            t.setBalanceType(typ);
            txnRepo.save(t);
        }

        acc.setCurrentBalance(bal);
        acc.setCurrentBalanceType(typ);
        ledgerRepo.save(acc);
    }
}
