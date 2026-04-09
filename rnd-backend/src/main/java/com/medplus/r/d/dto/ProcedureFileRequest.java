package com.medplus.r.d.dto;

import lombok.Data;

@Data
public class ProcedureFileRequest {
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
}
