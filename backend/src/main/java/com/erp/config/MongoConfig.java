package com.erp.config;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.AbstractMongoClientConfiguration;
import org.springframework.data.mongodb.core.MongoTemplate;
// spring-retry removed - not needed

import java.util.concurrent.TimeUnit;

/**
 * MongoDB Configuration — Auto Reconnect sathi.
 *
 * SERVER RESTART PROBLEM SOLVE:
 * - maxConnectionIdleTime: Idle connection kitya vel zivant rahte
 * - connectTimeout: Connection timeout
 * - serverSelectionTimeout: Server milnyas kitya vel prateeksha
 * - retryWrites / retryReads: Retry on network hiccup
 * - heartbeatFrequency: Server alive ka check karacha interval
 *
 * MONGODB RESTART HOTANA KAAY HOTE:
 * 1. MongoDB service stop hote
 * 2. Spring Boot connection pool madhe connections fail honyat
 * 3. heartbeatFrequency pramane Spring Boot MongoDB la reconnect karayla
 *    try karte aapoap
 * 4. MongoDB parat suru zalyavar application aapoap reconnect hote
 *    — SERVER RESTART KARAYCHI GARAJ NAHI!
 */
@Configuration
public class MongoConfig extends AbstractMongoClientConfiguration {

    @Value("${spring.data.mongodb.database:erp_accounting_db}")
    private String databaseName;

    @Value("${spring.data.mongodb.uri:mongodb://localhost:27017/erp_accounting_db}")
    private String mongoUri;

    @Override
    protected String getDatabaseName() {
        return databaseName;
    }

    @Override
    @Bean
    public MongoClient mongoClient() {
        MongoClientSettings settings = MongoClientSettings.builder()
            .applyConnectionString(new ConnectionString(mongoUri))
            .applyToConnectionPoolSettings(builder -> builder
                .maxConnectionIdleTime(60, TimeUnit.SECONDS)   // 60 sec idle nantarcha connection close
                .minSize(2)                                     // Minimum 2 connections alive raha
                .maxSize(20)                                    // Maximum 20 connections
                .maxWaitTime(30, TimeUnit.SECONDS)             // Connection milnyas 30 sec wait
            )
            .applyToSocketSettings(builder -> builder
                .connectTimeout(10, TimeUnit.SECONDS)          // Connect timeout
                .readTimeout(30, TimeUnit.SECONDS)             // Read timeout
            )
            .applyToServerSettings(builder -> builder
                .heartbeatFrequency(10, TimeUnit.SECONDS)      // Har 10 sec la MongoDB alive ka check
                .minHeartbeatFrequency(500, TimeUnit.MILLISECONDS)
            )
            .applyToClusterSettings(builder -> builder
                .serverSelectionTimeout(30, TimeUnit.SECONDS)  // Server milnyas 30 sec wait
            )
            .retryWrites(true)   // Write fail zale tar retry
            .retryReads(true)    // Read fail zale tar retry
            .build();

        return MongoClients.create(settings);
    }

    @Bean
    public MongoTemplate mongoTemplate() throws Exception {
        return new MongoTemplate(mongoClient(), getDatabaseName());
    }
}
