package com.erp.service;

import com.erp.model.gst.HsnMaster;
import com.erp.repository.HsnMasterRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

/**
 * HSN API Service for auto-suggest and lookup of HSN codes
 * Integrates with GST Portal API and local HSN database
 */
@Slf4j
@Service
public class HsnApiService {

    @Autowired
    private HsnMasterRepository hsnRepo;
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    // GST Portal API endpoints (mock - replace with actual URLs)
    private static final String GST_HSN_SEARCH_API = "https://api.gst.gov.in/hsn/search";
    private static final String GST_HSN_VALIDATE_API = "https://api.gst.gov.in/hsn/validate";
    
    /**
     * Search HSN codes by item name/description
     * Returns best matching 8-digit HSN codes with GST rates
     */
    public List<HsnSuggestion> searchByItemName(String itemName, int limit) {
        if (itemName == null || itemName.trim().isEmpty()) {
            return Collections.emptyList();
        }
        
        String searchTerm = itemName.toLowerCase();
        
        // Search in local database first
        List<HsnMaster> matches = hsnRepo.findAll().stream()
            .filter(hsn -> {
                String desc = hsn.getDescription() != null ? hsn.getDescription().toLowerCase() : "";
                String keywords = hsn.getKeywords() != null ? String.join(" ", hsn.getKeywords()).toLowerCase() : "";
                String code = hsn.getHsnCode() != null ? hsn.getHsnCode() : "";
                
                return desc.contains(searchTerm) || 
                       keywords.contains(searchTerm) || 
                       searchTerm.contains(desc.substring(0, Math.min(10, desc.length()))) ||
                       code.equals(searchTerm);
            })
            .sorted((a, b) -> {
                // Prioritize exact matches
                int aScore = calculateMatchScore(a, searchTerm);
                int bScore = calculateMatchScore(b, searchTerm);
                return Integer.compare(bScore, aScore);
            })
            .limit(limit)
            .collect(Collectors.toList());
        
        return matches.stream()
            .map(this::convertToSuggestion)
            .collect(Collectors.toList());
    }
    
    /**
     * Get exact HSN code by 8-digit code
     */
    public Optional<HsnSuggestion> getByHsnCode(String hsnCode) {
        return hsnRepo.findByHsnCodeAndActiveTrue(hsnCode)
            .map(this::convertToSuggestion);
    }
    
    /**
     * Validate HSN code and return GST rate
     */
    public Optional<HsnValidationResult> validateHsnCode(String hsnCode) {
        return hsnRepo.findByHsnCodeAndActiveTrue(hsnCode)
            .map(hsn -> new HsnValidationResult(
                hsn.getHsnCode(),
                hsn.getGstRate(),
                hsn.getDescription(),
                hsn.getCategory(),
                true
            ));
    }
    
    /**
     * Get suggested HSN code based on item category/type
     * Uses AI-like matching based on common item patterns
     */
    public List<HsnSuggestion> getSuggestionsByCategory(String itemType, String itemDescription) {
        Map<String, List<String>> categoryKeywords = getCategoryKeywordMap();
        
        String searchText = (itemType + " " + itemDescription).toLowerCase();
        
        // Find matching categories
        List<String> matchingCategories = categoryKeywords.entrySet().stream()
            .filter(entry -> entry.getValue().stream()
                .anyMatch(keyword -> searchText.contains(keyword.toLowerCase())))
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
        
        if (matchingCategories.isEmpty()) {
            return Collections.emptyList();
        }
        
        // Return HSN codes for matching categories
        return hsnRepo.findAll().stream()
            .filter(hsn -> matchingCategories.contains(hsn.getCategory()))
            .limit(10)
            .map(this::convertToSuggestion)
            .collect(Collectors.toList());
    }
    
    /**
     * Auto-complete HSN code as user types
     * Returns matching codes starting with input
     */
    public List<HsnSuggestion> autoCompleteHsnCode(String partialCode, int limit) {
        if (partialCode == null || partialCode.length() < 2) {
            return Collections.emptyList();
        }
        
        return hsnRepo.findAll().stream()
            .filter(hsn -> hsn.getHsnCode() != null && 
                         hsn.getHsnCode().startsWith(partialCode))
            .sorted(Comparator.comparing(HsnMaster::getHsnCode))
            .limit(limit)
            .map(this::convertToSuggestion)
            .collect(Collectors.toList());
    }
    
    /**
     * Get GST rate for HSN code
     */
    public double getGstRateForHsn(String hsnCode) {
        return hsnRepo.findByHsnCodeAndActiveTrue(hsnCode)
            .map(HsnMaster::getGstRate)
            .orElse(18.0); // Default GST rate
    }
    
    // ============ Private Helper Methods ============
    
    private int calculateMatchScore(HsnMaster hsn, String searchTerm) {
        int score = 0;
        String desc = hsn.getDescription() != null ? hsn.getDescription().toLowerCase() : "";
        String code = hsn.getHsnCode() != null ? hsn.getHsnCode() : "";
        
        // Exact code match = highest score
        if (code.equals(searchTerm)) {
            score += 100;
        }
        // Code starts with search term
        else if (code.startsWith(searchTerm)) {
            score += 50;
        }
        
        // Description contains search term
        if (desc.contains(searchTerm)) {
            score += 30;
        }
        
        // Exact word match in description
        if (desc.matches(".*\\b" + searchTerm + "\\b.*")) {
            score += 20;
        }
        
        return score;
    }
    
    private HsnSuggestion convertToSuggestion(HsnMaster hsn) {
        return new HsnSuggestion(
            hsn.getHsnCode(),
            hsn.getDescription(),
            hsn.getGstRate(),
            hsn.getCategory(),
            generateRecommendationReason(hsn)
        );
    }
    
    private String generateRecommendationReason(HsnMaster hsn) {
        return String.format("HSN %s - %s%% GST - %s", 
            hsn.getHsnCode(), 
            hsn.getGstRate(),
            hsn.getCategory());
    }
    
    private Map<String, List<String>> getCategoryKeywordMap() {
        Map<String, List<String>> map = new HashMap<>();
        map.put("Plastics", Arrays.asList("plastic", "bopp", "film", "poly", "pvc", "pet"));
        map.put("Textiles", Arrays.asList("cloth", "fabric", "cotton", "silk", "wool", "yarn"));
        map.put("Metals", Arrays.asList("steel", "iron", "copper", "aluminum", "metal"));
        map.put("Electrical", Arrays.asList("wire", "cable", "electric", "motor", "switch"));
        map.put("Electronics", Arrays.asList("mobile", "computer", "electronic", "chip", "circuit"));
        map.put("Chemicals", Arrays.asList("chemical", "acid", "solvent", "paint", "ink"));
        map.put("Food", Arrays.asList("food", "beverage", "drink", "snack", "edible"));
        map.put("Furniture", Arrays.asList("furniture", "chair", "table", "wood"));
        map.put("Paper", Arrays.asList("paper", "cardboard", "print", "stationery"));
        map.put("Rubber", Arrays.asList("rubber", "tyre", "tube", "belt"));
        map.put("Machinery", Arrays.asList("machine", "equipment", "tool", "engine"));
        map.put("Vehicles", Arrays.asList("vehicle", "car", "bike", "truck", "auto"));
        map.put("Pharmaceuticals", Arrays.asList("medicine", "drug", "tablet", "pharma"));
        map.put("Cosmetics", Arrays.asList("cosmetic", "beauty", "cream", "lotion", "perfume"));
        map.put("Glass", Arrays.asList("glass", "mirror", "lens"));
        return map;
    }
    
    // ============ DTO Classes ============
    
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
