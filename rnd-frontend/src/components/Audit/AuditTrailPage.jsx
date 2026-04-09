import { useState } from 'react';
import { Container, Card, Row, Col, Form, Button, Table, Badge, Spinner } from 'react-bootstrap';
import { MdCheckCircle, MdClose, MdRemove } from 'react-icons/md';
import { auditService } from '../../services/audit.service';
import { ingredientsService } from '../../services/ingredients.service';
import { procedureService } from '../../services/procedure.service';
import AppDialog from '../Common/AppDialog';
import {
    buildMasterFormulaPdfBlob,
    buildStabilityPdfBlob,
    buildBatchHistoryPdfBlob,
    buildProcedurePdfBlob,
    triggerBlobDownload
} from './auditPdfExporters';
import {
    PRE_MANUFACTURING_INSTRUCTIONS,
    parseFormulaItems,
    parseMeasurements,
    parseArrayJson,
    parseJsonMap,
    parseMasterFormulaInfo,
    resolveMfrIngredients,
    getObservationKey,
    getIntervalDueDate,
    isInitialIntervalLabel,
    formatDate,
    parseMeasurementDisplay,
    sanitizeFileName
} from './auditTrailUtils';
import { appendCommonProcedureTailSections } from '../Procedure/procedureCommonSteps';

