package com.usyd.catams.repository;

import com.usyd.catams.entity.TutorProfileDefaults;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TutorProfileDefaultsRepository extends JpaRepository<TutorProfileDefaults, Long> {
}

