package com.erp.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * HS256 JWT access tokens. Expiry is {@code app.jwt.expiration} (ms) from issuance.
 * <p>
 * Changing {@code app.jwt.secret} invalidates all existing tokens — users must sign in again.
 * Production: set env {@code JWT_SECRET} (32+ random bytes recommended).
 */
@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration}")
    private long expiration;

    private Key getSigningKey() {
        // Secret key minimum 256 bits (32 chars) asayla hava
        byte[] keyBytes = secret.getBytes();
        if (keyBytes.length < 32) {
            // Short key asla tar pad karo — production madhe long key vaapara
            byte[] paddedKey = new byte[32];
            System.arraycopy(keyBytes, 0, paddedKey, 0, Math.min(keyBytes.length, 32));
            return Keys.hmacShaKeyFor(paddedKey);
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /** Issue a token for the given subject; expiry = now + {@code app.jwt.expiration}. */
    public String generateToken(String username) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("iat", new Date());
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(username)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
    }

    /** Parse and return the subject (username). */
    public String extractUsername(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(getSigningKey())
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getSubject();
    }

    /** True if signature is valid, subject matches, and token is not expired. */
    public boolean validateToken(String token, String username) {
        try {
            String extractedUsername = extractUsername(token);
            Date expDate = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration();
            boolean usernameMatch = extractedUsername.equals(username);
            boolean notExpired    = !expDate.before(new Date());
            return usernameMatch && notExpired;
        } catch (ExpiredJwtException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    /** Seconds until expiry, or 0 if parsing fails. */
    public long getExpiryInSeconds(String token) {
        try {
            Date expDate = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration();
            return (expDate.getTime() - System.currentTimeMillis()) / 1000;
        } catch (Exception e) {
            return 0;
        }
    }
}
