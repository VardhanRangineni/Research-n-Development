import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Card, Spinner, Button } from 'react-bootstrap';
import { MdArrowBack, MdAdd } from 'react-icons/md';
import { projectsService } from '../../services/projects.service';
import { benchmarkService } from '../../services/benchmark.service';
import { batchFormulaService } from '../../services/batch-formula.service';
import { stabilityService } from '../../services/stability.service';
import { authService } from '../../services/auth.service';
import StabilityProtocolModal from './modals/StabilityProtocolModal';
import StabilityStatusPickerModal from './modals/StabilityStatusPickerModal';
import StabilityPassInfoModal from './modals/StabilityPassInfoModal';
import BatchFormulaModal from './modals/BatchFormulaModal';
import BatchDetailsModal from './modals/BatchDetailsModal';
import AppDialog from '../Common/AppDialog';
import ProjectInfoCard from './project-details/ProjectInfoCard';
import BatchSamplingCard from './project-details/BatchSamplingCard';
import StabilityTestingCard from './project-details/StabilityTestingCard';
import {
    buildItemsFromBenchmark,
    buildItemsFromPreviousBatch,
    getNextBatchName,
    parseJsonArray,
    parseJsonMap,
    getObservationKey,
    parseCellMeasurement,
    buildCellMeasurement,
    getAggregateResultStatus,
    getBatchItems,
    getStatusBadge,
    formatObservedDate,
    buildIntervalLabel,
    hasInitialInterval
} from './project-details/projectDetails.utils';

const ProjectDetailsPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const isAdmin = currentUser?.role === 'HEAD' || currentUser?.role === 'MANAGER';
    const [project, setProject] = useState(null);
    const [benchmark, setBenchmark] = useState(null);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);

    const [formData, setFormData] = useState({
        batchName: '',
        targetBatchSize: 100,
        items: []
    });

    const [remarkText, setRemarkText] = useState('');
    const [pendingDecision, setPendingDecision] = useState({ open: false, batch: null, status: '' });
    const [dialogInfo, setDialogInfo] = useState({ show: false, title: '', message: '' });
    const [saving, setSaving] = useState(false);

    const [stabilityProtocols, setStabilityProtocols] = useState([]);
    const [observationsByProtocol, setObservationsByProtocol] = useState({});
    const [stabilityLoading, setStabilityLoading] = useState(false);
    const [stabilityPagination, setStabilityPagination] = useState({ page: 0, size: 5, totalPages: 0, totalElements: 0, first: true, last: true });
    const [showProtocolModal, setShowProtocolModal] = useState(false);
    const [protocolDraft, setProtocolDraft] = useState({
        id: null,
        batchFormulaId: '',
        protocolName: '',
        conditions: [],
        intervals: [],
        parameters: [],
        parameterReferences: {},
        conditionInput: '',
        intervalValue: '',
        intervalUnit: 'Month',
        parameterInput: '',
        parameterReferenceInput: ''
    });
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showPassInfoModal, setShowPassInfoModal] = useState(false);
    const [passProtocolId, setPassProtocolId] = useState(null);
    const [passInfo, setPassInfo] = useState({
        companyName: '',
        dateOfIssue: '',
        brandName: '',
        revisionNo: '1',
        productName: '',
        revisionDate: '',
        shelfLife: '',
        issuedBy: currentUser?.username || '',
        mrfNo: '',
        docNo: '',
        reasonForRevision: ''
    });
    const [statusPicker, setStatusPicker] = useState({
        protocolId: null,
        protocolName: '',
        conditionLabel: '',
        intervalLabel: '',
        parameterName: '',
        selectedStatus: '',
        measurementValue: ''
    });

    const resolveBatchSaveErrorMessage = (error) => {
        const rawMessage = `${error?.message || ''}`.trim();
        const normalized = rawMessage.toLowerCase();

        if (
            normalized.includes('batch name already exists')
            || normalized.includes('uk_batch_formulas_batch_name')
            || (normalized.includes('duplicate') && normalized.includes('batch'))
            || (normalized.includes('unique') && normalized.includes('batch'))
        ) {
            return 'Batch name already exists. Please change the batch name and try again.';
        }

        return rawMessage || 'Failed to save formula.';
    };

    useEffect(() => {
        loadProject();
    }, [projectId]);

    const loadProject = async () => {
        try {
            setLoading(true);
            const projectData = await projectsService.getById(projectId);
            setProject(projectData);

            const [batchData, benchmarkData] = await Promise.all([
                batchFormulaService.getAllByProject(projectId),
                projectData?.benchmarkId
                    ? benchmarkService.getByBenchmarkId(projectData.benchmarkId).catch((error) => {
                        console.error('Failed to load benchmark details:', error);
                        return null;
                    })
                    : null
            ]);

            setBatches(Array.isArray(batchData) ? batchData : []);
            setBenchmark(benchmarkData || null);
            await loadStabilityData(projectId, 0);
        } catch (error) {
            console.error('Failed to load project:', error);
            setProject(null);
            setDialogInfo({
                show: true,
                title: 'Load Failed',
                message: error.message || 'Unable to load project details.'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadStabilityData = async (projectRefId, page = stabilityPagination.page) => {
        try {
            setStabilityLoading(true);
            const protocolPage = await stabilityService.getProtocolsPage(projectRefId, { page, size: stabilityPagination.size });
            const safeProtocols = Array.isArray(protocolPage?.content) ? protocolPage.content : [];
            setStabilityProtocols(safeProtocols);
            setStabilityPagination((prev) => ({
                ...prev,
                page: protocolPage?.page ?? page,
                totalPages: protocolPage?.totalPages ?? 0,
                totalElements: protocolPage?.totalElements ?? safeProtocols.length,
                first: protocolPage?.first ?? page === 0,
                last: protocolPage?.last ?? true
            }));

            const observationsEntries = await Promise.all(
                safeProtocols.map(async (protocol) => {
                    const observations = await stabilityService.getObservationsPage(projectRefId, protocol.id, { page: 0, size: 500 });
                    const safeObservations = Array.isArray(observations?.content) ? observations.content : [];
                    const observationMap = safeObservations.reduce((acc, observation) => {
                        const key = getObservationKey(observation.conditionLabel, observation.intervalLabel);
                        acc[key] = observation;
                        return acc;
                    }, {});
                    return [protocol.id, observationMap];
                })
            );

            setObservationsByProtocol(Object.fromEntries(observationsEntries));
        } catch (error) {
            setStabilityProtocols([]);
            setObservationsByProtocol({});
            setDialogInfo({
                show: true,
                title: 'Stability Load Failed',
                message: error.message || 'Unable to load stability protocols.'
            });
        } finally {
            setStabilityLoading(false);
        }
    };

    const openCreateModal = () => {
        const latestBatch = (batches && batches.length > 0) ? batches[0] : null;
        const previousItems = buildItemsFromPreviousBatch(latestBatch);
        const items = previousItems.length ? previousItems : buildItemsFromBenchmark(benchmark);
        const initialBatchSize = latestBatch?.targetBatchSize ? Number(latestBatch.targetBatchSize) : 100;
        const generatedBatchName = getNextBatchName(project, batches);

        setFormData({
            batchName: generatedBatchName,
            targetBatchSize: initialBatchSize,
            items: recalculateItems(items, initialBatchSize)
        });
        setShowCreateModal(true);
    };

    const recalculateItems = (items, targetBatchSize) => {
        return items.map(item => ({
            ...item,
            actualPercent: targetBatchSize > 0 ? ((Number(item.weight) || 0) / Number(targetBatchSize)) * 100 : 0
        }));
    };

    const handleWeightChange = (index, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index] = {
            ...updatedItems[index],
            weight: value
        };

        setFormData(prev => ({
            ...prev,
            items: recalculateItems(updatedItems, prev.targetBatchSize)
        }));
    };

    const handleVolumeMlChange = (index, value) => {
        const updatedItems = [...formData.items];
        const item = updatedItems[index];
        const sg = Number(item.specificGravity) || 1;
        const volumeMl = Number(value) || 0;
        updatedItems[index] = {
            ...item,
            volumeMl: value,
            weight: Number((volumeMl * sg).toFixed(4))
        };
        setFormData(prev => ({
            ...prev,
            items: recalculateItems(updatedItems, prev.targetBatchSize)
        }));
    };

    const handleTargetBatchSizeChange = (value) => {
        const targetBatchSize = Number(value) || 0;

        const recalculatedItems = formData.items.map(item => {
            const targetPercent = Number(item.targetPercent) || 0;
            const weight = (targetPercent / 100) * targetBatchSize;
            const updatedItem = {
                ...item,
                weight: Number(weight.toFixed(4))
            };
            if (item.specificGravity) {
                updatedItem.volumeMl = Number((weight / Number(item.specificGravity)).toFixed(4));
            }
            return updatedItem;
        });

        setFormData(prev => ({
            ...prev,
            targetBatchSize,
            items: recalculateItems(recalculatedItems, targetBatchSize)
        }));
    };

    const handleSaveFormula = async () => {
        if (!formData.batchName.trim()) {
            setDialogInfo({ show: true, title: 'Validation', message: 'Batch name is required.' });
            return;
        }

        if (!Number(formData.targetBatchSize) || Number(formData.targetBatchSize) <= 0) {
            setDialogInfo({ show: true, title: 'Validation', message: 'Target batch size must be greater than zero.' });
            return;
        }

        if (!formData.items.length) {
            setDialogInfo({ show: true, title: 'Validation', message: 'No ingredient data available for this batch formula.' });
            return;
        }

        try {
            setSaving(true);
            const currentTotalWeight = formData.items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

            await batchFormulaService.create(projectId, {
                batchName: formData.batchName.trim(),
                targetBatchSize: Number(formData.targetBatchSize) || 0,
                currentTotalWeight,
                formulaSnapshot: JSON.stringify(formData.items)
            });

            setShowCreateModal(false);
            await loadProject();
        } catch (error) {
            setDialogInfo({
                show: true,
                title: 'Save Failed',
                message: resolveBatchSaveErrorMessage(error)
            });
        } finally {
            setSaving(false);
        }
    };

    const openBatchReadOnly = (batch) => {
        setSelectedBatch(batch);
        setRemarkText(batch?.remark || '');
        setShowViewModal(true);
    };

    const handleSaveRemark = async () => {
        if (!selectedBatch) return;
        if (!remarkText.trim()) {
            setDialogInfo({ show: true, title: 'Validation', message: 'Please add a remark before saving.' });
            return;
        }

        try {
            setSaving(true);
            const updated = await batchFormulaService.updateRemark(projectId, selectedBatch.id, remarkText.trim());
            setSelectedBatch(updated);
            await loadProject();
            setShowViewModal(false);
            setDialogInfo({ show: true, title: 'Remark Saved', message: 'Batch remark saved successfully.' });
        } catch (error) {
            setDialogInfo({ show: true, title: 'Save Failed', message: error.message || 'Failed to save remark.' });
        } finally {
            setSaving(false);
        }
    };

    const requestDecision = (batch, status) => {
        if (!isAdmin) return;

        if (!batch?.remark || !batch.remark.trim()) {
            setDialogInfo({
                show: true,
                title: 'Remark Required',
                message: 'Please open this batch, add a remark, and save it before approving or rejecting.'
            });
            return;
        }

        setPendingDecision({ open: true, batch, status });
    };

    const approvedBatches = batches.filter(batch => (batch?.status || '').toUpperCase() === 'APPROVED');

    const openCreateProtocolModal = () => {
        if (approvedBatches.length === 0) {
            setDialogInfo({
                show: true,
                title: 'Approved Batch Required',
                message: 'Create a stability protocol only after at least one batch is approved.'
            });
            return;
        }

        setProtocolDraft({
            id: null,
            batchFormulaId: approvedBatches[0].id,
            protocolName: `${project?.projectName || 'Project'} Stability`,
            conditions: ['25°C', '40°C'],
            intervals: ['Initial', '1 Month', '3 Month', '6 Month', '12 Month'],
            parameters: ['Texture', 'Appearance', 'Colour', 'Smell'],
            parameterReferences: {
                Texture: '',
                Appearance: '',
                Colour: '',
                Smell: ''
            },
            conditionInput: '',
            intervalValue: '',
            intervalUnit: 'Month',
            parameterInput: '',
            parameterReferenceInput: ''
        });
        setShowProtocolModal(true);
    };

    const openEditProtocolModal = (protocol) => {
        const parameters = parseJsonArray(protocol.parametersJson);
        const parsedReferences = parseJsonMap(protocol.parameterReferencesJson);
        const parameterReferences = parameters.reduce((acc, parameter) => {
            const exact = parsedReferences[parameter];
            const fallbackKey = Object.keys(parsedReferences).find(
                key => `${key || ''}`.trim().toLowerCase() === `${parameter || ''}`.trim().toLowerCase()
            );
            acc[parameter] = `${exact ?? (fallbackKey ? parsedReferences[fallbackKey] : '') ?? ''}`.trim();
            return acc;
        }, {});

        setProtocolDraft({
            id: protocol.id,
            batchFormulaId: protocol.batchFormulaRefId,
            protocolName: protocol.protocolName || '',
            conditions: parseJsonArray(protocol.conditionsJson),
            intervals: parseJsonArray(protocol.intervalsJson),
            parameters,
            parameterReferences,
            conditionInput: '',
            intervalValue: '',
            intervalUnit: 'Month',
            parameterInput: '',
            parameterReferenceInput: ''
        });
        setShowProtocolModal(true);
    };

    const addDraftValue = (listKey, inputOrValue, directValue = false) => {
        const rawValue = directValue ? inputOrValue : (protocolDraft[inputOrValue] || '');
        let cleanValue = rawValue.trim();

        if (listKey === 'conditions' && /^\d+(\.\d+)?$/.test(cleanValue)) {
            cleanValue = `${cleanValue}°C`;
        }

        if (!cleanValue) return;

        setProtocolDraft(prev => {
            const exists = prev[listKey].some(item => item.toLowerCase() === cleanValue.toLowerCase());
            if (exists) {
                return directValue ? prev : { ...prev, [inputOrValue]: '' };
            }
            return {
                ...prev,
                [listKey]: [...prev[listKey], cleanValue],
                ...(directValue ? {} : { [inputOrValue]: '' })
            };
        });
    };

    const addDraftInterval = () => {
        const nextInterval = buildIntervalLabel(protocolDraft.intervalValue, protocolDraft.intervalUnit);
        if (!nextInterval) {
            setDialogInfo({
                show: true,
                title: 'Validation',
                message: 'Enter a valid interval number and unit (Day/Month).'
            });
            return;
        }

        addDraftValue('intervals', nextInterval, true);
        setProtocolDraft(prev => ({
            ...prev,
            intervalValue: ''
        }));
    };

    const removeDraftValue = (listKey, valueToRemove) => {
        setProtocolDraft(prev => {
            const nextState = {
                ...prev,
                [listKey]: prev[listKey].filter(item => item !== valueToRemove)
            };

            if (listKey === 'parameters') {
                const nextReferences = { ...(prev.parameterReferences || {}) };
                delete nextReferences[valueToRemove];
                nextState.parameterReferences = nextReferences;
            }

            return nextState;
        });
    };

    const addDraftParameter = () => {
        const parameterName = (protocolDraft.parameterInput || '').trim();
        const expectedReference = (protocolDraft.parameterReferenceInput || '').trim();

        if (!parameterName) return;

        setProtocolDraft(prev => {
            const exists = (prev.parameters || []).some(item => item.toLowerCase() === parameterName.toLowerCase());
            if (exists) {
                return {
                    ...prev,
                    parameterInput: '',
                    parameterReferenceInput: ''
                };
            }

            return {
                ...prev,
                parameters: [...(prev.parameters || []), parameterName],
                parameterReferences: {
                    ...(prev.parameterReferences || {}),
                    [parameterName]: expectedReference
                },
                parameterInput: '',
                parameterReferenceInput: ''
            };
        });
    };

    const updateDraftParameterReference = (parameter, value) => {
        setProtocolDraft(prev => ({
            ...prev,
            parameterReferences: {
                ...(prev.parameterReferences || {}),
                [parameter]: value
            }
        }));
    };

    const handleSaveProtocol = async () => {
        const protocolName = (protocolDraft.protocolName || '').trim();
        const conditions = (protocolDraft.conditions || []).map(item => item.trim()).filter(Boolean);
        const intervals = (protocolDraft.intervals || []).map(item => item.trim()).filter(Boolean);
        const parameters = (protocolDraft.parameters || []).map(item => item.trim()).filter(Boolean);
        const parameterReferences = parameters.reduce((acc, parameter) => {
            acc[parameter] = `${protocolDraft.parameterReferences?.[parameter] || ''}`.trim();
            return acc;
        }, {});

        if (!protocolName) {
            setDialogInfo({ show: true, title: 'Validation', message: 'Protocol name is required.' });
            return;
        }

        if (!conditions.length || !intervals.length || !parameters.length) {
            setDialogInfo({
                show: true,
                title: 'Validation',
                message: 'Conditions, intervals and parameters must each have at least one value.'
            });
            return;
        }

        if (!hasInitialInterval(intervals)) {
            setDialogInfo({
                show: true,
                title: 'Validation',
                message: 'Initial interval is mandatory for stability protocol.'
            });
            return;
        }

        try {
            setSaving(true);
            if (protocolDraft.id) {
                await stabilityService.updateProtocolConfig(projectId, protocolDraft.id, {
                    protocolName,
                    conditions,
                    intervals,
                    parameters,
                    parameterReferences
                });
            } else {
                if (!protocolDraft.batchFormulaId) {
                    setDialogInfo({ show: true, title: 'Validation', message: 'Select an approved batch.' });
                    return;
                }

                await stabilityService.createProtocol(projectId, {
                    batchFormulaId: Number(protocolDraft.batchFormulaId),
                    protocolName,
                    conditions,
                    intervals,
                    parameters,
                    parameterReferences
                });
            }

            setShowProtocolModal(false);
            await loadStabilityData(projectId, stabilityPagination.page);
        } catch (error) {
            setDialogInfo({ show: true, title: 'Save Failed', message: error.message || 'Unable to save protocol.' });
        } finally {
            setSaving(false);
        }
    };

    const openStatusPicker = (protocol, conditionLabel, intervalLabel, parameterName) => {
        const key = getObservationKey(conditionLabel, intervalLabel);
        const observation = observationsByProtocol?.[protocol.id]?.[key] || null;
        const measurements = observation ? parseJsonMap(observation.measurementsJson) : {};
        const parsed = parseCellMeasurement(measurements[parameterName]);

        setStatusPicker({
            protocolId: protocol.id,
            protocolName: protocol.protocolName,
            conditionLabel,
            intervalLabel,
            parameterName,
            selectedStatus: parsed.status,
            measurementValue: parsed.value
        });
        setShowStatusModal(true);
    };

    const saveCellStatus = async (nextStatus, measurementValue) => {
        if (!statusPicker.protocolId) return;

        const key = getObservationKey(statusPicker.conditionLabel, statusPicker.intervalLabel);
        const existingObservation = observationsByProtocol?.[statusPicker.protocolId]?.[key] || null;
        const existingMeasurements = existingObservation ? parseJsonMap(existingObservation.measurementsJson) : {};
        const normalizedExistingMeasurements = Object.entries(existingMeasurements).reduce((acc, [parameter, rawValue]) => {
            const parsed = parseCellMeasurement(rawValue);
            acc[parameter] = buildCellMeasurement(parsed.status || 'NA', parsed.value || '');
            return acc;
        }, {});
        const updatedMeasurements = {
            ...normalizedExistingMeasurements,
            [statusPicker.parameterName]: buildCellMeasurement(nextStatus, measurementValue)
        };

        try {
            setSaving(true);
            const savedObservation = await stabilityService.upsertObservation(projectId, statusPicker.protocolId, {
                conditionLabel: statusPicker.conditionLabel,
                intervalLabel: statusPicker.intervalLabel,
                measurements: updatedMeasurements,
                resultStatus: getAggregateResultStatus(updatedMeasurements),
                initialWeight: null,
                currentWeight: null,
                note: existingObservation?.note || null,
                observedOn: new Date().toISOString().split('T')[0]
            });

            setShowStatusModal(false);
            setObservationsByProtocol(prev => {
                const currentProtocolMap = prev?.[statusPicker.protocolId] || {};
                const nextObservation = savedObservation || {
                    ...existingObservation,
                    protocolRefId: statusPicker.protocolId,
                    conditionLabel: statusPicker.conditionLabel,
                    intervalLabel: statusPicker.intervalLabel,
                    measurementsJson: JSON.stringify(updatedMeasurements),
                    resultStatus: getAggregateResultStatus(updatedMeasurements),
                    observedOn: new Date().toISOString().split('T')[0]
                };

                return {
                    ...prev,
                    [statusPicker.protocolId]: {
                        ...currentProtocolMap,
                        [key]: nextObservation
                    }
                };
            });
        } catch (error) {
            setDialogInfo({ show: true, title: 'Save Failed', message: error.message || 'Unable to save status.' });
        } finally {
            setSaving(false);
        }
    };

    const applySimpleStabilityResult = async (protocol, result) => {
        if (!isAdmin || !protocol?.id) return;

        if (result === 'PASS') {
            setPassProtocolId(protocol.id);
            setPassInfo(prev => ({
                ...prev,
                brandName: project?.projectName || prev.brandName,
                productName: project?.projectName || prev.productName,
                reasonForRevision: ''
            }));
            setShowPassInfoModal(true);
            return;
        }

        if (result === 'FAIL') {
            const reason = window.prompt(`Reason for FAIL (${protocol.protocolName})`, '') || '';
            if (!reason.trim()) {
                setDialogInfo({ show: true, title: 'Reason Required', message: 'Please provide reason for FAIL.' });
                return;
            }

            const confirmed = window.confirm(`Mark stability as FAIL and clear this table for ${protocol.protocolName}?`);
            if (!confirmed) return;

            try {
                setSaving(true);
                const response = await stabilityService.applySimpleProtocolResult(projectId, protocol.id, {
                    result,
                    reason: reason.trim()
                });
                await loadProject();
                setDialogInfo({
                    show: true,
                    title: `${protocol.protocolName}: ${result}`,
                    message: response?.message || 'Marked as FAIL and cleared this stability table.'
                });
            } catch (error) {
                setDialogInfo({
                    show: true,
                    title: 'Update Failed',
                    message: error.message || 'Unable to apply stability result.'
                });
            } finally {
                setSaving(false);
            }
            return;
        }

    };

    const handlePassInfoSubmit = async (e) => {
        e.preventDefault();
        if (!passProtocolId) return;

        try {
            setSaving(true);
            const protocol = stabilityProtocols.find(item => item.id === passProtocolId);
            const response = await stabilityService.applySimpleProtocolResult(projectId, passProtocolId, {
                result: 'PASS',
                reason: (passInfo.reasonForRevision || '').trim(),
                companyName: passInfo.companyName,
                dateOfIssue: passInfo.dateOfIssue,
                brandName: passInfo.brandName,
                revisionNo: passInfo.revisionNo,
                productName: passInfo.productName,
                revisionDate: passInfo.revisionDate,
                shelfLife: passInfo.shelfLife,
                issuedBy: passInfo.issuedBy,
                mrfNo: passInfo.mrfNo,
                docNo: passInfo.docNo
            });
            await loadProject();
            setShowPassInfoModal(false);
            setPassProtocolId(null);
            setDialogInfo({
                show: true,
                title: `${protocol?.protocolName || 'Protocol'}: PASS`,
                message: response?.message || 'Marked as PASS.'
            });
        } catch (error) {
            setDialogInfo({
                show: true,
                title: 'Update Failed',
                message: error.message || 'Unable to apply stability result.'
            });
        } finally {
            setSaving(false);
        }
    };

    const applyDecision = async () => {
        if (!pendingDecision.batch) return;

        try {
            setSaving(true);
            await batchFormulaService.applyDecision(
                projectId,
                pendingDecision.batch.id,
                pendingDecision.status,
                pendingDecision.batch.remark
            );
            setPendingDecision({ open: false, batch: null, status: '' });
            await loadProject();
            setDialogInfo({
                show: true,
                title: 'Batch Updated',
                message: `Batch has been ${pendingDecision.status === 'APPROVED' ? 'approved' : 'rejected'}.`
            });
        } catch (error) {
            setDialogInfo({ show: true, title: 'Action Failed', message: error.message || 'Unable to update batch status.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container fluid className="p-4">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                    <Button type="button" variant="link" className="text-muted p-0" onClick={() => navigate('/projects')}>
                        <MdArrowBack size={24} />
                    </Button>
                    <h2 className="fw-bold m-0">Project Details</h2>
                </div>

                <Button type="button"
                    variant="danger"
                    className="d-flex align-items-center gap-2"
                    onClick={openCreateModal}
                    disabled={!project || (!benchmark && batches.length === 0)}
                >
                    <MdAdd size={18} /> Create a New Batch Formula
                </Button>
            </div>

            {loading ? (
                <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : !project ? (
                <Card className="border-0 shadow-sm">
                    <Card.Body className="text-center py-5 text-muted">Project not found.</Card.Body>
                </Card>
            ) : (
                <>
                    <ProjectInfoCard project={project} />

                    <BatchSamplingCard
                        batches={batches}
                        isAdmin={isAdmin}
                        onOpenBatch={openBatchReadOnly}
                        onRequestDecision={requestDecision}
                        getStatusBadge={getStatusBadge}
                    />

                    <StabilityTestingCard
                        stabilityProtocols={stabilityProtocols}
                        stabilityLoading={stabilityLoading}
                        stabilityPagination={stabilityPagination}
                        batches={batches}
                        isAdmin={isAdmin}
                        saving={saving}
                        observationsByProtocol={observationsByProtocol}
                        onCreateProtocol={openCreateProtocolModal}
                        onEditProtocol={openEditProtocolModal}
                        onSimplePass={(protocol) => applySimpleStabilityResult(protocol, 'PASS')}
                        onSimpleFail={(protocol) => applySimpleStabilityResult(protocol, 'FAIL')}
                        onOpenStatusPicker={openStatusPicker}
                        parseJsonArray={parseJsonArray}
                        parseJsonMap={parseJsonMap}
                        parseCellMeasurement={parseCellMeasurement}
                        getObservationKey={getObservationKey}
                        formatObservedDate={formatObservedDate}
                        onPreviousPage={() => loadStabilityData(projectId, Math.max(stabilityPagination.page - 1, 0))}
                        onNextPage={() => loadStabilityData(projectId, stabilityPagination.page + 1)}
                    />
                </>
            )}

            <StabilityProtocolModal
                show={showProtocolModal}
                onHide={() => setShowProtocolModal(false)}
                saving={saving}
                protocolDraft={protocolDraft}
                setProtocolDraft={setProtocolDraft}
                approvedBatches={approvedBatches}
                onAddDraftValue={addDraftValue}
                onAddInterval={addDraftInterval}
                onRemoveDraftValue={removeDraftValue}
                onAddDraftParameter={addDraftParameter}
                onUpdateDraftParameterReference={updateDraftParameterReference}
                onSaveProtocol={handleSaveProtocol}
            />

            <StabilityStatusPickerModal
                show={showStatusModal}
                onHide={() => setShowStatusModal(false)}
                saving={saving}
                statusPicker={statusPicker}
                onPickStatus={saveCellStatus}
            />

            <StabilityPassInfoModal
                show={showPassInfoModal}
                onHide={() => {
                    setShowPassInfoModal(false);
                    setPassProtocolId(null);
                }}
                saving={saving}
                values={passInfo}
                onChange={(key, value) => setPassInfo(prev => ({ ...prev, [key]: value }))}
                onSubmit={handlePassInfoSubmit}
            />

            <BatchFormulaModal
                show={showCreateModal}
                onHide={() => setShowCreateModal(false)}
                saving={saving}
                formData={formData}
                onBatchNameChange={(value) => setFormData(prev => ({ ...prev, batchName: value }))}
                onTargetBatchSizeChange={handleTargetBatchSizeChange}
                onWeightChange={handleWeightChange}
                onVolumeMlChange={handleVolumeMlChange}
                onSave={handleSaveFormula}
            />

            <BatchDetailsModal
                show={showViewModal}
                onHide={() => setShowViewModal(false)}
                saving={saving}
                selectedBatch={selectedBatch}
                remarkText={remarkText}
                onRemarkChange={setRemarkText}
                onSaveRemark={handleSaveRemark}
                getBatchItems={getBatchItems}
            />

            <AppDialog
                show={pendingDecision.open}
                title={pendingDecision.status === 'APPROVED' ? 'Approve Batch' : 'Reject Batch'}
                message={`Are you sure you want to ${pendingDecision.status === 'APPROVED' ? 'approve' : 'reject'} this batch?`}
                confirmText={pendingDecision.status === 'APPROVED' ? 'Approve' : 'Reject'}
                confirmVariant={pendingDecision.status === 'APPROVED' ? 'success' : 'danger'}
                showCancel
                onConfirm={applyDecision}
                onClose={() => setPendingDecision({ open: false, batch: null, status: '' })}
                busy={saving}
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

export default ProjectDetailsPage;
