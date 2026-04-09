const getProjectInitials = (projectName) => {
    if (!projectName || !projectName.trim()) return 'BATCH';

    const initials = projectName
        .trim()
        .split(/\s+/)
        .map(word => (word[0] || '').toUpperCase())
        .join('')
        .replace(/[^A-Z0-9]/g, '');

    return initials || 'BATCH';
};

const toProjectCodePrefix = (project) => {
    const rawCode = `${project?.projectCode || ''}`.trim().toUpperCase();
    if (!rawCode) return '';

    const compactCode = rawCode.replace(/[^A-Z0-9]/g, '');
    return compactCode || '';
};

const toProjectNameFingerprint = (projectName) => {
    const normalized = `${projectName || ''}`
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

    if (!normalized) return '00';

    let hash = 0;
    for (let i = 0; i < normalized.length; i += 1) {
        hash = (hash * 31 + normalized.charCodeAt(i)) % 1296;
    }

    return hash.toString(36).toUpperCase().padStart(2, '0');
};

const getProjectBatchPrefix = (projectOrName) => {
    if (projectOrName && typeof projectOrName === 'object') {
        const projectCodePrefix = toProjectCodePrefix(projectOrName);
        if (projectCodePrefix) return projectCodePrefix;

        const initials = getProjectInitials(projectOrName.projectName);
        return `${initials}${toProjectNameFingerprint(projectOrName.projectName)}`;
    }

    const initials = getProjectInitials(projectOrName);
    return `${initials}${toProjectNameFingerprint(projectOrName)}`;
};

export const buildItemsFromBenchmark = (benchmark) => {
    if (!benchmark?.ingredientsList) return [];

    const defaultBatchSize = 100;

    try {
        const parsed = JSON.parse(benchmark.ingredientsList);
        if (!Array.isArray(parsed)) return [];

        return parsed.map((ingredient) => {
            const targetPercent = Number(ingredient.unit === '%' ? ingredient.quantity : 0) || 0;
            const initialWeight = (targetPercent / 100) * defaultBatchSize;
            const sg = ingredient.specificGravity != null ? Number(ingredient.specificGravity) : null;
            const volumeMl = sg ? Number((initialWeight / sg).toFixed(4)) : null;

            return {
                ingredientName: ingredient.ingredientName || 'Ingredient',
                targetPercent,
                weight: Number(initialWeight.toFixed(4)),
                actualPercent: targetPercent,
                specificGravity: sg,
                volumeMl
            };
        });
    } catch {
        return [];
    }
};

export const buildItemsFromPreviousBatch = (batch) => {
    if (!batch?.formulaSnapshot) return [];

    try {
        const parsed = JSON.parse(batch.formulaSnapshot);
        if (!Array.isArray(parsed)) return [];

        return parsed.map((item) => ({
            ingredientName: item.ingredientName || 'Ingredient',
            targetPercent: Number(item.targetPercent) || 0,
            weight: Number(item.weight) || 0,
            actualPercent: Number(item.actualPercent) || 0,
            specificGravity: item.specificGravity != null ? Number(item.specificGravity) : null,
            volumeMl: item.volumeMl != null ? Number(item.volumeMl) : null
        }));
    } catch {
        return [];
    }
};

export const getNextBatchName = (projectOrName, existingBatches) => {
    const prefix = getProjectBatchPrefix(projectOrName);
    const sequencePattern = new RegExp(`^${prefix}-(\\d+)$`);

    let maxSequence = 0;
    (existingBatches || []).forEach(batch => {
        const name = batch?.batchName || '';
        const match = name.match(sequencePattern);
        if (!match) return;

        const value = Number(match[1]);
        if (Number.isFinite(value) && value > maxSequence) {
            maxSequence = value;
        }
    });

    return `${prefix}-${String(maxSequence + 1).padStart(2, '0')}`;
};

export const parseJsonArray = (value) => {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const parseJsonMap = (value) => {
    try {
        const parsed = JSON.parse(value || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
};

export const getObservationKey = (conditionLabel, intervalLabel) => `${conditionLabel}__${intervalLabel}`;

export const isInitialIntervalLabel = (label) => `${label || ''}`.trim().toLowerCase() === 'initial';

export const hasInitialInterval = (intervals) => (intervals || []).some(interval => isInitialIntervalLabel(interval));

export const buildIntervalLabel = (value, unit) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return '';

    const cleanUnit = `${unit || ''}`.trim().toLowerCase();
    if (cleanUnit !== 'day' && cleanUnit !== 'month') return '';

    const normalizedUnit = amount === 1 ? cleanUnit : `${cleanUnit}s`;
    return `${amount} ${normalizedUnit.charAt(0).toUpperCase()}${normalizedUnit.slice(1)}`;
};

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

export const formatObservedDate = (value) => {
    if (!value) return '';
    const text = `${value}`.trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return text;

    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
};

export const parseCellMeasurement = (rawValue) => {
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        const status = `${rawValue.status || ''}`.trim().toUpperCase();
        const value = `${rawValue.value || ''}`.trim();
        return {
            status: ['PASS', 'FAIL', 'NA'].includes(status) ? status : '',
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

    const normalized = text.toUpperCase();
    if (['PASS', 'FAIL', 'NA'].includes(normalized)) {
        return { status: normalized, value: '' };
    }

    return { status: '', value: text };
};

export const buildCellMeasurement = (status, value) => {
    const cleanStatus = `${status || ''}`.trim().toUpperCase();
    const cleanValue = `${value || ''}`.trim();
    return {
        status: cleanStatus || 'NA',
        value: cleanValue
    };
};

export const getAggregateResultStatus = (measurements) => {
    const values = Object.values(measurements || {})
        .map(value => parseCellMeasurement(value).status)
        .filter(Boolean);

    if (values.includes('FAIL')) return 'FAIL';
    if (values.includes('PASS')) return 'PASS';
    return 'NA';
};

export const getBatchItems = (batch) => {
    if (!batch?.formulaSnapshot) return [];
    try {
        const parsed = JSON.parse(batch.formulaSnapshot);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const getStatusBadge = (status) => {
    if (status === 'APPROVED') return 'success';
    if (status === 'REJECTED') return 'danger';
    return 'secondary';
};
