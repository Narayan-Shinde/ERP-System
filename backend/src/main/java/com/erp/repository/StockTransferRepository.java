package com.erp.repository;

import com.erp.model.StockTransfer;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface StockTransferRepository extends MongoRepository<StockTransfer, String> {
    List<StockTransfer> findByFromWarehouseId(String warehouseId);
    List<StockTransfer> findByToWarehouseId(String warehouseId);
    List<StockTransfer> findByStatus(String status);
    List<StockTransfer> findByFinancialYear(String fy);
}
