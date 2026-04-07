package com.erp.controller;

import com.erp.model.Expense;
import com.erp.model.InventoryItem;
import com.erp.model.StockMovement;
import com.erp.model.LedgerAccount;
import com.erp.model.PurchaseInvoice;
import com.erp.model.Supplier;
import com.erp.model.Customer;
import com.erp.model.PurchaseReturn;
import com.erp.model.SalesInvoice;
import com.erp.model.SalesReturn;
import com.erp.model.InvoiceLineItem;
import com.erp.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.Month;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportsController {

    @Autowired
    private SalesInvoiceRepository salesRepo;
    @Autowired
    private PurchaseInvoiceRepository purchaseRepo;
    @Autowired
    private ExpenseRepository expenseRepo;
    @Autowired
    private LedgerAccountRepository ledgerRepo;
    @Autowired
    private InventoryItemRepository itemRepo;
    @Autowired
    private StockMovementRepository stockMovRepo;
    @Autowired
    private SupplierRepository supplierRepo;
    @Autowired
    private CustomerRepository customerRepo;
    @Autowired
    private SalesReturnRepository salesReturnRepo;
    @Autowired
    private PurchaseReturnRepository purchaseReturnRepo;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(
            @RequestParam(required = false) String financialYear) {
        String fy = financialYear;
        if (fy == null || fy.isBlank()) {
            int year = LocalDate.now().getMonthValue() >= 4
                    ? LocalDate.now().getYear() : LocalDate.now().getYear() - 1;
            fy = year + "-" + String.valueOf(year + 1).substring(2);
        }
        final String finalFy = fy;
        final boolean allYears = "ALL".equalsIgnoreCase(finalFy);

        List<SalesInvoice> allSales = salesRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() &&
                        (allYears || finalFy.equals(i.getFinancialYear() != null ? i.getFinancialYear() : "")))
                .collect(java.util.stream.Collectors.toList());
        List<PurchaseInvoice> allPurchases = purchaseRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() &&
                        (allYears || finalFy.equals(i.getFinancialYear() != null ? i.getFinancialYear() : "")))
                .collect(java.util.stream.Collectors.toList());
        List<Expense> allExpenses = expenseRepo.findAll().stream()
                .filter(e -> !e.isCancelled() && e.isActive() &&
                        (allYears || e.getFinancialYear() == null || e.getFinancialYear().isBlank() || finalFy.equals(e.getFinancialYear())))
                .collect(java.util.stream.Collectors.toList());

        // APPROVED returns deduct karo — net sales/purchases calculate karo
        double salesReturnTotal = salesReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && (allYears || finalFy.equals(r.getFinancialYear() != null ? r.getFinancialYear() : "")))
                .mapToDouble(SalesReturn::getGrandTotal).sum();

        double purchaseReturnTotal = purchaseReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && (allYears || finalFy.equals(r.getFinancialYear() != null ? r.getFinancialYear() : "")))
                .mapToDouble(PurchaseReturn::getGrandTotal).sum();

        double totalSales = allSales.stream().mapToDouble(SalesInvoice::getGrandTotal).sum() - salesReturnTotal;
        double totalPurchases = allPurchases.stream().mapToDouble(PurchaseInvoice::getGrandTotal).sum() - purchaseReturnTotal;
        double totalExpenses = allExpenses.stream().mapToDouble(Expense::getTotalAmount).sum();
        double outstanding = allSales.stream()
                .filter(i -> ("PENDING".equals(i.getPaymentStatus()) || "PARTIAL".equals(i.getPaymentStatus()))
                        && !"DRAFT".equals(i.getStatus()))
                .mapToDouble(SalesInvoice::getBalanceDue).sum();
        long lowStockCount = itemRepo.findByActiveTrue().stream().filter(i -> i.getCurrentStock() <= i.getReorderLevel()).count();

        List<Map<String, Object>> monthlyData = new ArrayList<>();
        LocalDate now = LocalDate.now();
        for (int m = 5; m >= 0; m--) {
            LocalDate month = now.minusMonths(m);
            LocalDate start = month.withDayOfMonth(1);
            LocalDate end = month.withDayOfMonth(month.lengthOfMonth());
            double ms = salesRepo.findAll().stream()
                    .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                            && !i.getInvoiceDate().isBefore(start) && !i.getInvoiceDate().isAfter(end))
                    .mapToDouble(SalesInvoice::getGrandTotal).sum();
            double msRet = salesReturnRepo.findAll().stream()
                    .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                            && r.getReturnDate() != null
                            && !r.getReturnDate().isBefore(start) && !r.getReturnDate().isAfter(end))
                    .mapToDouble(SalesReturn::getGrandTotal).sum();
            double mp = purchaseRepo.findAll().stream()
                    .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                            && !i.getInvoiceDate().isBefore(start) && !i.getInvoiceDate().isAfter(end))
                    .mapToDouble(PurchaseInvoice::getGrandTotal).sum();
            double mpRet = purchaseReturnRepo.findAll().stream()
                    .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                            && r.getReturnDate() != null
                            && !r.getReturnDate().isBefore(start) && !r.getReturnDate().isAfter(end))
                    .mapToDouble(PurchaseReturn::getGrandTotal).sum();
            ms = ms - msRet;
            mp = mp - mpRet;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", month.getMonth().name().substring(0, 3));
            row.put("sales", ms);
            row.put("purchase", mp);
            row.put("profit", ms - mp);
            monthlyData.add(row);
        }

        List<Map<String, Object>> recentSales = allSales.stream()
                .sorted(Comparator.comparing(SalesInvoice::getInvoiceDate).reversed())
                .limit(5)
                .map(inv -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", inv.getId());
                    m.put("invoiceNumber", inv.getInvoiceNumber());
                    m.put("customerName", inv.getCustomerName());
                    m.put("invoiceDate", inv.getInvoiceDate());
                    m.put("grandTotal", inv.getGrandTotal());
                    m.put("paymentStatus", inv.getPaymentStatus());
                    return m;
                }).collect(Collectors.toList());

        List<InventoryItem> allItems = itemRepo.findByActiveTrue();
        long inStockCount = allItems.stream().filter(i -> i.getCurrentStock() > i.getReorderLevel()).count();
        long lowStock2 = allItems.stream().filter(i -> i.getCurrentStock() > 0 && i.getCurrentStock() <= i.getReorderLevel()).count();
        long outOfStockCnt = allItems.stream().filter(i -> i.getCurrentStock() <= 0).count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalSales", totalSales);      // NET (returns deducted)
        stats.put("totalPurchases", totalPurchases);  // NET (returns deducted)
        stats.put("salesReturnTotal", salesReturnTotal);
        stats.put("purchaseReturnTotal", purchaseReturnTotal);
        stats.put("salesReturns", salesReturnTotal);
        stats.put("purchaseReturns", purchaseReturnTotal);
        stats.put("totalExpenses", totalExpenses);
        stats.put("totalOutstanding", outstanding);
        stats.put("grossProfit", totalSales - totalPurchases);
        stats.put("netProfit", totalSales - totalPurchases - totalExpenses);
        stats.put("netProfitMargin", totalSales > 0 ? Math.round((totalSales - totalPurchases - totalExpenses) / totalSales * 10000.0) / 100.0 : 0);
        stats.put("salesCount", allSales.size());
        stats.put("purchaseCount", allPurchases.size());
        // DRAFT invoices exclude karo — only real PENDING invoices count
        stats.put("pendingInvoices", salesRepo.findByPaymentStatus("PENDING").stream()
                .filter(i -> !"DRAFT".equals(i.getStatus()) && i.isActive() && !i.isCancelled()).count());
        stats.put("lowStockCount", lowStockCount);
        stats.put("monthlyChart", monthlyData);
        stats.put("recentSales", recentSales);
        stats.put("totalItems", allItems.size());
        stats.put("inStockCount", inStockCount);
        stats.put("lowStockItems", lowStock2);
        stats.put("outOfStockCount", outOfStockCnt);

        // Top 5 Customers by sales
        Map<String, Double> custMap = new LinkedHashMap<>();
        allSales.forEach(i -> custMap.merge(i.getCustomerName() != null ? i.getCustomerName() : "Unknown", i.getGrandTotal(), Double::sum));
        List<Map<String, Object>> topCustomers = custMap.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed()).limit(5)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", e.getKey());
                    m.put("amount", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());
        stats.put("topCustomers", topCustomers);

        // Top 5 Suppliers by purchase
        Map<String, Double> suppMap = new LinkedHashMap<>();
        allPurchases.forEach(i -> suppMap.merge(i.getSupplierName() != null ? i.getSupplierName() : "Unknown", i.getGrandTotal(), Double::sum));
        List<Map<String, Object>> topSuppliers = suppMap.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed()).limit(5)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", e.getKey());
                    m.put("amount", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());
        stats.put("topSuppliers", topSuppliers);

        // Pending payments (Sales)
        double pendingSalesAmt = allSales.stream()
                .filter(i -> "PENDING".equals(i.getPaymentStatus()) || "PARTIAL".equals(i.getPaymentStatus()))
                .mapToDouble(SalesInvoice::getBalanceDue).sum();
        // Pending payments (Purchase)
        double pendingPurchAmt = allPurchases.stream()
                .filter(i -> "PENDING".equals(i.getPaymentStatus()) || "PARTIAL".equals(i.getPaymentStatus()))
                .mapToDouble(PurchaseInvoice::getBalanceDue).sum();
        stats.put("pendingSalesAmount", pendingSalesAmt);
        stats.put("pendingPurchaseAmount", pendingPurchAmt);
        stats.put("pendingPurchaseCount", allPurchases.stream()
                .filter(i -> "PENDING".equals(i.getPaymentStatus()) || "PARTIAL".equals(i.getPaymentStatus())).count());

        // Low stock items list
        List<Map<String, Object>> lowStockList = allItems.stream()
                .filter(i -> i.getCurrentStock() <= i.getReorderLevel())
                .sorted(Comparator.comparingDouble(InventoryItem::getCurrentStock))
                .limit(10)
                .map(i -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("itemName", i.getItemName());
                    m.put("currentStock", i.getCurrentStock());
                    m.put("reorderLevel", i.getReorderLevel());
                    m.put("unit", i.getUnit());
                    return m;
                })
                .collect(Collectors.toList());
        stats.put("lowStockList", lowStockList);

        // ── Today's stats ──
        java.time.LocalDate today2 = java.time.LocalDate.now();
        double todaySalesRaw = salesRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && today2.equals(i.getInvoiceDate()))
                .mapToDouble(SalesInvoice::getGrandTotal).sum();
        double todaySalesRet = salesReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && today2.equals(r.getReturnDate()))
                .mapToDouble(SalesReturn::getGrandTotal).sum();
        double todaySales = todaySalesRaw - todaySalesRet;

        double todayPurchasesRaw = purchaseRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && today2.equals(i.getInvoiceDate()))
                .mapToDouble(PurchaseInvoice::getGrandTotal).sum();
        double todayPurchasesRet = purchaseReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && today2.equals(r.getReturnDate()))
                .mapToDouble(PurchaseReturn::getGrandTotal).sum();
        double todayPurchases = todayPurchasesRaw - todayPurchasesRet;
        long overdueCount = salesRepo.findByActiveTrue().stream()
                .filter(i -> !i.isCancelled())
                .filter(i -> "PENDING".equals(i.getPaymentStatus()) || "PARTIAL".equals(i.getPaymentStatus()))
                .filter(i -> i.getDueDate() != null && i.getDueDate().isBefore(today2))
                .count();
        stats.put("todaySales", todaySales);
        stats.put("todayPurchases", todayPurchases);
        stats.put("totalReceivable", pendingSalesAmt);
        stats.put("totalPayable", pendingPurchAmt);
        stats.put("overdueCount", overdueCount);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/profit-loss")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','MANAGER')")
    public ResponseEntity<?> getProfitLoss(@RequestParam String fromDate, @RequestParam String toDate) {
        LocalDate from = LocalDate.parse(fromDate), to = LocalDate.parse(toDate);
        List<SalesInvoice> sales = salesRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to))
                .collect(Collectors.toList());
        List<PurchaseInvoice> purchases = purchaseRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to))
                .collect(Collectors.toList());
        List<Expense> expenses = expenseRepo.findAll().stream()
                .filter(e -> e.getExpenseDate() != null
                        && !e.getExpenseDate().isBefore(from) && !e.getExpenseDate().isAfter(to))
                .collect(Collectors.toList());

        // ── Returns deduct karo — net sales/purchases sathi ──
        double salesRetAmt = salesReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(SalesReturn::getSubTotal).sum();
        double purchRetAmt = purchaseReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(PurchaseReturn::getSubTotal).sum();
        double salesRetGst = salesReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(SalesReturn::getTotalGst).sum();
        double purchRetGst = purchaseReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(PurchaseReturn::getTotalGst).sum();

        double totalSales = sales.stream().mapToDouble(SalesInvoice::getSubTotal).sum() - salesRetAmt;
        double totalCOGS = purchases.stream().mapToDouble(PurchaseInvoice::getSubTotal).sum() - purchRetAmt;
        double grossProfit = totalSales - totalCOGS;
        double totalExpenses = expenses.stream().mapToDouble(Expense::getAmount).sum();
        double netProfit = grossProfit - totalExpenses;

        Map<String, Double> expByHead = new LinkedHashMap<>();
        for (Expense e : expenses)
            expByHead.merge(e.getExpenseHeadName() != null ? e.getExpenseHeadName() : "Other", e.getAmount(), Double::sum);

        double outputGst = sales.stream().mapToDouble(SalesInvoice::getTotalGst).sum() - salesRetGst;
        double inputGst = purchases.stream().mapToDouble(PurchaseInvoice::getTotalGst).sum() - purchRetGst;

        Map<String, Object> pl = new LinkedHashMap<>();
        pl.put("period", fromDate + " to " + toDate);
        pl.put("income", Map.of("sales", totalSales, "total", totalSales,
                "invoiceCount", sales.size(), "salesReturns", salesRetAmt));
        pl.put("costOfGoods", totalCOGS);
        pl.put("purchaseReturns", purchRetAmt);
        pl.put("grossProfit", grossProfit);
        pl.put("grossProfitMargin", totalSales > 0 ? Math.round(grossProfit / totalSales * 10000.0) / 100.0 : 0);
        pl.put("expenses", Map.of("operating", totalExpenses, "total", totalExpenses, "breakdown", expByHead));
        pl.put("netProfit", netProfit);
        pl.put("netProfitMargin", totalSales > 0 ? Math.round(netProfit / totalSales * 10000.0) / 100.0 : 0);
        pl.put("isProfitable", netProfit >= 0);
        pl.put("gst", Map.of("outputGst", outputGst, "inputGst", inputGst, "netGstPayable", outputGst - inputGst));
        return ResponseEntity.ok(pl);
    }

    @GetMapping("/monthly-pl")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','MANAGER')")
    public ResponseEntity<?> getMonthlyPL(@RequestParam(defaultValue = "2024") int year) {
        List<Map<String, Object>> months = new ArrayList<>();
        String[] monthNames = {"Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"};
        int[] monthNums = {4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3};
        int[] years = {year, year, year, year, year, year, year, year, year, year + 1, year + 1, year + 1};

        for (int i = 0; i < 12; i++) {
            LocalDate start = LocalDate.of(years[i], monthNums[i], 1);
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            double sales = salesRepo.findAll().stream()
                    .filter(inv -> inv.isActive() && !inv.isCancelled() && inv.getInvoiceDate() != null
                            && !inv.getInvoiceDate().isBefore(start) && !inv.getInvoiceDate().isAfter(end))
                    .mapToDouble(SalesInvoice::getSubTotal).sum();
            double purch = purchaseRepo.findAll().stream()
                    .filter(inv -> inv.isActive() && !inv.isCancelled() && inv.getInvoiceDate() != null
                            && !inv.getInvoiceDate().isBefore(start) && !inv.getInvoiceDate().isAfter(end))
                    .mapToDouble(PurchaseInvoice::getSubTotal).sum();
            double salesRet = salesReturnRepo.findAll().stream()
                    .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                            && r.getReturnDate() != null
                            && !r.getReturnDate().isBefore(start) && !r.getReturnDate().isAfter(end))
                    .mapToDouble(SalesReturn::getSubTotal).sum();
            double purchRet = purchaseReturnRepo.findAll().stream()
                    .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                            && r.getReturnDate() != null
                            && !r.getReturnDate().isBefore(start) && !r.getReturnDate().isAfter(end))
                    .mapToDouble(PurchaseReturn::getSubTotal).sum();
            double exp = expenseRepo.findAll().stream()
                    .filter(e -> e.getExpenseDate() != null
                            && !e.getExpenseDate().isBefore(start) && !e.getExpenseDate().isAfter(end))
                    .mapToDouble(Expense::getAmount).sum();
            double netSales = sales - salesRet;
            double netPurch = purch - purchRet;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", monthNames[i]);
            row.put("year", years[i]);
            row.put("sales", netSales);
            row.put("purchases", netPurch);
            row.put("salesReturns", salesRet);
            row.put("purchaseReturns", purchRet);
            row.put("grossProfit", netSales - netPurch);
            row.put("expenses", exp);
            row.put("netProfit", netSales - netPurch - exp);
            months.add(row);
        }
        double totalSales = months.stream().mapToDouble(m -> (Double) m.get("sales")).sum();
        double totalPurch = months.stream().mapToDouble(m -> (Double) m.get("purchases")).sum();
        double totalExp = months.stream().mapToDouble(m -> (Double) m.get("expenses")).sum();
        return ResponseEntity.ok(Map.of(
                "financialYear", year + "-" + (year + 1), "months", months,
                "totals", Map.of("sales", totalSales, "purchases", totalPurch,
                        "expenses", totalExp, "netProfit", totalSales - totalPurch - totalExp)));
    }

    @GetMapping("/trial-balance")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','MANAGER')")
    public ResponseEntity<?> getTrialBalance() {
        List<LedgerAccount> accounts = ledgerRepo.findByActiveTrue();
        double totalDebit = 0, totalCredit = 0;
        List<Map<String, Object>> rows = new ArrayList<>();
        for (LedgerAccount acc : accounts) {
            if (acc.getCurrentBalance() == 0) continue;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", acc.getId());
            row.put("accountCode", acc.getAccountCode());
            row.put("accountName", acc.getAccountName());
            row.put("accountGroup", acc.getAccountGroup());
            row.put("subGroup", acc.getSubGroup());
            row.put("currentBalance", acc.getCurrentBalance());
            row.put("currentBalanceType", acc.getCurrentBalanceType());
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
        return ResponseEntity.ok(Map.of("accounts", rows, "totalDebit", totalDebit,
                "totalCredit", totalCredit, "difference", Math.abs(totalDebit - totalCredit),
                "isBalanced", Math.abs(totalDebit - totalCredit) < 0.01));
    }

    @GetMapping("/balance-sheet")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','MANAGER')")
    public ResponseEntity<?> getBalanceSheet() {
        List<LedgerAccount> accounts = ledgerRepo.findByActiveTrue();
        Map<String, List<LedgerAccount>> byGroup = accounts.stream()
                .collect(Collectors.groupingBy(a -> a.getAccountGroup() != null ? a.getAccountGroup() : "OTHER"));

        List<LedgerAccount> assets = byGroup.getOrDefault("ASSET", List.of());
        List<LedgerAccount> liabs = byGroup.getOrDefault("LIABILITY", List.of());
        List<LedgerAccount> equity = byGroup.getOrDefault("EQUITY", List.of());
        List<LedgerAccount> income = byGroup.getOrDefault("INCOME", List.of());
        List<LedgerAccount> expAcc = byGroup.getOrDefault("EXPENSE", List.of());

        double totalAssets = assets.stream().mapToDouble(a -> "DEBIT".equals(a.getCurrentBalanceType()) ? a.getCurrentBalance() : -a.getCurrentBalance()).sum();
        double totalLiabs = liabs.stream().mapToDouble(a -> "CREDIT".equals(a.getCurrentBalanceType()) ? a.getCurrentBalance() : -a.getCurrentBalance()).sum();
        double totalEquity = equity.stream().mapToDouble(a -> "CREDIT".equals(a.getCurrentBalanceType()) ? a.getCurrentBalance() : -a.getCurrentBalance()).sum();
        double netProfit = income.stream().mapToDouble(a -> "CREDIT".equals(a.getCurrentBalanceType()) ? a.getCurrentBalance() : -a.getCurrentBalance()).sum()
                - expAcc.stream().mapToDouble(a -> "DEBIT".equals(a.getCurrentBalanceType()) ? a.getCurrentBalance() : -a.getCurrentBalance()).sum();

        return ResponseEntity.ok(Map.of(
                "generatedAt", java.time.LocalDateTime.now().toString(),
                "assets", Map.of("fixedAssets", toList(assets, "Fixed Assets"),
                        "currentAssets", toList(assets, "Current Assets"), "cashAndBank", toList(assets, "Cash & Bank"), "totalAssets", totalAssets),
                "liabilitiesAndEquity", Map.of("capital", toList(equity, "Capital"),
                        "retainedEarnings", toList(equity, "Retained Earnings"), "netProfitCurrentYear", netProfit,
                        "currentLiabilities", toList(liabs, "Current Liabilities"),
                        "longTermLiabilities", toList(liabs, "Long-term Liabilities"),
                        "totalLiabilitiesAndEquity", totalLiabs + totalEquity + netProfit),
                "isBalanced", Math.abs(totalAssets - (totalLiabs + totalEquity + netProfit)) < 1.0));
    }

    @GetMapping("/cash-flow")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','MANAGER')")
    public ResponseEntity<?> getCashFlow(@RequestParam String fromDate, @RequestParam String toDate) {
        LocalDate from = LocalDate.parse(fromDate), to = LocalDate.parse(toDate);
        List<SalesInvoice> sales = salesRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to))
                .collect(Collectors.toList());
        List<PurchaseInvoice> purchases = purchaseRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to))
                .collect(Collectors.toList());
        List<Expense> expenses = expenseRepo.findAll().stream()
                .filter(e -> e.getExpenseDate() != null
                        && !e.getExpenseDate().isBefore(from) && !e.getExpenseDate().isAfter(to))
                .collect(Collectors.toList());

        // Cash actually collected from customers (paidAmount)
        double cashInSales = sales.stream().mapToDouble(SalesInvoice::getPaidAmount).sum();
        // Cash actually paid to suppliers
        double cashOutPurch = purchases.stream().mapToDouble(PurchaseInvoice::getPaidAmount).sum();
        double cashOutExp = expenses.stream().mapToDouble(Expense::getAmount).sum();

        // Return refunds: approved returns madhe cash refund hou shakto
        // Sales return → we paid back to customer (cash out)
        double salesReturnCash = salesReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(r -> r.getGrandTotal() > 0 ? r.getGrandTotal() : 0)
                .sum();
        // Purchase return → supplier paid us back (cash in)
        double purchReturnCash = purchaseReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(r -> r.getGrandTotal() > 0 ? r.getGrandTotal() : 0)
                .sum();

        // Net cash flow
        // Note: In most cases returns adjust against next invoice (credit)
        // so actual cash movement = 0. But we show it for completeness.
        double netCashIn = cashInSales + purchReturnCash;
        double netCashOut = cashOutPurch + cashOutExp + salesReturnCash;
        double netCash = netCashIn - netCashOut;

        return ResponseEntity.ok(Map.of(
                "period", fromDate + " to " + toDate,
                "operatingActivities", Map.of(
                        "cashInflows", Map.of(
                                "salesReceipts", cashInSales,
                                "purchaseReturns", purchReturnCash,
                                "total", cashInSales + purchReturnCash),
                        "cashOutflows", Map.of(
                                "purchasePayments", cashOutPurch,
                                "salesReturns", salesReturnCash,
                                "expenses", cashOutExp,
                                "total", cashOutPurch + cashOutExp + salesReturnCash),
                        "netOperatingCashFlow", netCash),
                "netCashFlow", netCash,
                "receivables", sales.stream().mapToDouble(SalesInvoice::getBalanceDue).sum(),
                "payables", purchases.stream().mapToDouble(PurchaseInvoice::getBalanceDue).sum(),
                "supplierNetBalance", supplierRepo.findAll().stream()
                        .mapToDouble(s -> s.getCurrentBalance()).sum(),
                "customerNetBalance", customerRepo.findAll().stream()
                        .mapToDouble(c -> c.getCurrentBalance()).sum()
        ));
    }

    @GetMapping("/stock-summary")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE','MANAGER')")
    public ResponseEntity<?> getStockSummary() {
        List<InventoryItem> items = itemRepo.findByActiveTrue();
        double totalValue = items.stream().mapToDouble(i -> i.getCurrentStock() * i.getPurchaseRate()).sum();
        long outOfStock = items.stream().filter(i -> i.getCurrentStock() <= 0).count();
        long lowStock = items.stream().filter(i -> i.getCurrentStock() > 0 && i.getCurrentStock() <= i.getReorderLevel()).count();

        Map<String, Object> catSummary = new LinkedHashMap<>();
        for (InventoryItem item : items)
            catSummary.merge(item.getCategoryName() != null ? item.getCategoryName() : "Uncategorized",
                    item.getCurrentStock() * item.getPurchaseRate(), (a, b) -> (double) a + (double) b);

        return ResponseEntity.ok(Map.of(
                "items", items, "totalItems", items.size(),
                "totalStockValue", totalValue, "outOfStockCount", outOfStock,
                "lowStockCount", lowStock, "categoryWiseValue", catSummary));
    }

    @GetMapping("/stock-ledger")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','PURCHASE_EXECUTIVE','MANAGER')")
    public ResponseEntity<?> getStockLedger(@RequestParam String itemId,
                                            @RequestParam(required = false) String fromDate, @RequestParam(required = false) String toDate) {
        List<StockMovement> movements = fromDate != null && toDate != null
                ? stockMovRepo.findByItemIdAndMovementDateBetween(itemId, LocalDate.parse(fromDate), LocalDate.parse(toDate))
                : stockMovRepo.findByItemIdOrderByMovementDateAsc(itemId);
        InventoryItem item = itemRepo.findById(itemId).orElse(null);

        double totalIn = movements.stream()
                .filter(m -> "STOCK_IN".equals(m.getMovementType()) || "OPENING".equals(m.getMovementType()) || "TRANSFER_IN".equals(m.getMovementType()))
                .mapToDouble(StockMovement::getQuantity).sum();
        double totalOut = movements.stream()
                .filter(m -> "STOCK_OUT".equals(m.getMovementType()) || "TRANSFER_OUT".equals(m.getMovementType()))
                .mapToDouble(StockMovement::getQuantity).sum();
        double openingBalance = item != null ? (item.getCurrentStock() - totalIn + totalOut) : 0;
        double currentStock = item != null ? item.getCurrentStock() : 0;

        return ResponseEntity.ok(Map.of(
                "item", item != null ? item : Map.of(),
                "movements", movements,
                "currentStock", currentStock,
                "openingBalance", openingBalance,
                "totalIn", totalIn,
                "totalOut", totalOut,
                "unit", item != null && item.getUnit() != null ? item.getUnit() : "Nos"
        ));
    }

    @GetMapping("/inventory/low-stock")
    public ResponseEntity<?> getLowStock() {
        List<InventoryItem> all = itemRepo.findByActiveTrue();
        List<InventoryItem> outOfStock = all.stream().filter(i -> i.getCurrentStock() <= 0).toList();
        List<InventoryItem> low = all.stream().filter(i -> i.getCurrentStock() > 0 && i.getCurrentStock() <= i.getReorderLevel()).toList();
        List<Map<String, Object>> alerts = new ArrayList<>();
        for (InventoryItem i : outOfStock)
            alerts.add(Map.of("itemId", i.getId(), "itemName", i.getItemName(),
                    "currentStock", i.getCurrentStock(), "reorderLevel", i.getReorderLevel(), "severity", "CRITICAL", "unit", i.getUnit() != null ? i.getUnit() : "Nos"));
        for (InventoryItem i : low)
            alerts.add(Map.of("itemId", i.getId(), "itemName", i.getItemName(),
                    "currentStock", i.getCurrentStock(), "reorderLevel", i.getReorderLevel(), "severity", "LOW", "unit", i.getUnit() != null ? i.getUnit() : "Nos"));
        return ResponseEntity.ok(Map.of("outOfStockCount", outOfStock.size(), "lowStockCount", low.size(), "alerts", alerts));
    }

    @GetMapping("/gst-liability")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','MANAGER')")
    public ResponseEntity<?> getGstLiability(@RequestParam String fromDate, @RequestParam String toDate) {
        LocalDate from = LocalDate.parse(fromDate), to = LocalDate.parse(toDate);
        List<SalesInvoice> sales = salesRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to))
                .collect(java.util.stream.Collectors.toList());
        List<PurchaseInvoice> purch = purchaseRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to))
                .collect(java.util.stream.Collectors.toList());

        // Approved returns GST — deduct from output/input GST
        double salesRetCgst = salesReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(SalesReturn::getTotalCgst).sum();
        double salesRetSgst = salesReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(SalesReturn::getTotalSgst).sum();
        double salesRetIgst = salesReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(SalesReturn::getTotalIgst).sum();
        double purchRetCgst = purchaseReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(PurchaseReturn::getTotalCgst).sum();
        double purchRetSgst = purchaseReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(PurchaseReturn::getTotalSgst).sum();
        double purchRetIgst = purchaseReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .mapToDouble(PurchaseReturn::getTotalIgst).sum();

        // Net GST (after returns)
        double outCgst = sales.stream().mapToDouble(SalesInvoice::getTotalCgst).sum() - salesRetCgst;
        double outSgst = sales.stream().mapToDouble(SalesInvoice::getTotalSgst).sum() - salesRetSgst;
        double outIgst = sales.stream().mapToDouble(SalesInvoice::getTotalIgst).sum() - salesRetIgst;
        double inCgst = purch.stream().mapToDouble(PurchaseInvoice::getTotalCgst).sum() - purchRetCgst;
        double inSgst = purch.stream().mapToDouble(PurchaseInvoice::getTotalSgst).sum() - purchRetSgst;
        double inIgst = purch.stream().mapToDouble(PurchaseInvoice::getTotalIgst).sum() - purchRetIgst;
        double outTotal = outCgst + outSgst + outIgst;
        double inTotal = inCgst + inSgst + inIgst;

        return ResponseEntity.ok(Map.of(
                "period", fromDate + " to " + toDate,
                "outputTax", Map.of("cgst", outCgst, "sgst", outSgst, "igst", outIgst, "total", outTotal,
                        "salesReturnsGst", salesRetCgst + salesRetSgst + salesRetIgst),
                "inputTaxCredit", Map.of("cgst", inCgst, "sgst", inSgst, "igst", inIgst, "total", inTotal,
                        "purchaseReturnsGst", purchRetCgst + purchRetSgst + purchRetIgst),
                "netLiability", Map.of(
                        "cgst", Math.max(0, outCgst - inCgst), "sgst", Math.max(0, outSgst - inSgst),
                        "igst", Math.max(0, outIgst - inIgst),
                        "total", Math.max(0, outCgst - inCgst) + Math.max(0, outSgst - inSgst) + Math.max(0, outIgst - inIgst)),
                "refundable", Map.of(
                        "cgst", Math.max(0, inCgst - outCgst), "sgst", Math.max(0, inSgst - outSgst),
                        "igst", Math.max(0, inIgst - outIgst))));
    }

    @GetMapping("/comparative-pl")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','MANAGER')")
    public ResponseEntity<?> getComparativePL(
            @RequestParam String period1From, @RequestParam String period1To,
            @RequestParam String period2From, @RequestParam String period2To) {
        LocalDate p1f = LocalDate.parse(period1From), p1t = LocalDate.parse(period1To);
        LocalDate p2f = LocalDate.parse(period2From), p2t = LocalDate.parse(period2To);

        // Helper lambda for net calculation (sales/purchase - returns)
        double p1Sales = salesRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(p1f) && !i.getInvoiceDate().isAfter(p1t))
                .mapToDouble(SalesInvoice::getSubTotal).sum();
        double p1SalesRet = salesReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(p1f) && !r.getReturnDate().isAfter(p1t))
                .mapToDouble(SalesReturn::getSubTotal).sum();
        double p1Purch = purchaseRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(p1f) && !i.getInvoiceDate().isAfter(p1t))
                .mapToDouble(PurchaseInvoice::getSubTotal).sum();
        double p1PurchRet = purchaseReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(p1f) && !r.getReturnDate().isAfter(p1t))
                .mapToDouble(PurchaseReturn::getSubTotal).sum();
        double p1Exp = expenseRepo.findAll().stream()
                .filter(e -> e.getExpenseDate() != null
                        && !e.getExpenseDate().isBefore(p1f) && !e.getExpenseDate().isAfter(p1t))
                .mapToDouble(Expense::getAmount).sum();

        double p2Sales = salesRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(p2f) && !i.getInvoiceDate().isAfter(p2t))
                .mapToDouble(SalesInvoice::getSubTotal).sum();
        double p2SalesRet = salesReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(p2f) && !r.getReturnDate().isAfter(p2t))
                .mapToDouble(SalesReturn::getSubTotal).sum();
        double p2Purch = purchaseRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(p2f) && !i.getInvoiceDate().isAfter(p2t))
                .mapToDouble(PurchaseInvoice::getSubTotal).sum();
        double p2PurchRet = purchaseReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(p2f) && !r.getReturnDate().isAfter(p2t))
                .mapToDouble(PurchaseReturn::getSubTotal).sum();
        double p2Exp = expenseRepo.findAll().stream()
                .filter(e -> e.getExpenseDate() != null
                        && !e.getExpenseDate().isBefore(p2f) && !e.getExpenseDate().isAfter(p2t))
                .mapToDouble(Expense::getAmount).sum();

        // Net after returns
        double p1NetSales = p1Sales - p1SalesRet;
        double p1NetPurch = p1Purch - p1PurchRet;
        double p2NetSales = p2Sales - p2SalesRet;
        double p2NetPurch = p2Purch - p2PurchRet;

        double p1Gross = p1NetSales - p1NetPurch;
        double p1Net = p1Gross - p1Exp;
        double p2Gross = p2NetSales - p2NetPurch;
        double p2Net = p2Gross - p2Exp;

        java.util.function.BiFunction<Double, Double, Double> variance =
                (v1, v2) -> v1 != 0 ? Math.round((v2 - v1) / Math.abs(v1) * 10000.0) / 100.0 : 0.0;

        return ResponseEntity.ok(Map.of(
                "period1", Map.of("from", period1From, "to", period1To,
                        "sales", p1NetSales, "purchases", p1NetPurch,
                        "salesReturns", p1SalesRet, "purchaseReturns", p1PurchRet,
                        "grossProfit", p1Gross, "expenses", p1Exp, "netProfit", p1Net),
                "period2", Map.of("from", period2From, "to", period2To,
                        "sales", p2NetSales, "purchases", p2NetPurch,
                        "salesReturns", p2SalesRet, "purchaseReturns", p2PurchRet,
                        "grossProfit", p2Gross, "expenses", p2Exp, "netProfit", p2Net),
                "variance", Map.of(
                        "sales", variance.apply(p1NetSales, p2NetSales),
                        "purchases", variance.apply(p1NetPurch, p2NetPurch),
                        "grossProfit", variance.apply(p1Gross, p2Gross),
                        "netProfit", variance.apply(p1Net, p2Net))));
    }

    @GetMapping("/invoice-aging")
    public ResponseEntity<?> getInvoiceAging() {
        LocalDate today = LocalDate.now();
        List<com.erp.model.SalesInvoice> all = salesRepo.findByActiveTrue().stream()
                .filter(i -> !i.isCancelled() &&
                        ("PENDING".equals(i.getPaymentStatus()) || "PARTIAL".equals(i.getPaymentStatus())))
                .collect(Collectors.toList());

        List<Map<String, Object>> bucket0 = new ArrayList<>(); // Current (not yet due)
        List<Map<String, Object>> bucket30 = new ArrayList<>(); // 1-30 days
        List<Map<String, Object>> bucket60 = new ArrayList<>(); // 31-60 days
        List<Map<String, Object>> bucket90 = new ArrayList<>(); // 61-90 days
        List<Map<String, Object>> bucket90plus = new ArrayList<>(); // 90+ days

        for (var inv : all) {
            LocalDate due = inv.getDueDate() != null ? inv.getDueDate()
                    : (inv.getInvoiceDate() != null ? inv.getInvoiceDate().plusDays(30) : today);
            long days = java.time.temporal.ChronoUnit.DAYS.between(due, today);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", inv.getId());
            row.put("invoiceNumber", inv.getInvoiceNumber());
            row.put("customerName", inv.getCustomerName());
            row.put("invoiceDate", inv.getInvoiceDate());
            row.put("dueDate", due);
            row.put("grandTotal", inv.getGrandTotal());
            row.put("paidAmount", inv.getPaidAmount());
            row.put("balanceDue", inv.getBalanceDue());
            row.put("daysOverdue", days);
            row.put("paymentStatus", inv.getPaymentStatus());

            if (days <= 0) bucket0.add(row);
            else if (days <= 30) bucket30.add(row);
            else if (days <= 60) bucket60.add(row);
            else if (days <= 90) bucket90.add(row);
            else bucket90plus.add(row);
        }

        double total0 = bucket0.stream().mapToDouble(r -> (double) r.get("balanceDue")).sum();
        double total30 = bucket30.stream().mapToDouble(r -> (double) r.get("balanceDue")).sum();
        double total60 = bucket60.stream().mapToDouble(r -> (double) r.get("balanceDue")).sum();
        double total90 = bucket90.stream().mapToDouble(r -> (double) r.get("balanceDue")).sum();
        double total90p = bucket90plus.stream().mapToDouble(r -> (double) r.get("balanceDue")).sum();

        return ResponseEntity.ok(Map.of(
                "current", Map.of("invoices", bucket0, "total", total0, "count", bucket0.size()),
                "days1to30", Map.of("invoices", bucket30, "total", total30, "count", bucket30.size()),
                "days31to60", Map.of("invoices", bucket60, "total", total60, "count", bucket60.size()),
                "days61to90", Map.of("invoices", bucket90, "total", total90, "count", bucket90.size()),
                "days90plus", Map.of("invoices", bucket90plus, "total", total90p, "count", bucket90plus.size()),
                "grandTotal", total0 + total30 + total60 + total90 + total90p,
                "totalOverdue", total30 + total60 + total90 + total90p
        ));
    }

    // ── Stock Valuation Report ────────────────────────────────────────────
    @GetMapping("/stock-valuation")
    public ResponseEntity<?> getStockValuation() {
        List<com.erp.model.InventoryItem> items = itemRepo.findByActiveTrue();
        List<Map<String, Object>> rows = new ArrayList<>();
        double totalPurchaseValue = 0, totalSaleValue = 0, totalCurrentValue = 0;

        for (var item : items) {
            double purchaseRate = item.getPurchaseRate();
            double saleRate = item.getSalesRate();
            double qty = item.getCurrentStock();
            double purchaseVal = qty * purchaseRate;
            double saleVal = qty * saleRate;
            double profit = saleVal - purchaseVal;
            double margin = purchaseVal > 0 ? (profit / purchaseVal * 100) : 0;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("itemId", item.getId());
            row.put("itemCode", item.getItemCode());
            row.put("itemName", item.getItemName());
            row.put("category", item.getCategoryName());
            row.put("unit", item.getUnit());
            row.put("currentStock", qty);
            row.put("purchaseRate", purchaseRate);
            row.put("saleRate", saleRate);
            row.put("purchaseValue", purchaseVal);
            row.put("saleValue", saleVal);
            row.put("potentialProfit", profit);
            row.put("marginPct", Math.round(margin * 100.0) / 100.0);
            row.put("reorderLevel", item.getReorderLevel());
            row.put("lowStock", qty <= item.getReorderLevel());
            rows.add(row);

            totalPurchaseValue += purchaseVal;
            totalSaleValue += saleVal;
            totalCurrentValue += purchaseVal;
        }

        rows.sort((a, b) -> Double.compare((double) b.get("purchaseValue"), (double) a.get("purchaseValue")));

        return ResponseEntity.ok(Map.of(
                "items", rows,
                "totalItems", rows.size(),
                "totalPurchaseValue", totalPurchaseValue,
                "totalSaleValue", totalSaleValue,
                "totalPotentialProfit", totalSaleValue - totalPurchaseValue,
                "overallMarginPct", totalPurchaseValue > 0
                        ? Math.round((totalSaleValue - totalPurchaseValue) / totalPurchaseValue * 10000.0) / 100.0 : 0
        ));
    }


    // ── Bill-wise Profit Report ────────────────────────────────────────────
    @GetMapping("/billwise-profit")
    public ResponseEntity<?> getBillwiseProfit(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String financialYear) {

        List<SalesInvoice> invoices = salesRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled())
                // RETURNED invoices exclude karo (fully returned)
                .filter(i -> !"RETURNED".equals(i.getPaymentStatus()))
                .filter(i -> {
                    if (fromDate != null && toDate != null && i.getInvoiceDate() != null) {
                        LocalDate f = LocalDate.parse(fromDate), t = LocalDate.parse(toDate);
                        return !i.getInvoiceDate().isBefore(f) && !i.getInvoiceDate().isAfter(t);
                    }
                    if (financialYear != null) return financialYear.equals(i.getFinancialYear());
                    return true;
                })
                .collect(java.util.stream.Collectors.toList());

        // Partial returns: invoice effective amount = grandTotal - approved return amount
        java.util.Map<String, Double> invoiceReturnMap = new java.util.HashMap<>();
        salesReturnRepo.findAll().stream()
                .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                .filter(r -> r.getOriginalInvoiceId() != null)
                .forEach(r -> invoiceReturnMap.merge(r.getOriginalInvoiceId(), r.getGrandTotal(), Double::sum));

        // Approved returns map — per invoice kitya return zale
        java.util.Map<String, Double> returnAmtMap = new java.util.HashMap<>();
        salesReturnRepo.findAll().stream()
                .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                .filter(r -> r.getOriginalInvoiceId() != null)
                .forEach(r -> returnAmtMap.merge(r.getOriginalInvoiceId(),
                        r.getSubTotal() > 0 ? r.getSubTotal() : r.getGrandTotal(), Double::sum));

        // Build purchase cost map: itemId → average purchase rate
        Map<String, Double> purchaseCostMap = new java.util.HashMap<>();
        purchaseRepo.findAll().stream()
                .filter(p -> p.isActive() && !p.isCancelled() && p.getItems() != null)
                .forEach(p -> p.getItems().forEach(item -> {
                    if (item.getItemId() != null)
                        purchaseCostMap.merge(item.getItemId(), item.getRate(), (a, b) -> (a + b) / 2.0);
                }));

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        double totalRevenue = 0, totalCost = 0, totalProfit = 0, totalGst = 0;

        for (SalesInvoice inv : invoices) {
            // Net revenue after partial returns
            double returnAmt = returnAmtMap.getOrDefault(inv.getId(), 0.0);
            double revenue = inv.getGrandTotal() - returnAmt - (inv.getTotalGst() > 0 ? returnAmt * inv.getTotalGst() / (inv.getSubTotal() > 0 ? inv.getSubTotal() : 1) : 0);
            double taxable = Math.max(0, inv.getSubTotal() - returnAmt);
            double gst = Math.max(0, inv.getTotalGst() - (returnAmt * (inv.getSubTotal() > 0 ? inv.getTotalGst() / inv.getSubTotal() : 0)));
            revenue = taxable + gst; // recalculate
            double cost = 0;

            if (inv.getItems() != null) {
                for (InvoiceLineItem item : inv.getItems()) {
                    double purchaseRate = purchaseCostMap.getOrDefault(item.getItemId(),
                            item.getRate() * 0.7); // estimate 70% if no purchase data
                    cost += item.getQuantity() * purchaseRate;
                }
            }

            double profit = taxable - cost;
            double margin = taxable > 0 ? Math.round((profit / taxable) * 10000.0) / 100.0 : 0;

            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("invoiceNumber", inv.getInvoiceNumber());
            row.put("invoiceDate", inv.getInvoiceDate());
            row.put("customerName", inv.getCustomerName());
            row.put("revenue", revenue);
            row.put("taxable", taxable);
            row.put("gst", gst);
            row.put("cost", Math.round(cost * 100.0) / 100.0);
            row.put("profit", Math.round(profit * 100.0) / 100.0);
            row.put("margin", margin);
            row.put("paymentStatus", inv.getPaymentStatus());
            result.add(row);

            totalRevenue += revenue;
            totalCost += cost;
            totalProfit += profit;
            totalGst += gst;
        }

        result.sort((a, b) -> Double.compare((Double) b.get("profit"), (Double) a.get("profit")));

        return ResponseEntity.ok(Map.of(
                "invoices", result,
                "totalRevenue", totalRevenue,
                "totalCost", Math.round(totalCost * 100.0) / 100.0,
                "totalProfit", Math.round(totalProfit * 100.0) / 100.0,
                "totalGst", totalGst,
                "avgMargin", totalRevenue > 0 ? Math.round((totalProfit / (totalRevenue - totalGst)) * 10000.0) / 100.0 : 0,
                "count", result.size()
        ));
    }

    // ── Day-wise Sales Report ──────────────────────────────────────────────
    @GetMapping("/daywise-sales")
    public ResponseEntity<?> getDaywiseSales(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String financialYear) {

        LocalDate from = fromDate != null ? LocalDate.parse(fromDate) : LocalDate.now().withDayOfMonth(1);
        LocalDate to = toDate != null ? LocalDate.parse(toDate) : LocalDate.now();

        Map<LocalDate, double[]> dayMap = new java.util.TreeMap<>();
        // Initialize all days in range
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            dayMap.put(d, new double[]{0, 0, 0, 0}); // sales, purchase, invoiceCount, cashIn
        }

        salesRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null)
                .filter(i -> !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to))
                .forEach(i -> {
                    double[] row = dayMap.computeIfAbsent(i.getInvoiceDate(), k -> new double[4]);
                    row[0] += i.getGrandTotal();
                    row[2] += 1;
                    row[3] += i.getPaidAmount();
                });
        // Sales returns deduct karo day-wise
        salesReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .forEach(r -> {
                    double[] row = dayMap.computeIfAbsent(r.getReturnDate(), k -> new double[4]);
                    row[0] -= r.getGrandTotal(); // sales kami karo
                });

        purchaseRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled() && i.getInvoiceDate() != null)
                .filter(i -> !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to))
                .forEach(i -> {
                    double[] row = dayMap.computeIfAbsent(i.getInvoiceDate(), k -> new double[4]);
                    row[1] += i.getGrandTotal();
                });
        // Purchase returns deduct karo day-wise
        purchaseReturnRepo.findAll().stream()
                .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                        && r.getReturnDate() != null
                        && !r.getReturnDate().isBefore(from) && !r.getReturnDate().isAfter(to))
                .forEach(r -> {
                    double[] row = dayMap.computeIfAbsent(r.getReturnDate(), k -> new double[4]);
                    row[1] -= r.getGrandTotal(); // purchase kami karo
                });

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        double totalSales = 0, totalPurchase = 0, totalInvoices = 0;

        for (Map.Entry<LocalDate, double[]> entry : dayMap.entrySet()) {
            double[] v = entry.getValue();
            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("date", entry.getKey());
            row.put("dayName", entry.getKey().getDayOfWeek().name().substring(0, 3));
            row.put("sales", Math.round(v[0] * 100.0) / 100.0);
            row.put("purchase", Math.round(v[1] * 100.0) / 100.0);
            row.put("profit", Math.round((v[0] - v[1]) * 100.0) / 100.0);
            row.put("invoiceCount", (int) v[2]);
            row.put("cashCollected", Math.round(v[3] * 100.0) / 100.0);
            result.add(row);
            totalSales += v[0];
            totalPurchase += v[1];
            totalInvoices += v[2];
        }

        return ResponseEntity.ok(Map.of(
                "days", result,
                "totalSales", Math.round(totalSales * 100.0) / 100.0,
                "totalPurchase", Math.round(totalPurchase * 100.0) / 100.0,
                "totalProfit", Math.round((totalSales - totalPurchase) * 100.0) / 100.0,
                "totalInvoices", (int) totalInvoices,
                "fromDate", from, "toDate", to
        ));
    }

    private List<Map<String, Object>> toList(List<LedgerAccount> list, String groupName) {
        return list.stream()
                .filter(acc -> acc.getSubGroup() != null && acc.getSubGroup().equalsIgnoreCase(groupName))
                .map(acc -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", acc.getId());
                    m.put("accountName", acc.getAccountName());
                    m.put("balance", acc.getCurrentBalance());
                    m.put("type", acc.getCurrentBalanceType());
                    return m;
                })
                .collect(Collectors.toList());
    }
}