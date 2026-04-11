package com.erp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * HSN API Service - directly reads HSN_SAC.json (21,790 codes)
 * MongoDB वर depend नाही — JSON file in-memory load होते
 */
@Slf4j
@Service
public class HsnApiService {

    // In-memory list — startup ला एकदाच load होते
    private final List<HsnEntry> ALL_HSN = new ArrayList<>();

    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("HSN_SAC.json");
            if (!resource.exists()) {
                log.warn("HSN_SAC.json not found in classpath!");
                return;
            }
            ObjectMapper mapper = new ObjectMapper();
            try (InputStream is = resource.getInputStream()) {
                JsonNode root = mapper.readTree(is);
                JsonNode sections = root.get("sections");
                if (sections != null && sections.isArray()) {
                    for (JsonNode section : sections) {
                        JsonNode codes = section.get("codes");
                        if (codes != null && codes.isArray()) {
                            for (JsonNode code : codes) {
                                String hsn  = code.has("hsn")  ? code.get("hsn").asText()  : "";
                                String desc = code.has("desc") ? code.get("desc").asText() : "";
                                double gst  = code.has("gst")  ? code.get("gst").asDouble() : 18.0;
                                if (!hsn.isEmpty()) {
                                    ALL_HSN.add(new HsnEntry(hsn, desc.toUpperCase(), gst));
                                }
                            }
                        }
                    }
                }
            }
            log.info("HSN_SAC.json loaded: {} codes", ALL_HSN.size());
        } catch (Exception e) {
            log.error("Failed to load HSN_SAC.json: {}", e.getMessage());
        }
    }

    // ─── Item Name वरून best matching HSN शोधतो ───
    public List<HsnSuggestion> searchByItemName(String itemName, int limit) {
        if (itemName == null || itemName.trim().isEmpty()) return Collections.emptyList();

        String[] words = itemName.trim().toUpperCase().split("\\s+");

        // प्रत्येक entry ला score देतो
        List<ScoredEntry> scored = new ArrayList<>();
        for (HsnEntry entry : ALL_HSN) {
            int score = 0;
            for (String word : words) {
                if (word.length() > 1 && entry.desc.contains(word)) {
                    score += word.length(); // longer word = higher score
                }
            }
            if (score > 0) {
                // 8-digit codes ला जास्त priority
                if (entry.hsn.length() == 8) score += 50;
                else if (entry.hsn.length() == 6) score += 20;
                else if (entry.hsn.length() == 4) score += 5;
                scored.add(new ScoredEntry(entry, score));
            }
        }

        scored.sort((a, b) -> Integer.compare(b.score, a.score));

        return scored.stream()
            .limit(limit)
            .map(s -> new HsnSuggestion(s.entry.hsn, s.entry.desc, s.entry.gst, "", ""))
            .collect(Collectors.toList());
    }

    // ─── HSN code prefix वरून autocomplete ───
    public List<HsnSuggestion> autoCompleteHsnCode(String partialCode, int limit) {
        if (partialCode == null || partialCode.length() < 2) return Collections.emptyList();
        return ALL_HSN.stream()
            .filter(e -> e.hsn.startsWith(partialCode))
            .sorted(Comparator.comparing(e -> e.hsn))
            .limit(limit)
            .map(e -> new HsnSuggestion(e.hsn, e.desc, e.gst, "", ""))
            .collect(Collectors.toList());
    }

    // ─── Exact HSN code lookup ───
    public Optional<HsnSuggestion> getByHsnCode(String hsnCode) {
        return ALL_HSN.stream()
            .filter(e -> e.hsn.equals(hsnCode))
            .findFirst()
            .map(e -> new HsnSuggestion(e.hsn, e.desc, e.gst, "", ""));
    }

    // ─── Validate HSN code ───
    public Optional<HsnValidationResult> validateHsnCode(String hsnCode) {
        return ALL_HSN.stream()
            .filter(e -> e.hsn.equals(hsnCode))
            .findFirst()
            .map(e -> new HsnValidationResult(e.hsn, e.gst, e.desc, "", true));
    }

    // ─── GST rate for HSN code ───
    public double getGstRateForHsn(String hsnCode) {
        return ALL_HSN.stream()
            .filter(e -> e.hsn.equals(hsnCode))
            .findFirst()
            .map(e -> e.gst)
            .orElse(18.0);
    }

    // ─── Category suggestions ───
    public List<HsnSuggestion> getSuggestionsByCategory(String itemType, String description) {
        String combined = (itemType + " " + description).trim();
        return searchByItemName(combined, 10);
    }

    // ─── Internal classes ───
    private static class HsnEntry {
        final String hsn, desc;
        final double gst;
        HsnEntry(String hsn, String desc, double gst) {
            this.hsn = hsn; this.desc = desc; this.gst = gst;
        }
    }

    private static class ScoredEntry {
        final HsnEntry entry;
        final int score;
        ScoredEntry(HsnEntry entry, int score) {
            this.entry = entry; this.score = score;
        }
    }

    // ─── DTO Classes ───
    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class HsnSuggestion {
        private String hsnCode;
        private String description;
        private double gstRate;
        private String category;
        private String reason;
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class HsnValidationResult {
        private String hsnCode;
        private double gstRate;
        private String description;
        private String category;
        private boolean valid;
    }
}
