package com.erp.controller;

import com.erp.model.accounting.AccountingVoucher;
import com.erp.model.PurchaseInvoice;
import com.erp.model.PurchaseOrder;
import com.erp.model.PurchaseReturn;
import com.erp.model.Supplier;
import com.erp.repository.AccountingVoucherRepository;
import com.erp.repository.InventoryItemRepository;
import com.erp.repository.PurchaseInvoiceRepository;
import com.erp.repository.PurchaseOrderRepository;
import com.erp.repository.PurchaseReturnRepository;
import com.erp.service.AuditLogService;
import com.erp.repository.StockMovementRepository;
import com.erp.model.InventoryItem;
import com.erp.model.StockMovement;
import com.erp.repository.SupplierRepository;
import com.erp.service.AutoPostingService;
import com.erp.service.LedgerPostingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/purchase")
@CrossOrigin(origins = "*")
public class PurchaseController {

    @Autowired private SupplierRepository supplierRepo;
    @Autowired private PurchaseInvoiceRepository invoiceRepo;
    @Autowired private PurchaseOrderRepository poRepo;
    @Autowired private PurchaseReturnRepository returnRepo;
    @Autowired private AuditLogService auditLogService;
    @Autowired private com.erp.repository.CompanySettingsRepository settingsRepo;
    @Autowired private AutoPostingService autoPosting;
    @Autowired private InventoryItemRepository itemRepo;
    @Autowired private StockMovementRepository stockMovRepo;
    @Autowired private AccountingVoucherRepository voucherRepo;
    @Autowired private LedgerPostingService ledgerPostingService;

    @GetMapping("/suppliers")
    public List<Supplier> getSuppliers() { return supplierRepo.findByActiveTrue(); }

