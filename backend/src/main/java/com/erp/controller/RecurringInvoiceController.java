package com.erp.controller;

import com.erp.model.RecurringInvoice;
import com.erp.model.SalesInvoice;
import com.erp.model.InvoiceLineItem;
import com.erp.repository.*;
import com.erp.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/sales/recurring")
public class RecurringInvoiceController {

    @Autowired private RecurringInvoiceRepository recurringRepo;
    @Autowired private SalesInvoiceRepository invoiceRepo;
    @Autowired private CustomerRepository customerRepo;
    @Autowired private InventoryItemRepository itemRepo;
    @Autowired private AuditLogService auditLogService;

    @GetMapping
    public List<RecurringInvoice> getAll() { return recurringRepo.findAll(); }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES_EXECUTIVE')")
    public ResponseEntity<?> create(@RequestBody RecurringInvoice ri) {
        if (ri.getStatus() == null) ri.setStatus("ACTIVE");
        if (ri.getStartDate() == null) ri.setStartDate(LocalDate.now());
        ri.setNextRunDate(calculateNextRunDate(ri, ri.getStartDate()));
        RecurringInvoice saved = recurringRepo.save(ri);
        auditLogService.logCreate("Sales", "Recurring Invoice created: " + ri.getName() + " for " + ri.getCustomerName());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES_EXECUTIVE')")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody RecurringInvoice ri) {
        return recurringRepo.findById(id).map(existing -> {
            ri.setId(id);
            ri.setTotalRuns(existing.getTotalRuns());
            ri.setLastRunDate(existing.getLastRunDate());
            RecurringInvoice saved = recurringRepo.save(ri);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> delete(@PathVariable String id) {
        recurringRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // Manual run — now generate an invoice
    @PostMapping("/{id}/run")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES_EXECUTIVE')")
    public ResponseEntity<?> runNow(@PathVariable String id) {
        return recurringRepo.findById(id).map(ri -> {
            SalesInvoice inv = generateInvoice(ri);
            if (inv == null)
                return ResponseEntity.badRequest().body(Map.of("error", "Invoice generation failed"));

            // Update recurring: increment count, set next run date
            ri.setTotalRuns(ri.getTotalRuns() + 1);
            ri.setLastRunDate(LocalDate.now());
            ri.setNextRunDate(calculateNextRunDate(ri, LocalDate.now()));

            // Check if maxRuns reached
            if (ri.getMaxRuns() > 0 && ri.getTotalRuns() >= ri.getMaxRuns())
                ri.setStatus("COMPLETED");
            if (ri.getEndDate() != null && LocalDate.now().isAfter(ri.getEndDate()))
                ri.setStatus("COMPLETED");

            recurringRepo.save(ri);
            auditLogService.logCreate("Sales",
                "Recurring invoice generated: " + inv.getInvoiceNumber() + " for " + ri.getCustomerName());
            return ResponseEntity.ok(Map.of("invoice", inv, "recurring", ri));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Upcoming recurring — dashboard sathi ───────────────────────────
    @GetMapping("/upcoming")
    public List<RecurringInvoice> getUpcoming(
            @RequestParam(defaultValue = "30") int days) {
        LocalDate cutoff = LocalDate.now().plusDays(days);
        return recurringRepo.findByStatus("ACTIVE").stream()
            .filter(r -> r.getNextRunDate() != null && !r.getNextRunDate().isAfter(cutoff))
            .sorted(Comparator.comparing(RecurringInvoice::getNextRunDate))
            .collect(java.util.stream.Collectors.toList());
    }

    private SalesInvoice generateInvoice(RecurringInvoice ri) {
        try {
            SalesInvoice inv = new SalesInvoice();
            inv.setCustomerId(ri.getCustomerId());
            inv.setCustomerName(ri.getCustomerName());
            inv.setCustomerGstin(ri.getCustomerGstin());
            inv.setCustomerAddress(ri.getCustomerAddress());
            inv.setCustomerState(ri.getCustomerState());
            inv.setCustomerPhone(ri.getCustomerPhone());
            inv.setCustomerEmail(ri.getCustomerEmail());
            inv.setInvoiceDate(LocalDate.now());
            inv.setDueDate(LocalDate.now().plusDays(ri.getDueDays()));
            inv.setInvoiceType(ri.getInvoiceType() != null ? ri.getInvoiceType() : "TAX_INVOICE");
            inv.setStatus("CONFIRMED");
            inv.setPaymentStatus("PENDING");
            inv.setPaymentMode(ri.getPaymentMode());
            inv.setNotes(ri.getNotes());
            inv.setInterState(ri.isInterState());
            inv.setDiscount(ri.getDiscount());
            inv.setActive(true);
            inv.setCancelled(false);

            // Auto invoice number
            long count = invoiceRepo.count();
            inv.setInvoiceNumber("SINV-" + String.format("%04d", count + 1));

            // Items
            List<InvoiceLineItem> items = new ArrayList<>();
            if (ri.getItems() != null) {
                for (RecurringInvoice.InvoiceItemTemplate t : ri.getItems()) {
                    InvoiceLineItem item = new InvoiceLineItem();
                    item.setItemId(t.getItemId());
                    item.setItemName(t.getItemName());
                    item.setHsnCode(t.getHsnCode());
                    item.setQuantity(t.getQuantity());
                    item.setUnit(t.getUnit());
                    item.setRate(t.getRate());
                    item.setDiscount(t.getDiscount());
                    item.setGstRate(t.getGstRate());
                    double base = t.getQuantity() * t.getRate() * (1 - t.getDiscount() / 100.0);
                    double gst  = base * t.getGstRate() / 100.0;
                    item.setTaxableAmount(base);
                    item.setTotalAmount(base + gst);
                    if (ri.isInterState()) {
                        item.setIgstAmount(gst); item.setIgstRate(t.getGstRate());
                    } else {
                        item.setCgstAmount(gst/2); item.setSgstAmount(gst/2);
                        item.setCgstRate(t.getGstRate()/2); item.setSgstRate(t.getGstRate()/2);
                    }
                    items.add(item);
                }
            }
            inv.setItems(items);

            double sub = items.stream().mapToDouble(InvoiceLineItem::getTaxableAmount).sum();
            double cgst = items.stream().mapToDouble(InvoiceLineItem::getCgstAmount).sum();
            double sgst = items.stream().mapToDouble(InvoiceLineItem::getSgstAmount).sum();
            double igst = items.stream().mapToDouble(InvoiceLineItem::getIgstAmount).sum();
            inv.setSubTotal(sub);
            inv.setTotalCgst(cgst); inv.setTotalSgst(sgst); inv.setTotalIgst(igst);
            inv.setTotalGst(cgst+sgst+igst);
            inv.setGrandTotal(sub+cgst+sgst+igst);
            inv.setBalanceDue(inv.getGrandTotal());

            return invoiceRepo.save(inv);
        } catch (Exception e) {
            System.err.println("Recurring invoice generation failed: " + e.getMessage());
            return null;
        }
    }

    private LocalDate calculateNextRunDate(RecurringInvoice ri, LocalDate from) {
        if (ri.getFrequency() == null) return from.plusMonths(1);
        LocalDate result;
        switch (ri.getFrequency()) {
            case "DAILY":
                result = from.plusDays(1);
                break;
            case "WEEKLY":
                result = from.plusWeeks(1);
                break;
            case "MONTHLY":
                result = from.plusMonths(1).withDayOfMonth(
                                Math.min(ri.getDayOfMonth(), from.plusMonths(1).lengthOfMonth()));
                break;
            case "QUARTERLY":
                result = from.plusMonths(3);
                break;
            case "YEARLY":
                result = from.plusYears(1);
                break;
            default:
                result = from.plusMonths(1);
                break;
        }
        return result;
    }

    // ── Auto-run recurring invoices every day at 7 AM ───────────────────
    @Scheduled(cron = "0 0 7 * * *")  // Every day 7:00 AM
    public void autoRunDueRecurring() {
        LocalDate today = LocalDate.now();
        java.util.List<RecurringInvoice> due = recurringRepo
            .findByStatusAndNextRunDateLessThanEqual("ACTIVE", today);
        int generated = 0;
        for (RecurringInvoice ri : due) {
            try {
                // Find the controller method via context — generate invoice
                com.erp.model.SalesInvoice inv = generateInvoice(ri);
                if (inv != null) {
                    ri.setTotalRuns(ri.getTotalRuns() + 1);
                    ri.setLastRunDate(today);
                    ri.setNextRunDate(calculateNextRunDate(ri, today));
                    if (ri.getMaxRuns() > 0 && ri.getTotalRuns() >= ri.getMaxRuns())
                        ri.setStatus("COMPLETED");
                    if (ri.getEndDate() != null && today.isAfter(ri.getEndDate()))
                        ri.setStatus("COMPLETED");
                    recurringRepo.save(ri);
                    generated++;
                    auditLogService.logCreate("Sales",
                        "Auto recurring invoice: " + inv.getInvoiceNumber() + " for " + ri.getCustomerName());
                }
            } catch (Exception e) {
                System.err.println("Auto recurring failed for: " + ri.getName() + " - " + e.getMessage());
            }
        }
        if (generated > 0)
            System.out.println("✅ Auto-generated " + generated + " recurring invoices");
    }

}