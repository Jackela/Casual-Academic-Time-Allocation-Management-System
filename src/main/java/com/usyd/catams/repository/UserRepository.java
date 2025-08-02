package com.usyd.catams.repository;

import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * User repository interface for database operations
 * 
 * Provides data access methods for User entity operations including
 * standard CRUD operations and custom query methods
 * 
 * @author Development Team
 * @since 1.0
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    /**
     * Find user by email address
     * 
     * @param email Email address to search for
     * @return Optional containing the user if found, empty otherwise
     */
    Optional<User> findByEmail(String email);
    
    /**
     * Check if user exists by email address
     * 
     * @param email Email address to check
     * @return true if user exists, false otherwise
     */
    boolean existsByEmail(String email);
    
    /**
     * Find all users by role
     * 
     * @param role User role to filter by
     * @return List of users with the specified role
     */
    List<User> findByRole(UserRole role);
    
    /**
     * Find all active users
     * 
     * @param isActive Active status filter
     * @return List of users filtered by active status
     */
    List<User> findByIsActive(Boolean isActive);
    
    /**
     * Find active users by role
     * 
     * @param role User role to filter by
     * @param isActive Active status filter
     * @return List of active users with the specified role
     */
    List<User> findByRoleAndIsActive(UserRole role, Boolean isActive);
    
    /**
     * Find user by email and active status
     * 
     * Useful for authentication to ensure only active users can log in
     * 
     * @param email Email address to search for
     * @param isActive Active status filter
     * @return Optional containing the user if found and matches criteria, empty otherwise
     */
    Optional<User> findByEmailAndIsActive(String email, Boolean isActive);
    
    /**
     * Count users by role
     * 
     * @param role User role to count
     * @return Number of users with the specified role
     */
    long countByRole(UserRole role);
    
    /**
     * Count active users
     * 
     * @param isActive Active status filter
     * @return Number of users with the specified active status
     */
    long countByIsActive(Boolean isActive);
    
    /**
     * Find users by name containing the search term (case-insensitive)
     * 
     * @param name Name search term
     * @return List of users whose names contain the search term
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<User> findByNameContainingIgnoreCase(@Param("name") String name);
}