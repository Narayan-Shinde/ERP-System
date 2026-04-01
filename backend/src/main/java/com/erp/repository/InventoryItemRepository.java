package com.erp.repository;

import com.erp.model.InventoryItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface InventoryItemRepository extends MongoRepository<InventoryItem, String> {
    List<InventoryItem> findByActiveTrue();
    List<InventoryItem> findByCategoryId(String categoryId);
    List<InventoryItem> findByCurrentStockLessThanEqual(double reorderLevel);
    List<InventoryItem> findByItemNameContainingIgnoreCase(String name);
}
