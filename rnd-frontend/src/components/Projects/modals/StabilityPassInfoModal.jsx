import { Modal, Form, Button, Row, Col } from 'react-bootstrap';

const StabilityPassInfoModal = ({ show, onHide, saving, values, onChange, onSubmit }) => {
    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Form onSubmit={onSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Master Formula Header (Required for PASS)</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Label>Company Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={values.companyName || ''}
                                onChange={(e) => onChange('companyName', e.target.value)}
                                required
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Label>Date of Issue</Form.Label>
                            <Form.Control
                                type="date"
                                value={values.dateOfIssue || ''}
                                onChange={(e) => onChange('dateOfIssue', e.target.value)}
                                required
                            />
                        </Col>

                        <Col md={6}>
                            <Form.Label>Brand Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={values.brandName || ''}
                                onChange={(e) => onChange('brandName', e.target.value)}
                                required
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Label>Revision No.</Form.Label>
                            <Form.Control
                                type="text"
                                value={values.revisionNo || ''}
                                onChange={(e) => onChange('revisionNo', e.target.value)}
                                required
                            />
                        </Col>

                        <Col md={6}>
                            <Form.Label>Product Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={values.productName || ''}
                                onChange={(e) => onChange('productName', e.target.value)}
                                required
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Label>Revision Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={values.revisionDate || ''}
                                onChange={(e) => onChange('revisionDate', e.target.value)}
                                required
                            />
                        </Col>

                        <Col md={6}>
                            <Form.Label>Shelf Life</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g. 24 Months"
                                value={values.shelfLife || ''}
                                onChange={(e) => onChange('shelfLife', e.target.value)}
                                required
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Label>Issued By</Form.Label>
                            <Form.Control
                                type="text"
                                value={values.issuedBy || ''}
                                onChange={(e) => onChange('issuedBy', e.target.value)}
                                required
                            />
                        </Col>

                        <Col md={6}>
                            <Form.Label>MRF No.</Form.Label>
                            <Form.Control
                                type="text"
                                value={values.mrfNo || ''}
                                onChange={(e) => onChange('mrfNo', e.target.value)}
                                required
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Label>Doc. No.</Form.Label>
                            <Form.Control
                                type="text"
                                value={values.docNo || ''}
                                onChange={(e) => onChange('docNo', e.target.value)}
                                required
                            />
                        </Col>

                        <Col xs={12}>
                            <Form.Label>Reason for Revision</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={values.reasonForRevision || ''}
                                onChange={(e) => onChange('reasonForRevision', e.target.value)}
                                required
                            />
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="secondary" onClick={onHide} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="success" disabled={saving}>
                        {saving ? 'Saving...' : 'Confirm PASS'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default StabilityPassInfoModal;
