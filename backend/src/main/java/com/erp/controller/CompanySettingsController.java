package com.erp.controller;

import com.erp.model.BankAccount;
import com.erp.model.CompanySettings;
import com.erp.model.LedgerAccount;
import com.erp.model.Customer;
import com.erp.repository.BankAccountRepository;
import com.erp.repository.CompanySettingsRepository;
import com.erp.repository.LedgerAccountRepository;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "*")
public class CompanySettingsController {

    @Autowired private CompanySettingsRepository settingsRepo;
    @Autowired private BankAccountRepository bankRepo;
    @Autowired private LedgerAccountRepository ledgerRepo;

    @GetMapping("/company")
    public ResponseEntity<?> getCompanySettings() {
        CompanySettings co = settingsRepo.findFirstByOrderByCreatedAtAsc()
                .orElse(new CompanySettings());

        Map<String, Object> result = new HashMap<>();
        result.put("id",          co.getId());
        result.put("companyName", co.getCompanyName());
        result.put("address",     co.getAddress());
        result.put("city",        co.getCity());
        result.put("state",       co.getState());
        result.put("pincode",     co.getPincode());
        result.put("phone",       co.getPhone());
        result.put("email",       co.getEmail());
        result.put("website",     co.getWebsite());
        result.put("gstin",       co.getGstin());
        result.put("pan",         co.getPan());
        result.put("logoData",    co.getLogoData());
        result.put("invoiceFormat", co.getInvoiceFormat() != null ? co.getInvoiceFormat() : "STANDARD");
        result.put("invoiceColor",  co.getInvoiceColor()  != null ? co.getInvoiceColor()  : "#1a4f8a");
        result.put("invoiceFooterNote", co.getInvoiceFooterNote());
        result.put("currentFinancialYear", co.getCurrentFinancialYear());
        result.put("financialYearStart", co.getFinancialYearStart());
        result.put("financialYearEnd",   co.getFinancialYearEnd());
        result.put("stateCode",   co.getStateCode());
        result.put("invoicePrefix",  co.getInvoicePrefix()  != null ? co.getInvoicePrefix()  : "SINV");
        result.put("purchasePrefix", co.getPurchasePrefix() != null ? co.getPurchasePrefix() : "PINV");
        result.put("signatureData",  co.getSignatureData());
        result.put("upiId",          co.getUpiId());
        result.put("bankName",       co.getBankName());
        result.put("accountNumber", co.getBankAccountNumber());
        result.put("ifscCode",       co.getIfscCode());
        result.put("bankBranch",     co.getBankBranch());
        result.put("isInterStateBusiness", co.isInterStateBusiness());
        result.put("bankName",    co.getBankName());
        result.put("ifscCode",    co.getIfscCode());

        boolean hasBankInSettings = co.getBankName() != null && !co.getBankName().isEmpty();
        if (!hasBankInSettings) {
            bankRepo.findAll().stream()
                .filter(BankAccount::isDefault)
                .findFirst()
                .or(() -> bankRepo.findAll().stream().findFirst())
                .ifPresent(bank -> {
                    result.put("bankName",      bank.getBankName());
                    result.put("accountNumber", bank.getAccountNumber());
                    result.put("ifscCode",      bank.getIfscCode());
                    result.put("branch",        bank.getBranch());
                });
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/company")
    @PreAuthorize("hasRole('ADMIN')")
    public CompanySettings saveCompanySettings(@RequestBody CompanySettings settings) {
        settings.setUpdatedAt(LocalDateTime.now());
        CompanySettings saved = settingsRepo.findFirstByOrderByCreatedAtAsc().map(existing -> {
            settings.setId(existing.getId());
            return settingsRepo.save(settings);
        }).orElse(settingsRepo.save(settings));

        if (saved.getBankName() != null && !saved.getBankName().isEmpty()) {
            String bankName = saved.getBankName();
            boolean exists = ledgerRepo.findByActiveTrue().stream()
                .anyMatch(l -> bankName.equalsIgnoreCase(l.getAccountName()));
            if (!exists) {
                LedgerAccount bank = new LedgerAccount();
                bank.setAccountName(bankName);
                bank.setAccountGroup("ASSET");
                bank.setAccountCode("1001");
                bank.setCurrentBalance(0.0);
                bank.setCurrentBalanceType("DEBIT");
                bank.setActive(true);
                ledgerRepo.save(bank);
            }
        }

        boolean cashExists = ledgerRepo.findByActiveTrue().stream()
            .anyMatch(l -> "Cash in Hand".equalsIgnoreCase(l.getAccountName()));
        if (!cashExists) {
            LedgerAccount cash = new LedgerAccount();
            cash.setAccountName("Cash in Hand");
            cash.setAccountGroup("ASSET");
            cash.setAccountCode("1002");
            cash.setCurrentBalance(0.0);
            cash.setCurrentBalanceType("DEBIT");
            cash.setActive(true);
            ledgerRepo.save(cash);
        }

        return saved;
    }
}
