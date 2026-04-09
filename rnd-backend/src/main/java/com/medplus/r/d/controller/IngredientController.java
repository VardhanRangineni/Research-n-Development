package com.medplus.r.d.controller;

import com.medplus.r.d.dto.BulkImportResponseDTO;
import com.medplus.r.d.entity.Ingredient;
import com.medplus.r.d.service.IngredientService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ingredients")
public class IngredientController {

    @Autowired
    private IngredientService ingredientService;

    @GetMapping
    public ResponseEntity<List<Ingredient>> getAllIngredients() {
        return ResponseEntity.ok(ingredientService.getAllIngredients());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ingredient> getIngredientById(@PathVariable Long id) {
        return ResponseEntity.ok(ingredientService.getIngredientById(id));
    }

    @PostMapping
    public ResponseEntity<Ingredient> createIngredient(@Valid @RequestBody Ingredient ingredient) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ingredientService.createIngredient(ingredient));
    }

    @PostMapping("/bulk")
    public ResponseEntity<BulkImportResponseDTO> createIngredientsBulk(@RequestBody List<Ingredient> ingredients) {
        return ResponseEntity.ok(ingredientService.createIngredientsBulk(ingredients));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Ingredient> updateIngredient(@PathVariable Long id,
            @Valid @RequestBody Ingredient ingredientDetails) {
        return ResponseEntity.ok(ingredientService.updateIngredient(id, ingredientDetails));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIngredient(@PathVariable Long id) {
        ingredientService.deleteIngredient(id);
        return ResponseEntity.noContent().build();
    }
}
