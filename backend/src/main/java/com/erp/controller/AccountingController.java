package com.erp.controller;

import com.erp.model.accounting.AccountingVoucher;
import com.erp.repository.AccountingVoucherRepository;
import com.erp.service.AuditLogService;
import com.erp.service.LedgerPostingService;
import com.erp.service.VoucherSequenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/accounting")
@CrossOrigin(origins = "*")
public class AccountingController {

    @Autowired private com.erp.repository.SalesInvoiceRepository salesInvoiceRepo;
    @Autowired private com.erp.repository.PurchaseInvoiceRepository purchaseInvoiceRepo;
    @Autowired private com.erp.repository.SalesReturnRepository salesReturnRepo;
    @Autowired private com.erp.repository.PurchaseReturnRepository purchaseReturnRepo;
    @Autowired private com.erp.service.AutoPostingService autoPostingService;

    @Autowired private AuditLogService auditLogService;

    @Autowired private AccountingVoucherRepository voucherRepo;
    @Autowired private LedgerPostingService ledgerPostingService;
    @Autowired private VoucherSequenceService voucherSequenceService;

    @GetMapping("/vouchers")
    public List<AccountingVoucher> getVouchers(
            @RequestParam(required=false) String voucherType,
            @RequestParam(required=false) String financialYear,
            @RequestParam(required=false, defaultValue="false") boolean includeReversals) {
        List<AccountingVoucher> all;
        if (voucherType != null) all = voucherRepo.findByVoucherType(voucherType);
        else if (financialYear != null && !"ALL".equalsIgnoreCase(financialYear)) all = voucherRepo.findByFinancialYear(financialYear);
        else all = voucherRepo.findAll();

        if (!includeReversals)
            all = all.stream()
                .filter(v -> !Boolean.TRUE.equals(v.getCancelled()))
                .collect(java.util.stream.Collectors.toList());
        return all;
    }

    @PostMapping("/vouchers")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> createVoucher(@RequestBody AccountingVoucher voucher) {
        if (voucher.getEntries() == null || voucher.getEntries().isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "At least 2 entries required for double-entry"));

        double totalDebit  = voucher.getEntries().stream()
            .filter(e -> "DEBIT".equals(e.getEntryType())).mapToDouble(AccountingVoucher.VoucherEntry::getAmount).sum();
        double totalCredit = voucher.getEntries().stream()
            .filter(e -> "CREDIT".equals(e.getEntryType())).mapToDouble(AccountingVoucher.VoucherEntry::getAmount).sum();

