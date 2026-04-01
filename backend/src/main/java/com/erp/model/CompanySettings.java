package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "company_settings")
public class CompanySettings {
    @Id
    private String id;
    private String companyName;
    private String gstin;
    private String pan;
    private String address;
    private String city;
    private String state;
    private String stateCode;
    private String pincode;
    private String phone;
    private String email;
    private String website;
    private String currentFinancialYear; // e.g. "2024-25"
    private String financialYearStart;   // e.g. "2024-04-01"
    private String financialYearEnd;     // e.g. "2025-03-31"
    private String logoPath;
    private String logoData;           // base64 encoded logo image
    private String invoiceFormat = "STANDARD";  // STANDARD, COMPACT, DETAILED
    private String invoiceColor  = "#1a4f8a";   // primary color on invoice
    private String invoiceFooterNote;           // custom footer on invoice
    private String invoiceTermsAndConditions;   // T&C printed on invoice
    private String invoiceNotes;                // default notes on invoice
    private String invoiceSignatureLabel = "Authorised Signatory";
    private String invoicePrefix   = "INV";    // sales invoice prefix
    private String purchasePrefix  = "PINV";   // purchase invoice prefix
    private String currency = "INR";
    private String currencySymbol = "₹";
    private String upiId;
    private String signatureData;
    private boolean isInterStateBusiness = false;
    private String defaultPaymentTerms   = "Net 30";
    private int    defaultDueDays        = 30;  // invoice due in X days
    private String bankName;
    private String bankAccountNumber;
    private String ifscCode;
    private String bankBranch;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;
}
