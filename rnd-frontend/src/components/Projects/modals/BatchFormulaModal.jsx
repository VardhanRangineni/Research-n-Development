import { Modal, Button, Form, Row, Col, Card, Table } from 'react-bootstrap';

const BatchFormulaModal = ({
    show,
    onHide,
    saving,
    formData,
    onBatchNameChange,
    onTargetBatchSizeChange,
    onWeightChange,
    onVolumeMlChange,
    onSave
}) => {
    const currentTotal = formData.items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

    return (
        <Modal show={show} onHide={onHide} size="xl" centered>
            <Modal.Header closeButton>
                <Modal.Title>Formulation Entry</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Card className="border-0">
                    <Card.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Batch Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.batchName}
                                onChange={(e) => onBatchNameChange(e.target.value)}
                            />
                        </Form.Group>

                        <Row className="mb-3">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Target Batch Size (g)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.targetBatchSize}
                                        onChange={(e) => onTargetBatchSizeChange(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={8} className="d-flex align-items-end justify-content-end">
                                <div className="text-end">
                                    <div className="text-muted">Current Total</div>
                                    <div className="fw-bold text-danger fs-4">{currentTotal.toFixed(2)} g</div>
                                </div>
                            </Col>
                        </Row>

                        <Table bordered responsive className="align-middle">
                            <thead className="bg-light text-muted">
                                <tr>
                                    <th>Ingredient</th>
                                    <th>Target %</th>
                                    <th>Weight (g)</th>
                                    <th>Actual %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.map((item, index) => (
                                    <tr key={`${item.ingredientName}-${index}`}>
                                        <td>{item.ingredientName}</td>
                                        <td>{Number(item.targetPercent || 0).toFixed(2)}%</td>
                                        <td>
                                            {item.specificGravity ? (
                                                <div>
                                                    <div className="d-flex align-items-center gap-1">
                                                        <Form.Control
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.volumeMl ?? ''}
                                                            onChange={(e) => onVolumeMlChange(index, e.target.value)}
                                                            placeholder="Volume"
                                                            style={{ maxWidth: '110px' }}
                                                        />
                                                        <small className="text-muted fw-semibold">mL</small>
                                                    </div>
                                                    <small className="text-success fw-semibold mt-1 d-block">
                                                        = {Number(item.weight || 0).toFixed(4)} g
                                                        <span className="text-muted ms-1">(SG {item.specificGravity})</span>
                                                    </small>
                                                </div>
                                            ) : (
                                                <Form.Control
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.weight}
                                                    onChange={(e) => onWeightChange(index, e.target.value)}
                                                />
                                            )}
                                        </td>
                                        <td>{Number(item.actualPercent || 0).toFixed(2)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            </Modal.Body>
            <Modal.Footer>
                <Button type="button" variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
                <Button type="button" variant="danger" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save Formula'}</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default BatchFormulaModal;
