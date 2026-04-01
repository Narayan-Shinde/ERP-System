package com.erp.service;

import com.erp.model.InventoryItem;
import com.erp.repository.InventoryItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class InventoryAlertService {

    @Autowired
    private InventoryItemRepository itemRepository;

    public Map<String, Object> getLowStockAlerts() {
        List<InventoryItem> allItems = itemRepository.findByActiveTrue();

        List<InventoryItem> outOfStock = allItems.stream()
            .filter(i -> i.getCurrentStock() <= 0)
            .collect(Collectors.toList());

        List<InventoryItem> lowStock = allItems.stream()
            .filter(i -> i.getCurrentStock() > 0 && i.getCurrentStock() <= i.getReorderLevel())
            .collect(Collectors.toList());

        List<InventoryItem> normalStock = allItems.stream()
            .filter(i -> i.getCurrentStock() > i.getReorderLevel())
            .collect(Collectors.toList());

        List<Map<String, Object>> alerts = new ArrayList<>();

        for (InventoryItem item : outOfStock) {
            alerts.add(buildAlert(item, "CRITICAL", "Out of Stock - Immediate purchase required"));
        }
        for (InventoryItem item : lowStock) {
            alerts.add(buildAlert(item, "LOW", "Below reorder level - Purchase recommended"));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalItems", allItems.size());
        result.put("outOfStockCount", outOfStock.size());
        result.put("lowStockCount", lowStock.size());
        result.put("normalStockCount", normalStock.size());
        result.put("alerts", alerts);
        result.put("generatedAt", java.time.LocalDateTime.now().toString());

        return result;
    }

    private Map<String, Object> buildAlert(InventoryItem item, String severity, String message) {
        Map<String, Object> alert = new LinkedHashMap<>();
        alert.put("itemId", item.getId());
        alert.put("itemCode", item.getItemCode());
        alert.put("itemName", item.getItemName());
        alert.put("category", item.getCategoryName());
        alert.put("currentStock", item.getCurrentStock());
        alert.put("reorderLevel", item.getReorderLevel());
        alert.put("unit", item.getUnit());
        alert.put("purchaseRate", item.getPurchaseRate());
        alert.put("severity", severity);
        alert.put("message", message);
        double shortfall = item.getReorderLevel() - item.getCurrentStock();
        alert.put("shortfallQty", Math.max(0, shortfall));
        alert.put("estimatedPurchaseValue", Math.max(0, shortfall) * item.getPurchaseRate());
        return alert;
    }

    public Map<String, Object> getStockValuation() {
        List<InventoryItem> allItems = itemRepository.findByActiveTrue();

        double totalPurchaseValue = 0, totalSalesValue = 0;
        List<Map<String, Object>> valuationList = new ArrayList<>();

        for (InventoryItem item : allItems) {
            double purchaseVal = item.getCurrentStock() * item.getPurchaseRate();
            double salesVal = item.getCurrentStock() * item.getSalesRate();
            totalPurchaseValue += purchaseVal;
            totalSalesValue += salesVal;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("itemName", item.getItemName());
            row.put("currentStock", item.getCurrentStock());
            row.put("unit", item.getUnit());
            row.put("purchaseRate", item.getPurchaseRate());
            row.put("salesRate", item.getSalesRate());
            row.put("stockValueAtCost", purchaseVal);
            row.put("stockValueAtSalesPrice", salesVal);
            valuationList.add(row);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", valuationList);
        result.put("totalStockValueAtCost", totalPurchaseValue);
        result.put("totalStockValueAtSalesPrice", totalSalesValue);
        result.put("potentialProfit", totalSalesValue - totalPurchaseValue);
        return result;
    }
}
