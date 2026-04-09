import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import medPlusLogo from '../../assets/MedPlus.png';
import {
    PRE_MANUFACTURING_INSTRUCTIONS,
    parseFormulaItems,
    parseMeasurements,
    parseArrayJson,
    parseJsonMap,
    parseMasterFormulaInfo,
    resolveMfrIngredients,
    getObservationKey,
    formatDate,
    parseMeasurementDisplay,
    toMeasurementText
} from './auditTrailUtils';
import { appendCommonProcedureTailSections } from '../Procedure/procedureCommonSteps';

const getImageMeta = (dataUrl) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Unable to read logo dimensions.'));
    img.src = dataUrl;
});

const getLogoData = async () => {
    const response = await fetch(medPlusLogo, { credentials: 'same-origin' });
    if (!response.ok) {
        throw new Error('Unable to load MedPlus logo for PDF export.');
    }

    const blob = await response.blob();
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read MedPlus logo file.'));
        reader.readAsDataURL(blob);
    });

    const meta = await getImageMeta(dataUrl);
    return { dataUrl, ...meta };
};

const drawPageFrame = (doc) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(249, 250, 252);
    doc.rect(28, 20, pageWidth - 56, pageHeight - 40, 'FD');
};

const drawLogo = (doc, logo) => {
    const maxLogoWidth = 98;
    const maxLogoHeight = 34;
    const logoRatio = logo.width / logo.height;
    const boxRatio = maxLogoWidth / maxLogoHeight;
    const renderWidth = logoRatio > boxRatio ? maxLogoWidth : maxLogoHeight * logoRatio;
    const renderHeight = logoRatio > boxRatio ? maxLogoWidth / logoRatio : maxLogoHeight;
    doc.addImage(logo.dataUrl, 'PNG', 42, 36, renderWidth, renderHeight);
};

export const triggerBlobDownload = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
};

export const buildMasterFormulaPdfBlob = async ({ trail, passedProtocols, ingredientMaster }) => {
    const logo = await getLogoData();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedOnText = new Date().toLocaleString();

    passedProtocols.forEach((protocol, index) => {
        if (index > 0) doc.addPage();

        const linkedBatch = (trail?.batches || []).find(batch => batch.id === protocol.batchFormulaRefId);
        const info = parseMasterFormulaInfo(protocol.masterFormulaInfoJson);
        const formulaItems = resolveMfrIngredients(info.ingredients, linkedBatch, ingredientMaster);
        const totalPercent = formulaItems.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);

        const drawMasterPageShell = () => {
            drawPageFrame(doc);
            drawLogo(doc, logo);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(20, 20, 20);
            doc.text('Master Formula Information', pageWidth / 2, 50, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.text(`${protocol.protocolName || 'Stability Protocol'} - Master Formula Record`, pageWidth / 2, 68, { align: 'center' });
            doc.text(`Batch: ${linkedBatch?.batchName || `#${protocol.batchFormulaRefId}`}`, pageWidth / 2, 82, { align: 'center' });
        };

        const drawMasterShellForContinuationPages = (startPage) => () => {
            const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
            if (currentPage > startPage) {
                drawMasterPageShell();
            }
        };

        drawMasterPageShell();

        let tableStartPage = doc.internal.getCurrentPageInfo().pageNumber;
        autoTable(doc, {
            startY: 96,
            margin: { left: 40, right: 40, top: 96, bottom: 44 },
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 5, lineColor: [210, 210, 210], lineWidth: 0.5 },
            headStyles: { fillColor: [248, 248, 248], textColor: [33, 37, 41], fontStyle: 'bold' },
            body: [
                ['Company Name', info.companyName || '—', 'Date of Issue', formatDate(info.dateOfIssue) || '—'],
                ['Brand Name', info.brandName || '—', 'Revision No.', info.revisionNo || '—'],
                ['Product Name', info.productName || '—', 'Revision Date', formatDate(info.revisionDate) || '—'],
                ['Shelf Life', info.shelfLife || '—', 'Issued By', info.issuedBy || '—'],
                ['MRF No.', info.mrfNo || '—', 'Doc. No.', info.docNo || '—']
            ],
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: [253, 253, 253], cellWidth: 96 },
                1: { cellWidth: 162 },
                2: { fontStyle: 'bold', fillColor: [253, 253, 253], cellWidth: 96 },
                3: { cellWidth: 162 }
            },
            willDrawPage: drawMasterShellForContinuationPages(tableStartPage)
        });

        tableStartPage = doc.internal.getCurrentPageInfo().pageNumber;
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 12,
            margin: { left: 40, right: 40, top: 96, bottom: 44 },
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 5, lineColor: [210, 210, 210], lineWidth: 0.5 },
            headStyles: { fillColor: [248, 248, 248], textColor: [33, 37, 41], fontStyle: 'bold' },
            head: [['Sr. No.', 'ERP Code', 'INCI', 'Percentage', 'Vendors', 'Function']],
            body: [
                ...formulaItems.map((item, rowIndex) => ([
                    item.srNo || rowIndex + 1,
                    item.erpCode || '—',
                    item.inci || '—',
                    `${Number(item.percentage || 0).toFixed(2)}%`,
                    item.vendor || item.vendors || '—',
                    item.function || '—'
                ])),
                ['', '', '', `Total: ${totalPercent.toFixed(2)}%`, '', '']
            ],
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 78 },
                2: { cellWidth: 120 },
                3: { cellWidth: 78, halign: 'right' },
                4: { cellWidth: 90 },
                5: { cellWidth: 90 }
            },
            willDrawPage: drawMasterShellForContinuationPages(tableStartPage)
        });

        let instructionTitleY = doc.lastAutoTable.finalY + 20;
        if (instructionTitleY + 28 > pageHeight - 44) {
            doc.addPage();
            drawMasterPageShell();
            instructionTitleY = 108;
        }

        doc.setTextColor(33, 37, 41);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Pre Manufacturing Instructions:', 42, instructionTitleY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);

        let cursorY = instructionTitleY + 14;
        PRE_MANUFACTURING_INSTRUCTIONS.forEach((instruction, instructionIndex) => {
            const bulletText = `${instructionIndex + 1}. ${instruction}`;
            const wrapped = doc.splitTextToSize(bulletText, pageWidth - 95);

            if (cursorY + (wrapped.length * 12) > pageHeight - 44) {
                doc.addPage();
                drawMasterPageShell();
                cursorY = 108;
            }

            doc.text(wrapped, 50, cursorY);
            cursorY += wrapped.length * 12;
        });

    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        doc.setPage(pageNumber);
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text(`Generated on ${generatedOnText}`, 42, pageHeight - 24);
        doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 42, pageHeight - 24, { align: 'right' });
    }

    return doc.output('blob');
};

