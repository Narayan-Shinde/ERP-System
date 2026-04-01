package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "suppliers")
public class Supplier {
    @Id
    private String id;

    // ── Identity ──
    private String supplierCode;
    private String supplierName;
    private String name;            // Legacy (kept for compat)
    private String contactPerson;

    // ── Contact ──
    private String phone;
    private String email;
    private String whatsapp;

    // ── Address ──
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String country = "India";

    // ── GST ──
    private String gstin;
    private boolean isInterState = false;
    // ── Tax ──
    private String pan;
    // ── Bank Details ──
    private String bankName;
    private String accountNumber;
    private String ifscCode;
    private String upiId;

    // ── Financial ──
    private double openingBalance  = 0.0;
    private double currentBalance  = 0.0;
    private String balanceType     = "CREDIT";  // CREDIT = we owe supplier

    // ── Credit / Payment Terms ──
    private int    creditDays      = 30;        // payment due in X days
    private String paymentTerms;                // e.g. "Net 30", "COD", "Advance"

    // ── Meta ──
    private String category;                    // Local / National / Importer
    private String notes;
    private List<String> tags;
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();
}
