package com.erp.repository;
import com.erp.model.PurchaseInvoice;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDate;
import java.util.List;

public interface PurchaseInvoiceRepository extends MongoRepository<PurchaseInvoice, String> {
    List<PurchaseInvoice> findByActiveTrue();
    List<PurchaseInvoice> findByActiveTrueAndPaymentStatus(String status);
    List<PurchaseInvoice> findByPaymentStatus(String status);
    List<PurchaseInvoice> findBySupplierId(String supplierId);
    List<PurchaseInvoice> findByFinancialYear(String financialYear);
    List<PurchaseInvoice> findByInvoiceDateBetween(LocalDate from, LocalDate to);
    List<PurchaseInvoice> findByActiveTrueAndInvoiceDateBetween(LocalDate from, LocalDate to);
    boolean existsByPoReferenceAndCancelledFalse(String poReference);
}
