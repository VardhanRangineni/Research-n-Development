package com.medplus.r.d.service;

import com.medplus.r.d.entity.BusinessSequence;
import com.medplus.r.d.repository.BusinessSequenceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BusinessSequenceService {

    private final BusinessSequenceRepository businessSequenceRepository;

    public BusinessSequenceService(BusinessSequenceRepository businessSequenceRepository) {
        this.businessSequenceRepository = businessSequenceRepository;
    }

    @Transactional
    public long nextValue(String name, long initialSeed) {
        BusinessSequence sequence = businessSequenceRepository.findByNameForUpdate(name)
                .orElseGet(() -> new BusinessSequence(name, initialSeed));

        long nextValue = sequence.getCurrentValue() + 1;
        sequence.setCurrentValue(nextValue);
        businessSequenceRepository.save(sequence);
        return nextValue;
    }
}