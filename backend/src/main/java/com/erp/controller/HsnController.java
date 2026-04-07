package com.erp.controller;

import com.erp.model.gst.HsnMaster;
import com.erp.repository.HsnMasterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * HSN Master Controller - GST HSN Code management
 */
@RestController
@RequestMapping("/api/hsn")
@CrossOrigin(origins = "*")
public class HsnController {

    @Autowired
    private HsnMasterRepository hsnRepo;

    /**
     * Search HSN by keyword (item name or description)
     * GET /api/hsn/search?keyword=rice
     */
    @GetMapping("/search")
    public ResponseEntity<?> searchHsn(@RequestParam String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Keyword is required"));
        }

        String searchTerm = keyword.trim();

        // Try exact match first
        List<HsnMaster> results = hsnRepo.searchByKeyword(searchTerm);

        // If no results, try partial word matching
        if (results.isEmpty() && searchTerm.length() >= 3) {
            // Split by spaces and search individual words
            String[] words = searchTerm.toLowerCase().split("\\s+");
            for (String word : words) {
                if (word.length() >= 3) {
                    List<HsnMaster> wordResults = hsnRepo.findByDescriptionLike(word);
                    for (HsnMaster hsn : wordResults) {
                        if (!results.contains(hsn)) {
                            results.add(hsn);
                        }
                    }
                }
            }
        }

        // Sort by relevance - exact matches first
        results.sort((a, b) -> {
            String aDesc = a.getDescription() != null ? a.getDescription().toLowerCase() : "";
            String bDesc = b.getDescription() != null ? b.getDescription().toLowerCase() : "";
            String searchLower = searchTerm.toLowerCase();

            boolean aExact = aDesc.contains(searchLower);
            boolean bExact = bDesc.contains(searchLower);

            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return aDesc.compareTo(bDesc);
        });

        return ResponseEntity.ok(Map.of(
            "keyword", searchTerm,
            "count", results.size(),
            "results", results
        ));
    }

    /**
     * Get HSN by code
     * GET /api/hsn/{code}
     */
    @GetMapping("/{code}")
    public ResponseEntity<?> getByCode(@PathVariable String code) {
        Optional<HsnMaster> hsn = hsnRepo.findByHsnCodeAndActiveTrue(code);
        if (hsn.isPresent()) {
            return ResponseEntity.ok(hsn.get());
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Auto-suggest HSN for an item name
     * GET /api/hsn/suggest?itemName=Rice
     */
    @GetMapping("/suggest")
    public ResponseEntity<?> suggestHsn(@RequestParam String itemName) {
        if (itemName == null || itemName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Item name is required"));
        }

        String searchTerm = itemName.trim();
        List<HsnMaster> suggestions = hsnRepo.findByDescriptionLike(searchTerm);

        // If no direct matches, try word by word
        if (suggestions.isEmpty()) {
            String[] words = searchTerm.toLowerCase().split("\\s+");
            for (String word : words) {
                if (word.length() >= 3) {
                    List<HsnMaster> wordResults = hsnRepo.findByDescriptionLike(word);
                    for (HsnMaster hsn : wordResults) {
                        if (!suggestions.contains(hsn)) {
                            suggestions.add(hsn);
                        }
                    }
                }
            }
        }

        // Return top 5 suggestions with confidence score
        List<Map<String, Object>> scoredSuggestions = new ArrayList<>();
        String searchLower = searchTerm.toLowerCase();

        for (HsnMaster hsn : suggestions.stream().limit(5).toList()) {
            Map<String, Object> scored = new LinkedHashMap<>();
            scored.put("hsnCode", hsn.getHsnCode());
            scored.put("description", hsn.getDescription());
            scored.put("gstRate", hsn.getGstRate());

            // Calculate confidence score
            String desc = hsn.getDescription() != null ? hsn.getDescription().toLowerCase() : "";
            double confidence = 0.0;

            if (desc.contains(searchLower)) {
                confidence = 1.0;
            } else {
                // Partial word matching
                String[] searchWords = searchLower.split("\\s+");
                int matchCount = 0;
                for (String word : searchWords) {
                    if (word.length() >= 3 && desc.contains(word)) {
                        matchCount++;
                    }
                }
                confidence = searchWords.length > 0 ? (double) matchCount / searchWords.length : 0;
            }

            scored.put("confidence", Math.round(confidence * 100) / 100.0);
            scoredSuggestions.add(scored);
        }

        // Sort by confidence descending
        scoredSuggestions.sort((a, b) ->
            ((Double) b.get("confidence")).compareTo((Double) a.get("confidence"))
        );

        // Return best match if available
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("itemName", searchTerm);
        response.put("suggestionsCount", scoredSuggestions.size());

        if (!scoredSuggestions.isEmpty()) {
            Map<String, Object> best = scoredSuggestions.get(0);
            response.put("recommendedHsnCode", best.get("hsnCode"));
            response.put("recommendedGstRate", best.get("gstRate"));
            response.put("recommendedDescription", best.get("description"));
            response.put("confidence", best.get("confidence"));
        }

        response.put("allSuggestions", scoredSuggestions);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all HSN codes (for dropdown lists)
     * GET /api/hsn
     */
    @GetMapping
    public ResponseEntity<?> getAll() {
        List<HsnMaster> all = hsnRepo.findByActiveTrue();
        all.sort(Comparator.comparing(HsnMaster::getHsnCode));
        return ResponseEntity.ok(all);
    }

    /**
     * Add new HSN (admin only)
     * POST /api/hsn
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addHsn(@RequestBody HsnMaster hsn) {
        if (hsn.getHsnCode() == null || hsn.getHsnCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "HSN code is required"));
        }

        // Check for duplicate
        Optional<HsnMaster> existing = hsnRepo.findByHsnCodeAndActiveTrue(hsn.getHsnCode());
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error",
                "HSN code " + hsn.getHsnCode() + " already exists"));
        }

        // Set defaults
        hsn.setActive(true);
        if (hsn.getGstRate() == null) hsn.setGstRate(18.0);

        HsnMaster saved = hsnRepo.save(hsn);
        return ResponseEntity.ok(saved);
    }

    /**
     * Bulk import HSN codes
     * POST /api/hsn/bulk
     */
    @PostMapping("/bulk")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> bulkImport(@RequestBody List<HsnMaster> hsnList) {
        List<HsnMaster> saved = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (HsnMaster hsn : hsnList) {
            try {
                Optional<HsnMaster> existing = hsnRepo.findByHsnCodeAndActiveTrue(hsn.getHsnCode());
                if (existing.isPresent()) {
                    errors.add("HSN " + hsn.getHsnCode() + " already exists");
                    continue;
                }
                hsn.setActive(true);
                saved.add(hsnRepo.save(hsn));
            } catch (Exception e) {
                errors.add("HSN " + hsn.getHsnCode() + ": " + e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of(
            "saved", saved.size(),
            "errors", errors,
            "totalProcessed", hsnList.size()
        ));
    }
}
