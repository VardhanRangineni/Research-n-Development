import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';

const GRADE_OPTIONS = [
    'Cosmetic Grade',
    'USP Grade',
    'IP Grade',
    'BP Grade',
    'Food Grade',
    'Pharma Grade',
    'Laboratory Grade',
    'ISI Grade'
];

const IngredientFormModal = ({ show, handleClose, handleSave, initialData }) => {
    const EMPTY_FORM = {
        erpCode: '',
        tradeName: '',
        inciName: '',
        supplierName: '',
        function: '',
        grade: '',
        casNumber: '',
        ecNo: '',
        price: '',
        uom: 'gm',
        safetyLevel: 'Low',
        complianceStatus: '',
        specificGravity: ''
    };

    const [formData, setFormData] = useState(EMPTY_FORM);
    const [gradeOptions, setGradeOptions] = useState(GRADE_OPTIONS);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...EMPTY_FORM,
                ...initialData,
                specificGravity: initialData.specificGravity != null ? String(initialData.specificGravity) : ''
            });

            const incomingGrade = (initialData.grade || '').trim();
            if (incomingGrade && !GRADE_OPTIONS.includes(incomingGrade)) {
                setGradeOptions([incomingGrade, ...GRADE_OPTIONS]);
            } else {
                setGradeOptions(GRADE_OPTIONS);
            }
        } else {
            setFormData(EMPTY_FORM);
            setGradeOptions(GRADE_OPTIONS);
        }
    }, [initialData, show]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const sg = formData.specificGravity !== '' && formData.specificGravity !== null
            ? parseFloat(formData.specificGravity)
            : null;
        const payload = {
            ...formData,
            specificGravity: sg != null && !isNaN(sg) && sg > 0 ? sg : null
        };
        await handleSave(payload);
    };

    return (
        <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{initialData ? 'Edit Ingredient' : 'Add New Ingredient'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>ERP Code</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="erpCode"
                                    value={formData.erpCode}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Trade Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="tradeName"
                                    value={formData.tradeName}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Supplier Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="supplierName"
                                    value={formData.supplierName}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>INCI Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="inciName"
                                    value={formData.inciName}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Function</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="function"
                                    value={formData.function}
                                    onChange={handleChange}
                                    placeholder="e.g. Emulsifier, Preservative"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Grade</Form.Label>
                                <Form.Select
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Grade</option>
                                    {gradeOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>CAS Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="casNumber"
                                    value={formData.casNumber}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>EC No.</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="ecNo"
                                    value={formData.ecNo}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Price</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>UOM (gm/kg/ml)</Form.Label>
                                <Form.Select
                                    name="uom"
                                    value={formData.uom}
                                    onChange={handleChange}
                                >
                                    <option value="gm">gm</option>
                                    <option value="kg">kg</option>
                                    <option value="ml">ml</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Safety Level</Form.Label>
                                <Form.Select
                                    name="safetyLevel"
                                    value={formData.safetyLevel}
                                    onChange={handleChange}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Specific Gravity
                                    <span className="text-muted ms-1" style={{ fontWeight: 'normal', fontSize: '0.85em' }}>(optional — for liquid / mL ingredients)</span>
                                </Form.Label>
                                <Form.Control
                                    type="number"
                                    name="specificGravity"
                                    value={formData.specificGravity}
                                    onChange={handleChange}
                                    min="0.0001"
                                    step="0.0001"
                                    placeholder="e.g. 1.26"
                                />
                                <Form.Text className="text-muted">
                                    Weight (g) = Volume (mL) × SG
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Compliance Status (EU/US)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="complianceStatus"
                                    value={formData.complianceStatus}
                                    onChange={handleChange}
                                    placeholder="e.g. EU: Compliant, US: Restricted"
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button variant="primary" type="submit">{initialData ? 'Update' : 'Save'}</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default IngredientFormModal;
