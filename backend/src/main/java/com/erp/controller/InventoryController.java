package com.erp.controller;

import com.erp.model.InventoryItem;
import com.erp.model.StockMovement;
import com.erp.repository.InventoryItemRepository;
import com.erp.repository.StockMovementRepository;
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
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*")
public class InventoryController {

    @Autowired private AuditLogService auditLogService;
    @Autowired private InventoryItemRepository itemRepo;
    @Autowired private StockMovementRepository stockMovRepo;

    // ─────────────────── ITEMS ───────────────────

    @GetMapping("/items")
    public List<InventoryItem> getItems(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly) {
        List<InventoryItem> all = activeOnly ? itemRepo.findByActiveTrue() : itemRepo.findAll();
        if (category != null && !category.isEmpty())
            all = all.stream().filter(i -> category.equals(i.getCategoryId())).collect(Collectors.toList());
        if (search != null && !search.isEmpty()) {
            String s = search.toLowerCase();
            all = all.stream().filter(i ->
                (i.getItemName()  != null && i.getItemName().toLowerCase().contains(s)) ||
                (i.getItemCode()  != null && i.getItemCode().toLowerCase().contains(s)) ||
                (i.getHsnCode()   != null && i.getHsnCode().toLowerCase().contains(s)) ||
                (i.getBarcode()   != null && i.getBarcode().toLowerCase().contains(s))
            ).collect(Collectors.toList());
        }
        return all;
    }

