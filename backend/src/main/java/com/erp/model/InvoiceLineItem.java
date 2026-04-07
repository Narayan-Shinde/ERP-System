package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class InvoiceLineItem {
    private String itemId;
    private String itemName;
    private String itemCode;
    private String hsnCode;
    private double quantity;
    private String unit;
    private double rate;
    private double discountPercent;
    private double discountAmount;
    private double gstPercent;
    private double taxableAmount;
    private double cgst;
    private double sgst;
    private double igst;
    private double cess;
    private double totalAmount;

    // Backward compatibility getters/setters
    public double getDiscount() { return discountPercent; }
    public void setDiscount(double discount) { this.discountPercent = discount; }

    public double getGstRate() { return gstPercent; }
    public void setGstRate(double gstRate) { this.gstPercent = gstRate; }

    public double getGstAmt() { return cgst + sgst + igst; }
    public void setGstAmt(double gstAmt) {
        if (gstPercent > 0) {
            double base = taxableAmount > 0 ? taxableAmount : quantity * rate * (1 - discountPercent/100);
            this.cgst = base * (gstPercent/2) / 100;
            this.sgst = base * (gstPercent/2) / 100;
            this.igst = 0;
        }
    }

    public double getAmount() { return totalAmount; }
    public void setAmount(double amount) { this.totalAmount = amount; }

    public double getCgstAmount() { return cgst; }
    public void setCgstAmount(double cgst) { this.cgst = cgst; }

    public double getSgstAmount() { return sgst; }
    public void setSgstAmount(double sgst) { this.sgst = sgst; }

    public double getIgstAmount() { return igst; }
    public void setIgstAmount(double igst) { this.igst = igst; }

    public double getCgstRate() { return gstPercent / 2; }
    public void setCgstRate(double cgstRate) { }

    public double getSgstRate() { return gstPercent / 2; }
    public void setSgstRate(double sgstRate) { }

    public double getIgstRate() { return igst > 0 ? gstPercent : 0; }
    public void setIgstRate(double igstRate) { }
}
