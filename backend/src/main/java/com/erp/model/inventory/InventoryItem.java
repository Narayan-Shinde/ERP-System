package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "inventory_items")
public class InventoryItem {
    @Id
    private String id;

    // ── Core Fields ──
    private String itemCode;        // SKU / Auto-generated
    private String itemName;
    private String categoryId;
    private String categoryName;
    private String description;

    // ── Pricing ──
    private double purchaseRate;    // Purchase price
    private double salesRate;       // Default sale price
    private double mrp;             // Maximum Retail Price
    private List<PriceList> priceLists; // Multiple price lists

    // ── GST / Tax ──
    private double gstRate;
    private String hsnCode;
    private boolean isInterState = false;

    // ── Stock ──
    private String unit;
    private double openingStock;
    private double currentStock;
    private double reorderLevel;
    private String warehouseId;

    // ── Barcode ──
    private String barcode;         // EAN13 / custom barcode value
    private String barcodeType;     // EAN13, CODE128, QR

    // ── Image ──
    private String imageBase64;     // Base64 encoded image (small thumbnail)
    private String imageMimeType;   // image/jpeg, image/png

    // ── Batch / Expiry ──
    private boolean batchTracking = false;
    private List<BatchEntry> batches;

    // ── Meta ──
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();

    // ── Item Variants (size, color, width etc.) ──
    private boolean hasVariants = false;
    private List<ItemVariant> variants;

    // ── Serial / IMEI Tracking ──
    private boolean serialTracking = false;  // track each unit by serial number

    // ── Recurring fields ──
    private String tags;   // comma-separated tags for filtering

    // ────────────────────────────────────────────────────────────
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ItemVariant {
        private String id;
        private String variantName;    // e.g. "12mm x 65m", "Red", "Large"
        private String variantType;    // SIZE, COLOR, WIDTH, CUSTOM
        private double purchaseRate;
        private double salesRate;
        private double mrp;
        private double currentStock;
        private double reorderLevel;
        private String barcode;
        private String sku;            // variant-level SKU
        private boolean active = true;
    }

    // ── Inner Classes ──

    @Data
    @NoArgsConstructor
    public static class PriceList {
        private String listName;    // Retail, Wholesale, Dealer
        private double price;
        private String unit;
        private double minQty;      // Minimum qty to apply this price
        private boolean active = true;
    }

    @Data
    @NoArgsConstructor
    public static class BatchEntry {
        private String batchNumber;
        private LocalDate manufacturingDate;
        private LocalDate expiryDate;
        private double quantity;
        private double purchaseRate;
        private String supplierId;
        private String supplierName;
        private LocalDate receivedDate;
        private String notes;
        private boolean active = true;
    }
}
