import { Modal, Button, Row, Col, Table, Form } from 'react-bootstrap';

const BatchDetailsModal = ({
    show,
    onHide,
    saving,
    selectedBatch,
    remarkText,
    onRemarkChange,
    onSaveRemark,
    getBatchItems
}) => {
    return (
        <Modal show={show} onHide={onHide} size="xl" centered>
            <Modal.Header closeButton>
                <Modal.Title>{selectedBatch?.batchName || 'Batch Details'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {selectedBatch && (
                    <>
                        <Row className="mb-3">
                            <Col md={6}><strong>Target Batch Size:</strong> {Number(selectedBatch.targetBatchSize || 0).toFixed(2)} g</Col>
                            <Col md={6} className="text-md-end"><strong>Current Total:</strong> {Number(selectedBatch.currentTotalWeight || 0).toFixed(2)} g</Col>
                        </Row>

                        <Table bordered responsive className="align-middle mb-3">
                            <thead className="bg-light text-muted">
                                <tr>
                                    <th>Ingredient</th>
                                    <th>Target %</th>
                                    <th>Weight (g)</th>
                                    <th>Actual %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getBatchItems(selectedBatch).map((item, index) => (
                                    <tr key={`${item.ingredientName}-${index}`}>
                                        <td>{item.ingredientName}</td>
                                        <td>{Number(item.targetPercent || 0).toFixed(2)}%</td>
                                        <td>{Number(item.weight || 0).toFixed(2)}</td>
                                        <td>{Number(item.actualPercent || 0).toFixed(2)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>

                        <Form.Group>
                            <Form.Label>Remark for this batch</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={remarkText}
                                onChange={(e) => onRemarkChange(e.target.value)}
                                placeholder="Add batch observation or decision remark..."
                            />
                        </Form.Group>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button type="button" variant="secondary" onClick={onHide} disabled={saving}>Close</Button>
                <Button type="button" variant="primary" onClick={onSaveRemark} disabled={saving}>{saving ? 'Saving...' : 'Save Remark'}</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default BatchDetailsModal;
