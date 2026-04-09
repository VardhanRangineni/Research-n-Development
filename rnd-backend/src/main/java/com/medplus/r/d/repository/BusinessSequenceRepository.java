package com.medplus.r.d.repository;

import com.medplus.r.d.entity.BusinessSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BusinessSequenceRepository extends JpaRepository<BusinessSequence, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from BusinessSequence s where s.name = :name")
    Optional<BusinessSequence> findByNameForUpdate(@Param("name") String name);
}