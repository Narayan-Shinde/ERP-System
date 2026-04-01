package com.erp.repository;

import com.erp.model.RecurringInvoice;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDate;
import java.util.List;

public interface RecurringInvoiceRepository extends MongoRepository<RecurringInvoice, String> {
    List<RecurringInvoice> findByStatus(String status);
    List<RecurringInvoice> findByCustomerId(String customerId);
    List<RecurringInvoice> findByStatusAndNextRunDateLessThanEqual(String status, LocalDate date);
}
