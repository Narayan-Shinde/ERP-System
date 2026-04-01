package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "ledger_accounts")
public class LedgerAccount {
    @Id
    private String id;
    private String accountCode;
    private String accountName;
    private String accountGroup; // ASSET, LIABILITY, INCOME, EXPENSE, EQUITY
    private String subGroup;
    private String parentAccountId;
    private double openingBalance = 0.0;
    private String openingBalanceType = "DEBIT"; // DEBIT or CREDIT
    private double currentBalance = 0.0;
    private String currentBalanceType = "DEBIT";
    private boolean isSystemAccount = false;
    private boolean active = true;
    private String description;
    private LocalDateTime createdAt = LocalDateTime.now();
}
