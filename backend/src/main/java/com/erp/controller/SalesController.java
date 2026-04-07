package com.erp.controller;

import com.erp.model.AccountingVoucher;
import com.erp.model.Customer;
import com.erp.model.SalesInvoice;
import com.erp.model.SalesOrder;
import com.erp.model.SalesReturn;
import com.erp.model.InvoiceLineItem;
import com.erp.repository.SalesReturnRepository;
import com.erp.service.AuditLogService;
import com.erp.repository.AccountingVoucherRepository;
import com.erp.repository.CustomerRepository;
import com.erp.repository.SalesInvoiceRepository;
import com.erp.repository.SalesOrderRepository;
import com.erp.repository.InventoryItemRepository;
import com.erp.repository.StockMovementRepository;
import com.erp.model.StockMovement;
import com.erp.service.AutoPostingService;
import com.erp.service.LedgerPostingService;
import com.erp.service.InvoiceCalculationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sales")
@CrossOrigin(origins = "*")
public class SalesController {

    @Autowired private CustomerRepository customerRepo;
    @Autowired private SalesInvoiceRepository invoiceRepo;
    @Autowired private SalesReturnRepository returnRepo;
    @Autowired private SalesOrderRepository soRepo;
    @Autowired private AutoPostingService autoPosting;
    @Autowired private AuditLogService auditLogService;
    @Autowired(required=false) private com.erp.service.EmailService emailService;
    @Autowired private com.erp.repository.CompanySettingsRepository settingsRepo;
    @Autowired private InventoryItemRepository itemRepo;
    @Autowired private StockMovementRepository stockMovRepo;
    @Autowired private AccountingVoucherRepository voucherRepo;
    @Autowired private LedgerPostingService ledgerPostingService;
    @Autowired private InvoiceCalculationService calcService;

    @GetMapping("/customers")
    public List<Customer> getCustomers() { return customerRepo.findByActiveTrue(); }

