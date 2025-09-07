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
     * Construct JWT token provider with secure key validation
     * 
     * @param secretKeyString Base64 encoded secret key string
     * @param validityInMilliseconds Token validity period in milliseconds
     * @throws IllegalArgumentException if secret key is too weak
     */
    public JwtTokenProvider(@Value("${spring.security.jwt.secret}") String secretKeyString,
                           @Value("${spring.security.jwt.expiration}") long validityInMilliseconds) {
        // Validate secret key strength
        if (secretKeyString == null || secretKeyString.trim().isEmpty()) {
            throw new IllegalArgumentException("JWT secret key cannot be null or empty");
        }
        
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secretKeyString);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("JWT secret key must be valid Base64 encoded string", e);
        }
        
        // Ensure minimum key length for HMAC-SHA256 (32 bytes = 256 bits)
        if (keyBytes.length < 32) {
            throw new IllegalArgumentException(
                String.format("JWT secret key too weak. Minimum 32 bytes required, got %d bytes", keyBytes.length)
            );
        }
        
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        
        // Validate token validity period
        if (validityInMilliseconds <= 0) {
            throw new IllegalArgumentException("Token validity period must be positive");
        }
        if (validityInMilliseconds > 24 * 60 * 60 * 1000L) { // 24 hours max
            logger.warn("Token validity period exceeds 24 hours. Consider shorter periods for security.");
        }
        
        this.tokenValidityInMilliseconds = validityInMilliseconds;
        logger.info("JWT token provider initialized with {}ms validity period", validityInMilliseconds);
    }

    /**
     * Generate JWT token with input validation
     * 
     * @param userId User ID
     * @param email User email
     * @param role User role
     * @return Generated JWT token
     * @throws IllegalArgumentException if inputs are invalid
     */
    public String generateToken(Long userId, String email, String role) {
        // Input validation
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("User ID must be positive");
        }
        if (email == null || email.trim().isEmpty() || !email.contains("@")) {
            throw new IllegalArgumentException("Valid email address required");
        }
        if (role == null || role.trim().isEmpty()) {
            throw new IllegalArgumentException("User role cannot be null or empty");
        }
        
        Date now = new Date();
        Date validity = new Date(now.getTime() + tokenValidityInMilliseconds);
        
        try {
            String token = Jwts.builder()
                    .subject(email.trim())
                    .claim("userId", userId)
                    .claim("role", role.trim().toUpperCase())
                    .claim("iss", "CATAMS") // Add issuer claim
                    .issuedAt(now)
                    .expiration(validity)
                    .signWith(secretKey)
                    .compact();
                    
            logger.debug("Generated JWT token for user: {} (ID: {})", email, userId);
            return token;
        } catch (Exception e) {
            logger.error("Failed to generate JWT token for user: {}", email, e);
            throw new RuntimeException("Token generation failed", e);
        }
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