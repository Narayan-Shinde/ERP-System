package com.erp.repository;
import com.erp.model.StockMovement;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDate;
import java.util.List;

public interface StockMovementRepository extends MongoRepository<StockMovement, String> {
    List<StockMovement> findByItemId(String itemId);
    List<StockMovement> findByItemIdOrderByMovementDateAsc(String itemId);
    List<StockMovement> findByItemIdAndMovementDateBetween(String itemId, LocalDate from, LocalDate to);
    List<StockMovement> findByMovementDateBetween(LocalDate from, LocalDate to);
    List<StockMovement> findByMovementType(String type);
}
