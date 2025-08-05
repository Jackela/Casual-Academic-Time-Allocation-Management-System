package com.usyd.catams.common.domain.model.converter;

import com.usyd.catams.common.domain.model.Email;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter for Email Value Object.
 * 
 * This converter handles the mapping between Email value objects and
 * their string representation in the database.
 * 
 * @author Development Team
 * @since 1.0
 */
@Converter(autoApply = true)
public class EmailConverter implements AttributeConverter<Email, String> {
    
    @Override
    public String convertToDatabaseColumn(Email email) {
        return email != null ? email.getValue() : null;
    }
    
    @Override
    public Email convertToEntityAttribute(String emailString) {
        return emailString != null && !emailString.trim().isEmpty() ? new Email(emailString) : null;
    }
}