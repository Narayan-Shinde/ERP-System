package com.erp.controller;

import com.erp.model.StockMovement;
import com.erp.model.GoodsReceiptNote;
import com.erp.model.PurchaseOrder;
import com.erp.model.PurchaseReturn;
import com.erp.repository.*;
import com.erp.service.AuditLogService;
import com.erp.service.AutoPostingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase")
@CrossOrigin(origins = "*")
public class PurchaseExtraController {

    @Autowired private AuditLogService auditLogService;
    @Autowired private AutoPostingService autoPostingService;

    @Autowired private PurchaseOrderRepository poRepo;
    @Autowired private PurchaseReturnRepository returnRepo;
    @Autowired private GoodsReceiptNoteRepository grnRepo;
    @Autowired private InventoryItemRepository itemRepo;
    @Autowired private StockMovementRepository stockMovRepo;
    @Autowired private SupplierRepository supplierRepo;
    @Autowired private PurchaseInvoiceRepository invoiceRepo;

    private void recalcSupplierBalance(String supplierId) {
        supplierRepo.findById(supplierId).ifPresent(sup -> {
            var allInvoices = invoiceRepo.findBySupplierId(supplierId).stream()
                .filter(i -> !i.isCancelled()).collect(java.util.stream.Collectors.toList());
            var allReturns = returnRepo.findBySupplierId(supplierId).stream()
                .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                .collect(java.util.stream.Collectors.toList());

            java.util.Map<String, Double> retMap = new java.util.HashMap<>();
            for (var ret : allReturns) {
                if (ret.getOriginalInvoiceId() == null || ret.getOriginalInvoiceId().isEmpty()) continue;
                retMap.merge(ret.getOriginalInvoiceId(), ret.getGrandTotal(), Double::sum);
            }

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

    @GetMapping("/orders")
    public List<PurchaseOrder> getOrders(@RequestParam(required = false) String status) {
        if (status != null) return poRepo.findByStatus(status);
        return poRepo.findAll();
    }

    @PostMapping("/orders")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE_EXECUTIVE','ACCOUNTANT')")
    public PurchaseOrder createOrder(@RequestBody PurchaseOrder order) {
        if (order.getStatus() == null) order.setStatus("DRAFT");
        if (order.getPoNumber() == null || order.getPoNumber().isEmpty())
            order.setPoNumber("PO-" + String.format("%04d", poRepo.count() + 1));
        if (order.getPoDate() == null) order.setPoDate(LocalDate.now());
        return poRepo.save(order);
    }

    @PutMapping("/orders/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<PurchaseOrder> updateOrder(@PathVariable String id, @RequestBody PurchaseOrder order) {
        return poRepo.findById(id).map(existing -> {
            order.setId(id);
            if (order.getPoNumber() == null || order.getPoNumber().isEmpty())
                order.setPoNumber(existing.getPoNumber());
            return ResponseEntity.ok(poRepo.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/orders/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteOrder(@PathVariable String id) {
        poRepo.deleteById(id);
        return ResponseEntity.ok("Purchase Order deleted");
    }

    @GetMapping("/returns")
    public List<PurchaseReturn> getReturns(@RequestParam(required = false) String financialYear) {
        if (financialYear != null) return returnRepo.findByFinancialYear(financialYear);
        return returnRepo.findAll();
    }

    @PostMapping("/returns/fix-invoice-status")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<?> fixInvoiceStatuses() {
        List<PurchaseReturn> completedReturns = returnRepo.findAll().stream()
            .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
            .collect(java.util.stream.Collectors.toList());
        int fixed = 0;
        for (PurchaseReturn pr : completedReturns) {
            if (pr.getOriginalInvoiceId() == null || pr.getOriginalInvoiceId().isEmpty()) continue;
            var invoiceOpt = invoiceRepo.findById(pr.getOriginalInvoiceId());
            if (invoiceOpt.isEmpty()) continue;
            var invoice = invoiceOpt.get();
            if ("RETURNED".equals(invoice.getPaymentStatus()) || "PAID".equals(invoice.getPaymentStatus())) continue;
            double returnAmt  = pr.getGrandTotal();
            double keptGoods  = invoice.getGrandTotal() - returnAmt;
            double newDue     = keptGoods - invoice.getPaidAmount(); // negative = supplier owes us
            invoice.setBalanceDue(newDue);
            if (returnAmt >= invoice.getGrandTotal() - 0.01 || (newDue < -0.01)) {
                invoice.setPaymentStatus("RETURNED");
                invoice.setCreditApplied(0.0);
            } else if (newDue <= 0.01) {
                invoice.setPaymentStatus("PAID");
            } else {
                invoice.setPaymentStatus("PARTIAL");
            }
            invoiceRepo.save(invoice);
            fixed++;
        }
        return ResponseEntity.ok(Map.of("fixed", fixed, "message", fixed + " invoices updated"));
    }

    @PostMapping("/returns")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<?> createReturn(@RequestBody PurchaseReturn pr) {
        if (pr.getStatus() == null) pr.setStatus("PENDING");
        if (pr.getReturnNumber() == null || pr.getReturnNumber().isEmpty())
            pr.setReturnNumber("PRN-" + String.format("%04d", returnRepo.count() + 1));
        if (pr.getReturnDate() == null) pr.setReturnDate(LocalDate.now());

        if (pr.getOriginalInvoiceId() != null && !pr.getOriginalInvoiceId().isEmpty()
                && pr.getItems() != null) {
            var invoiceOpt = invoiceRepo.findById(pr.getOriginalInvoiceId());
            if (invoiceOpt.isPresent()) {
                var invoice = invoiceOpt.get();
                java.util.Map<String, Double> invoiceQtyMap = new java.util.HashMap<>();
                if (invoice.getItems() != null)
                    invoice.getItems().forEach(it -> invoiceQtyMap.put(it.getItemId(), it.getQuantity()));

                java.util.Map<String, Double> alreadyReturnedMap = new java.util.HashMap<>();
                returnRepo.findAll().stream()
                    .filter(r -> pr.getOriginalInvoiceId().equals(r.getOriginalInvoiceId())
                        && ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus())))
                    .forEach(r -> { if (r.getItems() != null)
                        r.getItems().forEach(ri -> alreadyReturnedMap.merge(ri.getItemId(), ri.getQuantity(), Double::sum)); });

                for (PurchaseReturn.ReturnItem ri : pr.getItems()) {
                    if (ri.getItemId() == null || ri.getItemId().isEmpty()) continue;
                    double invoiceQty   = invoiceQtyMap.getOrDefault(ri.getItemId(), 0.0);
                    double alreadyRet   = alreadyReturnedMap.getOrDefault(ri.getItemId(), 0.0);
                    double maxReturnable = invoiceQty - alreadyRet;
                    if (ri.getQuantity() > maxReturnable + 0.001)
                        return ResponseEntity.badRequest().body(
                            Map.of("error", "Item '" + ri.getItemName() + "': can return max "
                                + maxReturnable + " (already returned " + alreadyRet + " of " + invoiceQty + ")"));

                    var itemOpt = itemRepo.findById(ri.getItemId());
                    if (itemOpt.isPresent()) {
                        double currentStock = itemOpt.get().getCurrentStock();
                        if (ri.getQuantity() > currentStock + 0.001)
                            return ResponseEntity.badRequest().body(
                                Map.of("error", "Item '" + ri.getItemName() + "': only " + currentStock
                                    + " in stock, cannot return " + ri.getQuantity()));
                    }
                }
            }
        }

        PurchaseReturn saved = returnRepo.save(pr);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/returns/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<PurchaseReturn> updateReturn(@PathVariable String id, @RequestBody PurchaseReturn pr) {
        return returnRepo.findById(id).map(existing -> {
            pr.setId(id);
            PurchaseReturn saved = returnRepo.save(pr);

            boolean isNowApproved = ("APPROVED".equals(pr.getStatus()) || "COMPLETED".equals(pr.getStatus()))
                && !("APPROVED".equals(existing.getStatus()) || "COMPLETED".equals(existing.getStatus()));
            if (isNowApproved) {
                if (pr.getItems() != null) {
                    for (PurchaseReturn.ReturnItem item : pr.getItems()) {
                        if (item.getItemId() == null || item.getItemId().isEmpty()) continue;
                        itemRepo.findById(item.getItemId()).ifPresent(invItem -> {
                            double newStock = Math.max(0, invItem.getCurrentStock() - item.getQuantity());
                            invItem.setCurrentStock(newStock);
                            itemRepo.save(invItem);
                            StockMovement sm = new StockMovement();
                            sm.setItemId(invItem.getId());
                            sm.setItemName(invItem.getItemName());
                            sm.setMovementType("STOCK_OUT");
                            sm.setReferenceType("PURCHASE_RETURN");
                            sm.setReferenceNumber(pr.getReturnNumber() != null ? pr.getReturnNumber() : id);
                            sm.setQuantity(item.getQuantity());
                            sm.setUnit(invItem.getUnit());
                            sm.setBalanceQty(newStock);
                            sm.setMovementDate(java.time.LocalDate.now());
                            sm.setCreatedAt(java.time.LocalDateTime.now());
                            stockMovRepo.save(sm);
                        });
                    }
                }
                if (pr.getOriginalInvoiceId() != null && !pr.getOriginalInvoiceId().isEmpty()) {
                    invoiceRepo.findById(pr.getOriginalInvoiceId()).ifPresent(invoice -> {
                        double returnAmt    = pr.getGrandTotal();
                        double cashPaid     = invoice.getPaidAmount();
                        double creditAmt    = invoice.getCreditApplied(); // supplier owes us credit
                        double invoiceTotal = invoice.getGrandTotal();
                        double keptGoods    = invoiceTotal - returnAmt;
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

                String suppId = pr.getSupplierId();
                if (suppId != null) {
                    recalcSupplierBalance(suppId);
                }
            }
            // ── Auto-post to ledger on approve ──
                if (isNowApproved) {
                    autoPostingService.postPurchaseReturn(
                        pr.getReturnNumber() != null ? pr.getReturnNumber() : id,
                        pr.getSupplierName() != null ? pr.getSupplierName() : "Supplier",
                        pr.getSubTotal() != 0 ? pr.getSubTotal() : pr.getGrandTotal(),
                        pr.getTotalGst() != 0 ? pr.getTotalGst() : 0,
                        pr.getGrandTotal(),
                        pr.getFinancialYear()
                    );
                }
                auditLogService.logReturn("Purchase", "Return " + pr.getStatus() + ": " + pr.getReturnNumber() + " | " + pr.getSupplierName() + " | ₹" + pr.getGrandTotal());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/grn")
    public List<GoodsReceiptNote> getGRNs(@RequestParam(required = false) String supplierId) {
        if (supplierId != null) return grnRepo.findBySupplierId(supplierId);
        return grnRepo.findAll();
    }

    @PostMapping("/grn")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE_EXECUTIVE','ACCOUNTANT')")
    public GoodsReceiptNote createGRN(@RequestBody GoodsReceiptNote grn) {
        if (grn.getStatus() == null) grn.setStatus("RECEIVED");
        if (grn.getGrnNumber() == null || grn.getGrnNumber().isEmpty())
            grn.setGrnNumber("GRN-" + String.format("%04d", grnRepo.count() + 1));
        if (grn.getReceivedDate() == null) grn.setReceivedDate(LocalDate.now());
        return grnRepo.save(grn);
    }

    @PutMapping("/grn/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE_EXECUTIVE','ACCOUNTANT')")
    public ResponseEntity<GoodsReceiptNote> updateGRN(@PathVariable String id, @RequestBody GoodsReceiptNote grn) {
        return grnRepo.findById(id).map(g -> {
            grn.setId(id);
            return ResponseEntity.ok(grnRepo.save(grn));
        }).orElse(ResponseEntity.notFound().build());
    }
}
