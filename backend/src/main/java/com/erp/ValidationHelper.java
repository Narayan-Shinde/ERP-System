package com.erp.util;

import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Centralized validation helper for ERP
 * Phone, Email, GSTIN, PAN validation
 */
public class ValidationHelper {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private static final Pattern PHONE_PATTERN =
        Pattern.compile("^[6-9]\\d{9}$");  // Indian mobile: starts 6-9, 10 digits

    private static final Pattern GSTIN_PATTERN =
        Pattern.compile("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$");

    private static final Pattern PAN_PATTERN =
        Pattern.compile("^[A-Z]{5}[0-9]{4}[A-Z]{1}$");

    private static final Pattern PINCODE_PATTERN =
        Pattern.compile("^[1-9][0-9]{5}$");  // 6-digit Indian pincode

    /** Returns error ResponseEntity if validation fails, else null = OK */
    public static ResponseEntity<?> validatePhone(String phone, String fieldLabel) {
        if (phone == null || phone.trim().isEmpty()) return null; // optional
        String cleaned = phone.trim().replaceAll("[\\s\\-()]", "");
        if (!PHONE_PATTERN.matcher(cleaned).matches())
            return ResponseEntity.badRequest().body(Map.of("error",
                (fieldLabel != null ? fieldLabel : "Phone") +
                " 10 digits cha hava, aani 6-9 ne start honyapahijhe. Got: " + phone));
        return null;
    }

    public static ResponseEntity<?> validateEmail(String email, String fieldLabel) {
        if (email == null || email.trim().isEmpty()) return null; // optional
        if (!EMAIL_PATTERN.matcher(email.trim()).matches())
            return ResponseEntity.badRequest().body(Map.of("error",
                (fieldLabel != null ? fieldLabel : "Email") + " valid nahi aahe. Got: " + email));
        return null;
    }

    public static ResponseEntity<?> validateGSTIN(String gstin) {
        if (gstin == null || gstin.trim().isEmpty()) return null; // optional
        String g = gstin.trim().toUpperCase();
        if (g.length() != 15)
            return ResponseEntity.badRequest().body(Map.of("error",
                "GSTIN exactly 15 characters cha hava. Got " + g.length() + " chars: " + g));
        if (!GSTIN_PATTERN.matcher(g).matches())
            return ResponseEntity.badRequest().body(Map.of("error",
                "GSTIN format invalid. Format: 22AAAAA0000A1Z5. Got: " + g));
        return null;
    }

    public static ResponseEntity<?> validatePAN(String pan) {
        if (pan == null || pan.trim().isEmpty()) return null;
        if (!PAN_PATTERN.matcher(pan.trim().toUpperCase()).matches())
            return ResponseEntity.badRequest().body(Map.of("error",
                "PAN format invalid. Format: ABCDE1234F. Got: " + pan));
        return null;
    }

    public static ResponseEntity<?> validatePincode(String pin) {
        if (pin == null || pin.trim().isEmpty()) return null;
        if (!PINCODE_PATTERN.matcher(pin.trim()).matches())
            return ResponseEntity.badRequest().body(Map.of("error",
                "Pincode 6 digits cha hava. Got: " + pin));
        return null;
    }

    public static ResponseEntity<?> validateRequiredString(String value, String fieldName) {
        if (value == null || value.trim().isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error",
                fieldName + " required aahe — empty nahi chalnar!"));
        return null;
    }

    public static String cleanPhone(String phone) {
        if (phone == null) return null;
        return phone.trim().replaceAll("[\\s\\-()]", "");
    }

    public static String cleanEmail(String email) {
        if (email == null) return null;
        return email.trim().toLowerCase();
    }

    public static String cleanGSTIN(String gstin) {
        if (gstin == null) return null;
        return gstin.trim().toUpperCase();
    }
}
