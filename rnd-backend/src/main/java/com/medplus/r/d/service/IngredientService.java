package com.medplus.r.d.service;

import com.medplus.r.d.dto.BulkImportErrorDTO;
import com.medplus.r.d.dto.BulkImportResponseDTO;
import com.medplus.r.d.entity.Ingredient;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.IngredientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class IngredientService {

    private static final String BULK_DEFAULT_TEXT = "N/A";

    @Autowired
    private IngredientRepository ingredientRepository;

    public List<Ingredient> getAllIngredients() {
        return ingredientRepository.findAll();
    }

    public Ingredient getIngredientById(Long id) {
        return ingredientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ingredient", id));
    }

    public Ingredient createIngredient(Ingredient ingredient) {
        String erpCode = normalize(ingredient.getErpCode());
        String tradeName = normalize(ingredient.getTradeName());
        String inciName = normalize(ingredient.getInciName());
        String supplierName = normalize(ingredient.getSupplierName());

        if (erpCode == null || tradeName == null || inciName == null || supplierName == null) {
            throw new IllegalArgumentException("erpCode, tradeName, inciName and supplierName are required");
        }

        if (ingredientRepository.existsByErpCode(erpCode)) {
            throw new IllegalArgumentException(buildDuplicateErpCodeMessage(tradeName, erpCode));
        }

        ingredient.setErpCode(erpCode);
        ingredient.setTradeName(tradeName);
        ingredient.setInciName(inciName);
        ingredient.setSupplierName(supplierName);
        ingredient.setFunction(normalize(ingredient.getFunction()));
        ingredient.setGrade(normalize(ingredient.getGrade()));
        ingredient.setCasNumber(normalize(ingredient.getCasNumber()));
        ingredient.setEcNo(normalize(ingredient.getEcNo()));
        ingredient.setPrice(normalize(ingredient.getPrice()));
        ingredient.setUom(normalize(ingredient.getUom()));
        ingredient.setSafetyLevel(normalize(ingredient.getSafetyLevel()));
        ingredient.setComplianceStatus(normalize(ingredient.getComplianceStatus()));

        return ingredientRepository.save(ingredient);
    }

    @Transactional
    public BulkImportResponseDTO createIngredientsBulk(List<Ingredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) {
            return new BulkImportResponseDTO(0, 0, 0, new ArrayList<>());
        }

        List<BulkImportErrorDTO> errors = new ArrayList<>();
        Set<String> seenErpCodes = new HashSet<>();
        List<Ingredient> normalizedIngredients = new ArrayList<>();

        for (int i = 0; i < ingredients.size(); i++) {
            Ingredient ingredient = ingredients.get(i);
            int rowNumber = i + 1;

            if (ingredient == null) {
                continue;
            }

            if (isCompletelyEmptyRow(ingredient)) {
                continue;
            }

            String erpCode = normalize(ingredient.getErpCode());
            if (erpCode == null) {
                erpCode = buildAutoErpCode(rowNumber);
            }

            if (!seenErpCodes.add(erpCode.toLowerCase(Locale.ROOT))) {
                errors.add(new BulkImportErrorDTO(rowNumber, erpCode, "Duplicate erpCode in upload payload"));
                continue;
            }

            Ingredient normalizedIngredient = new Ingredient();
            normalizedIngredient.setErpCode(erpCode);
            normalizedIngredient.setTradeName(defaultBlank(ingredient.getTradeName()));
            normalizedIngredient.setInciName(defaultBlank(ingredient.getInciName()));
            normalizedIngredient.setSupplierName(defaultBlank(ingredient.getSupplierName()));
            normalizedIngredient.setFunction(normalize(ingredient.getFunction()));
            normalizedIngredient.setGrade(normalize(ingredient.getGrade()));
            normalizedIngredient.setCasNumber(normalize(ingredient.getCasNumber()));
            normalizedIngredient.setEcNo(normalize(ingredient.getEcNo()));
            normalizedIngredient.setPrice(normalize(ingredient.getPrice()));
            normalizedIngredient.setUom(normalize(ingredient.getUom()));
            normalizedIngredient.setSafetyLevel(normalize(ingredient.getSafetyLevel()));
            normalizedIngredient.setComplianceStatus(normalize(ingredient.getComplianceStatus()));
            normalizedIngredient.setSpecificGravity(ingredient.getSpecificGravity());

            normalizedIngredients.add(normalizedIngredient);
        }

        if (!errors.isEmpty()) {
            int totalRows = normalizedIngredients.size() + errors.size();
            return new BulkImportResponseDTO(totalRows, 0, errors.size(), errors);
        }

        if (normalizedIngredients.isEmpty()) {
            throw new IllegalArgumentException("Uploaded Excel has no data rows to import");
        }

        try {
            ingredientRepository.deleteAllInBatch();
            ingredientRepository.flush();

            ingredientRepository.saveAll(normalizedIngredients);
            ingredientRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            String reason = extractIntegrityReason(ex);
            throw new IllegalArgumentException("Bulk upload failed due to data integrity constraints: " + reason);
        }

        int total = normalizedIngredients.size();
        return new BulkImportResponseDTO(total, total, 0, new ArrayList<>());
    }

    public Ingredient updateIngredient(Long id, Ingredient ingredientDetails) {
        Ingredient ingredient = ingredientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ingredient", id));

        String erpCode = normalize(ingredientDetails.getErpCode());
        String tradeName = normalize(ingredientDetails.getTradeName());
        String inciName = normalize(ingredientDetails.getInciName());
        String supplierName = normalize(ingredientDetails.getSupplierName());

        if (erpCode == null || tradeName == null || inciName == null || supplierName == null) {
            throw new IllegalArgumentException("erpCode, tradeName, inciName and supplierName are required");
        }

        if (ingredientRepository.existsByErpCodeAndIdNot(erpCode, id)) {
            throw new IllegalArgumentException(buildDuplicateErpCodeMessage(tradeName, erpCode));
        }

        ingredient.setErpCode(erpCode);
        ingredient.setTradeName(tradeName);
        ingredient.setInciName(inciName);
        ingredient.setSupplierName(supplierName);
        ingredient.setFunction(normalize(ingredientDetails.getFunction()));
        ingredient.setGrade(normalize(ingredientDetails.getGrade()));
        ingredient.setCasNumber(normalize(ingredientDetails.getCasNumber()));
        ingredient.setEcNo(normalize(ingredientDetails.getEcNo()));
        ingredient.setPrice(normalize(ingredientDetails.getPrice()));
        ingredient.setUom(normalize(ingredientDetails.getUom()));
        ingredient.setSafetyLevel(normalize(ingredientDetails.getSafetyLevel()));
        ingredient.setComplianceStatus(normalize(ingredientDetails.getComplianceStatus()));
        ingredient.setSpecificGravity(ingredientDetails.getSpecificGravity());
        return ingredientRepository.save(ingredient);
    }

    public void deleteIngredient(Long id) {
        if (!ingredientRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ingredient", id);
        }
        ingredientRepository.deleteById(id);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String buildDuplicateErpCodeMessage(String tradeName, String erpCode) {
        String resolvedName = (tradeName == null || tradeName.isBlank()) ? "this ingredient" : tradeName;
        return "Ingredient '" + resolvedName + "' already exists with ERP Code '" + erpCode + "'.";
    }

    private String defaultBlank(String value) {
        String normalized = normalize(value);
        return normalized == null ? BULK_DEFAULT_TEXT : normalized;
    }

    private String buildAutoErpCode(int rowNumber) {
        return "AUTO-ING-ROW-" + rowNumber;
    }

    private boolean isCompletelyEmptyRow(Ingredient ingredient) {
        return normalize(ingredient.getErpCode()) == null
                && normalize(ingredient.getTradeName()) == null
                && normalize(ingredient.getInciName()) == null
                && normalize(ingredient.getSupplierName()) == null
                && normalize(ingredient.getFunction()) == null
                && normalize(ingredient.getGrade()) == null
                && normalize(ingredient.getCasNumber()) == null
                && normalize(ingredient.getEcNo()) == null
                && normalize(ingredient.getPrice()) == null
                && normalize(ingredient.getUom()) == null
                && normalize(ingredient.getSafetyLevel()) == null
                && normalize(ingredient.getComplianceStatus()) == null
                && ingredient.getSpecificGravity() == null;
    }

    private String extractIntegrityReason(Throwable throwable) {
        Throwable current = throwable;
        Throwable root = throwable;
        while (current != null) {
            root = current;
            current = current.getCause();
        }

        String message = root != null ? root.getMessage() : null;
        if (message == null || message.isBlank()) {
            return "Unknown constraint violation";
        }

        if (message.length() > 220) {
            return message.substring(0, 220) + "...";
        }
        return message;
    }
}
