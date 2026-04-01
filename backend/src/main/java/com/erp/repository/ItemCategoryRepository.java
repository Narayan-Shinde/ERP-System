package com.erp.repository;
import com.erp.model.ItemCategory;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
public interface ItemCategoryRepository extends MongoRepository<ItemCategory, String> {
    List<ItemCategory> findByActiveTrue();
}
