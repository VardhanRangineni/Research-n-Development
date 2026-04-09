import { Modal, Button } from 'react-bootstrap';
import { MdCheckCircle, MdClose, MdRemove } from 'react-icons/md';
import { useEffect, useState } from 'react';

const StabilityStatusPickerModal = ({ show, onHide, saving, statusPicker, onPickStatus }) => {
    const [measurementValue, setMeasurementValue] = useState('');

    useEffect(() => {
        if (show) {
            setMeasurementValue(statusPicker.measurementValue || '');
        }
    }, [show, statusPicker.measurementValue]);

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>{statusPicker.protocolName} - {statusPicker.conditionLabel} @ {statusPicker.intervalLabel}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="mb-3 fw-semibold">Parameter: {statusPicker.parameterName}</div>
                <div className="mb-3">
                    <label className="form-label">Reading / Value (optional)</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 12.4 g"
                        value={measurementValue}
                        onChange={(e) => setMeasurementValue(e.target.value)}
                    />
                </div>
                <div className="d-flex justify-content-center gap-3">
                    <Button type="button" variant="outline-success" onClick={() => onPickStatus('PASS', measurementValue)} disabled={saving} title="Pass">
                        <MdCheckCircle size={22} />
                    </Button>
                    <Button type="button" variant="outline-danger" onClick={() => onPickStatus('FAIL', measurementValue)} disabled={saving} title="Fail">
                        <MdClose size={22} />
                    </Button>
                    <Button type="button" variant="outline-secondary" onClick={() => onPickStatus('NA', measurementValue)} disabled={saving} title="Not Applicable">
                        <MdRemove size={22} />
                    </Button>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button type="button" variant="secondary" onClick={onHide} disabled={saving}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default StabilityStatusPickerModal;
