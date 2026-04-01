package com.erp.controller;

import com.erp.model.StockTransfer;
import com.erp.model.StockMovement;
import com.erp.repository.*;
import com.erp.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/inventory/stock-transfers")
public class StockTransferController {

    @Autowired private StockTransferRepository transferRepo;
    @Autowired private InventoryItemRepository itemRepo;
    @Autowired private WarehouseRepository warehouseRepo;
    @Autowired private StockMovementRepository stockMovRepo;
    @Autowired private AuditLogService auditLogService;

    @GetMapping
    public List<StockTransfer> getAll(@RequestParam(required=false) String status,
                                       @RequestParam(required=false) String financialYear) {
        if (status != null) return transferRepo.findByStatus(status);
        if (financialYear != null) return transferRepo.findByFinancialYear(financialYear);
        return transferRepo.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public ResponseEntity<?> create(@RequestBody StockTransfer transfer) {
        if (transfer.getTransferNumber() == null || transfer.getTransferNumber().isBlank())
            transfer.setTransferNumber("TRF-" + String.format("%04d", transferRepo.count() + 1));
        if (transfer.getStatus() == null) transfer.setStatus("PENDING");
        if (transfer.getTransferDate() == null) transfer.setTransferDate(LocalDate.now());
        transfer.setCreatedAt(LocalDateTime.now());

        // Validate stock availability
        if (transfer.getItems() != null) {
            for (StockTransfer.TransferItem item : transfer.getItems()) {
                if (item.getItemId() == null) continue;
                var itemOpt = itemRepo.findById(item.getItemId());
                if (itemOpt.isPresent()) {
                    if (item.getQuantity() > itemOpt.get().getCurrentStock()) {
                        return ResponseEntity.badRequest().body(Map.of(
                            "error", "Insufficient stock for '" + item.getItemName() +
                                     "'. Available: " + itemOpt.get().getCurrentStock() +
                                     ", Required: " + item.getQuantity()
                        ));
                    }
                }
            }
        }

        StockTransfer saved = transferRepo.save(transfer);

        // If COMPLETED directly, process stock movement
        if ("COMPLETED".equals(transfer.getStatus())) {
            processTransfer(saved);
        }

        auditLogService.logCreate("Inventory",
            "Stock Transfer " + saved.getTransferNumber() +
            ": " + saved.getFromWarehouseName() + " → " + saved.getToWarehouseName());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody StockTransfer transfer) {
        return transferRepo.findById(id).map(existing -> {
            boolean wasCompleted = "COMPLETED".equals(existing.getStatus());
            boolean nowCompleted = "COMPLETED".equals(transfer.getStatus());

            transfer.setId(id);
            transfer.setTransferNumber(existing.getTransferNumber());
            StockTransfer saved = transferRepo.save(transfer);

            // Process stock when status changes to COMPLETED
            if (!wasCompleted && nowCompleted) {
                processTransfer(saved);
                auditLogService.logUpdate("Inventory",
                    "Stock Transfer COMPLETED: " + saved.getTransferNumber());
            }
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StockTransfer> getOne(@PathVariable String id) {
        return transferRepo.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable String id) {
        return transferRepo.findById(id).map(t -> {
            if ("COMPLETED".equals(t.getStatus()))
                return ResponseEntity.badRequest().body(
                    Map.of("error", "Completed transfer cannot be deleted"));
            transferRepo.delete(t);
            return ResponseEntity.ok(Map.of("message", "Transfer deleted"));
        }).orElse(ResponseEntity.notFound().build());
    }

    private void processTransfer(StockTransfer transfer) {
        if (transfer.getItems() == null) return;
        LocalDate now = LocalDate.now();

        for (StockTransfer.TransferItem item : transfer.getItems()) {
            if (item.getItemId() == null) continue;
            itemRepo.findById(item.getItemId()).ifPresent(invItem -> {
                // Deduct from source
                double newStock = Math.max(0, invItem.getCurrentStock() - item.getQuantity());
                invItem.setCurrentStock(newStock);
                itemRepo.save(invItem);

                // Stock OUT from source
                StockMovement smOut = new StockMovement();
                smOut.setItemId(invItem.getId());
                smOut.setItemName(invItem.getItemName());
                smOut.setMovementType("TRANSFER_OUT");
                smOut.setReferenceType("STOCK_TRANSFER");
                smOut.setReferenceNumber(transfer.getTransferNumber());
                smOut.setQuantity(item.getQuantity());
                smOut.setUnit(invItem.getUnit());
                smOut.setBalanceQty(newStock);
                smOut.setMovementDate(now);
                smOut.setCreatedAt(LocalDateTime.now());
                smOut.setNarration(transfer.getFromWarehouseName() + " → " + transfer.getToWarehouseName());
                stockMovRepo.save(smOut);

                // Stock IN to destination (same item, toWarehouse noted in narration)
                StockMovement smIn = new StockMovement();
                smIn.setItemId(invItem.getId());
                smIn.setItemName(invItem.getItemName());
                smIn.setMovementType("TRANSFER_IN");
                smIn.setReferenceType("STOCK_TRANSFER");
                smIn.setReferenceNumber(transfer.getTransferNumber());
                smIn.setQuantity(item.getQuantity());
                smIn.setUnit(invItem.getUnit());
                smIn.setBalanceQty(newStock + item.getQuantity());
                smIn.setMovementDate(now);
                smIn.setCreatedAt(LocalDateTime.now());
                smIn.setNarration(transfer.getFromWarehouseName() + " → " + transfer.getToWarehouseName());
                stockMovRepo.save(smIn);
            });
        }
    }
}
