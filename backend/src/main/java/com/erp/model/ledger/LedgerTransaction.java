package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "ledger_transactions")
public class LedgerTransaction {
    @Id
    private String id;
    private String ledgerAccountId;
    private String ledgerAccountName;
    private LocalDate transactionDate;
    private String voucherType;   // JOURNAL, PAYMENT, RECEIPT, CONTRA, PURCHASE, SALES
    private String voucherNumber;
    private String referenceId;
    private String entryType;     // DEBIT, CREDIT
    private double amount;
    private double runningBalance;
    private String balanceType;   // DEBIT, CREDIT
    private String narration;
    private String financialYear;
    private LocalDateTime createdAt = LocalDateTime.now();
}
