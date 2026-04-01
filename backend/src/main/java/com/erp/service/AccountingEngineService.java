package com.erp.service;

import com.erp.model.Expense;
import com.erp.model.LedgerAccount;
import com.erp.model.LedgerTransaction;
import com.erp.model.PurchaseInvoice;
import com.erp.model.SalesInvoice;
import com.erp.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AccountingEngineService {

    @Autowired private LedgerAccountRepository ledgerAccountRepo;
    @Autowired private LedgerTransactionRepository ledgerTxnRepo;
    @Autowired private SalesInvoiceRepository salesRepo;
    @Autowired private PurchaseInvoiceRepository purchaseRepo;
    @Autowired private ExpenseRepository expenseRepo;

    public Map<String, Object> generateTrialBalance(String financialYear) {
        List<LedgerAccount> accounts = ledgerAccountRepo.findByActiveTrue();

        double totalDebit = 0, totalCredit = 0;
        List<Map<String, Object>> rows = new ArrayList<>();

        for (LedgerAccount acc : accounts) {
            if (acc.getCurrentBalance() == 0) continue;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("accountCode", acc.getAccountCode());
            row.put("accountName", acc.getAccountName());
            row.put("accountGroup", acc.getAccountGroup());
            row.put("subGroup", acc.getSubGroup());

            if ("DEBIT".equals(acc.getCurrentBalanceType())) {
                row.put("debit", acc.getCurrentBalance());
                row.put("credit", 0.0);
                totalDebit += acc.getCurrentBalance();
            } else {
                row.put("debit", 0.0);
                row.put("credit", acc.getCurrentBalance());
                totalCredit += acc.getCurrentBalance();
            }
            rows.add(row);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("financialYear", financialYear);
        result.put("accounts", rows);
        result.put("totalDebit", totalDebit);
        result.put("totalCredit", totalCredit);
        result.put("isBalanced", Math.abs(totalDebit - totalCredit) < 0.01);
        result.put("difference", Math.abs(totalDebit - totalCredit));
        return result;
    }

    public Map<String, Object> generateBalanceSheet(String financialYear) {
        List<LedgerAccount> accounts = ledgerAccountRepo.findByActiveTrue();

        Map<String, List<LedgerAccount>> byGroup = accounts.stream()
            .collect(Collectors.groupingBy(LedgerAccount::getAccountGroup));

        List<LedgerAccount> assets = byGroup.getOrDefault("ASSET", Collections.emptyList());
        double totalAssets = assets.stream()
            .mapToDouble(a -> "DEBIT".equals(a.getCurrentBalanceType()) ? a.getCurrentBalance() : -a.getCurrentBalance())
            .sum();

        List<LedgerAccount> liabilities = byGroup.getOrDefault("LIABILITY", Collections.emptyList());
        double totalLiabilities = liabilities.stream()
            .mapToDouble(a -> "CREDIT".equals(a.getCurrentBalanceType()) ? a.getCurrentBalance() : -a.getCurrentBalance())
            .sum();

        List<LedgerAccount> equity = byGroup.getOrDefault("EQUITY", Collections.emptyList());
        double totalEquity = equity.stream()
            .mapToDouble(a -> "CREDIT".equals(a.getCurrentBalanceType()) ? a.getCurrentBalance() : -a.getCurrentBalance())
            .sum();

        List<LedgerAccount> income = byGroup.getOrDefault("INCOME", Collections.emptyList());
        List<LedgerAccount> expenses = byGroup.getOrDefault("EXPENSE", Collections.emptyList());
        double totalIncome = income.stream()
            .mapToDouble(a -> "CREDIT".equals(a.getCurrentBalanceType()) ? a.getCurrentBalance() : -a.getCurrentBalance())
            .sum();
        double totalExpense = expenses.stream()
            .mapToDouble(a -> "DEBIT".equals(a.getCurrentBalanceType()) ? a.getCurrentBalance() : -a.getCurrentBalance())
            .sum();
        double netProfit = totalIncome - totalExpense;

        Map<String, Object> bs = new LinkedHashMap<>();
        bs.put("financialYear", financialYear);
        bs.put("generatedAt", java.time.LocalDateTime.now().toString());

        Map<String, Object> assetSide = new LinkedHashMap<>();
        assetSide.put("currentAssets", groupBySubGroup(assets, "Current Assets"));
        assetSide.put("fixedAssets", groupBySubGroup(assets, "Fixed Assets"));
        assetSide.put("investments", groupBySubGroup(assets, "Investments"));
        assetSide.put("cashAndBank", groupBySubGroup(assets, "Cash & Bank"));
        assetSide.put("totalAssets", totalAssets);
        bs.put("assets", assetSide);

        Map<String, Object> liabSide = new LinkedHashMap<>();
        liabSide.put("currentLiabilities", groupBySubGroup(liabilities, "Current Liabilities"));
        liabSide.put("longTermLiabilities", groupBySubGroup(liabilities, "Long-term Liabilities"));
        liabSide.put("capital", groupBySubGroup(equity, "Capital"));
        liabSide.put("retainedEarnings", groupBySubGroup(equity, "Retained Earnings"));
        liabSide.put("netProfitForYear", netProfit);
        liabSide.put("totalLiabilitiesAndEquity", totalLiabilities + totalEquity + netProfit);
        bs.put("liabilitiesAndEquity", liabSide);

        bs.put("isBalanced", Math.abs(totalAssets - (totalLiabilities + totalEquity + netProfit)) < 1.0);
        return bs;
    }

    public Map<String, Object> generateProfitAndLoss(LocalDate fromDate, LocalDate toDate) {
        List<SalesInvoice> sales = salesRepo.findByInvoiceDateBetween(fromDate, toDate);
        List<PurchaseInvoice> purchases = purchaseRepo.findByInvoiceDateBetween(fromDate, toDate);
        List<Expense> expenses = expenseRepo.findByExpenseDateBetween(fromDate, toDate);

        double salesRevenue = sales.stream().mapToDouble(SalesInvoice::getSubTotal).sum();
        double salesReturns = 0; // can be added from SalesReturn repo
        double netRevenue = salesRevenue - salesReturns;

        double purchaseAmount = purchases.stream().mapToDouble(PurchaseInvoice::getSubTotal).sum();
        double grossProfit = netRevenue - purchaseAmount;
        double grossProfitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

        Map<String, Double> expenseByHead = new LinkedHashMap<>();
        double totalOperatingExpenses = 0;
        for (Expense e : expenses) {
            String head = e.getExpenseHeadName() != null ? e.getExpenseHeadName() : "Other";
            expenseByHead.merge(head, e.getAmount(), Double::sum);
            totalOperatingExpenses += e.getAmount();
        }

        double netProfit = grossProfit - totalOperatingExpenses;
        double netProfitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

        double totalOutputGst = sales.stream().mapToDouble(SalesInvoice::getTotalGst).sum();
        double totalInputGst = purchases.stream().mapToDouble(PurchaseInvoice::getTotalGst).sum();

        Map<String, Object> pl = new LinkedHashMap<>();
        pl.put("period", fromDate + " to " + toDate);
        pl.put("generatedAt", java.time.LocalDateTime.now().toString());

        Map<String, Object> incomeSection = new LinkedHashMap<>();
        incomeSection.put("salesRevenue", salesRevenue);
        incomeSection.put("salesReturns", salesReturns);
        incomeSection.put("netRevenue", netRevenue);
        incomeSection.put("invoiceCount", sales.size());
        pl.put("income", incomeSection);

        Map<String, Object> cogsSection = new LinkedHashMap<>();
        cogsSection.put("purchases", purchaseAmount);
        cogsSection.put("purchaseInvoiceCount", purchases.size());
        pl.put("costOfGoodsSold", cogsSection);

        pl.put("grossProfit", grossProfit);
        pl.put("grossProfitMarginPercent", Math.round(grossProfitMargin * 100.0) / 100.0);

        Map<String, Object> expSection = new LinkedHashMap<>();
        expSection.put("breakdownByHead", expenseByHead);
        expSection.put("totalOperatingExpenses", totalOperatingExpenses);
        pl.put("operatingExpenses", expSection);

        pl.put("netProfit", netProfit);
        pl.put("netProfitMarginPercent", Math.round(netProfitMargin * 100.0) / 100.0);
        pl.put("isProfitable", netProfit >= 0);

        Map<String, Object> gstSection = new LinkedHashMap<>();
        gstSection.put("outputGst", totalOutputGst);
        gstSection.put("inputGst", totalInputGst);
        gstSection.put("netGstPayable", totalOutputGst - totalInputGst);
        pl.put("gstSummary", gstSection);

        return pl;
    }

    public List<Map<String, Object>> generateMonthlyPL(int year) {
        List<Map<String, Object>> monthlyData = new ArrayList<>();
        String[] months = {"Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"};
        int[] monthNumbers = {4,5,6,7,8,9,10,11,12,1,2,3};
        int[] years = {year,year,year,year,year,year,year,year,year,year+1,year+1,year+1};

        for (int i = 0; i < 12; i++) {
            LocalDate from = LocalDate.of(years[i], monthNumbers[i], 1);
            LocalDate to = from.withDayOfMonth(from.lengthOfMonth());

            double sales = salesRepo.findByInvoiceDateBetween(from, to)
                .stream().mapToDouble(SalesInvoice::getSubTotal).sum();
            double purchases = purchaseRepo.findByInvoiceDateBetween(from, to)
                .stream().mapToDouble(PurchaseInvoice::getSubTotal).sum();
            double expenses = expenseRepo.findByExpenseDateBetween(from, to)
                .stream().mapToDouble(Expense::getAmount).sum();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", months[i]);
            row.put("year", years[i]);
            row.put("sales", sales);
            row.put("purchases", purchases);
            row.put("grossProfit", sales - purchases);
            row.put("expenses", expenses);
            row.put("netProfit", sales - purchases - expenses);
            monthlyData.add(row);
        }
        return monthlyData;
    }

    private List<Map<String, Object>> groupBySubGroup(List<LedgerAccount> accounts, String subGroup) {
        return accounts.stream()
            .filter(a -> subGroup.equals(a.getSubGroup()))
            .map(a -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("accountName", a.getAccountName());
                m.put("balance", a.getCurrentBalance());
                m.put("balanceType", a.getCurrentBalanceType());
                return m;
            }).collect(Collectors.toList());
    }
}
