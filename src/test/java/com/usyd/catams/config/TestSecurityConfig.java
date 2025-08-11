package com.usyd.catams.config;

import com.usyd.catams.security.JwtAuthenticationFilter;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;

@TestConfiguration(proxyBeanMethods = false)
@Profile("test")
public class TestSecurityConfig {

    /**
     * 注意：此配置仅用于 "test" profile，不影响 "integration-test" profile。
     * integration-test 使用真实的JWT认证，test 使用简化的header认证。
     */
    @Bean
    @Primary
    public JwtAuthenticationFilter testJwtAuthenticationFilter() {
        return new TestJwtAuthFilter();
    }

    static class TestJwtAuthFilter extends JwtAuthenticationFilter {
        public TestJwtAuthFilter() {
            super(null, null);
        }
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            String testUserId = request.getHeader("Test-User-Id");
            String testUserRole = request.getHeader("Test-User-Role");
            String testUserEmail = request.getHeader("Test-User-Email");

            if (testUserId == null) {
                testUserId = "1";
                testUserRole = "ADMIN";
                testUserEmail = "admin@catams.edu.au";
            }

            Authentication auth = new UsernamePasswordAuthenticationToken(
                    testUserEmail,
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + testUserRole))
            );

            request.setAttribute("userId", Long.parseLong(testUserId));
            request.setAttribute("userRole", testUserRole);
            request.setAttribute("userEmail", testUserEmail);

            SecurityContextHolder.getContext().setAuthentication(auth);
            filterChain.doFilter(request, response);
        }
    }
}



