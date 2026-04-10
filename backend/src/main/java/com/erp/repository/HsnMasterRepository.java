package com.erp.repository;

import com.erp.model.gst.HsnMaster;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HsnMasterRepository extends MongoRepository<HsnMaster, String> {

    Optional<HsnMaster> findByHsnCode(String hsnCode);

    Optional<HsnMaster> findByHsnCodeAndActiveTrue(String hsnCode);

    List<HsnMaster> findByActiveTrue();

    @Query("{ $and: [ " +
           "  { active: true }, " +
           "  { $or: [ " +
           "    { hsnCode: { $regex: ?0, $options: 'i' } }, " +
           "    { description: { $regex: ?0, $options: 'i' } }, " +
           "    { keywords: { $in: [?0] } } " +
           "  ]} " +
           "]}")
    List<HsnMaster> searchByKeyword(String keyword);

    @Query("{ $and: [ " +
           "  { active: true }, " +
           "  { $or: [ " +
           "    { description: { $regex: ?0, $options: 'i' } }, " +
           "    { keywords: { $regex: ?0, $options: 'i' } } " +
           "  ]} " +
           "]}")
    List<HsnMaster> findByDescriptionLike(String itemName);
}
