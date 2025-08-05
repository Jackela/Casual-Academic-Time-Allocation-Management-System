package com.usyd.catams.common.domain.model.converter;

import com.usyd.catams.common.domain.model.CourseCode;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter for CourseCode Value Object.
 * 
 * This converter handles the mapping between CourseCode value objects and
 * their string representation in the database.
 * 
 * @author Development Team
 * @since 1.0
 */
@Converter(autoApply = true)
public class CourseCodeConverter implements AttributeConverter<CourseCode, String> {
    
    @Override
    public String convertToDatabaseColumn(CourseCode courseCode) {
        return courseCode != null ? courseCode.getValue() : null;
    }
    
    @Override
    public CourseCode convertToEntityAttribute(String codeString) {
        return codeString != null && !codeString.trim().isEmpty() ? new CourseCode(codeString) : null;
    }
}