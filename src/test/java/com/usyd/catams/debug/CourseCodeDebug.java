package com.usyd.catams.debug;

import com.usyd.catams.common.domain.model.CourseCode;

public class CourseCodeDebug {
    
    public static void main(String[] args) {
        System.out.println("=== CourseCode Debug ===");
        
        String[] testCodes = {"COMP1000", "COMP3308", "MATH1001", "ENGL2000", "NEW101"};
        
        for (String code : testCodes) {
            try {
                CourseCode courseCode = new CourseCode(code);
                System.out.println("✓ '" + code + "' -> valid: " + courseCode.getValue());
            } catch (Exception e) {
                System.out.println("❌ '" + code + "' -> invalid: " + e.getMessage());
            }
        }
    }
}