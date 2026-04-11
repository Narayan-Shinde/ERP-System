package com.erp.controller;
import com.erp.model.PurchaseInvoice;
import com.erp.model.PurchaseReturn;
import com.erp.model.SalesInvoice;
import com.erp.model.SalesReturn;
import com.erp.model.GstConfiguration;

import com.erp.repository.GstConfigurationRepository;
import com.erp.repository.PurchaseInvoiceRepository;
import com.erp.repository.SalesReturnRepository;
import com.erp.repository.PurchaseReturnRepository;

import com.erp.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/gst")
@CrossOrigin(origins = "*")
public class GstController {

    @Autowired private GstConfigurationRepository gstConfigRepo;
    @Autowired private SalesInvoiceRepository salesInvoiceRepo;
    @Autowired private PurchaseInvoiceRepository purchaseInvoiceRepo;
    @Autowired private SalesReturnRepository salesReturnRepo;
    @Autowired private PurchaseReturnRepository purchaseReturnRepo;

    // ================= COMMON METHODS =================

    private boolean isValidReturn(String status) {
        return "APPROVED".equals(status) || "COMPLETED".equals(status);
    }

    private boolean isWithinDate(LocalDate date, LocalDate from, LocalDate to) {
        return date != null && !date.isBefore(from) && !date.isAfter(to);
    }

    // ================= CONFIG =================

    @GetMapping("/configurations")
    public List<GstConfiguration> getConfigurations() {
        return gstConfigRepo.findAll();
    }

    @PostMapping("/configurations")
    @PreAuthorize("hasRole('ADMIN')")
    public GstConfiguration createConfig(@RequestBody GstConfiguration config) {
        return gstConfigRepo.save(config);
    }

