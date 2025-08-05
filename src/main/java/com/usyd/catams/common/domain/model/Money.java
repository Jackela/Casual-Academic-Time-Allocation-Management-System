package com.usyd.catams.common.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.Objects;

/**
 * Value Object representing monetary amounts in the CATAMS system.
 * 
 * This class encapsulates monetary values with their associated currency,
 * ensuring proper validation and providing safe arithmetic operations.
 * All operations return new Money instances to maintain immutability.
 * 
 * @author Development Team
 * @since 1.0
 */
@Embeddable
public class Money implements Serializable, Comparable<Money> {
    
    private static final long serialVersionUID = 1L;
    
    /**
     * Default currency for the CATAMS system (Australian Dollar)
     */
    public static final Currency DEFAULT_CURRENCY = Currency.getInstance("AUD");
    
    @NotNull(message = "Amount cannot be null")
    @Digits(integer = 10, fraction = 2, message = "Amount must have at most 10 integer digits and 2 decimal places")
    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;
    
    @NotNull(message = "Currency cannot be null")
    @Enumerated(EnumType.STRING)
    @Column(name = "currency_code", nullable = false, length = 3)
    private CurrencyCode currencyCode;
    
    /**
     * Default constructor for JPA
     */
    protected Money() {
        this.amount = BigDecimal.ZERO;
        this.currencyCode = CurrencyCode.AUD;
    }
    
    /**
     * Creates a Money instance with the specified amount in the default currency (AUD)
     * 
     * @param amount the monetary amount, must not be null or negative
     * @throws IllegalArgumentException if amount is null or negative
     */
    public Money(BigDecimal amount) {
        this(amount, DEFAULT_CURRENCY);
    }
    
    /**
     * Internal factory method to create Money instances without validation.
     * Used for operations that may result in negative amounts (like budget calculations).
     * 
     * @param amount the monetary amount (can be negative)
     * @param currency the currency
     * @return a Money instance
     */
    private static Money createUnsafe(BigDecimal amount, Currency currency) {
        Money money = new Money();
        money.amount = amount.setScale(2, RoundingMode.HALF_UP);
        money.currencyCode = CurrencyCode.valueOf(currency.getCurrencyCode());
        return money;
    }
    
    /**
     * Creates a Money instance with the specified amount and currency
     * 
     * @param amount the monetary amount, must not be null or negative
     * @param currency the currency, must not be null
     * @throws IllegalArgumentException if amount is null, negative, or currency is null
     */
    public Money(BigDecimal amount, Currency currency) {
        validateAmount(amount);
        validateCurrency(currency);
        
        this.amount = amount.setScale(2, RoundingMode.HALF_UP);
        this.currencyCode = CurrencyCode.valueOf(currency.getCurrencyCode());
    }
    
    /**
     * Creates a Money instance with the specified amount in the default currency (AUD)
     * 
     * @param amount the monetary amount, must not be negative
     * @throws IllegalArgumentException if amount is negative
     */
    public Money(double amount) {
        this(BigDecimal.valueOf(amount));
    }
    
    /**
     * Creates a Money instance with the specified amount and currency
     * 
     * @param amount the monetary amount, must not be negative
     * @param currency the currency, must not be null
     * @throws IllegalArgumentException if amount is negative or currency is null
     */
    public Money(double amount, Currency currency) {
        this(BigDecimal.valueOf(amount), currency);
    }
    
    /**
     * Factory method to create a zero Money instance in the default currency
     * 
     * @return a Money instance with zero amount in AUD
     */
    public static Money zero() {
        return new Money(BigDecimal.ZERO);
    }
    
    /**
     * Factory method to create a zero Money instance in the specified currency
     * 
     * @param currency the currency for the zero amount
     * @return a Money instance with zero amount in the specified currency
     */
    public static Money zero(Currency currency) {
        return new Money(BigDecimal.ZERO, currency);
    }
    
    /**
     * Factory method to create a Money instance from an amount in AUD
     * 
     * @param amount the amount in AUD
     * @return a Money instance
     */
    public static Money aud(BigDecimal amount) {
        return new Money(amount, Currency.getInstance("AUD"));
    }
    
    /**
     * Factory method to create a Money instance from an amount in AUD
     * 
     * @param amount the amount in AUD
     * @return a Money instance
     */
    public static Money aud(double amount) {
        return new Money(amount, Currency.getInstance("AUD"));
    }
    
    /**
     * Adds another Money amount to this one
     * 
     * @param other the Money to add, must have the same currency
     * @return a new Money instance with the sum
     * @throws IllegalArgumentException if currencies don't match
     */
    public Money add(Money other) {
        validateSameCurrency(other);
        return new Money(this.amount.add(other.amount), getCurrency());
    }
    
    /**
     * Subtracts another Money amount from this one
     * 
     * @param other the Money to subtract, must have the same currency
     * @return a new Money instance with the difference
     * @throws IllegalArgumentException if currencies don't match or result would be negative
     */
    public Money subtract(Money other) {
        validateSameCurrency(other);
        BigDecimal result = this.amount.subtract(other.amount);
        if (result.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Subtraction would result in negative amount");
        }
        return new Money(result, getCurrency());
    }
    
    /**
     * Subtracts another Money amount from this one, allowing negative results
     * This is useful for calculations like budget remaining where over-budget scenarios are valid
     * 
     * @param other the Money to subtract, must have the same currency
     * @return a new Money instance with the difference (can be negative)
     * @throws IllegalArgumentException if currencies don't match
     */
    public Money subtractAllowingNegative(Money other) {
        validateSameCurrency(other);
        BigDecimal result = this.amount.subtract(other.amount);
        return createUnsafe(result, getCurrency());
    }
    
