package com.erp.model.gst;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * HSN Master - GST rates for goods and services
 * Maintains official HSN codes with their GST rates
 */
@Data
@NoArgsConstructor
@Document(collection = "hsn_master")
public class HsnMaster {
    @Id
    private String id;

    @Indexed(unique = true)
    private String hsnCode;          // 4-digit or 8-digit HSN code

    private String description;      // Description of goods/services
    private Double gstRate;          // GST percentage (0, 5, 12, 18, 28)

    // For search/matching purposes
    private String[] keywords;       // Keywords extracted from description for search
    private String category;         // Category (Food, Electronics, Textile, etc.)

    // Metadata
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    // Version control for GST rate changes
    private String version = "1.0";  // Track GST rate revisions
}
