package com.erp.service;

import com.erp.model.AccountingVoucher;
import com.erp.model.LedgerAccount;
import com.erp.model.LedgerTransaction;
import com.erp.model.PurchaseInvoice;
import com.erp.model.SalesInvoice;
import com.erp.model.BankAccount;
import com.erp.model.CompanySettings;
import com.erp.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.List;

@Service
public class AutoPostingService {

    @Autowired private AccountingVoucherRepository voucherRepo;
    @Autowired private LedgerAccountRepository ledgerRepo;
    @Autowired private LedgerTransactionRepository ledgerTxnRepo;
    @Autowired private CompanySettingsRepository settingsRepo;
    @Autowired private BankAccountRepository bankRepo;

    private LedgerAccount getOrCreateLedger(String name, String group, String balanceType) {
        // Direct lookup by name (case-insensitive)
        var direct = ledgerRepo.findByAccountNameIgnoreCase(name);
        return direct.isPresent() ? direct.get() : ledgerRepo.findAll().stream()
            .filter(l -> name != null && name.equalsIgnoreCase(l.getAccountName()))
            .findFirst()
            .orElseGet(() -> {
                LedgerAccount la = new LedgerAccount();
                la.setAccountName(name != null ? name : "Unknown Account");
                la.setAccountGroup(group != null ? group : "ASSET");
                la.setCurrentBalance(0.0);
                la.setCurrentBalanceType(balanceType);
                la.setActive(true);
                String prefix = switch (group) {
                    case "ASSET"     -> "1";
                    case "LIABILITY" -> "2";
                    case "EQUITY"    -> "3";
                    case "INCOME"    -> "4";
                    case "EXPENSE"   -> "5";
                    default          -> "9";
                };
                la.setAccountCode(prefix + String.format("%03d", ledgerRepo.count() + 1));
                return ledgerRepo.save(la);
            });
    }

    private void postLedgerEntry(LedgerAccount account, String entryType, double amount,
                                  String voucherType, String voucherNumber,
                                  String narration, String financialYear) {
        double currentBal = account.getCurrentBalance();
        String currentType = account.getCurrentBalanceType() != null ? account.getCurrentBalanceType() : "DEBIT";

        double newBal;
        String newType;
        if (entryType.equals(currentType)) {
            newBal  = currentBal + amount;
            newType = currentType;
        } else {
            if (amount > currentBal) {
                newBal  = amount - currentBal;
                newType = entryType;
            } else {
                newBal  = currentBal - amount;
                newType = currentType;
            }
        }
        account.setCurrentBalance(newBal);
        account.setCurrentBalanceType(newType);
        ledgerRepo.save(account);

        LedgerTransaction txn = new LedgerTransaction();
        txn.setLedgerAccountId(account.getId());
        txn.setLedgerAccountName(account.getAccountName());
        txn.setTransactionDate(LocalDate.now());
        txn.setVoucherType(voucherType);
        txn.setVoucherNumber(voucherNumber);
        txn.setEntryType(entryType);
        txn.setAmount(amount);
        txn.setRunningBalance(newBal);
        txn.setBalanceType(newType);
        txn.setNarration(narration);
        txn.setFinancialYear(financialYear != null ? financialYear : "2024-25");
        txn.setCreatedAt(LocalDateTime.now());
        ledgerTxnRepo.save(txn);
    }

