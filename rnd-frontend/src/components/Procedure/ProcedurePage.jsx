import { useEffect, useState, useCallback } from 'react';
import {
    Container, Card, Row, Col, Spinner, Button, Badge,
    Table, Form, Accordion
} from 'react-bootstrap';
import { MdAdd, MdDelete, MdEdit, MdCheck, MdClose, MdExpandMore } from 'react-icons/md';
import { procedureService } from '../../services/procedure.service';
import AppDialog from '../Common/AppDialog';
import { parseMasterFormulaInfo, formatDate } from '../Audit/auditTrailUtils';
import { appendCommonProcedureTailSections } from './procedureCommonSteps';

// ── Inline-editable cell ────────────────────────────────────────────────────

const EditableCell = ({ value, onChange, placeholder = '', className = '', multiline = false, rows = 1 }) => (
    <Form.Control
        as={multiline ? 'textarea' : 'input'}
        rows={multiline ? rows : undefined}
        size="sm"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`border-0 bg-transparent p-1 ${className}`}
        style={{ minWidth: 80, resize: multiline ? 'vertical' : 'none' }}
    />
);

// ── Main page ────────────────────────────────────────────────────────────────

const ProcedurePage = () => {
    const [passedProjects, setPassedProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Selected project / protocol
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedSummary, setSelectedSummary] = useState(null); // PassedProtocolSummary

    // Procedure file state
    const [procedure, setProcedure] = useState(null);   // ProcedureFileResponse | null
    const [showForm, setShowForm] = useState(false);     // whether to show the editable form

    // Header form (used both for create and edit)
    const [header, setHeader] = useState(defaultHeader());

    const [saving, setSaving] = useState(false);
    const [dialog, setDialog] = useState({ show: false, title: '', message: '' });

    // ── Load passed projects ─────────────────────────────────────────────────

    useEffect(() => {
        loadPassedProjects();
    }, []);

    const loadPassedProjects = async () => {
        setLoading(true);
        try {
            const data = await procedureService.getPassedProjects();
            setPassedProjects(Array.isArray(data) ? data : []);
        } catch (err) {
            setDialog({ show: true, title: 'Error', message: err.message || 'Failed to load projects.' });
        } finally {
            setLoading(false);
        }
    };

    // ── Select project & protocol ────────────────────────────────────────────

    const handleSelectSummary = useCallback(async (project, summary) => {
        setSelectedProject(project);
        setSelectedSummary(summary);
        setProcedure(null);
        setShowForm(false);

        if (summary.existingProcedureFileId) {
            try {
                const data = await procedureService.getById(summary.existingProcedureFileId);
                setProcedure(data);
                setHeader(headerFromResponse(data));
                setShowForm(true);
            } catch {
                // no existing procedure yet
            }
        } else {
            // Pre-fill header from MFR JSON
            const info = parseMasterFormulaInfo(summary.protocol?.masterFormulaInfoJson);
            const batch = summary.linkedBatch;
            setHeader({
                productName: info.productName || '',
                brandName: info.brandName || '',
                mfrNo: info.mrfNo || '',
                batchNo: batch?.batchName || '',
                batchSize: batch?.targetBatchSize ? `${batch.targetBatchSize} Kg` : '',
                mfgDate: '',
                dateOfCompletion: '',
                revisionNo: info.revisionNo || '',
                revisionDate: info.revisionDate ? formatDate(info.revisionDate) : '',
                documentNo: info.docNo || '',
                shelfLife: info.shelfLife || '',
                mixerCapacity: '',
            });
        }
    }, []);

    // ── Create procedure ─────────────────────────────────────────────────────

    const handleCreateProcedure = async () => {
        if (!selectedProject || !selectedSummary) return;
        setSaving(true);
        try {
            const payload = {
                projectRefId: selectedProject.id,
                protocolRefId: selectedSummary.protocol.id,
                ...header,
            };
            const created = await procedureService.create(payload);
            setProcedure(created);
            setShowForm(true);
            // Refresh passed projects so existingProcedureFileId is set
            loadPassedProjects();
        } catch (err) {
            setDialog({ show: true, title: 'Error', message: err.message || 'Failed to create procedure.' });
        } finally {
            setSaving(false);
        }
    };

    // ── Save procedure format edits ──────────────────────────────────────────

    const handleSectionDescriptionChange = (sectionId, value) => {
        updateSectionInState(sectionId, (section) => ({
            ...section,
            descriptionOfProcess: value,
        }));
    };

    const handleSaveHeader = async () => {
        if (!procedure) return;
        setSaving(true);
        try {
            // Persist all section descriptions and rows first.
            for (const section of (procedure.sections || [])) {
                await procedureService.updateSection(procedure.id, section.id, {
                    descriptionOfProcess: section.descriptionOfProcess || '',
                });

                for (const row of (section.rows || [])) {
                    await procedureService.updateRow(procedure.id, section.id, row.id, {
                        nameOfMaterial: row.nameOfMaterial,
                        formulaQtyPer100Kg: row.formulaQtyPer100Kg,
                        actualQty: row.actualQty,
                        standardTime: row.standardTime,
                        rpm: row.rpm,
                    });
                }
            }

            // Persist header values.
            const updated = await procedureService.update(procedure.id, {
                projectRefId: procedure.projectRefId,
                protocolRefId: procedure.protocolRefId,
                ...header,
            });

            // Refresh from backend so UI always reflects saved state.
            const refreshed = await procedureService.getById(updated?.id || procedure.id);
            setProcedure(refreshed);
            setHeader(headerFromResponse(refreshed));
        } catch (err) {
            setDialog({ show: true, title: 'Error', message: err.message || 'Failed to update procedure format.' });
        } finally {
            setSaving(false);
        }
    };

    // ── Section CRUD ─────────────────────────────────────────────────────────

    const handleAddSection = async () => {
        if (!procedure) return;
        try {
            const section = await procedureService.addSection(procedure.id, { descriptionOfProcess: '' });
            setProcedure(prev => ({
                ...prev,
                sections: [...(prev.sections || []), { ...section, rows: [] }],
            }));
        } catch (err) {
            setDialog({ show: true, title: 'Error', message: err.message || 'Failed to add section.' });
        }
    };

    const handleSectionDescriptionBlur = async (section, value) => {
        if (!procedure) return;
        try {
            await procedureService.updateSection(procedure.id, section.id, {
                descriptionOfProcess: value,
            });
        } catch {
            // silent: optimistic update already in state
        }
    };

    const handleDeleteSection = async (sectionId) => {
        if (!procedure) return;
        try {
            await procedureService.deleteSection(procedure.id, sectionId);
            setProcedure(prev => ({
                ...prev,
                sections: (prev.sections || []).filter(s => s.id !== sectionId),
            }));
        } catch (err) {
            setDialog({ show: true, title: 'Error', message: err.message || 'Failed to delete section.' });
        }
    };

    const updateSectionInState = (sectionId, updater) => {
        setProcedure(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === sectionId ? updater(s) : s),
        }));
    };

    // ── Row CRUD ─────────────────────────────────────────────────────────────

    const handleAddRow = async (sectionId) => {
        if (!procedure) return;
        try {
            const section = (procedure.sections || []).find(s => s.id === sectionId);
            const seedRow = section?.rows?.[0] || {};
            const row = await procedureService.addRow(procedure.id, sectionId, {
                nameOfMaterial: '',
                formulaQtyPer100Kg: '',
                actualQty: '',
                standardTime: seedRow.standardTime || '',
                rpm: seedRow.rpm || '',
            });
            updateSectionInState(sectionId, s => ({ ...s, rows: [...(s.rows || []), row] }));
        } catch (err) {
            setDialog({ show: true, title: 'Error', message: err.message || 'Failed to add row.' });
        }
    };

    const handleRowCellBlur = async (sectionId, row) => {
        if (!procedure) return;
        try {
            await procedureService.updateRow(procedure.id, sectionId, row.id, {
                nameOfMaterial: row.nameOfMaterial,
                formulaQtyPer100Kg: row.formulaQtyPer100Kg,
                actualQty: row.actualQty,
                standardTime: row.standardTime,
                rpm: row.rpm,
            });
        } catch {
            // silent: optimistic update handled via state
        }
    };

    const handleDeleteRow = async (sectionId, rowId) => {
        if (!procedure) return;
        try {
            await procedureService.deleteRow(procedure.id, sectionId, rowId);
            updateSectionInState(sectionId, s => ({
                ...s,
                rows: s.rows.filter(r => r.id !== rowId),
            }));
        } catch (err) {
            setDialog({ show: true, title: 'Error', message: err.message || 'Failed to delete row.' });
        }
    };

    const handleRowChange = (sectionId, rowId, field, value) => {
        updateSectionInState(sectionId, s => {
            // Standard Time and RPM are shared by the section and rendered once.
            if (field === 'standardTime' || field === 'rpm') {
                return {
                    ...s,
                    rows: s.rows.map(r => ({ ...r, [field]: value })),
                };
            }

            return {
                ...s,
                rows: s.rows.map(r => r.id === rowId ? { ...r, [field]: value } : r),
            };
        });
    };

    const handleBackToProjects = () => {
        setSelectedProject(null);
        setSelectedSummary(null);
        setProcedure(null);
        setShowForm(false);
        setHeader(defaultHeader());
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <Container fluid className="p-4">
            <h2 className="fw-bold mb-4">Create Procedure File</h2>

            {loading ? (
                <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
            ) : (
                !selectedSummary ? (
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white fw-semibold">
                            Projects with Passed Stability
                        </Card.Header>
                        <Card.Body className="p-0">
                            {passedProjects.length === 0 ? (
                                <p className="text-muted p-3 mb-0">No projects with passed stability found.</p>
                            ) : (
                                <Accordion flush>
                                    {passedProjects.map(({ project, passedProtocols: protocols }) => (
                                        <Accordion.Item key={project.id} eventKey={String(project.id)}>
                                            <Accordion.Header>
                                                <div>
                                                    <div className="fw-semibold">{project.projectName || project.projectId}</div>
                                                    <div className="small text-muted">{project.projectId}</div>
                                                </div>
                                            </Accordion.Header>
                                            <Accordion.Body className="p-0">
                                                {protocols.map(summary => (
                                                    <button type="button"
                                                        key={summary.protocol.id}
                                                        onClick={() => handleSelectSummary(project, summary)}
                                                        className="w-100 text-start border-0 px-3 py-2 protocol-item bg-white"
                                                        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                                                    >
                                                        <div className="small fw-semibold">{summary.protocol.protocolName}</div>
                                                        <div className="d-flex align-items-center gap-2 mt-1">
                                                            <Badge bg="success" style={{ fontSize: '0.65rem' }}>PASSED</Badge>
                                                            {summary.existingProcedureFileId && (
                                                                <Badge bg="secondary" style={{ fontSize: '0.65rem' }}>Has Procedure</Badge>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </Accordion.Body>
                                        </Accordion.Item>
                                    ))}
                                </Accordion>
                            )}
                        </Card.Body>
                    </Card>
                ) : (
                    <div className="d-flex flex-column gap-4">
                        <div>
                            <Button type="button" variant="outline-secondary" size="sm" onClick={handleBackToProjects}>
                                Back to Projects
                            </Button>
                            <div className="small text-muted mt-2">
                                {selectedProject?.projectName || selectedProject?.projectId} ({selectedProject?.projectId})
                            </div>
                        </div>

                        <MfrInfoCard
                            protocol={selectedSummary.protocol}
                            linkedBatch={selectedSummary.linkedBatch}
                        />

                        {!showForm && (
                            <div className="d-flex justify-content-end">
                                <Button type="button"
                                    variant="danger"
                                    onClick={handleCreateProcedure}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving…' : 'Add Procedure Format'}
                                </Button>
                            </div>
                        )}

                        {showForm && procedure && (
                            <ProcedureForm
                                procedure={procedure}
                                header={header}
                                setHeader={setHeader}
                                saving={saving}
                                onSaveHeader={handleSaveHeader}
                                onAddSection={handleAddSection}
                                onSectionDescriptionChange={handleSectionDescriptionChange}
                                onSectionDescriptionBlur={handleSectionDescriptionBlur}
                                onAddRow={handleAddRow}
                                onRowChange={handleRowChange}
                                onRowBlur={handleRowCellBlur}
                                onDeleteRow={handleDeleteRow}
                                onDeleteSection={handleDeleteSection}
                            />
                        )}
                    </div>
                )
            )}

            <AppDialog
                show={dialog.show}
                title={dialog.title}
                message={dialog.message}
                onClose={() => setDialog({ show: false, title: '', message: '' })}
            />
        </Container>
    );
};

// ── MFR Info Card ─────────────────────────────────────────────────────────────

const MfrInfoCard = ({ protocol, linkedBatch }) => {
    const info = parseMasterFormulaInfo(protocol?.masterFormulaInfoJson);
    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-semibold d-flex justify-content-between align-items-center">
                <span>{protocol?.protocolName} — Master Formula Record</span>
                <Badge bg="success">PASSED</Badge>
            </Card.Header>
            <Card.Body>
                <Row className="g-2">
                    <InfoItem label="Product Name" value={info.productName} />
                    <InfoItem label="Brand Name" value={info.brandName} />
                    <InfoItem label="MFR No." value={info.mrfNo} />
                    <InfoItem label="Batch" value={linkedBatch?.batchName} />
                    <InfoItem label="Batch Size" value={linkedBatch?.targetBatchSize ? `${linkedBatch.targetBatchSize} Kg` : undefined} />
                    <InfoItem label="Revision No." value={info.revisionNo} />
                    <InfoItem label="Revision Date" value={info.revisionDate ? formatDate(info.revisionDate) : undefined} />
                    <InfoItem label="Document No." value={info.docNo} />
                    <InfoItem label="Shelf Life" value={info.shelfLife} />
                </Row>
            </Card.Body>
        </Card>
    );
};

const InfoItem = ({ label, value }) => (
    <Col md={4}>
        <div className="small text-muted">{label}</div>
        <div className="fw-semibold">{value || '—'}</div>
    </Col>
);

// ── Procedure Form ────────────────────────────────────────────────────────────

const ProcedureForm = ({
    procedure, header, setHeader, saving,
    onSaveHeader, onAddSection, onSectionDescriptionChange, onSectionDescriptionBlur,
    onAddRow, onRowChange, onRowBlur, onDeleteRow, onDeleteSection,
}) => {
    const setH = (field) => (value) => setHeader(prev => ({ ...prev, [field]: value }));

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <span className="fw-semibold">Batch Manufacturing Procedure</span>
                <Button type="button" size="sm" variant="outline-danger" onClick={onSaveHeader} disabled={saving}>
                    {saving ? 'Updating…' : 'Update Procedure Format'}
                </Button>
            </Card.Header>
            <Card.Body className="p-0">
                <div className="p-3">
                    {/* ── Header two-column layout ── */}
                    <div className="border rounded overflow-hidden mb-4">
                        <Row className="g-0">
                            {/* Left column */}
                            <Col md={6} className="border-end">
                                <HeaderRow label="Product Name" value={header.productName} onChange={setH('productName')} />
                                <HeaderRow label="Brand Name" value={header.brandName} onChange={setH('brandName')} />
                                <HeaderRow label="MFR No." value={header.mfrNo} onChange={setH('mfrNo')} />
                                <HeaderRow label="Batch No." value={header.batchNo} onChange={setH('batchNo')} />
                                <HeaderRow label="Batch size" value={header.batchSize} onChange={setH('batchSize')} />
                                <HeaderRow label="Mfg date" value={header.mfgDate} onChange={setH('mfgDate')} />
                                <HeaderRow label="Date of completion" value={header.dateOfCompletion} onChange={setH('dateOfCompletion')} />
                            </Col>
                            {/* Right column */}
                            <Col md={6}>
                                <HeaderRow label="Revision No." value={header.revisionNo} onChange={setH('revisionNo')} />
                                <HeaderRow label="Revision Date" value={header.revisionDate} onChange={setH('revisionDate')} />
                                <HeaderRow label="Document No." value={header.documentNo} onChange={setH('documentNo')} />
                                <HeaderRow label="Shelf life" value={header.shelfLife} onChange={setH('shelfLife')} />
                                <HeaderRow label="Mixer Capacity" value={header.mixerCapacity} onChange={setH('mixerCapacity')} />
                            </Col>
                        </Row>
                    </div>

                    {/* ── Main procedure table ── */}
                    <div className="table-responsive border rounded">
                        <Table bordered className="mb-0 procedure-table" style={{ tableLayout: 'fixed', minWidth: 980 }}>
                            <colgroup>
                                <col style={{ width: 64 }} />
                                <col style={{ width: 180 }} />
                                <col style={{ width: 180 }} />
                                <col style={{ width: 130 }} />
                                <col style={{ width: 110 }} />
                                <col style={{ width: 110 }} />
                                <col style={{ width: 90 }} />
                                <col style={{ width: 52 }} />
                            </colgroup>
                            <thead className="table-light">
                                <tr className="text-center align-middle fw-semibold" style={{ fontSize: 13 }}>
                                    <th>Step No</th>
                                    <th>Description of Process</th>
                                    <th>Name of Material</th>
                                    <th>Formula quantity for 100 kg</th>
                                    <th>Actual Qty</th>
                                    <th>Standard Time</th>
                                    <th>RPM</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {appendCommonProcedureTailSections(procedure.sections || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center text-muted py-4">
                                            No sections yet. Click &ldquo;Add Section&rdquo; to begin.
                                        </td>
                                    </tr>
                                ) : (
                                    appendCommonProcedureTailSections(procedure.sections || []).map(section => (
                                        <SectionRows
                                            key={section.id}
                                            section={section}
                        onDescriptionChange={onSectionDescriptionChange}
                            onDescriptionBlur={onSectionDescriptionBlur}
                            onAddRow={onAddRow}
                            onRowChange={onRowChange}
                            onRowBlur={onRowBlur}
                            onDeleteRow={onDeleteRow}
                            onDeleteSection={onDeleteSection}
                                        />
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {/* ── Add Section button ── */}
                    <div className="d-flex justify-content-start mt-3">
                        <Button type="button" variant="outline-secondary" size="sm" onClick={onAddSection}>
                            <MdAdd className="me-1" />
                            Add Section
                        </Button>
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
};

// ── Header row helper ─────────────────────────────────────────────────────────

const HeaderRow = ({ label, value, onChange }) => (
    <div className="d-flex align-items-center border-bottom px-3 py-2" style={{ minHeight: 38 }}>
        <span className="fw-semibold text-nowrap me-2" style={{ minWidth: 130, fontSize: 13 }}>{label}:</span>
        <Form.Control
            size="sm"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="border-0 bg-transparent p-0 flex-grow-1"
            style={{ fontSize: 13 }}
        />
    </div>
);

// ── Section rows component ────────────────────────────────────────────────────

const SectionRows = ({
    section, onDescriptionChange, onDescriptionBlur,
    onAddRow, onRowChange, onRowBlur, onDeleteRow, onDeleteSection,
}) => {
    const [desc, setDesc] = useState(section.descriptionOfProcess || '');

    useEffect(() => {
        setDesc(section.descriptionOfProcess || '');
    }, [section.id, section.descriptionOfProcess]);

    if (section.isFixedCommonTail) {
        return (
            <tr>
                <td className="text-center align-middle fw-bold" style={{ background: '#fafafa' }}>
                    {section.stepNo}
                </td>
                <td colSpan={7} className="align-middle fw-semibold" style={{ fontSize: 13 }}>
                    {section.descriptionOfProcess}
                </td>
            </tr>
        );
    }

    const rows = section.rows || [];
    const rowCount = Math.max(rows.length, 1);

    const isBlank = (value) => `${value || ''}`.trim() === '';
    const isSectionEmpty = isBlank(desc)
        && rows.every((row) => (
            isBlank(row.nameOfMaterial)
            && isBlank(row.formulaQtyPer100Kg)
            && isBlank(row.actualQty)
            && isBlank(row.standardTime)
            && isBlank(row.rpm)
        ));

    return (
        <>
            {rows.length === 0 ? (
                <tr>
                    <td rowSpan={1} className="text-center align-middle fw-bold" style={{ background: '#fafafa' }}>
                        {section.stepNo}
                    </td>
                    <td className="align-middle">
                        <Form.Control
                            as="textarea"
                            rows={2}
                            size="sm"
                            value={desc}
                            onChange={(e) => {
                                const next = e.target.value;
                                setDesc(next);
                                onDescriptionChange(section.id, next);
                            }}
                            onBlur={() => onDescriptionBlur(section, desc)}
                            className="border-0 bg-transparent p-1"
                            placeholder="Description…"
                            style={{ resize: 'vertical', fontSize: 12 }}
                        />
                    </td>
                    <td colSpan={5} className="text-center text-muted align-middle" style={{ fontSize: 12 }}>
                        <Button type="button" variant="link" size="sm" className="p-0 text-secondary" onClick={() => onAddRow(section.id)}>
                            <MdAdd size={16} className="me-1" />Add Row
                        </Button>
                    </td>
                    <td className="text-center align-middle">
                        <Button type="button"
                            variant="link"
                            size="sm"
                            className="p-0 text-danger"
                            title={isSectionEmpty ? 'Delete section' : 'Section can be deleted only when all fields are empty'}
                            onClick={() => onDeleteSection(section.id)}
                            disabled={!isSectionEmpty}
                        >
                            <MdDelete size={16} />
                        </Button>
                    </td>
                </tr>
            ) : (
                rows.map((row, rowIndex) => (
                    <tr key={row.id}>
                        {rowIndex === 0 && (
                            <>
                                <td
                                    rowSpan={rowCount}
                                    className="text-center align-middle fw-bold"
                                    style={{ background: '#fafafa' }}
                                >
                                    {section.stepNo}
                                </td>
                                <td rowSpan={rowCount} className="align-middle p-1">
                                    <Form.Control
                                        as="textarea"
                                        rows={Math.max(rowCount, 2)}
                                        size="sm"
                                        value={desc}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setDesc(next);
                                            onDescriptionChange(section.id, next);
                                        }}
                                        onBlur={() => onDescriptionBlur(section, desc)}
                                        className="border-0 bg-transparent p-1"
                                        placeholder="Description…"
                                        style={{ resize: 'vertical', fontSize: 12 }}
                                    />
                                </td>
                            </>
                        )}

                        {/* Name of Material */}
                        <td className="p-1">
                            <EditableCell
                                value={row.nameOfMaterial}
                                onChange={(v) => onRowChange(section.id, row.id, 'nameOfMaterial', v)}
                                placeholder="Material name"
                                multiline
                                rows={2}
                            />
                        </td>
                        {/* Formula Qty */}
                        <td className="p-1 text-center">
                            <EditableCell
                                value={row.formulaQtyPer100Kg}
                                onChange={(v) => onRowChange(section.id, row.id, 'formulaQtyPer100Kg', v)}
                                placeholder="Qty"
                                className="text-center"
                            />
                        </td>
                        {/* Actual Qty */}
                        <td className="p-1 text-center">
                            <EditableCell
                                value={row.actualQty}
                                onChange={(v) => onRowChange(section.id, row.id, 'actualQty', v)}
                                placeholder="Actual"
                                className="text-center"
                            />
                        </td>
                        {/* Standard Time and RPM remain shared per section */}
                        {rowIndex === 0 && (
                            <>
                                <td rowSpan={rowCount} className="p-1 text-center align-middle">
                                    <EditableCell
                                        value={row.standardTime}
                                        onChange={(v) => onRowChange(section.id, row.id, 'standardTime', v)}
                                        placeholder="Time"
                                        className="text-center"
                                    />
                                </td>
                                <td rowSpan={rowCount} className="p-1 text-center align-middle">
                                    <EditableCell
                                        value={row.rpm}
                                        onChange={(v) => onRowChange(section.id, row.id, 'rpm', v)}
                                        placeholder="RPM"
                                        className="text-center"
                                    />
                                </td>
                            </>
                        )}

                        {/* Actions */}
                        <td className="text-center align-middle p-1">
                            {rowIndex === rows.length - 1 ? (
                                <div className="d-flex flex-column gap-1 align-items-center">
                                    <Button type="button"
                                        variant="link" size="sm"
                                        className="p-0 text-secondary"
                                        title="Add row"
                                        onClick={() => {
                                            onRowBlur(section.id, row);
                                            onAddRow(section.id);
                                        }}
                                    >
                                        <MdAdd size={16} />
                                    </Button>
                                    <Button type="button"
                                        variant="link" size="sm"
                                        className="p-0 text-danger"
                                        title="Delete row"
                                        onClick={() => onDeleteRow(section.id, row.id)}
                                    >
                                        <MdDelete size={16} />
                                    </Button>
                                    <Button type="button"
                                        variant="link"
                                        size="sm"
                                        className="p-0 text-danger"
                                        title={isSectionEmpty ? 'Delete section' : 'Section can be deleted only when all fields are empty'}
                                        onClick={() => onDeleteSection(section.id)}
                                        disabled={!isSectionEmpty}
                                        style={{ fontSize: 10 }}
                                    >
                                        <MdDelete size={12} /> Sec
                                    </Button>
                                </div>
                            ) : (
                                <Button type="button"
                                    variant="link" size="sm"
                                    className="p-0 text-danger"
                                    title="Delete row"
                                    onClick={() => onDeleteRow(section.id, row.id)}
                                >
                                    <MdDelete size={16} />
                                </Button>
                            )}
                        </td>
                    </tr>
                ))
            )}
        </>
    );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultHeader() {
    return {
        productName: '',
        brandName: '',
        mfrNo: '',
        batchNo: '',
        batchSize: '',
        mfgDate: '',
        dateOfCompletion: '',
        revisionNo: '',
        revisionDate: '',
        documentNo: '',
        shelfLife: '',
        mixerCapacity: '',
    };
}

function headerFromResponse(data) {
    return {
        productName: data.productName || '',
        brandName: data.brandName || '',
        mfrNo: data.mfrNo || '',
        batchNo: data.batchNo || '',
        batchSize: data.batchSize || '',
        mfgDate: data.mfgDate || '',
        dateOfCompletion: data.dateOfCompletion || '',
        revisionNo: data.revisionNo || '',
        revisionDate: data.revisionDate || '',
        documentNo: data.documentNo || '',
        shelfLife: data.shelfLife || '',
        mixerCapacity: data.mixerCapacity || '',
    };
}

export default ProcedurePage;
