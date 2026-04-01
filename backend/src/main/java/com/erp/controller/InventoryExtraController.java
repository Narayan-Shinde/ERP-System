package com.erp.controller;

import com.erp.model.ItemCategory;
import com.erp.model.StockMovement;
import com.erp.model.Warehouse;
import com.erp.repository.InventoryItemRepository;
import com.erp.repository.ItemCategoryRepository;
import com.erp.repository.StockMovementRepository;
import com.erp.repository.WarehouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*")
public class InventoryExtraController {

    @Autowired private ItemCategoryRepository categoryRepo;
    @Autowired private WarehouseRepository warehouseRepo;
    @Autowired private StockMovementRepository stockMovementRepo;
    @Autowired private InventoryItemRepository itemRepo;

    @GetMapping("/categories")
    public List<ItemCategory> getCategories() {
        return categoryRepo.findAll();
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public ResponseEntity<?> createCategory(@RequestBody ItemCategory category) {
        if (category.getCategoryName() == null || category.getCategoryName().trim().isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Category name is required"));
        if (category.getCategoryCode() == null || category.getCategoryCode().trim().isEmpty())
            category.setCategoryCode("CAT-" + String.format("%04d", categoryRepo.count() + 1));
        category.setActive(true);
        return ResponseEntity.ok(categoryRepo.save(category));
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> updateCategory(@PathVariable String id, @RequestBody ItemCategory category) {
        return categoryRepo.findById(id).map(c -> {
            category.setId(id);
            category.setActive(c.isActive());
            return ResponseEntity.ok(categoryRepo.save(category));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteCategory(@PathVariable String id) {
        long itemCount = itemRepo.findByActiveTrue().stream()
            .filter(i -> id.equals(i.getCategoryId())).count();
        if (itemCount > 0)
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Cannot delete — " + itemCount + " active items use this category."));
        categoryRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Category deleted"));
    }

    @GetMapping("/warehouses")
    public List<Warehouse> getWarehouses() {
        return warehouseRepo.findAll();
    }

    @PostMapping("/warehouses")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> createWarehouse(@RequestBody Warehouse warehouse) {
        if (warehouse.getWarehouseName() == null || warehouse.getWarehouseName().trim().isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Warehouse name is required"));
        return ResponseEntity.ok(warehouseRepo.save(warehouse));
    }

    @PutMapping("/warehouses/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> updateWarehouse(@PathVariable String id, @RequestBody Warehouse warehouse) {
        return warehouseRepo.findById(id).map(w -> {
            warehouse.setId(id);
            return ResponseEntity.ok(warehouseRepo.save(warehouse));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/warehouses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteWarehouse(@PathVariable String id) {
        if (!warehouseRepo.existsById(id))
            return ResponseEntity.notFound().build();
        warehouseRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Warehouse deleted"));
    }

    @GetMapping("/stock-movements")
    public List<StockMovement> getStockMovements(
            @RequestParam(required = false) String itemId,
            @RequestParam(required = false) String movementType,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        if (itemId != null) return stockMovementRepo.findByItemId(itemId);
        if (movementType != null) return stockMovementRepo.findByMovementType(movementType);
        if (fromDate != null && toDate != null)
            return stockMovementRepo.findByMovementDateBetween(
                LocalDate.parse(fromDate), LocalDate.parse(toDate));
        return stockMovementRepo.findAll();
    }

    @PostMapping("/stock-movements")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE')")
    public StockMovement createStockMovement(@RequestBody StockMovement movement) {
        return stockMovementRepo.save(movement);
    }

    @GetMapping("/stock-ledger/{itemId}")
    public List<StockMovement> getItemStockLedger(@PathVariable String itemId) {
        return stockMovementRepo.findByItemId(itemId);
    }
}
