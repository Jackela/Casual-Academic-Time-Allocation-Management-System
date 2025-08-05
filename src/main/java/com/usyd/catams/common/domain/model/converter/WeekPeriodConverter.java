package com.usyd.catams.common.domain.model.converter;

import com.usyd.catams.common.domain.model.WeekPeriod;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDate;

/**
 * JPA converter for WeekPeriod Value Object.
 * 
 * This converter handles the mapping between WeekPeriod value objects and
 * their LocalDate representation in the database (storing the start date).
 * 
 * @author Development Team
 * @since 1.0
 */
@Converter(autoApply = true)
public class WeekPeriodConverter implements AttributeConverter<WeekPeriod, LocalDate> {
    
    @Override
    public LocalDate convertToDatabaseColumn(WeekPeriod weekPeriod) {
        return weekPeriod != null ? weekPeriod.getStartDate() : null;
    }
    
    @Override
    public WeekPeriod convertToEntityAttribute(LocalDate startDate) {
        return startDate != null ? new WeekPeriod(startDate) : null;
    }
}