const AuditTrailPage = () => {
    const [benchmarkId, setBenchmarkId] = useState('');
    const [loading, setLoading] = useState(false);
    const [trail, setTrail] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [documentsPage, setDocumentsPage] = useState({ page: 0, size: 10, totalPages: 0, totalElements: 0, first: true, last: true });
    const [ingredientMaster, setIngredientMaster] = useState([]);
    const [proceduresByProtocolId, setProceduresByProtocolId] = useState({});
    const [exportBusy, setExportBusy] = useState(false);
    const [batchExportBusy, setBatchExportBusy] = useState(false);
    const [stabilityExportBusy, setStabilityExportBusy] = useState(false);
    const [procedureExportBusyProtocolId, setProcedureExportBusyProtocolId] = useState(null);
    const [dialogInfo, setDialogInfo] = useState({ show: false, title: '', message: '' });

    const fetchTrail = async (id) => {
        if (!id) return;

        try {
            setLoading(true);
            const data = await auditService.getTrailByBenchmarkId(id);
            const projectRefId = data?.project?.id;

            const [docs, ingredients, procedures] = await Promise.all([
                auditService.getDocumentsByBenchmarkId(id, { page: 0, size: documentsPage.size }).catch(() => null),
                ingredientsService.getAll().catch(() => []),
                projectRefId ? procedureService.getByProject(projectRefId).catch(() => []) : Promise.resolve([])
            ]);

            const procedureMap = (Array.isArray(procedures) ? procedures : []).reduce((acc, item) => {
                if (item?.protocolRefId) {
                    acc[item.protocolRefId] = item;
                }
                return acc;
            }, {});

            setTrail(data || null);
            setDocuments(Array.isArray(docs?.content) ? docs.content : []);
            setDocumentsPage((prev) => ({
                ...prev,
                page: docs?.page ?? 0,
                totalPages: docs?.totalPages ?? 0,
                totalElements: docs?.totalElements ?? 0,
                first: docs?.first ?? true,
                last: docs?.last ?? true
            }));
            setIngredientMaster(Array.isArray(ingredients) ? ingredients : []);
            setProceduresByProtocolId(procedureMap);
        } catch (error) {
            setTrail(null);
            setDocuments([]);
            setIngredientMaster([]);
            setProceduresByProtocolId({});
            setDialogInfo({
                show: true,
                title: 'Lookup Failed',
                message: error.message || 'Unable to fetch audit trail for the given benchmark ID.'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadAuditDocuments = async (page) => {
        if (!benchmarkId.trim()) return;
        try {
            const docs = await auditService.getDocumentsByBenchmarkId(benchmarkId.trim(), { page, size: documentsPage.size });
            setDocuments(Array.isArray(docs?.content) ? docs.content : []);
            setDocumentsPage((prev) => ({
                ...prev,
                page: docs?.page ?? page,
                totalPages: docs?.totalPages ?? 0,
                totalElements: docs?.totalElements ?? 0,
                first: docs?.first ?? page === 0,
                last: docs?.last ?? true
            }));
        } catch (error) {
            setDialogInfo({ show: true, title: 'Load Failed', message: error.message || 'Unable to load audit documents.' });
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!benchmarkId.trim()) {
            setDialogInfo({ show: true, title: 'Validation', message: 'Please enter a benchmark ID.' });
            return;
        }

        await fetchTrail(benchmarkId.trim());
    };

    const passedProtocols = (trail?.stabilityProtocols || []).filter(
        (protocol) => `${protocol?.status || ''}`.toUpperCase() === 'PASSED'
    );

    const buildMasterFormulaPdfBlobLocal = async () => buildMasterFormulaPdfBlob({
        trail,
        passedProtocols,
        ingredientMaster
    });

    const handleExportPdf = async () => {
        if (!trail || passedProtocols.length === 0) {
            setDialogInfo({
                show: true,
                title: 'No Data to Export',
                message: 'No passed master formula records are available for export.'
            });
            return;
        }

        setExportBusy(true);

        try {
            const pdfBlob = await buildMasterFormulaPdfBlobLocal();
            const pdfFileName = sanitizeFileName(`${trail?.benchmarkId || benchmarkId}-master-formula-record.pdf`, 'master-formula-record.pdf');
            triggerBlobDownload(pdfBlob, pdfFileName);
        } catch (error) {
            setDialogInfo({
                show: true,
                title: 'Export Failed',
                message: error.message || 'Unable to export audit PDF at the moment.'
            });
        } finally {
            setExportBusy(false);
        }
    };

    const buildStabilityPdfBlobLocal = async () => buildStabilityPdfBlob({ trail });

    const handleExportStabilityPdf = async () => {
        const stabilityProtocols = trail?.stabilityProtocols || [];
        if (!trail || stabilityProtocols.length === 0) {
            setDialogInfo({
                show: true,
                title: 'No Data to Export',
                message: 'No stability records are available for export.'
            });
            return;
        }

        setStabilityExportBusy(true);
        try {
            const pdfBlob = await buildStabilityPdfBlobLocal();
            const pdfFileName = sanitizeFileName(`${trail?.benchmarkId || benchmarkId}-stability-record.pdf`, 'stability-record.pdf');
            triggerBlobDownload(pdfBlob, pdfFileName);
        } catch (error) {
            setDialogInfo({
                show: true,
                title: 'Export Failed',
                message: error.message || 'Unable to export stability PDF at the moment.'
            });
        } finally {
            setStabilityExportBusy(false);
        }
    };

    const buildBatchHistoryPdfBlobLocal = async () => buildBatchHistoryPdfBlob({
        trail,
        benchmarkId
    });

    const handleExportBatchPdf = async () => {
        const batches = trail?.batches || [];
        if (!trail || batches.length === 0) {
            setDialogInfo({
                show: true,
                title: 'No Data to Export',
                message: 'No batch history records are available for export.'
            });
            return;
        }

        setBatchExportBusy(true);
        try {
            const pdfBlob = await buildBatchHistoryPdfBlobLocal();
            const pdfFileName = sanitizeFileName(`${trail?.benchmarkId || benchmarkId}-batch-history.pdf`, 'batch-history.pdf');
            triggerBlobDownload(pdfBlob, pdfFileName);
        } catch (error) {
            setDialogInfo({
                show: true,
                title: 'Export Failed',
                message: error.message || 'Unable to export batch history PDF at the moment.'
            });
        } finally {
            setBatchExportBusy(false);
        }
    };

    const handleExportProcedurePdf = async (protocol, procedure) => {
        if (!trail || !protocol || !procedure) {
            setDialogInfo({
                show: true,
                title: 'No Data to Export',
                message: 'No saved procedure format was found for this protocol.'
            });
            return;
        }

        setProcedureExportBusyProtocolId(protocol.id);
        try {
            const pdfBlob = await buildProcedurePdfBlob({ trail, protocol, procedure });
            const pdfFileName = sanitizeFileName(
                `${trail?.benchmarkId || benchmarkId}-${protocol?.protocolName || 'procedure'}-procedure-format.pdf`,
                'procedure-format.pdf'
            );
            triggerBlobDownload(pdfBlob, pdfFileName);
        } catch (error) {
            setDialogInfo({
                show: true,
                title: 'Export Failed',
                message: error.message || 'Unable to export procedure PDF at the moment.'
            });
        } finally {
            setProcedureExportBusyProtocolId(null);
        }
    };

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold m-0">Audit Trail Lookup</h2>
            </div>

            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Form onSubmit={handleSearch}>
                        <Row className="g-3 align-items-end">
                            <Col md={8}>
                                <Form.Label>Benchmark ID</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="MED/R&D/BCHMK-01"
                                    value={benchmarkId}
                                    onChange={(e) => setBenchmarkId(e.target.value)}
                                />
                            </Col>
                            <Col md={4}>
                                <Button type="submit" variant="danger" className="w-100" disabled={loading}>
                                    {loading ? 'Searching...' : 'Get Audit Trail'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {loading ? (
                <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : trail ? (
                <>
                    <Row className="g-4 mb-4">
                        <Col md={6}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white fw-semibold">Benchmark</Card.Header>
                                <Card.Body>
                                    <p className="mb-1"><strong>Benchmark ID:</strong> {trail.benchmark?.benchmarkId || trail.benchmarkId}</p>
                                    <p className="mb-1"><strong>Project ID:</strong> {trail.benchmark?.projectId || '—'}</p>
                                    <p className="mb-1"><strong>Product:</strong> {trail.benchmark?.productName || '—'}</p>
                                    <p className="mb-1"><strong>Competitor:</strong> {trail.benchmark?.competitorName || '—'}</p>
                                    <p className="mb-0"><strong>Status:</strong> {trail.benchmark?.status || '—'}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white fw-semibold">Project</Card.Header>
                                <Card.Body>
                                    <p className="mb-1"><strong>Name:</strong> {trail.project?.projectName || '—'}</p>
                                    <p className="mb-1"><strong>Project ID:</strong> {trail.project?.projectId || '—'}</p>
                                    <p className="mb-1"><strong>Benchmark Key:</strong> {trail.project?.benchmarkId || '—'}</p>
                                    <p className="mb-0"><strong>Status:</strong> {trail.project?.status || '—'}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Header className="bg-white fw-semibold">Linked Documents</Card.Header>
                        <Card.Body className="p-0">
                            {!documents || documents.length === 0 ? (
                                <div className="text-center py-4 text-muted">No linked documents found for this benchmark.</div>
                            ) : (
                                <>
                                <Table hover responsive bordered className="m-0 align-middle">
                                    <thead className="bg-light text-muted">
                                        <tr>
                                            <th className="ps-4">File Name</th>
                                            <th>Content Type</th>
                                            <th>Size</th>
                                            <th>Uploaded By</th>
                                            <th>Uploaded At</th>
                                            <th className="text-end pe-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.map((doc) => (
                                            <tr key={doc.id}>
                                                <td className="ps-4 fw-medium">{doc.originalFileName}</td>
                                                <td>{doc.contentType || '—'}</td>
                                                <td>{Number(doc.fileSize || 0).toLocaleString()} bytes</td>
                                                <td>{doc.uploadedBy || '—'}</td>
                                                <td>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '—'}</td>
                                                <td className="text-end pe-4">
                                                    <Button type="button"
                                                        size="sm"
                                                        variant="outline-primary"
                                                        onClick={() => window.open(doc.downloadUrl, '_blank', 'noopener,noreferrer')}
                                                    >
                                                        Open
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                                    <small className="text-muted">Showing {documents.length} of {documentsPage.totalElements} documents</small>
                                    <div className="d-flex gap-2">
                                        <Button type="button" size="sm" variant="outline-secondary" disabled={documentsPage.first || loading} onClick={() => loadAuditDocuments(Math.max(documentsPage.page - 1, 0))}>Previous</Button>
                                        <Button type="button" size="sm" variant="outline-secondary" disabled={documentsPage.last || loading} onClick={() => loadAuditDocuments(documentsPage.page + 1)}>Next</Button>
                                    </div>
                                </div>
                                </>
                            )}
                        </Card.Body>
                    </Card>

                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <span className="fw-semibold">Batch History</span>
                            <Button type="button"
                                size="sm"
                                variant="outline-danger"
                                onClick={handleExportBatchPdf}
                                disabled={batchExportBusy || !(trail?.batches || []).length}
                            >
                                {batchExportBusy ? 'Exporting...' : 'Export PDF'}
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {!trail.batches || trail.batches.length === 0 ? (
                                <div className="text-center py-4 text-muted">No batch records found for this benchmark.</div>
                            ) : (
                                <Table hover responsive bordered className="m-0 align-middle">
                                    <thead className="bg-light text-muted">
                                        <tr>
                                            <th className="ps-4">Batch Name</th>
                                            <th>Target Batch Size (g)</th>
                                            <th>Current Total (g)</th>
                                            <th>Status</th>
                                            <th>Remark</th>
                                            <th>Ingredients Snapshot</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trail.batches.map((batch) => {
                                            const snapshot = parseFormulaItems(batch.formulaSnapshot);
                                            const items = snapshot.length
                                                ? snapshot.map((item) => `${item.ingredientName}: ${Number(item.weight || 0).toFixed(2)}g (${Number(item.actualPercent || 0).toFixed(2)}%)`)
                                                : ['—'];

                                            return items.map((ingredientLine, index) => (
                                                <tr key={`${batch.id}-${index}`}>
                                                    {index === 0 && (
                                                        <>
                                                            <td className="ps-4 fw-medium" rowSpan={items.length}>{batch.batchName}</td>
                                                            <td rowSpan={items.length}>{Number(batch.targetBatchSize || 0).toFixed(2)}</td>
                                                            <td rowSpan={items.length}>{Number(batch.currentTotalWeight || 0).toFixed(2)}</td>
                                                            <td rowSpan={items.length}>
                                                                <Badge bg={batch.status === 'APPROVED' ? 'success' : batch.status === 'REJECTED' ? 'danger' : 'secondary'}>
                                                                    {batch.status || 'PENDING'}
                                                                </Badge>
                                                            </td>
                                                            <td style={{ maxWidth: 220 }} rowSpan={items.length}>{batch.remark || '—'}</td>
                                                        </>
                                                    )}
                                                    <td>{ingredientLine}</td>
                                                </tr>
                                            ));
                                        })}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>

                    <Card className="border-0 shadow-sm mt-4">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <span className="fw-semibold">Stability History</span>
                            <Button type="button"
                                size="sm"
                                variant="outline-danger"
                                onClick={handleExportStabilityPdf}
                                disabled={stabilityExportBusy || !(trail?.stabilityProtocols || []).length}
                            >
                                {stabilityExportBusy ? 'Exporting...' : 'Export PDF'}
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            {!trail.stabilityProtocols || trail.stabilityProtocols.length === 0 ? (
                                <div className="text-center py-4 text-muted">No stability protocol records found for this benchmark.</div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {trail.stabilityProtocols.map((protocol) => {
                                        const linkedBatch = (trail.batches || []).find(batch => batch.id === protocol.batchFormulaRefId);
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

                                        const protocolObservationMap = (trail.stabilityObservations || [])
                                            .filter(entry => entry.protocolRefId === protocol.id)
                                            .reduce((acc, entry) => {
                                                acc[getObservationKey(entry.conditionLabel, entry.intervalLabel)] = entry;
                                                return acc;
                                            }, {});

                                        return (
                                            <Card key={protocol.id} className="border">
                                                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <div className="fw-semibold">{protocol.protocolName}</div>
                                                        <div className="small text-muted">Batch: {linkedBatch?.batchName || `#${protocol.batchFormulaRefId}`}</div>
                                                    </div>
                                                    <Badge bg={protocol.status === 'PASSED' ? 'success' : protocol.status === 'FAILED' ? 'danger' : 'secondary'}>
                                                        {protocol.status || 'ACTIVE'}
                                                    </Badge>
                                                </Card.Header>
                                                <Card.Body className="p-0 d-flex flex-column gap-3">
                                                    {conditions.map((condition) => (
                                                        <div key={`${protocol.id}-${condition}`}>
                                                            <div className="px-3 pt-3 fw-semibold">{condition}</div>
                                                            <Table bordered responsive className="m-0 align-middle">
                                                                <thead className="bg-white text-muted">
                                                                    <tr>
                                                                        <th style={{ minWidth: 180 }}>Parameter</th>
                                                                        <th style={{ minWidth: 180 }}>Reference</th>
                                                                        {intervals.map(interval => {
                                                                            const observation = protocolObservationMap[getObservationKey(condition, interval)];
                                                                            const observedDateLabel = formatDate(observation?.observedOn);
                                                                            const initialObservation = Object.values(protocolObservationMap).find(item => {
                                                                                const sameCondition = `${item?.conditionLabel || ''}`.trim().toLowerCase() === `${condition}`.trim().toLowerCase();
                                                                                return sameCondition && isInitialIntervalLabel(item?.intervalLabel);
                                                                            });
                                                                            const dueDate = getIntervalDueDate(initialObservation?.observedOn, interval);
                                                                            const dueDateLabel = dueDate ? `Due: ${formatDate(dueDate)}` : '';
                                                                            return (
                                                                                <th key={`${protocol.id}-${condition}-${interval}`} className="text-center" style={{ minWidth: 140 }}>
                                                                                    <div>{interval}</div>
                                                                                    {observedDateLabel ? (
                                                                                        <div className="small text-muted">{observedDateLabel}</div>
                                                                                    ) : (
                                                                                        dueDateLabel && <div className="small text-muted">{dueDateLabel}</div>
                                                                                    )}
                                                                                </th>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {parameters.map(parameter => (
                                                                        <tr key={`${protocol.id}-${condition}-${parameter}`}>
                                                                            <td className="fw-medium">{parameter}</td>
                                                                            <td className="small text-muted">{getReferenceText(parameter) || '—'}</td>
                                                                            {intervals.map(interval => {
                                                                                const observation = protocolObservationMap[getObservationKey(condition, interval)];
                                                                                const measurements = observation ? parseMeasurements(observation.measurementsJson) : {};
                                                                                const parsedMeasurement = parseMeasurementDisplay(measurements[parameter]);
                                                                                const status = parsedMeasurement.status;
                                                                                const value = parsedMeasurement.value;

                                                                                return (
                                                                                    <td key={`${protocol.id}-${condition}-${interval}-${parameter}`} className="text-center">
                                                                                        <div className="d-inline-flex flex-column align-items-center">
                                                                                            {status === 'PASS' ? (
                                                                                                <MdCheckCircle size={18} className="text-success" />
                                                                                            ) : status === 'FAIL' ? (
                                                                                                <MdClose size={18} className="text-danger" />
                                                                                            ) : status === 'NA' ? (
                                                                                                <MdRemove size={18} className="text-secondary" />
                                                                                            ) : (
                                                                                                <span className="text-muted">—</span>
                                                                                            )}
                                                                                            {!!value && <span className="small text-muted mt-1">{value}</span>}
                                                                                        </div>
                                                                                    </td>
                                                                                );
                                                                            })}
                                                                        </tr>
                                                                    ))}
                                                                    {parameters.length === 0 && (
                                                                        <tr>
                                                                            <td colSpan={intervals.length + 2} className="text-center text-muted py-4">
                                                                                No parameters configured for this protocol.
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </Table>
                                                        </div>
                                                    ))}
                                                </Card.Body>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    {passedProtocols.length > 0 && (
                        <Card className="border-0 shadow-sm mt-4">
                            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                                <span className="fw-semibold">Master Formula Information</span>
                                <Button type="button"
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={handleExportPdf}
                                    disabled={exportBusy}
                                >
                                    {exportBusy ? 'Exporting...' : 'Export PDF'}
                                </Button>
                            </Card.Header>
                            <Card.Body className="d-flex flex-column gap-4">
                                {passedProtocols.map((protocol) => {
                                    const info = parseMasterFormulaInfo(protocol.masterFormulaInfoJson);
                                    const linkedBatch = (trail.batches || []).find(batch => batch.id === protocol.batchFormulaRefId);
                                    const formulaItems = resolveMfrIngredients(info.ingredients, linkedBatch, ingredientMaster);
                                    const totalPercent = formulaItems.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
                                    const procedure = proceduresByProtocolId[protocol.id];

                                    return (
                                        <Card key={`mfr-${protocol.id}`} className="border">
                                            <Card.Header className="bg-light">
                                                <div className="fw-semibold">{protocol.protocolName} - Master Formula Record</div>
                                                <div className="small text-muted">Batch: {linkedBatch?.batchName || `#${protocol.batchFormulaRefId}`}</div>
                                            </Card.Header>
                                            <Card.Body className="p-0">
                                                <Table bordered responsive className="m-0 align-middle">
                                                    <tbody>
                                                        <tr>
                                                            <th style={{ width: '18%' }}>Company Name</th>
                                                            <td style={{ width: '32%' }}>{info.companyName || '—'}</td>
                                                            <th style={{ width: '18%' }}>Date of Issue</th>
                                                            <td style={{ width: '32%' }}>{formatDate(info.dateOfIssue) || '—'}</td>
                                                        </tr>
                                                        <tr>
                                                            <th>Brand Name</th>
                                                            <td>{info.brandName || '—'}</td>
                                                            <th>Revision No.</th>
                                                            <td>{info.revisionNo || '—'}</td>
                                                        </tr>
                                                        <tr>
                                                            <th>Product Name</th>
                                                            <td>{info.productName || '—'}</td>
                                                            <th>Revision Date</th>
                                                            <td>{formatDate(info.revisionDate) || '—'}</td>
                                                        </tr>
                                                        <tr>
                                                            <th>Shelf Life</th>
                                                            <td>{info.shelfLife || '—'}</td>
                                                            <th>Issued By</th>
                                                            <td>{info.issuedBy || '—'}</td>
                                                        </tr>
                                                        <tr>
                                                            <th>MRF No.</th>
                                                            <td>{info.mrfNo || '—'}</td>
                                                            <th>Doc. No.</th>
                                                            <td>{info.docNo || '—'}</td>
                                                        </tr>
                                                    </tbody>
                                                </Table>

                                                <Table bordered responsive className="m-0 align-middle">
                                                    <thead className="bg-light text-muted">
                                                        <tr>
                                                            <th>Sr. No.</th>
                                                            <th>ERP Code</th>
                                                            <th>INCI</th>
                                                            <th>Percentage</th>
                                                            <th>Vendors</th>
                                                            <th>Function</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {formulaItems.map((item, index) => (
                                                            <tr key={`${protocol.id}-${index}`}>
                                                                <td>{item.srNo || index + 1}</td>
                                                                <td>{item.erpCode || '—'}</td>
                                                                <td>{item.inci || '—'}</td>
                                                                <td>{Number(item.percentage || 0).toFixed(2)}%</td>
                                                                <td>{item.vendor || item.vendors || '—'}</td>
                                                                <td>{item.function || '—'}</td>
                                                            </tr>
                                                        ))}
                                                        <tr>
                                                            <td colSpan={3}></td>
                                                            <td className="fw-semibold">Total: {totalPercent.toFixed(2)}%</td>
                                                            <td colSpan={2}></td>
                                                        </tr>
                                                    </tbody>
                                                </Table>

                                                <div className="p-3 border-top">
                                                    <div className="fw-semibold mb-2">Pre Manufacturing Instructions:</div>
                                                    <ol className="mb-0 ps-3">
                                                        {PRE_MANUFACTURING_INSTRUCTIONS.map((instruction, index) => (
                                                            <li key={`ins-${protocol.id}-${index}`} className="mb-1">{instruction}</li>
                                                        ))}
                                                    </ol>
                                                </div>

                                                {procedure && (
                                                    <div className="border-top">
                                                        <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-light">
                                                            <div className="fw-semibold">Procedure Format</div>
                                                            <Button type="button"
                                                                size="sm"
                                                                variant="outline-danger"
                                                                onClick={() => handleExportProcedurePdf(protocol, procedure)}
                                                                disabled={procedureExportBusyProtocolId === protocol.id}
                                                            >
                                                                {procedureExportBusyProtocolId === protocol.id ? 'Exporting...' : 'Export PDF'}
                                                            </Button>
                                                        </div>

                                                        <Table bordered responsive className="m-0 align-middle">
                                                            <tbody>
                                                                <tr>
                                                                    <th style={{ width: '18%' }}>Product Name</th>
                                                                    <td style={{ width: '32%' }}>{procedure.productName || '—'}</td>
                                                                    <th style={{ width: '18%' }}>Revision No.</th>
                                                                    <td style={{ width: '32%' }}>{procedure.revisionNo || '—'}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th>Brand Name</th>
                                                                    <td>{procedure.brandName || '—'}</td>
                                                                    <th>Revision Date</th>
                                                                    <td>{procedure.revisionDate || '—'}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th>MFR No.</th>
                                                                    <td>{procedure.mfrNo || '—'}</td>
                                                                    <th>Document No.</th>
                                                                    <td>{procedure.documentNo || '—'}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th>Batch No.</th>
                                                                    <td>{procedure.batchNo || '—'}</td>
                                                                    <th>Shelf life</th>
                                                                    <td>{procedure.shelfLife || '—'}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th>Batch size</th>
                                                                    <td>{procedure.batchSize || '—'}</td>
                                                                    <th>Mixer Capacity</th>
                                                                    <td>{procedure.mixerCapacity || '—'}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th>Mfg date</th>
                                                                    <td>{procedure.mfgDate || '—'}</td>
                                                                    <th>Date of completion</th>
                                                                    <td>{procedure.dateOfCompletion || '—'}</td>
                                                                </tr>
                                                            </tbody>
                                                        </Table>

                                                        <Table bordered responsive className="m-0 align-middle">
                                                            <thead className="bg-light text-muted">
                                                                <tr>
                                                                    <th style={{ minWidth: 80 }}>Step No</th>
                                                                    <th style={{ minWidth: 220 }}>Description of Process</th>
                                                                    <th style={{ minWidth: 210 }}>Name of Material</th>
                                                                    <th style={{ minWidth: 160 }}>Formula quantity for 100 kg</th>
                                                                    <th style={{ minWidth: 130 }}>Actual Qty</th>
                                                                    <th style={{ minWidth: 130 }}>Standard Time</th>
                                                                    <th style={{ minWidth: 110 }}>RPM</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {appendCommonProcedureTailSections(procedure.sections || []).length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan={7} className="text-center text-muted py-3">
                                                                            No procedure sections available.
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    appendCommonProcedureTailSections(procedure.sections || []).map((section) => {
                                                                        if (section.isFixedCommonTail) {
                                                                            return (
                                                                                <tr key={`${section.id}`}>
                                                                                    <td className="text-center align-middle fw-semibold">{section.stepNo || '—'}</td>
                                                                                    <td colSpan={6} className="align-middle fw-semibold">{section.descriptionOfProcess || '—'}</td>
                                                                                </tr>
                                                                            );
                                                                        }

                                                                        const rows = (section.rows && section.rows.length)
                                                                            ? section.rows
                                                                            : [{ id: `empty-${section.id}`, nameOfMaterial: '', formulaQtyPer100Kg: '', actualQty: '', standardTime: '', rpm: '' }];

                                                                        return rows.map((row, index) => (
                                                                            <tr key={`${section.id}-${row.id || index}`}>
                                                                                {index === 0 && (
                                                                                    <>
                                                                                        <td rowSpan={rows.length} className="text-center align-middle fw-semibold">
                                                                                            {section.stepNo || '—'}
                                                                                        </td>
                                                                                        <td rowSpan={rows.length} className="align-middle">
                                                                                            {section.descriptionOfProcess || '—'}
                                                                                        </td>
                                                                                    </>
                                                                                )}

                                                                                <td>{row.nameOfMaterial || '—'}</td>
                                                                                <td>{row.formulaQtyPer100Kg || '—'}</td>
                                                                                <td>{row.actualQty || '—'}</td>

                                                                                {index === 0 && (
                                                                                    <>
                                                                                        <td rowSpan={rows.length} className="text-center align-middle">
                                                                                            {row.standardTime || '—'}
                                                                                        </td>
                                                                                        <td rowSpan={rows.length} className="text-center align-middle">
                                                                                            {row.rpm || '—'}
                                                                                        </td>
                                                                                    </>
                                                                                )}
                                                                            </tr>
                                                                        ));
                                                                    })
                                                                )}
                                                            </tbody>
                                                        </Table>
                                                    </div>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    );
                                })}
                            </Card.Body>
                        </Card>
                    )}
                </>
            ) : null}

            <AppDialog
                show={dialogInfo.show}
                title={dialogInfo.title}
                message={dialogInfo.message}
                confirmText="OK"
                confirmVariant="primary"
                onClose={() => setDialogInfo({ show: false, title: '', message: '' })}
            />

        </Container>
    );
};

export default AuditTrailPage;
