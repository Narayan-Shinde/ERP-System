package com.erp.controller;

import com.erp.model.BankStatement;
import com.erp.repository.*;
import com.erp.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/accounting/bank-statements")
public class BankReconciliationController {

    @Autowired private BankStatementRepository statementRepo;
    @Autowired private SalesInvoiceRepository salesRepo;
    @Autowired private PurchaseInvoiceRepository purchaseRepo;
    @Autowired private AuditLogService auditLogService;

    @GetMapping
    public List<BankStatement> getAll(
            @RequestParam(required=false) String bankAccountId,
            @RequestParam(required=false) String fromDate,
            @RequestParam(required=false) String toDate) {
        if (bankAccountId != null && fromDate != null && toDate != null)
            return statementRepo.findByBankAccountIdAndTransactionDateBetween(
                bankAccountId, LocalDate.parse(fromDate), LocalDate.parse(toDate));
        if (bankAccountId != null)
            return statementRepo.findByBankAccountId(bankAccountId);
        return statementRepo.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> addEntry(@RequestBody BankStatement entry) {
        if (entry.getReconciliationStatus() == null)
            entry.setReconciliationStatus("UNMATCHED");
        if (entry.getTransactionDate() == null)
            entry.setTransactionDate(LocalDate.now());
        entry.setCreatedAt(LocalDateTime.now());
        BankStatement saved = statementRepo.save(entry);
        return ResponseEntity.ok(saved);
    }

    // Bulk import from CSV
    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> bulkImport(@RequestBody List<BankStatement> entries) {
        entries.forEach(e -> {
            if (e.getReconciliationStatus() == null) e.setReconciliationStatus("UNMATCHED");
            if (e.getTransactionDate() == null) e.setTransactionDate(LocalDate.now());
            e.setCreatedAt(LocalDateTime.now());
            e.setImportSource("CSV_IMPORT");
        });
        List<BankStatement> saved = statementRepo.saveAll(entries);
        auditLogService.logCreate("Accounting", "Bank Statement bulk import: " + saved.size() + " entries");
        return ResponseEntity.ok(Map.of("imported", saved.size(), "entries", saved));
    }

    // Reconcile an entry with a voucher/invoice
    @PutMapping("/{id}")
    public ResponseEntity<?> updateEntry(@PathVariable String id, @RequestBody BankStatement entry) {
        return statementRepo.findById(id).map(existing -> {
            entry.setId(id);
            // reconciliation status preserve करतो
            if (entry.getReconciliationStatus() == null)
                entry.setReconciliationStatus(existing.getReconciliationStatus());
            return ResponseEntity.ok(statementRepo.save(entry));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEntry(@PathVariable String id) {
        if (!statementRepo.existsById(id)) return ResponseEntity.notFound().build();
        statementRepo.deleteById(id);
        return ResponseEntity.ok(java.util.Map.of("message", "Deleted"));
    }

    @PutMapping("/{id}/reconcile")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> reconcile(@PathVariable String id,
            @RequestParam String voucherType,
            @RequestParam String voucherNumber,
            @RequestParam(required=false) String voucherId) {
        return statementRepo.findById(id).map(entry -> {
            entry.setReconciliationStatus("MATCHED");
            entry.setMatchedVoucherType(voucherType);
            entry.setMatchedVoucherNumber(voucherNumber);
            entry.setMatchedVoucherId(voucherId);
            entry.setReconciledAt(LocalDateTime.now());
            statementRepo.save(entry);
            return ResponseEntity.ok(Map.of("message", "Reconciled successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/ignore")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> ignore(@PathVariable String id) {
        return statementRepo.findById(id).map(entry -> {
            entry.setReconciliationStatus("IGNORED");
            entry.setReconciledAt(LocalDateTime.now());
            statementRepo.save(entry);
            return ResponseEntity.ok(Map.of("message", "Entry ignored"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Auto-suggest matches for unreconciled entries
    @GetMapping("/unreconciled")
    public ResponseEntity<?> getUnreconciled(
            @RequestParam(required=false) String bankAccountId) {
        List<BankStatement> unmatched = bankAccountId != null
            ? statementRepo.findByBankAccountIdAndReconciliationStatus(bankAccountId, "UNMATCHED")
            : statementRepo.findByReconciliationStatus("UNMATCHED");

        // Auto-suggest: match by amount
        List<Map<String,Object>> result = new ArrayList<>();
        for (BankStatement entry : unmatched) {
            Map<String,Object> row = new LinkedHashMap<>();
            row.put("entry", entry);

            // Find matching sales invoices (creditAmount matches payment)
            List<Map<String,Object>> suggestions = new ArrayList<>();
            if (entry.getCreditAmount() > 0) {
                salesRepo.findAll().stream()
                    .filter(i -> i.isActive() && !i.isCancelled())
                    .filter(i -> Math.abs(i.getPaidAmount() - entry.getCreditAmount()) < 1.0)
                    .limit(3)
                    .forEach(i -> suggestions.add(Map.of(
                        "type", "SALES_INVOICE",
                        "number", i.getInvoiceNumber(),
                        "id", i.getId(),
                        "amount", i.getPaidAmount(),
                        "customer", i.getCustomerName()
                    )));
            }
            if (entry.getDebitAmount() > 0) {
                purchaseRepo.findAll().stream()
                    .filter(i -> i.isActive() && !i.isCancelled())
                    .filter(i -> Math.abs(i.getPaidAmount() - entry.getDebitAmount()) < 1.0)
                    .limit(3)
                    .forEach(i -> suggestions.add(Map.of(
                        "type", "PURCHASE_PAYMENT",
                        "number", i.getInvoiceNumber(),
                        "id", i.getId(),
                        "amount", i.getPaidAmount(),
                        "supplier", i.getSupplierName()
                    )));
            }
            row.put("suggestions", suggestions);
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    // Summary stats
    @GetMapping("/summary")
    public ResponseEntity<?> getSummary(
            @RequestParam(required=false) String bankAccountId) {
        List<BankStatement> all = bankAccountId != null
            ? statementRepo.findByBankAccountId(bankAccountId)
            : statementRepo.findAll();

        long total     = all.size();
        long matched   = all.stream().filter(e -> "MATCHED".equals(e.getReconciliationStatus())).count();
        long unmatched = all.stream().filter(e -> "UNMATCHED".equals(e.getReconciliationStatus())).count();
        long ignored   = all.stream().filter(e -> "IGNORED".equals(e.getReconciliationStatus())).count();
        double totalCredit = all.stream().mapToDouble(BankStatement::getCreditAmount).sum();
        double totalDebit  = all.stream().mapToDouble(BankStatement::getDebitAmount).sum();

        return ResponseEntity.ok(Map.of(
            "total", total, "matched", matched,
            "unmatched", unmatched, "ignored", ignored,
            "totalCredit", totalCredit, "totalDebit", totalDebit,
            "matchRate", total > 0 ? Math.round((double)matched/total*100) : 0
        ));
    }
}
