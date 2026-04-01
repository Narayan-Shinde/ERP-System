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
@Document(collection = "purchase_orders")
public class PurchaseOrder {
    @Id
    private String id;
    private String poNumber;
    private String supplierId;
    private String supplierName;
    private LocalDate poDate;
    private LocalDate expectedDeliveryDate;
    private String financialYear;
    private List<POItem> items;
    private double subTotal;
    private double totalGst;
    private double grandTotal;
    private String status; // DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
    private String notes;
    private LocalDateTime createdAt = LocalDateTime.now();
    private String createdBy;

    @Data
    @NoArgsConstructor
    public static class POItem {
        private String itemId;
        private String itemName;
        private String hsnCode;
        private double quantity;
        private double receivedQuantity;
        private String unit;
        private double rate;
        private double gstRate;
        private double amount;
        private double totalAmount;
    }
}
