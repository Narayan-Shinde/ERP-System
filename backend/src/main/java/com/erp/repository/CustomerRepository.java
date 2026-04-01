package com.erp.repository;

import com.erp.model.Customer;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CustomerRepository extends MongoRepository<Customer, String> {
    List<Customer> findByActiveTrue();
    List<Customer> findByNameContainingIgnoreCase(String name);
}
