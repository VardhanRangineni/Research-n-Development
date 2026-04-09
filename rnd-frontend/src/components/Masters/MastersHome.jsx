import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { MdHardware, MdTrendingUp, MdScience } from 'react-icons/md';

const MastersHome = () => {
    const navigate = useNavigate();

    const masters = [
        {
            title: 'Equipment Master',
            description: 'Manage laboratory equipment, calibration schedules, and maintenance records.',
            icon: <MdHardware size={40} />,
            color: '#0d6efd',
            link: '/masters/equipment'
        },
        {
            title: 'Benchmark Master',
            description: 'Set and manage benchmarks for experiments and quality control.',
            icon: <MdTrendingUp size={40} />,
            color: '#198754',
            link: '/masters/benchmark'
        },
        {
            title: 'Ingredient Master',
            description: 'Maintain inventory of chemical ingredients, lots, and safety data.',
            icon: <MdScience size={40} />,
            color: '#dc3545',
            link: '/masters/ingredients'
        }
    ];

    return (
        <Container fluid className="p-4">
            <h2 className="mb-4 fw-bold text-dark">Masters Management</h2>
            <Row className="g-4">
                {masters.map((master, index) => (
                    <Col key={index} md={6} lg={4}>
                        <Card
                            className="h-100 border-0 shadow-sm hover-card"
                            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                            onClick={() => navigate(master.link)}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <Card.Body className="d-flex flex-column align-items-center text-center p-5">
                                <div
                                    className="mb-4 rounded-circle d-flex align-items-center justify-content-center"
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        backgroundColor: `${master.color}20`,
                                        color: master.color
                                    }}
                                >
                                    {master.icon}
                                </div>
                                <Card.Title className="fw-bold fs-4 mb-3">{master.title}</Card.Title>
                                <Card.Text className="text-muted">
                                    {master.description}
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
};

export default MastersHome;
