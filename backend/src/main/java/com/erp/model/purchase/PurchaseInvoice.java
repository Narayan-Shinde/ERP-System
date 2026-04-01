package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "purchase_invoices")
public class PurchaseInvoice {
    @Id
    private String id;
    private String invoiceNumber;
    private String supplierInvoiceNumber;
    private String supplierId;
    private String supplierName;
    private String supplierGstin;
    private String supplierPan;
    private String supplierAddress;
    private String supplierCity;
    private String supplierState;
    private String supplierPhone;
    private String supplierEmail;
    private String shippingAddress;
    private LocalDate invoiceDate;
    private LocalDate dueDate;
    private String financialYear;
    private List<InvoiceItem> items;
    private double subTotal;
    private double totalCgst;
    private double totalSgst;
    private double totalIgst;
    private double totalGst;
    private double grandTotal;
    private double paidAmount;      // actual cash paid by us
    private double creditApplied;   // credit from returns applied to this invoice
    private double balanceDue;
    private String paymentStatus; // PENDING, PARTIAL, PAID
    private String status; // DRAFT, CONFIRMED, CANCELLED
    private String notes;
    private LocalDateTime createdAt = LocalDateTime.now();
    private String createdBy;
    private boolean active = true;
    private boolean cancelled = false;
    private String cancelledReason;
    private String cancelledBy;
    private String poReference;    // PO Number this invoice was created from

    // ── Additional Charges ──
    private double freightCharge   = 0.0;
    private double packagingCharge = 0.0;
    private double otherCharge     = 0.0;
    private String otherChargeLabel = "";

    // ── GST fields missing from Purchase ──
    private boolean isInterState   = false;
    private String  placeOfSupply  = "";
    private double  discount       = 0.0;  // invoice-level discount %
    private double  roundOff       = 0.0;

    // ── Transport ──
    private String vehicleNumber   = "";
    private String transporterName = "";
    private String lrNumber        = "";
    private String transporterGstin= "";

    // ── E-Way Bill ──
    private String ewayBillNumber  = "";
    private String ewayBillDate    = "";

    // ── E-Invoice ──
    private String irnNumber       = "";
    private String irnAckNumber    = "";
    private String irnAckDate      = "";

    // ── Payment History ──
    private java.util.List<PaymentEntry> paymentHistory;

    @lombok.Data @lombok.NoArgsConstructor @lombok.AllArgsConstructor
    public static class PaymentEntry {
        private java.time.LocalDate paymentDate;
        private double amount;
        private String paymentMode;
        private String referenceNo;
        private String notes;
        private String recordedBy;
        private java.time.LocalDateTime recordedAt = java.time.LocalDateTime.now();
    }

    @Data
    @NoArgsConstructor
    public static class InvoiceItem {
        private String itemId;
        private String itemName;
        private String hsnCode;
        private double quantity;
        private String unit;
        private double rate;
        private double amount;
        private double taxableAmount;
        private double gstRate;
        private double cgstRate;
        private double sgstRate;
        private double igstRate;
        private double cgstAmount;
        private double sgstAmount;
        private double igstAmount;
        private double totalAmount;
        private double discount = 0.0;
        @JsonProperty("isInterState")
        private boolean isInterState = false;
    }
}
