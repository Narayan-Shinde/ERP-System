package com.erp.controller;

import com.erp.model.SalesInvoice;
import com.erp.model.StockMovement;
import com.erp.model.Customer;
import com.erp.model.SalesOrder;
import com.erp.model.SalesReturn;
import com.erp.repository.*;
import com.erp.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/sales")
@CrossOrigin(origins = "*")
public class SalesExtraController {

    @Autowired private AuditLogService auditLogService;

    @Autowired private SalesOrderRepository soRepo;
    @Autowired private SalesReturnRepository returnRepo;
    @Autowired private com.erp.service.AutoPostingService autoPostingService;
    @Autowired private SalesInvoiceRepository invoiceRepo;
    @Autowired private InventoryItemRepository itemRepo;
    @Autowired private StockMovementRepository stockMovRepo;
    @Autowired private CustomerRepository customerRepo;

    @GetMapping("/orders")
    public List<SalesOrder> getOrders(@RequestParam(required = false) String status) {
        if (status != null) return soRepo.findByStatus(status);
        return soRepo.findAll();
    }

    @PostMapping("/orders")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_EXECUTIVE','ACCOUNTANT')")
    public SalesOrder createOrder(@RequestBody SalesOrder order) {
        if (order.getStatus() == null) order.setStatus("CONFIRMED");
        if (order.getSoNumber() == null || order.getSoNumber().isEmpty())
            order.setSoNumber("SO-" + String.format("%04d", soRepo.count() + 1));
        if (order.getOrderDate() == null) order.setOrderDate(LocalDate.now());
        return soRepo.save(order);
    }

