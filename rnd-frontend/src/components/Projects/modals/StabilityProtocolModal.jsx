import { Modal, Form, Button } from 'react-bootstrap';

const StabilityProtocolModal = ({
    show,
    onHide,
    saving,
    protocolDraft,
    setProtocolDraft,
    approvedBatches,
    onAddDraftValue,
    onAddInterval,
    onRemoveDraftValue,
    onAddDraftParameter,
    onUpdateDraftParameterReference,
    onSaveProtocol
}) => {
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>{protocolDraft.id ? 'Edit Stability Protocol' : 'Create Stability Protocol'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group className="mb-3">
                    <Form.Label>Protocol Name</Form.Label>
                    <Form.Control
                        type="text"
                        value={protocolDraft.protocolName}
                        onChange={(e) => setProtocolDraft(prev => ({ ...prev, protocolName: e.target.value }))}
                    />
                </Form.Group>

                {!protocolDraft.id && (
                    <Form.Group className="mb-3">
                        <Form.Label>Approved Batch</Form.Label>
                        <Form.Select
                            value={protocolDraft.batchFormulaId}
                            onChange={(e) => setProtocolDraft(prev => ({ ...prev, batchFormulaId: e.target.value }))}
                        >
                            {approvedBatches.map(batch => (
                                <option key={batch.id} value={batch.id}>{batch.batchName}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                )}

                <Form.Group className="mb-3">
                    <Form.Label>Conditions</Form.Label>
                    <div className="d-flex gap-2 mb-2">
                        <Form.Control
                            type="text"
                            placeholder="e.g. 25°C"
                            value={protocolDraft.conditionInput}
                            onChange={(e) => setProtocolDraft(prev => ({ ...prev, conditionInput: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onAddDraftValue('conditions', 'conditionInput');
                                }
                            }}
                        />
                        <Button type="button" variant="outline-primary" onClick={() => onAddDraftValue('conditions', 'conditionInput')}>Add Temp</Button>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        {(protocolDraft.conditions || []).map(condition => (
                            <Button type="button" key={condition} size="sm" variant="light" className="border" onClick={() => onRemoveDraftValue('conditions', condition)}>
                                {condition} ×
                            </Button>
                        ))}
                    </div>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Intervals</Form.Label>
                    <div className="d-flex gap-2 mb-2">
                        <Form.Control
                            type="number"
                            min={1}
                            placeholder="e.g. 3"
                            value={protocolDraft.intervalValue}
                            onChange={(e) => setProtocolDraft(prev => ({ ...prev, intervalValue: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onAddInterval();
                                }
                            }}
                        />
                        <Form.Select
                            value={protocolDraft.intervalUnit}
                            onChange={(e) => setProtocolDraft(prev => ({ ...prev, intervalUnit: e.target.value }))}
                        >
                            <option value="Month">Month(s)</option>
                            <option value="Day">Day(s)</option>
                        </Form.Select>
                        <Button type="button" variant="outline-primary" onClick={onAddInterval}>Add Interval</Button>
                        <Button type="button" variant="outline-secondary" onClick={() => onAddDraftValue('intervals', 'Initial', true)}>Add Initial</Button>
                    </div>
                    <div className="small text-muted mb-2">Initial is mandatory. Add intervals in days or months.</div>
                    <div className="d-flex flex-wrap gap-2">
                        {(protocolDraft.intervals || []).map(interval => (
                            <Button type="button" key={interval} size="sm" variant="light" className="border" onClick={() => onRemoveDraftValue('intervals', interval)}>
                                {interval} ×
                            </Button>
                        ))}
                    </div>
                </Form.Group>

                <Form.Group>
                    <Form.Label>Parameters</Form.Label>
                    <div className="d-flex gap-2 mb-2">
                        <Form.Control
                            type="text"
                            placeholder="e.g. Texture"
                            value={protocolDraft.parameterInput}
                            onChange={(e) => setProtocolDraft(prev => ({ ...prev, parameterInput: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onAddDraftParameter();
                                }
                            }}
                        />
                        <Form.Control
                            type="text"
                            placeholder="Expected output / reference"
                            value={protocolDraft.parameterReferenceInput || ''}
                            onChange={(e) => setProtocolDraft(prev => ({ ...prev, parameterReferenceInput: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onAddDraftParameter();
                                }
                            }}
                        />
                        <Button type="button" variant="outline-primary" onClick={onAddDraftParameter}>Add Parameter</Button>
                    </div>
                    {(protocolDraft.parameters || []).length > 0 ? (
                        <div className="border rounded p-2">
                            {(protocolDraft.parameters || []).map(parameter => (
                                <div key={parameter} className="d-flex gap-2 align-items-center mb-2">
                                    <Form.Control value={parameter} disabled />
                                    <Form.Control
                                        placeholder="Expected output / reference"
                                        value={protocolDraft.parameterReferences?.[parameter] || ''}
                                        onChange={(e) => onUpdateDraftParameterReference(parameter, e.target.value)}
                                    />
                                    <Button type="button"
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => onRemoveDraftValue('parameters', parameter)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="small text-muted">Add at least one parameter. Reference value is optional.</div>
                    )}
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button type="button" variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
                <Button type="button" variant="primary" onClick={onSaveProtocol} disabled={saving}>{saving ? 'Saving...' : 'Save Protocol'}</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default StabilityProtocolModal;