    /**
     * Multiplies this Money by a scalar value
     * 
     * @param multiplier the multiplier, must not be negative
     * @return a new Money instance with the product
     * @throws IllegalArgumentException if multiplier is negative
     */
    public Money multiply(BigDecimal multiplier) {
        if (multiplier == null || multiplier.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Multiplier must not be null or negative");
        }
        return new Money(this.amount.multiply(multiplier), getCurrency());
    }
    
    /**
     * Multiplies this Money by a scalar value
     * 
     * @param multiplier the multiplier, must not be negative
     * @return a new Money instance with the product
     * @throws IllegalArgumentException if multiplier is negative
     */
    public Money multiply(double multiplier) {
        return multiply(BigDecimal.valueOf(multiplier));
    }
    
    /**
     * Divides this Money by a scalar value
     * 
     * @param divisor the divisor, must be positive
     * @return a new Money instance with the quotient
     * @throws IllegalArgumentException if divisor is zero or negative
     */
    public Money divide(BigDecimal divisor) {
        if (divisor == null || divisor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Divisor must be positive");
        }
        return new Money(this.amount.divide(divisor, 2, RoundingMode.HALF_UP), getCurrency());
    }
    
    /**
     * Divides this Money by a scalar value
     * 
     * @param divisor the divisor, must be positive
     * @return a new Money instance with the quotient
     * @throws IllegalArgumentException if divisor is zero or negative
     */
    public Money divide(double divisor) {
        return divide(BigDecimal.valueOf(divisor));
    }
    
    /**
     * Checks if this Money amount is greater than another
     * 
     * @param other the Money to compare with
     * @return true if this amount is greater than the other
     * @throws IllegalArgumentException if currencies don't match
     */
    public boolean isGreaterThan(Money other) {
        validateSameCurrency(other);
        return this.amount.compareTo(other.amount) > 0;
    }
    
    /**
     * Checks if this Money amount is greater than or equal to another
     * 
     * @param other the Money to compare with
     * @return true if this amount is greater than or equal to the other
     * @throws IllegalArgumentException if currencies don't match
     */
    public boolean isGreaterThanOrEqual(Money other) {
        validateSameCurrency(other);
        return this.amount.compareTo(other.amount) >= 0;
    }
    
    /**
     * Checks if this Money amount is less than another
     * 
     * @param other the Money to compare with
     * @return true if this amount is less than the other
     * @throws IllegalArgumentException if currencies don't match
     */
    public boolean isLessThan(Money other) {
        validateSameCurrency(other);
        return this.amount.compareTo(other.amount) < 0;
    }
    
    /**
     * Checks if this Money amount is less than or equal to another
     * 
     * @param other the Money to compare with
     * @return true if this amount is less than or equal to the other
     * @throws IllegalArgumentException if currencies don't match
     */
    public boolean isLessThanOrEqual(Money other) {
        validateSameCurrency(other);
        return this.amount.compareTo(other.amount) <= 0;
    }
    
    /**
     * Checks if this Money amount is zero
     * 
     * @return true if the amount is zero
     */
    public boolean isZero() {
        return this.amount.compareTo(BigDecimal.ZERO) == 0;
    }
    
    /**
     * Checks if this Money amount is positive (greater than zero)
     * 
     * @return true if the amount is positive
     */
    public boolean isPositive() {
        return this.amount.compareTo(BigDecimal.ZERO) > 0;
    }
    
    /**
     * Gets the amount as a BigDecimal
     * 
     * @return the amount
     */
    public BigDecimal getAmount() {
        return amount;
    }
    
    /**
     * Gets the currency
     * 
     * @return the currency
     */
    public Currency getCurrency() {
        return Currency.getInstance(currencyCode.name());
    }
    
    /**
     * Gets the currency code
     * 
     * @return the currency code
     */
    public CurrencyCode getCurrencyCode() {
        return currencyCode;
    }
    
    /**
     * Validates that the amount is not null and not negative
     */
    private void validateAmount(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Amount cannot be null");
        }
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount cannot be negative");
        }
    }
    
    /**
     * Validates that the currency is not null
     */
    private void validateCurrency(Currency currency) {
        if (currency == null) {
            throw new IllegalArgumentException("Currency cannot be null");
        }
    }
    
    /**
     * Validates that another Money instance has the same currency as this one
     */
    private void validateSameCurrency(Money other) {
        if (other == null) {
            throw new IllegalArgumentException("Other Money instance cannot be null");
        }
        if (!this.currencyCode.equals(other.currencyCode)) {
            throw new IllegalArgumentException(
                String.format("Currency mismatch: %s vs %s", this.currencyCode, other.currencyCode));
        }
    }
    
    @Override
    public int compareTo(Money other) {
        validateSameCurrency(other);
        return this.amount.compareTo(other.amount);
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Money money = (Money) o;
        return Objects.equals(amount, money.amount) &&
               currencyCode == money.currencyCode;
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(amount, currencyCode);
    }
    
    @Override
    public String toString() {
        return String.format("%s %s", currencyCode.getSymbol(), amount);
    }
    
    /**
     * Formats the money as a string with currency symbol
     * 
     * @return formatted string representation
     */
    public String toFormattedString() {
        return String.format("%s%.2f", currencyCode.getSymbol(), amount);
    }
    
    /**
     * Enum representing supported currency codes
     */
    public enum CurrencyCode {
        AUD("$", "Australian Dollar"),
        USD("$", "US Dollar"),
        EUR("€", "Euro"),
        GBP("£", "British Pound");
        
        private final String symbol;
        private final String displayName;
        
        CurrencyCode(String symbol, String displayName) {
            this.symbol = symbol;
            this.displayName = displayName;
        }
        
        public String getSymbol() {
            return symbol;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
}