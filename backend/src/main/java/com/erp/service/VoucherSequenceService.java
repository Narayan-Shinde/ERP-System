package com.erp.service;

import com.erp.model.DatabaseSequence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * Thread-safe monotonic sequences backed by MongoDB findAndModify.
 */
@Service
public class VoucherSequenceService {

    private static final String COLLECTION = "database_sequences";

    @Autowired
    private MongoTemplate mongoTemplate;

    public long nextSequence(String sequenceKey) {
        Query query = Query.query(Criteria.where("_id").is(sequenceKey));
        Update update = new Update().inc("seq", 1);
        FindAndModifyOptions options = new FindAndModifyOptions().returnNew(true).upsert(true);
        DatabaseSequence counter = mongoTemplate.findAndModify(query, update, options, DatabaseSequence.class, COLLECTION);
        return counter != null ? counter.getSeq() : 1L;
    }

    public String nextManualVoucherNumber(String prefix) {
        long n = nextSequence("voucher_" + prefix);
        return prefix + "-" + String.format("%07d", n);
    }
}
