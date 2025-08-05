package com.usyd.catams.testutil;

import org.springframework.test.web.servlet.request.RequestPostProcessor;

public class TestAuthenticationHelper {

    public static RequestPostProcessor asAdmin() {
        return request -> {
            request.addHeader("Test-User-Id", "1");
            request.addHeader("Test-User-Role", "ADMIN");
            request.addHeader("Test-User-Email", "admin@catams.edu.au");
            return request;
        };
    }

    public static RequestPostProcessor asLecturer(Long lecturerId) {
        return request -> {
            request.addHeader("Test-User-Id", lecturerId.toString());
            request.addHeader("Test-User-Role", "LECTURER");
            request.addHeader("Test-User-Email", "lecturer" + lecturerId + "@catams.edu.au");
            return request;
        };
    }

    public static RequestPostProcessor asTutor(Long tutorId) {
        return request -> {
            request.addHeader("Test-User-Id", tutorId.toString());
            request.addHeader("Test-User-Role", "TUTOR");
            request.addHeader("Test-User-Email", "tutor" + tutorId + "@catams.edu.au");
            return request;
        };
    }

    public static RequestPostProcessor asHR() {
        return request -> {
            request.addHeader("Test-User-Id", "2");
            request.addHeader("Test-User-Role", "HR");
            request.addHeader("Test-User-Email", "hr@catams.edu.au");
            return request;
        };
    }
}



