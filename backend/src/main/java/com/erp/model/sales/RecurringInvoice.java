package com.erp.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "recurring_invoices")
public class RecurringInvoice {

    @Id
    private String id;

    private String name;               // e.g. "Monthly Rent", "AMC Charges"
    private String customerId;
    private String customerName;
    private String customerGstin;
    private String customerAddress;
    private String customerState;
    private String customerPhone;
    private String customerEmail;

    // Frequency
    private String frequency;          // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
    private int dayOfMonth = 1;        // 1-28: bill on this day each month
    private LocalDate startDate;
    private LocalDate endDate;         // null = infinite
    private LocalDate nextRunDate;
    private LocalDate lastRunDate;

    private String status;             // ACTIVE, PAUSED, COMPLETED, CANCELLED
    private int totalRuns = 0;         // kithi vela invoice generate zale
    private int maxRuns = 0;           // 0 = unlimited

    // Invoice template
    private List<InvoiceItemTemplate> items;
    private double discount = 0;
    private double freightCharge = 0;
    private String paymentMode = "Credit";
    private int dueDays = 30;
    private String notes;
    private String invoiceType = "TAX_INVOICE";
    private boolean isInterState = false;

    private String financialYear;
    private LocalDateTime createdAt = LocalDateTime.now();
    private String createdBy;

    @Data
    public static class InvoiceItemTemplate {
        private String itemId;
        private String itemName;
        private String hsnCode;
        private double quantity;
        private String unit;
        private double rate;
        private double discount;
        private double gstRate;
        private boolean isInterState;
    }
}
