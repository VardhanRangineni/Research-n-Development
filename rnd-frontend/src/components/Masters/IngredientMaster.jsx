import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Container, Card, Spinner, Badge, Alert } from 'react-bootstrap';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdArrowBack, MdUploadFile, MdInfoOutline } from 'react-icons/md';
import * as XLSX from 'xlsx';
import { ingredientsService } from '../../services/ingredients.service';
import IngredientFormModal from './IngredientFormModal';
import AppDialog from '../Common/AppDialog';

const IngredientMaster = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentIngredient, setCurrentIngredient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [importing, setImporting] = useState(false);
    const [importMessage, setImportMessage] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [confirmReplaceUpload, setConfirmReplaceUpload] = useState(false);
    const [pendingUploadFile, setPendingUploadFile] = useState(null);
    const [dialogInfo, setDialogInfo] = useState({ show: false, title: '', message: '' });

    useEffect(() => {
        loadIngredients();
    }, []);

    const loadIngredients = async () => {
        try {
            const data = await ingredientsService.getAll();
            setIngredients(data);
        } catch (error) {
            console.error('Failed to load ingredients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setCurrentIngredient(null);
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setCurrentIngredient(item);
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        await ingredientsService.delete(confirmDeleteId);
        setConfirmDeleteId(null);
        loadIngredients();
    };

    const handleSave = async (formData) => {
        try {
            if (currentIngredient) {
                await ingredientsService.update(currentIngredient.id, formData);
            } else {
                await ingredientsService.create(formData);
            }
            setShowModal(false);
            await loadIngredients();
        } catch (error) {
            setDialogInfo({
                show: true,
                title: 'Save Failed',
                message: error.message || 'Unable to save ingredient.'
            });
        }
    };

    const handleTemplateDownload = () => {
        const headers = [[
            'ERP Code',
            'Trade Name',
            'INCI Name',
            'Supplier Name',
            'Function',
            'Grade',
            'CAS Number',
            'EC No.',
            'Price',
            'UOM (gm/kg/ml)',
            'Safety Level',
            'Compliance Status (EU/US)'
        ]];

        const sheet = XLSX.utils.aoa_to_sheet(headers);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, 'IngredientTemplate');
        XLSX.writeFile(workbook, 'ingredient_template.xlsx');
    };

    const processBulkUpload = async (file) => {
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

            const payloadList = [];

            for (const row of rows) {
                const specificGravityRaw = String(row['Specific Gravity'] || '').trim();
                const payload = {
                    erpCode: String(row['ERP Code'] || '').trim(),
                    tradeName: String(row['Trade Name'] || '').trim(),
                    inciName: String(row['INCI Name'] || '').trim(),
                    supplierName: String(row['Supplier Name'] || '').trim(),
                    function: String(row.Function || '').trim(),
                    grade: String(row.Grade || '').trim(),
                    casNumber: String(row['CAS Number'] || '').trim(),
                    ecNo: String(row['EC No.'] || '').trim(),
                    price: String(row.Price || '').trim(),
                    uom: String(row['UOM (gm/kg/ml)'] || '').trim(),
                    safetyLevel: String(row['Safety Level'] || '').trim(),
                    complianceStatus: String(row['Compliance Status (EU/US)'] || '').trim(),
                    specificGravity: specificGravityRaw !== '' && !Number.isNaN(Number(specificGravityRaw))
                        ? Number(specificGravityRaw)
                        : null
                };

                const isCompletelyEmpty = [
                    payload.erpCode,
                    payload.tradeName,
                    payload.inciName,
                    payload.supplierName,
                    payload.function,
                    payload.grade,
                    payload.casNumber,
                    payload.ecNo,
                    payload.price,
                    payload.uom,
                    payload.safetyLevel,
                    payload.complianceStatus
                ].every(value => !value) && payload.specificGravity == null;

                if (isCompletelyEmpty) {
                    continue;
                }

                payloadList.push(payload);
            }

            if (!payloadList.length) {
                setImportMessage({ type: 'danger', text: 'No data rows found in the file. Empty rows are ignored, but at least one row should contain ingredient data.' });
                return;
            }

            const result = await ingredientsService.bulkCreate(payloadList);

            await loadIngredients();

            if (result.created > 0 && result.failed === 0) {
                setImportMessage({ type: 'success', text: `${result.created} ingredient records imported successfully. Existing ingredient data was replaced.` });
            } else if (result.failed > 0) {
                const firstError = result.errors?.[0]?.message ? ` First error: ${result.errors[0].message}.` : '';
                setImportMessage({ type: 'danger', text: `Upload rejected. Existing ingredient data was not changed.${firstError}` });
            } else {
                const firstError = result.errors?.[0]?.message ? ` First error: ${result.errors[0].message}.` : '';
                setImportMessage({ type: 'danger', text: `No records were imported.${firstError}` });
            }
        } catch (error) {
            setImportMessage({ type: 'danger', text: error.message || 'Failed to read the file. Please upload a valid Excel file (.xlsx/.xls).' });
        } finally {
            setImporting(false);
            setPendingUploadFile(null);
        }
    };

    const handleBulkUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;

        setPendingUploadFile(file);
        setConfirmReplaceUpload(true);
    };

    const handleConfirmReplaceUpload = async () => {
        if (!pendingUploadFile || importing) {
            setConfirmReplaceUpload(false);
            setPendingUploadFile(null);
            return;
        }

        setConfirmReplaceUpload(false);
        await processBulkUpload(pendingUploadFile);
    };

    const handleCancelReplaceUpload = () => {
        if (importing) return;
        setConfirmReplaceUpload(false);
        setPendingUploadFile(null);
    };

    const filteredIngredients = ingredients.filter(item =>
        (item.erpCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.tradeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.inciName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSafetyBadge = (level) => {
        switch (level) {
            case 'High': return 'danger';
            case 'Medium': return 'warning';
            case 'Low': return 'success';
            default: return 'info';
        }
    };

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
                    <h2 className="fw-bold text-dark m-0">Ingredient Master</h2>
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
                        <MdAdd size={20} /> Add Ingredient
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
                    <div className="d-flex align-items-center" style={{ maxWidth: '350px' }}>
                        <MdSearch size={22} className="text-muted me-2" />
                        <input
                            type="text"
                            className="form-control border-0 shadow-none ps-1"
                            placeholder="Search by ERP, Trade, INCI or Supplier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </Card.Header>
                <Card.Body className="p-0" style={{ overflow: 'hidden' }}>
                    {loading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', width: '100%' }}>
                        <Table hover bordered className="m-0 align-middle" style={{ minWidth: '1200px' }}>
                            <thead className="bg-light text-muted">
                                <tr>
                                    <th className="ps-4">ERP Code</th>
                                    <th>Trade Name</th>
                                    <th>INCI Name</th>
                                    <th>Supplier Name</th>
                                    <th>Function</th>
                                    <th>Grade</th>
                                    <th>CAS No.</th>
                                    <th>EC No.</th>
                                    <th>Price</th>
                                    <th>UOM</th>
                                    <th>Specific Gravity</th>
                                    <th>Safety Level</th>
                                    <th>Compliance (EU/US)</th>
                                    <th className="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredIngredients.length > 0 ? (
                                    filteredIngredients.map(item => (
                                        <tr key={item.id}>
                                            <td className="ps-4 fw-medium">{item.erpCode}</td>
                                            <td>{item.tradeName}</td>
                                            <td>{item.inciName}</td>
                                            <td><small className="text-muted">{item.supplierName}</small></td>
                                            <td>{item.function}</td>
                                            <td>{item.grade || <span className="text-muted">—</span>}</td>
                                            <td><small>{item.casNumber}</small></td>
                                            <td><small>{item.ecNo}</small></td>
                                            <td>{item.price}</td>
                                            <td>{item.uom}</td>
                                            <td>
                                                {item.specificGravity != null
                                                    ? <span className="fw-semibold">{Number(item.specificGravity).toFixed(4)}</span>
                                                    : <span className="text-muted">—</span>}
                                            </td>
                                            <td>
                                                <Badge bg={getSafetyBadge(item.safetyLevel)}>
                                                    {item.safetyLevel || 'N/A'}
                                                </Badge>
                                            </td>
                                            <td>{item.complianceStatus}</td>
                                            <td className="text-end pe-4">
                                                <Button type="button" variant="link" className="text-primary p-0 me-3" onClick={() => handleEdit(item)}>
                                                    <MdEdit size={18} />
                                                </Button>
                                                <Button type="button" variant="link" className="text-danger p-0" onClick={() => setConfirmDeleteId(item.id)}>
                                                    <MdDelete size={18} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="14" className="text-center py-5 text-muted">
                                            No ingredients found. Click "Add Ingredient" to start.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            <IngredientFormModal
                show={showModal}
                handleClose={() => setShowModal(false)}
                handleSave={handleSave}
                initialData={currentIngredient}
            />

            <AppDialog
                show={!!confirmDeleteId}
                title="Delete Ingredient"
                message="Are you sure you want to delete this ingredient?"
                confirmText="Delete"
                confirmVariant="danger"
                showCancel
                onConfirm={handleDelete}
                onClose={() => setConfirmDeleteId(null)}
            />

            <AppDialog
                show={dialogInfo.show}
                title={dialogInfo.title}
                message={dialogInfo.message}
                confirmText="OK"
                confirmVariant="primary"
                onClose={() => setDialogInfo({ show: false, title: '', message: '' })}
            />

            <AppDialog
                show={confirmReplaceUpload}
                title="Replace Existing Ingredients"
                message="Uploading this Excel file will delete all current ingredient records and replace them with the uploaded data. Single ingredient additions are not affected. Do you want to continue?"
                confirmText="Replace Data"
                confirmVariant="danger"
                showCancel
                onConfirm={handleConfirmReplaceUpload}
                onClose={handleCancelReplaceUpload}
            />
        </Container>
    );
};

export default IngredientMaster;
