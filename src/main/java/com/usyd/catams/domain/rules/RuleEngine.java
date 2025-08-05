
package com.usyd.catams.domain.rules;

import com.usyd.catams.exception.BusinessException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * A simple, sequential rule engine to execute a list of business rule specifications.
 */
@Service
public class RuleEngine {

    /**
     * Executes a list of specifications against a given context object.
     * The engine is fail-fast; it stops and throws an exception on the first rule that is not satisfied.
     *
     * @param context The context object containing data for the rules to evaluate.
     * @param rules The list of rules to execute in order.
     * @param <T> The type of the context object.
     * @throws BusinessException if any rule is not satisfied.
     */
    public <T> void execute(T context, List<Specification<T>> rules) throws BusinessException {
        for (Specification<T> rule : rules) {
            rule.isSatisfiedBy(context);
        }
    }
}
