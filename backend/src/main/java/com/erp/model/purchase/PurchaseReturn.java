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
@Document(collection = "purchase_returns")
public class PurchaseReturn {
    @Id
    private String id;
    private String returnNumber;
    private String originalInvoiceId;
    private String originalInvoiceNumber;
    private String supplierId;
    private String supplierName;
    private LocalDate returnDate;
    private String financialYear;
    private List<ReturnItem> items;
    private double subTotal;
    private double totalCgst;
    private double totalSgst;
    private double totalIgst;
    private double totalGst;
    private double grandTotal;
    private String reason;
    private String status; // PENDING, APPROVED, COMPLETED
    private LocalDateTime createdAt = LocalDateTime.now();
    private String createdBy;

    @Data
    @NoArgsConstructor
    public static class ReturnItem {
        private String itemId;
        private String itemName;
        private String hsnCode;
        private double quantity;
        private String unit;
        private double rate;
        private double gstRate;
        private double cgstAmount;
        private double sgstAmount;
        private double amount;
        private double totalAmount;
    }
}
