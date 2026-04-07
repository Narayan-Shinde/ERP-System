package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "item_categories")
public class ItemCategory {
    @Id
    private String id;
    private String categoryCode;
    private String categoryName;
    private String parentCategoryId;
    private String description;
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();
}
