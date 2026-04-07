package com.erp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "stock_movements")
public class StockMovement {
    @Id
    private String id;
    private String movementNumber;
    private String itemId;
    private String itemName;
    private String itemCode;
    private String movementType; // STOCK_IN, STOCK_OUT, ADJUSTMENT, OPENING
    private String referenceType; // PURCHASE, SALES, GRN, MANUAL, RETURN
    private String referenceId;
    private String referenceNumber;
    private LocalDate movementDate;
    private double quantity;
    private double rate;
    private double value;
    private double balanceQty;
    private String warehouseId;
    private String warehouseName;
    private String unit;
    private String remarks;
    private LocalDateTime createdAt = LocalDateTime.now();
    private String createdBy;
    private String narration;   // e.g. "Warehouse A → Warehouse B" for transfers
}
