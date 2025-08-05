
package com.usyd.catams.domain.rules;

import com.usyd.catams.exception.BusinessException;

/**
 * Represents a business rule specification in the domain, following the Specification Pattern.
 * This allows for creating composable business rules that can be chained together.
 *
 * @param <T> the type of the object to be validated.
 */
@FunctionalInterface
public interface Specification<T> {

    /**
     * Checks if the given candidate object satisfies the specification.
     *
     * @param candidate the object to check.
     * @throws BusinessException if the specification is not satisfied.
     */
    void isSatisfiedBy(T candidate) throws BusinessException;

    /**
     * Creates a new specification that is the logical AND of this specification and another.
     *
     * @param other the other specification to combine with.
     * @return a new specification representing the logical AND.
     */
    default Specification<T> and(Specification<T> other) {
        return (candidate) -> {
            this.isSatisfiedBy(candidate);
            other.isSatisfiedBy(candidate);
        };
    }

    /**
     * Creates a new specification that is the logical OR of this specification and another.
     * This is more complex in a fail-fast scenario and is provided for completeness.
     * A common use case is checking if a candidate satisfies at least one of several conditions.
     *
     * @param other the other specification to combine with.
     * @return a new specification representing the logical OR.
     */
    default Specification<T> or(Specification<T> other) {
        return (candidate) -> {
            try {
                this.isSatisfiedBy(candidate);
            } catch (BusinessException e) {
                other.isSatisfiedBy(candidate);
            }
        };
    }

    /**
     * Creates a new specification that is the logical NOT of this specification.
     *
     * @return a new specification representing the logical NOT.
     */
    default Specification<T> not() {
        return (candidate) -> {
            try {
                this.isSatisfiedBy(candidate);
            } catch (BusinessException e) {
                // If the original specification fails (throws exception), the NOT specification succeeds.
                return;
            }
            // If the original specification succeeds, the NOT specification fails.
            throw new BusinessException("SPEC_NOT_SATISFIED", "Specification was satisfied, but NOT was expected.");
        };
    }
}
