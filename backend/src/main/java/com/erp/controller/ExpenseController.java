package com.erp.controller;

import com.erp.model.Expense;
import com.erp.repository.ExpenseRepository;
import com.erp.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expense")
@CrossOrigin(origins = "*")
public class ExpenseController {

    @Autowired private AuditLogService auditLogService;

    @Autowired private ExpenseRepository expenseRepo;

    @GetMapping
    public List<Expense> getExpenses(
            @RequestParam(required=false) String financialYear,
            @RequestParam(required=false) String fromDate,
            @RequestParam(required=false) String toDate,
            @RequestParam(required=false, defaultValue="true") boolean activeOnly) {
        if (fromDate != null && toDate != null)
            return activeOnly
                ? expenseRepo.findByActiveTrueAndExpenseDateBetween(LocalDate.parse(fromDate), LocalDate.parse(toDate))
                : expenseRepo.findByExpenseDateBetween(LocalDate.parse(fromDate), LocalDate.parse(toDate));
        if (financialYear != null)
            return expenseRepo.findByFinancialYear(financialYear);
        return activeOnly ? expenseRepo.findByActiveTrue() : expenseRepo.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public Expense createExpense(@RequestBody Expense expense) {
        expense.setActive(true);
        expense.setCancelled(false);
        if (expense.getStatus() == null) expense.setStatus("APPROVED");
        if (expense.getVoucherNumber() == null || expense.getVoucherNumber().isEmpty())
            expense.setVoucherNumber("EXP-" + String.format("%04d", expenseRepo.count() + 1));
        double gstAmt = (expense.getAmount() * expense.getGstRate() / 100.0);
        expense.setCgstAmount(gstAmt / 2);
        expense.setSgstAmount(gstAmt / 2);
        expense.setIgstAmount(0);
        expense.setTotalAmount(expense.getAmount() + gstAmt);
        Expense created = expenseRepo.save(expense);
        auditLogService.logCreate("Expense", "Expense created: " + created.getDescription() + " ₹" + created.getAmount());
        return created;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Expense> getExpense(@PathVariable String id) {
        return expenseRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<?> updateExpense(@PathVariable String id, @RequestBody Expense expense) {
        return expenseRepo.findById(id).map(e -> {
            if (e.isCancelled())
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot update cancelled expense"));
            expense.setId(id);
            expense.setActive(true);
            expense.setVoucherNumber(e.getVoucherNumber()); // preserve voucher number
            double gstAmt = (expense.getAmount() * expense.getGstRate() / 100.0);
            expense.setCgstAmount(gstAmt / 2);
            expense.setSgstAmount(gstAmt / 2);
            expense.setTotalAmount(expense.getAmount() + gstAmt);
            Expense saved = expenseRepo.save(expense);
            auditLogService.logUpdate("Expense", "Expense updated: " + saved.getDescription() + " ₹" + saved.getAmount());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> cancelExpense(@PathVariable String id,
            @RequestParam(required=false) String reason) {
        return expenseRepo.findById(id).map(e -> {
            if (e.isCancelled())
                return ResponseEntity.badRequest().body(Map.of("error", "Expense already cancelled"));
            e.setCancelled(true);
            e.setActive(false);
            e.setStatus("CANCELLED");
            e.setCancelledReason(reason != null ? reason : "Cancelled by admin");
            expenseRepo.save(e);
            return ResponseEntity.ok(Map.of(
                "message", "Expense cancelled. Original entry preserved for audit trail.",
                "voucherNumber", e.getVoucherNumber()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/report/summary")
    public ResponseEntity<?> getExpenseSummary(
            @RequestParam(required=false) String fromDate,
            @RequestParam(required=false) String toDate) {
        List<Expense> expenses = fromDate != null && toDate != null
            ? expenseRepo.findByActiveTrueAndExpenseDateBetween(LocalDate.parse(fromDate), LocalDate.parse(toDate))
            : expenseRepo.findByActiveTrue();

        double totalAmount = expenses.stream().mapToDouble(Expense::getAmount).sum();
        double totalGst    = expenses.stream().mapToDouble(e -> e.getCgstAmount() + e.getSgstAmount()).sum();
        double totalWithGst = expenses.stream().mapToDouble(Expense::getTotalAmount).sum();

        java.util.Map<String, Double> headWise = new java.util.LinkedHashMap<>();
        for (Expense e : expenses)
            headWise.merge(e.getExpenseHeadName() != null ? e.getExpenseHeadName() : "Other", e.getAmount(), Double::sum);

        return ResponseEntity.ok(Map.of(
            "expenses", expenses, "totalAmount", totalAmount,
            "totalGst", totalGst, "totalWithGst", totalWithGst,
            "headWise", headWise, "count", expenses.size()));
    }
}
