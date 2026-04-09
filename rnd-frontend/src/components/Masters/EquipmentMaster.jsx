import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Container, Card, Spinner, Badge, Alert } from 'react-bootstrap';
import { MdAdd, MdEdit, MdSearch, MdArrowBack, MdUploadFile, MdInfoOutline } from 'react-icons/md';
import * as XLSX from 'xlsx';
import { equipmentService } from '../../services/equipment.service';
import EquipmentFormModal from './EquipmentFormModal';
import AppDialog from '../Common/AppDialog';

const normalizeModelPrefix = (model = '') =>
    model
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 2);

const getNextMachineId = (model, equipmentList = []) => {
    const prefix = normalizeModelPrefix(model);
    if (!prefix) return '';

    const pattern = new RegExp(`^MED\\/R&D\\/${prefix}-(\\d+)$`, 'i');
    let maxNumber = 0;

    equipmentList.forEach((item) => {
        const id = item?.machineId;
        if (!id) return;

        const match = id.match(pattern);
        if (!match) return;

        const numericPart = Number.parseInt(match[1], 10);
        if (!Number.isNaN(numericPart) && numericPart > maxNumber) {
            maxNumber = numericPart;
        }
    });

    return `MED/R&D/${prefix}-${String(maxNumber + 1).padStart(2, '0')}`;
};

const formatAsIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDateToIso = (value) => {
    if (!value && value !== 0) return '';

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return formatAsIsoDate(value);
    }

    if (typeof value === 'number') {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) {
            const fromSerial = new Date(parsed.y, parsed.m - 1, parsed.d);
            return formatAsIsoDate(fromSerial);
        }
    }

    const text = String(value).trim();
    if (!text) return '';

    const ddMmYyyyMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddMmYyyyMatch) {
        const [, day, month, year] = ddMmYyyyMatch;
        return `${year}-${month}-${day}`;
    }

    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return text;

    const parsedDate = new Date(text);
    if (!Number.isNaN(parsedDate.getTime())) {
        return formatAsIsoDate(parsedDate);
    }

    return '';
};

const formatDateForDisplay = (value) => {
    if (!value) return '';
    const iso = parseDateToIso(value);
    if (!iso) return String(value);
    const [year, month, day] = iso.split('-');
    return `${day}-${month}-${year}`;
};

const calculateNextCalibration = (lastDateStr, freq) => {
    if (!lastDateStr) return '';
    const lastDate = new Date(lastDateStr);
    if (Number.isNaN(lastDate.getTime())) return '';

    const nextDate = new Date(lastDateStr);
    switch (freq) {
        case 'Daily': nextDate.setDate(lastDate.getDate() + 1); break;
        case 'Weekly': nextDate.setDate(lastDate.getDate() + 7); break;
        case 'Monthly': nextDate.setMonth(lastDate.getMonth() + 1); break;
        case 'Quarterly': nextDate.setMonth(lastDate.getMonth() + 3); break;
        case 'Yearly': nextDate.setFullYear(lastDate.getFullYear() + 1); break;
        default: return '';
    }
    return nextDate.toISOString().split('T')[0];
};

