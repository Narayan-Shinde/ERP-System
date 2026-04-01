package com.erp.service;

import com.erp.model.CompanySettings;
import com.erp.model.SalesInvoice;
import com.erp.repository.CompanySettingsRepository;
import com.erp.repository.SalesInvoiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;

/**
 * EmailService — Invoice email pathavnyasathi.
 *
 * Setup karayla application.properties madhe add kara:
 *   spring.mail.host=smtp.gmail.com
 *   spring.mail.port=587
 *   spring.mail.username=yourcompany@gmail.com
 *   spring.mail.password=your-app-password
 *   spring.mail.properties.mail.smtp.auth=true
 *   spring.mail.properties.mail.smtp.starttls.enable=true
 *
 * Gmail sathi: Account Settings → Security → App Passwords → Generate
 */
@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private CompanySettingsRepository settingsRepo;

    @Autowired
    private SalesInvoiceRepository invoiceRepo;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    /**
     * Invoice email pathav.
     * @param invoiceId  Invoice ID
     * @param toEmail    Recipient email
     * @param subject    Email subject (optional, default generated)
     * @param body       Email body (optional, default generated)
     */
    public boolean sendInvoiceEmail(String invoiceId, String toEmail,
                                     String subject, String body) {
        if (mailSender == null) {
            // Mail not configured — log warning
            System.out.println("⚠️ Email service not configured. Add spring.mail.* properties.");
            return false;
        }

        try {
            SalesInvoice inv = invoiceRepo.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found: " + invoiceId));
            CompanySettings co = settingsRepo.findAll().stream().findFirst().orElse(new CompanySettings());
            String companyName = co.getCompanyName() != null ? co.getCompanyName() : "Our Company";

            String emailSubject = (subject != null && !subject.isBlank())
                ? subject
                : "Invoice " + inv.getInvoiceNumber() + " from " + companyName;

            String emailBody = (body != null && !body.isBlank())
                ? body
                : buildDefaultEmailBody(inv, companyName, co);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromEmail.isBlank() ? "noreply@erp.com" : fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(emailSubject);
            helper.setText(emailBody, true); // true = HTML

            mailSender.send(message);
            return true;

        } catch (MessagingException e) {
            System.err.println("Email send failed: " + e.getMessage());
            return false;
        }
    }

    private String buildDefaultEmailBody(SalesInvoice inv, String companyName, CompanySettings co) {
        String color = co.getInvoiceColor() != null ? co.getInvoiceColor() : "#1a4f8a";
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>" +
            "<div style='background:" + color + ";padding:20px;text-align:center'>" +
                "<h2 style='color:white;margin:0'>" + companyName + "</h2>" +
            "</div>" +
            "<div style='padding:24px;background:#f8fafc'>" +
                "<p>Dear <b>" + (inv.getCustomerName() != null ? inv.getCustomerName() : "Customer") + "</b>,</p>" +
                "<p>Please find the details of your invoice below:</p>" +
                "<table style='width:100%;border-collapse:collapse;margin:16px 0'>" +
                    "<tr><td style='padding:8px;border:1px solid #e2e8f0;font-weight:bold'>Invoice Number</td>" +
                        "<td style='padding:8px;border:1px solid #e2e8f0'>" + inv.getInvoiceNumber() + "</td></tr>" +
                    "<tr><td style='padding:8px;border:1px solid #e2e8f0;font-weight:bold'>Invoice Date</td>" +
                        "<td style='padding:8px;border:1px solid #e2e8f0'>" + inv.getInvoiceDate() + "</td></tr>" +
                    "<tr><td style='padding:8px;border:1px solid #e2e8f0;font-weight:bold'>Due Date</td>" +
                        "<td style='padding:8px;border:1px solid #e2e8f0'>" + (inv.getDueDate() != null ? inv.getDueDate() : "—") + "</td></tr>" +
                    "<tr><td style='padding:8px;border:1px solid #e2e8f0;font-weight:bold'>Amount</td>" +
                        "<td style='padding:8px;border:1px solid #e2e8f0;font-size:18px;font-weight:bold;color:" + color + "'>₹" + String.format("%.2f", inv.getGrandTotal()) + "</td></tr>" +
                    "<tr><td style='padding:8px;border:1px solid #e2e8f0;font-weight:bold'>Status</td>" +
                        "<td style='padding:8px;border:1px solid #e2e8f0'>" + (inv.getPaymentStatus() != null ? inv.getPaymentStatus() : "PENDING") + "</td></tr>" +
                "</table>" +
                (co.getBankName() != null ? "<p><b>Payment Details:</b><br>" +
                    "Bank: " + co.getBankName() + "<br>" +
                    "Account: " + (co.getBankAccountNumber() != null ? co.getBankAccountNumber() : "") + "<br>" +
                    "IFSC: " + (co.getIfscCode() != null ? co.getIfscCode() : "") + "<br>" +
                    (co.getUpiId() != null ? "UPI: " + co.getUpiId() : "") + "</p>" : "") +
                "<p>Thank you for your business!</p>" +
                "<p style='color:#666;font-size:12px'>This is an auto-generated email from ERP System.</p>" +
            "</div>" +
            "<div style='background:" + color + ";padding:12px;text-align:center'>" +
                "<p style='color:white;margin:0;font-size:12px'>" + companyName +
                (co.getPhone() != null ? " | " + co.getPhone() : "") +
                (co.getEmail() != null ? " | " + co.getEmail() : "") + "</p>" +
            "</div>" +
            "</div>";
    }
}
