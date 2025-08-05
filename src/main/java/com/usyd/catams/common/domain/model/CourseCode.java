package com.usyd.catams.common.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.io.Serializable;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Value Object representing a course code in the CATAMS system.
 * 
 * This class encapsulates course codes with proper validation to ensure
 * they conform to university course code standards. Course codes typically
 * follow patterns like "COMP3308", "MATH1001", etc.
 * 
 * @author Development Team
 * @since 1.0
 */
@Embeddable
public class CourseCode implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /**
     * Pattern for valid course codes - typically 4 letters followed by 4 digits
     * Examples: COMP3308, MATH1001, ENGL2000
     */
    private static final Pattern COURSE_CODE_PATTERN = Pattern.compile(
        "^[A-Z]{3,4}[0-9]{4}$"
    );
    
    /**
     * Pattern for course code with optional section - e.g., COMP3308-S1
     */
    private static final Pattern COURSE_CODE_WITH_SECTION_PATTERN = Pattern.compile(
        "^[A-Z]{3,4}[0-9]{3,4}(-[A-Z0-9]{1,3})?$"
    );
    
    /**
     * Maximum length for course codes
     */
    private static final int MAX_CODE_LENGTH = 20;
    
    @NotBlank(message = "Course code cannot be empty")
    @Size(max = MAX_CODE_LENGTH, message = "Course code cannot exceed " + MAX_CODE_LENGTH + " characters")
    @Column(name = "code_value", nullable = false, unique = true, length = MAX_CODE_LENGTH)
    private String value;
    
    /**
     * Default constructor for JPA
     */
    protected CourseCode() {
        this.value = "";
    }
    
    /**
     * Creates a CourseCode instance with the specified code
     * 
     * @param code the course code string, must be valid format
     * @throws IllegalArgumentException if course code is null, empty, or invalid format
     */
    public CourseCode(String code) {
        validateCourseCode(code);
        setValue(normalizeCourseCode(code));
    }
    
    /**
     * Sets the course code value (for JPA)
     */
    private void setValue(String value) {
        this.value = value;
    }
    
    /**
     * Factory method to create a CourseCode instance
     * 
     * @param code the course code string
     * @return a new CourseCode instance
     * @throws IllegalArgumentException if course code is invalid
     */
    public static CourseCode of(String code) {
        return new CourseCode(code);
    }
    
    /**
     * Gets the course code value
     * 
     * @return the course code as a string
     */
    public String getValue() {
        return value;
    }
    
    /**
     * Gets the subject prefix of the course code (e.g., "COMP" from "COMP3308")
     * 
     * @return the subject prefix
     */
    public String getSubjectPrefix() {
        // Extract letters from the beginning
        int i = 0;
        while (i < value.length() && Character.isLetter(value.charAt(i))) {
            i++;
        }
        return i > 0 ? value.substring(0, i) : "";
    }
    
    /**
     * Gets the course number part of the code (e.g., "3308" from "COMP3308")
     * 
     * @return the course number
     */
    public String getCourseNumber() {
        String prefix = getSubjectPrefix();
        int startIndex = prefix.length();
        
        // Find the end of the numeric part
        int endIndex = startIndex;
        while (endIndex < value.length() && Character.isDigit(value.charAt(endIndex))) {
            endIndex++;
        }
        
        return startIndex < endIndex ? value.substring(startIndex, endIndex) : "";
    }
    
    /**
     * Gets the section part if present (e.g., "S1" from "COMP3308-S1")
     * 
     * @return the section code, or empty string if no section
     */
    public String getSection() {
        int dashIndex = value.indexOf('-');
        return dashIndex >= 0 && dashIndex < value.length() - 1 
            ? value.substring(dashIndex + 1) 
            : "";
    }
    
    /**
     * Gets the course level based on the first digit of the course number
     * 
     * @return the course level (1-9), or 0 if cannot be determined
     */
    public int getCourseLevel() {
        String courseNumber = getCourseNumber();
        if (!courseNumber.isEmpty() && Character.isDigit(courseNumber.charAt(0))) {
            return Character.getNumericValue(courseNumber.charAt(0));
        }
        return 0;
    }
    
    /**
     * Checks if this is an undergraduate course (level 1-3)
     * 
     * @return true if undergraduate course
     */
    public boolean isUndergraduate() {
        int level = getCourseLevel();
        return level >= 1 && level <= 3;
    }
    
    /**
     * Checks if this is a postgraduate course (level 4+)
     * 
     * @return true if postgraduate course
     */
    public boolean isPostgraduate() {
        int level = getCourseLevel();
        return level >= 4;
    }
    
    /**
     * Checks if this course has a section specified
     * 
     * @return true if section is present
     */
    public boolean hasSection() {
        return !getSection().isEmpty();
    }
    
    /**
     * Creates a course code without the section part
     * 
     * @return a new CourseCode without section, or this instance if no section exists
     */
    public CourseCode withoutSection() {
        if (!hasSection()) {
            return this;
        }
        return new CourseCode(getSubjectPrefix() + getCourseNumber());
    }
    
    /**
     * Creates a course code with a specific section
     * 
     * @param section the section to add
     * @return a new CourseCode with the specified section
     * @throws IllegalArgumentException if section is invalid
     */
    public CourseCode withSection(String section) {
        if (section == null || section.trim().isEmpty()) {
            throw new IllegalArgumentException("Section cannot be null or empty");
        }
        
        String baseCode = getSubjectPrefix() + getCourseNumber();
        String newCode = baseCode + "-" + section.trim().toUpperCase();
        
        return new CourseCode(newCode);
    }
    
    /**
     * Validates the course code format and business rules
     * 
     * @param code the course code to validate
     * @throws IllegalArgumentException if validation fails
     */
    private void validateCourseCode(String code) {
        if (code == null) {
            throw new IllegalArgumentException("Course code cannot be null");
        }
        
        if (code.trim().isEmpty()) {
            throw new IllegalArgumentException("Course code cannot be empty");
        }
        
        if (code.length() > MAX_CODE_LENGTH) {
            throw new IllegalArgumentException(
                String.format("Course code cannot exceed %d characters", MAX_CODE_LENGTH));
        }
        
        String normalizedCode = code.trim().toUpperCase();
        
        if (!COURSE_CODE_WITH_SECTION_PATTERN.matcher(normalizedCode).matches()) {
            throw new IllegalArgumentException(
                "Course code must follow format like 'COMP3308' or 'NEW101-S1' " +
                "(3-4 letters, 3-4 digits, optional section)");
        }
        
        // Additional business rules
        String subjectPrefix = extractSubjectPrefix(normalizedCode);
        if (subjectPrefix.length() < 3) {
            throw new IllegalArgumentException("Subject prefix must be at least 3 characters");
        }
        
        String courseNumber = extractCourseNumber(normalizedCode);
        if (courseNumber.length() < 3 || courseNumber.length() > 4) {
            throw new IllegalArgumentException("Course number must be 3-4 digits");
        }
        
        // Validate course level makes sense
        int level = Character.getNumericValue(courseNumber.charAt(0));
        if (level < 1 || level > 9) {
            throw new IllegalArgumentException("Course level (first digit) must be between 1 and 9");
        }
    }
    
    /**
     * Normalizes the course code by converting to uppercase and trimming whitespace
     * 
     * @param code the course code to normalize
     * @return the normalized course code
     */
    private String normalizeCourseCode(String code) {
        return code.trim().toUpperCase();
    }
    
    /**
     * Helper method to extract subject prefix during validation
     */
    private String extractSubjectPrefix(String code) {
        int i = 0;
        while (i < code.length() && Character.isLetter(code.charAt(i))) {
            i++;
        }
        return i > 0 ? code.substring(0, i) : "";
    }
    
    /**
     * Helper method to extract course number during validation
     */
    private String extractCourseNumber(String code) {
        String prefix = extractSubjectPrefix(code);
        int startIndex = prefix.length();
        int endIndex = startIndex;
        while (endIndex < code.length() && Character.isDigit(code.charAt(endIndex))) {
            endIndex++;
        }
        return startIndex < endIndex ? code.substring(startIndex, endIndex) : "";
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CourseCode that = (CourseCode) o;
        return Objects.equals(value, that.value);
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