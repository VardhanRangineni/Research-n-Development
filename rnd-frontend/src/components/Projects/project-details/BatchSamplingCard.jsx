import { Card, Table, Badge, Button } from 'react-bootstrap';
import { MdCheckCircle } from 'react-icons/md';

const BatchSamplingCard = ({
    batches,
    isAdmin,
    onOpenBatch,
    onRequestDecision,
    getStatusBadge
}) => (
    <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white py-3">
            <h5 className="m-0 fw-semibold">Batch Sampling</h5>
        </Card.Header>
        <Card.Body className="p-0">
            {batches.length === 0 ? (
                <div className="text-center py-5 text-muted">No batch formula created yet.</div>
            ) : (
                <Table hover responsive bordered className="m-0 align-middle">
                    <thead className="bg-light text-muted">
                        <tr>
                            <th className="ps-4">Batch Name</th>
                            <th>Target Batch Size (g)</th>
                            <th>Current Total (g)</th>
                            <th>Status</th>
                            <th>Remark</th>
                            {isAdmin && <th className="text-center">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {batches.map(batch => (
                            <tr key={batch.id}>
                                <td className="ps-4 fw-medium" style={{ cursor: 'pointer' }} onClick={() => onOpenBatch(batch)}>
                                    {batch.batchName}
                                </td>
                                <td>{Number(batch.targetBatchSize || 0).toFixed(2)}</td>
                                <td>{Number(batch.currentTotalWeight || 0).toFixed(2)}</td>
                                <td>
                                    <Badge bg={getStatusBadge(batch.status)} className="fw-normal">{batch.status || 'PENDING'}</Badge>
                                </td>
                                <td style={{ maxWidth: 260 }}>{batch.remark || '—'}</td>
                                {isAdmin && (
                                    <td className="text-center">
                                        {(() => {
                                            const status = `${batch?.status || ''}`.trim().toUpperCase();
                                            const canApprove = status !== 'DISCARDED' && status !== 'APPROVED';
                                            return canApprove ? (
                                                <Button type="button"
                                                    variant="link"
                                                    className="text-success p-0"
                                                    onClick={() => onRequestDecision(batch, 'APPROVED')}
                                                    title="Approve"
                                                >
                                                    <MdCheckCircle size={20} />
                                                </Button>
                                            ) : (
                                                <span className="text-muted small">—</span>
                                            );
                                        })()}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
        </Card.Body>
    </Card>
);

export default BatchSamplingCard;
