package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "gst_configurations")
public class GstConfiguration {
    @Id
    private String id;
    private String hsnCode;
    private String sacCode;
    private String description;
    private double gstRate; // 0, 5, 12, 18, 28
    private double cgstRate;
    private double sgstRate;
    private double igstRate;
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();
}
