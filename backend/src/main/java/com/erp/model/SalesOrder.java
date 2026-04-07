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
@Document(collection = "sales_orders")
public class SalesOrder {
    @Id
    private String id;
    private String soNumber;
    private String customerId;
    private String customerName;
    private LocalDate orderDate;
    private LocalDate deliveryDate;
    private String financialYear;
    private List<SOItem> items;
    private double subTotal;
    private double totalGst;
    private double grandTotal;
    private String status; // DRAFT, CONFIRMED, INVOICED, CANCELLED
    private String notes;
    private LocalDateTime createdAt = LocalDateTime.now();
    private String createdBy;

    @Data
    @NoArgsConstructor
    public static class SOItem {
        private String itemId;
        private String itemName;
        private String hsnCode;
        private double quantity;
        private double invoicedQuantity;
        private String unit;
        private double rate;
        private double discount;
        private double gstRate;
        private double amount;
        private double totalAmount;
    }
}