export const buildStabilityPdfBlob = async ({ trail }) => {
    const logo = await getLogoData();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedOnText = new Date().toLocaleString();

    const drawStatusIcon = (centerX, centerY, status) => {
        if (status === 'PASS') {
            doc.setFillColor(25, 135, 84);
            doc.circle(centerX, centerY, 5, 'F');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(1.1);
            doc.line(centerX - 2, centerY, centerX - 0.3, centerY + 2.1);
            doc.line(centerX - 0.3, centerY + 2.1, centerX + 2.6, centerY - 2.2);
            return;
        }

        if (status === 'FAIL') {
            doc.setFillColor(220, 53, 69);
            doc.circle(centerX, centerY, 5, 'F');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(1.1);
            doc.line(centerX - 2.1, centerY - 2.1, centerX + 2.1, centerY + 2.1);
            doc.line(centerX - 2.1, centerY + 2.1, centerX + 2.1, centerY - 2.1);
        }
    };

    const drawLegend = (legendY) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text('Legend:', 42, legendY);

        drawStatusIcon(95, legendY - 2, 'PASS');
        doc.setFont('helvetica', 'normal');
        doc.text('Pass', 104, legendY);

        drawStatusIcon(146, legendY - 2, 'FAIL');
        doc.text('Fail', 155, legendY);

        doc.setTextColor(120, 120, 120);
        doc.text('NA: dash', 196, legendY);
    };

    const drawPageShell = (protocol, linkedBatch, pageIndex) => {
        drawPageFrame(doc);
        drawLogo(doc, logo);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(20, 20, 20);
        doc.text('Stability History Record', pageWidth / 2, 50, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`${protocol.protocolName || 'Stability Protocol'}`, pageWidth / 2, 68, { align: 'center' });
        doc.text(`Batch: ${linkedBatch?.batchName || `#${protocol.batchFormulaRefId}`} | Status: ${protocol.status || 'ACTIVE'}`, pageWidth / 2, 82, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text(`Generated on ${generatedOnText}`, 42, pageHeight - 24);
        doc.text(`Page ${pageIndex}`, pageWidth - 42, pageHeight - 24, { align: 'right' });

        drawLegend(pageHeight - 38);
    };

    let printedPages = 0;
    const protocols = trail?.stabilityProtocols || [];

    protocols.forEach((protocol, protocolIndex) => {
        if (protocolIndex > 0) doc.addPage();
        printedPages += 1;

        const linkedBatch = (trail?.batches || []).find(batch => batch.id === protocol.batchFormulaRefId);
        const conditions = parseArrayJson(protocol.conditionsJson);
        const intervals = parseArrayJson(protocol.intervalsJson);
        const parameters = parseArrayJson(protocol.parametersJson);
        const parameterReferences = parseJsonMap(protocol.parameterReferencesJson);

        const getReferenceText = (parameter) => {
            const exactMatch = parameterReferences[parameter];
            if (exactMatch !== null && exactMatch !== undefined) {
                return `${exactMatch}`.trim();
            }

            const lookupKey = Object.keys(parameterReferences).find(
                key => `${key || ''}`.trim().toLowerCase() === `${parameter || ''}`.trim().toLowerCase()
            );
            if (!lookupKey) return '';
            return `${parameterReferences[lookupKey] || ''}`.trim();
        };

        const protocolObservationMap = (trail?.stabilityObservations || [])
            .filter(entry => entry.protocolRefId === protocol.id)
            .reduce((acc, entry) => {
                acc[getObservationKey(entry.conditionLabel, entry.intervalLabel)] = entry;
                return acc;
            }, {});

        drawPageShell(protocol, linkedBatch, printedPages);

        let cursorY = 108;
        conditions.forEach((condition) => {
            const estimatedHeight = 56 + Math.max(parameters.length, 1) * 22;
            if (cursorY + estimatedHeight > pageHeight - 52) {
                doc.addPage();
                printedPages += 1;
                drawPageShell(protocol, linkedBatch, printedPages);
                cursorY = 108;
            }

            const intervalHeaders = intervals.map((interval) => {
                const observation = protocolObservationMap[getObservationKey(condition, interval)];
                const observedDate = formatDate(observation?.observedOn);
                return observedDate ? `${interval}\n${observedDate}` : interval;
            });

            const statusMap = {};
            const bodyRows = (parameters.length ? parameters : ['No parameters configured']).map((parameter, rowIndex) => {
                if (parameter === 'No parameters configured') {
                    return [parameter, '—', ...intervals.map(() => '—')];
                }

                return [
                    parameter,
                    getReferenceText(parameter) || '—',
                    ...intervals.map((interval, intervalIndex) => {
                        const observation = protocolObservationMap[getObservationKey(condition, interval)];
                        const measurements = observation ? parseMeasurements(observation.measurementsJson) : {};
                        const parsed = parseMeasurementDisplay(measurements[parameter]);
                        statusMap[`${rowIndex}:${intervalIndex + 2}`] = parsed.status;
                        return toMeasurementText(parsed);
                    })
                ];
            });

            const tableStartPage = doc.internal.getCurrentPageInfo().pageNumber;
            autoTable(doc, {
                startY: cursorY,
                margin: { left: 40, right: 40, top: 108, bottom: 52 },
                theme: 'grid',
                head: [],
                body: [
                    [{ content: `${condition}`, colSpan: intervalHeaders.length + 2, styles: { halign: 'left', fontStyle: 'bold', fillColor: [255, 255, 255] } }],
                    ['Parameter', 'Reference', ...intervalHeaders],
                    ...bodyRows
                ],
                styles: {
                    fontSize: 9,
                    cellPadding: 5,
                    lineColor: [210, 210, 210],
                    lineWidth: 0.5,
                    textColor: [33, 37, 41],
                    valign: 'middle'
                },
                columnStyles: {
                    0: { cellWidth: 118, fontStyle: 'bold', halign: 'left' },
                    1: { cellWidth: 118, halign: 'left' }
                },
                didParseCell: (data) => {
                    if (data.section !== 'body') return;

                    if (data.row.index === 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.halign = data.column.index <= 1 ? 'left' : 'center';
                        data.cell.styles.fillColor = [255, 255, 255];
                        return;
                    }

                    if (data.row.index > 1 && data.column.index > 1) {
                        data.cell.styles.halign = 'center';
                    }
                },
                didDrawCell: (data) => {
                    if (data.section !== 'body' || data.row.index <= 1 || data.column.index <= 1) return;

                    const status = statusMap[`${data.row.index - 2}:${data.column.index}`];
                    if (!status || !['PASS', 'FAIL'].includes(status)) return;

                    const iconX = data.cell.x + data.cell.width / 2;
                    const iconY = data.cell.y + 8;
                    drawStatusIcon(iconX, iconY, status);
                },
                willDrawPage: () => {
                    const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
                    if (currentPage <= tableStartPage) {
                        return;
                    }

                    if (currentPage > printedPages) {
                        printedPages += 1;
                    }
                    drawPageShell(protocol, linkedBatch, printedPages);
                }
            });

            cursorY = doc.lastAutoTable.finalY + 16;
        });
    });

    return doc.output('blob');
};