        if (Math.abs(totalDebit - totalCredit) > 0.01)
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Debit (" + totalDebit + ") must equal Credit (" + totalCredit + "). Difference: " + Math.abs(totalDebit - totalCredit),
                "totalDebit", totalDebit, "totalCredit", totalCredit));

        voucher.setTotalDebit(totalDebit);
        voucher.setTotalCredit(totalCredit);
        if (voucher.getStatus() == null) voucher.setStatus("POSTED");
        if (voucher.getCancelled() == null) voucher.setCancelled(false);

        if (voucher.getNarration() != null && voucher.getVoucherDate() != null) {
            boolean isDuplicate = voucherRepo.existsByNarrationAndVoucherDateAndTotalDebit(
                voucher.getNarration(), voucher.getVoucherDate(), totalDebit);
            if (isDuplicate) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Duplicate entry! Same narration + date + amount already exists.",
                    "duplicate", true
                ));
            }
        }
        if (voucher.getVoucherNumber() == null || voucher.getVoucherNumber().isEmpty()) {
            String prefix;
            switch (voucher.getVoucherType() != null ? voucher.getVoucherType() : "JOURNAL") {
                case "PAYMENT":
                    prefix = "PMT";
                    break;
                case "RECEIPT":
                    prefix = "RCT";
                    break;
                case "CONTRA":
                    prefix = "CTR";
                    break;
                default:
                    prefix = "JRN";
                    break;
            }
            voucher.setVoucherNumber(voucherSequenceService.nextManualVoucherNumber(prefix));
        }
        AccountingVoucher saved = voucherRepo.save(voucher);
        ledgerPostingService.postVoucherToLedger(saved);
        auditLogService.logCreate("Accounting", "Voucher created: " + saved.getVoucherNumber() + " | " + saved.getVoucherType() + " | ₹" + saved.getTotalDebit());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/vouchers/{id}")
    public ResponseEntity<AccountingVoucher> getVoucher(@PathVariable String id) {
        return voucherRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/vouchers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> updateVoucher(@PathVariable String id, @RequestBody AccountingVoucher voucher) {
        return voucherRepo.findById(id).map(existing -> {
            if (Boolean.TRUE.equals(existing.getCancelled()))
                return ResponseEntity.badRequest().body(
                    Map.of("error", "Cannot update a cancelled voucher. Create a new correcting entry."));
            if ("AUTO-POSTED".equals(existing.getStatus()))
                return ResponseEntity.badRequest().body(
                    Map.of("error", "Cannot update auto-posted system entry. Cancel the source transaction instead."));

            double dr = voucher.getEntries().stream()
                .filter(e -> "DEBIT".equals(e.getEntryType())).mapToDouble(AccountingVoucher.VoucherEntry::getAmount).sum();
            double cr = voucher.getEntries().stream()
                .filter(e -> "CREDIT".equals(e.getEntryType())).mapToDouble(AccountingVoucher.VoucherEntry::getAmount).sum();
            if (Math.abs(dr - cr) > 0.01)
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Debit must equal Credit", "debit", dr, "credit", cr));

            ledgerPostingService.removePostingsForVoucherAndRecalculate(existing.getVoucherNumber());

            voucher.setId(id);
            voucher.setVoucherNumber(existing.getVoucherNumber()); // preserve number
            voucher.setTotalDebit(dr);
            voucher.setTotalCredit(cr);
            voucher.setCancelled(false);
            AccountingVoucher sv = voucherRepo.save(voucher);
            ledgerPostingService.postVoucherToLedger(sv);
            auditLogService.logUpdate("Accounting", "Voucher updated: " + sv.getVoucherNumber() + " | " + sv.getVoucherType());
            return ResponseEntity.ok(sv);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/vouchers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> cancelVoucher(@PathVariable String id,
            @RequestParam(required=false) String reason) {
        return voucherRepo.findById(id).map(v -> {
            if (Boolean.TRUE.equals(v.getCancelled()))
                return ResponseEntity.badRequest().body(Map.of("error", "Voucher already cancelled"));

            v.setCancelled(true);
            v.setStatus("CANCELLED");
            v.setCancelledReason(reason != null ? reason : "Cancelled by admin");
            voucherRepo.save(v);

            AccountingVoucher reversal = new AccountingVoucher();
            reversal.setVoucherNumber("REV-" + v.getVoucherNumber());
            reversal.setVoucherType(v.getVoucherType());
            reversal.setVoucherDate(LocalDate.now());
            reversal.setFinancialYear(v.getFinancialYear());
            reversal.setNarration("REVERSAL of " + v.getVoucherNumber() + " — " + (reason != null ? reason : "Cancelled"));
            reversal.setReferenceNumber(v.getVoucherNumber());
            reversal.setStatus("POSTED");
            reversal.setCancelled(false);

            if (v.getEntries() != null) {
                List<AccountingVoucher.VoucherEntry> revEntries = new ArrayList<>();
                for (AccountingVoucher.VoucherEntry e : v.getEntries()) {
                    AccountingVoucher.VoucherEntry rev = new AccountingVoucher.VoucherEntry();
                    rev.setLedgerName(e.getLedgerName());
                    rev.setLedgerId(e.getLedgerId());
                    rev.setAmount(e.getAmount());
                    rev.setEntryType("DEBIT".equals(e.getEntryType()) ? "CREDIT" : "DEBIT");
                    rev.setNarration("Reversal: " + (e.getNarration() != null ? e.getNarration() : ""));
                    revEntries.add(rev);
                }
                reversal.setEntries(revEntries);
            }
            reversal.setTotalDebit(v.getTotalCredit());   // swapped
            reversal.setTotalCredit(v.getTotalDebit());   // swapped
            voucherRepo.save(reversal);
            ledgerPostingService.postVoucherToLedger(reversal);

            return ResponseEntity.ok(Map.of(
                "message", "Voucher cancelled. Reversal entry " + reversal.getVoucherNumber() + " created.",
                "originalVoucher", v.getVoucherNumber(),
                "reversalVoucher", reversal.getVoucherNumber()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/vouchers/type/{type}")
    public List<AccountingVoucher> getByType(@PathVariable String type) {
        return voucherRepo.findByVoucherType(type);
    }
    // ── Repost missing ledger entries (for invoices/returns that weren't posted) ──
    @PostMapping("/repost-missing")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> repostMissing() {
        int posted = 0;
        // Repost sales invoices
        for (var inv : salesInvoiceRepo.findAll()) {
            if (inv.isCancelled() || "DRAFT".equals(inv.getStatus())) continue;
            if (inv.getInvoiceNumber() == null) continue;
            String vNum = "AUTO-SAL-" + inv.getInvoiceNumber();
            if (!voucherRepo.existsByVoucherNumber(vNum)) {
                try { autoPostingService.postSalesInvoice(inv); posted++; } catch (Exception e) {
                    System.err.println("Repost sales error: " + e.getMessage());
                }
            }
        }
        // Repost purchase invoices
        for (var inv : purchaseInvoiceRepo.findAll()) {
            if (inv.isCancelled() || "DRAFT".equals(inv.getStatus())) continue;
            if (inv.getInvoiceNumber() == null) continue;
            String vNum = "AUTO-PUR-" + inv.getInvoiceNumber();
            if (!voucherRepo.existsByVoucherNumber(vNum)) {
                try { autoPostingService.postPurchaseInvoice(inv); posted++; } catch (Exception e) {
                    System.err.println("Repost purchase error: " + e.getMessage());
                }
            }
        }
        // Repost approved sales returns
        for (var ret : salesReturnRepo.findAll()) {
            if (!"APPROVED".equals(ret.getStatus()) && !"COMPLETED".equals(ret.getStatus())) continue;
            if (ret.getReturnNumber() == null) continue;
            String vNum = "AUTO-SRET-" + ret.getReturnNumber();
            if (!voucherRepo.existsByVoucherNumber(vNum)) {
                try {
                    autoPostingService.postSalesReturn(
                        ret.getReturnNumber(), ret.getCustomerName() != null ? ret.getCustomerName() : "Customer",
                        ret.getSubTotal() > 0 ? ret.getSubTotal() : ret.getGrandTotal(),
                        ret.getTotalGst(), ret.getGrandTotal(), ret.getFinancialYear());
                    posted++;
                } catch (Exception e) { System.err.println("Repost sret error: " + e.getMessage()); }
            }
        }
        // Repost approved purchase returns
        for (var ret : purchaseReturnRepo.findAll()) {
            if (!"APPROVED".equals(ret.getStatus()) && !"COMPLETED".equals(ret.getStatus())) continue;
            if (ret.getReturnNumber() == null) continue;
            String vNum = "AUTO-PRET-" + ret.getReturnNumber();
            if (!voucherRepo.existsByVoucherNumber(vNum)) {
                try {
                    autoPostingService.postPurchaseReturn(
                        ret.getReturnNumber(), ret.getSupplierName() != null ? ret.getSupplierName() : "Supplier",
                        ret.getSubTotal() > 0 ? ret.getSubTotal() : ret.getGrandTotal(),
                        ret.getTotalGst(), ret.getGrandTotal(), ret.getFinancialYear());
                    posted++;
                } catch (Exception e) { System.err.println("Repost pret error: " + e.getMessage()); }
            }
        }
        return ResponseEntity.ok(Map.of("message", "Repost complete", "entriesPosted", posted));
    }

}