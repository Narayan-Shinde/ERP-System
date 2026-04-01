package com.erp.controller;

import com.erp.model.BankAccount;
import com.erp.model.LedgerAccount;
import com.erp.repository.BankAccountRepository;
import com.erp.repository.LedgerAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings/banks")
@CrossOrigin(origins = "*")
public class BankAccountController {

    @Autowired private BankAccountRepository bankRepo;
    @Autowired private LedgerAccountRepository ledgerRepo;

    @GetMapping
    public List<BankAccount> getBanks() {
        return bankRepo.findByActiveTrue();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public BankAccount addBank(@RequestBody BankAccount bank) {
        if (bank.isDefault()) {
            bankRepo.findByActiveTrue().forEach(b -> {
                b.setDefault(false);
                bankRepo.save(b);
            });
        }
        if (bankRepo.findByActiveTrue().isEmpty()) bank.setDefault(true);
        BankAccount saved = bankRepo.save(bank);

        createBankLedger(saved.getBankName(), saved.getOpeningBalance());
        return saved;
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> updateBank(@PathVariable String id, @RequestBody BankAccount bank) {
        return bankRepo.findById(id).map(existing -> {
            if (bank.isDefault()) {
                bankRepo.findByActiveTrue().forEach(b -> { b.setDefault(false); bankRepo.save(b); });
            }
            bank.setId(id);
            BankAccount saved = bankRepo.save(bank);
            createBankLedger(saved.getBankName(), 0); // ensure ledger exists
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteBank(@PathVariable String id) {
        return bankRepo.findById(id).map(bank -> {
            bank.setActive(false);
            bankRepo.save(bank);
            return ResponseEntity.ok(Map.of("message", "Bank deleted"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/set-default")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> setDefault(@PathVariable String id) {
        bankRepo.findByActiveTrue().forEach(b -> { b.setDefault(false); bankRepo.save(b); });
        return bankRepo.findById(id).map(bank -> {
            bank.setDefault(true);
            return ResponseEntity.ok(bankRepo.save(bank));
        }).orElse(ResponseEntity.notFound().build());
    }

    private void createBankLedger(String bankName, double openingBalance) {
        if (bankName == null || bankName.isEmpty()) return;
        boolean exists = ledgerRepo.findByActiveTrue().stream()
            .anyMatch(l -> bankName.equalsIgnoreCase(l.getAccountName()));
        if (!exists) {
            LedgerAccount la = new LedgerAccount();
            la.setAccountName(bankName);
            la.setAccountGroup("ASSET");
            la.setSubGroup("Cash & Bank");
            la.setAccountCode("1" + String.format("%03d", ledgerRepo.count() + 1));
            la.setCurrentBalance(openingBalance);
            la.setCurrentBalanceType("DEBIT");
            la.setActive(true);
            ledgerRepo.save(la);
        }
    }
}
