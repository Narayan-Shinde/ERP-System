package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "customers")
public class Customer {
    @Id
    private String id;
    private String pan;
    // ── Identity ──
    private String customerCode;
    private String customerName;
    private String name;            // Legacy (kept for compat)
    private String contactPerson;
    private String routeId;
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

    // ── Financial ──
    private double openingBalance  = 0.0;
    private double currentBalance  = 0.0;
    private String balanceType     = "DEBIT";   // DEBIT = customer owes us

    // ── Credit ──
    private double creditLimit     = 0.0;       // 0 = no limit
    private int    creditDays      = 30;        // payment due in X days
    private int    paymentReminderDays = 7;     // remind X days before due

    // ── Meta ──
    private String category;                    // VIP / Regular / Wholesale
    private String notes;
    private List<String> tags;
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();
}
