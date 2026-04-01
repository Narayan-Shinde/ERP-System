package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "bank_accounts")
public class BankAccount {
    @Id
    private String id;
    private String bankName;        // HDFC Bank, SBI, etc.
    private String accountNumber;
    private String ifscCode;
    private String branch;
    private String accountType;     // CURRENT, SAVINGS
    private double openingBalance;
    private boolean isDefault;      // Main bank
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();
}