    @PostMapping("/suppliers")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> addSupplier(@RequestBody Supplier s) {
        String name = s.getSupplierName() != null ? s.getSupplierName().trim()
                    : (s.getName() != null ? s.getName().trim() : "");

        // ── Required: Name ──
        if (name.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Supplier name required aahe!"));

        // ── Duplicate name check ──
        boolean nameExists = supplierRepo.findAll().stream().anyMatch(x -> {
            String xn = x.getSupplierName() != null ? x.getSupplierName().trim() : (x.getName() != null ? x.getName().trim() : "");
            return name.equalsIgnoreCase(xn) && x.isActive();
        });
        if (nameExists)
            return ResponseEntity.badRequest().body(Map.of("error",
                "Supplier '" + name + "' already exists! Duplicate nahi chalnar."));

        // ── Phone: required, 10 digits, starts 6-9 ──
        if (s.getPhone() == null || s.getPhone().trim().isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Phone number required aahe!"));
        String phone = s.getPhone().trim().replaceAll("[^0-9]", "");
        if (phone.length() != 10 || "6789".indexOf(phone.charAt(0)) < 0)
            return ResponseEntity.badRequest().body(Map.of("error",
                "Phone invalid! 10 digits, 6-9 se start honyapahijhe. Got: " + s.getPhone()));
        // Duplicate phone
        boolean phoneExists = supplierRepo.findAll().stream()
            .anyMatch(x -> x.isActive() && phone.equals(x.getPhone() != null ? x.getPhone().trim().replaceAll("[^0-9]", "") : ""));
        if (phoneExists)
            return ResponseEntity.badRequest().body(Map.of("error",
                "Phone " + phone + " already registered with another supplier!"));
        s.setPhone(phone);

        // ── Email: optional, valid + unique ──
        if (s.getEmail() != null && !s.getEmail().trim().isEmpty()) {
            String email = s.getEmail().trim().toLowerCase();
            if (!email.contains("@") || !email.contains(".") || email.indexOf("@") == 0 || email.lastIndexOf(".") < email.indexOf("@"))
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Email invalid! Got: " + s.getEmail()));
            boolean emailExists = supplierRepo.findAll().stream()
                .anyMatch(x -> x.isActive() && email.equalsIgnoreCase(x.getEmail() != null ? x.getEmail().trim() : ""));
            if (emailExists)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Email '" + email + "' already registered with another supplier!"));
            s.setEmail(email);
        }

        // ── GSTIN: optional, 15 chars, valid format, unique ──
        if (s.getGstin() != null && !s.getGstin().trim().isEmpty()) {
            String g = s.getGstin().trim().toUpperCase();
            if (g.length() != 15)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "GSTIN exactly 15 characters cha hava. Got " + g.length() + " chars."));
            if (!g.matches("^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"))
                return ResponseEntity.badRequest().body(Map.of("error",
                    "GSTIN format invalid! Expected: 22AAAAA0000A1Z5. Got: " + g));
            boolean gstinExists = supplierRepo.findAll().stream()
                .anyMatch(x -> x.isActive() && g.equals(x.getGstin() != null ? x.getGstin().trim().toUpperCase() : ""));
            if (gstinExists)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "GSTIN '" + g + "' already registered with another supplier!"));
            s.setGstin(g);
        }

        // ── PAN ──
        if (s.getPan() != null && !s.getPan().trim().isEmpty()) {
            String pan = s.getPan().trim().toUpperCase();
            if (!pan.matches("^[A-Z]{5}[0-9]{4}[A-Z]{1}$"))
                return ResponseEntity.badRequest().body(Map.of("error",
                    "PAN format invalid! Expected: ABCDE1234F. Got: " + pan));
            s.setPan(pan);
        }

        // ── Pincode ──
        if (s.getPincode() != null && !s.getPincode().trim().isEmpty())
            if (!s.getPincode().trim().matches("^[1-9][0-9]{5}$"))
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Pincode 6 digits cha hava! Got: " + s.getPincode()));

        s.setSupplierName(name); s.setName(name);
        if (s.getSupplierCode() == null || s.getSupplierCode().trim().isEmpty())
            s.setSupplierCode("SUP-" + String.format("%04d", supplierRepo.count() + 1));
        s.setActive(true);
        s.setCurrentBalance(s.getOpeningBalance() != 0 ? s.getOpeningBalance() : 0);
        Supplier saved = supplierRepo.save(s);
        auditLogService.logCreate("Purchase", "Supplier created: " + saved.getSupplierName() + " | Phone: " + saved.getPhone());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/suppliers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> updateSupplier(@PathVariable String id, @RequestBody Supplier s) {
        String name = s.getSupplierName() != null ? s.getSupplierName().trim()
                    : (s.getName() != null ? s.getName().trim() : "");
        if (name.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Supplier name required aahe!"));

        // ── Duplicate name check (exclude self) ──
        String normNew = name.toLowerCase().replaceAll("\\s+", " ");
        boolean nameEx = supplierRepo.findAll().stream()
            .filter(x -> !x.getId().equals(id) && x.isActive())
            .anyMatch(x -> {
                String xn = x.getSupplierName() != null ? x.getSupplierName().trim() : (x.getName() != null ? x.getName().trim() : "");
                return normNew.equalsIgnoreCase(xn.replaceAll("\\s+", " "));
            });
        if (nameEx)
            return ResponseEntity.badRequest().body(Map.of("error",
                "Supplier '" + name + "' already exists! Duplicate nahi chalnar."));

        // ── Phone ──
        if (s.getPhone() != null && !s.getPhone().trim().isEmpty()) {
            String ph = s.getPhone().trim().replaceAll("[^0-9]", "");
            if (!ph.matches("^[6-9]\\d{9}$"))
                return ResponseEntity.badRequest().body(Map.of("error", "Phone invalid!"));
            boolean phoneEx = supplierRepo.findAll().stream()
                .filter(x -> !x.getId().equals(id) && x.isActive())
                .anyMatch(x -> ph.equals(x.getPhone() != null ? x.getPhone().trim().replaceAll("[^0-9]", "") : ""));
            if (phoneEx)
                return ResponseEntity.badRequest().body(Map.of("error", "Phone already registered!"));
            s.setPhone(ph);
        }

        // ── GSTIN ──
        if (s.getGstin() != null && !s.getGstin().trim().isEmpty()) {
            String g = s.getGstin().trim().toUpperCase();
            if (g.length() != 15)
                return ResponseEntity.badRequest().body(Map.of("error", "GSTIN 15 chars cha hava!"));
            if (!g.matches("^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"))
                return ResponseEntity.badRequest().body(Map.of("error", "GSTIN format invalid!"));
            boolean gEx = supplierRepo.findAll().stream()
                .filter(x -> !x.getId().equals(id) && x.isActive())
                .anyMatch(x -> g.equals(x.getGstin() != null ? x.getGstin().trim().toUpperCase() : ""));
            if (gEx)
                return ResponseEntity.badRequest().body(Map.of("error", "GSTIN already registered!"));
            s.setGstin(g);
        }

        return supplierRepo.findById(id).map(ex -> {
            s.setId(id);
            s.setSupplierName(name); s.setName(name);
            s.setActive(ex.isActive());
            s.setSupplierCode(ex.getSupplierCode());
            double diff = s.getOpeningBalance() - ex.getOpeningBalance();
            s.setCurrentBalance(ex.getCurrentBalance() + diff);
            Supplier upd = supplierRepo.save(s);
            auditLogService.logUpdate("Purchase", "Supplier updated: " + upd.getSupplierName());
            return ResponseEntity.ok(upd);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/suppliers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteSupplier(@PathVariable String id) {
        return supplierRepo.findById(id).map(s -> {
            long activeInvoices = invoiceRepo.findByActiveTrue().stream()
                .filter(i -> id.equals(i.getSupplierId())).count();
            if (activeInvoices > 0)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Cannot delete supplier with " + activeInvoices + " active invoices."));
            s.setActive(false);
            supplierRepo.save(s);
            auditLogService.logDelete("Purchase", "Supplier deactivated: " + s.getSupplierName());
            return ResponseEntity.ok(Map.of("message", "Supplier deactivated successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/invoices")
    public List<PurchaseInvoice> getInvoices(
            @RequestParam(required=false) String financialYear,
            @RequestParam(required=false) String supplierId,
            @RequestParam(required=false) String fromDate,
            @RequestParam(required=false) String toDate,
            @RequestParam(required=false, defaultValue="true") boolean activeOnly) {
        List<PurchaseInvoice> all;
        if (fromDate != null && toDate != null)
            all = activeOnly
                ? invoiceRepo.findByActiveTrueAndInvoiceDateBetween(LocalDate.parse(fromDate), LocalDate.parse(toDate))
                : invoiceRepo.findByInvoiceDateBetween(LocalDate.parse(fromDate), LocalDate.parse(toDate));
        else if (supplierId != null) all = invoiceRepo.findBySupplierId(supplierId).stream()
            .filter(i -> !activeOnly || i.isActive()).collect(Collectors.toList());
        else if (financialYear != null) all = invoiceRepo.findByFinancialYear(financialYear).stream()
            .filter(i -> !activeOnly || i.isActive()).collect(Collectors.toList());
        else all = activeOnly ? invoiceRepo.findByActiveTrue() : invoiceRepo.findAll();
        return all;
    }

    @PostMapping("/invoices")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> createInvoice(@RequestBody PurchaseInvoice invoice) {
        // Validate items — qty > 0, rate >= 0
        if (invoice.getItems() != null) {
            for (PurchaseInvoice.InvoiceItem item : invoice.getItems()) {
                if (item.getItemName() == null || item.getItemName().trim().isEmpty()) continue;
                if (item.getQuantity() <= 0)
                    return ResponseEntity.badRequest().body(Map.of("error",
                        "Item '" + item.getItemName() + "': Quantity 0 ya negative nahi chalnar!"));
                if (item.getRate() < 0)
                    return ResponseEntity.badRequest().body(Map.of("error",
                        "Item '" + item.getItemName() + "': Rate negative nahi hona chahiye!"));
            }
        }
        // Validate items
        if (invoice.getItems() != null) {
            for (PurchaseInvoice.InvoiceItem item : invoice.getItems()) {
                if (item.getQuantity() <= 0)
                    return ResponseEntity.badRequest().body(Map.of("error", "Item '"+item.getItemName()+"': quantity must be > 0"));
                if (item.getRate() < 0)
                    return ResponseEntity.badRequest().body(Map.of("error", "Item '"+item.getItemName()+"': rate cannot be negative"));
            }
        }
        if (invoice.getPoReference() != null && !invoice.getPoReference().isEmpty()) {
            if (invoiceRepo.existsByPoReferenceAndCancelledFalse(invoice.getPoReference())) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "PO " + invoice.getPoReference() + " साठी आधीच Invoice तयार झाला आहे! Duplicate Invoice होणार नाही."
                ));
            }
        }
        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().isEmpty())
            invoice.setInvoiceNumber("PINV-" + String.format("%04d", invoiceRepo.count() + 1));
        if (invoice.getPaymentStatus() == null) invoice.setPaymentStatus("PENDING");
        boolean isDraft = "DRAFT".equals(invoice.getStatus());
        if (invoice.getStatus() == null) invoice.setStatus("CONFIRMED");
        invoice.setActive(true);
        invoice.setCancelled(false);
        recalculateTotals(invoice);

        if (invoice.getSupplierId() != null) {
            double supplierBalance = supplierRepo.findById(invoice.getSupplierId())
                .map(s -> s.getCurrentBalance()).orElse(0.0);
            double availableCredit = supplierBalance < 0 ? Math.abs(supplierBalance) : 0.0;
            if (availableCredit > 0) {
                double applyCredit = Math.min(availableCredit, invoice.getGrandTotal());
                invoice.setCreditApplied(applyCredit);
                invoice.setBalanceDue(Math.max(0, invoice.getGrandTotal() - invoice.getPaidAmount() - applyCredit));
                if (invoice.getBalanceDue() <= 0.01) invoice.setPaymentStatus("PAID");
                else invoice.setPaymentStatus("PARTIAL");
            }
        }

        invoice.setBalanceDue(Math.max(0, invoice.getGrandTotal() - invoice.getPaidAmount() - invoice.getCreditApplied()));

        if (invoice.getSupplierId() != null) {
            supplierRepo.findById(invoice.getSupplierId()).ifPresent(sup -> {
                if (invoice.getSupplierGstin() == null || invoice.getSupplierGstin().isEmpty())
                    invoice.setSupplierGstin(sup.getGstin());
                if (invoice.getSupplierAddress() == null || invoice.getSupplierAddress().isEmpty())
                    invoice.setSupplierAddress(sup.getAddress());
                if (invoice.getSupplierCity() == null || invoice.getSupplierCity().isEmpty())
                    invoice.setSupplierCity(sup.getCity());
                if (invoice.getSupplierState() == null || invoice.getSupplierState().isEmpty())
                    invoice.setSupplierState(sup.getState());
                if (invoice.getSupplierPhone() == null || invoice.getSupplierPhone().isEmpty())
                    invoice.setSupplierPhone(sup.getPhone());
                if (invoice.getSupplierEmail() == null || invoice.getSupplierEmail().isEmpty())
                    invoice.setSupplierEmail(sup.getEmail());
            });
        }

        PurchaseInvoice saved = invoiceRepo.save(invoice);

        if (!isDraft) {
            autoPosting.postPurchaseInvoice(saved);
            if (saved.getItems() != null) {
                for (PurchaseInvoice.InvoiceItem item : saved.getItems()) {
                    if (item.getItemId() == null || item.getItemId().isEmpty()) continue;
                    itemRepo.findById(item.getItemId()).ifPresent(invItem -> {
                        invItem.setCurrentStock(invItem.getCurrentStock() + item.getQuantity());
                        itemRepo.save(invItem);
                        com.erp.model.StockMovement sm = new com.erp.model.StockMovement();
                        sm.setItemId(invItem.getId());
                        sm.setItemName(invItem.getItemName());
                        sm.setMovementType("STOCK_IN");
                        sm.setReferenceType("PURCHASE_INVOICE");
                        sm.setReferenceNumber(saved.getInvoiceNumber());
                        sm.setQuantity(item.getQuantity());
                        sm.setUnit(invItem.getUnit());
                        sm.setBalanceQty(invItem.getCurrentStock());
                        sm.setMovementDate(saved.getInvoiceDate() != null ? saved.getInvoiceDate() : java.time.LocalDate.now());
                        sm.setCreatedAt(java.time.LocalDateTime.now());
                        stockMovRepo.save(sm);
                    });
                }
            }
            if (invoice.getSupplierId() != null) recalcSupplierBalance(invoice.getSupplierId());
        }

        if (saved.getPoReference() != null && !saved.getPoReference().isEmpty()) {
            poRepo.findAll().stream()
                .filter(po -> saved.getPoReference().equals(po.getPoNumber()))
                .findFirst()
                .ifPresent(po -> {
                    po.setStatus("INVOICED");
                    poRepo.save(po);
                });
        }

        auditLogService.logCreate("Purchase", "Invoice created: " + saved.getInvoiceNumber() + " | " + saved.getSupplierName() + " | ₹" + saved.getGrandTotal());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<PurchaseInvoice> getInvoice(@PathVariable String id) {
        return invoiceRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/invoices/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> updateInvoice(@PathVariable String id, @RequestBody PurchaseInvoice invoice) {
        return invoiceRepo.findById(id).map(existing -> {
            if (existing.isCancelled())
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot update a cancelled invoice"));
            if ("PAID".equals(existing.getPaymentStatus()))
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot update a fully paid invoice"));
            invoice.setId(id);
            invoice.setActive(true);
            invoice.setInvoiceNumber(existing.getInvoiceNumber());
            recalculateTotals(invoice);
            invoice.setBalanceDue(invoice.getGrandTotal() - invoice.getPaidAmount());
            return ResponseEntity.ok(invoiceRepo.save(invoice));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/invoices/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> cancelInvoice(@PathVariable String id,
            @RequestParam(required=false) String reason) {
        return invoiceRepo.findById(id).map(inv -> {
            if (inv.isCancelled())
                return ResponseEntity.badRequest().body(Map.of("error", "Invoice already cancelled"));
            if ("PAID".equals(inv.getPaymentStatus()))
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Cannot cancel a fully paid invoice. Process a Purchase Return instead."));

            inv.setCancelled(true);
            inv.setActive(false);
            inv.setStatus("CANCELLED");
            inv.setCancelledReason(reason != null ? reason : "Cancelled by admin");
            inv.setCancelledBy("ADMIN");
            invoiceRepo.save(inv);

            if (inv.getItems() != null) {
                for (PurchaseInvoice.InvoiceItem item : inv.getItems()) {
                    if (item.getItemId() == null || item.getItemId().isEmpty()) continue;
                    itemRepo.findById(item.getItemId()).ifPresent(invItem -> {
                        double newStock = Math.max(0, invItem.getCurrentStock() - item.getQuantity());
                        invItem.setCurrentStock(newStock);
                        itemRepo.save(invItem);
                        StockMovement sm = new StockMovement();
                        sm.setItemId(invItem.getId()); sm.setItemName(invItem.getItemName());
                        sm.setMovementType("STOCK_OUT"); sm.setReferenceType("PURCHASE_CANCEL");
                        sm.setReferenceNumber(inv.getInvoiceNumber());
                        sm.setQuantity(item.getQuantity()); sm.setUnit(invItem.getUnit());
                        sm.setBalanceQty(invItem.getCurrentStock());
                        sm.setMovementDate(java.time.LocalDate.now());
                        sm.setCreatedAt(java.time.LocalDateTime.now());
                        stockMovRepo.save(sm);
                    });
                }
            }

            String invNo = inv.getInvoiceNumber();
            if (invNo != null && !"DRAFT".equals(inv.getStatus())
                    && voucherRepo.existsByVoucherNumber("AUTO-PUR-" + invNo)) {
                try {
                    AccountingVoucher reversal = new AccountingVoucher();
                    reversal.setVoucherNumber("REV-PUR-" + invNo);
                    reversal.setVoucherType("JOURNAL");
                    reversal.setVoucherDate(LocalDate.now());
                    reversal.setFinancialYear(inv.getFinancialYear() != null ? inv.getFinancialYear() : "2024-25");
                    reversal.setNarration("REVERSAL: Cancelled Purchase Invoice " + invNo);
                    reversal.setReferenceNumber(invNo);
                    reversal.setStatus("POSTED");

                    List<AccountingVoucher.VoucherEntry> entries = new ArrayList<>();
                    AccountingVoucher.VoucherEntry cr1 = new AccountingVoucher.VoucherEntry();
                    cr1.setLedgerName("Purchase Account"); cr1.setEntryType("CREDIT"); cr1.setAmount(inv.getSubTotal());
                    entries.add(cr1);
                    if (inv.getTotalGst() > 0) {
                        AccountingVoucher.VoucherEntry cr2 = new AccountingVoucher.VoucherEntry();
                        cr2.setLedgerName("GST Input Tax Credit"); cr2.setEntryType("CREDIT"); cr2.setAmount(inv.getTotalGst());
                        entries.add(cr2);
                    }
                    AccountingVoucher.VoucherEntry dr = new AccountingVoucher.VoucherEntry();
                    dr.setLedgerName(inv.getSupplierName() != null ? inv.getSupplierName() : "Accounts Payable");
                    dr.setEntryType("DEBIT"); dr.setAmount(inv.getGrandTotal());
                    entries.add(dr);

                    reversal.setEntries(entries);
                    reversal.setTotalDebit(inv.getGrandTotal());
                    reversal.setTotalCredit(inv.getSubTotal() + inv.getTotalGst());
                    voucherRepo.save(reversal);
                    ledgerPostingService.postVoucherToLedger(reversal);
                } catch (Exception ignored) {
                }
            }

            auditLogService.logDelete("Purchase", "Invoice cancelled: " + inv.getInvoiceNumber() + " | Reason: " + (reason != null ? reason : "N/A"));
            return ResponseEntity.ok(Map.of(
                "message", "Purchase invoice cancelled. Reversal entry created.",
                "invoiceNumber", inv.getInvoiceNumber()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/invoices/{id}/payment")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public ResponseEntity<?> recordPayment(@PathVariable String id,
            @RequestParam double amount,
            @RequestParam(required=false) String paymentMode,
            @RequestParam(required=false) String referenceNo,
            @RequestParam(required=false) String notes) {
        return invoiceRepo.findById(id).map(inv -> {
            if (inv.isCancelled())
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot record payment on cancelled invoice"));
            double approvedReturnAmt = returnRepo.findAll().stream()
                .filter(r -> inv.getId().equals(r.getOriginalInvoiceId()))
                .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                .mapToDouble(r -> r.getGrandTotal()).sum();
            double keptGoods = Math.max(0, inv.getGrandTotal() - approvedReturnAmt);
            double newPaid   = inv.getPaidAmount() + amount;
            if (newPaid > keptGoods + 0.01)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Payment ₹" + amount + " exceeds remaining balance of ₹" + inv.getBalanceDue()));
            double newDue = keptGoods - newPaid;
            inv.setPaidAmount(newPaid);
            inv.setBalanceDue(newDue);
            if (newDue <= 0.01) inv.setPaymentStatus("PAID");
            else inv.setPaymentStatus("PARTIAL");
            // Add to payment history
            if (inv.getPaymentHistory() == null) inv.setPaymentHistory(new java.util.ArrayList<>());
            PurchaseInvoice.PaymentEntry pe = new PurchaseInvoice.PaymentEntry();
            pe.setPaymentDate(java.time.LocalDate.now());
            pe.setAmount(amount);
            pe.setPaymentMode(paymentMode != null ? paymentMode : "Cash");
            pe.setReferenceNo(referenceNo != null ? referenceNo : "");
            pe.setNotes(notes != null ? notes : "");
            pe.setRecordedAt(java.time.LocalDateTime.now());
            inv.getPaymentHistory().add(pe);

            PurchaseInvoice updated = invoiceRepo.save(inv);
            if (inv.getSupplierId() != null) {
                recalcSupplierBalance(inv.getSupplierId());
            }
            autoPosting.postPurchasePayment(
                inv.getSupplierName(), amount, paymentMode,
                inv.getInvoiceNumber(), inv.getFinancialYear()
            );
            auditLogService.logPayment("Purchase", "Payment ₹" + amount + " for invoice " + inv.getInvoiceNumber() + " to " + inv.getSupplierName());
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/report/summary")
    public ResponseEntity<?> getPurchaseSummary(@RequestParam String fromDate, @RequestParam String toDate) {
        List<PurchaseInvoice> invoices = invoiceRepo.findByActiveTrueAndInvoiceDateBetween(
            LocalDate.parse(fromDate), LocalDate.parse(toDate));
        double total = invoices.stream().mapToDouble(PurchaseInvoice::getGrandTotal).sum();
        double gst   = invoices.stream().mapToDouble(PurchaseInvoice::getTotalGst).sum();
        double paid  = invoices.stream().mapToDouble(PurchaseInvoice::getPaidAmount).sum();
        return ResponseEntity.ok(Map.of(
            "invoices", invoices, "totalPurchase", total,
            "totalGst", gst, "totalPaid", paid,
            "totalOutstanding", total - paid, "count", invoices.size()));
    }

    @GetMapping("/report/register")
    public ResponseEntity<?> getPurchaseRegister(
            @RequestParam(required=false) String fromDate,
            @RequestParam(required=false) String toDate,
            @RequestParam(required=false) String supplierId) {
        List<PurchaseInvoice> invoices = invoiceRepo.findByActiveTrue();
        if (fromDate != null && toDate != null) {
            final LocalDate from = LocalDate.parse(fromDate);
            final LocalDate to   = LocalDate.parse(toDate);
            invoices = invoices.stream().filter(i -> {
                if (i.getInvoiceDate() == null) return false;
                return !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to);
            }).collect(Collectors.toList());
        }
        if (supplierId != null)
            invoices = invoices.stream().filter(i -> supplierId.equals(i.getSupplierId())).collect(Collectors.toList());

        // Returns calculate karo per invoice + overall
        java.util.Map<String,Double> invReturnMap = new java.util.HashMap<>();
        returnRepo.findAll().stream()
            .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
            .filter(r -> r.getOriginalInvoiceId() != null)
            .forEach(r -> invReturnMap.merge(r.getOriginalInvoiceId(), r.getGrandTotal(), Double::sum));

        double totalTaxable   = invoices.stream().mapToDouble(PurchaseInvoice::getSubTotal).sum();
        double totalCgst      = invoices.stream().mapToDouble(PurchaseInvoice::getTotalCgst).sum();
        double totalSgst      = invoices.stream().mapToDouble(PurchaseInvoice::getTotalSgst).sum();
        double totalIgst      = invoices.stream().mapToDouble(PurchaseInvoice::getTotalIgst).sum();
        double totalAmt       = invoices.stream().mapToDouble(PurchaseInvoice::getGrandTotal).sum();
        double totalReturned  = invReturnMap.values().stream().mapToDouble(Double::doubleValue).sum();
        double netPurchase    = totalAmt - totalReturned;

        Map<String, Double> supplierWise = new LinkedHashMap<>();
        for (PurchaseInvoice inv : invoices) {
            double retAmt = invReturnMap.getOrDefault(inv.getId(), 0.0);
            supplierWise.merge(inv.getSupplierName(), inv.getGrandTotal() - retAmt, Double::sum);
        }

        // Each invoice madhe returnedAmount add karo
        List<Map<String,Object>> invoiceList = invoices.stream().map(inv -> {
            Map<String,Object> m = new java.util.LinkedHashMap<>();
            m.put("id",             inv.getId());
            m.put("invoiceNumber",  inv.getInvoiceNumber());
            m.put("invoiceDate",    inv.getInvoiceDate());
            m.put("supplierName",   inv.getSupplierName());
            m.put("supplierGstin",  inv.getSupplierGstin());
            m.put("subTotal",       inv.getSubTotal());
            m.put("totalGst",       inv.getTotalGst());
            m.put("grandTotal",     inv.getGrandTotal());
            m.put("paidAmount",     inv.getPaidAmount());
            m.put("paymentStatus",  inv.getPaymentStatus());
            m.put("returnedAmount", invReturnMap.getOrDefault(inv.getId(), 0.0));
            m.put("netAmount",      inv.getGrandTotal() - invReturnMap.getOrDefault(inv.getId(), 0.0));
            return m;
        }).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "invoices", invoiceList, "supplierWise", supplierWise,
            "summary", Map.of("totalTaxableValue", totalTaxable, "totalCgst", totalCgst,
                "totalSgst", totalSgst, "totalIgst", totalIgst,
                "totalAmount", totalAmt, "totalReturned", totalReturned,
                "netPurchase", netPurchase, "invoiceCount", invoices.size())));
    }

    private void recalcSupplierBalance(String supplierId) {
        supplierRepo.findById(supplierId).ifPresent(sup -> {
            var allInvoices = invoiceRepo.findBySupplierId(supplierId).stream()
                .filter(i -> !i.isCancelled()).collect(java.util.stream.Collectors.toList());
            var retMap = new java.util.HashMap<String, Double>();
            returnRepo.findBySupplierId(supplierId).stream()
                .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                .forEach(r -> { if (r.getOriginalInvoiceId() != null && !r.getOriginalInvoiceId().isEmpty())
                    retMap.merge(r.getOriginalInvoiceId(), r.getGrandTotal(), Double::sum); });

            double weOwe = 0, supOwes = 0;
            for (var inv : allInvoices) {
                double returnAmt = Math.min(retMap.getOrDefault(inv.getId(), 0.0), inv.getGrandTotal());
                double keptGoods = inv.getGrandTotal() - returnAmt;
                double paid      = inv.getPaidAmount();
                weOwe   += Math.max(0, keptGoods - paid);
                supOwes += Math.max(0, paid - keptGoods);
            }
            double balance = sup.getOpeningBalance() + weOwe - supOwes;
            sup.setCurrentBalance(balance);
            sup.setBalanceType(balance >= 0 ? "CREDIT" : "DEBIT");
            supplierRepo.save(sup);
        });
    }

    private void autoDetectInterStatePurchase(PurchaseInvoice invoice) {
        try {
            String companyState = settingsRepo.findAll().stream().findFirst()
                .map(cs -> cs.getState() != null ? cs.getState().toUpperCase().trim() : "").orElse("");
            String suppState = invoice.getSupplierState() != null ? invoice.getSupplierState().toUpperCase().trim() : "";
            if (!companyState.isEmpty() && !suppState.isEmpty()) {
                invoice.setInterState(!companyState.equals(suppState));
            }
        } catch (Exception ignored) {}
    }

    private void recalculateTotals(PurchaseInvoice invoice) {
        if (invoice.getItems() == null || invoice.getItems().isEmpty()) return;
        autoDetectInterStatePurchase(invoice);
        double sub = 0, cgst = 0, sgst = 0, igst = 0;
        for (PurchaseInvoice.InvoiceItem item : invoice.getItems()) {
            double base = item.getQuantity() * item.getRate() * (1 - (item.getDiscount() > 0 ? item.getDiscount() / 100.0 : 0));
            double gstAmt = base * item.getGstRate() / 100.0;
            item.setAmount(base);
            item.setTaxableAmount(base);
            sub += base;
            if (invoice.isInterState()) {
                item.setIgstAmount(gstAmt); item.setIgstRate(item.getGstRate());
                item.setCgstAmount(0); item.setSgstAmount(0);
                igst += gstAmt;
            } else {
                item.setCgstAmount(gstAmt / 2); item.setSgstAmount(gstAmt / 2);
                item.setCgstRate(item.getGstRate() / 2); item.setSgstRate(item.getGstRate() / 2);
                item.setIgstAmount(0); item.setIgstRate(0);
                cgst += gstAmt / 2; sgst += gstAmt / 2;
            }
            item.setTotalAmount(base + gstAmt);
        }
        // Invoice-level discount — proportional to all items
        double invDiscPct   = invoice.getDiscount() > 0 ? invoice.getDiscount() / 100.0 : 0;
        double invDiscount  = sub * invDiscPct;
        double subAfterDisc = sub - invDiscount;
        double discFactor   = 1 - invDiscPct;
        cgst *= discFactor; sgst *= discFactor; igst *= discFactor;

        // Update item taxableAmounts proportionally
        if (invDiscPct > 0 && invoice.getItems() != null) {
            for (PurchaseInvoice.InvoiceItem item : invoice.getItems()) {
                item.setTaxableAmount(item.getTaxableAmount() * discFactor);
                item.setCgstAmount(item.getCgstAmount() * discFactor);
                item.setSgstAmount(item.getSgstAmount() * discFactor);
                item.setIgstAmount(item.getIgstAmount() * discFactor);
                item.setTotalAmount(item.getTaxableAmount() + item.getCgstAmount() + item.getSgstAmount() + item.getIgstAmount());
            }
        }

        // Additional charges — no GST on these
        double addCharges = (invoice.getFreightCharge() > 0 ? invoice.getFreightCharge() : 0)
                          + (invoice.getPackagingCharge() > 0 ? invoice.getPackagingCharge() : 0)
                          + (invoice.getOtherCharge() > 0 ? invoice.getOtherCharge() : 0);
        double roundOff   = invoice.getRoundOff() != 0 ? invoice.getRoundOff() : 0;
        invoice.setSubTotal(subAfterDisc);
        invoice.setTotalCgst(cgst); invoice.setTotalSgst(sgst); invoice.setTotalIgst(igst);
        invoice.setTotalGst(cgst + sgst + igst);
        invoice.setGrandTotal(subAfterDisc + cgst + sgst + igst + addCharges + roundOff);
    }
    // ── Debit Note (formal GST doc from Purchase Return) ─────────────────
    @GetMapping("/returns/{id}/debit-note")
    public ResponseEntity<?> getDebitNote(@PathVariable String id) {
        return returnRepo.findById(id).map(ret -> {
            if (!"APPROVED".equals(ret.getStatus()) && !"COMPLETED".equals(ret.getStatus()))
                return ResponseEntity.badRequest().body(Map.of("error", "Debit note only for approved returns"));
            Map<String,Object> dn = new LinkedHashMap<>();
            dn.put("debitNoteNumber",   "DN-" + ret.getReturnNumber());
            dn.put("debitNoteDate",     java.time.LocalDate.now());
            dn.put("originalInvoice",   ret.getOriginalInvoiceNumber());
            dn.put("supplierId",        ret.getSupplierId());
            dn.put("supplierName",      ret.getSupplierName());
            dn.put("items",             ret.getItems());
            dn.put("subTotal",          ret.getSubTotal());
            dn.put("totalGst",          ret.getTotalGst());
            dn.put("grandTotal",        ret.getGrandTotal());
            dn.put("reason",            ret.getReason());
            dn.put("status",            "ISSUED");
            return ResponseEntity.ok(dn);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Supplier Statement ────────────────────────────────────────────────
    @GetMapping("/suppliers/{id}/statement")
    public ResponseEntity<?> getSupplierStatement(
            @PathVariable String id,
            @RequestParam(required=false) String fromDate,
            @RequestParam(required=false) String toDate) {
        return supplierRepo.findById(id).map(sup -> {
            List<java.util.Map<String,Object>> transactions = new java.util.ArrayList<>();
            double runningBalance = sup.getOpeningBalance();

            // Opening balance entry
            Map<String,Object> openEntry = new java.util.LinkedHashMap<>();
            openEntry.put("date",         null);
            openEntry.put("type",         "OPENING_BALANCE");
            openEntry.put("reference",    "Opening Balance");
            openEntry.put("debit",        0.0);
            openEntry.put("credit",       sup.getOpeningBalance());
            openEntry.put("balance",      runningBalance);
            transactions.add(openEntry);

            // All invoices
            java.time.LocalDate from = fromDate != null ? java.time.LocalDate.parse(fromDate) : null;
            java.time.LocalDate to   = toDate   != null ? java.time.LocalDate.parse(toDate)   : null;

            invoiceRepo.findBySupplierId(id).stream()
                .filter(i -> !i.isCancelled())
                .filter(i -> i.getInvoiceDate() != null)
                .filter(i -> from == null || !i.getInvoiceDate().isBefore(from))
                .filter(i -> to   == null || !i.getInvoiceDate().isAfter(to))
                .sorted(java.util.Comparator.comparing(inv -> inv.getInvoiceDate()))
                .forEach(inv -> {
                    Map<String,Object> row = new java.util.LinkedHashMap<>();
                    row.put("date",      inv.getInvoiceDate());
                    row.put("type",      "PURCHASE_INVOICE");
                    row.put("reference", inv.getInvoiceNumber());
                    row.put("debit",     0.0);
                    row.put("credit",    inv.getGrandTotal());
                    row.put("paid",      inv.getPaidAmount());
                    row.put("status",    inv.getPaymentStatus());
                    transactions.add(row);
                });

            List<PurchaseInvoice> invoiceList = invoiceRepo.findBySupplierId(id).stream()
                    .filter(i -> !i.isCancelled())
                    .collect(java.util.stream.Collectors.toList());

            double totalPurchase = invoiceList.stream()
                    .mapToDouble(PurchaseInvoice::getGrandTotal)
                    .sum();

            double totalPaid = invoiceList.stream()
                    .mapToDouble(PurchaseInvoice::getPaidAmount)
                    .sum();

            return ResponseEntity.ok(Map.of(
                "supplier",      sup,
                "transactions",  transactions,
                "totalPurchase", totalPurchase,
                "totalPaid",     totalPaid,
                "balance",       sup.getCurrentBalance(),
                "balanceType",   sup.getBalanceType()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }


}
