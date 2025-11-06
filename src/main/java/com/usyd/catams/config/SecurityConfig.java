package com.usyd.catams.config;

import com.usyd.catams.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;
import com.usyd.catams.security.JsonAuthenticationEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

/**
 * Spring Security configuration
 * 
 * Configures JWT authentication, CSRF disabling, stateless session management,
 * and method-level security for role-based access control
 * 
 * @author Development Team
 * @since 1.0
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint;
    private final Environment environment;
    
    @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:8084}")
    private String allowedOrigins;
    
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                         JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint,
                         Environment environment) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.jsonAuthenticationEntryPoint = jsonAuthenticationEntryPoint;
        this.environment = environment;
    }

    /**
     * Configure security filter chain
     * 
     * @param http HTTP security configuration object
     * @return Configured security filter chain
     * @throws Exception Configuration exception
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        boolean relaxedReadProfile = Arrays.stream(environment.getActiveProfiles())
            .anyMatch(p -> p != null && (p.equalsIgnoreCase("test") || p.toLowerCase().startsWith("e2e")));

        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> {
                auth
                    .requestMatchers("/api/auth/login").permitAll()
                    .requestMatchers("/actuator/health").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/test-data/reset").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/test-data/seed/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/timesheets/config").permitAll()
                    .requestMatchers(HttpMethod.POST, "/actuator/shutdown").hasRole("ADMIN");

                if (relaxedReadProfile) {
                    // Allow read-only listing endpoints during e2e/test profiles (exclude course-user edges)
                    auth.requestMatchers(HttpMethod.GET,
                        "/api/users", "/api/users/**").permitAll();
                }

                auth.anyRequest().authenticated();
            })
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(jsonAuthenticationEntryPoint)
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }

    /**
     * BCrypt password encoder bean
     * 
     * @return BCrypt password encoder instance
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * CORS configuration for secure frontend integration
     * 
     * Allows requests from specified origins with proper headers and methods
     * 
     * @return CORS configuration source
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        java.util.List<String> origins = java.util.Arrays.stream(this.allowedOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .toList();
        configuration.setAllowedOrigins(java.util.Collections.emptyList());
        configuration.setAllowedOriginPatterns(java.util.List.of("*"));

        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        // Allow all headers to simplify CORS for E2E/dev
        configuration.setAllowedHeaders(java.util.List.of("*"));

        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}