    public void postPurchaseInvoice(PurchaseInvoice inv) {
        try {
            String fy     = inv.getFinancialYear() != null ? inv.getFinancialYear() : "2024-25";
            String vNum   = "AUTO-PUR-" + inv.getInvoiceNumber();
            if (voucherRepo.existsByVoucherNumber(vNum)) return;
            String narr   = "Purchase Invoice " + inv.getInvoiceNumber() + " from " + inv.getSupplierName();
            LocalDate date = inv.getInvoiceDate() != null ? inv.getInvoiceDate() : LocalDate.now();

            AccountingVoucher v = new AccountingVoucher();
            v.setVoucherNumber(vNum); v.setVoucherType("JOURNAL");
            v.setVoucherDate(date); v.setFinancialYear(fy);
            v.setNarration(narr); v.setReferenceNumber(inv.getInvoiceNumber());
            v.setStatus("POSTED");

            List<AccountingVoucher.VoucherEntry> entries = new ArrayList<>();
            AccountingVoucher.VoucherEntry dr1 = new AccountingVoucher.VoucherEntry();
            dr1.setLedgerName("Purchase Account"); dr1.setEntryType("DEBIT"); dr1.setAmount(inv.getSubTotal());
            entries.add(dr1);
            if (inv.getTotalGst() > 0) {
                AccountingVoucher.VoucherEntry dr2 = new AccountingVoucher.VoucherEntry();
                dr2.setLedgerName("GST Input Tax Credit"); dr2.setEntryType("DEBIT"); dr2.setAmount(inv.getTotalGst());
                entries.add(dr2);
            }
            AccountingVoucher.VoucherEntry cr = new AccountingVoucher.VoucherEntry();
            String supplierName = inv.getSupplierName() != null ? inv.getSupplierName() : "Accounts Payable";
            cr.setLedgerName(supplierName); cr.setEntryType("CREDIT"); cr.setAmount(inv.getGrandTotal());
            entries.add(cr);
            v.setEntries(entries);
            v.setTotalDebit(inv.getSubTotal() + inv.getTotalGst());
            v.setTotalCredit(inv.getGrandTotal());
            voucherRepo.save(v);

            LedgerAccount purchaseAc = getOrCreateLedger("Purchase Account", "EXPENSE", "DEBIT");
            postLedgerEntry(purchaseAc, "DEBIT", inv.getSubTotal(), "PURCHASE", vNum, narr, fy);

            if (inv.getTotalGst() > 0) {
                LedgerAccount gstAc = getOrCreateLedger("GST Input Tax Credit", "ASSET", "DEBIT");
                postLedgerEntry(gstAc, "DEBIT", inv.getTotalGst(), "PURCHASE", vNum, narr, fy);
            }

            LedgerAccount supplierAc = getOrCreateLedger(supplierName, "LIABILITY", "CREDIT");
            postLedgerEntry(supplierAc, "CREDIT", inv.getGrandTotal(), "PURCHASE", vNum, narr, fy);

        } catch (Exception e) { System.err.println("❌ AutoPosting ERROR: " + e.getMessage()); e.printStackTrace(); }
    }

    public void postSalesInvoice(SalesInvoice inv) {
        try {
            String fy    = inv.getFinancialYear() != null ? inv.getFinancialYear() : "2024-25";
            String vNum  = "AUTO-SAL-" + inv.getInvoiceNumber();
            if (voucherRepo.existsByVoucherNumber(vNum)) return;
            String narr  = "Sales Invoice " + inv.getInvoiceNumber() + " to " + inv.getCustomerName();
            LocalDate date = inv.getInvoiceDate() != null ? inv.getInvoiceDate() : LocalDate.now();

            AccountingVoucher v = new AccountingVoucher();
            v.setVoucherNumber(vNum); v.setVoucherType("JOURNAL");
            v.setVoucherDate(date); v.setFinancialYear(fy);
            v.setNarration(narr); v.setReferenceNumber(inv.getInvoiceNumber());
            v.setStatus("POSTED");

            List<AccountingVoucher.VoucherEntry> entries = new ArrayList<>();
            String customerName = inv.getCustomerName() != null ? inv.getCustomerName() : "Accounts Receivable";
            AccountingVoucher.VoucherEntry dr = new AccountingVoucher.VoucherEntry();
            dr.setLedgerName(customerName); dr.setEntryType("DEBIT"); dr.setAmount(inv.getGrandTotal());
            entries.add(dr);
            AccountingVoucher.VoucherEntry cr1 = new AccountingVoucher.VoucherEntry();
            cr1.setLedgerName("Sales Account"); cr1.setEntryType("CREDIT"); cr1.setAmount(inv.getSubTotal());
            entries.add(cr1);
            if (inv.getTotalGst() > 0) {
                AccountingVoucher.VoucherEntry cr2 = new AccountingVoucher.VoucherEntry();
                cr2.setLedgerName("GST Output Tax Payable"); cr2.setEntryType("CREDIT"); cr2.setAmount(inv.getTotalGst());
                entries.add(cr2);
            }
            v.setEntries(entries);
            v.setTotalDebit(inv.getGrandTotal());
            v.setTotalCredit(inv.getSubTotal() + inv.getTotalGst());
            voucherRepo.save(v);

            LedgerAccount customerAc = getOrCreateLedger(customerName, "ASSET", "DEBIT");
            postLedgerEntry(customerAc, "DEBIT", inv.getGrandTotal(), "SALES", vNum, narr, fy);

            LedgerAccount salesAc = getOrCreateLedger("Sales Account", "INCOME", "CREDIT");
            postLedgerEntry(salesAc, "CREDIT", inv.getSubTotal(), "SALES", vNum, narr, fy);

            if (inv.getTotalGst() > 0) {
                LedgerAccount gstOutAc = getOrCreateLedger("GST Output Tax Payable", "LIABILITY", "CREDIT");
                postLedgerEntry(gstOutAc, "CREDIT", inv.getTotalGst(), "SALES", vNum, narr, fy);
            }

        } catch (Exception e) { System.err.println("❌ AutoPosting ERROR: " + e.getMessage()); e.printStackTrace(); }
    }

