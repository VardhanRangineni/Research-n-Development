import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Container, Form, InputGroup, Row, Spinner, Table } from 'react-bootstrap';
import { MdAttachFile, MdOpenInNew, MdSearch } from 'react-icons/md';
import { projectsService } from '../../services/projects.service';
import { documentsService } from '../../services/documents.service';
import AppDialog from '../Common/AppDialog';

const formatFileSize = (size) => {
    const value = Number(size || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
};

const DocumentsPage = () => {
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dialogInfo, setDialogInfo] = useState({ show: false, title: '', message: '' });
    const [projectPagination, setProjectPagination] = useState({ page: 0, size: 8, totalPages: 0, totalElements: 0, first: true, last: true });
    const [documentPagination, setDocumentPagination] = useState({ page: 0, size: 10, totalPages: 0, totalElements: 0, first: true, last: true });

    useEffect(() => {
        loadProjects(projectPagination.page, searchText);
    }, [projectPagination.page, searchText]);

    const loadProjects = async (page = 0, query = '') => {
        try {
            setLoadingProjects(true);
            const projectData = await projectsService.getPage({ page, size: projectPagination.size, query });
            const content = Array.isArray(projectData?.content) ? projectData.content : [];
            setProjects(content);
            setProjectPagination((prev) => ({
                ...prev,
                page: projectData?.page ?? page,
                totalPages: projectData?.totalPages ?? 0,
                totalElements: projectData?.totalElements ?? content.length,
                first: projectData?.first ?? page === 0,
                last: projectData?.last ?? true
            }));
        } catch (error) {
            setProjects([]);
            setDialogInfo({
                show: true,
                title: 'Load Failed',
                message: error.message || 'Unable to load projects.'
            });
        } finally {
            setLoadingProjects(false);
        }
    };

    const filteredProjects = useMemo(() => projects, [projects]);

    const selectProject = async (project) => {
        setSelectedProject(project);
        setDocumentPagination((prev) => ({ ...prev, page: 0 }));
        await loadDocuments(project.id, 0);
    };

    const loadDocuments = async (projectRefId, page = 0) => {
        try {
            setLoadingDocuments(true);
            const result = await documentsService.getByProject(projectRefId, { page, size: documentPagination.size });
            const content = Array.isArray(result?.content) ? result.content : [];
            setDocuments(content);
            setDocumentPagination((prev) => ({
                ...prev,
                page: result?.page ?? page,
                totalPages: result?.totalPages ?? 0,
                totalElements: result?.totalElements ?? content.length,
                first: result?.first ?? page === 0,
                last: result?.last ?? true
            }));
        } catch (error) {
            setDocuments([]);
            setDialogInfo({
                show: true,
                title: 'Load Failed',
                message: error.message || 'Unable to load linked documents.'
            });
        } finally {
            setLoadingDocuments(false);
        }
    };

    const handleUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !selectedProject) return;

        try {
            setUploading(true);
            await documentsService.upload(selectedProject.id, file);
            await loadDocuments(selectedProject.id, documentPagination.page);
        } catch (error) {
            setDialogInfo({
                show: true,
                title: 'Upload Failed',
                message: error.message || 'Unable to upload document.'
            });
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold m-0">Project Documents</h2>
            </div>

            <Row className="g-4">
                <Col lg={5}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white fw-semibold">Search Project</Card.Header>
                        <Card.Body>
                            <InputGroup className="mb-3">
                                <InputGroup.Text className="bg-white">
                                    <MdSearch />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search by project name, project ID, or benchmark ID"
                                    value={searchText}
                                    onChange={(e) => {
                                        setProjectPagination((prev) => ({ ...prev, page: 0 }));
                                        setSearchText(e.target.value);
                                    }}
                                />
                            </InputGroup>

                            {loadingProjects ? (
                                <div className="text-center py-4"><Spinner animation="border" variant="primary" /></div>
                            ) : filteredProjects.length === 0 ? (
                                <div className="text-muted text-center py-4">No matching projects found.</div>
                            ) : (
                                <div className="d-flex flex-column gap-2" style={{ maxHeight: 420, overflowY: 'auto' }}>
                                    {filteredProjects.map((project) => (
                                        <button
                                            key={project.id}
                                            type="button"
                                            className={`btn text-start border ${selectedProject?.id === project.id ? 'btn-danger' : 'btn-light'}`}
                                            onClick={() => selectProject(project)}
                                        >
                                            <div className="fw-semibold">{project.projectName?.trim() || 'Untitled Project'}</div>
                                            <div className="small">{project.projectId}</div>
                                            <div className="small text-muted">{project.benchmarkId}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <small className="text-muted">Showing {filteredProjects.length} of {projectPagination.totalElements} projects</small>
                                <div className="d-flex gap-2">
                                    <Button type="button" size="sm" variant="outline-secondary" disabled={projectPagination.first || loadingProjects} onClick={() => setProjectPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 0) }))}>Previous</Button>
                                    <Button type="button" size="sm" variant="outline-secondary" disabled={projectPagination.last || loadingProjects} onClick={() => setProjectPagination((prev) => ({ ...prev, page: prev.page + 1 }))}>Next</Button>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={7}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <span className="fw-semibold">Linked Documents</span>
                            {selectedProject && (
                                <Badge bg="light" text="dark">{selectedProject.projectId}</Badge>
                            )}
                        </Card.Header>
                        <Card.Body>
                            {!selectedProject ? (
                                <div className="text-muted text-center py-5">Select a project to link and view documents.</div>
                            ) : (
                                <>
                                    <div className="mb-3">
                                        <Form.Label className="small text-muted">Link document to selected project</Form.Label>
                                        <Form.Control type="file" onChange={handleUpload} disabled={uploading || loadingDocuments} />
                                        {uploading && (
                                            <div className="small text-muted mt-2">
                                                <Spinner animation="border" size="sm" className="me-2" />Uploading document...
                                            </div>
                                        )}
                                    </div>

                                    {loadingDocuments ? (
                                        <div className="text-center py-4"><Spinner animation="border" variant="primary" /></div>
                                    ) : documents.length === 0 ? (
                                        <div className="text-muted text-center py-4">No documents linked yet.</div>
                                    ) : (
                                        <>
                                        <Table hover responsive className="align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>File</th>
                                                    <th>Size</th>
                                                    <th>Uploaded By</th>
                                                    <th>Uploaded At</th>
                                                    <th className="text-end">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {documents.map((doc) => (
                                                    <tr key={doc.id}>
                                                        <td><MdAttachFile className="me-1" />{doc.originalFileName}</td>
                                                        <td>{formatFileSize(doc.fileSize)}</td>
                                                        <td>{doc.uploadedBy || '—'}</td>
                                                        <td>{formatDateTime(doc.uploadedAt)}</td>
                                                        <td className="text-end">
                                                            <Button type="button"
                                                                variant="outline-primary"
                                                                size="sm"
                                                                onClick={() => window.open(doc.fullImageUrl, '_blank', 'noopener,noreferrer')}
                                                            >
                                                                <MdOpenInNew size={16} className="me-1" />Open
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                        <div className="d-flex justify-content-between align-items-center mt-3">
                                            <small className="text-muted">Showing {documents.length} of {documentPagination.totalElements} documents</small>
                                            <div className="d-flex gap-2">
                                                <Button type="button" size="sm" variant="outline-secondary" disabled={documentPagination.first || loadingDocuments} onClick={() => loadDocuments(selectedProject.id, Math.max(documentPagination.page - 1, 0))}>Previous</Button>
                                                <Button type="button" size="sm" variant="outline-secondary" disabled={documentPagination.last || loadingDocuments} onClick={() => loadDocuments(selectedProject.id, documentPagination.page + 1)}>Next</Button>
                                            </div>
                                        </div>
                                        </>
                                    )}
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

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

export default DocumentsPage;
