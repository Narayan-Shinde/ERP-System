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
 * JWT Utility — 50 year token sathi configured.
 *
 * application.properties madhe:
 *   app.jwt.expiration=1576800000000   (50 years in milliseconds)
 *   app.jwt.secret=<long secret>
 *
 * Server restart zala tari token valid rahto KARAN:
 *   - Token madhe expiry encoded aahe (50 years parat)
 *   - Secret key same rahte (properties madhun)
 *   - MongoDB restart zali tari JwtFilter token validate karto
 *     UserDetailsService kadun user DB madhun load karto
 *
 * IMPORTANT: Secret key kabhi change nako karu production madhe —
 *   change kela tar sagalya users la re-login karave laagel.
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

    /**
     * Token generate karo username sathi.
     * Expiry = current time + properties madhila expiration (50 years)
     */
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

    /**
     * Token madhun username kaadha.
     * Server restart zala tari same secret ne verify hote.
     */
    public String extractUsername(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(getSigningKey())
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getSubject();
    }

    /**
     * Token valid ka check karo:
     * 1. Username match hote ka
     * 2. Expire zala nahi ka
     *
     * Server restart = new JwtUtil bean, SAME secret → validate works fine.
     */
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
            // Token expire zala (50 years nantarcha scenario)
            return false;
        } catch (Exception e) {
            // Invalid token ya signature mismatch
            return false;
        }
    }

    /**
     * Token kiti seconds madhe expire hoyel?
     * Frontend la show karayche aasel tar use kara.
     */
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
