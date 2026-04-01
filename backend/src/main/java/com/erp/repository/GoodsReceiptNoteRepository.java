package com.erp.repository;
import com.erp.model.GoodsReceiptNote;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
public interface GoodsReceiptNoteRepository extends MongoRepository<GoodsReceiptNote, String> {
    List<GoodsReceiptNote> findBySupplierId(String supplierId);
    List<GoodsReceiptNote> findByPurchaseOrderId(String purchaseOrderId);
}
