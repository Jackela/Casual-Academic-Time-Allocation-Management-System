package com.usyd.catams.application.user.dto;

import com.usyd.catams.enums.UserRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;

/**
 * TDD Tests for UserDto
 * 
 * These tests ensure the UserDto is properly designed for:
 * 1. Future JSON serialization/deserialization
 * 2. Immutability and thread safety
 * 3. Proper equals/hashCode contracts
 * 4. Builder pattern functionality
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
@DisplayName("UserDto TDD Tests")
class UserDtoTest {
    
    @Nested
    @DisplayName("Builder Pattern Tests")
    class BuilderPatternTests {
        
        @Test
        @DisplayName("Should build UserDto with all required fields")
        void shouldBuildUserDtoWithAllRequiredFields() {
            // Given
            LocalDateTime now = LocalDateTime.now();
            
            // When
            UserDto user = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .firstName("John")
                .lastName("Doe")
                .role(UserRole.LECTURER)
                .active(true)
                .createdAt(now.minusDays(30))
                .lastLoginAt(now.minusHours(1))
                .build();
            
            // Then
            assertThat(user.getId()).isEqualTo(1L);
            assertThat(user.getEmail()).isEqualTo("test@usyd.edu.au");
            assertThat(user.getFirstName()).isEqualTo("John");
            assertThat(user.getLastName()).isEqualTo("Doe");
            assertThat(user.getRole()).isEqualTo(UserRole.LECTURER);
            assertThat(user.isActive()).isTrue();
            assertThat(user.getCreatedAt()).isEqualTo(now.minusDays(30));
            assertThat(user.getLastLoginAt()).isEqualTo(now.minusHours(1));
        }
        
        @Test
        @DisplayName("Should build UserDto with minimal required fields")
        void shouldBuildUserDtoWithMinimalRequiredFields() {
            // When
            UserDto user = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .role(UserRole.TUTOR)
                .build();
            
            // Then
            assertThat(user.getId()).isEqualTo(1L);
            assertThat(user.getEmail()).isEqualTo("test@usyd.edu.au");
            assertThat(user.getRole()).isEqualTo(UserRole.TUTOR);
            assertThat(user.isActive()).isTrue(); // Default value
            assertThat(user.getFirstName()).isNull();
            assertThat(user.getLastName()).isNull();
        }
        
        @Test
        @DisplayName("Should fail to build without required ID")
        void shouldFailToBuildWithoutRequiredId() {
            // When & Then
            assertThatThrownBy(() -> UserDto.builder()
                .email("test@usyd.edu.au")
                .role(UserRole.TUTOR)
                .build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("User ID is required");
        }
        
        @Test
        @DisplayName("Should fail to build without required email")
        void shouldFailToBuildWithoutRequiredEmail() {
            // When & Then
            assertThatThrownBy(() -> UserDto.builder()
                .id(1L)
                .role(UserRole.TUTOR)
                .build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Email is required");
        }
        
        @Test
        @DisplayName("Should fail to build without required role")
        void shouldFailToBuildWithoutRequiredRole() {
            // When & Then
            assertThatThrownBy(() -> UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Role is required");
        }
    }
    
    @Nested
    @DisplayName("Immutability Tests")
    class ImmutabilityTests {
        
        @Test
        @DisplayName("UserDto should be immutable")
        void userDtoShouldBeImmutable() {
            // Given
            UserDto user = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .role(UserRole.LECTURER)
                .build();
            
            // When - Try to access fields
            Long id = user.getId();
            String email = user.getEmail();
            UserRole role = user.getRole();
            
            // Then - Fields should be accessible but not modifiable
            assertThat(id).isEqualTo(1L);
            assertThat(email).isEqualTo("test@usyd.edu.au");
            assertThat(role).isEqualTo(UserRole.LECTURER);
            
            // UserDto should not have any setter methods (enforced by compilation)
        }
    }
    
    @Nested
    @DisplayName("Equals and HashCode Contract Tests")
    class EqualsHashCodeTests {
        
        @Test
        @DisplayName("Should be equal when ID and email are same")
        void shouldBeEqualWhenIdAndEmailAreSame() {
            // Given
            UserDto user1 = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .role(UserRole.LECTURER)
                .firstName("John")
                .build();
                
            UserDto user2 = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .role(UserRole.TUTOR) // Different role
                .firstName("Jane")    // Different name
                .build();
            
            // When & Then
            assertThat(user1).isEqualTo(user2);
            assertThat(user1.hashCode()).isEqualTo(user2.hashCode());
        }
        
        @Test
        @DisplayName("Should not be equal when ID is different")
        void shouldNotBeEqualWhenIdIsDifferent() {
            // Given
            UserDto user1 = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .role(UserRole.LECTURER)
                .build();
                
            UserDto user2 = UserDto.builder()
                .id(2L)
                .email("test@usyd.edu.au") // Same email
                .role(UserRole.LECTURER)   // Same role
                .build();
            
            // When & Then
            assertThat(user1).isNotEqualTo(user2);
        }
        
        @Test
        @DisplayName("Should not be equal when email is different")
        void shouldNotBeEqualWhenEmailIsDifferent() {
            // Given
            UserDto user1 = UserDto.builder()
                .id(1L)
                .email("test1@usyd.edu.au")
                .role(UserRole.LECTURER)
                .build();
                
            UserDto user2 = UserDto.builder()
                .id(1L) // Same ID
                .email("test2@usyd.edu.au")
                .role(UserRole.LECTURER)
                .build();
            
            // When & Then
            assertThat(user1).isNotEqualTo(user2);
        }
        
        @Test
        @DisplayName("Should handle null comparison correctly")
        void shouldHandleNullComparisonCorrectly() {
            // Given
            UserDto user = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .role(UserRole.LECTURER)
                .build();
            
            // When & Then
            assertThat(user).isNotEqualTo(null);
            assertThat(user.equals(null)).isFalse();
        }
    }
    
    @Nested
    @DisplayName("Utility Methods Tests")
    class UtilityMethodsTests {
        
        @Test
        @DisplayName("Should return full name when both first and last names are present")
        void shouldReturnFullNameWhenBothNamesPresent() {
            // Given
            UserDto user = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .firstName("John")
                .lastName("Doe")
                .role(UserRole.LECTURER)
                .build();
            
            // When
            String fullName = user.getFullName();
            
            // Then
            assertThat(fullName).isEqualTo("John Doe");
        }
        
        @Test
        @DisplayName("Should return email when names are null")
        void shouldReturnEmailWhenNamesAreNull() {
            // Given
            UserDto user = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .role(UserRole.LECTURER)
                .build();
            
            // When
            String fullName = user.getFullName();
            
            // Then
            assertThat(fullName).isEqualTo("test@usyd.edu.au");
        }
        
        @Test
        @DisplayName("Should handle partial names correctly")
        void shouldHandlePartialNamesCorrectly() {
            // Given - Only first name
            UserDto userWithFirstName = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .firstName("John")
                .role(UserRole.LECTURER)
                .build();
                
            // Given - Only last name
            UserDto userWithLastName = UserDto.builder()
                .id(2L)
                .email("test2@usyd.edu.au")
                .lastName("Doe")
                .role(UserRole.TUTOR)
                .build();
            
            // When
            String fullName1 = userWithFirstName.getFullName();
            String fullName2 = userWithLastName.getFullName();
            
            // Then
            assertThat(fullName1).isEqualTo("John");
            assertThat(fullName2).isEqualTo("Doe");
        }
        
        @Test
        @DisplayName("Should correctly identify user roles")
        void shouldCorrectlyIdentifyUserRoles() {
            // Given
            UserDto lecturer = UserDto.builder().id(1L).email("l@test.com").role(UserRole.LECTURER).build();
            UserDto tutor = UserDto.builder().id(2L).email("t@test.com").role(UserRole.TUTOR).build();
            UserDto hr = UserDto.builder().id(3L).email("h@test.com").role(UserRole.HR).build();
            UserDto admin = UserDto.builder().id(4L).email("a@test.com").role(UserRole.ADMIN).build();
            
            // When & Then
            assertThat(lecturer.isLecturer()).isTrue();
            assertThat(lecturer.isTutor()).isFalse();
            assertThat(lecturer.isHR()).isFalse();
            assertThat(lecturer.isAdmin()).isFalse();
            
            assertThat(tutor.isTutor()).isTrue();
            assertThat(tutor.isLecturer()).isFalse();
            
            assertThat(hr.isHR()).isTrue();
            assertThat(hr.isAdmin()).isFalse();
            
            assertThat(admin.isAdmin()).isTrue();
            assertThat(admin.isHR()).isFalse();
        }
        
        @Test
        @DisplayName("Should check hasRole correctly")
        void shouldCheckHasRoleCorrectly() {
            // Given
            UserDto user = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .role(UserRole.LECTURER)
                .build();
            
            // When & Then
            assertThat(user.hasRole(UserRole.LECTURER)).isTrue();
            assertThat(user.hasRole(UserRole.TUTOR)).isFalse();
            assertThat(user.hasRole(UserRole.HR)).isFalse();
            assertThat(user.hasRole(UserRole.ADMIN)).isFalse();
        }
    }
    
    @Nested
    @DisplayName("String Representation Tests")
    class StringRepresentationTests {
        
        @Test
        @DisplayName("Should provide meaningful toString representation")
        void shouldProvideMeaningfulToStringRepresentation() {
            // Given
            UserDto user = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .role(UserRole.LECTURER)
                .active(true)
                .build();
            
            // When
            String toString = user.toString();
            
            // Then
            assertThat(toString).contains("UserDto");
            assertThat(toString).contains("id=1");
            assertThat(toString).contains("email='test@usyd.edu.au'");
            assertThat(toString).contains("role=LECTURER");
            assertThat(toString).contains("active=true");
        }
    }
    
    @Nested
    @DisplayName("Future JSON Serialization Compatibility Tests")
    class JsonCompatibilityTests {
        
        @Test
        @DisplayName("Should have all public getters for JSON serialization")
        void shouldHaveAllPublicGettersForJsonSerialization() {
            // Given
            UserDto user = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .firstName("John")
                .lastName("Doe")
                .role(UserRole.LECTURER)
                .active(true)
                .createdAt(LocalDateTime.now())
                .lastLoginAt(LocalDateTime.now())
                .build();
            
            // When & Then - All getters should be accessible
            assertThat(user.getId()).isNotNull();
            assertThat(user.getEmail()).isNotNull();
            assertThat(user.getFirstName()).isNotNull();
            assertThat(user.getLastName()).isNotNull();
            assertThat(user.getRole()).isNotNull();
            assertThat(user.isActive()).isNotNull();
            assertThat(user.getCreatedAt()).isNotNull();
            assertThat(user.getLastLoginAt()).isNotNull();
        }
        
        @Test
        @DisplayName("Should handle null fields gracefully for JSON")
        void shouldHandleNullFieldsGracefullyForJson() {
            // Given
            UserDto user = UserDto.builder()
                .id(1L)
                .email("test@usyd.edu.au")
                .role(UserRole.LECTURER)
                .build();
            
            // When & Then - Should handle null fields without throwing exceptions
            assertThat(user.getFirstName()).isNull();
            assertThat(user.getLastName()).isNull();
            assertThat(user.getCreatedAt()).isNull();
            assertThat(user.getLastLoginAt()).isNull();
            assertThat(user.getFullName()).isNotNull(); // Should fallback to email
        }
    }
}
