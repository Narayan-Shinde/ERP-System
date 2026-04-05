package com.erp.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * Fails fast in production if the default dev JWT secret is still in use.
 */
@Component
public class JwtSecurityStartupCheck implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger log = LoggerFactory.getLogger(JwtSecurityStartupCheck.class);

    private static final String DEV_DEFAULT_SECRET =
            "ERPAccountingDevSecretKey2026TestOnly1234567890ABCDEFGHIJK";

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    private final Environment environment;

    public JwtSecurityStartupCheck(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        int keyBytes = jwtSecret != null ? jwtSecret.getBytes(StandardCharsets.UTF_8).length : 0;
        if (keyBytes < 32) {
            log.warn("JWT secret is shorter than 32 bytes (256-bit). Use a strong random secret of at least 32 bytes.");
        }

        boolean prodProfile = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        if (prodProfile && jwtSecret != null && jwtSecret.equals(DEV_DEFAULT_SECRET)) {
            throw new IllegalStateException(
                    "Production profile 'prod' is active but JWT_SECRET was not overridden. Set env JWT_SECRET to a strong random value (32+ bytes).");
        }

        if (!prodProfile && jwtSecret != null && jwtSecret.equals(DEV_DEFAULT_SECRET)) {
            log.warn("Using bundled development JWT secret. Override JWT_SECRET before any production deployment.");
        }
    }
}
