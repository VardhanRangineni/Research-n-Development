import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Container, Row, Col, Badge, Spinner, Modal, Button, Form } from 'react-bootstrap';
import { projectsService } from '../../services/projects.service';
import { benchmarkService } from '../../services/benchmark.service';
import AppDialog from '../Common/AppDialog';

const ProjectsPage = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNameModal, setShowNameModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [benchmarkByProjectId, setBenchmarkByProjectId] = useState({});
    const [errorDialog, setErrorDialog] = useState({ show: false, message: '' });
    const [pagination, setPagination] = useState({ page: 0, size: 9, totalPages: 0, totalElements: 0, first: true, last: true });

    useEffect(() => {
        loadProjects(pagination.page);
    }, [pagination.page]);

    const loadProjects = async (page = 0) => {
        try {
            setLoading(true);
            const projectsData = await projectsService.getPage({ page, size: pagination.size });
            const safeProjects = Array.isArray(projectsData?.content) ? projectsData.content : [];
            const safeBenchmarks = await benchmarkService.getByProjectIds(safeProjects.map((project) => project.projectId));

            const benchmarkMap = safeBenchmarks.reduce((acc, benchmark) => {
                if (benchmark?.projectId) {
                    acc[benchmark.projectId] = benchmark;
                }
                return acc;
            }, {});

            setProjects(safeProjects);
            setBenchmarkByProjectId(benchmarkMap);
            setPagination((prev) => ({
                ...prev,
                page: projectsData?.page ?? page,
                totalPages: projectsData?.totalPages ?? 0,
                totalElements: projectsData?.totalElements ?? safeProjects.length,
                first: projectsData?.first ?? page === 0,
                last: projectsData?.last ?? true
            }));
        } catch (error) {
            console.error('Failed to load projects:', error);
            setProjects([]);
            setBenchmarkByProjectId({});
        } finally {
            setLoading(false);
        }
    };

    const sortedProjects = useMemo(() => {
        return [...projects].sort((a, b) => (b?.id || 0) - (a?.id || 0));
    }, [projects]);

    const openProject = (project) => {
        if (!project?.projectName || !project.projectName.trim()) {
            setSelectedProject(project);
            setProjectName('');
            setShowNameModal(true);
            return;
        }

        navigate(`/projects/${project.id}`);
    };

    const handleSaveProjectName = async () => {
        if (!selectedProject || !projectName.trim()) return;

        try {
            setSavingName(true);
            await projectsService.updateName(selectedProject.id, projectName.trim());
            setShowNameModal(false);
            await loadProjects(pagination.page);
            navigate(`/projects/${selectedProject.id}`);
        } catch (error) {
            console.error('Failed to update project name:', error);
            setErrorDialog({ show: true, message: error.message || 'Failed to save project name.' });
        } finally {
            setSavingName(false);
        }
    };

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold m-0">R&D Projects</h2>
            </div>

            {loading ? (
                <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : sortedProjects.length === 0 ? (
                <Card className="border-0 shadow-sm">
                    <Card.Body className="text-center py-5 text-muted">
                        No projects found. Add a benchmark product to create the first project.
                    </Card.Body>
                </Card>
            ) : (
                <>
                <Row className="g-4">
                    {sortedProjects.map((project) => {
                        const benchmark = benchmarkByProjectId[project.projectId] || {};

                        return (
                            <Col key={project.id} md={6} xl={4}>
                                <Card className="border-0 shadow-sm h-100">
                                    <Card.Body className="d-flex flex-column">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <div className="text-muted small">{project.projectId}</div>
                                                <div className="fw-semibold text-dark" style={{ fontSize: '1rem' }}>
                                                    {project.projectName?.trim() || 'Name required on first open'}
                                                </div>
                                            </div>
                                            <Badge bg={project.projectName ? 'success' : 'secondary'} className="fw-normal">
                                                {project.status || (project.projectName ? 'Active' : 'Draft')}
                                            </Badge>
                                        </div>

                                        <div className="border rounded p-3 mb-3" style={{ backgroundColor: '#fafbfc' }}>
                                            <div className="small mb-1"><span className="text-muted">Benchmark Id:</span> {benchmark.benchmarkId || '—'}</div>
                                            <div className="small mb-1"><span className="text-muted">Competitor:</span> {benchmark.competitorName || '—'}</div>
                                            <div className="small mb-1"><span className="text-muted">Product Name:</span> {benchmark.productName || '—'}</div>
                                            <div className="small"><span className="text-muted">Segment:</span> {benchmark.segment || '—'}</div>
                                        </div>

                                        <Button type="button"
                                            variant="outline-danger"
                                            className="mt-auto"
                                            onClick={() => openProject(project)}
                                        >
                                            Open Project
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
                <div className="d-flex justify-content-between align-items-center mt-4">
                    <small className="text-muted">Showing {sortedProjects.length} of {pagination.totalElements} projects</small>
                    <div className="d-flex gap-2">
                        <Button type="button" variant="outline-secondary" disabled={pagination.first || loading} onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 0) }))}>
                            Previous
                        </Button>
                        <Button type="button" variant="outline-secondary" disabled={pagination.last || loading} onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}>
                            Next
                        </Button>
                    </div>
                </div>
                </>
            )}

            <Modal show={showNameModal} onHide={() => setShowNameModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Name Project</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted mb-2">
                        Enter a project name before opening <strong>{selectedProject?.projectId}</strong>.
                    </p>
                    <Form.Control
                        type="text"
                        placeholder="e.g., Sunscreen Stability Study"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        autoFocus
                        maxLength={120}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="secondary" onClick={() => setShowNameModal(false)} disabled={savingName}>
                        Cancel
                    </Button>
                    <Button type="button"
                        variant="danger"
                        onClick={handleSaveProjectName}
                        disabled={savingName || !projectName.trim()}
                    >
                        {savingName ? 'Saving...' : 'Save & Open'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <AppDialog
                show={errorDialog.show}
                title="Action Failed"
                message={errorDialog.message}
                confirmText="OK"
                confirmVariant="primary"
                onClose={() => setErrorDialog({ show: false, message: '' })}
            />
        </Container>
    );
};

export default ProjectsPage;