    @PutMapping("/configurations/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateConfig(@PathVariable String id, @RequestBody GstConfiguration config) {
        return gstConfigRepo.findById(id).map(existing -> {
            config.setId(id);
            return ResponseEntity.ok(gstConfigRepo.save(config));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/configurations/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteConfig(@PathVariable String id) {
        if (!gstConfigRepo.existsById(id)) return ResponseEntity.notFound().build();
        gstConfigRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ================= GSTR1 (MAIN) =================

    @GetMapping("/gstr1")
    public ResponseEntity<?> getGSTR1(
            @RequestParam String fromDate,
            @RequestParam String toDate) {

        LocalDate from = LocalDate.parse(fromDate);
        LocalDate to   = LocalDate.parse(toDate);

        List<SalesInvoice> invoices = salesInvoiceRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled())
                .filter(i -> isWithinDate(i.getInvoiceDate(), from, to))
                .collect(Collectors.toList());

        // B2B
        List<Map<String,Object>> b2b = invoices.stream()
                .filter(i -> i.getCustomerGstin() != null && !i.getCustomerGstin().isBlank())
                .map(this::mapSalesInvoice)
                .collect(Collectors.toList());

        // B2C
        List<Map<String,Object>> b2c = invoices.stream()
                .filter(i -> i.getCustomerGstin() == null || i.getCustomerGstin().isBlank())
                .map(this::mapSalesInvoice)
                .collect(Collectors.toList());

        // Sales Returns
        List<SalesReturn> returns = salesReturnRepo.findAll().stream()
                .filter(r -> isValidReturn(r.getStatus()))
                .filter(r -> isWithinDate(r.getReturnDate(), from, to))
                .collect(Collectors.toList());

        List<Map<String,Object>> cdnr = returns.stream()
                .filter(r -> r.getCustomerGstin() != null && !r.getCustomerGstin().isBlank())
                .map(r -> {
                    Map<String,Object> m = new LinkedHashMap<>();
                    m.put("returnNumber", r.getReturnNumber());
                    m.put("returnDate", r.getReturnDate());
                    m.put("customerName", r.getCustomerName());
                    m.put("customerGstin", r.getCustomerGstin());
                    m.put("taxableAmount", r.getSubTotal());
                    m.put("totalGst", r.getTotalGst());
                    m.put("grandTotal", r.getGrandTotal());
                    return m;
                }).collect(Collectors.toList());

        double totalSales = invoices.stream().mapToDouble(SalesInvoice::getGrandTotal).sum();
        double totalReturns = returns.stream().mapToDouble(SalesReturn::getGrandTotal).sum();

        return ResponseEntity.ok(Map.of(
                "b2b", b2b,
                "b2c", b2c,
                "cdnr", cdnr,
                "totalInvoices", invoices.size(),
                "netSales", totalSales - totalReturns
        ));
    }

    // ================= GSTR1 SUMMARY (FIXED DUPLICATE API) =================

    @GetMapping("/gstr1-summary")
    public ResponseEntity<?> generateGSTR1Summary(
            @RequestParam String fromDate,
            @RequestParam String toDate) {

        LocalDate from = LocalDate.parse(fromDate);
        LocalDate to   = LocalDate.parse(toDate);

        List<SalesInvoice> invoices = salesInvoiceRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled())
                .filter(i -> isWithinDate(i.getInvoiceDate(), from, to))
                .collect(Collectors.toList());

        double taxable = invoices.stream().mapToDouble(SalesInvoice::getSubTotal).sum();
        double cgst = invoices.stream().mapToDouble(SalesInvoice::getTotalCgst).sum();
        double sgst = invoices.stream().mapToDouble(SalesInvoice::getTotalSgst).sum();
        double igst = invoices.stream().mapToDouble(SalesInvoice::getTotalIgst).sum();

        return ResponseEntity.ok(Map.of(
                "taxable", taxable,
                "cgst", cgst,
                "sgst", sgst,
                "igst", igst,
                "totalGst", cgst + sgst + igst
        ));
    }

    // ================= TAX LIABILITY =================

    @GetMapping("/tax-liability")
    public ResponseEntity<?> getTaxLiability(
            @RequestParam String fromDate,
            @RequestParam String toDate) {

        LocalDate from = LocalDate.parse(fromDate);
        LocalDate to   = LocalDate.parse(toDate);

        List<SalesInvoice> sales = salesInvoiceRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled())
                .filter(i -> isWithinDate(i.getInvoiceDate(), from, to))
                .collect(Collectors.toList());

        List<PurchaseInvoice> purchases = purchaseInvoiceRepo.findAll().stream()
                .filter(i -> i.isActive() && !i.isCancelled())
                .filter(i -> isWithinDate(i.getInvoiceDate(), from, to))
                .collect(Collectors.toList());

        double outputGst = sales.stream().mapToDouble(SalesInvoice::getTotalGst).sum();
        double inputGst  = purchases.stream().mapToDouble(PurchaseInvoice::getTotalGst).sum();

        double net = outputGst - inputGst;

        return ResponseEntity.ok(Map.of(
                "outputGst", outputGst,
                "inputGst", inputGst,
                "netPayable", Math.max(0, net),
                "excessITC", Math.max(0, -net)
        ));
    }

    // ================= GSTR3B =================

    @GetMapping("/gstr3b")
    public ResponseEntity<?> getGSTR3B(
            @RequestParam String fromDate,
            @RequestParam String toDate) {

        LocalDate from = LocalDate.parse(fromDate);
        LocalDate to   = LocalDate.parse(toDate);

        double output = salesInvoiceRepo.findAll().stream()
                .filter(i -> isWithinDate(i.getInvoiceDate(), from, to))
                .mapToDouble(SalesInvoice::getTotalGst).sum();

        double input = purchaseInvoiceRepo.findAll().stream()
                .filter(i -> isWithinDate(i.getInvoiceDate(), from, to))
                .mapToDouble(PurchaseInvoice::getTotalGst).sum();

        return ResponseEntity.ok(Map.of(
                "outputTax", output,
                "inputTaxCredit", input,
                "netLiability", output - input
        ));
    }

    // ================= ITC REPORT =================

    @GetMapping("/itc-report")
    public ResponseEntity<?> getITCReport(
            @RequestParam String fromDate,
            @RequestParam String toDate) {

        LocalDate from = LocalDate.parse(fromDate);
        LocalDate to   = LocalDate.parse(toDate);

        List<PurchaseInvoice> invoices = purchaseInvoiceRepo.findAll().stream()
                .filter(i -> isWithinDate(i.getInvoiceDate(), from, to))
                .collect(Collectors.toList());

        double totalITC = invoices.stream().mapToDouble(PurchaseInvoice::getTotalGst).sum();

        return ResponseEntity.ok(Map.of(
                "totalInvoices", invoices.size(),
                "totalITC", totalITC
        ));
    }

    // ================= HELPER =================

    private Map<String,Object> mapSalesInvoice(SalesInvoice i) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("invoiceNumber", i.getInvoiceNumber());
        m.put("invoiceDate", i.getInvoiceDate());
        m.put("customerName", i.getCustomerName());
        m.put("taxableAmount", i.getSubTotal());
        m.put("cgst", i.getTotalCgst());
        m.put("sgst", i.getTotalSgst());
        m.put("igst", i.getTotalIgst());
        m.put("totalGst", i.getTotalGst());
        m.put("grandTotal", i.getGrandTotal());
        return m;
    }
}