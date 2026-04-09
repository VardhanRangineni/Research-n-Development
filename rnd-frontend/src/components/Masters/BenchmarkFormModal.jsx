import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { MdAdd, MdDelete } from 'react-icons/md';
import Select from 'react-select';
import { ingredientsService } from '../../services/ingredients.service';

const EMPTY_INGREDIENT_ROW = {
    ingredientId: '',
    ingredientName: '',
    quantity: '',
    unit: '',
    specificGravity: null
};

const parseIngredientsList = (rawValue) => {
    if (!rawValue) return [];
    try {
        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map(item => ({
                ingredientId: item.ingredientId ? String(item.ingredientId) : '',
                ingredientName: item.ingredientName ? String(item.ingredientName) : '',
                quantity: item.quantity !== undefined && item.quantity !== null ? String(item.quantity) : '',
                unit: item.unit ? String(item.unit) : '',
                specificGravity: item.specificGravity != null ? Number(item.specificGravity) : null
            }))
            .filter(item => item.ingredientName || item.ingredientId || item.quantity || item.unit);
    } catch {
        return [];
    }
};

const BenchmarkFormModal = ({ show, handleClose, handleSave, initialData }) => {
    const [formData, setFormData] = useState({
        competitorName: '',
        productName: '',
        segment: '',
        claimedBenefits: '',
        ingredientsList: ''
    });
    const [ingredientOptions, setIngredientOptions] = useState([]);
    const [ingredientRows, setIngredientRows] = useState([{ ...EMPTY_INGREDIENT_ROW }]);
    const [ingredientInputMode, setIngredientInputMode] = useState('individual');
    const [ingredientError, setIngredientError] = useState('');

    useEffect(() => {
        const loadIngredients = async () => {
            try {
                const data = await ingredientsService.getAll();
                setIngredientOptions(data || []);
            } catch (error) {
                console.error('Failed to load ingredients for benchmark form:', error);
                setIngredientOptions([]);
            }
        };

        if (show) {
            loadIngredients();
        }
    }, [show]);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            const parsedRows = parseIngredientsList(initialData.ingredientsList);
            const rowsToSet = parsedRows.length ? parsedRows : [{ ...EMPTY_INGREDIENT_ROW }];
            const hasRows = rowsToSet.some(row => row.ingredientId || row.ingredientName || row.quantity || row.unit);
            const isPercentageMode = hasRows && rowsToSet.every(row => !row.unit || row.unit === '%');

            setIngredientInputMode(isPercentageMode ? 'percentage' : 'individual');
            setIngredientRows(
                isPercentageMode
                    ? rowsToSet.map(row => ({ ...row, unit: '%' }))
                    : rowsToSet
            );
            setIngredientError('');
        } else {
            setFormData({
                competitorName: '',
                productName: '',
                segment: '',
                claimedBenefits: '',
                ingredientsList: ''
            });
            setIngredientInputMode('individual');
            setIngredientRows([{ ...EMPTY_INGREDIENT_ROW }]);
            setIngredientError('');
        }
    }, [initialData, show]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resolveIngredientName = (ingredient) => {
        if (!ingredient) return '';
        const trade = ingredient.tradeName?.trim();
        const inci  = ingredient.inciName?.trim();
        // prefer tradeName; fall back to inciName only if it's not the placeholder "N/A"
        if (trade && trade !== 'N/A') return trade;
        if (inci  && inci  !== 'N/A') return inci;
        return ingredient.erpCode || '';
    };

    const handleIngredientSelectChange = (index, selectedIngredientId) => {
        const selectedIngredient = ingredientOptions.find(
            ingredient => String(ingredient.id) === selectedIngredientId
        );

        setIngredientRows(prev => prev.map((row, rowIndex) => {
            if (rowIndex !== index) return row;
            return {
                ...row,
                ingredientId: selectedIngredientId,
                ingredientName: resolveIngredientName(selectedIngredient),
                specificGravity: selectedIngredient?.specificGravity != null
                    ? Number(selectedIngredient.specificGravity)
                    : null
            };
        }));
        setIngredientError('');
    };

    const handleIngredientQuantityChange = (index, value) => {
        setIngredientRows(prev => prev.map((row, rowIndex) => {
            if (rowIndex !== index) return row;
            return { ...row, quantity: value };
        }));
        setIngredientError('');
    };

    const handleIngredientUnitChange = (index, value) => {
        if (ingredientInputMode === 'percentage') return;

        setIngredientRows(prev => prev.map((row, rowIndex) => {
            if (rowIndex !== index) return row;
            return { ...row, unit: value };
        }));
        setIngredientError('');
    };

    const handleIngredientModeChange = (e) => {
        const mode = e.target.value;
        setIngredientInputMode(mode);
        setIngredientError('');

        setIngredientRows(prev => prev.map(row => ({
            ...row,
            unit: mode === 'percentage' ? '%' : row.unit
        })));
    };

    const addIngredientRow = () => {
        setIngredientRows(prev => [
            ...prev,
            {
                ...EMPTY_INGREDIENT_ROW,
                unit: ingredientInputMode === 'percentage' ? '%' : ''
            }
        ]);
        setIngredientError('');
    };

    const removeIngredientRow = (index) => {
        setIngredientRows(prev => {
            const updated = prev.filter((_, rowIndex) => rowIndex !== index);
            if (updated.length) return updated;
            return [{
                ...EMPTY_INGREDIENT_ROW,
                unit: ingredientInputMode === 'percentage' ? '%' : ''
            }];
        });
        setIngredientError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIngredientError('');

        const cleanedRows = ingredientRows
            .map(row => ({
                ingredientId: row.ingredientId ? Number(row.ingredientId) : null,
                ingredientName: row.ingredientName?.trim() || '',
                quantity: row.quantity?.trim() || '',
                unit: ingredientInputMode === 'percentage' ? '%' : (row.unit?.trim() || ''),
                specificGravity: row.specificGravity != null ? row.specificGravity : null
            }))
            .filter(row => row.ingredientId && row.quantity && row.unit);

        if (!cleanedRows.length) {
            setIngredientError('Please add at least one complete ingredient row.');
            return;
        }

        if (ingredientInputMode === 'percentage') {
            const totalPercentage = cleanedRows.reduce((sum, row) => {
                const value = Number(row.quantity);
                return sum + (Number.isFinite(value) ? value : 0);
            }, 0);

            if (Math.abs(totalPercentage - 100) > 0.01) {
                setIngredientError(`Total percentage must be 100%. Current total: ${totalPercentage.toFixed(2)}%.`);
                return;
            }
        }

        await handleSave({
            ...formData,
            ingredientsList: JSON.stringify(cleanedRows)
        });
    };

    const totalPercentage = ingredientRows.reduce((sum, row) => {
        const value = Number(row.quantity);
        return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const ingredientSelectOptions = ingredientOptions.map(ingredient => {
        const tradeName = ingredient.tradeName || '';
        const inciName  = (ingredient.inciName && ingredient.inciName !== 'N/A') ? ingredient.inciName : '';
        const erpCode   = ingredient.erpCode || '';
        return {
            value: String(ingredient.id),
            // label is used by react-select's built-in text filter
            label: [tradeName, inciName, erpCode].filter(Boolean).join(' '),
            tradeName,
            inciName,
            erpCode
        };
    });

    return (
        <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{initialData ? 'Edit Benchmark Product' : 'Add New Benchmark Product'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {initialData?.projectId && (
                        <Form.Group className="mb-3">
                            <Form.Label>Project ID</Form.Label>
                            <Form.Control
                                type="text"
                                value={initialData.projectId}
                                readOnly
                                disabled
                            />
                        </Form.Group>
                    )}

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Competitor Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="competitorName"
                                    value={formData.competitorName}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Product Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="productName"
                                    value={formData.productName}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Segment</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="segment"
                                    value={formData.segment}
                                    onChange={handleChange}
                                    placeholder="e.g., Sunscreen, Moisturizer"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Claimed / Benefits</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="claimedBenefits"
                                    value={formData.claimedBenefits}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <Form.Label className="mb-0">Ingredients</Form.Label>
                            <div className="btn-group btn-group-sm" role="group" aria-label="Ingredient entry mode">
                                <Button
                                    type="button"
                                    variant="outline-danger"
                                    className={ingredientInputMode === 'individual' ? 'active text-white bg-danger border-danger' : ''}
                                    onClick={() => handleIngredientModeChange({ target: { value: 'individual' } })}
                                >
                                    Individual
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline-danger"
                                    className={ingredientInputMode === 'percentage' ? 'active text-white bg-danger border-danger' : ''}
                                    onClick={() => handleIngredientModeChange({ target: { value: 'percentage' } })}
                                >
                                    100%
                                </Button>
                            </div>
                        </div>

                        {ingredientRows.map((row, index) => (
                            <Row key={index} className="g-2 align-items-center mb-2">
                                <Col md={6}>
                                    <Select
                                        options={ingredientSelectOptions}
                                        value={ingredientSelectOptions.find(option => option.value === row.ingredientId) || null}
                                        onChange={(option) => handleIngredientSelectChange(index, option ? option.value : '')}
                                        placeholder="Search by name or ERP code…"
                                        isSearchable
                                        isClearable
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                        styles={{
                                            menuPortal: (base) => ({ ...base, zIndex: 1080 }),
                                            option: (base) => ({ ...base, padding: '6px 12px' })
                                        }}
                                        formatOptionLabel={(option, { context }) => {
                                            if (context === 'value') {
                                                // compact single-line in the input chip
                                                return (
                                                    <span>
                                                        {option.tradeName || option.inciName || option.erpCode}
                                                        {' '}
                                                        <span style={{ color: '#6c757d', fontSize: '0.82em' }}>
                                                            ({option.erpCode})
                                                        </span>
                                                    </span>
                                                );
                                            }
                                            // two-line display inside the dropdown menu
                                            return (
                                                <div style={{ lineHeight: 1.35 }}>
                                                    <div style={{ fontWeight: 500 }}>
                                                        {option.tradeName || option.inciName || option.erpCode}
                                                    </div>
                                                    <small style={{ color: '#6c757d', fontSize: '0.78rem' }}>
                                                        {option.erpCode}
                                                        {option.inciName && option.inciName !== option.tradeName
                                                            ? ` · ${option.inciName}`
                                                            : ''}
                                                    </small>
                                                </div>
                                            );
                                        }}
                                    />
                                </Col>
                                <Col md={2}>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder={ingredientInputMode === 'percentage' ? '% value' : 'Qty'}
                                        value={row.quantity}
                                        onChange={(e) => handleIngredientQuantityChange(index, e.target.value)}
                                        required
                                    />
                                </Col>
                                <Col md={3}>
                                    <Form.Control
                                        type="text"
                                        placeholder={ingredientInputMode === 'percentage' ? '%' : 'Unit (e.g. %, g, ml)'}
                                        value={ingredientInputMode === 'percentage' ? '%' : row.unit}
                                        onChange={(e) => handleIngredientUnitChange(index, e.target.value)}
                                        required
                                        disabled={ingredientInputMode === 'percentage'}
                                    />
                                </Col>
                                <Col md={1} className="d-flex justify-content-end">
                                    <Button
                                        variant="outline-danger"
                                        type="button"
                                        onClick={() => removeIngredientRow(index)}
                                        aria-label="Remove ingredient row"
                                    >
                                        <MdDelete size={16} />
                                    </Button>
                                </Col>
                            </Row>
                        ))}

                        <div className="mt-2 mb-2">
                            <Button
                                variant="outline-primary"
                                size="sm"
                                type="button"
                                onClick={addIngredientRow}
                                className="d-inline-flex align-items-center gap-1"
                            >
                                <MdAdd size={16} /> Add Ingredient
                            </Button>
                        </div>

                        {ingredientInputMode === 'percentage' && (
                            <Form.Text className={Math.abs(totalPercentage - 100) <= 0.01 ? 'text-success d-block mb-1' : 'text-warning d-block mb-1'}>
                                Total: {totalPercentage.toFixed(2)}% (Target: 100%)
                            </Form.Text>
                        )}

                        {ingredientError && (
                            <Form.Text className="text-danger d-block mb-1">
                                {ingredientError}
                            </Form.Text>
                        )}

                        <Form.Text className="text-muted">
                            {ingredientInputMode === 'percentage'
                                ? 'In 100% mode, enter percentage values in Qty. Unit is automatically set to %.'
                                : 'Select ingredients from Ingredient Master and define measurement unit for each.'}
                        </Form.Text>
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

export default BenchmarkFormModal;
