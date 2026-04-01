package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "expenses")
public class Expense {
    @Id
    private String id;
    private String voucherNumber;
    private LocalDate expenseDate;
    private String expenseHeadId;
    private String expenseHeadName;
    private String paymentMode; // CASH, BANK
    private String bankAccountId;
    private double amount;
    private double gstRate;
    private double cgstAmount;
    private double sgstAmount;
    private double igstAmount;
    private double totalAmount;
    private String description;
    private String financialYear;
    private String status; // PENDING, APPROVED, REJECTED
    private LocalDateTime createdAt = LocalDateTime.now();
    private String createdBy;
    private boolean active = true;
    private boolean cancelled = false;
    private String cancelledReason;
}
