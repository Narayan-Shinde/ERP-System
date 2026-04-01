package com.erp.repository;
import com.erp.model.SalesInvoice;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDate;
import java.util.List;

public interface SalesInvoiceRepository extends MongoRepository<SalesInvoice, String> {
    List<SalesInvoice> findByActiveTrue();
    List<SalesInvoice> findByActiveTrueAndPaymentStatus(String status);
    List<SalesInvoice> findByPaymentStatus(String status);
    List<SalesInvoice> findByCustomerId(String customerId);
    List<SalesInvoice> findByFinancialYear(String financialYear);
    List<SalesInvoice> findByInvoiceDateBetween(LocalDate from, LocalDate to);
    List<SalesInvoice> findByActiveTrueAndInvoiceDateBetween(LocalDate from, LocalDate to);
    boolean existsBySoReferenceAndCancelledFalse(String soReference);
}
