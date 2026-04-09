import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Badge, InputGroup } from 'react-bootstrap';
import { MdAdd, MdDelete, MdEdit, MdCheck, MdClose } from 'react-icons/md';
import { equipmentService } from '../../../services/equipment.service';
import { calibrationService } from '../../../services/calibration.service';
import { authService } from '../../../services/auth.service';
import AppDialog from '../../Common/AppDialog';

const CalibrationModal = ({ show, handleClose, selectedEquipment, onCalibrationComplete }) => {
    const [readings, setReadings] = useState({});
    const [note, setNote] = useState('');
    const [validationResult, setValidationResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [dialogInfo, setDialogInfo] = useState({ show: false, title: '', message: '' });
    const currentUser = authService.getCurrentUser();
    const isAdmin = currentUser?.role === 'HEAD' || currentUser?.role === 'MANAGER';

    // Template Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [templateDraft, setTemplateDraft] = useState({
        expectedValues: [],
        errorMargin: 0,
        unit: ''
    });

    useEffect(() => {
        if (show && selectedEquipment) {
            setReadings({});
            setNote('');
            setValidationResult(null);
            setErrorMsg('');
            setIsEditMode(false);

            if (selectedEquipment.calibrationTemplate) {
                setTemplateDraft({ ...selectedEquipment.calibrationTemplate });
            } else {
                setTemplateDraft({ expectedValues: [], errorMargin: 0, unit: '' });
            }
        }
    }, [show, selectedEquipment]);

    const handleReadingChange = (index, value) => {
        setReadings(prev => ({ ...prev, [index]: value }));
    };

    const validateReadings = () => {
        if (!selectedEquipment || !selectedEquipment.calibrationTemplate) return;
        const template = selectedEquipment.calibrationTemplate;
        let isPass = true;
        for (let i = 0; i < template.expectedValues.length; i++) {
            const expected = parseFloat(template.expectedValues[i]);
            const actual = parseFloat(readings[i]);
            if (isNaN(actual) || Math.abs(expected - actual) > template.errorMargin) {
                isPass = false;
                break;
            }
        }
        setValidationResult(isPass ? 'Pass' : 'Fail');
        return isPass;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!selectedEquipment.calibrationTemplate || selectedEquipment.calibrationTemplate.expectedValues.length === 0) {
            setErrorMsg('Please configure a calibration template before calibrating.');
            return;
        }

        if (!currentUser?.name) {
            setErrorMsg('Could not identify the current user. Please re-login.');
            return;
        }

        setSubmitting(true);
        const isPass = validateReadings();
        const resultStatus = isPass ? 'Pass' : 'Fail';
        const template = selectedEquipment.calibrationTemplate;

        // Build structured readings array for the log
        const structuredReadings = template.expectedValues.map((expected, i) => ({
            expected: parseFloat(expected),
            actual: parseFloat(readings[i]) || null,
            unit: template.unit
        }));

        try {
            // 1. Log calibration record
            await calibrationService.create({
                equipmentId: selectedEquipment.id,
                machineId: selectedEquipment.machineId,
                instrumentType: selectedEquipment.instrumentType,
                date: new Date().toISOString().split('T')[0],
                status: resultStatus,
                readings: JSON.stringify(structuredReadings),
                doneBy: currentUser?.name || 'Unknown',
                note: note.trim() || null
            });

            // Equipment status and dates are now automatically and securely updated 
            // by CalibrationRecordService on the backend based on instrument frequency.

            handleClose();
            if (onCalibrationComplete) onCalibrationComplete();
            setDialogInfo({
                show: true,
                title: isPass ? 'Calibration Successful' : 'Calibration Failed',
                message: isPass
                    ? 'Calibration completed successfully and record has been saved.'
                    : 'Calibration failed, but the record has been saved for tracking.'
            });
        } catch {
            setErrorMsg('Failed to submit calibration record. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // --- Template Editing Functions ---
    const toggleEditMode = () => {
        if (!isAdmin) return;
        setIsEditMode(!isEditMode);
        if (isEditMode && selectedEquipment.calibrationTemplate) {
            setTemplateDraft({ ...selectedEquipment.calibrationTemplate });
        }
        setErrorMsg('');
    };

    const handleTemplateChange = (field, value) => {
        setTemplateDraft(prev => ({ ...prev, [field]: value }));
    };

    const handleExpectedValueChange = (index, value) => {
        const newValues = [...templateDraft.expectedValues];
        newValues[index] = value;
        setTemplateDraft(prev => ({ ...prev, expectedValues: newValues }));
    };

    const addExpectedValue = () => {
        setTemplateDraft(prev => ({ ...prev, expectedValues: [...prev.expectedValues, ''] }));
    };

    const removeExpectedValue = (index) => {
        const newValues = [...templateDraft.expectedValues];
        newValues.splice(index, 1);
        setTemplateDraft(prev => ({ ...prev, expectedValues: newValues }));
    };

    const saveTemplate = async () => {
        if (templateDraft.expectedValues.length === 0) {
            setErrorMsg('Template must have at least one expected value.');
            return;
        }
        const cleanedValues = templateDraft.expectedValues
            .filter(v => v !== '')
            .map(v => parseFloat(v));

        const finalTemplate = {
            ...templateDraft,
            expectedValues: cleanedValues,
            errorMargin: parseFloat(templateDraft.errorMargin) || 0
        };

        try {
            await equipmentService.update(selectedEquipment.id, {
                ...selectedEquipment,
                calibrationTemplate: finalTemplate
            });
            selectedEquipment.calibrationTemplate = finalTemplate;
            setIsEditMode(false);
            setReadings({});
            setValidationResult(null);
            setDialogInfo({
                show: true,
                title: 'Template Saved',
                message: 'Calibration template saved successfully.'
            });
        } catch {
            setErrorMsg('Failed to save template.');
        }
    };

    if (!selectedEquipment) return null;

    const template = selectedEquipment.calibrationTemplate;
    const hasTemplate = template && template.expectedValues && template.expectedValues.length > 0;

    return (
        <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
            <Modal.Header closeButton>
                <Modal.Title>Calibrate {selectedEquipment.machineId}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={isEditMode ? (e) => { e.preventDefault(); saveTemplate(); } : handleSubmit}>
                <Modal.Body>
                    <div className="mb-3 border-bottom pb-2 d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Instrument:</strong> {selectedEquipment.name} <Badge bg="secondary" className="ms-1">{selectedEquipment.instrumentType}</Badge>
                        </div>
                        {isAdmin && (
                            <Button type="button"
                                variant={isEditMode ? "secondary" : "outline-primary"}
                                size="sm"
                                onClick={toggleEditMode}
                            >
                                {isEditMode ? <><MdClose /> Cancel Edit</> : <><MdEdit /> Edit Template</>}
                            </Button>
                        )}
                    </div>

                    {errorMsg && <Alert variant="danger" className="py-2">{errorMsg}</Alert>}

                    {isEditMode ? (
                        <div className="bg-light p-3 rounded border">
                            <h6 className="fw-bold mb-3">Configure Template</h6>
                            <Row className="mb-3">
                                <Col sm="6">
                                    <Form.Label className="small">Margin of Error (+/-)</Form.Label>
                                    <Form.Control
                                        type="number" step="0.01" min="0"
                                        value={templateDraft.errorMargin}
                                        onChange={(e) => handleTemplateChange('errorMargin', e.target.value)}
                                        required
                                    />
                                </Col>
                                <Col sm="6">
                                    <Form.Label className="small">Unit</Form.Label>
                                    <Form.Control
                                        type="text" placeholder="e.g. pH, g, cP"
                                        value={templateDraft.unit}
                                        onChange={(e) => handleTemplateChange('unit', e.target.value)}
                                        required
                                    />
                                </Col>
                            </Row>
                            <Form.Label className="small">Expected Values</Form.Label>
                            {templateDraft.expectedValues.map((val, idx) => (
                                <InputGroup className="mb-2" key={idx}>
                                    <InputGroup.Text>Value {idx + 1}</InputGroup.Text>
                                    <Form.Control
                                        type="number" step="0.01"
                                        value={val}
                                        onChange={(e) => handleExpectedValueChange(idx, e.target.value)}
                                        required
                                    />
                                    <Button type="button" variant="outline-danger" onClick={() => removeExpectedValue(idx)}>
                                        <MdDelete />
                                    </Button>
                                </InputGroup>
                            ))}
                            <Button type="button" variant="outline-success" size="sm" onClick={addExpectedValue}>
                                <MdAdd /> Add Value
                            </Button>
                        </div>
                    ) : (
                        <>
                            {!hasTemplate ? (
                                <Alert variant="warning" className="py-3 text-center">
                                    <p className="mb-2">No calibration template configured for this instrument.</p>
                                    {isAdmin && (
                                        <Button type="button" variant="primary" size="sm" onClick={toggleEditMode}>
                                            Configure Template Now
                                        </Button>
                                    )}
                                </Alert>
                            ) : (
                                <>
                                    <Form.Label className="fw-semibold">1. Enter Readings</Form.Label>
                                    <div className="mb-3">
                                        <p className="text-muted small mb-3">
                                            Acceptable Error Margin: +/- {template.errorMargin} {template.unit}
                                        </p>
                                        {template.expectedValues.map((expected, index) => (
                                            <Form.Group as={Row} className="mb-2 align-items-center" key={index}>
                                                <Form.Label column sm="4">Expected: {expected} {template.unit}</Form.Label>
                                                <Col sm="8">
                                                    <InputGroup>
                                                        <Form.Control
                                                            type="number" step="0.01"
                                                            placeholder="Actual reading"
                                                            value={readings[index] || ''}
                                                            onChange={(e) => handleReadingChange(index, e.target.value)}
                                                            onBlur={validateReadings}
                                                            required
                                                        />
                                                        <InputGroup.Text>{template.unit}</InputGroup.Text>
                                                    </InputGroup>
                                                </Col>
                                            </Form.Group>
                                        ))}
                                    </div>

                                    <div className="border-top pt-3">
                                        <div className="mb-3 d-flex align-items-center justify-content-between">
                                            <Form.Label className="fw-semibold m-0">Auto-Validation:</Form.Label>
                                            <div>
                                                {validationResult === 'Pass' && <span className="text-success fw-bold">✓ Pass (Okay)</span>}
                                                {validationResult === 'Fail' && <span className="text-danger fw-bold">✗ Fail (Out of Range)</span>}
                                                {!validationResult && <span className="text-muted fst-italic">Pending...</span>}
                                            </div>
                                        </div>

                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-semibold">2. Done By</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={currentUser?.name || 'Unknown'}
                                                disabled
                                                className="bg-light"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-2">
                                            <Form.Label className="fw-semibold">3. Note <span className="text-muted fw-normal small">(optional)</span></Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={2}
                                                placeholder="Any observations or remarks..."
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                            />
                                        </Form.Group>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                    {isEditMode ? (
                        <Button variant="success" type="submit"><MdCheck /> Save Template</Button>
                    ) : (
                        <Button variant="primary" type="submit" disabled={!hasTemplate || submitting}>
                            {submitting ? 'Submitting...' : 'Submit Record'}
                        </Button>
                    )}
                </Modal.Footer>
            </Form>

            <AppDialog
                show={dialogInfo.show}
                title={dialogInfo.title}
                message={dialogInfo.message}
                confirmText="OK"
                confirmVariant="primary"
                onClose={() => setDialogInfo({ show: false, title: '', message: '' })}
            />
        </Modal>
    );
};

export default CalibrationModal;