    @PostMapping("/customers")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> addCustomer(@RequestBody Customer c) {
        String name = c.getCustomerName() != null ? c.getCustomerName().trim()
                    : (c.getName() != null ? c.getName().trim() : "");

        // ── Required: Name ──
        if (name.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Customer name required aahe!"));

        // ── Duplicate name check ──
        boolean nameExists = customerRepo.findAll().stream().anyMatch(x -> {
            String xn = x.getCustomerName() != null ? x.getCustomerName().trim() : (x.getName() != null ? x.getName().trim() : "");
            return name.equalsIgnoreCase(xn) && x.isActive();
        });
        if (nameExists)
            return ResponseEntity.badRequest().body(Map.of("error",
                "Customer '" + name + "' already exists! Duplicate nahi chalnar."));

        // ── Phone: required, 10 digits, starts 6-9 ──
        if (c.getPhone() == null || c.getPhone().trim().isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Phone number required aahe!"));
        String phone = c.getPhone().trim().replaceAll("[^0-9]", "");
        if (phone.length() != 10 || "6789".indexOf(phone.charAt(0)) < 0)
            return ResponseEntity.badRequest().body(Map.of("error",
                "Phone number invalid! 10 digits, 6-9 se start honyapahijhe. Got: " + c.getPhone()));
        // Duplicate phone check
        boolean phoneExists = customerRepo.findAll().stream()
            .anyMatch(x -> x.isActive() && phone.equals(x.getPhone() != null ? x.getPhone().trim().replaceAll("[^0-9]", "") : ""));
        if (phoneExists)
            return ResponseEntity.badRequest().body(Map.of("error",
                "Phone " + phone + " already registered with another customer!"));
        c.setPhone(phone);

        // ── Email: optional, but if given must be valid + unique ──
        if (c.getEmail() != null && !c.getEmail().trim().isEmpty()) {
            String email = c.getEmail().trim().toLowerCase();
            if (!email.contains("@") || !email.contains(".") || email.indexOf("@") == 0 || email.lastIndexOf(".") < email.indexOf("@"))
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Email address invalid! Got: " + c.getEmail()));
            boolean emailExists = customerRepo.findAll().stream()
                .anyMatch(x -> x.isActive() && email.equalsIgnoreCase(x.getEmail() != null ? x.getEmail().trim() : ""));
            if (emailExists)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Email '" + email + "' already registered with another customer!"));
            c.setEmail(email);
        }

        // ── GSTIN: optional, but if given must be valid 15-char + unique ──
        if (c.getGstin() != null && !c.getGstin().trim().isEmpty()) {
            String g = c.getGstin().trim().toUpperCase();
            if (g.length() != 15)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "GSTIN exactly 15 characters cha hava. Got " + g.length() + " chars."));
            if (!g.matches("^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"))
                return ResponseEntity.badRequest().body(Map.of("error",
                    "GSTIN format invalid! Expected: 22AAAAA0000A1Z5. Got: " + g));
            boolean gstinExists = customerRepo.findAll().stream()
                .anyMatch(x -> x.isActive() && g.equals(x.getGstin() != null ? x.getGstin().trim().toUpperCase() : ""));
            if (gstinExists)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "GSTIN '" + g + "' already registered with another customer!"));
            c.setGstin(g);
        }

        // ── PAN: optional, valid format ──
        if (c.getPan() != null && !c.getPan().trim().isEmpty()) {
            String pan = c.getPan().trim().toUpperCase();
            if (!pan.matches("^[A-Z]{5}[0-9]{4}[A-Z]{1}$"))
                return ResponseEntity.badRequest().body(Map.of("error",
                    "PAN format invalid! Expected: ABCDE1234F. Got: " + pan));
            c.setPan(pan);
        }

        // ── Pincode: 6 digits if given ──
        if (c.getPincode() != null && !c.getPincode().trim().isEmpty()) {
            if (!c.getPincode().trim().matches("^[1-9][0-9]{5}$"))
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Pincode 6 digits cha hava! Got: " + c.getPincode()));
        }

        c.setCustomerName(name); c.setName(name);
        if (c.getCustomerCode() == null || c.getCustomerCode().trim().isEmpty())
            c.setCustomerCode("CUST-" + String.format("%04d", customerRepo.count() + 1));
        c.setActive(true);
        c.setCurrentBalance(c.getOpeningBalance() != 0 ? c.getOpeningBalance() : 0);
        Customer saved = customerRepo.save(c);
        auditLogService.logCreate("Sales", "Customer created: " + saved.getCustomerName() + " | Phone: " + saved.getPhone());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/customers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> updateCustomer(@PathVariable String id, @RequestBody Customer c) {
        String name = c.getCustomerName() != null ? c.getCustomerName().trim()
                    : (c.getName() != null ? c.getName().trim() : "");

        // ── Validate name ──
        if (name.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Customer name required aahe!"));

        // ── Duplicate name check (exclude self) ──
        String normalizedNew = name.toLowerCase().replaceAll("\\s+", " ");
        boolean nameExists = customerRepo.findAll().stream()
            .filter(x -> !x.getId().equals(id) && x.isActive())
            .anyMatch(x -> {
                String xn = x.getCustomerName() != null ? x.getCustomerName().trim() : (x.getName() != null ? x.getName().trim() : "");
                return normalizedNew.equalsIgnoreCase(xn.replaceAll("\\s+", " "));
            });
        if (nameExists)
            return ResponseEntity.badRequest().body(Map.of("error",
                "Customer '" + name + "' already exists! Duplicate nahi chalnar."));

        // ── Phone validation (if changed) ──
        if (c.getPhone() != null && !c.getPhone().trim().isEmpty()) {
            String ph = c.getPhone().trim().replaceAll("[^0-9]", "");
            if (!ph.matches("^[6-9]\\d{9}$"))
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Phone invalid! 10 digits, 6-9 se start honyapahijhe."));
            // Duplicate phone (exclude self)
            boolean phoneExists = customerRepo.findAll().stream()
                .filter(x -> !x.getId().equals(id) && x.isActive())
                .anyMatch(x -> ph.equals(x.getPhone() != null ? x.getPhone().trim().replaceAll("[^0-9]", "") : ""));
            if (phoneExists)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Phone " + ph + " already registered with another customer!"));
            c.setPhone(ph);
        }

        // ── Email validation (if changed) ──
        if (c.getEmail() != null && !c.getEmail().trim().isEmpty()) {
            String em = c.getEmail().trim().toLowerCase();
            if (!em.matches("^[a-z0-9+_.%-]+@[a-z0-9.-]+\\.[a-z]{2,}$"))
                return ResponseEntity.badRequest().body(Map.of("error", "Email invalid!"));
            boolean emailExists = customerRepo.findAll().stream()
                .filter(x -> !x.getId().equals(id) && x.isActive())
                .anyMatch(x -> em.equalsIgnoreCase(x.getEmail() != null ? x.getEmail().trim() : ""));
            if (emailExists)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Email '" + em + "' already registered with another customer!"));
            c.setEmail(em);
        }

        // ── GSTIN validation (if changed) ──
        if (c.getGstin() != null && !c.getGstin().trim().isEmpty()) {
            String g = c.getGstin().trim().toUpperCase();
            if (g.length() != 15)
                return ResponseEntity.badRequest().body(Map.of("error", "GSTIN 15 chars cha hava!"));
            if (!g.matches("^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"))
                return ResponseEntity.badRequest().body(Map.of("error", "GSTIN format invalid!"));
            boolean gstinExists = customerRepo.findAll().stream()
                .filter(x -> !x.getId().equals(id) && x.isActive())
                .anyMatch(x -> g.equals(x.getGstin() != null ? x.getGstin().trim().toUpperCase() : ""));
            if (gstinExists)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "GSTIN '" + g + "' already registered with another customer!"));
            c.setGstin(g);
        }

        return customerRepo.findById(id).map(ex -> {
            c.setId(id);
            c.setCustomerName(name); c.setName(name);
            c.setActive(ex.isActive());
            c.setCustomerCode(ex.getCustomerCode()); // preserve code
            auditLogService.logUpdate("Sales", "Customer updated: " + name);
            return ResponseEntity.ok(customerRepo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/customers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteCustomer(@PathVariable String id) {
        return customerRepo.findById(id).map(c -> {
            long activeInvoices = invoiceRepo.findByActiveTrue().stream()
                .filter(i -> id.equals(i.getCustomerId())).count();
            if (activeInvoices > 0)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Cannot delete customer with " + activeInvoices + " active invoices. Cancel invoices first."));
            c.setActive(false);
            customerRepo.save(c);
            return ResponseEntity.ok(Map.of("message", "Customer deactivated successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/invoices")
    public List<SalesInvoice> getInvoices(
            @RequestParam(required=false) String financialYear,
            @RequestParam(required=false) String customerId,
            @RequestParam(required=false) String fromDate,
            @RequestParam(required=false) String toDate,
            @RequestParam(required=false) String paymentStatus,
            @RequestParam(required=false, defaultValue="true") boolean activeOnly) {
        List<SalesInvoice> all;
        if (fromDate != null && toDate != null)
            all = activeOnly
                ? invoiceRepo.findByActiveTrueAndInvoiceDateBetween(LocalDate.parse(fromDate), LocalDate.parse(toDate))
                : invoiceRepo.findByInvoiceDateBetween(LocalDate.parse(fromDate), LocalDate.parse(toDate));
        else if (customerId != null) all = invoiceRepo.findByCustomerId(customerId).stream()
            .filter(i -> !activeOnly || i.isActive()).collect(Collectors.toList());
        else if (financialYear != null) all = invoiceRepo.findByFinancialYear(financialYear).stream()
            .filter(i -> !activeOnly || i.isActive()).collect(Collectors.toList());
        else all = activeOnly ? invoiceRepo.findByActiveTrue() : invoiceRepo.findAll();

        if (paymentStatus != null)
            all = all.stream().filter(i -> paymentStatus.equals(i.getPaymentStatus())).collect(Collectors.toList());
        return all;
    }

    @PostMapping("/invoices")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> createInvoice(@RequestBody SalesInvoice invoice) {
        if (invoice.getSoReference() != null && !invoice.getSoReference().isEmpty()) {
            if (invoiceRepo.existsBySoReferenceAndCancelledFalse(invoice.getSoReference())) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "SO " + invoice.getSoReference() + " साठी आधीच Invoice तयार झाला आहे! Duplicate Invoice होणार नाही."
                ));
            }
        }
        // DRAFT madhe stock check skip karo
        boolean isDraftCheck = "DRAFT".equals(invoice.getStatus());
        if (!isDraftCheck && invoice.getItems() != null) {
            for (InvoiceLineItem item : invoice.getItems()) {
                if (item.getItemId() != null && !item.getItemId().isEmpty()) {
                    var itemOpt = itemRepo.findById(item.getItemId());
                    if (itemOpt.isPresent()) {
                        double available = itemOpt.get().getCurrentStock();
                        if (item.getQuantity() <= 0) {
                            return ResponseEntity.badRequest().body(Map.of(
                                "error", "Item '" + item.getItemName() + "': Quantity 0 ya negative nahi chalnar!"
                            ));
                        }
                        if (item.getRate() < 0) {
                            return ResponseEntity.badRequest().body(Map.of(
                                "error", "Item '" + item.getItemName() + "': Rate negative nahi hona chahiye!"
                            ));
                        }
                        if (item.getQuantity() > available) {
                            return ResponseEntity.badRequest().body(Map.of(
                                "error", "Insufficient stock for '" + item.getItemName() +
                                         "'. Available: " + available + ", Required: " + item.getQuantity()
                            ));
                        }
                    }
                }
            }
        }
        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().isEmpty()) {
            // FY-based numbering: SE/25-26/001 format
            // Settings madhe prefix set karta yete (default "SINV")
            String prefix = "SINV";
            String fy = invoice.getFinancialYear();
            try {
                com.erp.model.CompanySettings cs = settingsRepo.findAll().stream().findFirst().orElse(null);
                if (cs != null && cs.getInvoicePrefix() != null && !cs.getInvoicePrefix().isEmpty()) {
                    prefix = cs.getInvoicePrefix();
                }
            } catch (Exception ignored) {}

            // Count existing invoices for this FY only (so counter resets each FY)
            long fyCount = invoiceRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled())
                .filter(i -> fy != null ? fy.equals(i.getFinancialYear()) : true)
                .count();
            long nextNum = fyCount + 1;

            // Format: PREFIX/YY-YY/NNN  e.g. SE/25-26/001
            if (fy != null && fy.contains("-") && fy.length() >= 7) {
                // "2025-26" → "25-26"
                String[] parts = fy.split("-");
                String shortFY = (parts[0].length() >= 4 ? parts[0].substring(2) : parts[0])
                               + "-" + parts[1];
                invoice.setInvoiceNumber(prefix + "/" + shortFY + "/" + String.format("%03d", nextNum));
            } else {
                invoice.setInvoiceNumber(prefix + "-" + String.format("%04d", nextNum));
            }
        }
        if (invoice.getPaymentStatus() == null) invoice.setPaymentStatus("PENDING");
        // DRAFT support: DRAFT status madhe stock deduct hot nahi, accounting post hot nahi
        boolean isDraft = "DRAFT".equals(invoice.getStatus());
        if (invoice.getStatus() == null) invoice.setStatus("CONFIRMED");
        invoice.setActive(true);
        invoice.setCancelled(false);
        recalculateTotals(invoice);

        if (invoice.getCustomerId() != null) {
            double customerBalance = customerRepo.findById(invoice.getCustomerId())
                .map(c -> c.getCurrentBalance()).orElse(0.0);
            double availableCredit = customerBalance < 0 ? Math.abs(customerBalance) : 0.0;
            if (availableCredit > 0) {
                double applyCredit = Math.min(availableCredit, invoice.getGrandTotal());
                invoice.setCreditApplied(applyCredit);
                invoice.setBalanceDue(Math.max(0, invoice.getGrandTotal() - invoice.getPaidAmount() - applyCredit));
                if (invoice.getBalanceDue() <= 0.01) invoice.setPaymentStatus("PAID");
                else invoice.setPaymentStatus("PARTIAL");
            }
        }

        invoice.setBalanceDue(Math.max(0, invoice.getGrandTotal() - invoice.getPaidAmount() - invoice.getCreditApplied()));

        if (invoice.getCustomerId() != null) {
            customerRepo.findById(invoice.getCustomerId()).ifPresent(cust -> {
                if (invoice.getCustomerGstin() == null || invoice.getCustomerGstin().isEmpty())
                    invoice.setCustomerGstin(cust.getGstin());
                if (invoice.getCustomerAddress() == null || invoice.getCustomerAddress().isEmpty())
                    invoice.setCustomerAddress(cust.getAddress());
                if (invoice.getCustomerCity() == null || invoice.getCustomerCity().isEmpty())
                    invoice.setCustomerCity(cust.getCity());
                if (invoice.getCustomerState() == null || invoice.getCustomerState().isEmpty())
                    invoice.setCustomerState(cust.getState());
                if (invoice.getCustomerPincode() == null || invoice.getCustomerPincode().isEmpty())
                    invoice.setCustomerPincode(cust.getPincode());
                if (invoice.getCustomerPhone() == null || invoice.getCustomerPhone().isEmpty())
                    invoice.setCustomerPhone(cust.getPhone());
                if (invoice.getCustomerEmail() == null || invoice.getCustomerEmail().isEmpty())
                    invoice.setCustomerEmail(cust.getEmail());
                if (invoice.getShippingAddress() == null || invoice.getShippingAddress().isEmpty())
                    invoice.setShippingAddress(
                        (cust.getAddress()!=null?cust.getAddress()+" ":"") +
                        (cust.getCity()!=null?cust.getCity()+" ":"") +
                        (cust.getState()!=null?cust.getState():""));
            });
        }

        SalesInvoice saved = invoiceRepo.save(invoice);

        // DRAFT: stock + accounting skip karo
        if (!isDraft) {
            autoPosting.postSalesInvoice(saved);
            if (saved.getItems() != null) {
                for (InvoiceLineItem item : saved.getItems()) {
                    if (item.getItemId() == null || item.getItemId().isEmpty()) continue;
                    itemRepo.findById(item.getItemId()).ifPresent(invItem -> {
                        invItem.setCurrentStock(invItem.getCurrentStock() - item.getQuantity());
                        itemRepo.save(invItem);
                        StockMovement sm = new StockMovement();
                        sm.setItemId(invItem.getId());
                        sm.setItemName(invItem.getItemName());
                        sm.setMovementType("STOCK_OUT");
                        sm.setReferenceType("SALES_INVOICE");
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
            if (invoice.getCustomerId() != null) recalcCustomerBalance(invoice.getCustomerId());
        }
        if (saved.getSoReference() != null && !saved.getSoReference().isEmpty()) {
            soRepo.findAll().stream()
                .filter(so -> saved.getSoReference().equals(so.getSoNumber()))
                .findFirst()
                .ifPresent(so -> { so.setStatus("INVOICED"); soRepo.save(so); });
        }
        auditLogService.logCreate("Sales", "Invoice created: " + saved.getInvoiceNumber() + " | " + saved.getCustomerName() + " | ₹" + saved.getGrandTotal());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<SalesInvoice> getInvoice(@PathVariable String id) {
        return invoiceRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/invoices/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> updateInvoice(@PathVariable String id, @RequestBody SalesInvoice invoice) {
        return invoiceRepo.findById(id).map(existing -> {
            if (existing.isCancelled())
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot update a cancelled invoice"));
            if ("PAID".equals(existing.getPaymentStatus()))
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot update a fully paid invoice. Cancel and recreate."));
            boolean wasDraft = "DRAFT".equals(existing.getStatus());
            boolean nowConfirmed = "CONFIRMED".equals(invoice.getStatus());
            invoice.setId(id);
            invoice.setActive(true);
            invoice.setInvoiceNumber(existing.getInvoiceNumber()); // preserve invoice number
            recalculateTotals(invoice);
            invoice.setBalanceDue(Math.max(0, invoice.getGrandTotal() - invoice.getPaidAmount() - invoice.getCreditApplied()));
            SalesInvoice saved = invoiceRepo.save(invoice);
            // DRAFT → CONFIRMED: stock deduct + accounting post
            if (wasDraft && nowConfirmed) {
                if (saved.getItems() != null) {
                    for (InvoiceLineItem item : saved.getItems()) {
                        if (item.getItemId() == null) continue;
                        itemRepo.findById(item.getItemId()).ifPresent(invItem -> {
                            invItem.setCurrentStock(Math.max(0, invItem.getCurrentStock() - item.getQuantity()));
                            itemRepo.save(invItem);
                            StockMovement sm = new StockMovement();
                            sm.setItemId(invItem.getId()); sm.setItemName(invItem.getItemName());
                            sm.setMovementType("STOCK_OUT"); sm.setReferenceType("SALES_INVOICE");
                            sm.setReferenceNumber(saved.getInvoiceNumber());
                            sm.setQuantity(item.getQuantity()); sm.setUnit(invItem.getUnit());
                            sm.setBalanceQty(invItem.getCurrentStock());
                            sm.setMovementDate(java.time.LocalDate.now());
                            sm.setCreatedAt(java.time.LocalDateTime.now());
                            stockMovRepo.save(sm);
                        });
                    }
                }
                autoPosting.postSalesInvoice(saved);
                if (saved.getCustomerId() != null) recalcCustomerBalance(saved.getCustomerId());
                auditLogService.logUpdate("Sales", "Draft CONFIRMED: " + saved.getInvoiceNumber());
            }
            return ResponseEntity.ok(saved);
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
                    "Cannot cancel a fully paid invoice. Process a Sales Return instead."));

            inv.setCancelled(true);
            inv.setActive(false);
            inv.setStatus("CANCELLED");
            inv.setCancelledReason(reason != null ? reason : "Cancelled by admin");
            inv.setCancelledBy("ADMIN");
            invoiceRepo.save(inv);

            if (inv.getItems() != null) {
                for (InvoiceLineItem item : inv.getItems()) {
                    if (item.getItemId() == null || item.getItemId().isEmpty()) continue;
                    itemRepo.findById(item.getItemId()).ifPresent(invItem -> {
                        invItem.setCurrentStock(invItem.getCurrentStock() + item.getQuantity());
                        itemRepo.save(invItem);
                        StockMovement sm = new StockMovement();
                        sm.setItemId(invItem.getId()); sm.setItemName(invItem.getItemName());
                        sm.setMovementType("STOCK_IN"); sm.setReferenceType("SALES_CANCEL");
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
                    && voucherRepo.existsByVoucherNumber("AUTO-SAL-" + invNo)) {
                try {
                    AccountingVoucher reversal = new AccountingVoucher();
                    reversal.setVoucherNumber("REV-SAL-" + invNo);
                    reversal.setVoucherType("JOURNAL");
                    reversal.setVoucherDate(LocalDate.now());
                    reversal.setFinancialYear(inv.getFinancialYear() != null ? inv.getFinancialYear() : "2024-25");
                    reversal.setNarration("REVERSAL: Cancelled Sales Invoice " + invNo);
                    reversal.setReferenceNumber(invNo);
                    reversal.setStatus("POSTED");

                    List<AccountingVoucher.VoucherEntry> entries = new ArrayList<>();
                    AccountingVoucher.VoucherEntry cr = new AccountingVoucher.VoucherEntry();
                    cr.setLedgerName(inv.getCustomerName() != null ? inv.getCustomerName() : "Accounts Receivable");
                    cr.setEntryType("CREDIT"); cr.setAmount(inv.getGrandTotal());
                    entries.add(cr);
                    AccountingVoucher.VoucherEntry dr1 = new AccountingVoucher.VoucherEntry();
                    dr1.setLedgerName("Sales Account"); dr1.setEntryType("DEBIT"); dr1.setAmount(inv.getSubTotal());
                    entries.add(dr1);
                    if (inv.getTotalGst() > 0) {
                        AccountingVoucher.VoucherEntry dr2 = new AccountingVoucher.VoucherEntry();
                        dr2.setLedgerName("GST Output Tax Payable"); dr2.setEntryType("DEBIT"); dr2.setAmount(inv.getTotalGst());
                        entries.add(dr2);
                    }
                    reversal.setEntries(entries);
                    reversal.setTotalDebit(inv.getSubTotal() + inv.getTotalGst());
                    reversal.setTotalCredit(inv.getGrandTotal());
                    voucherRepo.save(reversal);
                    ledgerPostingService.postVoucherToLedger(reversal);
                } catch (Exception ignored) {
                }
            }

            return ResponseEntity.ok(Map.of(
                "message", "Invoice cancelled successfully. Reversal entry created.",
                "invoiceNumber", inv.getInvoiceNumber()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/invoices/{id}/payment")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES_EXECUTIVE')")
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
            SalesInvoice.PaymentEntry entry = new SalesInvoice.PaymentEntry();
            entry.setPaymentDate(java.time.LocalDate.now());
            entry.setAmount(amount);
            entry.setPaymentMode(paymentMode != null ? paymentMode : "Cash");
            entry.setReferenceNo(referenceNo != null ? referenceNo : "");
            entry.setNotes(notes != null ? notes : "");
            entry.setRecordedAt(java.time.LocalDateTime.now());
            inv.getPaymentHistory().add(entry);

            SalesInvoice updated = invoiceRepo.save(inv);
            if (inv.getCustomerId() != null) {
                recalcCustomerBalance(inv.getCustomerId());
            }
            autoPosting.postSalesPayment(
                inv.getCustomerName(), amount, paymentMode,
                inv.getInvoiceNumber(), inv.getFinancialYear()
            );
                        auditLogService.logPayment("Sales", "Payment ₹" + amount + " for invoice " + inv.getInvoiceNumber() + " from " + inv.getCustomerName());
return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/report/outstanding")
    public ResponseEntity<?> getOutstanding() {
        List<SalesInvoice> pending = invoiceRepo.findByActiveTrueAndPaymentStatus("PENDING");
        List<SalesInvoice> partial = invoiceRepo.findByActiveTrueAndPaymentStatus("PARTIAL");
        double totalOut = pending.stream().mapToDouble(SalesInvoice::getBalanceDue).sum()
            + partial.stream().mapToDouble(SalesInvoice::getBalanceDue).sum();
        Map<String, Double> custWise = new LinkedHashMap<>();
        for (SalesInvoice i : pending) custWise.merge(i.getCustomerName(), i.getBalanceDue(), Double::sum);
        for (SalesInvoice i : partial) custWise.merge(i.getCustomerName(), i.getBalanceDue(), Double::sum);
        return ResponseEntity.ok(Map.of(
            "pendingInvoices", pending, "partialInvoices", partial,
            "totalOutstanding", totalOut, "customerWise", custWise));
    }

    @GetMapping("/report/register")
    public ResponseEntity<?> getSalesRegister(
            @RequestParam(required=false) String fromDate,
            @RequestParam(required=false) String toDate,
            @RequestParam(required=false) String customerId) {
        List<SalesInvoice> invoices = invoiceRepo.findByActiveTrue();
        if (fromDate != null && toDate != null) {
            final LocalDate from = LocalDate.parse(fromDate);
            final LocalDate to   = LocalDate.parse(toDate);
            invoices = invoices.stream().filter(i -> {
                if (i.getInvoiceDate() == null) return false;
                return !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to);
            }).collect(Collectors.toList());
        }
        if (customerId != null)
            invoices = invoices.stream().filter(i -> customerId.equals(i.getCustomerId())).collect(Collectors.toList());

        // Returns per invoice
        java.util.Map<String,Double> invRetMap = new java.util.HashMap<>();
        returnRepo.findAll().stream()
            .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
            .filter(r -> r.getOriginalInvoiceId() != null)
            .forEach(r -> invRetMap.merge(r.getOriginalInvoiceId(), r.getGrandTotal(), Double::sum));

        double totalTaxable   = invoices.stream().mapToDouble(SalesInvoice::getSubTotal).sum();
        double totalCgst      = invoices.stream().mapToDouble(SalesInvoice::getTotalCgst).sum();
        double totalSgst      = invoices.stream().mapToDouble(SalesInvoice::getTotalSgst).sum();
        double totalIgst      = invoices.stream().mapToDouble(SalesInvoice::getTotalIgst).sum();
        double totalAmt       = invoices.stream().mapToDouble(SalesInvoice::getGrandTotal).sum();
        double totalReturned  = invRetMap.values().stream().mapToDouble(Double::doubleValue).sum();
        double netSales       = totalAmt - totalReturned;

        Map<String, Double> custWise = new LinkedHashMap<>();
        for (SalesInvoice i : invoices) {
            double retAmt = invRetMap.getOrDefault(i.getId(), 0.0);
            custWise.merge(i.getCustomerName(), i.getGrandTotal() - retAmt, Double::sum);
        }

        // Build invoice list with returnedAmount
        List<Map<String,Object>> invoiceList = invoices.stream().map(inv -> {
            Map<String,Object> m = new java.util.LinkedHashMap<>();
            m.put("id",             inv.getId());
            m.put("invoiceNumber",  inv.getInvoiceNumber());
            m.put("invoiceDate",    inv.getInvoiceDate());
            m.put("customerName",   inv.getCustomerName());
            m.put("customerGstin",  inv.getCustomerGstin());
            m.put("invoiceType",    inv.getInvoiceType());
            m.put("subTotal",       inv.getSubTotal());
            m.put("totalGst",       inv.getTotalGst());
            m.put("grandTotal",     inv.getGrandTotal());
            m.put("paidAmount",     inv.getPaidAmount());
            m.put("paymentStatus",  inv.getPaymentStatus());
            m.put("returnedAmount", invRetMap.getOrDefault(inv.getId(), 0.0));
            m.put("netAmount",      inv.getGrandTotal() - invRetMap.getOrDefault(inv.getId(), 0.0));
            return m;
        }).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "invoices", invoiceList, "customerWise", custWise,
            "summary", Map.of("totalTaxableValue", totalTaxable, "totalCgst", totalCgst,
                "totalSgst", totalSgst, "totalIgst", totalIgst,
                "totalAmount", totalAmt, "totalReturned", totalReturned, "netSales", netSales, "invoiceCount", invoices.size())));
    }

    private void recalcCustomerBalance(String customerId) {
        customerRepo.findById(customerId).ifPresent(cust -> {
            var allInvoices = invoiceRepo.findByCustomerId(customerId).stream()
                .filter(i -> !i.isCancelled()).collect(java.util.stream.Collectors.toList());
            var retMap = new java.util.HashMap<String, Double>();
            returnRepo.findByCustomerId(customerId).stream()
                .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                .forEach(r -> { if (r.getOriginalInvoiceId() != null)
                    retMap.merge(r.getOriginalInvoiceId(), r.getGrandTotal(), Double::sum); });

            double customerOwes = 0, weOweCustomer = 0;
            for (var inv : allInvoices) {
                double returnAmt = Math.min(retMap.getOrDefault(inv.getId(), 0.0), inv.getGrandTotal());
                double keptGoods = inv.getGrandTotal() - returnAmt;
                double received  = inv.getPaidAmount();
                customerOwes   += Math.max(0, keptGoods - received);
                weOweCustomer  += Math.max(0, received - keptGoods);
            }
            double balance = cust.getOpeningBalance() + customerOwes - weOweCustomer;
            cust.setCurrentBalance(balance);
            cust.setBalanceType(balance >= 0 ? "DEBIT" : "CREDIT");
            customerRepo.save(cust);
        });
    }

    private void autoDetectInterState(SalesInvoice invoice) {
        // Auto-detect isInterState: company state vs customer state compare karo
        try {
            String companyState = settingsRepo.findAll().stream().findFirst()
                .map(cs -> cs.getState() != null ? cs.getState().toUpperCase().trim() : "").orElse("");
            String custState = invoice.getCustomerState() != null ? invoice.getCustomerState().toUpperCase().trim() : "";
            if (!companyState.isEmpty() && !custState.isEmpty()) {
                invoice.setInterState(!companyState.equals(custState));
            }
        } catch (Exception ignored) {}
    }

    private void recalculateTotals(SalesInvoice invoice) {
        if (invoice.getItems() == null || invoice.getItems().isEmpty()) return;
        // Auto-detect inter-state before calculating GST
        autoDetectInterState(invoice);
        double sub = 0, cgst = 0, sgst = 0, igst = 0;
        for (InvoiceLineItem item : invoice.getItems()) {
            double base = item.getQuantity() * item.getRate() * (1 - (item.getDiscount() / 100.0));
            double gstAmt = base * item.getGstRate() / 100.0;
            item.setAmount(base);
            item.setTaxableAmount(base);
            item.setGstAmt(gstAmt);
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
        // Invoice-level discount — applied proportionally to all items
        double invDiscPct = invoice.getDiscount() > 0 ? invoice.getDiscount() / 100.0 : 0;
        double invDiscount  = sub * invDiscPct;
        double subAfterDisc = sub - invDiscount;
        double discFactor   = 1 - invDiscPct;

        // Apply invoice discount factor to GST as well
        cgst *= discFactor; sgst *= discFactor; igst *= discFactor;

        // Update each item's taxableAmount proportionally (for HSN table accuracy)
        if (invDiscPct > 0 && invoice.getItems() != null) {
            for (InvoiceLineItem item : invoice.getItems()) {
                item.setTaxableAmount(item.getTaxableAmount() * discFactor);
                item.setCgstAmount(item.getCgstAmount() * discFactor);
                item.setSgstAmount(item.getSgstAmount() * discFactor);
                item.setIgstAmount(item.getIgstAmount() * discFactor);
                item.setTotalAmount(item.getTaxableAmount() + item.getCgstAmount() + item.getSgstAmount() + item.getIgstAmount());
            }
        }

        // Additional charges (Freight, Packaging, Other) — no GST
        double addCharges = (invoice.getFreightCharge() > 0 ? invoice.getFreightCharge() : 0)
                          + (invoice.getPackagingCharge() > 0 ? invoice.getPackagingCharge() : 0)
                          + (invoice.getOtherCharge() > 0 ? invoice.getOtherCharge() : 0);
        double roundOff  = invoice.getRoundOff() != 0 ? invoice.getRoundOff() : 0;
        double grandTotal = subAfterDisc + cgst + sgst + igst + addCharges + roundOff;

        invoice.setSubTotal(subAfterDisc);
        invoice.setTotalCgst(cgst); invoice.setTotalSgst(sgst); invoice.setTotalIgst(igst);
        invoice.setTotalGst(cgst + sgst + igst);
        invoice.setGrandTotal(grandTotal);
    }

    // ── Customer Statement ──
    @GetMapping("/customers/{id}/statement")
    public ResponseEntity<?> getCustomerStatement(
            @PathVariable String id,
            @RequestParam(required=false) String fromDate,
            @RequestParam(required=false) String toDate) {
        return customerRepo.findById(id).map(cust -> {
            List<SalesInvoice> invs = invoiceRepo.findAll().stream()
                .filter(i -> id.equals(i.getCustomerId()) && i.isActive())
                .filter(i -> {
                    if (fromDate != null && toDate != null && i.getInvoiceDate() != null) {
                        java.time.LocalDate f2 = java.time.LocalDate.parse(fromDate);
                        java.time.LocalDate t  = java.time.LocalDate.parse(toDate);
                        return !i.getInvoiceDate().isBefore(f2) && !i.getInvoiceDate().isAfter(t);
                    }
                    return true;
                })
                .sorted(java.util.Comparator.comparing(i -> i.getInvoiceDate() != null ? i.getInvoiceDate() : LocalDate.now()))
                .collect(java.util.stream.Collectors.toList());
            double totalBilled  = invs.stream().mapToDouble(SalesInvoice::getGrandTotal).sum();
            double totalPaid    = invs.stream().mapToDouble(SalesInvoice::getPaidAmount).sum();
            double totalBalance = invs.stream().mapToDouble(SalesInvoice::getBalanceDue).sum();
            return ResponseEntity.ok(Map.of(
                "customer", cust,
                "invoices", invs,
                "totalBilled",  totalBilled,
                "totalPaid",    totalPaid,
                "totalBalance", totalBalance,
                "openingBalance", cust.getOpeningBalance()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }


    // ── Convert Quotation / Estimate / Proforma → Tax Invoice ──
    @PutMapping("/invoices/{id}/convert-to-invoice")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> convertToInvoice(@PathVariable String id) {
        return invoiceRepo.findById(id).map(inv -> {
            String t = inv.getInvoiceType();
            if ("TAX_INVOICE".equals(t) || "RETAIL_INVOICE".equals(t))
                return ResponseEntity.badRequest().body(Map.of("error", "This is already a confirmed invoice."));
            if (inv.isCancelled())
                return ResponseEntity.badRequest().body(Map.of("error", "Cancelled invoices cannot be converted."));

            // Stock check before converting
            if (inv.getItems() != null) {
                for (InvoiceLineItem item : inv.getItems()) {
                    if (item.getItemId() == null || item.getItemId().isEmpty()) continue;
                    var itemOpt = itemRepo.findById(item.getItemId());
                    if (itemOpt.isPresent()) {
                        double available = itemOpt.get().getCurrentStock();
                        if (item.getQuantity() > available)
                            return ResponseEntity.badRequest().body(Map.of("error",
                                "Insufficient stock for '" + item.getItemName() + "'. Available: " + available));
                    }
                }
            }

            // Convert to Tax Invoice
            String oldType = inv.getInvoiceType();
            inv.setInvoiceType("TAX_INVOICE");
            inv.setStatus("CONFIRMED");
            // Assign new invoice number using settings prefix
            String prefix2 = "SINV";
            try {
                java.util.List<com.erp.model.CompanySettings> csList = settingsRepo.findAll();
                if (!csList.isEmpty() && csList.get(0).getInvoicePrefix() != null && !csList.get(0).getInvoicePrefix().isBlank())
                    prefix2 = csList.get(0).getInvoicePrefix();
            } catch (Exception ignored) {}
            long nextNum2 = invoiceRepo.findAll().stream()
                .filter(x -> x.isActive() && !x.isCancelled() && x.getFinancialYear() != null && x.getFinancialYear().equals(inv.getFinancialYear()))
                .count() + 1;
            String fy2 = inv.getFinancialYear() != null ? inv.getFinancialYear() : "2024-25";
            String[] parts2 = fy2.split("-");
            String newInvNum;
            if (parts2.length == 2) {
                String shortFY2 = (parts2[0].length()>=4?parts2[0].substring(2):parts2[0]) + "-" + (parts2[1].length()>=4?parts2[1].substring(2):parts2[1]);
                newInvNum = prefix2 + "/" + shortFY2 + "/" + String.format("%03d", nextNum2);
            } else {
                newInvNum = prefix2 + "-" + String.format("%04d", invoiceRepo.count() + 1);
            }
            inv.setInvoiceNumber(newInvNum);
            recalculateTotals(inv);
            inv.setBalanceDue(Math.max(0, inv.getGrandTotal() - inv.getPaidAmount() - inv.getCreditApplied()));
            SalesInvoice saved = invoiceRepo.save(inv);

            // Deduct stock
            if (saved.getItems() != null) {
                for (InvoiceLineItem item : saved.getItems()) {
                    if (item.getItemId() == null || item.getItemId().isEmpty()) continue;
                    itemRepo.findById(item.getItemId()).ifPresent(invItem -> {
                        invItem.setCurrentStock(invItem.getCurrentStock() - item.getQuantity());
                        itemRepo.save(invItem);
                        StockMovement sm = new StockMovement();
                        sm.setItemId(invItem.getId()); sm.setItemName(invItem.getItemName());
                        sm.setMovementType("STOCK_OUT"); sm.setReferenceType("SALES_INVOICE");
                        sm.setReferenceNumber(saved.getInvoiceNumber());
                        sm.setQuantity(item.getQuantity()); sm.setUnit(invItem.getUnit());
                        sm.setBalanceQty(invItem.getCurrentStock());
                        sm.setMovementDate(java.time.LocalDate.now());
                        sm.setCreatedAt(java.time.LocalDateTime.now());
                        stockMovRepo.save(sm);
                    });
                }
            }
            if (saved.getCustomerId() != null) recalcCustomerBalance(saved.getCustomerId());
            autoPosting.postSalesInvoice(saved);
            auditLogService.logUpdate("Sales", "Converted " + oldType + " → Invoice: " + saved.getInvoiceNumber());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Duplicate Invoice ──
    @PostMapping("/invoices/{id}/duplicate")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> duplicateInvoice(@PathVariable String id) {
        return invoiceRepo.findById(id).map(orig -> {
            SalesInvoice dup = new SalesInvoice();
            dup.setCustomerId(orig.getCustomerId());
            dup.setCustomerName(orig.getCustomerName());
            dup.setCustomerGstin(orig.getCustomerGstin());
            dup.setCustomerAddress(orig.getCustomerAddress());
            dup.setCustomerCity(orig.getCustomerCity());
            dup.setCustomerState(orig.getCustomerState());
            dup.setCustomerPhone(orig.getCustomerPhone());
            dup.setItems(orig.getItems());
            dup.setInvoiceType(orig.getInvoiceType());
            dup.setNotes(orig.getNotes());
            dup.setTermsAndConditions(orig.getTermsAndConditions());
            dup.setPaymentStatus("PENDING");
            dup.setStatus("CONFIRMED");
            dup.setActive(true);
            dup.setCancelled(false);
            dup.setInvoiceDate(java.time.LocalDate.now());
            dup.setFinancialYear(orig.getFinancialYear());
            // Use settings prefix for duplicate invoice number
            String dupPrefix = "SINV";
            try {
                java.util.List<com.erp.model.CompanySettings> cs2 = settingsRepo.findAll();
                if (!cs2.isEmpty() && cs2.get(0).getInvoicePrefix() != null)
                    dupPrefix = cs2.get(0).getInvoicePrefix();
            } catch (Exception ignored) {}
            String dupFY = dup.getFinancialYear() != null ? dup.getFinancialYear() : "2024-25";
            String[] dpParts = dupFY.split("-");
            long dupNum = invoiceRepo.count() + 1;
            if (dpParts.length == 2) {
                String dShort = (dpParts[0].length()>=4?dpParts[0].substring(2):dpParts[0]) + "-" + (dpParts[1].length()>=4?dpParts[1].substring(2):dpParts[1]);
                dup.setInvoiceNumber(dupPrefix + "/" + dShort + "/" + String.format("%03d", dupNum));
            } else {
                dup.setInvoiceNumber(dupPrefix + "-" + String.format("%04d", dupNum));
            }
            recalculateTotals(dup);
            dup.setBalanceDue(dup.getGrandTotal());
            SalesInvoice saved = invoiceRepo.save(dup);
            auditLogService.logCreate("Sales", "Invoice duplicated: " + saved.getInvoiceNumber() + " from " + orig.getInvoiceNumber());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Customer-wise Sales Summary ──
    @GetMapping("/report/customer-summary")
    public ResponseEntity<?> getCustomerSummary(
            @RequestParam(required=false) String fromDate,
            @RequestParam(required=false) String toDate,
            @RequestParam(required=false) String financialYear) {
        List<SalesInvoice> all = invoiceRepo.findAll().stream()
            .filter(i -> i.isActive() && !i.isCancelled())
            .collect(java.util.stream.Collectors.toList());
        if (fromDate != null && toDate != null) {
            java.time.LocalDate f = java.time.LocalDate.parse(fromDate);
            java.time.LocalDate t = java.time.LocalDate.parse(toDate);
            all = all.stream().filter(i -> i.getInvoiceDate() != null
                && !i.getInvoiceDate().isBefore(f) && !i.getInvoiceDate().isAfter(t))
                .collect(java.util.stream.Collectors.toList());
        }
        // Returns per customer — approved only
        java.util.Map<String,Double> custReturnMap = new java.util.HashMap<>();
        returnRepo.findAll().stream()
            .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus())))
            .filter(r -> r.getCustomerId() != null)
            .forEach(r -> custReturnMap.merge(r.getCustomerId(), r.getGrandTotal(), Double::sum));

        Map<String, Map<String, Object>> byCustomer = new java.util.LinkedHashMap<>();
        for (SalesInvoice inv : all) {
            String name = inv.getCustomerName() != null ? inv.getCustomerName() : "Unknown";
            byCustomer.computeIfAbsent(name, k -> {
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("customerName", k); m.put("customerId", inv.getCustomerId());
                m.put("invoiceCount", 0); m.put("totalAmount", 0.0); m.put("returnAmount", 0.0);
                m.put("netAmount", 0.0); m.put("paidAmount", 0.0);
                m.put("balanceDue", 0.0); m.put("totalGst", 0.0);
                return m;
            });
            Map<String, Object> cm = byCustomer.get(name);
            cm.put("invoiceCount", (int)cm.get("invoiceCount") + 1);
            cm.put("totalAmount",  (double)cm.get("totalAmount")  + inv.getGrandTotal());
            cm.put("paidAmount",   (double)cm.get("paidAmount")   + inv.getPaidAmount());
            cm.put("balanceDue",   (double)cm.get("balanceDue")   + inv.getBalanceDue());
            cm.put("totalGst",     (double)cm.get("totalGst")     + inv.getTotalGst());
        }
        // Returns deduct karo each customer sathi
        for (Map<String, Object> cm : byCustomer.values()) {
            String custId = (String) cm.get("customerId");
            double retAmt = custReturnMap.getOrDefault(custId, 0.0);
            cm.put("returnAmount", retAmt);
            cm.put("netAmount", Math.max(0, (double)cm.get("totalAmount") - retAmt));
        }
        List<Map<String,Object>> sorted = new java.util.ArrayList<>(byCustomer.values());
        sorted.sort((a,b) -> Double.compare((double)b.get("netAmount"), (double)a.get("netAmount")));
        double grandTotalNet = sorted.stream().mapToDouble(m -> (double)m.get("netAmount")).sum();
        double totalReturns  = custReturnMap.values().stream().mapToDouble(Double::doubleValue).sum();
        return ResponseEntity.ok(Map.of(
            "customers",    sorted,
            "totalInvoices", all.size(),
            "grandTotal",   all.stream().mapToDouble(SalesInvoice::getGrandTotal).sum(),
            "totalReturns", totalReturns,
            "netSales",     grandTotalNet));
    }

    // ── Item-wise Sales Summary ──
    @GetMapping("/report/item-summary")
    public ResponseEntity<?> getItemSummary(
            @RequestParam(required=false) String fromDate,
            @RequestParam(required=false) String toDate) {
        List<SalesInvoice> all = invoiceRepo.findAll().stream()
            .filter(i -> i.isActive() && !i.isCancelled()).collect(java.util.stream.Collectors.toList());
        if (fromDate != null && toDate != null) {
            java.time.LocalDate f = java.time.LocalDate.parse(fromDate);
            java.time.LocalDate t = java.time.LocalDate.parse(toDate);
            all = all.stream().filter(i -> i.getInvoiceDate() != null
                && !i.getInvoiceDate().isBefore(f) && !i.getInvoiceDate().isAfter(t))
                .collect(java.util.stream.Collectors.toList());
        }
        Map<String, Map<String, Object>> byItem = new java.util.LinkedHashMap<>();
        for (SalesInvoice inv : all) {
            if (inv.getItems() == null) continue;
            for (InvoiceLineItem item : inv.getItems()) {
                String name = item.getItemName() != null ? item.getItemName() : "Unknown";
                byItem.computeIfAbsent(name, k -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("itemName", k); m.put("itemId", item.getItemId());
                    m.put("totalQty", 0.0); m.put("totalAmount", 0.0); m.put("totalGst", 0.0);
                    m.put("unit", item.getUnit()); return m;
                });
                Map<String, Object> im = byItem.get(name);
                im.put("totalQty",    (double)im.get("totalQty")    + item.getQuantity());
                im.put("totalAmount", (double)im.get("totalAmount") + item.getTotalAmount());
                im.put("totalGst",    (double)im.get("totalGst")    + item.getGstAmt());
            }
        }
        // Sales returns — item-wise deduct karo
        returnRepo.findAll().stream()
            .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
            .filter(r -> r.getItems() != null)
            .forEach(ret -> ret.getItems().forEach(rItem -> {
                String rName = rItem.getItemName() != null ? rItem.getItemName() : "Unknown";
                if (byItem.containsKey(rName)) {
                    Map<String,Object> im = byItem.get(rName);
                    double retQty = rItem.getQuantity();
                    double retAmt = rItem.getTotalAmount() > 0 ? rItem.getTotalAmount()
                                  : rItem.getQuantity() * rItem.getRate();
                    im.put("returnQty",    (double)im.getOrDefault("returnQty",    0.0) + retQty);
                    im.put("returnAmount", (double)im.getOrDefault("returnAmount", 0.0) + retAmt);
                    im.put("netQty",       Math.max(0, (double)im.get("totalQty")    - retQty));
                    im.put("netAmount",    Math.max(0, (double)im.get("totalAmount") - retAmt));
                }
            }));
        // Items without returns — set net = total
        byItem.forEach((name, im) -> {
            if (!im.containsKey("netQty")) {
                im.put("returnQty", 0.0);
                im.put("returnAmount", 0.0);
                im.put("netQty",    im.get("totalQty"));
                im.put("netAmount", im.get("totalAmount"));
            }
        });
        List<Map<String,Object>> sorted = new java.util.ArrayList<>(byItem.values());
        sorted.sort((a,b) -> Double.compare((double)b.get("netAmount"), (double)a.get("netAmount")));
        return ResponseEntity.ok(sorted);
    }

    // ── Delivery Challan ─────────────────────────────────────────────────
    @GetMapping("/invoices/{id}/challan")
    public ResponseEntity<?> getDeliveryChallan(@PathVariable String id) {
        return invoiceRepo.findById(id).map(inv -> {
            Map<String,Object> challan = new LinkedHashMap<>();
            challan.put("challanNumber",  "DC-" + inv.getInvoiceNumber());
            challan.put("challanDate",    LocalDate.now());
            challan.put("invoiceRef",     inv.getInvoiceNumber());
            challan.put("customerId",     inv.getCustomerId());
            challan.put("customerName",   inv.getCustomerName());
            challan.put("customerPhone",  inv.getCustomerPhone());
            challan.put("customerAddress",inv.getCustomerAddress());
            challan.put("shippingAddress",inv.getShippingAddress() != null ? inv.getShippingAddress() : inv.getCustomerAddress());
            challan.put("items",          inv.getItems());
            challan.put("notes",          inv.getNotes());
            challan.put("status",         "DISPATCHED");
            return ResponseEntity.ok(challan);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Credit Note (formal GST doc from Sales Return) ───────────────────
    @GetMapping("/returns/{id}/credit-note")
    public ResponseEntity<?> getCreditNote(@PathVariable String id) {
        return returnRepo.findById(id).map(ret -> {
            if (!"APPROVED".equals(ret.getStatus()) && !"COMPLETED".equals(ret.getStatus()))
                return ResponseEntity.badRequest().body(Map.of("error", "Credit note only for approved returns"));
            Map<String,Object> cn = new LinkedHashMap<>();
            cn.put("creditNoteNumber",  "CN-" + ret.getReturnNumber());
            cn.put("creditNoteDate",    LocalDate.now());
            cn.put("originalInvoice",   ret.getOriginalInvoiceNumber());
            cn.put("customerId",        ret.getCustomerId());
            cn.put("customerName",      ret.getCustomerName());
            cn.put("items",             ret.getItems());
            cn.put("subTotal",          ret.getSubTotal());
            cn.put("totalGst",          ret.getTotalGst());
            cn.put("grandTotal",        ret.getGrandTotal());
            cn.put("reason",            ret.getReason());
            cn.put("status",            "ISSUED");
            return ResponseEntity.ok(cn);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Debit Note (formal GST doc from Purchase Return) — in PurchaseController ──
    // ── WhatsApp Invoice Share data ──────────────────────────────────────
    @GetMapping("/invoices/{id}/share")
    public ResponseEntity<?> getInvoiceShareData(@PathVariable String id) {
        return invoiceRepo.findById(id).map(inv -> {
            String msg = String.format(
                "Dear %s,\n\nInvoice %s dated %s\nAmount: ₹%.2f\nStatus: %s\n\nThank you for your business!",
                inv.getCustomerName(),
                inv.getInvoiceNumber(),
                inv.getInvoiceDate(),
                inv.getGrandTotal(),
                inv.getPaymentStatus()
            );
            Map<String,Object> share = new LinkedHashMap<>();
            share.put("invoiceNumber", inv.getInvoiceNumber());
            share.put("customerName",  inv.getCustomerName());
            share.put("customerPhone", inv.getCustomerPhone());
            share.put("grandTotal",    inv.getGrandTotal());
            share.put("balanceDue",    inv.getBalanceDue());
            share.put("whatsappMessage", msg);
            share.put("whatsappPhone",   inv.getCustomerPhone());
            return ResponseEntity.ok(share);
        }).orElse(ResponseEntity.notFound().build());
    }



    // ── E-Way Bill Generate (NIC portal link + basic document) ────────────
    @GetMapping("/invoices/{id}/eway-bill")
    public ResponseEntity<?> getEwayBillData(@PathVariable String id) {
        return invoiceRepo.findById(id).map(inv -> {
            Map<String,Object> data = new java.util.LinkedHashMap<>();
            data.put("invoiceNumber",    inv.getInvoiceNumber());
            data.put("invoiceDate",      inv.getInvoiceDate());
            data.put("supplierGstin",    "27ESIPM4956B1ZJ"); // from settings
            data.put("customerName",     inv.getCustomerName());
            data.put("customerGstin",    inv.getCustomerGstin());
            data.put("customerAddress",  inv.getCustomerAddress());
            data.put("customerState",    inv.getCustomerState());
            data.put("grandTotal",       inv.getGrandTotal());
            data.put("totalGst",         inv.getTotalGst());
            data.put("vehicleNumber",    inv.getVehicleNumber());
            data.put("transporterName",  inv.getTransporterName());
            data.put("ewayBillNumber",   inv.getEwayBillNumber());
            data.put("nicPortalUrl",     "https://ewaybillgst.gov.in");
            // Items for e-way bill
            double totalValue = inv.getGrandTotal();
            data.put("requiresEwayBill", totalValue >= 50000);
            data.put("totalValue", totalValue);
            data.put("items", inv.getItems());
            return ResponseEntity.ok(data);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Update E-Way Bill Number (after generating on NIC portal) ──────────
    @PutMapping("/invoices/{id}/eway-bill")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES_EXECUTIVE')")
    public ResponseEntity<?> updateEwayBill(@PathVariable String id,
            @RequestParam String ewayBillNumber,
            @RequestParam(required=false) String ewayBillDate) {
        return invoiceRepo.findById(id).map(inv -> {
            inv.setEwayBillNumber(ewayBillNumber);
            inv.setEwayBillDate(ewayBillDate != null ? ewayBillDate : java.time.LocalDate.now().toString());
            invoiceRepo.save(inv);
            auditLogService.logUpdate("Sales", "E-Way Bill set: " + ewayBillNumber + " for " + inv.getInvoiceNumber());
            return ResponseEntity.ok(Map.of("message", "E-Way Bill number saved", "ewayBillNumber", ewayBillNumber));
        }).orElse(ResponseEntity.notFound().build());
    }


    // ── Send Invoice via Email ──────────────────────────────────────────
    @PostMapping("/invoices/{id}/email")
    public ResponseEntity<?> emailInvoice(@PathVariable String id,
            @RequestParam String toEmail,
            @RequestParam(required=false) String subject,
            @RequestParam(required=false) String body) {
        if (emailService == null)
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Email service not configured. Add spring.mail.* to application.properties",
                "setup", "spring.mail.host=smtp.gmail.com, spring.mail.port=587, spring.mail.username=your@gmail.com, spring.mail.password=app-password"
            ));
        boolean sent = emailService.sendInvoiceEmail(id, toEmail, subject, body);
        if (sent) {
            auditLogService.logUpdate("Sales", "Invoice emailed to " + toEmail + " for invoice " + id);
            return ResponseEntity.ok(Map.of("message", "Email sent successfully to " + toEmail));
        } else {
            return ResponseEntity.internalServerError().body(Map.of("error", "Email send failed. Check server logs."));
        }
    }

    // ── Invoice Calculation from Backend ──────────────────────────────────────────
    @PostMapping("/invoices/calculate")
    public ResponseEntity<?> calculateInvoiceTotals(@RequestBody SalesInvoice invoice,
            @RequestParam(required=false, defaultValue="false") boolean isInterState) {
        if (invoice.getItems() == null || invoice.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No items to calculate"));
        }
        
        // Convert InvoiceLineItem to InvoiceLineItem format for calculation
        List<com.erp.model.InvoiceLineItem> lineItems = invoice.getItems().stream()
            .map(item -> {
                com.erp.model.InvoiceLineItem li = new com.erp.model.InvoiceLineItem();
                li.setItemId(item.getItemId());
                li.setItemName(item.getItemName());
                li.setQuantity(item.getQuantity());
                li.setRate(item.getRate());
                li.setDiscountPercent(item.getDiscount());
                li.setGstPercent(item.getGstRate());
                li.setHsnCode(item.getHsnCode());
                return li;
            })
            .collect(Collectors.toList());
        
        // Use the calculation service
        com.erp.model.SalesInvoice calcInvoice = new com.erp.model.SalesInvoice();
        calcInvoice.setItems(lineItems);
        
        var result = calcService.calculateInvoice(calcInvoice, isInterState);
        
        return ResponseEntity.ok(Map.of(
            "totalTaxable", result.totalTaxable(),
            "totalCGST", result.totalCGST(),
            "totalSGST", result.totalSGST(),
            "totalIGST", result.totalIGST(),
            "totalDiscount", result.totalDiscount(),
            "totalCess", result.totalCess(),
            "grandTotal", result.grandTotal(),
            "itemBreakdown", result.itemCalcs()
        ));
    }
}