    @PutMapping("/orders/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<SalesOrder> updateOrder(@PathVariable String id, @RequestBody SalesOrder order) {
        return soRepo.findById(id).map(existing -> {
            order.setId(id);
            if (order.getSoNumber() == null || order.getSoNumber().isEmpty())
                order.setSoNumber(existing.getSoNumber());
            return ResponseEntity.ok(soRepo.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/orders/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteOrder(@PathVariable String id) {
        soRepo.deleteById(id);
        return ResponseEntity.ok("Sales Order deleted");
    }

    @GetMapping("/returns")
    public List<SalesReturn> getReturns(@RequestParam(required = false) String financialYear) {
        if (financialYear != null) return returnRepo.findByFinancialYear(financialYear);
        return returnRepo.findAll();
    }

    @PostMapping("/returns")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> createReturn(@RequestBody SalesReturn sr) {
        if (sr.getStatus() == null) sr.setStatus("PENDING");
        if (sr.getReturnNumber() == null || sr.getReturnNumber().isEmpty())
            sr.setReturnNumber("SRN-" + String.format("%04d", returnRepo.count() + 1));
        if (sr.getReturnDate() == null) sr.setReturnDate(LocalDate.now());

        if (sr.getOriginalInvoiceId() != null && !sr.getOriginalInvoiceId().isEmpty()
                && sr.getItems() != null) {
            java.util.Optional<SalesInvoice> invoiceOpt = invoiceRepo.findById(sr.getOriginalInvoiceId());
            if (invoiceOpt.isPresent()) {
                SalesInvoice invoice = invoiceOpt.get();
                java.util.Map<String, Double> invoiceQtyMap = new java.util.HashMap<>();
                if (invoice.getItems() != null)
                    invoice.getItems().forEach(it -> invoiceQtyMap.put(it.getItemId(), it.getQuantity()));

                java.util.Map<String, Double> alreadyReturnedMap = new java.util.HashMap<>();
                returnRepo.findAll().stream()
                    .filter(r -> sr.getOriginalInvoiceId().equals(r.getOriginalInvoiceId())
                        && ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus())))
                    .forEach(r -> { if (r.getItems() != null)
                        r.getItems().forEach(ri -> alreadyReturnedMap.merge(ri.getItemId(), ri.getQuantity(), Double::sum)); });

                for (SalesReturn.ReturnItem ri : sr.getItems()) {
                    if (ri.getItemId() == null || ri.getItemId().isEmpty()) continue;
                    double invoiceQty    = invoiceQtyMap.getOrDefault(ri.getItemId(), 0.0);
                    double alreadyRet    = alreadyReturnedMap.getOrDefault(ri.getItemId(), 0.0);
                    double maxReturnable = invoiceQty - alreadyRet;
                    if (ri.getQuantity() > maxReturnable + 0.001)
                        return ResponseEntity.badRequest().body(
                            java.util.Map.of("error", "Item '" + ri.getItemName() + "': can return max "
                                + maxReturnable + " (already returned " + alreadyRet + " of " + invoiceQty + ")"));
                }
            }
        }

        return ResponseEntity.ok(returnRepo.save(sr));
    }

    @DeleteMapping("/returns/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteReturn(@PathVariable String id) {
        return returnRepo.findById(id).map(ret -> {
            // फक्त PENDING returns delete होतात
            if ("APPROVED".equals(ret.getStatus()) || "COMPLETED".equals(ret.getStatus())) {
                return ResponseEntity.badRequest().body(
                    java.util.Map.of("error", "Approved/Completed return delete करता येत नाही"));
            }
            returnRepo.deleteById(id);
            return ResponseEntity.ok(java.util.Map.of("message", "Return deleted"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/returns/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<SalesReturn> updateReturn(@PathVariable String id, @RequestBody SalesReturn sr) {
        return returnRepo.findById(id).map(existing -> {
            sr.setId(id);
            SalesReturn saved = returnRepo.save(sr);

            boolean wasAlreadyApproved = "APPROVED".equals(existing.getStatus()) || "COMPLETED".equals(existing.getStatus());
            if ("APPROVED".equals(sr.getStatus()) && !wasAlreadyApproved) {
                if (sr.getItems() != null) {
                    for (SalesReturn.ReturnItem item : sr.getItems()) {
                        if (item.getItemId() == null || item.getItemId().isEmpty()) continue;
                        itemRepo.findById(item.getItemId()).ifPresent(invItem -> {
                            invItem.setCurrentStock(invItem.getCurrentStock() + item.getQuantity());
                            itemRepo.save(invItem);
                            StockMovement sm = new StockMovement();
                            sm.setItemId(invItem.getId());
                            sm.setItemName(invItem.getItemName());
                            sm.setMovementType("STOCK_IN");
                            sm.setReferenceType("SALES_RETURN");
                            sm.setReferenceNumber(sr.getReturnNumber() != null ? sr.getReturnNumber() : id);
                            sm.setQuantity(item.getQuantity());
                            sm.setUnit(invItem.getUnit());
                            sm.setBalanceQty(invItem.getCurrentStock());
                            sm.setMovementDate(java.time.LocalDate.now());
                            sm.setCreatedAt(java.time.LocalDateTime.now());
                            stockMovRepo.save(sm);
                        });
                    }
                }
                if (sr.getOriginalInvoiceId() != null && !sr.getOriginalInvoiceId().isEmpty()) {
                    invoiceRepo.findById(sr.getOriginalInvoiceId()).ifPresent(invoice -> {
                        double returnAmt     = sr.getGrandTotal();
                        double cashPaid      = invoice.getPaidAmount();
                        double creditAmt     = invoice.getCreditApplied(); // we owe customer credit
                        double invoiceTotal  = invoice.getGrandTotal();
                        double keptGoods     = invoiceTotal - returnAmt;
                        double effectivePaid = cashPaid + creditAmt;
                        double newDue        = keptGoods - effectivePaid;
                        invoice.setBalanceDue(newDue);
                        if (returnAmt >= invoiceTotal - 0.01 || newDue < -0.01) {
                            invoice.setPaymentStatus("RETURNED");
                            invoice.setCreditApplied(0.0);
                        } else if (newDue <= 0.01) {
                            invoice.setPaymentStatus("PAID");
                        } else {
                            invoice.setPaymentStatus("PARTIAL");
                        }
                        invoiceRepo.save(invoice);
                    });
                }

                if (sr.getCustomerId() != null) {
                    final String custId = sr.getCustomerId();
                    customerRepo.findById(custId).ifPresent(cust -> {
                        java.util.List<SalesInvoice> allInv = invoiceRepo.findByCustomerId(custId).stream()
                            .filter(i -> !i.isCancelled()).collect(java.util.stream.Collectors.toList());
                        java.util.List<SalesReturn> allRet = returnRepo.findByCustomerId(custId).stream()
                            .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                            .collect(java.util.stream.Collectors.toList());

                        java.util.Map<String, Double> retMap = new java.util.HashMap<>();
                        for (SalesReturn ret : allRet) {
                            if (ret.getOriginalInvoiceId() == null) continue;
                            retMap.merge(ret.getOriginalInvoiceId(), ret.getGrandTotal(), Double::sum);
                        }
                        double customerOwes = 0, weOweCustomer = 0;
                        for (SalesInvoice inv : allInv) {
                            double returnAmt = Math.min(retMap.getOrDefault(inv.getId(), 0.0), inv.getGrandTotal());
                            double keptGoods = inv.getGrandTotal() - returnAmt;
                            double paid      = inv.getPaidAmount();
                            customerOwes  += Math.max(0, keptGoods - paid);
                            weOweCustomer += Math.max(0, paid - keptGoods);
                        }
                        double balance = cust.getOpeningBalance() + customerOwes - weOweCustomer;
                        cust.setCurrentBalance(balance);
                        cust.setBalanceType(balance >= 0 ? "DEBIT" : "CREDIT");
                        customerRepo.save(cust);
                    });
                }
            }
            if ("APPROVED".equals(sr.getStatus()) || "COMPLETED".equals(sr.getStatus())) {
                auditLogService.logReturn("Sales", "Return approved: " + sr.getReturnNumber() + " | " + sr.getCustomerName() + " | ₹" + sr.getGrandTotal());
                // ── Post ledger entries for sales return ──
                if (!("APPROVED".equals(existing.getStatus()) || "COMPLETED".equals(existing.getStatus()))) {
                    autoPostingService.postSalesReturn(
                        sr.getReturnNumber() != null ? sr.getReturnNumber() : id,
                        sr.getCustomerName() != null ? sr.getCustomerName() : "Customer",
                        sr.getSubTotal() != 0 ? sr.getSubTotal() : sr.getGrandTotal(),
                        sr.getTotalGst() != 0 ? sr.getTotalGst() : 0,
                        sr.getGrandTotal(),
                        sr.getFinancialYear()
                    );
                }
            }
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }
}
