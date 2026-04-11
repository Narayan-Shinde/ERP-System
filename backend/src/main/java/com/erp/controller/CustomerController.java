package com.erp.controller;

import com.erp.model.Customer;
import com.erp.model.SalesInvoice;
import com.erp.model.SalesReturn;
import com.erp.repository.CustomerRepository;
import com.erp.repository.SalesInvoiceRepository;
import com.erp.repository.SalesReturnRepository;
import com.erp.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "*")
public class CustomerController {

    @Autowired private CustomerRepository customerRepo;
    @Autowired private SalesInvoiceRepository invoiceRepo;
    @Autowired private SalesReturnRepository returnRepo;
    @Autowired private AuditLogService auditLogService;

    // ─────────────── LEDGER ───────────────
    @GetMapping("/{id}/ledger")
    public ResponseEntity<?> getCustomerLedger(
            @PathVariable String id,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String financialYear) {
        return customerRepo.findById(id).map(cust -> {
            List<SalesInvoice> invoices = invoiceRepo.findByCustomerId(id).stream()
                .filter(i -> !i.isCancelled())
                .sorted(Comparator.comparing(i -> i.getInvoiceDate() != null ? i.getInvoiceDate() : LocalDate.MIN))
                .collect(Collectors.toList());

            // Date filter
            if (fromDate != null && toDate != null) {
                LocalDate from = LocalDate.parse(fromDate);
                LocalDate to   = LocalDate.parse(toDate);
                invoices = invoices.stream()
                    .filter(i -> i.getInvoiceDate() != null
                        && !i.getInvoiceDate().isBefore(from)
                        && !i.getInvoiceDate().isAfter(to))
                    .collect(Collectors.toList());
            } else if (financialYear != null && !financialYear.equals("ALL")) {
                invoices = invoices.stream()
                    .filter(i -> financialYear.equals(i.getFinancialYear()))
                    .collect(Collectors.toList());
            }

            // Build ledger rows
            double running = cust.getOpeningBalance();
            List<Map<String, Object>> rows = new ArrayList<>();

            // Opening balance row
            Map<String, Object> opRow = new LinkedHashMap<>();
            opRow.put("date",        "Opening");
            opRow.put("type",        "OPENING");
            opRow.put("reference",   "Opening Balance");
            opRow.put("debit",       cust.getOpeningBalance() > 0 ? cust.getOpeningBalance() : 0);
            opRow.put("credit",      cust.getOpeningBalance() < 0 ? Math.abs(cust.getOpeningBalance()) : 0);
            opRow.put("balance",     running);
            rows.add(opRow);

            for (SalesInvoice inv : invoices) {
                double grandTotal = inv.getGrandTotal();
                double paid       = inv.getPaidAmount();

                // Invoice row (Debit — customer owes)
                running += grandTotal;
                Map<String, Object> invRow = new LinkedHashMap<>();
                invRow.put("date",      inv.getInvoiceDate());
                invRow.put("type",      "INVOICE");
                invRow.put("reference", inv.getInvoiceNumber());
                invRow.put("narration", "Sales Invoice" + (inv.getItems()!=null?" ("+inv.getItems().size()+" items)":""));
                invRow.put("debit",     grandTotal);
                invRow.put("credit",    0.0);
                invRow.put("balance",   running);
                invRow.put("status",    inv.getPaymentStatus());
                invRow.put("dueDate",   inv.getDueDate());
                rows.add(invRow);

                // Payment row (Credit — customer paid)
                if (paid > 0) {
                    running -= paid;
                    Map<String, Object> payRow = new LinkedHashMap<>();
                    payRow.put("date",      inv.getInvoiceDate());
                    payRow.put("type",      "PAYMENT");
                    payRow.put("reference", "PMT-" + inv.getInvoiceNumber());
                    payRow.put("narration", "Payment received");
                    payRow.put("debit",     0.0);
                    payRow.put("credit",    paid);
                    payRow.put("balance",   running);
                    rows.add(payRow);
                }
            }

            // Returns — balance 0 ठेवतो, sort नंतर recalculate होईल
            List<SalesReturn> returns = returnRepo.findByCustomerId(id).stream()
                .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                .collect(Collectors.toList());
            for (SalesReturn ret : returns) {
                Map<String, Object> retRow = new LinkedHashMap<>();
                retRow.put("date",      ret.getReturnDate());
                retRow.put("type",      "RETURN");
                retRow.put("reference", ret.getReturnNumber());
                retRow.put("narration", "Sales Return");
                retRow.put("debit",     0.0);
                retRow.put("credit",    ret.getGrandTotal());
                retRow.put("balance",   0.0); // sort नंतर recalculate
                rows.add(retRow);
            }

            // Sort by date — Opening नेहमी पहिला
            rows.sort((a, b) -> {
                String da = String.valueOf(a.get("date")), db = String.valueOf(b.get("date"));
                if ("Opening".equals(da)) return -1;
                if ("Opening".equals(db)) return 1;
                return da.compareTo(db);
            });

            // Sort नंतर सर्व rows चा balance sequence मध्ये recalculate
            double runningBalance = cust.getOpeningBalance();
            for (Map<String, Object> row : rows) {
                String type = (String) row.get("type");
                if ("OPENING".equals(type)) {
                    runningBalance = cust.getOpeningBalance();
                    row.put("balance", runningBalance);
                } else if ("INVOICE".equals(type)) {
                    runningBalance += (Double) row.get("debit");
                    row.put("balance", runningBalance);
                } else if ("PAYMENT".equals(type)) {
                    runningBalance -= (Double) row.get("credit");
                    row.put("balance", runningBalance);
                } else if ("RETURN".equals(type)) {
                    // Sales Return — customer कडून माल परत, त्यांचे देणे कमी होते
                    runningBalance -= (Double) row.get("credit");
                    row.put("balance", runningBalance);
                }
            }
            running = runningBalance;

            // Summary
            double totalDebit  = rows.stream().mapToDouble(r -> (Double) r.get("debit")).sum();
            double totalCredit = rows.stream().mapToDouble(r -> (Double) r.get("credit")).sum();

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("customerId",    cust.getId());
            result.put("customerName",  cust.getCustomerName());
            result.put("customerCode",  cust.getCustomerCode());
            result.put("phone",         cust.getPhone());
            result.put("gstin",         cust.getGstin());
            result.put("creditLimit",   cust.getCreditLimit());
            result.put("creditDays",    cust.getCreditDays());
            result.put("currentBalance",cust.getCurrentBalance());
            result.put("balanceType",   cust.getBalanceType());
            result.put("totalDebit",    totalDebit);
            result.put("totalCredit",   totalCredit);
            result.put("closingBalance",running);
            result.put("rows",          rows);
            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────── OUTSTANDING / OVERDUE ───────────────
    @GetMapping("/overdue")
    public ResponseEntity<?> getOverdueCustomers() {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Customer cust : customerRepo.findByActiveTrue()) {
            List<SalesInvoice> overdue = invoiceRepo.findByCustomerId(cust.getId()).stream()
                .filter(i -> !i.isCancelled()
                    && (i.getPaymentStatus() == null
                        || "PENDING".equals(i.getPaymentStatus())
                        || "PARTIAL".equals(i.getPaymentStatus()))
                    && i.getDueDate() != null
                    && i.getDueDate().isBefore(today))
                .collect(Collectors.toList());

            if (!overdue.isEmpty()) {
                double overdueAmt = overdue.stream().mapToDouble(SalesInvoice::getBalanceDue).sum();
                int maxDaysOverdue = overdue.stream()
                    .mapToInt(i -> (int) today.toEpochDay() - (int) i.getDueDate().toEpochDay())
                    .max().orElse(0);
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("customerId",     cust.getId());
                row.put("customerName",   cust.getCustomerName());
                row.put("customerCode",   cust.getCustomerCode());
                row.put("phone",          cust.getPhone());
                row.put("email",          cust.getEmail());
                row.put("whatsapp",       cust.getWhatsapp());
                row.put("overdueAmount",  overdueAmt);
                row.put("overdueInvoices",overdue.size());
                row.put("maxDaysOverdue", maxDaysOverdue);

                // Interest calculation @ 18% per annum (as per standard T&C)
                double interestAmt = overdue.stream().mapToDouble(inv -> {
                    if (inv.getDueDate() == null) return 0;
                    long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(inv.getDueDate(), today);
                    if (daysOverdue <= 0) return 0;
                    double rate = 18.0; // 18% per annum default
                    return inv.getBalanceDue() * (rate / 100.0) * (daysOverdue / 365.0);
                }).sum();
                row.put("interestAmount", Math.round(interestAmt * 100.0) / 100.0);
                row.put("totalWithInterest", Math.round((overdueAmt + interestAmt) * 100.0) / 100.0);
                row.put("currentBalance", cust.getCurrentBalance());
                row.put("creditLimit",    cust.getCreditLimit());
                result.add(row);
            }
        }

        result.sort((a, b) -> Double.compare(
            (Double) b.get("overdueAmount"), (Double) a.get("overdueAmount")));
        return ResponseEntity.ok(result);
    }

    // ─────────────── PURCHASE HISTORY ───────────────
    @GetMapping("/{id}/invoices")
    public ResponseEntity<?> getCustomerInvoices(@PathVariable String id) {
        List<SalesInvoice> invoices = invoiceRepo.findByCustomerId(id).stream()
            .sorted(Comparator.comparing(
                i -> i.getInvoiceDate() != null ? i.getInvoiceDate() : LocalDate.MIN,
                Comparator.reverseOrder()))
            .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("invoices", invoices, "count", invoices.size(),
            "totalBusiness", invoices.stream().mapToDouble(SalesInvoice::getGrandTotal).sum()));
    }

    // ─────────────── CREDIT LIMIT CHECK ───────────────
    @GetMapping("/{id}/credit-check")
    public ResponseEntity<?> checkCreditLimit(
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "0") double newInvoiceAmount) {
        return customerRepo.findById(id).map(cust -> {
            double limit   = cust.getCreditLimit();
            double current = cust.getCurrentBalance();
            double after   = current + newInvoiceAmount;
            boolean exceeded = limit > 0 && after > limit;
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("creditLimit",    limit);
            result.put("currentBalance", current);
            result.put("newInvoiceAmount", newInvoiceAmount);
            result.put("balanceAfter",   after);
            result.put("available",      limit > 0 ? Math.max(0, limit - current) : -1);
            result.put("exceeded",       exceeded);
            result.put("message", exceeded
                ? "⚠️ Credit limit exceeded! Limit: ₹" + limit + " | Current balance: ₹" + current
                : "✅ Within credit limit");
            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────── SUMMARY STATS ───────────────
    @GetMapping("/summary")
    public ResponseEntity<?> getCustomerSummary() {
        List<Customer> all = customerRepo.findByActiveTrue();
        double totalOutstanding = all.stream()
            .filter(c -> c.getCurrentBalance() > 0)
            .mapToDouble(Customer::getCurrentBalance).sum();
        long overdueCount = 0;
        LocalDate today = LocalDate.now();
        for (Customer c : all) {
            boolean hasOverdue = invoiceRepo.findByCustomerId(c.getId()).stream()
                .anyMatch(i -> !i.isCancelled()
                    && ("PENDING".equals(i.getPaymentStatus()) || "PARTIAL".equals(i.getPaymentStatus()))
                    && i.getDueDate() != null && i.getDueDate().isBefore(today));
            if (hasOverdue) overdueCount++;
        }
        return ResponseEntity.ok(Map.of(
            "totalCustomers",    all.size(),
            "totalOutstanding",  totalOutstanding,
            "overdueCustomers",  overdueCount,
            "activeCustomers",   all.stream().filter(Customer::isActive).count()
        ));
    }
}
