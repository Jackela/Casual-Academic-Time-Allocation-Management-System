package com.usyd.catams.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;

/**
 * JWT token provider
 * 
 * Responsible for JWT token generation, validation and parsing
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class JwtTokenProvider {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final SecretKey secretKey;
    private final long tokenValidityInMilliseconds;

    /**
     * Construct JWT token provider
     * 
     * @param secretKeyString Base64 encoded secret key string
     * @param validityInMilliseconds Token validity period in milliseconds
     */
    public JwtTokenProvider(@Value("${spring.security.jwt.secret}") String secretKeyString,
                           @Value("${spring.security.jwt.expiration}") long validityInMilliseconds) {
        byte[] keyBytes = Base64.getDecoder().decode(secretKeyString);
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        this.tokenValidityInMilliseconds = validityInMilliseconds;
    }

    /**
     * Generate JWT token
     * 
     * @param userId User ID
     * @param email User email
     * @param role User role
     * @return Generated JWT token
     */
    public String generateToken(Long userId, String email, String role) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + tokenValidityInMilliseconds);

        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("role", role)
                .issuedAt(now)
                .expiration(validity)
                .signWith(secretKey)
                .compact();
    }
    
    /**
     * Validate JWT token
     * 
     * @param token JWT token to validate
     * @return true if token is valid, false otherwise
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            logger.warn("JWT token is expired: {}", e.getMessage());
        } catch (JwtException e) {
            logger.warn("JWT token is invalid: {}", e.getMessage());
        } catch (Exception e) {
            logger.warn("JWT token validation failed: {}", e.getMessage());
        }
        return false;
    }
    
    /**
     * Get user email from JWT token
     * 
     * @param token JWT token
     * @return User email (subject)
     */
    public String getUserEmailFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
            return claims.getSubject();
        } catch (JwtException e) {
            logger.warn("Failed to extract email from JWT token: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Get user ID from JWT token
     * 
     * @param token JWT token
     * @return User ID
     */
    public Long getUserIdFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
            return claims.get("userId", Long.class);
        } catch (JwtException e) {
            logger.warn("Failed to extract user ID from JWT token: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Get user role from JWT token
     * 
     * @param token JWT token
     * @return User role
     */
    public String getUserRoleFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
            return claims.get("role", String.class);
        } catch (JwtException e) {
            logger.warn("Failed to extract role from JWT token: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Get all claims from JWT token
     * 
     * @param token JWT token
     * @return Claims object containing all token claims
     */
    public Claims getClaimsFromToken(String token) {
        try {
            return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (JwtException e) {
            logger.warn("Failed to extract claims from JWT token: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Extract token from Authorization header
     * 
     * @param authHeader Authorization header value
     * @return JWT token without "Bearer " prefix, or null if invalid format
     */
    public String extractTokenFromHeader(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7); // Remove "Bearer " prefix
        }
        return null;
    }
}