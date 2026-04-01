package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "warehouses")
public class Warehouse {
    @Id
    private String id;
    private String warehouseCode;
    private String warehouseName;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String contactPerson;
    private String phone;
    private boolean isDefault = false;
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();
}
