package com.medplus.r.d.repository;

import com.medplus.r.d.entity.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IngredientRepository extends JpaRepository<Ingredient, Long> {
	boolean existsByErpCode(String erpCode);
	boolean existsByErpCodeAndIdNot(String erpCode, Long id);
	List<Ingredient> findByErpCodeIn(List<String> erpCodes);
}