export const buildBatchHistoryPdfBlob = async ({ trail, benchmarkId }) => {
    const logo = await getLogoData();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedOnText = new Date().toLocaleString();

    const rows = (trail?.batches || []).flatMap((batch) => {
        const snapshot = parseFormulaItems(batch.formulaSnapshot);

        if (!snapshot.length) {
            return [[
                batch.batchName || '—',
                Number(batch.targetBatchSize || 0).toFixed(2),
                Number(batch.currentTotalWeight || 0).toFixed(2),
                batch.status || 'PENDING',
                batch.remark || '—',
                '—'
            ]];
        }

        const ingredientLines = snapshot.map(
            (item) => `${item.ingredientName || 'Ingredient'}: ${Number(item.weight || 0).toFixed(2)}g (${Number(item.actualPercent || 0).toFixed(2)}%)`
        );

        const groupedRows = [[
            { content: batch.batchName || '—', rowSpan: ingredientLines.length, styles: { fontStyle: 'bold' } },
            { content: Number(batch.targetBatchSize || 0).toFixed(2), rowSpan: ingredientLines.length },
            { content: Number(batch.currentTotalWeight || 0).toFixed(2), rowSpan: ingredientLines.length },
            { content: batch.status || 'PENDING', rowSpan: ingredientLines.length },
            { content: batch.remark || '—', rowSpan: ingredientLines.length },
            ingredientLines[0]
        ]];

        ingredientLines.slice(1).forEach((line) => {
            groupedRows.push([line]);
        });

        return groupedRows;
    });

    autoTable(doc, {
        startY: 108,
        margin: { left: 40, right: 40, top: 108, bottom: 44 },
        tableWidth: pageWidth - 80,
        theme: 'grid',
        head: [['Batch Name', 'Target Batch Size (g)', 'Current Total (g)', 'Status', 'Remark', 'Ingredients Snapshot']],
        body: rows,
        styles: {
            fontSize: 8.5,
            cellPadding: 5,
            lineColor: [210, 210, 210],
            lineWidth: 0.5,
            textColor: [33, 37, 41],
            valign: 'middle',
            halign: 'center',
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [33, 37, 41],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 82, fontStyle: 'bold', halign: 'center', valign: 'middle' },
            1: { cellWidth: 64, halign: 'center', valign: 'middle' },
            2: { cellWidth: 64, halign: 'center', valign: 'middle' },
            3: { cellWidth: 52, halign: 'center', valign: 'middle' },
            4: { cellWidth: 78, halign: 'center', valign: 'middle' },
            5: { cellWidth: 138, halign: 'center', valign: 'middle' }
        },
        willDrawPage: () => {
            drawPageFrame(doc);
            drawLogo(doc, logo);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(20, 20, 20);
            doc.text('Batch History Record', pageWidth / 2, 50, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.text(`${trail?.benchmarkId || benchmarkId}`, pageWidth / 2, 68, { align: 'center' });
            doc.text(`Total Batches: ${(trail?.batches || []).length}`, pageWidth / 2, 82, { align: 'center' });
        },
        didDrawPage: () => {
            doc.setFontSize(8.5);
            doc.setTextColor(120, 120, 120);
            doc.text(`Generated on ${generatedOnText}`, 42, pageHeight - 24);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 42, pageHeight - 24, { align: 'right' });
        }
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        doc.setPage(pageNumber);
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text(`Generated on ${generatedOnText}`, 42, pageHeight - 24);
        doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 42, pageHeight - 24, { align: 'right' });
    }

    return doc.output('blob');
};

