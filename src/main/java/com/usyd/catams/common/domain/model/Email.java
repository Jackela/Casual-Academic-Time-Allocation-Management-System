package com.usyd.catams.common.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.io.Serializable;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Value Object representing an email address in the CATAMS system.
 * 
 * This class encapsulates email addresses with proper validation to ensure
 * they conform to standard email format requirements. The class is immutable
 * and provides domain-specific validation beyond basic format checking.
 * 
 * @author Development Team
 * @since 1.0
 */
@Embeddable
public class Email implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /**
     * Comprehensive email validation pattern that covers most valid email formats
     * while being strict enough for business use
     */
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
    );
    
    /**
     * Pattern for university email domains (for additional validation if needed)
     */
    private static final Pattern UNIVERSITY_DOMAIN_PATTERN = Pattern.compile(
        ".*\\.(edu|edu\\.au|ac\\.uk|ac\\.nz|usyd\\.edu\\.au)$"
    );
    
    /**
     * Maximum length for email addresses as per RFC 5321
     */
    private static final int MAX_EMAIL_LENGTH = 254;
    
    @NotBlank(message = "Email address cannot be empty")
    @Size(max = MAX_EMAIL_LENGTH, message = "Email address cannot exceed " + MAX_EMAIL_LENGTH + " characters")
    @Column(name = "email_value", nullable = false, unique = true, length = MAX_EMAIL_LENGTH)
    private String value;
    
    /**
     * Default constructor for JPA
     */
    protected Email() {
        this.value = "";
    }
    
    /**
     * Creates an Email instance with the specified email address
     * 
     * @param emailAddress the email address string, must be valid format
     * @throws IllegalArgumentException if email address is null, empty, or invalid format
     */
    public Email(String emailAddress) {
        validateEmailAddress(emailAddress);
        setValue(normalizeEmail(emailAddress));
    }
    
    /**
     * Sets the email value (for JPA)
     */
    private void setValue(String value) {
        this.value = value;
    }
    
    /**
     * Factory method to create an Email instance
     * 
     * @param emailAddress the email address string
     * @return a new Email instance
     * @throws IllegalArgumentException if email address is invalid
     */
    public static Email of(String emailAddress) {
        return new Email(emailAddress);
    }
    
    /**
     * Gets the email address value
     * 
     * @return the email address as a string
     */
    public String getValue() {
        return value;
    }
    
    /**
     * Gets the local part of the email address (before the @ symbol)
     * 
     * @return the local part of the email
     */
    public String getLocalPart() {
        int atIndex = value.indexOf('@');
        return atIndex > 0 ? value.substring(0, atIndex) : "";
    }
    
    /**
     * Gets the domain part of the email address (after the @ symbol)
     * 
     * @return the domain part of the email
     */
    public String getDomain() {
        int atIndex = value.indexOf('@');
        return atIndex >= 0 && atIndex < value.length() - 1 ? value.substring(atIndex + 1) : "";
    }
    
    /**
     * Checks if this email belongs to a university domain
     * 
     * @return true if the email domain appears to be a university domain
     */
    public boolean isUniversityEmail() {
        String domain = getDomain().toLowerCase();
        return UNIVERSITY_DOMAIN_PATTERN.matcher(domain).matches();
    }
    
    /**
     * Checks if this email belongs to the University of Sydney domain
     * 
     * @return true if the email domain is usyd.edu.au
     */
    public boolean isUsydEmail() {
        return getDomain().toLowerCase().equals("usyd.edu.au");
    }
    
    /**
     * Creates a masked version of the email for display purposes
     * (e.g., "j***@usyd.edu.au" for "john.doe@usyd.edu.au")
     * 
     * @return a masked email string
     */
    public String toMaskedString() {
        String localPart = getLocalPart();
        String domain = getDomain();
        
        if (localPart.length() <= 1) {
            return value; // Don't mask very short local parts
        }
        
        String maskedLocal = localPart.charAt(0) + "***";
        if (localPart.length() > 4) {
            maskedLocal = localPart.charAt(0) + "***" + localPart.charAt(localPart.length() - 1);
        }
        
        return maskedLocal + "@" + domain;
    }
    
    /**
     * Validates the email address format and business rules
     * 
     * @param emailAddress the email address to validate
     * @throws IllegalArgumentException if validation fails
     */
    private void validateEmailAddress(String emailAddress) {
        if (emailAddress == null) {
            throw new IllegalArgumentException("Email address cannot be null");
        }
        
        if (emailAddress.trim().isEmpty()) {
            throw new IllegalArgumentException("Email address cannot be empty");
        }
        
        if (emailAddress.length() > MAX_EMAIL_LENGTH) {
            throw new IllegalArgumentException(
                String.format("Email address cannot exceed %d characters", MAX_EMAIL_LENGTH));
        }
        
        if (!EMAIL_PATTERN.matcher(emailAddress).matches()) {
            throw new IllegalArgumentException("Email address format is invalid");
        }
        
        // Additional business rule validations
        if (emailAddress.startsWith(".") || emailAddress.endsWith(".")) {
            throw new IllegalArgumentException("Email address cannot start or end with a period");
        }
        
        if (emailAddress.contains("..")) {
            throw new IllegalArgumentException("Email address cannot contain consecutive periods");
        }
        
        // Check for common typos in domains
        String domain = emailAddress.substring(emailAddress.indexOf('@') + 1).toLowerCase();
        if (domain.equals("gmail.co") || domain.equals("yahoo.co") || domain.equals("hotmail.co")) {
            throw new IllegalArgumentException("Email domain appears to be incomplete (missing .com, .au, etc.)");
        }
    }
    
    /**
     * Normalizes the email address by converting to lowercase and trimming whitespace
     * 
     * @param emailAddress the email address to normalize
     * @return the normalized email address
     */
    private String normalizeEmail(String emailAddress) {
        return emailAddress.trim().toLowerCase();
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Email email = (Email) o;
        return Objects.equals(value, email.value);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(value);
    }
    
    @Override
    public String toString() {
        return value;
    }
}