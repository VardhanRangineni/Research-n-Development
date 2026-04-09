import { memo } from 'react';
import { Card, Table, Button } from 'react-bootstrap';
import { MdAdd, MdCheckCircle, MdClose, MdRemove } from 'react-icons/md';
import { getIntervalDueDate, isInitialIntervalLabel } from './projectDetails.utils';

const StabilityTestingCard = ({
    stabilityProtocols,
    stabilityLoading,
    stabilityPagination,
    batches,
    isAdmin,
    saving,
    observationsByProtocol,
    onCreateProtocol,
    onEditProtocol,
    onSimplePass,
    onSimpleFail,
    onOpenStatusPicker,
    parseJsonArray,
    parseJsonMap,
    parseCellMeasurement,
    getObservationKey,
    formatObservedDate,
    onPreviousPage,
    onNextPage
}) => (
    <Card className="border-0 shadow-sm mt-4">
        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="m-0 fw-semibold">Stability Testing</h5>
            <Button type="button" variant="primary" size="sm" onClick={onCreateProtocol}>
                <MdAdd size={16} className="me-1" /> New Protocol
            </Button>
        </Card.Header>
        <Card.Body>
            {stabilityLoading ? (
                <div className="text-muted">Loading stability protocols...</div>
            ) : stabilityProtocols.length === 0 ? (
                <div className="text-muted">No stability protocol created yet.</div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {stabilityProtocols.map(protocol => {
                        const isPassed = `${protocol?.status || ''}`.trim().toUpperCase() === 'PASSED';
                        const parameters = parseJsonArray(protocol.parametersJson);
                        const parameterReferences = parseJsonMap(protocol.parameterReferencesJson);
                        const conditions = parseJsonArray(protocol.conditionsJson);
                        const intervals = parseJsonArray(protocol.intervalsJson);
                        const linkedBatch = batches.find(batch => batch.id === protocol.batchFormulaRefId);

                        const getReferenceText = (parameter) => {
                            const exactMatch = parameterReferences[parameter];
                            if (exactMatch !== null && exactMatch !== undefined) {
                                return `${exactMatch}`.trim();
                            }

                            const lookupKey = Object.keys(parameterReferences).find(
                                key => `${key || ''}`.trim().toLowerCase() === `${parameter || ''}`.trim().toLowerCase()
                            );
                            if (!lookupKey) return '';
                            return `${parameterReferences[lookupKey] || ''}`.trim();
                        };

                        return (
                            <Card key={protocol.id} className="border">
                                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                                    <div>
                                        <div className="fw-semibold">{protocol.protocolName}</div>
                                        <div className="small text-muted">
                                            Batch: {linkedBatch?.batchName || `#${protocol.batchFormulaRefId}`}
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        {isAdmin && !isPassed && (
                                            <>
                                                <Button type="button"
                                                    variant="outline-success"
                                                    size="sm"
                                                    disabled={saving}
                                                    onClick={() => onSimplePass(protocol)}
                                                >
                                                    Pass
                                                </Button>
                                                <Button type="button"
                                                    variant="outline-danger"
                                                    size="sm"
                                                    disabled={saving}
                                                    onClick={() => onSimpleFail(protocol)}
                                                >
                                                    Fail
                                                </Button>
                                            </>
                                        )}
                                        <Button type="button" variant="outline-secondary" size="sm" onClick={() => onEditProtocol(protocol)}>
                                            Edit Protocol
                                        </Button>
                                    </div>
                                </Card.Header>
                                <Card.Body className="p-0 d-flex flex-column gap-3">
                                    {conditions.map((condition) => (
                                        <div key={`${protocol.id}-${condition}`}>
                                            <div className="px-3 pt-3 fw-semibold">{condition}</div>
                                            <Table bordered responsive className="m-0 align-middle">
                                                <thead className="bg-white text-muted">
                                                    <tr>
                                                        <th style={{ minWidth: 180 }}>Parameter</th>
                                                        <th className="text-center" style={{ minWidth: 180 }}>Reference</th>
                                                        {intervals.map(interval => {
                                                            const observationKey = getObservationKey(condition, interval);
                                                            const protocolObservations = observationsByProtocol?.[protocol.id] || {};
                                                            const observation = observationsByProtocol?.[protocol.id]?.[observationKey] || null;
                                                            const initialObservation = Object.values(protocolObservations).find(item => {
                                                                const sameCondition = `${item?.conditionLabel || ''}`.trim().toLowerCase() === `${condition}`.trim().toLowerCase();
                                                                return sameCondition && isInitialIntervalLabel(item?.intervalLabel);
                                                            });
                                                            const observedDateLabel = formatObservedDate(observation?.observedOn);
                                                            const dueDate = getIntervalDueDate(initialObservation?.observedOn, interval);
                                                            const dueDateLabel = dueDate ? `Due: ${formatObservedDate(dueDate)}` : '';
                                                            return (
                                                                <th key={`${protocol.id}-${condition}-${interval}`} className="text-center" style={{ minWidth: 140 }}>
                                                                    <div>{interval}</div>
                                                                    {observedDateLabel ? (
                                                                        <div className="small text-muted">{observedDateLabel}</div>
                                                                    ) : (
                                                                        dueDateLabel && <div className="small text-muted">{dueDateLabel}</div>
                                                                    )}
                                                                </th>
                                                            );
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parameters.map(parameter => (
                                                        <tr key={`${protocol.id}-${condition}-${parameter}`}>
                                                            <td className="fw-medium">{parameter}</td>
                                                            <td className="small text-muted">
                                                                {getReferenceText(parameter) || '—'}
                                                            </td>
                                                            {intervals.map(interval => {
                                                                const key = getObservationKey(condition, interval);
                                                                const observation = observationsByProtocol?.[protocol.id]?.[key] || null;
                                                                const measurements = observation ? parseJsonMap(observation.measurementsJson) : {};
                                                                const parsedMeasurement = parseCellMeasurement(measurements[parameter]);
                                                                const cellStatus = parsedMeasurement.status;
                                                                const cellValue = parsedMeasurement.value;
                                                                return (
                                                                    <td key={`${protocol.id}-${condition}-${interval}-${parameter}`} className="text-center">
                                                                        <Button type="button"
                                                                            variant="link"
                                                                            className="text-decoration-none p-0 d-inline-flex flex-column align-items-center"
                                                                            onClick={() => onOpenStatusPicker(protocol, condition, interval, parameter)}
                                                                            title={cellStatus ? 'Update status' : 'Set status'}
                                                                        >
                                                                            {cellStatus === 'PASS' ? (
                                                                                <MdCheckCircle size={18} className="text-success" />
                                                                            ) : cellStatus === 'FAIL' ? (
                                                                                <MdClose size={18} className="text-danger" />
                                                                            ) : cellStatus === 'NA' ? (
                                                                                <MdRemove size={18} className="text-secondary" />
                                                                            ) : (
                                                                                <span className="fs-4 text-muted">+</span>
                                                                            )}
                                                                            {!!cellValue && <span className="small text-muted mt-1">{cellValue}</span>}
                                                                        </Button>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                    {parameters.length === 0 && (
                                                        <tr>
                                                            <td colSpan={intervals.length + 2} className="text-center text-muted py-4">
                                                                No parameters configured for this protocol.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                    ))}
                                </Card.Body>
                            </Card>
                        );
                    })}
                </div>
            )}
            <div className="d-flex justify-content-between align-items-center mt-3">
                <small className="text-muted">Showing {stabilityProtocols.length} of {stabilityPagination.totalElements || stabilityProtocols.length} protocols</small>
                <div className="d-flex gap-2">
                    <Button type="button" size="sm" variant="outline-secondary" disabled={stabilityPagination.first || stabilityLoading} onClick={onPreviousPage}>Previous</Button>
                    <Button type="button" size="sm" variant="outline-secondary" disabled={stabilityPagination.last || stabilityLoading} onClick={onNextPage}>Next</Button>
                </div>
            </div>
        </Card.Body>
    </Card>
);

export default memo(StabilityTestingCard);