const EquipmentMaster = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentEquipment, setCurrentEquipment] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [importing, setImporting] = useState(false);
    const [importMessage, setImportMessage] = useState(null);
    const [dialogInfo, setDialogInfo] = useState({ show: false, title: '', message: '' });

    useEffect(() => {
        loadEquipment();
    }, []);

    const loadEquipment = async () => {
        try {
            const data = await equipmentService.getAll();
            setEquipment(data);
        } catch (error) {
            console.error('Failed to load equipment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setCurrentEquipment(null);
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setCurrentEquipment(item);
        setShowModal(true);
    };

    const handleSave = async (formData) => {
        try {
            if (currentEquipment) {
                await equipmentService.update(currentEquipment.id, formData);
            } else {
                await equipmentService.create(formData);
            }
            setShowModal(false);
            await loadEquipment();
        } catch (error) {
            setDialogInfo({
                show: true,
                title: 'Save Failed',
                message: error.message || 'Unable to save equipment.'
            });
        }
    };

    const handleTemplateDownload = () => {
        const headers = [[
            'Name',
            'Instrument Type',
            'Model',
            'Serial Number',
            'Last Calibration (DD-MM-YYYY)',
            'Frequency',
            'Status'
        ]];

        const sheet = XLSX.utils.aoa_to_sheet(headers);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, 'EquipmentTemplate');
        XLSX.writeFile(workbook, 'equipment_template.xlsx');
    };

    const handleBulkUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportMessage(null);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            if (!rows.length) {
                setImportMessage({ type: 'warning', text: 'Uploaded file is empty.' });
                return;
            }

            const workingEquipment = [...equipment];
            const payloadList = [];

            for (const row of rows) {
                const name = String(row.Name || '').trim();
                const instrumentType = String(row['Instrument Type'] || '').trim();
                const model = String(row.Model || '').trim();
                const serialNumber = String(row['Serial Number'] || '').trim();
                const rawLastCalibration =
                    row['Last Calibration (DD-MM-YYYY)'] ||
                    row['Last Calibration (YYYY-MM-DD)'] ||
                    '';
                const lastCalibration = parseDateToIso(rawLastCalibration) || new Date().toISOString().split('T')[0];
                const frequency = String(row.Frequency || '').trim() || 'Daily';
                const status = String(row.Status || '').trim() || 'Active';

                if (!name || !instrumentType || !model) {
                    continue;
                }

                const machineId = getNextMachineId(model, workingEquipment);
                if (!machineId) {
                    continue;
                }

                const payload = {
                    machineId,
                    instrumentType,
                    name,
                    model,
                    serialNumber,
                    lastCalibration,
                    nextCalibration: calculateNextCalibration(lastCalibration, frequency),
                    frequency,
                    status
                };

                payloadList.push(payload);
                workingEquipment.push(payload);
            }

            if (!payloadList.length) {
                setImportMessage({ type: 'danger', text: 'No valid rows found in the file. Please check required columns.' });
                return;
            }

            const result = await equipmentService.bulkCreate(payloadList);

            if (result.created > 0) {
                await loadEquipment();
            }

            if (result.created > 0 && result.failed === 0) {
                setImportMessage({ type: 'success', text: `${result.created} equipment records imported successfully.` });
            } else if (result.created > 0 && result.failed > 0) {
                const firstError = result.errors?.[0]?.message ? ` First error: ${result.errors[0].message}.` : '';
                setImportMessage({ type: 'warning', text: `${result.created} imported, ${result.failed} failed.${firstError}` });
            } else {
                const firstError = result.errors?.[0]?.message ? ` First error: ${result.errors[0].message}.` : '';
                setImportMessage({ type: 'danger', text: `No records were imported.${firstError}` });
            }
        } catch (error) {
            const message = `${error?.message || ''}`.trim();
            if (message.toLowerCase().includes('forbidden')) {
                setImportMessage({ type: 'danger', text: 'You do not have permission to bulk upload equipment, or your session security token expired. Please sign in again and retry.' });
            } else {
                setImportMessage({ type: 'danger', text: message || 'Failed to read the file. Please upload a valid Excel file (.xlsx/.xls).' });
            }
        } finally {
            setImporting(false);
            event.target.value = '';
        }
    };

    const filteredEquipment = equipment.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.machineId || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center">
                    <Button type="button"
                        variant="link"
                        className="text-muted p-0 me-3"
                        onClick={() => navigate('/masters')}
                    >
                        <MdArrowBack size={24} />
                    </Button>
                    <h2 className="fw-bold text-dark m-0">Equipment Master</h2>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <Button type="button"
                        variant="success"
                        className="d-flex align-items-center gap-2 text-white"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                    >
                        {importing ? <Spinner size="sm" animation="border" /> : <MdUploadFile size={20} />}
                        {importing ? 'Uploading...' : 'Upload Excel'}
                    </Button>
                    <Button type="button"
                        variant="outline-secondary"
                        className="d-flex align-items-center justify-content-center"
                        title="Download template with headers"
                        aria-label="Download template with headers"
                        onClick={handleTemplateDownload}
                    >
                        <MdInfoOutline size={22} />
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="d-none"
                        onChange={handleBulkUpload}
                    />
                    <Button type="button" variant="primary" onClick={handleAdd} className="d-flex align-items-center gap-2" disabled={importing}>
                        <MdAdd size={20} /> Add Equipment
                    </Button>
                </div>
            </div>

            {importMessage && (
                <Alert
                    variant={importMessage.type}
                    className="py-2"
                    dismissible
                    onClose={() => setImportMessage(null)}
                >
                    {importMessage.text}
                </Alert>
            )}

            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white py-3">
                    <div className="d-flex align-items-center" style={{ maxWidth: '300px' }}>
                        <MdSearch size={22} className="text-muted me-2" />
                        <input
                            type="text"
                            className="form-control border-0 shadow-none ps-1"
                            placeholder="Search by Name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <Table hover responsive bordered className="m-0 align-middle">
                            <thead className="bg-light text-muted">
                                <tr>
                                    <th className="ps-4">Machine ID</th>
                                    <th>Status</th>
                                    <th>Name</th>
                                    <th>Model</th>
                                    <th>Serial Number</th>
                                    <th>Last Calibration</th>
                                    <th>Next Due</th>
                                    <th>Frequency</th>
                                    <th className="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEquipment.length > 0 ? (
                                    filteredEquipment.map(item => (
                                        <tr key={item.id}>
                                            <td className="ps-4 fw-medium">{item.machineId}</td>
                                            <td>
                                                <Badge bg={
                                                    (!item.status || item.status === 'Active') ? 'success' :
                                                        item.status === 'Under Maintenance' ? 'warning' : 'danger'
                                                }>
                                                    {item.status || 'Active'}
                                                </Badge>
                                            </td>
                                            <td>{item.name}</td>
                                            <td>{item.model}</td>
                                            <td>{item.serialNumber}</td>
                                            <td>{formatDateForDisplay(item.lastCalibration)}</td>
                                            <td>
                                                                        {formatDateForDisplay(item.nextCalibration)}
                                            </td>
                                            <td>
                                                <Badge
                                                    bg={item.frequency === 'None' ? 'secondary' : 'info'}
                                                    text={item.frequency === 'None' ? 'light' : 'dark'}
                                                >
                                                    {item.frequency}
                                                </Badge>
                                            </td>
                                            <td className="text-end pe-4">
                                                <Button type="button" variant="link" className="text-primary p-0 me-3" onClick={() => handleEdit(item)}>
                                                    <MdEdit size={18} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="text-center py-5 text-muted">
                                            No equipment found. Click "Add Equipment" to start.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            <EquipmentFormModal
                show={showModal}
                handleClose={() => setShowModal(false)}
                handleSave={handleSave}
                initialData={currentEquipment}
                existingEquipment={equipment}
            />

            <AppDialog
                show={dialogInfo.show}
                title={dialogInfo.title}
                message={dialogInfo.message}
                confirmText="OK"
                confirmVariant="primary"
                onClose={() => setDialogInfo({ show: false, title: '', message: '' })}
            />
        </Container>
    );
};

export default EquipmentMaster;
