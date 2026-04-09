import { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Spinner, Form, InputGroup, Button } from 'react-bootstrap';
import { MdSearch, MdCheckCircle, MdCancel, MdDownload } from 'react-icons/md';
import * as XLSX from 'xlsx';
import { calibrationService } from '../../../services/calibration.service';

const CalibrationLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const parseReadings = (log) => {
        try {
            const parsed = typeof log.readings === 'string' ? JSON.parse(log.readings) : (log.readings || []);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Failed to parse readings for log', log.id, error);
            return [];
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            const data = await calibrationService.getAll();
            // Sort by most recent first
            const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
            setLogs(sorted);
        } catch (error) {
            console.error('Failed to load calibration logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = logs.filter(log =>
        (log.machineId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.instrumentType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.doneBy || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportExcel = () => {
        const rows = [
            ['Date', 'Machine', 'Instrument Type', 'Calibration', '', 'Result', 'Done By', 'Note'],
            ['', '', '', 'Expected', 'Actual Reading', '', '', '']
        ];
        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
            { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
            { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
            { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } },
            { s: { r: 0, c: 5 }, e: { r: 1, c: 5 } },
            { s: { r: 0, c: 6 }, e: { r: 1, c: 6 } },
            { s: { r: 0, c: 7 }, e: { r: 1, c: 7 } }
        ];

        let rowPointer = 2;
        filtered.forEach((log) => {
            const readings = parseReadings(log);
            const rowSpan = Math.max(readings.length, 1);

            if (readings.length) {
                readings.forEach((reading, idx) => {
                    rows.push([
                        idx === 0 ? (log.date || '—') : '',
                        idx === 0 ? (log.machineId || '—') : '',
                        idx === 0 ? (log.instrumentType || '—') : '',
                        `${reading?.expected ?? '—'} ${reading?.unit || ''}`.trim(),
                        reading?.actual !== null && reading?.actual !== undefined
                            ? `${reading.actual} ${reading?.unit || ''}`.trim()
                            : '—',
                        idx === 0 ? (log.status || '—') : '',
                        idx === 0 ? (log.doneBy || '—') : '',
                        idx === 0 ? (log.note || '—') : ''
                    ]);
                });
            } else {
                rows.push([
                    log.date || '—',
                    log.machineId || '—',
                    log.instrumentType || '—',
                    '—',
                    '—',
                    log.status || '—',
                    log.doneBy || '—',
                    log.note || '—'
                ]);
            }

            if (rowSpan > 1) {
                [0, 1, 2, 5, 6, 7].forEach((col) => {
                    merges.push({
                        s: { r: rowPointer, c: col },
                        e: { r: rowPointer + rowSpan - 1, c: col }
                    });
                });
            }

            rowPointer += rowSpan;
        });

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet['!merges'] = merges;
        worksheet['!cols'] = [
            { wch: 14 },
            { wch: 20 },
            { wch: 18 },
            { wch: 14 },
            { wch: 16 },
            { wch: 12 },
            { wch: 18 },
            { wch: 30 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Calibration Logs');
        XLSX.writeFile(workbook, 'calibration_logs_filtered.xlsx');
    };

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark m-0">Calibration Logs</h2>
                    <p className="text-muted small mt-1 mb-0">Complete history of all equipment calibration records</p>
                </div>
            </div>

            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white py-3">
                    <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                        <InputGroup style={{ maxWidth: '420px' }}>
                            <InputGroup.Text className="bg-white border-end-0">
                                <MdSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                className="border-start-0 shadow-none"
                                placeholder="Search by Machine, Instrument, or Person..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>
                        <div>
                            <Button type="button"
                                variant="outline-success"
                                onClick={handleExportExcel}
                                disabled={!filtered.length}
                                className="d-inline-flex align-items-center gap-2"
                            >
                                <MdDownload size={18} />
                                Export Excel
                            </Button>
                        </div>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover bordered className="m-0 align-middle" style={{ minWidth: '900px' }}>
                                <thead className="bg-light text-muted small">
                                    <tr>
                                        <th className="ps-4" rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid #dee2e6' }}>Date</th>
                                        <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid #dee2e6' }}>Machine</th>
                                        <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid #dee2e6' }}>Instrument Type</th>
                                        <th colSpan={2} className="text-center border-bottom" style={{ borderRight: '1px solid #dee2e6' }}>Calibration</th>
                                        <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid #dee2e6' }}>Result</th>
                                        <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid #dee2e6' }}>Done By</th>
                                        <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Note</th>
                                    </tr>
                                    <tr>
                                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Expected</th>
                                        <th className="text-center">Actual Reading</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length > 0 ? (
                                        filtered.map((log) => {
                                            const readings = parseReadings(log);
                                            const rowSpan = Math.max(readings.length, 1);
                                            return readings.length > 0 ? (
                                                readings.map((r, idx) => (
                                                    <tr key={`${log.id}-${idx}`} style={{ borderBottom: idx === readings.length - 1 ? '2px solid #ced4da' : undefined }}>
                                                        {idx === 0 && (
                                                            <>
                                                                <td className="ps-4" rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>
                                                                    <span className="fw-medium">{log.date}</span>
                                                                </td>
                                                                <td rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>
                                                                    <span className="fw-semibold">{log.machineId}</span>
                                                                </td>
                                                                <td rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>
                                                                    <Badge bg="secondary">{log.instrumentType}</Badge>
                                                                </td>
                                                            </>
                                                        )}
                                                        <td className="text-center">
                                                            <span className="text-muted">{r.expected} {r.unit}</span>
                                                        </td>
                                                        <td className="text-center">
                                                            {r.actual !== null && r.actual !== undefined ? (
                                                                <span className={
                                                                    Math.abs(r.expected - r.actual) <= (log.errorMargin || 999)
                                                                        ? 'text-success fw-medium' : 'text-danger fw-medium'
                                                                }>
                                                                    {r.actual} {r.unit}
                                                                </span>
                                                            ) : <span className="text-muted">—</span>}
                                                        </td>
                                                        {idx === 0 && (
                                                            <>
                                                                <td rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>
                                                                    {log.status === 'Pass' ? (
                                                                        <span className="text-success fw-semibold d-flex align-items-center gap-1">
                                                                            <MdCheckCircle /> Pass
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-danger fw-semibold d-flex align-items-center gap-1">
                                                                            <MdCancel /> Fail
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>
                                                                    {log.doneBy || '—'}
                                                                </td>
                                                                <td rowSpan={rowSpan} style={{ verticalAlign: 'middle' }} className="text-muted fst-italic small">
                                                                    {log.note || '—'}
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr key={log.id} style={{ borderBottom: '2px solid #ced4da' }}>
                                                    <td className="ps-4">{log.date}</td>
                                                    <td className="fw-semibold">{log.machineId}</td>
                                                    <td><Badge bg="secondary">{log.instrumentType}</Badge></td>
                                                    <td className="text-center text-muted">—</td>
                                                    <td className="text-center text-muted">—</td>
                                                    <td>
                                                        {log.status === 'Pass'
                                                            ? <span className="text-success fw-semibold">Pass</span>
                                                            : <span className="text-danger fw-semibold">Fail</span>}
                                                    </td>
                                                    <td>{log.doneBy || '—'}</td>
                                                    <td className="text-muted fst-italic small">{log.note || '—'}</td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="text-center py-5 text-muted">
                                                No calibration records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default CalibrationLogs;
