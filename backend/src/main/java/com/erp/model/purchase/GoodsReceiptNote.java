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
@Document(collection = "goods_receipt_notes")
public class GoodsReceiptNote {
    @Id
    private String id;
    private String grnNumber;
    private String purchaseOrderId;
    private String poNumber;
    private String supplierId;
    private String supplierName;
    private String supplierInvoiceNumber;
    private LocalDate receivedDate;
    private String warehouseId;
    private String warehouseName;
    private String financialYear;
    private List<GRNItem> items;
    private String qualityStatus; // ACCEPTED, REJECTED, PARTIAL
    private String status; // DRAFT, CONFIRMED
    private String notes;
    private LocalDateTime createdAt = LocalDateTime.now();
    private String createdBy;

    @Data
    @NoArgsConstructor
    public static class GRNItem {
        private String itemId;
        private String itemName;
        private String hsnCode;
        private double orderedQty;
        private double receivedQty;
        private double acceptedQty;
        private double rejectedQty;
        private String unit;
        private double rate;
        private String batchNumber;
        private LocalDate expiryDate;
    }
}
