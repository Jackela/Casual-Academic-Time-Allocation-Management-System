package com.usyd.catams.entity;

import com.usyd.catams.common.domain.model.CourseCode;
import com.usyd.catams.common.domain.model.Money;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CourseEntityTest {

    private Course course;
    private static final String COURSE_CODE = "COMP2022";
    private static final String COURSE_NAME = "Models of Computation";
    private static final String SEMESTER = "2024S1";
    private static final Long LECTURER_ID = 1L;
    private static final Money BUDGET_ALLOCATED = new Money(new BigDecimal("10000.00"));

    @BeforeEach
    void setUp() {
        course = new Course(
            new CourseCode(COURSE_CODE),
            COURSE_NAME,
            SEMESTER,
            LECTURER_ID,
            BUDGET_ALLOCATED
        );
    }

    @Nested
    @DisplayName("Constructor Tests")
    class ConstructorTests {

        @Test
        void constructor_ShouldInitializeAllFields() {
            assertThat(course.getCode()).isEqualTo(COURSE_CODE);
            assertThat(course.getName()).isEqualTo(COURSE_NAME);
            assertThat(course.getSemester()).isEqualTo(SEMESTER);
            assertThat(course.getLecturerId()).isEqualTo(LECTURER_ID);
            assertThat(course.getBudgetAllocatedMoney()).isEqualTo(BUDGET_ALLOCATED);
            assertThat(course.getBudgetUsedMoney()).isEqualTo(Money.zero());
            assertThat(course.getIsActive()).isTrue();
        }

        @Test
        void constructorWithPrimitives_ShouldConvertToValueObjects() {
            Course primitivesCourse = new Course(
                COURSE_CODE, COURSE_NAME, SEMESTER, LECTURER_ID, new BigDecimal("10000.00")
            );

            assertThat(primitivesCourse.getCourseCodeObject()).isNotNull();
            assertThat(primitivesCourse.getCode()).isEqualTo(COURSE_CODE);
            assertThat(primitivesCourse.getBudgetAllocatedMoney()).isEqualTo(BUDGET_ALLOCATED);
        }

        @Test
        void defaultConstructor_ShouldCreateEmptyCourse() {
            Course emptyCourse = new Course();

            assertThat(emptyCourse.getId()).isNull();
            assertThat(emptyCourse.getCode()).isNull();
            assertThat(emptyCourse.getIsActive()).isNull();
        }
    }

    @Nested
    @DisplayName("Budget Management Tests")
    class BudgetManagementTests {

        @Test
        void getBudgetRemaining_ShouldReturnDifference() {
            course.setBudgetUsed(new Money(new BigDecimal("3000.00")));

            Money remaining = course.getBudgetRemaining();

            assertThat(remaining.getAmount()).isEqualByComparingTo(new BigDecimal("7000.00"));
        }

        @Test
        void getBudgetRemainingAmount_ShouldReturnBigDecimal() {
            course.setBudgetUsed(new Money(new BigDecimal("2500.50")));

            BigDecimal remaining = course.getBudgetRemainingAmount();

            assertThat(remaining).isEqualByComparingTo(new BigDecimal("7499.50"));
        }

        @Test
        void getBudgetRemaining_ShouldHandleZeroBudgetUsed() {
            Money remaining = course.getBudgetRemaining();

            assertThat(remaining.getAmount()).isEqualByComparingTo(BUDGET_ALLOCATED.getAmount());
        }

        @Test
        void getBudgetRemaining_ShouldHandleFullBudgetUsed() {
            course.setBudgetUsed(BUDGET_ALLOCATED);

            Money remaining = course.getBudgetRemaining();

            assertThat(remaining.getAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        void getBudgetRemaining_ShouldHandleOverBudget() {
            course.setBudgetUsed(new Money(new BigDecimal("12000.00")));

            Money remaining = course.getBudgetRemaining();

            assertThat(remaining.getAmount()).isEqualByComparingTo(new BigDecimal("-2000.00"));
        }

        @Test
        void hasSufficientBudget_ShouldReturnTrueWhenBudgetAvailable() {
            course.setBudgetUsed(new Money(new BigDecimal("5000.00")));
            Money requestedAmount = new Money(new BigDecimal("3000.00"));

            boolean hasSufficient = course.hasSufficientBudget(requestedAmount);

            assertThat(hasSufficient).isTrue();
        }

        @Test
        void hasSufficientBudget_ShouldReturnFalseWhenBudgetInsufficient() {
            course.setBudgetUsed(new Money(new BigDecimal("8000.00")));
            Money requestedAmount = new Money(new BigDecimal("3000.00"));

            boolean hasSufficient = course.hasSufficientBudget(requestedAmount);

            assertThat(hasSufficient).isFalse();
        }

        @Test
        void hasSufficientBudget_ShouldReturnTrueWhenExactAmount() {
            course.setBudgetUsed(new Money(new BigDecimal("7000.00")));
            Money requestedAmount = new Money(new BigDecimal("3000.00"));

            boolean hasSufficient = course.hasSufficientBudget(requestedAmount);

            assertThat(hasSufficient).isTrue();
        }

        @Test
        void hasSufficientBudgetWithBigDecimal_ShouldWorkCorrectly() {
            course.setBudgetUsed(new Money(new BigDecimal("6000.00")));

            assertThat(course.hasSufficientBudget(new BigDecimal("4000.00"))).isTrue();
            assertThat(course.hasSufficientBudget(new BigDecimal("5000.00"))).isFalse();
        }

        @Test
        void addToBudgetUsed_ShouldIncreaseUsedAmount() {
            Money initialUsed = new Money(new BigDecimal("2000.00"));
            course.setBudgetUsed(initialUsed);
            Money additionalAmount = new Money(new BigDecimal("1500.00"));

            course.addToBudgetUsed(additionalAmount);

            assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("3500.00"));
        }

        @Test
        void addToBudgetUsed_ShouldThrowExceptionForNullAmount() {
            assertThatThrownBy(() -> course.addToBudgetUsed((Money) null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Amount cannot be null");
        }

        @Test
        void addToBudgetUsedWithBigDecimal_ShouldWork() {
            course.setBudgetUsed(new Money(new BigDecimal("1000.00")));

            course.addToBudgetUsed(new BigDecimal("500.00"));

            assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("1500.00"));
        }

        @Test
        void subtractFromBudgetUsed_ShouldDecreaseUsedAmount() {
            course.setBudgetUsed(new Money(new BigDecimal("5000.00")));
            Money subtractAmount = new Money(new BigDecimal("1500.00"));

            course.subtractFromBudgetUsed(subtractAmount);

            assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("3500.00"));
        }

        @Test
        void subtractFromBudgetUsed_ShouldThrowExceptionForNullAmount() {
            assertThatThrownBy(() -> course.subtractFromBudgetUsed((Money) null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Amount cannot be null");
        }

        @Test
        void subtractFromBudgetUsedWithBigDecimal_ShouldWork() {
            course.setBudgetUsed(new Money(new BigDecimal("3000.00")));

            course.subtractFromBudgetUsed(new BigDecimal("800.00"));

            assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("2200.00"));
        }

        @Test
        void subtractFromBudgetUsed_ShouldAllowNegativeResult() {
            course.setBudgetUsed(new Money(new BigDecimal("1000.00")));
            Money subtractAmount = new Money(new BigDecimal("1500.00"));

            course.subtractFromBudgetUsed(subtractAmount);

            assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("-500.00"));
        }
    }

    @Nested
    @DisplayName("Course Code Management Tests")
    class CourseCodeTests {

        @Test
        void getCourseCodeObject_ShouldReturnCourseCodeValueObject() {
            CourseCode codeObject = course.getCourseCodeObject();

            assertThat(codeObject).isNotNull();
            assertThat(codeObject.getValue()).isEqualTo(COURSE_CODE);
        }

        @Test
        void getCode_ShouldReturnStringValue() {
            String code = course.getCode();

            assertThat(code).isEqualTo(COURSE_CODE);
        }

        @Test
        void getCodeValue_ShouldReturnStringValue() {
            String codeValue = course.getCodeValue();

            assertThat(codeValue).isEqualTo(COURSE_CODE);
        }

        @Test
        void setCodeWithString_ShouldCreateCourseCodeObject() {
            String newCode = "COMP3888";

            course.setCode(newCode);

            assertThat(course.getCode()).isEqualTo(newCode);
            assertThat(course.getCourseCodeObject()).isNotNull();
            assertThat(course.getCourseCodeObject().getValue()).isEqualTo(newCode);
        }

        @Test
        void setCodeWithCourseCode_ShouldSetDirectly() {
            CourseCode newCode = new CourseCode("COMP1511");

            course.setCode(newCode);

            assertThat(course.getCourseCodeObject()).isSameAs(newCode);
            assertThat(course.getCode()).isEqualTo("COMP1511");
        }

        @Test
        void getCode_ShouldReturnNullWhenCourseCodeIsNull() {
            course.setCode((CourseCode) null);

            assertThat(course.getCode()).isNull();
            assertThat(course.getCodeValue()).isNull();
        }
    }

    @Nested
    @DisplayName("Money Compatibility Tests")
    class MoneyCompatibilityTests {

        @Test
        void setBudgetAllocatedWithBigDecimal_ShouldCreateMoneyObject() {
            BigDecimal amount = new BigDecimal("15000.50");

            course.setBudgetAllocated(amount);

            assertThat(course.getBudgetAllocated()).isEqualByComparingTo(amount);
            assertThat(course.getBudgetAllocatedMoney().getAmount()).isEqualByComparingTo(amount);
        }

        @Test
        void setBudgetUsedWithBigDecimal_ShouldCreateMoneyObject() {
            BigDecimal amount = new BigDecimal("2500.75");

            course.setBudgetUsed(amount);

            assertThat(course.getBudgetUsed()).isEqualByComparingTo(amount);
            assertThat(course.getBudgetUsedMoney().getAmount()).isEqualByComparingTo(amount);
        }

        @Test
        void getBudgetAllocated_ShouldReturnBigDecimalFromMoney() {
            Money money = new Money(new BigDecimal("12345.67"));
            course.setBudgetAllocated(money);

            assertThat(course.getBudgetAllocated()).isEqualByComparingTo(new BigDecimal("12345.67"));
        }

        @Test
        void getBudgetUsed_ShouldReturnBigDecimalFromMoney() {
            Money money = new Money(new BigDecimal("9876.54"));
            course.setBudgetUsed(money);

            assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("9876.54"));
        }

        @Test
        void getBudgetAllocated_ShouldReturnNullWhenMoneyIsNull() {
            course.setBudgetAllocated((Money) null);

            assertThat(course.getBudgetAllocated()).isNull();
        }

        @Test
        void getBudgetUsed_ShouldReturnNullWhenMoneyIsNull() {
            course.setBudgetUsed((Money) null);

            assertThat(course.getBudgetUsed()).isNull();
        }
    }

    @Nested
    @DisplayName("Complex Budget Scenarios")
    class ComplexBudgetScenariosTests {

        @Test
        void budgetScenario_NewCourse_ShouldHaveFullBudgetAvailable() {
            Course newCourse = new Course(
                new CourseCode("NEW101"),
                "New Course",
                "2024S2",
                1L,
                new Money(new BigDecimal("8000.00"))
            );

            assertThat(newCourse.getBudgetUsed()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(newCourse.getBudgetRemaining().getAmount()).isEqualByComparingTo(new BigDecimal("8000.00"));
            assertThat(newCourse.hasSufficientBudget(new BigDecimal("5000.00"))).isTrue();
            assertThat(newCourse.hasSufficientBudget(new BigDecimal("8000.00"))).isTrue();
            assertThat(newCourse.hasSufficientBudget(new BigDecimal("8000.01"))).isFalse();
        }

        @Test
        void budgetScenario_PartiallyUsedBudget_ShouldCalculateCorrectly() {
            course.setBudgetUsed(new Money(new BigDecimal("6000.00")));

            assertThat(course.getBudgetRemaining().getAmount()).isEqualByComparingTo(new BigDecimal("4000.00"));
            assertThat(course.hasSufficientBudget(new BigDecimal("3000.00"))).isTrue();
            assertThat(course.hasSufficientBudget(new BigDecimal("4000.00"))).isTrue();
            assertThat(course.hasSufficientBudget(new BigDecimal("5000.00"))).isFalse();
        }

        @Test
        void budgetScenario_FullyUsedBudget_ShouldHaveNoBudgetRemaining() {
            course.setBudgetUsed(BUDGET_ALLOCATED);

            assertThat(course.getBudgetRemaining().getAmount()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(course.hasSufficientBudget(new BigDecimal("0.01"))).isFalse();
            assertThat(course.hasSufficientBudget(BigDecimal.ZERO)).isTrue();
        }

        @Test
        void budgetScenario_OverBudget_ShouldHaveNegativeRemaining() {
            course.setBudgetUsed(new Money(new BigDecimal("12000.00")));

            assertThat(course.getBudgetRemaining().getAmount()).isEqualByComparingTo(new BigDecimal("-2000.00"));
            assertThat(course.hasSufficientBudget(new BigDecimal("1.00"))).isFalse();
            assertThat(course.hasSufficientBudget(BigDecimal.ZERO)).isTrue();
        }

        @Test
        void budgetScenario_MultipleTransactions_ShouldAccumulateCorrectly() {
            // Start with some initial usage
            course.setBudgetUsed(new Money(new BigDecimal("1000.00")));
            
            // Add some expenses
            course.addToBudgetUsed(new BigDecimal("2500.00"));
            course.addToBudgetUsed(new BigDecimal("1200.00"));
            
            // Subtract a refund
            course.subtractFromBudgetUsed(new BigDecimal("300.00"));
            
            // Final used should be: 1000 + 2500 + 1200 - 300 = 4400
            assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("4400.00"));
            assertThat(course.getBudgetRemaining().getAmount()).isEqualByComparingTo(new BigDecimal("5600.00"));
        }

        @Test
        void budgetScenario_PrecisionHandling_ShouldMaintainAccuracy() {
            course.setBudgetUsed(new Money(new BigDecimal("1234.56")));
            
            course.addToBudgetUsed(new BigDecimal("567.89"));
            course.subtractFromBudgetUsed(new BigDecimal("123.45"));
            
            // 1234.56 + 567.89 - 123.45 = 1679.00
            assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("1679.00"));
            assertThat(course.getBudgetRemaining().getAmount()).isEqualByComparingTo(new BigDecimal("8321.00"));
        }
    }

    @Nested
    @DisplayName("Edge Cases and Error Handling")
    class EdgeCasesTests {

        @Test
        void budgetOperations_ShouldHandleZeroAmounts() {
            BigDecimal initialUsed = new BigDecimal("1000.00");
            course.setBudgetUsed(new Money(initialUsed));

            course.addToBudgetUsed(BigDecimal.ZERO);
            assertThat(course.getBudgetUsed()).isEqualByComparingTo(initialUsed);

            course.subtractFromBudgetUsed(BigDecimal.ZERO);
            assertThat(course.getBudgetUsed()).isEqualByComparingTo(initialUsed);
        }

        @Test
        void budgetOperations_ShouldHandleVeryLargeAmounts() {
            BigDecimal largeAmount = new BigDecimal("999999999.99");
            course.setBudgetAllocated(new Money(largeAmount));
            course.setBudgetUsed(new Money(largeAmount.subtract(new BigDecimal("0.01"))));

            assertThat(course.getBudgetRemaining().getAmount()).isEqualByComparingTo(new BigDecimal("0.01"));
            assertThat(course.hasSufficientBudget(new BigDecimal("0.01"))).isTrue();
            assertThat(course.hasSufficientBudget(new BigDecimal("0.02"))).isFalse();
        }

        @Test
        void budgetOperations_ShouldHandleVerySmallAmounts() {
            BigDecimal smallAmount = new BigDecimal("0.01");
            course.setBudgetUsed(new Money(smallAmount));

            assertThat(course.getBudgetUsed()).isEqualByComparingTo(smallAmount);
            assertThat(course.getBudgetRemaining().getAmount()).isEqualByComparingTo(new BigDecimal("9999.99"));
        }
    }
}
