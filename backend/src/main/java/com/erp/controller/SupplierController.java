package com.erp.controller;

import com.erp.model.PurchaseInvoice;
import com.erp.repository.PurchaseInvoiceRepository;
import com.erp.repository.PurchaseReturnRepository;
import com.erp.repository.SupplierRepository;
import com.erp.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.erp.model.Supplier;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/suppliers")
@CrossOrigin(origins = "*")
public class SupplierController {

    @Autowired private SupplierRepository supplierRepo;
    @Autowired private PurchaseInvoiceRepository invoiceRepo;
    @Autowired private PurchaseReturnRepository returnRepo;
    @Autowired private AuditLogService auditLogService;

    // ─────────────── LEDGER ───────────────
    @GetMapping("/{id}/ledger")
    public ResponseEntity<?> getSupplierLedger(
            @PathVariable String id,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String financialYear) {
        return supplierRepo.findById(id).map(supp -> {
            List<PurchaseInvoice> invoices = invoiceRepo.findBySupplierId(id).stream()
                .filter(i -> !i.isCancelled())
                .sorted(Comparator.comparing(i -> i.getInvoiceDate() != null ? i.getInvoiceDate() : LocalDate.MIN))
                .collect(Collectors.toList());

            if (fromDate != null && toDate != null) {
                LocalDate from = LocalDate.parse(fromDate);
                LocalDate to   = LocalDate.parse(toDate);
                invoices = invoices.stream()
                    .filter(i -> i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(from)
                        && !i.getInvoiceDate().isAfter(to))
                    .collect(Collectors.toList());
            } else if (financialYear != null && !financialYear.equals("ALL")) {
                invoices = invoices.stream()
                    .filter(i -> financialYear.equals(i.getFinancialYear()))
                    .collect(Collectors.toList());
            }

            double running = supp.getOpeningBalance();
            List<Map<String, Object>> rows = new ArrayList<>();

            // Opening balance
            Map<String, Object> opRow = new LinkedHashMap<>();
            opRow.put("date",      "Opening");
            opRow.put("type",      "OPENING");
            opRow.put("reference", "Opening Balance");
            opRow.put("debit",     supp.getOpeningBalance() < 0 ? Math.abs(supp.getOpeningBalance()) : 0);
            opRow.put("credit",    supp.getOpeningBalance() > 0 ? supp.getOpeningBalance() : 0);
            opRow.put("balance",   running);
            rows.add(opRow);

            for (PurchaseInvoice inv : invoices) {
                double grandTotal = inv.getGrandTotal();
                double paid       = inv.getPaidAmount();

                // Invoice row (Credit — we owe supplier)
                running += grandTotal;
                Map<String, Object> invRow = new LinkedHashMap<>();
                invRow.put("date",      inv.getInvoiceDate());
                invRow.put("type",      "INVOICE");
                invRow.put("reference", inv.getInvoiceNumber());
                invRow.put("narration", "Purchase Invoice" + (inv.getSupplierInvoiceNumber()!=null?" ("+inv.getSupplierInvoiceNumber()+")":""));
                invRow.put("debit",     0.0);
                invRow.put("credit",    grandTotal);
                invRow.put("balance",   running);
                invRow.put("status",    inv.getPaymentStatus());
                invRow.put("dueDate",   inv.getDueDate());
                rows.add(invRow);

                // Payment row (Debit — we paid)
                if (paid > 0) {
                    running -= paid;
                    Map<String, Object> payRow = new LinkedHashMap<>();
                    payRow.put("date",      inv.getInvoiceDate());
                    payRow.put("type",      "PAYMENT");
                    payRow.put("reference", "PMT-" + inv.getInvoiceNumber());
                    payRow.put("narration", "Payment made" + "");
                    payRow.put("debit",     paid);
                    payRow.put("credit",    0.0);
                    payRow.put("balance",   running);
                    rows.add(payRow);
                }
            }

            // Returns
            returnRepo.findBySupplierId(id).stream()
                .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                .forEach(ret -> {
                    rows.add(Map.of(
                        "date",      ret.getReturnDate() != null ? ret.getReturnDate() : "—",
                        "type",      "RETURN",
                        "reference", ret.getReturnNumber() != null ? ret.getReturnNumber() : "—",
                        "narration", "Purchase Return",
                        "debit",     ret.getGrandTotal(),
                        "credit",    0.0,
                        "balance",   0.0   // will re-sort
                    ));
                });

            rows.sort((a, b) -> {
                String da = String.valueOf(a.get("date")), db = String.valueOf(b.get("date"));
                if ("Opening".equals(da)) return -1;
                if ("Opening".equals(db)) return 1;
                return da.compareTo(db);
            });

            double totalDebit  = rows.stream().mapToDouble(r -> (Double) r.get("debit")).sum();
            double totalCredit = rows.stream().mapToDouble(r -> (Double) r.get("credit")).sum();

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("supplierId",    supp.getId());
            result.put("supplierName",  supp.getSupplierName());
            result.put("supplierCode",  supp.getSupplierCode());
            result.put("phone",         supp.getPhone());
            result.put("gstin",         supp.getGstin());
            result.put("creditDays",    supp.getCreditDays());
            result.put("currentBalance",supp.getCurrentBalance());
            result.put("balanceType",   supp.getBalanceType());
            result.put("totalDebit",    totalDebit);
            result.put("totalCredit",   totalCredit);
            result.put("closingBalance",running);
            result.put("rows",          rows);
            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────── PENDING PAYMENTS ───────────────
    @GetMapping("/pending-payments")
    public ResponseEntity<?> getPendingPayments() {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Supplier supp : supplierRepo.findByActiveTrue()) {
            List<PurchaseInvoice> pending = invoiceRepo.findBySupplierId(supp.getId()).stream()
                .filter(i -> !i.isCancelled()
                    && ("PENDING".equals(i.getPaymentStatus()) || "PARTIAL".equals(i.getPaymentStatus())))
                .collect(Collectors.toList());

            if (!pending.isEmpty()) {
                double pendingAmt = pending.stream().mapToDouble(PurchaseInvoice::getBalanceDue).sum();
                long overdue = pending.stream()
                    .filter(i -> i.getDueDate() != null && i.getDueDate().isBefore(today))
                    .count();
                double overdueAmt = pending.stream()
                    .filter(i -> i.getDueDate() != null && i.getDueDate().isBefore(today))
                    .mapToDouble(PurchaseInvoice::getBalanceDue).sum();

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("supplierId",      supp.getId());
                row.put("supplierName",    supp.getSupplierName());
                row.put("supplierCode",    supp.getSupplierCode());
                row.put("phone",           supp.getPhone());
                row.put("email",           supp.getEmail());
                row.put("pendingAmount",   pendingAmt);
                row.put("pendingInvoices", pending.size());
                row.put("overdueInvoices", overdue);
                row.put("overdueAmount",   overdueAmt);
                row.put("currentBalance",  supp.getCurrentBalance());
                row.put("invoices",        pending);
                result.add(row);
            }
        }

        result.sort((a, b) -> Double.compare(
            (Double) b.get("pendingAmount"), (Double) a.get("pendingAmount")));
        return ResponseEntity.ok(result);
    }

    // ─────────────── PURCHASE HISTORY ───────────────
    @GetMapping("/{id}/invoices")
    public ResponseEntity<?> getSupplierInvoices(@PathVariable String id) {
        List<PurchaseInvoice> invoices = invoiceRepo.findBySupplierId(id).stream()
            .sorted(Comparator.comparing(
                i -> i.getInvoiceDate() != null ? i.getInvoiceDate() : LocalDate.MIN,
                Comparator.reverseOrder()))
            .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of(
            "invoices",       invoices,
            "count",          invoices.size(),
            "totalPurchased", invoices.stream().mapToDouble(PurchaseInvoice::getGrandTotal).sum(),
            "totalPaid",      invoices.stream().mapToDouble(PurchaseInvoice::getPaidAmount).sum()
        ));
    }

    // ─────────────── SUMMARY ───────────────
    @GetMapping("/summary")
    public ResponseEntity<?> getSupplierSummary() {
        List<Supplier> all = supplierRepo.findByActiveTrue();
        double totalPayable = all.stream()
            .filter(s -> s.getCurrentBalance() > 0)
            .mapToDouble(Supplier::getCurrentBalance).sum();
        LocalDate today = LocalDate.now();
        long overdueCount = 0;
        for (Supplier s : all) {
            boolean hasOverdue = invoiceRepo.findBySupplierId(s.getId()).stream()
                .anyMatch(i -> !i.isCancelled()
                    && ("PENDING".equals(i.getPaymentStatus()) || "PARTIAL".equals(i.getPaymentStatus()))
                    && i.getDueDate() != null && i.getDueDate().isBefore(today));
            if (hasOverdue) overdueCount++;
        }
        return ResponseEntity.ok(Map.of(
            "totalSuppliers",   all.size(),
            "totalPayable",     totalPayable,
            "overdueSuppliers", overdueCount,
            "activeSuppliers",  all.stream().filter(Supplier::isActive).count()
        ));
    }
}
