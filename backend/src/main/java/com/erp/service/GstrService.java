package com.erp.service;

import com.erp.model.PurchaseInvoice;
import com.erp.model.SalesInvoice;
import com.erp.repository.PurchaseInvoiceRepository;
import com.erp.repository.SalesInvoiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GstrService {

    @Autowired private SalesInvoiceRepository salesRepo;
    @Autowired private PurchaseInvoiceRepository purchaseRepo;

    public Map<String, Object> generateGSTR3B(LocalDate fromDate, LocalDate toDate) {
        List<SalesInvoice> salesList = salesRepo.findByInvoiceDateBetween(fromDate, toDate);
        List<PurchaseInvoice> purchaseList = purchaseRepo.findByInvoiceDateBetween(fromDate, toDate);

        List<SalesInvoice> intraStateSales = salesList.stream()
            .filter(s -> !s.isInterState()).collect(Collectors.toList());
        List<SalesInvoice> interStateSales = salesList.stream()
            .filter(SalesInvoice::isInterState).collect(Collectors.toList());

        double intraStateTaxableValue = intraStateSales.stream().mapToDouble(SalesInvoice::getSubTotal).sum();
        double intraStateCgst = intraStateSales.stream().mapToDouble(SalesInvoice::getTotalCgst).sum();
        double intraStateSgst = intraStateSales.stream().mapToDouble(SalesInvoice::getTotalSgst).sum();

        double interStateTaxableValue = interStateSales.stream().mapToDouble(SalesInvoice::getSubTotal).sum();
        double interStateIgst = interStateSales.stream().mapToDouble(SalesInvoice::getTotalIgst).sum();

        double totalOutputTax = intraStateCgst + intraStateSgst + interStateIgst;
        double totalSalesValue = salesList.stream().mapToDouble(SalesInvoice::getGrandTotal).sum();

        double itcCgst = purchaseList.stream().mapToDouble(PurchaseInvoice::getTotalCgst).sum();
        double itcSgst = purchaseList.stream().mapToDouble(PurchaseInvoice::getTotalSgst).sum();
        double itcIgst = purchaseList.stream().mapToDouble(PurchaseInvoice::getTotalIgst).sum();
        double totalITC = itcCgst + itcSgst + itcIgst;

        double netCgstPayable = Math.max(0, intraStateCgst - itcCgst);
        double netSgstPayable = Math.max(0, intraStateSgst - itcSgst);
        double netIgstPayable = Math.max(0, interStateIgst - itcIgst);
        double totalTaxPayable = netCgstPayable + netSgstPayable + netIgstPayable;

        Map<String, Map<String, Double>> rateWiseSales = new LinkedHashMap<>();
        for (SalesInvoice inv : salesList) {
            if (inv.getItems() == null) continue;
            for (SalesInvoice.InvoiceItem item : inv.getItems()) {
                String rate = String.valueOf((int) item.getGstRate()) + "%";
                rateWiseSales.computeIfAbsent(rate, k -> new LinkedHashMap<>());
                rateWiseSales.get(rate).merge("taxableValue", item.getAmount(), Double::sum);
                rateWiseSales.get(rate).merge("cgst", item.getCgstAmount(), Double::sum);
                rateWiseSales.get(rate).merge("sgst", item.getSgstAmount(), Double::sum);
                rateWiseSales.get(rate).merge("igst", item.getIgstAmount(), Double::sum);
            }
        }

        Map<String, Object> gstr3b = new LinkedHashMap<>();
        gstr3b.put("formName", "GSTR-3B");
        gstr3b.put("period", fromDate + " to " + toDate);
        gstr3b.put("generatedAt", java.time.LocalDateTime.now().toString());

        Map<String, Object> section31 = new LinkedHashMap<>();
        section31.put("description", "Details of Outward Supplies and Inward Supplies liable to Reverse Charge");
        Map<String, Object> intraState = new LinkedHashMap<>();
        intraState.put("taxableValue", intraStateTaxableValue);
        intraState.put("cgst", intraStateCgst);
        intraState.put("sgst", intraStateSgst);
        intraState.put("igst", 0.0);
        section31.put("intraSateSupplies", intraState);

        Map<String, Object> interState = new LinkedHashMap<>();
        interState.put("taxableValue", interStateTaxableValue);
        interState.put("cgst", 0.0);
        interState.put("sgst", 0.0);
        interState.put("igst", interStateIgst);
        section31.put("interStateSupplies", interState);

        section31.put("totalTaxableValue", intraStateTaxableValue + interStateTaxableValue);
        section31.put("totalOutputTax", totalOutputTax);
        section31.put("totalSalesInclGst", totalSalesValue);
        section31.put("invoiceCount", salesList.size());
        section31.put("rateWiseBreakup", rateWiseSales);
        gstr3b.put("section_3_1_outwardSupplies", section31);

        Map<String, Object> section4 = new LinkedHashMap<>();
        section4.put("description", "Eligible Input Tax Credit");
        section4.put("itcCgst", itcCgst);
        section4.put("itcSgst", itcSgst);
        section4.put("itcIgst", itcIgst);
        section4.put("totalITC", totalITC);
        section4.put("purchaseInvoiceCount", purchaseList.size());
        gstr3b.put("section_4_itc", section4);

        Map<String, Object> section51 = new LinkedHashMap<>();
        section51.put("description", "Values of Exempt, Nil Rated and Non-GST inward supplies");
        section51.put("cgstPayable", netCgstPayable);
        section51.put("sgstPayable", netSgstPayable);
        section51.put("igstPayable", netIgstPayable);
        section51.put("totalPayable", totalTaxPayable);
        section51.put("itcUtilized", Math.min(totalITC, totalOutputTax));
        section51.put("cashToBeDeposited", totalTaxPayable);
        gstr3b.put("section_5_1_taxPayable", section51);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalSales", totalSalesValue);
        summary.put("totalOutputTax", totalOutputTax);
        summary.put("totalITCAvailable", totalITC);
        summary.put("netTaxPayable", totalTaxPayable);
        summary.put("status", totalTaxPayable > 0 ? "TAX_DUE" : "REFUND_DUE");
        gstr3b.put("summary", summary);

        return gstr3b;
    }

    public Map<String, Object> generateITCReport(LocalDate fromDate, LocalDate toDate) {
        List<PurchaseInvoice> purchases = purchaseRepo.findByInvoiceDateBetween(fromDate, toDate);

        double totalCgst = 0, totalSgst = 0, totalIgst = 0, totalPurchaseValue = 0;
        List<Map<String, Object>> invoiceDetails = new ArrayList<>();

        for (PurchaseInvoice inv : purchases) {
            totalCgst += inv.getTotalCgst();
            totalSgst += inv.getTotalSgst();
            totalIgst += inv.getTotalIgst();
            totalPurchaseValue += inv.getSubTotal();

            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("invoiceNumber", inv.getInvoiceNumber());
            detail.put("supplierName", inv.getSupplierName());
            detail.put("invoiceDate", inv.getInvoiceDate());
            detail.put("taxableValue", inv.getSubTotal());
            detail.put("cgst", inv.getTotalCgst());
            detail.put("sgst", inv.getTotalSgst());
            detail.put("igst", inv.getTotalIgst());
            detail.put("totalGst", inv.getTotalGst());
            invoiceDetails.add(detail);
        }

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("period", fromDate + " to " + toDate);
        report.put("invoices", invoiceDetails);
        report.put("totalPurchaseValue", totalPurchaseValue);
        report.put("totalCgstITC", totalCgst);
        report.put("totalSgstITC", totalSgst);
        report.put("totalIgstITC", totalIgst);
        report.put("totalITCAvailable", totalCgst + totalSgst + totalIgst);
        report.put("invoiceCount", purchases.size());
        return report;
    }
}
