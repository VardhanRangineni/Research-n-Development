import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Card, Col, ListGroup, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
    MdAssessment,
    MdNotificationImportant,
    MdTrendingUp,
    MdTaskAlt,
    MdOutlineInsights,
    MdArrowOutward
} from 'react-icons/md';
import { authService } from '../../services/auth.service';
import { dashboardService } from '../../services/dashboard.service';
import './DashboardHome.css';

const statusVariant = (type) => {
    const normalized = String(type || '').toUpperCase();
    if (normalized === 'OVERDUE') return 'danger';
    if (normalized === 'REMINDER') return 'warning';
    return 'secondary';
};

const KpiCards = ({ items }) => (
    <Row className="g-3">
        {items.map((item, index) => (
            <Col key={item.title} sm={6} xl={3}>
                <Card className="shadow-sm dashboard-kpi-card h-100">
                    <Card.Body>
                        <div className="dashboard-kpi-topline">Metric {String(index + 1).padStart(2, '0')}</div>
                        <div className="dashboard-kpi-title">{item.title}</div>
                        <p className="dashboard-kpi-value">{item.value}</p>
                    </Card.Body>
                </Card>
            </Col>
        ))}
    </Row>
);

const HeadSections = ({ data }) => {
    const maxCount = useMemo(() => {
        const counts = (data.stageDistribution || []).map((item) => item.count || 0);
        return counts.length ? Math.max(...counts, 1) : 1;
    }, [data.stageDistribution]);

    return (
        <>
            <div className="mt-4">
                <h3 className="dashboard-section-title d-flex align-items-center gap-2">
                    <MdNotificationImportant /> Risk and Exceptions
                </h3>
                <Row className="g-3">
                    {(data.risk || []).map((item) => (
                        <Col key={item.title} md={6}>
                            <Card className="border-0 shadow-sm h-100 dashboard-panel-card">
                                <Card.Body>
                                    <div className="dashboard-kpi-title">{item.title}</div>
                                    <p className="dashboard-kpi-value">{item.value}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>

            <Row className="g-3 mt-1">
                <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100 dashboard-panel-card">
                        <Card.Body>
                            <h3 className="dashboard-section-title d-flex align-items-center gap-2">
                                <MdAssessment /> Projects by Lifecycle Stage
                            </h3>
                            {(data.stageDistribution || []).length === 0 && (
                                <div className="dashboard-empty">No stage data available.</div>
                            )}
                            {(data.stageDistribution || []).map((item) => {
                                const width = Math.max(8, Math.round((item.count / maxCount) * 100));
                                return (
                                    <div key={item.stage} className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span>{item.stage}</span>
                                            <strong>{item.count}</strong>
                                        </div>
                                        <div className="dashboard-stage-bar">
                                            <div className="dashboard-stage-fill" style={{ width: `${width}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100 dashboard-panel-card">
                        <Card.Body>
                            <h3 className="dashboard-section-title d-flex align-items-center gap-2">
                                <MdNotificationImportant /> Critical Alerts
                            </h3>
                            {(data.alerts || []).length === 0 ? (
                                <div className="dashboard-empty">No active alerts.</div>
                            ) : (
                                <ListGroup variant="flush">
                                    {data.alerts.map((item, idx) => (
                                        <ListGroup.Item key={`${item.project}-${idx}`} className="px-0">
                                            <div className="d-flex justify-content-between align-items-start gap-2">
                                                <div>
                                                    <div className="fw-semibold">{item.project}</div>
                                                    <div className="small text-muted">{item.title}</div>
                                                </div>
                                                <div className="text-end">
                                                    <Badge bg={statusVariant(item.type)}>{item.type}</Badge>
                                                    <div className="small text-muted mt-1">Due: {item.dueDate}</div>
                                                </div>
                                            </div>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </>
    );
};

const ManagerSections = ({ data }) => (
    <Row className="g-3 mt-1">
        <Col lg={5}>
            <Card className="border-0 shadow-sm h-100 dashboard-panel-card">
                <Card.Body>
                    <h3 className="dashboard-section-title d-flex align-items-center gap-2">
                        <MdTaskAlt /> Team Queues
                    </h3>
                    <ListGroup variant="flush">
                        {(data.approvalQueue || []).map((item) => (
                            <ListGroup.Item key={item.label} className="d-flex justify-content-between px-0">
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Card.Body>
            </Card>
        </Col>

        <Col lg={7}>
            <Card className="border-0 shadow-sm h-100 dashboard-panel-card">
                <Card.Body>
                    <h3 className="dashboard-section-title d-flex align-items-center gap-2">
                        <MdOutlineInsights /> Projects Needing Attention
                    </h3>
                    <Table responsive size="sm" className="mb-0">
                        <thead>
                            <tr>
                                <th>Project</th>
                                <th>Name</th>
                                <th>Stage</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.attentionProjects || []).length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-muted">No active projects.</td>
                                </tr>
                            )}
                            {(data.attentionProjects || []).map((item) => (
                                <tr key={item.projectId}>
                                    <td>{item.projectId}</td>
                                    <td>{item.name}</td>
                                    <td>{item.stage}</td>
                                    <td>{item.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Col>
    </Row>
);

const ExecutiveSections = ({ data }) => (
    <Row className="g-3 mt-1">
        <Col lg={7}>
            <Card className="border-0 shadow-sm h-100 dashboard-panel-card">
                <Card.Body>
                    <h3 className="dashboard-section-title d-flex align-items-center gap-2">
                        <MdTaskAlt /> My Worklist
                    </h3>
                    <ListGroup variant="flush">
                        {(data.tasks || []).length === 0 && (
                            <ListGroup.Item className="px-0 text-muted">No pending tasks.</ListGroup.Item>
                        )}
                        {(data.tasks || []).map((item, idx) => (
                            <ListGroup.Item key={`${item.project}-${idx}`} className="px-0">
                                <div className="d-flex justify-content-between align-items-start gap-2">
                                    <div>
                                        <div className="fw-semibold">{item.project}</div>
                                        <div className="small text-muted">{item.title}</div>
                                    </div>
                                    <div className="text-end">
                                        <Badge bg={statusVariant(item.type)}>{item.type}</Badge>
                                        <div className="small text-muted mt-1">Due: {item.dueDate}</div>
                                    </div>
                                </div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Card.Body>
            </Card>
        </Col>

        <Col lg={5}>
            <Card className="border-0 shadow-sm h-100 dashboard-panel-card">
                <Card.Body>
                    <h3 className="dashboard-section-title d-flex align-items-center gap-2">
                        <MdArrowOutward /> Quick Actions
                    </h3>
                    <div className="d-grid gap-2">
                        {(data.quickActions || []).map((item) => (
                            <Link key={item.title} to={item.path} className="btn btn-outline-primary text-start d-flex align-items-center justify-content-between">
                                <span>{item.title}</span>
                                <MdArrowOutward />
                            </Link>
                        ))}
                    </div>
                </Card.Body>
            </Card>
        </Col>
    </Row>
);

const DashboardHome = () => {
    const currentUser = authService.getCurrentUser();
    const role = String(currentUser?.role || 'EXECUTIVE').toUpperCase();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState({ kpis: [] });

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await dashboardService.getDashboardData(role);
                if (active) {
                    setData(response);
                }
            } catch (err) {
                if (active) {
                    setError(err.message || 'Unable to load dashboard data.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            active = false;
        };
    }, [role]);

    return (
        <div className="dashboard-grid">
            <div className="dashboard-hero">
                <div className="dashboard-hero-content">
                    <div className="dashboard-role-pill">{role} VIEW</div>
                    <h2 className="fw-bold mb-2">Performance Command Center</h2>
                    <div className="text-muted">Live operational metrics and prioritized actions for faster decisions.</div>
                </div>
                <div className="dashboard-hero-badge">
                    <MdTrendingUp size={18} />
                    <span>Live snapshot</span>
                </div>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {data.usedFallback && (
                <Alert variant="warning" className="mb-0">
                    Some live metrics were unavailable, so fallback values are shown.
                </Alert>
            )}

            {loading ? (
                <div className="d-flex align-items-center gap-2 text-muted">
                    <Spinner size="sm" /> Loading dashboard widgets...
                </div>
            ) : (
                <>
                    <KpiCards items={data.kpis || []} />
                    {role === 'HEAD' && <HeadSections data={data} />}
                    {role === 'MANAGER' && <ManagerSections data={data} />}
                    {role === 'EXECUTIVE' && <ExecutiveSections data={data} />}
                </>
            )}
        </div>
    );
};

export default DashboardHome;