    @PostMapping("/items")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public ResponseEntity<?> createItem(@RequestBody InventoryItem item) {
        if (item.getItemName() == null || item.getItemName().trim().isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Item name is required"));
        if (item.getPurchaseRate() < 0)
            return ResponseEntity.badRequest().body(Map.of("error", "Purchase rate cannot be negative"));
        if (item.getSalesRate() < 0)
            return ResponseEntity.badRequest().body(Map.of("error", "Sales rate cannot be negative"));

        item.setActive(true);
        item.setCreatedAt(LocalDateTime.now());

        // Auto-generate item code
        if (item.getItemCode() == null || item.getItemCode().trim().isEmpty())
            item.setItemCode("ITEM-" + String.format("%04d", itemRepo.count() + 1));

        // Defaults
        if (item.getUnit() == null || item.getUnit().isEmpty()) item.setUnit("Nos");
        if (item.getReorderLevel() <= 0) item.setReorderLevel(10);
        if (item.getGstRate() <= 0) item.setGstRate(18);

        // Auto-generate barcode if not provided
        if (item.getBarcode() == null || item.getBarcode().trim().isEmpty())
            item.setBarcode(generateEAN13());

        item.setCurrentStock(item.getOpeningStock());

        InventoryItem saved = itemRepo.save(item);
        auditLogService.logCreate("Inventory",
            "Item created: " + saved.getItemName() + " | SKU: " + saved.getItemCode() +
            " | Stock: " + saved.getCurrentStock() + " | Purchase: ₹" + saved.getPurchaseRate());

        // Opening stock movement
        if (saved.getCurrentStock() > 0) {
            createStockMovement(saved.getId(), saved.getItemName(), "OPENING", "MANUAL",
                "OPENING-STOCK", saved.getCurrentStock(), saved.getCurrentStock(),
                saved.getPurchaseRate(), saved.getUnit(), LocalDate.now());
        }

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<InventoryItem> getItem(@PathVariable String id) {
        return itemRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/items/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public ResponseEntity<?> updateItem(@PathVariable String id, @RequestBody InventoryItem item) {
        // ── Name required ──
        if (item.getItemName() == null || item.getItemName().trim().isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Item name required aahe!"));

        // ── Duplicate name check (exclude self) ──
        String normItemName = item.getItemName().trim().toLowerCase().replaceAll("\\s+", " ");
        boolean nameEx = itemRepo.findAll().stream()
            .filter(x -> !x.getId().equals(id) && x.isActive() != Boolean.FALSE)
            .anyMatch(x -> normItemName.equalsIgnoreCase(
                x.getItemName() != null ? x.getItemName().trim().toLowerCase().replaceAll("\\s+", " ") : ""));
        if (nameEx)
            return ResponseEntity.badRequest().body(Map.of("error",
                "Item '" + item.getItemName().trim() + "' already exists! Duplicate nahi chalnar."));

        return itemRepo.findById(id).map(existing -> {
            item.setId(id);
            item.setActive(existing.isActive());
            item.setItemCode(existing.getItemCode()); // preserve code
            item.setCurrentStock(existing.getCurrentStock()); // preserve stock
            item.setCreatedAt(existing.getCreatedAt());
            // Preserve barcode if not provided
            if (item.getBarcode() == null || item.getBarcode().trim().isEmpty())
                item.setBarcode(existing.getBarcode());
            InventoryItem updated = itemRepo.save(item);
            auditLogService.logUpdate("Inventory",
                "Item updated: " + updated.getItemName() + " | Purchase: ₹" + updated.getPurchaseRate() +
                " | Sales: ₹" + updated.getSalesRate());
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/items/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteItem(@PathVariable String id) {
        return itemRepo.findById(id).map(item -> {
            if (item.getCurrentStock() > 0)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Cannot delete item with stock " + item.getCurrentStock() + ". Adjust stock to 0 first."));
            item.setActive(false);
            itemRepo.save(item);
            auditLogService.logDelete("Inventory", "Item deactivated: " + item.getItemName());
            return ResponseEntity.ok(Map.of("message", "Item deactivated successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────── LOW STOCK ───────────────────

    @GetMapping("/items/low-stock")
    public List<InventoryItem> getLowStockItems() {
        return itemRepo.findByActiveTrue().stream()
            .filter(i -> i.getCurrentStock() <= i.getReorderLevel())
            .sorted(Comparator.comparingDouble(InventoryItem::getCurrentStock))
            .collect(Collectors.toList());
    }

    // ─────────────────── STOCK ADJUST ───────────────────

    @PutMapping("/items/{id}/stock")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public ResponseEntity<?> adjustStock(@PathVariable String id,
            @RequestParam double quantity,
            @RequestParam(required = false, defaultValue = "MANUAL") String type,
            @RequestParam(required = false, defaultValue = "Manual Adjustment") String reason) {
        return itemRepo.findById(id).map(item -> {
            double newStock = item.getCurrentStock() + quantity;
            if (newStock < 0)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Cannot reduce stock below 0. Current: " + item.getCurrentStock()));
            item.setCurrentStock(newStock);
            itemRepo.save(item);
            createStockMovement(item.getId(), item.getItemName(),
                quantity > 0 ? "STOCK_IN" : "STOCK_OUT", type, reason,
                Math.abs(quantity), newStock, item.getPurchaseRate(), item.getUnit(), LocalDate.now());
            auditLogService.logUpdate("Inventory",
                "Stock adjusted: " + item.getItemName() + " | Change: " + quantity + " | New: " + newStock);
            return ResponseEntity.ok(item);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────── BARCODE ───────────────────

    @GetMapping("/items/{id}/barcode")
    public ResponseEntity<?> getBarcode(@PathVariable String id) {
        return itemRepo.findById(id).map(item -> {
            if (item.getBarcode() == null || item.getBarcode().isEmpty()) {
                item.setBarcode(generateEAN13());
                itemRepo.save(item);
            }
            return ResponseEntity.ok(Map.of(
                "itemId",   item.getId(),
                "itemName", item.getItemName(),
                "itemCode", item.getItemCode(),
                "barcode",  item.getBarcode(),
                "barcodeType", item.getBarcodeType() != null ? item.getBarcodeType() : "CODE128",
                "salesRate", item.getSalesRate(),
                "hsnCode",  item.getHsnCode() != null ? item.getHsnCode() : ""
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/items/{id}/barcode")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public ResponseEntity<?> updateBarcode(@PathVariable String id,
            @RequestParam(required = false) String barcode,
            @RequestParam(required = false, defaultValue = "CODE128") String barcodeType) {
        return itemRepo.findById(id).map(item -> {
            item.setBarcode(barcode != null && !barcode.isEmpty() ? barcode : generateEAN13());
            item.setBarcodeType(barcodeType);
            itemRepo.save(item);
            return ResponseEntity.ok(Map.of("barcode", item.getBarcode(), "barcodeType", item.getBarcodeType()));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────── BATCH / EXPIRY ───────────────────

    @GetMapping("/items/{id}/batches")
    public ResponseEntity<?> getBatches(@PathVariable String id) {
        return itemRepo.findById(id).map(item -> {
            List<InventoryItem.BatchEntry> batches = item.getBatches() != null ? item.getBatches() : new ArrayList<>();
            return ResponseEntity.ok(Map.of(
                "itemId",   item.getId(),
                "itemName", item.getItemName(),
                "batches",  batches,
                "batchTracking", item.isBatchTracking()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/items/{id}/batches")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public ResponseEntity<?> addBatch(@PathVariable String id,
            @RequestBody InventoryItem.BatchEntry batch) {
        return itemRepo.findById(id).map(item -> {
            if (!item.isBatchTracking())
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Batch tracking is not enabled for this item. Enable it in item settings first."));
            if (batch.getBatchNumber() == null || batch.getBatchNumber().trim().isEmpty())
                return ResponseEntity.badRequest().body(Map.of("error", "Batch number is required"));
            if (batch.getQuantity() <= 0)
                return ResponseEntity.badRequest().body(Map.of("error", "Quantity must be greater than 0"));

            List<InventoryItem.BatchEntry> batches = item.getBatches() != null ?
                new ArrayList<>(item.getBatches()) : new ArrayList<>();

            // Check duplicate batch number
            boolean exists = batches.stream()
                .anyMatch(b -> batch.getBatchNumber().equals(b.getBatchNumber()) && b.isActive());
            if (exists)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Batch number " + batch.getBatchNumber() + " already exists for this item"));

            batch.setActive(true);
            if (batch.getReceivedDate() == null) batch.setReceivedDate(LocalDate.now());
            batches.add(batch);
            item.setBatches(batches);

            // Update stock
            item.setCurrentStock(item.getCurrentStock() + batch.getQuantity());
            itemRepo.save(item);

            createStockMovement(item.getId(), item.getItemName(), "STOCK_IN", "BATCH_RECEIVED",
                "BATCH-" + batch.getBatchNumber(), batch.getQuantity(), item.getCurrentStock(),
                batch.getPurchaseRate() > 0 ? batch.getPurchaseRate() : item.getPurchaseRate(),
                item.getUnit(), batch.getReceivedDate());

            auditLogService.logCreate("Inventory",
                "Batch added: " + item.getItemName() + " | Batch: " + batch.getBatchNumber() +
                " | Qty: " + batch.getQuantity() + " | Expiry: " + batch.getExpiryDate());

            return ResponseEntity.ok(item);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────── PRICE LISTS ───────────────────

    @GetMapping("/items/{id}/price-lists")
    public ResponseEntity<?> getPriceLists(@PathVariable String id) {
        return itemRepo.findById(id).map(item ->
            ResponseEntity.ok(Map.of(
                "itemId",     item.getId(),
                "itemName",   item.getItemName(),
                "salesRate",  item.getSalesRate(),
                "mrp",        item.getMrp(),
                "priceLists", item.getPriceLists() != null ? item.getPriceLists() : new ArrayList<>()
            ))
        ).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/items/{id}/price-lists")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> updatePriceLists(@PathVariable String id,
            @RequestBody List<InventoryItem.PriceList> priceLists) {
        return itemRepo.findById(id).map(item -> {
            item.setPriceLists(priceLists);
            InventoryItem saved = itemRepo.save(item);
            auditLogService.logUpdate("Inventory",
                "Price lists updated: " + item.getItemName() + " | Lists: " + priceLists.size());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────── IMAGE ───────────────────

    @PutMapping("/items/{id}/image")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public ResponseEntity<?> updateImage(@PathVariable String id,
            @RequestBody Map<String, String> payload) {
        return itemRepo.findById(id).map(item -> {
            String imageBase64 = payload.get("imageBase64");
            String mimeType    = payload.get("mimeType");
            if (imageBase64 == null || imageBase64.isEmpty())
                return ResponseEntity.badRequest().body(Map.of("error", "Image data is required"));
            // Limit size ~500KB base64 ≈ 375KB binary
            if (imageBase64.length() > 700000)
                return ResponseEntity.badRequest().body(Map.of("error",
                    "Image too large. Max 500KB allowed. Please compress the image."));
            item.setImageBase64(imageBase64);
            item.setImageMimeType(mimeType != null ? mimeType : "image/jpeg");
            itemRepo.save(item);
            auditLogService.logUpdate("Inventory", "Item image updated: " + item.getItemName());
            return ResponseEntity.ok(Map.of("message", "Image updated successfully", "itemId", id));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/items/{id}/image")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public ResponseEntity<?> deleteImage(@PathVariable String id) {
        return itemRepo.findById(id).map(item -> {
            item.setImageBase64(null);
            item.setImageMimeType(null);
            itemRepo.save(item);
            return ResponseEntity.ok(Map.of("message", "Image removed"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────── EXPIRY ALERTS ───────────────────

    @GetMapping("/items/expiring-soon")
    public ResponseEntity<?> getExpiringSoon(
            @RequestParam(required = false, defaultValue = "30") int days) {
        LocalDate cutoff = LocalDate.now().plusDays(days);
        List<Map<String, Object>> results = new ArrayList<>();
        for (InventoryItem item : itemRepo.findByActiveTrue()) {
            if (item.getBatches() == null) continue;
            for (InventoryItem.BatchEntry batch : item.getBatches()) {
                if (!batch.isActive() || batch.getExpiryDate() == null) continue;
                if (!batch.getExpiryDate().isAfter(cutoff)) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("itemId",      item.getId());
                    row.put("itemName",    item.getItemName());
                    row.put("itemCode",    item.getItemCode());
                    row.put("batchNumber", batch.getBatchNumber());
                    row.put("quantity",    batch.getQuantity());
                    row.put("expiryDate",  batch.getExpiryDate());
                    row.put("daysLeft",    LocalDate.now().until(batch.getExpiryDate()).getDays());
                    row.put("expired",     batch.getExpiryDate().isBefore(LocalDate.now()));
                    results.add(row);
                }
            }
        }
        results.sort(Comparator.comparing(r -> r.get("expiryDate").toString()));
        return ResponseEntity.ok(results);
    }

    // ─────────────────── HELPERS ───────────────────

    private void createStockMovement(String itemId, String itemName, String movType,
            String refType, String refNum, double qty, double balQty,
            double rate, String unit, LocalDate date) {
        StockMovement sm = new StockMovement();
        sm.setItemId(itemId);       sm.setItemName(itemName);
        sm.setMovementType(movType); sm.setReferenceType(refType);
        sm.setReferenceNumber(refNum); sm.setQuantity(qty);
        sm.setBalanceQty(balQty);   sm.setRate(rate);
        sm.setValue(qty * rate);    sm.setUnit(unit);
        sm.setMovementDate(date);   sm.setCreatedAt(LocalDateTime.now());
        stockMovRepo.save(sm);
    }

    private String generateEAN13() {
        // Generate random 12 digits, then compute check digit
        Random rnd = new Random();
        StringBuilder sb = new StringBuilder("86"); // India country code prefix
        for (int i = 0; i < 10; i++) sb.append(rnd.nextInt(10));
        String digits12 = sb.toString();
        int sum = 0;
        for (int i = 0; i < 12; i++)
            sum += (digits12.charAt(i) - '0') * (i % 2 == 0 ? 1 : 3);
        int check = (10 - (sum % 10)) % 10;
        return digits12 + check;
    }
}
