import { Card, Badge } from 'react-bootstrap';

const ProjectInfoCard = ({ project }) => (
    <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="m-0">{project.projectName}</h4>
                <Badge bg={project.status === 'Stopped' ? 'dark' : 'success'} className="fw-normal">{project.status}</Badge>
            </div>
            <p className="text-muted mb-1"><strong>Project ID:</strong> {project.projectId}</p>
            <p className="text-muted mb-1"><strong>Benchmark ID:</strong> {project.benchmarkId || '—'}</p>
            <p className="text-muted mb-1"><strong>Lifecycle Stage:</strong> {project.lifecycleStage || 'FORMULATION'}</p>
            <p className="text-muted mb-0"><strong>Trial Cycle:</strong> {project.trialCycle || 1}</p>
        </Card.Body>
    </Card>
);

export default ProjectInfoCard;
