package com.erp.repository;

import com.erp.model.ledger.LedgerAccount;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface LedgerAccountRepository extends MongoRepository<LedgerAccount, String> {
    List<LedgerAccount> findByActiveTrue();
    List<LedgerAccount> findByAccountGroup(String accountGroup);
    List<LedgerAccount> findByAccountNameContainingIgnoreCase(String name);
    java.util.Optional<LedgerAccount> findByAccountNameIgnoreCase(String accountName);
    boolean existsByAccountName(String accountName);
}
