package com.erp.service;

import com.erp.model.gst.HsnMaster;
import com.erp.repository.HsnMasterRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/**
 * Service to load comprehensive HSN codes from JSON data file
 * This replaces the static initializer approach
 */
@Slf4j
@Service
public class HsnDataLoaderService {

    @Autowired
    private HsnMasterRepository hsnRepo;
    
    private static final String BULK_DATA_FILE = "hsn-bulk-data.json";
    
    // @PostConstruct — Disabled: HsnApiService handles JSON loading
    public void init() {
        long count = hsnRepo.count();
        if (count < 500) {
            log.info("HSN database has {} records. Loading comprehensive data...", count);
            loadAllChapterFiles();
        } else {
            log.info("HSN database already has {} records. Skipping data load.", count);
        }
    }
    
    public void loadAllChapterFiles() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            ClassPathResource resource = new ClassPathResource(BULK_DATA_FILE);
            
            if (!resource.exists()) {
                log.warn("HSN bulk data file {} not found.", BULK_DATA_FILE);
                return;
            }
            
            try (InputStream is = resource.getInputStream()) {
                List<HsnDataEntry> entries = mapper.readValue(is, new TypeReference<List<HsnDataEntry>>() {});
                
                int loaded = 0;
                int skipped = 0;
                
                for (HsnDataEntry entry : entries) {
                    if (hsnRepo.findByHsnCodeAndActiveTrue(entry.getCode()).isPresent()) {
                        skipped++;
                        continue;
                    }
                    
                    HsnMaster hsn = new HsnMaster();
                    hsn.setHsnCode(entry.getCode());
                    hsn.setDescription(entry.getDescription());
                    hsn.setGstRate(entry.getGstRate());
                    hsn.setCategory(entry.getCategory());
                    hsn.setActive(true);
                    
                    String[] keywords = entry.getDescription().toLowerCase()
                        .replaceAll("[,()/]", " ")
                        .split("\\s+");
                    hsn.setKeywords(keywords);
                    
                    hsnRepo.save(hsn);
                    loaded++;
                    
                    if (loaded % 500 == 0) {
                        log.info("Loaded {} HSN codes so far...", loaded);
                    }
                }
                
                log.info("Total HSN codes loaded: {} (skipped: {})", loaded, skipped);
            }
        } catch (IOException e) {
            log.error("Error loading HSN data: {}", e.getMessage());
        }
    }
    
    /**
     * Load essential HSN codes as fallback
     */
    private void loadFallbackData() {
        // This will be called if JSON file is not available
        // The HsnDataInitializer will handle this
        log.info("Using fallback HSN data loading via HsnDataInitializer");
    }
    
    /**
     * DTO for JSON parsing
     */
    public static class HsnDataEntry {
        private String code;
        private String description;
        private double gstRate;
        private String category;
        
        // Getters and setters
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public double getGstRate() { return gstRate; }
        public void setGstRate(double gstRate) { this.gstRate = gstRate; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
    }
}
