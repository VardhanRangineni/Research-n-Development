import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Container, Card, Spinner, Badge } from 'react-bootstrap';
import { MdAdd, MdEdit, MdPauseCircleFilled, MdSearch, MdArrowBack } from 'react-icons/md';
import { benchmarkService } from '../../services/benchmark.service';
import BenchmarkFormModal from './BenchmarkFormModal';
import AppDialog from '../Common/AppDialog';

const sanitiseName = (name) => {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed === 'N/A' ? '' : trimmed;
};

const formatIngredientsForDisplay = (ingredientsList) => {
    if (!ingredientsList) return '—';

    try {
        const parsed = JSON.parse(ingredientsList);
        if (!Array.isArray(parsed) || parsed.length === 0) return '—';

        return parsed
            .map((item) => {
                const name = sanitiseName(item?.ingredientName) || 'Unknown Ingredient';
                const qty  = item?.quantity ? `${item.quantity} ` : '';
                const unit = item?.unit || '';
                const measurement = (qty || unit) ? ` (${qty}${unit}`.trimEnd() + ')' : '';
                return `• ${name}${measurement}`;
            })
            .join('\n');
    } catch {
        return ingredientsList;
    }
};

const BenchmarkMaster = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmStopItem, setConfirmStopItem] = useState(null);
    const [dialogInfo, setDialogInfo] = useState({ show: false, title: '', message: '' });
    const [stopping, setStopping] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await benchmarkService.getAll();
            setProducts(data);
        } catch (error) {
            console.error('Failed to load benchmark products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setCurrentProduct(null);
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setCurrentProduct(item);
        setShowModal(true);
    };

    const handleStopDevelopment = async () => {
        if (!confirmStopItem) return;

        try {
            setStopping(true);
            await benchmarkService.stopDevelopment(confirmStopItem.id);
            setConfirmStopItem(null);
            setDialogInfo({
                show: true,
                title: 'Development Stopped',
                message: 'Development has been stopped for this benchmark project. It cannot be resumed. Create a new benchmark to continue future work.'
            });
            await loadProducts();
        } catch (error) {
            setDialogInfo({
                show: true,
                title: 'Unable to Stop Development',
                message: error.message || 'Something went wrong while stopping the project.'
            });
        } finally {
            setStopping(false);
        }
    };

    const handleSave = async (formData) => {
        try {
            if (currentProduct) {
                await benchmarkService.update(currentProduct.id, formData);
            } else {
                await benchmarkService.create(formData);
            }
            setShowModal(false);
            await loadProducts();
        } catch (error) {
            setDialogInfo({
                show: true,
                title: 'Save Failed',
                message: error.message || 'Unable to save benchmark product.'
            });
        }
    };

    const filteredProducts = products.filter(item =>
        (item.benchmarkId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.competitorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.segment || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                    <h2 className="fw-bold text-dark m-0">Benchmark Product Master</h2>
                </div>
                <Button type="button" variant="primary" onClick={handleAdd} className="d-flex align-items-center gap-2">
                    <MdAdd size={20} /> Add Product
                </Button>
            </div>

            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white py-3">
                    <div className="d-flex align-items-center" style={{ maxWidth: '350px' }}>
                        <MdSearch size={22} className="text-muted me-2" />
                        <input
                            type="text"
                            className="form-control border-0 shadow-none ps-1"
                            placeholder="Search by Benchmark ID, Product, Competitor or Segment..."
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
                                    <th className="ps-4">Benchmark ID</th>
                                    <th className="ps-4">Competitor</th>
                                    <th>Product Name</th>
                                    <th>Segment</th>
                                    <th>Status</th>
                                    <th>Claims / Benefits</th>
                                    <th style={{ width: '30%' }}>Ingredients List</th>
                                    <th className="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map(item => (
                                        <tr key={item.id}>
                                            <td className="ps-4 fw-medium">{item.benchmarkId || '—'}</td>
                                            <td className="ps-4 fw-medium">{item.competitorName}</td>
                                            <td>{item.productName}</td>
                                            <td><Badge bg="secondary" className="fw-normal">{item.segment}</Badge></td>
                                            <td>
                                                <Badge bg={(item.status || 'Active') === 'Stopped' ? 'dark' : 'success'} className="fw-normal">
                                                    {item.status || 'Active'}
                                                </Badge>
                                            </td>
                                            <td><small style={{ whiteSpace: 'pre-wrap' }}>{item.claimedBenefits}</small></td>
                                            <td>
                                                <div className="text-muted" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                                                    {formatIngredientsForDisplay(item.ingredientsList)}
                                                </div>
                                            </td>
                                            <td className="text-end pe-4">
                                                <Button type="button"
                                                    variant="link"
                                                    className="text-primary p-0 me-3"
                                                    onClick={() => handleEdit(item)}
                                                    disabled={(item.status || 'Active') === 'Stopped'}
                                                    title={(item.status || 'Active') === 'Stopped' ? 'Stopped projects cannot be edited' : 'Edit'}
                                                >
                                                    <MdEdit size={18} />
                                                </Button>
                                                <Button type="button"
                                                    variant="link"
                                                    className="text-warning p-0"
                                                    onClick={() => setConfirmStopItem(item)}
                                                    disabled={(item.status || 'Active') === 'Stopped'}
                                                    title={(item.status || 'Active') === 'Stopped' ? 'Already stopped' : 'Stop development'}
                                                >
                                                    <MdPauseCircleFilled size={18} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-5 text-muted">
                                            No benchmark products found. Click "Add Product" to start.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            <BenchmarkFormModal
                show={showModal}
                handleClose={() => setShowModal(false)}
                handleSave={handleSave}
                initialData={currentProduct}
            />

            <AppDialog
                show={!!confirmStopItem}
                title="Stop Development"
                message="This will permanently stop development on this project. It cannot be resumed, and the related project will no longer appear on the Projects page."
                confirmText={stopping ? 'Stopping...' : 'Stop Development'}
                confirmVariant="warning"
                showCancel
                onConfirm={handleStopDevelopment}
                onClose={() => !stopping && setConfirmStopItem(null)}
                busy={stopping}
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

export default BenchmarkMaster;
