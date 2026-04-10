package com.erp.controller;

import com.erp.service.HsnApiService;
import com.erp.service.HsnApiService.HsnSuggestion;
import com.erp.service.HsnApiService.HsnValidationResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * HSN API Controller for auto-suggest and lookup
 */
@RestController
@RequestMapping("/api/hsn")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class HsnApiController {

    private final HsnApiService hsnApiService;

    /**
     * Search HSN codes by item name
     * GET /api/hsn/search?itemName=BOPP&limit=10
     */
    @GetMapping("/search")
    public ResponseEntity<List<HsnSuggestion>> searchByItemName(
            @RequestParam String itemName,
            @RequestParam(defaultValue = "10") int limit) {
        
        List<HsnSuggestion> suggestions = hsnApiService.searchByItemName(itemName, limit);
        return ResponseEntity.ok(suggestions);
    }

    /**
     * Auto-complete HSN code
     * GET /api/hsn/autocomplete?code=3919&limit=10
     */
    @GetMapping("/autocomplete")
    public ResponseEntity<List<HsnSuggestion>> autoCompleteHsn(
            @RequestParam String code,
            @RequestParam(defaultValue = "10") int limit) {
        
        List<HsnSuggestion> suggestions = hsnApiService.autoCompleteHsnCode(code, limit);
        return ResponseEntity.ok(suggestions);
    }

    /**
     * Validate HSN code and get GST rate
     * GET /api/hsn/validate/39199090
     */
    @GetMapping("/validate/{hsnCode}")
    public ResponseEntity<HsnValidationResult> validateHsn(
            @PathVariable String hsnCode) {
        
        return hsnApiService.validateHsnCode(hsnCode)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get HSN by exact code
     * GET /api/hsn/39199090
     */
    @GetMapping("/{hsnCode}")
    public ResponseEntity<HsnSuggestion> getByHsnCode(
            @PathVariable String hsnCode) {
        
        return hsnApiService.getByHsnCode(hsnCode)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get suggestions by category/item type
     * POST /api/hsn/suggest
     */
    @PostMapping("/suggest")
    public ResponseEntity<List<HsnSuggestion>> getSuggestionsByCategory(
            @RequestBody Map<String, String> request) {
        
        String itemType = request.getOrDefault("itemType", "");
        String description = request.getOrDefault("description", "");
        
        List<HsnSuggestion> suggestions = hsnApiService.getSuggestionsByCategory(itemType, description);
        return ResponseEntity.ok(suggestions);
    }

    /**
     * Get GST rate for HSN code
     * GET /api/hsn/gst-rate/39199090
     */
    @GetMapping("/gst-rate/{hsnCode}")
    public ResponseEntity<Map<String, Object>> getGstRate(@PathVariable String hsnCode) {
        double rate = hsnApiService.getGstRateForHsn(hsnCode);
        return ResponseEntity.ok(Map.of(
            "hsnCode", hsnCode,
            "gstRate", rate,
            "valid", rate > 0
        ));
    }
}
