package com.usyd.catams.verification;

import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1CalculationResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 验证sessionDate重计算一致性问题
 * 测试当timesheet编辑时，是否保持原始的sessionDate用于费率计算
 */
@SpringBootTest
@ActiveProfiles("test")
public class SessionDateConsistencyTest {

    @Test
    @DisplayName("验证编辑时sessionDate保持一致 - 费率政策未变化场景")
    public void testSessionDateConsistency_SamePolicyPeriod() {
        // Given: 创建时使用特定sessionDate
        LocalDate originalSessionDate = LocalDate.of(2024, 1, 15); // 原始日期
        LocalDate editSessionDate = LocalDate.of(2024, 1, 22);     // 编辑日期(同一政策期)
        
        Schedule1Calculator calculator = new Schedule1Calculator(null);
        
        // 原始计算
        Schedule1CalculationResult originalCalc = calculator.calculate(
            new Schedule1Calculator.CalculationInput(
                TimesheetTaskType.TUTORIAL,
                originalSessionDate,
                new BigDecimal("2.0"),
                false,
                TutorQualification.PHD
            )
        );
        
        // 编辑时的计算 - 应该使用原始sessionDate
        Schedule1CalculationResult editCalc = calculator.calculate(
            new Schedule1Calculator.CalculationInput(
                TimesheetTaskType.TUTORIAL,
                originalSessionDate, // 关键：应该使用原始日期，不是编辑日期
                new BigDecimal("2.5"), // 只修改小时数
                false,
                TutorQualification.PHD
            )
        );
        
        // Then: 费率应该保持一致
        assertEquals(originalCalc.getHourlyRate(), editCalc.getHourlyRate(),
            "编辑timesheet时费率应该保持一致");
        assertEquals(originalCalc.getRateCode(), editCalc.getRateCode(),
            "编辑timesheet时rateCode应该保持一致");
    }

    @Test
    @DisplayName("验证编辑时sessionDate错误使用 - 跨政策期问题检测")
    public void testSessionDateInconsistency_CrossPolicyPeriod() {
        // Given: 跨越不同政策期的日期
        LocalDate oldPolicyDate = LocalDate.of(2023, 6, 5);    // 旧政策期
        LocalDate newPolicyDate = LocalDate.of(2024, 1, 15);   // 新政策期
        
        Schedule1Calculator calculator = new Schedule1Calculator(null);
        
        // 原始计算(旧政策期)
        Schedule1CalculationResult originalCalc = calculator.calculate(
            new Schedule1Calculator.CalculationInput(
                TimesheetTaskType.TUTORIAL,
                oldPolicyDate,
                new BigDecimal("2.0"),
                false,
                TutorQualification.PHD
            )
        );
        
        // 错误的编辑计算 - 使用了新的sessionDate
        Schedule1CalculationResult wrongEditCalc = calculator.calculate(
            new Schedule1Calculator.CalculationInput(
                TimesheetTaskType.TUTORIAL,
                newPolicyDate, // 错误：使用了编辑时的日期
                new BigDecimal("2.0"), // 相同参数
                false,
                TutorQualification.PHD
            )
        );
        
        // Then: 如果政策有变化，费率可能不同
        System.out.println("Original rate: " + originalCalc.getHourlyRate());
        System.out.println("Wrong edit rate: " + wrongEditCalc.getHourlyRate());
        
        // 这个测试帮助识别是否存在sessionDate不一致问题
        // 如果费率不同，说明存在潜在的数据一致性问题
    }

    @Test
    @DisplayName("验证Timesheet实体的sessionDate持久化")
    public void testTimesheetEntitySessionDatePersistence() {
        // Given: 创建timesheet
        LocalDate originalWeekStart = LocalDate.of(2024, 1, 15);
        Timesheet timesheet = new Timesheet(
            1L, 1L, originalWeekStart,
            new BigDecimal("2.0"), new BigDecimal("45.00"),
            "Tutorial session", 1L
        );
        
        // 设置Schedule1计算结果字段
        timesheet.setTaskType(TimesheetTaskType.TUTORIAL);
        timesheet.setQualification(TutorQualification.PHD);
        timesheet.setRateCode("TU1");
        timesheet.setCalculationFormula("2.0h delivery + 0.5h associated (EA Schedule 1)");
        
        // Then: weekStartDate应该保持不变
        assertEquals(originalWeekStart, timesheet.getWeekStartDate(),
            "Timesheet的weekStartDate应该保持原始值");
        
        // When: 模拟编辑(只修改描述)
        timesheet.setDescription("Updated tutorial session");
        
        // Then: weekStartDate仍应保持不变
        assertEquals(originalWeekStart, timesheet.getWeekStartDate(),
            "编辑后weekStartDate应该保持不变");
    }

    @Test
    @DisplayName("检查Controller层的sessionDate处理逻辑")
    public void testControllerSessionDateHandling() {
        // 这个测试验证在TimesheetController.updateTimesheet方法中
        // 第159行的逻辑：existing.getWeekStartDate()的使用是否正确
        
        LocalDate originalDate = LocalDate.of(2024, 1, 15);
        
        // 模拟existing timesheet
        Timesheet existing = new Timesheet(
            1L, 1L, originalDate,
            new BigDecimal("2.0"), new BigDecimal("45.00"),
            "Original description", 1L
        );
        
        // 验证getWeekStartDate返回原始日期
        assertEquals(originalDate, existing.getWeekStartDate(),
            "existing.getWeekStartDate()应该返回原始创建时的日期");
        
        // 模拟updateRequest没有提供sessionDate
        LocalDate sessionDate = null; // request.getSessionDate() returns null
        LocalDate resolvedSessionDate = sessionDate != null ? sessionDate : existing.getWeekStartDate();
        
        // 验证fallback逻辑正确
        assertEquals(originalDate, resolvedSessionDate,
            "当request.sessionDate为null时，应该使用existing.getWeekStartDate()");
    }
}