package com.erp.service;

import com.erp.model.InvoiceLineItem;
import com.erp.model.SalesInvoice;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class InvoiceCalculationService {

    private static final int DECIMAL_PLACES = 2;

    public CalculationResult calculateInvoice(SalesInvoice invoice, boolean isInterState) {
        List<LineItemCalc> itemCalcs = new ArrayList<>();
        double totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0;
        double totalDiscount = 0, totalCess = 0;

        for (InvoiceLineItem item : invoice.getItems()) {
            LineItemCalc calc = calculateLineItem(item, isInterState);
            itemCalcs.add(calc);
            totalTaxable += calc.taxableAmount;
            totalCGST += calc.cgst;
            totalSGST += calc.sgst;
            totalIGST += calc.igst;
            totalDiscount += calc.discountAmount;
            totalCess += calc.cess;
        }

        double grandTotal = totalTaxable + totalCGST + totalSGST + totalIGST + totalCess;

        return new CalculationResult(
            round(totalTaxable), round(totalCGST), round(totalSGST),
            round(totalIGST), round(totalDiscount), round(totalCess),
            round(grandTotal), itemCalcs
        );
    }

    private LineItemCalc calculateLineItem(InvoiceLineItem item, boolean isInterState) {
        double qty = item.getQuantity();
        double rate = item.getRate();
        double discountPct = item.getDiscountPercent();
        double gstPct = item.getGstPercent();

        // Step 1: Calculate base amount
        double baseAmount = qty * rate;

        // Step 2: Calculate discount (on base amount)
        double discountAmount = round(baseAmount * discountPct / 100);
        double taxableAmount = round(baseAmount - discountAmount);

        // Step 3: Calculate GST (on taxable amount)
        double totalGst = round(taxableAmount * gstPct / 100);

        double cgst = 0, sgst = 0, igst = 0;
        if (isInterState) {
            igst = totalGst;
        } else {
            cgst = round(totalGst / 2);
            sgst = round(totalGst / 2);
        }

        // Step 4: Calculate CESS if applicable (typically for luxury/sin goods)
        double cess = 0;
        if (item.getHsnCode() != null && isCessApplicable(item.getHsnCode())) {
            cess = round(taxableAmount * 0.01); // 1% additional cess
        }

        return new LineItemCalc(
            item.getItemId(), item.getItemName(), qty, rate,
            round(baseAmount), discountPct, discountAmount,
            taxableAmount, gstPct, cgst, sgst, igst, cess
        );
    }

    private boolean isCessApplicable(String hsnCode) {
        // Luxury items: tobacco, vehicles, aerated drinks, etc.
        return hsnCode.startsWith("24") || hsnCode.startsWith("87") ||
               hsnCode.startsWith("22") || hsnCode.startsWith("27");
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(DECIMAL_PLACES, RoundingMode.HALF_UP).doubleValue();
    }

    public record CalculationResult(
        double totalTaxable,
        double totalCGST,
        double totalSGST,
        double totalIGST,
        double totalDiscount,
        double totalCess,
        double grandTotal,
        List<LineItemCalc> itemCalcs
    ) {}

    public record LineItemCalc(
        String itemId,
        String itemName,
        double quantity,
        double rate,
        double baseAmount,
        double discountPercent,
        double discountAmount,
        double taxableAmount,
        double gstPercent,
        double cgst,
        double sgst,
        double igst,
        double cess
    ) {}
}
