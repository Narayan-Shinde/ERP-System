package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "expense_heads")
public class ExpenseHead {
    @Id
    private String id;
    private String headCode;
    private String headName;
    private String category; // DIRECT, INDIRECT, ADMINISTRATIVE, FINANCIAL
    private String linkedLedgerId;
    private String linkedLedgerName;
    private double budgetAmount;
    private boolean gstApplicable = false;
    private double defaultGstRate;
    private boolean active = true;
    private String description;
    private LocalDateTime createdAt = LocalDateTime.now();
}
