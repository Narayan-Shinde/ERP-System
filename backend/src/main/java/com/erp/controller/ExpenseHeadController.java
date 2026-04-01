package com.erp.controller;

import com.erp.model.ExpenseHead;
import com.erp.repository.ExpenseHeadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expense/heads")
@CrossOrigin(origins = "*")
public class ExpenseHeadController {

    @Autowired private ExpenseHeadRepository expenseHeadRepo;

    @GetMapping
    public List<ExpenseHead> getExpenseHeads() {
        return expenseHeadRepo.findByActiveTrue();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ExpenseHead createExpenseHead(@RequestBody ExpenseHead head) {
        return expenseHeadRepo.save(head);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<ExpenseHead> updateExpenseHead(@PathVariable String id, @RequestBody ExpenseHead head) {
        return expenseHeadRepo.findById(id).map(h -> {
            head.setId(id);
            return ResponseEntity.ok(expenseHeadRepo.save(head));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteExpenseHead(@PathVariable String id) {
        return expenseHeadRepo.findById(id).map(h -> {
            h.setActive(false);
            expenseHeadRepo.save(h);
            return ResponseEntity.ok("Expense Head deactivated");
        }).orElse(ResponseEntity.notFound().build());
    }
}