    public void postPurchasePayment(String supplierName, double amount, String paymentMode, String invoiceNumber, String fy) {
        try {
            String accountName = resolvePaymentAccount(paymentMode);
            String vNum  = "PAY-PUR-" + invoiceNumber + "-" + amount;
            String narr  = "Payment to " + supplierName + " against " + invoiceNumber + " via " + paymentMode;

            AccountingVoucher v = new AccountingVoucher();
            v.setVoucherNumber(vNum); v.setVoucherType("PAYMENT");
            v.setVoucherDate(LocalDate.now()); v.setFinancialYear(fy != null ? fy : "2024-25");
            v.setNarration(narr); v.setReferenceNumber(invoiceNumber); v.setStatus("POSTED");
            List<AccountingVoucher.VoucherEntry> entries = new ArrayList<>();
            AccountingVoucher.VoucherEntry dr = new AccountingVoucher.VoucherEntry();
            dr.setLedgerName(supplierName); dr.setEntryType("DEBIT"); dr.setAmount(amount);
            entries.add(dr);
            AccountingVoucher.VoucherEntry cr = new AccountingVoucher.VoucherEntry();
            cr.setLedgerName(accountName); cr.setEntryType("CREDIT"); cr.setAmount(amount);
            entries.add(cr);
            v.setEntries(entries); v.setTotalDebit(amount); v.setTotalCredit(amount);
            voucherRepo.save(v);

            LedgerAccount supplierAc = getOrCreateLedger(supplierName, "LIABILITY", "CREDIT");
            postLedgerEntry(supplierAc, "DEBIT", amount, "PAYMENT", vNum, narr, fy);

            LedgerAccount bankAc = getOrCreateLedger(accountName, "ASSET", "DEBIT");
            postLedgerEntry(bankAc, "CREDIT", amount, "PAYMENT", vNum, narr, fy);

        } catch (Exception e) { System.err.println("❌ AutoPosting ERROR: " + e.getMessage()); e.printStackTrace(); }
    }

