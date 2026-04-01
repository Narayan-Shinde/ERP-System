package com.erp.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Document(collection = "bank_statements")
public class BankStatement {

    @Id
    private String id;

    private String bankAccountId;
    private String bankAccountName;
    private LocalDate transactionDate;
    private String description;          // Bank statement madhun
    private String referenceNumber;      // Cheque/UTR/NEFT ref
    private double debitAmount  = 0;     // Money went out
    private double creditAmount = 0;     // Money came in
    private double balance;              // Running balance from bank

    // Reconciliation
    private String reconciliationStatus; // UNMATCHED, MATCHED, IGNORED
    private String matchedVoucherId;     // Matched accounting voucher/invoice ID
    private String matchedVoucherType;   // SALES_INVOICE, PURCHASE_PAYMENT, EXPENSE etc.
    private String matchedVoucherNumber;
    private LocalDateTime reconciledAt;
    private String reconciledBy;

    private String financialYear;
    private LocalDateTime createdAt = LocalDateTime.now();
    private String importSource;         // MANUAL, CSV_IMPORT
}
