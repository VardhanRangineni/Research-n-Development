import { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Button, Badge, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { MdBuild, MdCheckCircle, MdCancel } from 'react-icons/md';
import { equipmentService } from '../../../services/equipment.service';
import { calibrationService } from '../../../services/calibration.service';
import CalibrationModal from './CalibrationModal';

const CalibrationHome = () => {
    const [equipmentList, setEquipmentList] = useState([]);
    const [lastResultMap, setLastResultMap] = useState({}); // { [equipmentId]: 'Pass' | 'Fail' }
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedEq, setSelectedEq] = useState(null);

    const needsCalibration = useCallback((eq) => {
        if (eq.status === 'Calibration Overdue') return true;
        const today = new Date();
        const nextDue = new Date(eq.nextCalibration);
        const diffDays = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [equipment, allLogs] = await Promise.all([
                equipmentService.getCalibrationEligible(),
                calibrationService.getAll()
            ]);

            // Build a map of equipmentId -> last calibration result
            const resultMap = {};
            allLogs.forEach(log => {
                const id = log.equipmentId;
                if (!resultMap[id]) {
                    resultMap[id] = log;
                } else {
                    const logDate = new Date(log.date).getTime();
                    const existingDate = new Date(resultMap[id].date).getTime();
                    if (logDate > existingDate || (logDate === existingDate && log.id > resultMap[id].id)) {
                        resultMap[id] = log;
                    }
                }
            });
            setLastResultMap(resultMap);

            // Sort to show pending/overdue at the top
            equipment.sort((a, b) => {
                const aNeeds = needsCalibration(a);
                const bNeeds = needsCalibration(b);
                if (aNeeds && !bNeeds) return -1;
                if (!aNeeds && bNeeds) return 1;
                return 0;
            });
            setEquipmentList(equipment);
        } catch (error) {
            console.error('Failed to load equipment data', error);
        } finally {
            setLoading(false);
        }
    }, [needsCalibration]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCalibrateClick = (eq) => {
        setSelectedEq(eq);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedEq(null);
    };

    const handleCalibrationComplete = () => {
        loadData();
    };

    const getRowClass = (eq) => {
        const inactiveStatuses = ['Under Maintenance', 'Retired', 'Machine Removed', 'Machine Not in Use'];
        if (inactiveStatuses.includes(eq.status)) {
            return 'text-muted bg-light opacity-75';
        }
        const today = new Date();
        const nextDue = new Date(eq.nextCalibration);
        const diffDays = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
        if (eq.status === 'Calibration Overdue' || diffDays <= 0) return 'row-glow-danger';
        return '';
    };

    const getStatusBadge = (eq) => {
        if (eq.status === 'Under Maintenance') return <Badge bg="danger">Under Maintenance</Badge>;
        if (eq.status === 'Retired') return <Badge bg="secondary">Retired</Badge>;
        if (eq.status === 'Machine Removed') return <Badge bg="secondary">Machine Removed</Badge>;
        if (eq.status === 'Machine Not in Use') return <Badge bg="secondary">Machine Not in Use</Badge>;

        const lastLog = lastResultMap[eq.id];

        if (lastLog) {
            return lastLog.status === 'Pass'
                ? <Badge bg="success" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}><MdCheckCircle /> Pass</Badge>
                : <Badge bg="danger" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}><MdCancel /> Fail</Badge>;
        }

        return <Badge bg="secondary">Pending</Badge>;
    };

    return (
        <Container fluid className="p-4">
            <div className="mb-4">
                <h2 className="fw-bold text-dark m-0">Equipment Calibration Workflow</h2>
                <p className="text-muted">Select an instrument to perform daily calibration or validation.</p>
            </div>

            <style>{`
                .pulse-danger {
                    animation: pulse-red 2s infinite;
                }
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
                    70% { box-shadow: 0 0 0 6px rgba(220, 53, 69, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
                }
                .row-glow-danger {
                    animation: glow-red 1.5s ease-in-out infinite alternate !important;
                }
                .row-glow-danger td {
                    background-color: transparent !important;
                }
                @keyframes glow-red {
                    from { background-color: #ffe6e6; box-shadow: inset 0 0 5px rgba(220, 53, 69, 0.2); }
                    to { background-color: #ffcccc; box-shadow: inset 0 0 15px rgba(220, 53, 69, 0.6); }
                }
            `}</style>

            <Card className="border-0 shadow-sm">
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <Table hover responsive className="m-0 align-middle">
                            <thead className="bg-light text-muted">
                                <tr>
                                    <th className="ps-4">Machine ID</th>
                                    <th>Instrument Type</th>
                                    <th>Equipment Name</th>
                                    <th>Last Calibration</th>
                                    <th>Next Due</th>
                                    <th>Calibration Status</th>
                                    <th className="text-end pe-4">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {equipmentList.length > 0 ? (
                                    equipmentList.map(eq => (
                                        <tr key={eq.id} className={getRowClass(eq)}>
                                            <td className="ps-4 fw-medium">{eq.machineId}</td>
                                            <td>{eq.instrumentType}</td>
                                            <td>{eq.name}</td>
                                            <td><small className="text-muted">{eq.lastCalibration}</small></td>
                                            <td><small className="fw-semibold">{eq.nextCalibration}</small></td>
                                            <td>{getStatusBadge(eq)}</td>
                                            <td className="text-end pe-4">
                                                {['Under Maintenance', 'Retired', 'Machine Removed', 'Machine Not in Use'].includes(eq.status) ? (
                                                    <MdBuild size={20} className="text-muted" style={{ cursor: 'not-allowed', opacity: 0.5 }} />
                                                ) : (
                                                    <OverlayTrigger
                                                        placement="top"
                                                        overlay={<Tooltip>Calibrate {eq.machineId}</Tooltip>}
                                                    >
                                                        <Button type="button"
                                                            variant="link"
                                                            className="p-0 text-primary"
                                                            onClick={() => handleCalibrateClick(eq)}
                                                        >
                                                            <MdBuild size={20} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">
                                            No equipment found in the Master list.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            <CalibrationModal
                show={showModal}
                handleClose={handleModalClose}
                selectedEquipment={selectedEq}
                onCalibrationComplete={handleCalibrationComplete}
            />
        </Container>
    );
};

export default CalibrationHome;
