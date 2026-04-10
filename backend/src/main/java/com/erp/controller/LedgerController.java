package com.erp.controller;

import com.erp.model.ledger.LedgerAccount;
import com.erp.model.ledger.LedgerTransaction;
import com.erp.repository.LedgerAccountRepository;
import com.erp.repository.LedgerTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ledger")
@CrossOrigin(origins = "*")
public class LedgerController {

    @Autowired private LedgerAccountRepository ledgerRepo;
    @Autowired private LedgerTransactionRepository txnRepo;

    @GetMapping
    public List<LedgerAccount> getLedgers(
            @RequestParam(required=false) String accountGroup,
            @RequestParam(required=false, defaultValue="true") boolean activeOnly) {
        if (accountGroup != null) return ledgerRepo.findByAccountGroup(accountGroup);
        return activeOnly ? ledgerRepo.findByActiveTrue() : ledgerRepo.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> createLedger(@RequestBody LedgerAccount ledger) {
        if (ledger.getAccountName() == null || ledger.getAccountName().isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Account name is required"));
        if (ledger.getAccountGroup() == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Account group is required"));
        if (ledger.getAccountCode() == null || ledger.getAccountCode().isEmpty()) {
            String prefix;
            switch (ledger.getAccountGroup()) {
                case "ASSET":
                    prefix = "1";
                    break;
                case "LIABILITY":
                    prefix = "2";
                    break;
                case "EQUITY":
                    prefix = "3";
                    break;
                case "INCOME":
                    prefix = "4";
                    break;
                case "EXPENSE":
                    prefix = "5";
                    break;
                default:
                    prefix = "9";
                    break;
            }
            ledger.setAccountCode(prefix + String.format("%03d", ledgerRepo.count() + 1));
        }
        ledger.setActive(true);
        ledger.setCurrentBalance(ledger.getOpeningBalance());
        ledger.setCurrentBalanceType(ledger.getOpeningBalanceType() != null ? ledger.getOpeningBalanceType() : "DEBIT");
        return ResponseEntity.ok(ledgerRepo.save(ledger));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LedgerAccount> getLedger(@PathVariable String id) {
        return ledgerRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> updateLedger(@PathVariable String id, @RequestBody LedgerAccount ledger) {
        return ledgerRepo.findById(id).map(existing -> {
            if (existing.isSystemAccount())
                return ResponseEntity.badRequest().body(Map.of("error",
                        "System accounts cannot be modified. They are managed automatically."));
            ledger.setId(id);
            ledger.setActive(existing.isActive());
            ledger.setSystemAccount(existing.isSystemAccount());
            return ResponseEntity.ok(ledgerRepo.save(ledger));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteLedger(@PathVariable String id) {
        return ledgerRepo.findById(id).map(l -> {
            if (l.isSystemAccount())
                return ResponseEntity.badRequest().body(Map.of("error",
                        "System accounts cannot be deleted. They are used by the accounting engine."));
            long txnCount = txnRepo.countByLedgerAccountId(id);
            if (txnCount > 0)
                return ResponseEntity.badRequest().body(Map.of("error",
                        "Cannot delete ledger with " + txnCount + " transactions. Deactivate instead.",
                        "transactionCount", txnCount));
            if (Math.abs(l.getCurrentBalance()) > 0.01)
                return ResponseEntity.badRequest().body(Map.of("error",
                        "Cannot delete ledger with non-zero balance of ₹" + l.getCurrentBalance() + ". Close the account first.",
                        "currentBalance", l.getCurrentBalance()));
            l.setActive(false);
            ledgerRepo.save(l);
            return ResponseEntity.ok(Map.of("message", "Ledger account deactivated successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/statement")
    public ResponseEntity<?> getLedgerStatement(@PathVariable String id,
                                                @RequestParam(required=false) String fromDate,
                                                @RequestParam(required=false) String toDate) {
        LedgerAccount account = ledgerRepo.findById(id).orElse(null);
        if (account == null) return ResponseEntity.notFound().build();

        List<LedgerTransaction> txns;
        if (fromDate != null && toDate != null)
            txns = txnRepo.findByLedgerAccountIdAndTransactionDateBetween(
                    id, LocalDate.parse(fromDate), LocalDate.parse(toDate));
        else
            txns = txnRepo.findByLedgerAccountIdOrderByTransactionDateAsc(id);

        double totalDebit  = txns.stream().filter(t -> "DEBIT".equals(t.getEntryType())).mapToDouble(LedgerTransaction::getAmount).sum();
        double totalCredit = txns.stream().filter(t -> "CREDIT".equals(t.getEntryType())).mapToDouble(LedgerTransaction::getAmount).sum();

        return ResponseEntity.ok(Map.of(
                "account", account, "transactions", txns,
                "totalDebit", totalDebit, "totalCredit", totalCredit,
                "netBalance", totalDebit - totalCredit,
                "openingBalance", account.getOpeningBalance()));
    }
}