export const buildProcedurePdfBlob = async ({ trail, protocol, procedure }) => {
    const logo = await getLogoData();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedOnText = new Date().toLocaleString();

    const drawProcedureShell = () => {
        drawPageFrame(doc);
        drawLogo(doc, logo);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(20, 20, 20);
        doc.text('Procedure Format', pageWidth / 2, 50, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`${protocol?.protocolName || 'Stability Protocol'} - ${trail?.benchmarkId || ''}`, pageWidth / 2, 68, { align: 'center' });
        doc.text(`Batch: ${procedure?.batchNo || '—'}`, pageWidth / 2, 82, { align: 'center' });
    };

    drawProcedureShell();

    let tableStartPage = doc.internal.getCurrentPageInfo().pageNumber;
    autoTable(doc, {
        startY: 96,
        margin: { left: 40, right: 40, top: 96, bottom: 44 },
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5, lineColor: [210, 210, 210], lineWidth: 0.5 },
        body: [
            ['Product Name', procedure?.productName || '—', 'Revision No.', procedure?.revisionNo || '—'],
            ['Brand Name', procedure?.brandName || '—', 'Revision Date', procedure?.revisionDate || '—'],
            ['MFR No.', procedure?.mfrNo || '—', 'Document No.', procedure?.documentNo || '—'],
            ['Batch No.', procedure?.batchNo || '—', 'Shelf life', procedure?.shelfLife || '—'],
            ['Batch size', procedure?.batchSize || '—', 'Mixer Capacity', procedure?.mixerCapacity || '—'],
            ['Mfg date', procedure?.mfgDate || '—', 'Date of completion', procedure?.dateOfCompletion || '—']
        ],
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [253, 253, 253], cellWidth: 96 },
            1: { cellWidth: 162 },
            2: { fontStyle: 'bold', fillColor: [253, 253, 253], cellWidth: 96 },
            3: { cellWidth: 162 }
        },
        willDrawPage: () => {
            const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
            if (currentPage > tableStartPage) {
                drawProcedureShell();
            }
        }
    });

    const sectionRows = [];
    appendCommonProcedureTailSections(procedure?.sections || []).forEach((section) => {
        if (section?.isFixedCommonTail) {
            sectionRows.push([
                { content: section?.stepNo || '—', styles: { halign: 'center', fontStyle: 'bold' } },
                { content: section?.descriptionOfProcess || '—', colSpan: 6, styles: { fontStyle: 'bold' } }
            ]);
            return;
        }

        const rows = (section?.rows && section.rows.length)
            ? section.rows
            : [{ nameOfMaterial: '—', formulaQtyPer100Kg: '—', actualQty: '—', standardTime: '—', rpm: '—' }];

        rows.forEach((row, index) => {
            if (index === 0) {
                sectionRows.push([
                    { content: section?.stepNo || '—', rowSpan: rows.length, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
                    { content: section?.descriptionOfProcess || '—', rowSpan: rows.length, styles: { valign: 'middle' } },
                    row?.nameOfMaterial || '—',
                    row?.formulaQtyPer100Kg || '—',
                    row?.actualQty || '—',
                    { content: row?.standardTime || '—', rowSpan: rows.length, styles: { halign: 'center', valign: 'middle' } },
                    { content: row?.rpm || '—', rowSpan: rows.length, styles: { halign: 'center', valign: 'middle' } }
                ]);
                return;
            }

            sectionRows.push([
                row?.nameOfMaterial || '—',
                row?.formulaQtyPer100Kg || '—',
                row?.actualQty || '—'
            ]);
        });
    });

    tableStartPage = doc.internal.getCurrentPageInfo().pageNumber;
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 12,
        margin: { left: 40, right: 40, top: 96, bottom: 44 },
        tableWidth: pageWidth - 80,
        theme: 'grid',
        head: [['Step No', 'Description of Process', 'Name of Material', 'Formula quantity for 100 kg', 'Actual Qty', 'Standard Time', 'RPM']],
        body: sectionRows.length ? sectionRows : [[{ content: 'No procedure sections available.', colSpan: 7, styles: { halign: 'center' } }]],
        styles: {
            fontSize: 8.5,
            cellPadding: 5,
            lineColor: [210, 210, 210],
            lineWidth: 0.5,
            textColor: [33, 37, 41],
            valign: 'middle'
        },
        headStyles: {
            fillColor: [248, 248, 248],
            textColor: [33, 37, 41],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 46, halign: 'center' },
            1: { cellWidth: 120 },
            2: { cellWidth: 100 },
            3: { cellWidth: 90, halign: 'center' },
            4: { cellWidth: 70, halign: 'center' },
            5: { cellWidth: 55, halign: 'center' },
            6: { cellWidth: 34, halign: 'center' }
        },
        willDrawPage: () => {
            const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
            if (currentPage > tableStartPage) {
                drawProcedureShell();
            }
        }
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        doc.setPage(pageNumber);
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text(`Generated on ${generatedOnText}`, 42, pageHeight - 24);
        doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 42, pageHeight - 24, { align: 'right' });
    }

    return doc.output('blob');
};
