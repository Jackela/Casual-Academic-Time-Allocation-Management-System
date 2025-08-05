package com.usyd.catams.test.util;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Utility class for generating valid course codes for testing.
 * 
 * Generates course codes that match the regex pattern: ^[A-Z]{3,4}[0-9]{3,4}(-[A-Z0-9]{1,3})?$
 * 
 * Examples of valid codes:
 * - COMP3308 (4 letters, 4 digits)
 * - INFO1003 (4 letters, 4 digits)  
 * - MATH2061 (4 letters, 4 digits)
 * - ENGN4528-S1 (4 letters, 4 digits, section)
 * - BUS101 (3 letters, 3 digits)
 */
public class CourseCodeGenerator {
    
    private static final AtomicInteger COUNTER = new AtomicInteger(1000);
    
    // Common department prefixes
    private static final String[] DEPT_PREFIXES_4 = {
        "COMP", "INFO", "MATH", "ENGN", "PHYS", "CHEM", "BIOL", "ECON", "PSYC", "HIST"
    };
    
    private static final String[] DEPT_PREFIXES_3 = {
        "BUS", "LAW", "ART", "SCI", "ENG", "MED", "EDU", "SOC", "GEO", "PHI"
    };
    
    private static final String[] SECTIONS = {
        "S1", "S2", "T1", "T2", "T3", "A", "B", "C", "LAB", "TUT"
    };
    
    /**
     * Generate a unique valid course code with 4 letters and 4 digits.
     * 
     * @return valid course code like "COMP3308"
     */
    public static String generate() {
        int index = COUNTER.getAndIncrement() % DEPT_PREFIXES_4.length;
        String prefix = DEPT_PREFIXES_4[index];
        int number = 1000 + (COUNTER.get() % 8000); // Ensures 4-digit numbers
        return prefix + number;
    }
    
    /**
     * Generate a unique valid course code with specified department.
     * 
     * @param department the department prefix (3-4 letters)
     * @return valid course code like "COMP3308"
     */
    public static String generate(String department) {
        int number = 1000 + (COUNTER.getAndIncrement() % 8000);
        return department.toUpperCase() + number;
    }
    
    /**
     * Generate a course code with section.
     * 
     * @return valid course code with section like "COMP3308-S1"
     */
    public static String generateWithSection() {
        String baseCode = generate();
        int sectionIndex = COUNTER.get() % SECTIONS.length;
        return baseCode + "-" + SECTIONS[sectionIndex];
    }
    
    /**
     * Generate a 3-letter department course code.
     * 
     * @return valid course code like "BUS101"
     */
    public static String generateShort() {
        int index = COUNTER.getAndIncrement() % DEPT_PREFIXES_3.length;
        String prefix = DEPT_PREFIXES_3[index];
        int number = 100 + (COUNTER.get() % 900); // 3-digit numbers
        return prefix + number;
    }
    
    /**
     * Generate a course code with 3 letters and 4 digits.
     * 
     * @return valid course code like "BUS1001"
     */
    public static String generateShortWith4Digits() {
        int index = COUNTER.getAndIncrement() % DEPT_PREFIXES_3.length;
        String prefix = DEPT_PREFIXES_3[index];
        int number = 1000 + (COUNTER.get() % 8000);
        return prefix + number;
    }
    
    /**
     * Get commonly used course codes for specific test scenarios.
     */
    public static class CommonCodes {
        public static final String COMPUTER_SCIENCE = "COMP3308";
        public static final String INFORMATION_SYSTEMS = "INFO1003";
        public static final String MATHEMATICS = "MATH2061";
        public static final String ENGINEERING = "ENGN4528";
        public static final String BUSINESS = "BUS1001";
        public static final String CONTRACT_TESTING = "TEST3001";
        
        // Codes with sections
        public static final String COMP_WITH_SECTION = "COMP3308-S1";
        public static final String INFO_WITH_SECTION = "INFO1003-T1";
        public static final String MATH_LAB = "MATH2061-LAB";
    }
    
    /**
     * Reset counter for deterministic testing.
     */
    public static void reset() {
        COUNTER.set(1000);
    }
}
