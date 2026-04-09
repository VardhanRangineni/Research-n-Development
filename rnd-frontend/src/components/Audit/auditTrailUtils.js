export const PRE_MANUFACTURING_INSTRUCTIONS = [
    'Environmental Monitoring: Temperature and RH shall be recorded in dispensing area during dispensing of raw material.',
    'Line Clearance: Take line clearance before starting activity from QC department. During line clearance ensure proper cleaning of area and equipment.',
    'Follow the dispensing procedure as per SOP.',
    'Warehouse person shall issue material and QC person shall verify material details during dispensing (AR No., labels, quantity, etc.). Production person shall verify quantity after receiving material.',
    'Verify AR No. before dispensing material. Record details of each material and put label with each material.',
    'During dispensing, store person and Production/QC person shall verify material details and weight of each dispensed material.',
    'Carry out all activities related to equipment cleaning and material handling strictly as per respective SOPs.',
    'Label all equipment and area with status and product label and display prominently.',
    'All raw material labels and equipment cleaning status labels shall be retained with the batch manufacturing record.',
    'Protective mask, surgical gloves and any other safety provisions must be followed.',
    'Any deviation from BMR must be done with prior approval of QC.'
];

export const parseFormulaItems = (formulaSnapshot) => {
    if (!formulaSnapshot) return [];
    try {
        const parsed = JSON.parse(formulaSnapshot);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const parseMeasurements = (measurementsJson) => {
    if (!measurementsJson) return {};
    try {
        const parsed = JSON.parse(measurementsJson);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
};

export const parseArrayJson = (jsonText) => {
    if (!jsonText) return [];
    try {
        const parsed = JSON.parse(jsonText);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const parseJsonMap = (jsonText) => {
    if (!jsonText) return {};
    try {
        const parsed = JSON.parse(jsonText);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
};

export const parseMasterFormulaInfo = (jsonText) => {
    if (!jsonText) return {};
    try {
        const parsed = JSON.parse(jsonText);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
};

export const normalizeMatchText = (value) => `${value || ''}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const hasMeaningfulValue = (value) => {
    const text = `${value || ''}`.trim();
    return !!text && text !== '-' && text !== '—';
};

export const resolveMfrIngredients = (infoIngredients, linkedBatch, ingredientMaster) => {
    const rows = Array.isArray(infoIngredients) && infoIngredients.length
        ? infoIngredients
        : parseFormulaItems(linkedBatch?.formulaSnapshot).map((item, index) => ({
            srNo: index + 1,
            erpCode: item?.erpCode || '—',
            ingredientName: item?.ingredientName || '—',
            inci: item?.inci || item?.inciName || '—',
            percentage: Number(item?.actualPercent || 0),
            vendors: item?.vendor || item?.vendors || '—',
            function: item?.function || '—'
        }));

    return rows.map((row, index) => {
        const erpCode = `${row.erpCode || ''}`.trim();
        const ingredientName = `${row.ingredientName || ''}`.trim();
        const inci = `${row.inci || ''}`.trim();

        let master = null;
        if (erpCode && erpCode !== '—') {
            master = (ingredientMaster || []).find(item => normalizeMatchText(item.erpCode) === normalizeMatchText(erpCode));
        }
        if (!master && ingredientName && ingredientName !== '—') {
            master = (ingredientMaster || []).find(item => normalizeMatchText(item.tradeName) === normalizeMatchText(ingredientName));
        }
        if (!master && ingredientName && ingredientName !== '—') {
            master = (ingredientMaster || []).find(item => normalizeMatchText(item.inciName) === normalizeMatchText(ingredientName));
        }
        if (!master && inci && inci !== '—') {
            master = (ingredientMaster || []).find(item => normalizeMatchText(item.inciName) === normalizeMatchText(inci));
        }
        if (!master && inci && inci !== '—') {
            master = (ingredientMaster || []).find(item => normalizeMatchText(item.tradeName) === normalizeMatchText(inci));
        }

        const resolvedErpCode = hasMeaningfulValue(row.erpCode) ? row.erpCode : (master?.erpCode || '—');
        const resolvedIngredientName = hasMeaningfulValue(row.ingredientName) ? row.ingredientName : (master?.tradeName || '—');
        const resolvedInci = hasMeaningfulValue(row.inci) ? row.inci : (master?.inciName || '—');
        const resolvedVendors = hasMeaningfulValue(row.vendors) ? row.vendors : (master?.supplierName || '—');
        const resolvedFunction = hasMeaningfulValue(row.function) ? row.function : (master?.function || '—');

        return {
            srNo: row.srNo || index + 1,
            erpCode: resolvedErpCode,
            ingredientName: resolvedIngredientName,
            inci: resolvedInci,
            percentage: Number(row.percentage || row.actualPercent || 0),
            vendors: resolvedVendors,
            function: resolvedFunction
        };
    });
};

export const getObservationKey = (condition, interval) => `${condition}__${interval}`;

export const isInitialIntervalLabel = (label) => `${label || ''}`.trim().toLowerCase() === 'initial';

export const getIntervalDueDate = (initialObservedOn, intervalLabel) => {
    if (!initialObservedOn || isInitialIntervalLabel(intervalLabel)) return null;

    const normalized = `${intervalLabel || ''}`.trim().toLowerCase();
    const parts = normalized.split(/\s+/);
    if (parts.length < 2) return null;

    const amount = Number(parts[0]);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const base = new Date(initialObservedOn);
    if (Number.isNaN(base.getTime())) return null;

    const unit = parts[1];
    if (unit.startsWith('day')) {
        base.setDate(base.getDate() + amount);
        return base.toISOString().split('T')[0];
    }

    if (unit.startsWith('month')) {
        base.setMonth(base.getMonth() + amount);
        return base.toISOString().split('T')[0];
    }

    return null;
};

export const formatDate = (value) => {
    if (!value) return '';
    const raw = `${value}`.trim();
    if (!raw) return '';

    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;

    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
};

export const parseMeasurementDisplay = (rawValue) => {
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        const normalized = `${rawValue.status || ''}`.trim().toUpperCase();
        const value = `${rawValue.value || ''}`.trim();
        return {
            status: ['PASS', 'FAIL', 'NA'].includes(normalized) ? normalized : '',
            value
        };
    }

    const text = `${rawValue || ''}`.trim();
    if (!text) return { status: '', value: '' };

    const parts = text.split('::');
    if (parts.length > 1) {
        const status = (parts[0] || '').trim().toUpperCase();
        const value = parts.slice(1).join('::').trim();
        return {
            status: ['PASS', 'FAIL', 'NA'].includes(status) ? status : '',
            value
        };
    }

    const candidate = text.toUpperCase();
    if (['PASS', 'FAIL', 'NA'].includes(candidate)) {
        return { status: candidate, value: '' };
    }

    return { status: '', value: text };
};

export const toMeasurementText = (measurement) => {
    const status = (measurement?.status || '').trim().toUpperCase();
    const value = (measurement?.value || '').trim();

    if (status === 'PASS' || status === 'FAIL') {
        return value ? `\n${value}` : '';
    }

    if (status === 'NA' && value) {
        return value;
    }

    return value || '—';
};

export const sanitizeFileName = (value, fallback) => {
    const cleaned = `${value || ''}`
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned || fallback;
};