    public void postSalesPayment(String customerName, double amount, String paymentMode, String invoiceNumber, String fy) {
        try {
            String accountName = resolvePaymentAccount(paymentMode);
            String vNum  = "REC-SAL-" + invoiceNumber + "-" + amount;
            String narr  = "Receipt from " + customerName + " against " + invoiceNumber + " via " + paymentMode;

            AccountingVoucher v = new AccountingVoucher();
            v.setVoucherNumber(vNum); v.setVoucherType("RECEIPT");
            v.setVoucherDate(LocalDate.now()); v.setFinancialYear(fy != null ? fy : "2024-25");
            v.setNarration(narr); v.setReferenceNumber(invoiceNumber); v.setStatus("POSTED");
            List<AccountingVoucher.VoucherEntry> entries = new ArrayList<>();
            AccountingVoucher.VoucherEntry dr = new AccountingVoucher.VoucherEntry();
            dr.setLedgerName(accountName); dr.setEntryType("DEBIT"); dr.setAmount(amount);
            entries.add(dr);
            AccountingVoucher.VoucherEntry cr = new AccountingVoucher.VoucherEntry();
            cr.setLedgerName(customerName); cr.setEntryType("CREDIT"); cr.setAmount(amount);
            entries.add(cr);
            v.setEntries(entries); v.setTotalDebit(amount); v.setTotalCredit(amount);
            voucherRepo.save(v);

            LedgerAccount bankAc = getOrCreateLedger(accountName, "ASSET", "DEBIT");
            postLedgerEntry(bankAc, "DEBIT", amount, "RECEIPT", vNum, narr, fy);

            LedgerAccount customerAc = getOrCreateLedger(customerName, "ASSET", "DEBIT");
            postLedgerEntry(customerAc, "CREDIT", amount, "RECEIPT", vNum, narr, fy);

        } catch (Exception e) { System.err.println("❌ AutoPosting ERROR: " + e.getMessage()); e.printStackTrace(); }
    }

    private String resolvePaymentAccount(String paymentMode) {
        if (paymentMode == null) return "Cash in Hand";
        if ("CASH".equalsIgnoreCase(paymentMode)) return "Cash in Hand";

        List<BankAccount> banks = bankRepo.findByActiveTrue();
        for (BankAccount bank : banks) {
            if (bank.getBankName() != null && bank.getBankName().equalsIgnoreCase(paymentMode))
                return bank.getBankName();
        }

        return banks.stream().filter(BankAccount::isDefault).findFirst()
            .map(BankAccount::getBankName)
            .orElseGet(() -> banks.isEmpty() ? "Bank Account" : banks.get(0).getBankName());
    }


    // ── Sales Return Ledger Posting ──────────────────────────
    public void postSalesReturn(String returnNumber, String customerName,
                                double subTotal, double totalGst, double grandTotal,
                                String financialYear) {
        try {
            String fy   = financialYear != null ? financialYear : "2024-25";
            String vNum = "AUTO-SRET-" + returnNumber;
            if (voucherRepo.existsByVoucherNumber(vNum)) return;

            String narr = "Sales Return " + returnNumber + " from " + customerName;

            AccountingVoucher v = new AccountingVoucher();
            v.setVoucherNumber(vNum); v.setVoucherType("JOURNAL");
            v.setVoucherDate(java.time.LocalDate.now()); v.setFinancialYear(fy);
            v.setNarration(narr); v.setReferenceNumber(returnNumber); v.setStatus("POSTED");

            java.util.List<AccountingVoucher.VoucherEntry> entries = new java.util.ArrayList<>();

            // Dr Sales Returns Account (reduces Sales)
            AccountingVoucher.VoucherEntry dr1 = new AccountingVoucher.VoucherEntry();
            dr1.setLedgerName("Sales Returns Account"); dr1.setEntryType("DEBIT"); dr1.setAmount(subTotal);
            entries.add(dr1);

            // Dr GST Output Tax Payable (reverse GST)
            if (totalGst > 0) {
                AccountingVoucher.VoucherEntry dr2 = new AccountingVoucher.VoucherEntry();
                dr2.setLedgerName("GST Output Tax Payable"); dr2.setEntryType("DEBIT"); dr2.setAmount(totalGst);
                entries.add(dr2);
            }

            // Cr Customer Account (reduces receivable)
            AccountingVoucher.VoucherEntry cr = new AccountingVoucher.VoucherEntry();
            cr.setLedgerName(customerName); cr.setEntryType("CREDIT"); cr.setAmount(grandTotal);
            entries.add(cr);

            v.setEntries(entries);
            v.setTotalDebit(subTotal + totalGst);
            v.setTotalCredit(grandTotal);
            voucherRepo.save(v);

            // Post to ledgers
            LedgerAccount retAc = getOrCreateLedger("Sales Returns Account", "EXPENSE", "DEBIT");
            postLedgerEntry(retAc, "DEBIT", subTotal, "SALES_RETURN", vNum, narr, fy);

            if (totalGst > 0) {
                LedgerAccount gstAc = getOrCreateLedger("GST Output Tax Payable", "LIABILITY", "CREDIT");
                postLedgerEntry(gstAc, "DEBIT", totalGst, "SALES_RETURN", vNum, narr, fy);
            }

            LedgerAccount custAc = getOrCreateLedger(customerName, "ASSET", "DEBIT");
            postLedgerEntry(custAc, "CREDIT", grandTotal, "SALES_RETURN", vNum, narr, fy);

        } catch (Exception e) { System.err.println("❌ AutoPosting ERROR: " + e.getMessage()); e.printStackTrace(); }
    }

