package com.erp.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "stock_transfers")
public class StockTransfer {

    @Id
    private String id;

    private String transferNumber;        // TRF-0001
    private LocalDate transferDate;
    private String fromWarehouseId;
    private String fromWarehouseName;
    private String toWarehouseId;
    private String toWarehouseName;
    private String status;                // DRAFT, PENDING, COMPLETED, CANCELLED
    private String notes;
    private String financialYear;
    private String createdBy;
    private LocalDateTime createdAt = LocalDateTime.now();

    private List<TransferItem> items;

    @Data
    public static class TransferItem {
        private String itemId;
        private String itemName;
        private String hsnCode;
        private double quantity;
        private String unit;
        private double currentStockFrom;  // stock in source warehouse before transfer
        private String variantId;         // optional — specific variant transfer
        private String variantName;
        private String batchNumber;       // optional — specific batch transfer
    }
}
