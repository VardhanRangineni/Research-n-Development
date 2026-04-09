package com.medplus.r.d.dto;

import com.medplus.r.d.entity.ProcedureFile;
import com.medplus.r.d.entity.ProcedureRow;
import com.medplus.r.d.entity.ProcedureSection;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProcedureFileResponse {

    private Long id;
    private Long projectRefId;
    private Long protocolRefId;
    private String productName;
    private String brandName;
    private String mfrNo;
    private String batchNo;
    private String batchSize;
    private String mfgDate;
    private String dateOfCompletion;
    private String revisionNo;
    private String revisionDate;
    private String documentNo;
    private String shelfLife;
    private String mixerCapacity;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<SectionResponse> sections;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionResponse {
        private Long id;
        private Integer stepNo;
        private String descriptionOfProcess;
        private List<RowResponse> rows;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowResponse {
        private Long id;
        private String nameOfMaterial;
        private String formulaQtyPer100Kg;
        private String actualQty;
        private String standardTime;
        private String rpm;
        private Integer rowOrder;
    }

    public static ProcedureFileResponse from(ProcedureFile file, List<SectionResponse> sections) {
        ProcedureFileResponse r = new ProcedureFileResponse();
        r.setId(file.getId());
        r.setProjectRefId(file.getProjectRefId());
        r.setProtocolRefId(file.getProtocolRefId());
        r.setProductName(file.getProductName());
        r.setBrandName(file.getBrandName());
        r.setMfrNo(file.getMfrNo());
        r.setBatchNo(file.getBatchNo());
        r.setBatchSize(file.getBatchSize());
        r.setMfgDate(file.getMfgDate());
        r.setDateOfCompletion(file.getDateOfCompletion());
        r.setRevisionNo(file.getRevisionNo());
        r.setRevisionDate(file.getRevisionDate());
        r.setDocumentNo(file.getDocumentNo());
        r.setShelfLife(file.getShelfLife());
        r.setMixerCapacity(file.getMixerCapacity());
        r.setCreatedAt(file.getCreatedAt());
        r.setUpdatedAt(file.getUpdatedAt());
        r.setSections(sections);
        return r;
    }

    public static SectionResponse fromSection(ProcedureSection section, List<RowResponse> rows) {
        SectionResponse s = new SectionResponse();
        s.setId(section.getId());
        s.setStepNo(section.getStepNo());
        s.setDescriptionOfProcess(section.getDescriptionOfProcess());
        s.setRows(rows);
        return s;
    }

    public static RowResponse fromRow(ProcedureRow row) {
        RowResponse r = new RowResponse();
        r.setId(row.getId());
        r.setNameOfMaterial(row.getNameOfMaterial());
        r.setFormulaQtyPer100Kg(row.getFormulaQtyPer100Kg());
        r.setActualQty(row.getActualQty());
        r.setStandardTime(row.getStandardTime());
        r.setRpm(row.getRpm());
        r.setRowOrder(row.getRowOrder());
        return r;
    }
}
