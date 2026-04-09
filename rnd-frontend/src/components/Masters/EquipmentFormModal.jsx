import { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const normalizeModelPrefix = (model = '') =>
    model
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 2);

const getNextMachineId = (model, equipmentList = [], currentId = '') => {
    const prefix = normalizeModelPrefix(model);
    if (!prefix) return '';

    const pattern = new RegExp(`^MED\\/R&D\\/${prefix}-(\\d+)$`, 'i');
    let maxNumber = 0;

    equipmentList.forEach((item) => {
        const id = item?.machineId;
        if (!id || id === currentId) return;

        const match = id.match(pattern);
        if (match) {
            const numericPart = Number.parseInt(match[1], 10);
            if (!Number.isNaN(numericPart) && numericPart > maxNumber) {
                maxNumber = numericPart;
            }
        }
    });

    return `MED/R&D/${prefix}-${String(maxNumber + 1).padStart(2, '0')}`;
};

const EquipmentFormModal = ({ show, handleClose, handleSave, initialData, existingEquipment = [] }) => {
    const isEdit = Boolean(initialData);
    const [formData, setFormData] = useState({
        machineId: '',
        instrumentType: '',
        name: '',
        model: '',
        serialNumber: '',
        lastCalibration: '',
        nextCalibration: '',
        frequency: 'Daily',
        status: 'Active'
    });

    const calculateNextCalibration = (lastDateStr, freq) => {
        if (!lastDateStr) return '';
        const lastDate = new Date(lastDateStr);
        const nextDate = new Date(lastDateStr);

        switch (freq) {
            case 'Daily': nextDate.setDate(lastDate.getDate() + 1); break;
            case 'Weekly': nextDate.setDate(lastDate.getDate() + 7); break;
            case 'Monthly': nextDate.setMonth(lastDate.getMonth() + 1); break;
            case 'Quarterly': nextDate.setMonth(lastDate.getMonth() + 3); break;
            case 'Yearly': nextDate.setFullYear(lastDate.getFullYear() + 1); break;
            case 'None': return '';
            default: return '';
        }
        return nextDate.toISOString().split('T')[0];
    };

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            const today = new Date().toISOString().split('T')[0];
            const defaultFreq = 'Daily';
            setFormData({
                machineId: '',
                instrumentType: '',
                name: '',
                model: '',
                serialNumber: '',
                lastCalibration: today,
                nextCalibration: calculateNextCalibration(today, defaultFreq),
                frequency: defaultFreq,
                status: 'Active'
            });
        }
    }, [initialData, show]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };

            if (!isEdit && name === 'model') {
                updated.machineId = getNextMachineId(value, existingEquipment);
            }

            if (name === 'lastCalibration' || name === 'frequency') {
                updated.nextCalibration = calculateNextCalibration(
                    name === 'lastCalibration' ? value : updated.lastCalibration,
                    name === 'frequency' ? value : updated.frequency
                );
            }
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await handleSave(formData);
    };

    return (
        <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
            <Modal.Header closeButton>
                <Modal.Title>{initialData ? 'Edit Equipment' : 'Add New Equipment'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <div className="row">
                        <div className="col-md-4">
                            <Form.Group className="mb-3">
                                <Form.Label>Machine ID</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="machineId"
                                    value={formData.machineId}
                                    readOnly
                                    disabled
                                    placeholder="Auto-generated from model"
                                    required
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-4">
                            <Form.Group className="mb-3">
                                <Form.Label>Instrument Type</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="instrumentType"
                                    value={formData.instrumentType}
                                    onChange={handleChange}
                                    placeholder="e.g., pH Meter, Weighing Balance"
                                    disabled={isEdit}
                                    required
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-4">
                            <Form.Group className="mb-3">
                                <Form.Label>Status</Form.Label>
                                <Form.Select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Under Maintenance">Under Maintenance</option>
                                    <option value="Calibration Overdue">Calibration Overdue</option>
                                    <option value="Machine Removed">Machine Removed</option>
                                    <option value="Machine Not in Use">Machine Not in Use</option>
                                </Form.Select>
                            </Form.Group>
                        </div>
                    </div>
                    <Form.Group className="mb-3">
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={isEdit}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Model</Form.Label>
                        <Form.Control
                            type="text"
                            name="model"
                            value={formData.model}
                            onChange={handleChange}
                            disabled={isEdit}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Serial Number <span className="text-muted">(Optional)</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="serialNumber"
                            value={formData.serialNumber}
                            onChange={handleChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Last Calibration Date</Form.Label>
                        <Form.Control
                            type="date"
                            name="lastCalibration"
                            value={formData.lastCalibration}
                            onChange={handleChange}
                            disabled={isEdit}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Next Calibration Due Date (Auto-calculated)</Form.Label>
                        <Form.Control
                            type="date"
                            name="nextCalibration"
                            value={formData.nextCalibration}
                            readOnly
                            disabled
                            style={{ backgroundColor: '#f8f9fa' }}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Calibration Frequency</Form.Label>
                        <Form.Select
                            name="frequency"
                            value={formData.frequency}
                            onChange={handleChange}
                        >
                            <option value="None">None</option>
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Yearly">Yearly</option>
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button variant="primary" type="submit">{initialData ? 'Update' : 'Save'}</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default EquipmentFormModal;
