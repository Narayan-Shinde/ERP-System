package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "accounting_vouchers")
public class AccountingVoucher {
    @Id
    private String id;
    private String voucherNumber;
    private String voucherType; // JOURNAL, PAYMENT, RECEIPT, CONTRA
    private LocalDate voucherDate;
    private String financialYear;
    private List<VoucherEntry> entries; // Double-entry bookkeeping
    private double totalDebit;
    private double totalCredit;
    private String narration;
    private String referenceNumber;
    private String status; // DRAFT, POSTED, CANCELLED
    private Boolean cancelled = false;
    private String cancelledReason;
    private String cancelledBy;
    private LocalDateTime createdAt = LocalDateTime.now();
    private String createdBy;

    @Data
    @NoArgsConstructor
    public static class VoucherEntry {
        private String ledgerId;
        private String ledgerName;
        private String entryType; // DEBIT, CREDIT
        private double amount;
        private String narration;
    }
}
