package com.erp.controller;

import com.erp.model.LedgerTransaction;
import com.erp.repository.LedgerTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/ledger")
@CrossOrigin(origins = "*")
public class LedgerTransactionController {

    @Autowired private LedgerTransactionRepository txnRepo;

    @GetMapping("/transactions")
    public List<LedgerTransaction> getTransactions(
            @RequestParam(required = false) String ledgerId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {

        if (ledgerId != null && fromDate != null && toDate != null)
            return txnRepo.findByLedgerAccountIdAndTransactionDateBetween(
                    ledgerId, LocalDate.parse(fromDate), LocalDate.parse(toDate));
        if (ledgerId != null)
            return txnRepo.findByLedgerAccountIdOrderByTransactionDateAsc(ledgerId);
        if (fromDate != null && toDate != null)
            return txnRepo.findByTransactionDateBetween(
                    LocalDate.parse(fromDate), LocalDate.parse(toDate));
        return txnRepo.findAllByOrderByTransactionDateAsc();
    }

    @PostMapping("/transactions")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<LedgerTransaction> addTransaction(@RequestBody LedgerTransaction txn) {
        if (txn.getTransactionDate() == null) txn.setTransactionDate(LocalDate.now());
        return ResponseEntity.ok(txnRepo.save(txn));
    }

    @PutMapping("/transactions/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<LedgerTransaction> updateTransaction(
            @PathVariable String id, @RequestBody LedgerTransaction txn) {
        return txnRepo.findById(id).map(existing -> {
            txn.setId(id);
            return ResponseEntity.ok(txnRepo.save(txn));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/transactions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteTransaction(@PathVariable String id) {
        if (!txnRepo.existsById(id)) return ResponseEntity.notFound().build();
        txnRepo.deleteById(id);
        return ResponseEntity.ok("Deleted");
    }
}
