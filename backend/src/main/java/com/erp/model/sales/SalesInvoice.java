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
@Document(collection = "sales_invoices")
public class SalesInvoice {
    @Id
    private String id;
    private String invoiceNumber;
    private String customerId;
    private String customerName;
    private String customerGstin;
    private String customerPan;
    private String customerAddress;
    private String customerCity;
    private String customerState;
    private String customerPincode;
    private String customerPhone;
    private String customerEmail;
    private String shippingAddress; // same as billing by default
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
    private double paidAmount;      // actual cash received from customer
    private double creditApplied;   // credit from returns applied to this invoice
    private double balanceDue;
    private String paymentStatus; // PENDING, PARTIAL, PAID
    private String status; // DRAFT, CONFIRMED, CANCELLED
    private String invoiceType; // TAX_INVOICE, RETAIL_INVOICE, QUOTATION, PROFORMA, ESTIMATE
    private double discount;    // invoice-level discount %
    private String termsAndConditions;
    private String notes;
    @JsonProperty("isInterState")
    private boolean isInterState = false;
    private LocalDateTime createdAt = LocalDateTime.now();
    private String createdBy;
    private boolean active = true;
    private boolean cancelled = false;
    private String cancelledReason;
    private String cancelledBy;
    private String soReference;    // SO Number this invoice was created from
    private String paymentMode;    // Cash, UPI, Bank Transfer, Card, Credit, Cheque
    private double roundOff = 0.0; // rounding adjustment (+/-)
    private String vehicleNumber;  // for delivery/transport
    private String placeOfSupply;  // e.g. "27-MAHARASHTRA" — GST Place of Supply
    private String transporterName; // Transporter/LR details
    private String poNumber;       // customer's PO reference

    // ── Additional Charges (Freight, Packaging, Labour etc.) ──
    private double freightCharge  = 0.0;
    private double packagingCharge= 0.0;
    private double otherCharge    = 0.0;
    private String otherChargeLabel = "";  // e.g. "Labour", "Insurance"

    // ── Draft support ──
    // status = DRAFT means bill save kela pan confirm nahi - stock deduct hot nahi
    // status = CONFIRMED means stock deducted + accounting posted

    // ── E-Way Bill ──
    private String ewayBillNumber = "";    // NIC portal varun milalela number
    private String ewayBillDate   = "";

    // ── E-Invoice ──
    private String irnNumber      = "";    // Invoice Reference Number from IRP portal
    private String irnAckNumber   = "";
    private String irnAckDate     = "";

    // ── Transporter ──
    private String transporterGstin = "";
    private String lrNumber        = "";   // Lorry Receipt number

    // ── Payment History (multiple partial payments track) ──
    private List<PaymentEntry> paymentHistory;

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class PaymentEntry {
        private java.time.LocalDate paymentDate;
        private double amount;
        private String paymentMode;   // CASH, UPI, BANK, CHEQUE, CREDIT
        private String referenceNo;   // Cheque/UTR number
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
        private double discount;
        private double taxableAmount;  // qty × rate (without GST)
        private double gstAmt;         // total GST amount for this row
        private double amount;         // taxable + gstAmt (grand total per row)
        private double gstRate;
        private double cgstRate;
        private double sgstRate;
        private double igstRate;
        private double cgstAmount;
        private double sgstAmount;
        private double igstAmount;
        private double totalAmount;
    }
}