    // ── Purchase Return Ledger Posting ────────────────────────
    public void postPurchaseReturn(String returnNumber, String supplierName,
                                   double subTotal, double totalGst, double grandTotal,
                                   String financialYear) {
        try {
            String fy   = financialYear != null ? financialYear : "2024-25";
            String vNum = "AUTO-PRET-" + returnNumber;
            if (voucherRepo.existsByVoucherNumber(vNum)) return;

            String narr = "Purchase Return " + returnNumber + " to " + supplierName;

            AccountingVoucher v = new AccountingVoucher();
            v.setVoucherNumber(vNum); v.setVoucherType("JOURNAL");
            v.setVoucherDate(java.time.LocalDate.now()); v.setFinancialYear(fy);
            v.setNarration(narr); v.setReferenceNumber(returnNumber); v.setStatus("POSTED");

            java.util.List<AccountingVoucher.VoucherEntry> entries = new java.util.ArrayList<>();

            // Dr Supplier Account (reduces payable)
            AccountingVoucher.VoucherEntry dr = new AccountingVoucher.VoucherEntry();
            dr.setLedgerName(supplierName); dr.setEntryType("DEBIT"); dr.setAmount(grandTotal);
            entries.add(dr);

            // Cr Purchase Returns Account (reduces purchase cost)
            AccountingVoucher.VoucherEntry cr1 = new AccountingVoucher.VoucherEntry();
            cr1.setLedgerName("Purchase Returns Account"); cr1.setEntryType("CREDIT"); cr1.setAmount(subTotal);
            entries.add(cr1);

            // Cr GST Input Tax Credit (reverse ITC)
            if (totalGst > 0) {
                AccountingVoucher.VoucherEntry cr2 = new AccountingVoucher.VoucherEntry();
                cr2.setLedgerName("GST Input Tax Credit"); cr2.setEntryType("CREDIT"); cr2.setAmount(totalGst);
                entries.add(cr2);
            }

            v.setEntries(entries);
            v.setTotalDebit(grandTotal);
            v.setTotalCredit(subTotal + totalGst);
            voucherRepo.save(v);

            // Post to ledgers
            LedgerAccount suppAc = getOrCreateLedger(supplierName, "LIABILITY", "CREDIT");
            postLedgerEntry(suppAc, "DEBIT", grandTotal, "PURCHASE_RETURN", vNum, narr, fy);

            LedgerAccount retAc = getOrCreateLedger("Purchase Returns Account", "INCOME", "CREDIT");
            postLedgerEntry(retAc, "CREDIT", subTotal, "PURCHASE_RETURN", vNum, narr, fy);

            if (totalGst > 0) {
                LedgerAccount gstAc = getOrCreateLedger("GST Input Tax Credit", "ASSET", "DEBIT");
                postLedgerEntry(gstAc, "CREDIT", totalGst, "PURCHASE_RETURN", vNum, narr, fy);
            }

        } catch (Exception e) { System.err.println("❌ AutoPosting ERROR: " + e.getMessage()); e.printStackTrace(); }
    }

}