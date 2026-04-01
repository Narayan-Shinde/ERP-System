package com.erp.repository;
import com.erp.model.BankAccount;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface BankAccountRepository extends MongoRepository<BankAccount, String> {
    List<BankAccount> findByActiveTrue();
    Optional<BankAccount> findByIsDefaultTrueAndActiveTrue();
}
