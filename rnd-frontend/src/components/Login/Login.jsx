
import { useState } from 'react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import medPlusLogo from '../../assets/MedPlus.png';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authService.login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container row m-0">
            {/* Left Side - Hero Section */}
            <Col md={6} lg={7} className="hero-section d-none d-md-flex align-items-center justify-content-center p-5">
                <div className="hero-overlay"></div>
                <div className="hero-content text-start w-100" style={{ maxWidth: '600px' }}>
                    <div className="brand-logo mb-5">
                        <img src={medPlusLogo} alt="MedPlus Logo" height="50" className="rounded-2" />
                        <span className="ms-3">MedPlus</span>
                    </div>

                    <h1 className="display-4 fw-bold mb-4">Empowering the <br />Future of R&D</h1>
                    <p className="lead opacity-75 mb-0">
                        Comprehensive laboratory management from Ingredient masters to regulatory approval.
                        Precision, compliance, and speed at your fingertips.
                    </p>

                    <div className="mt-auto pt-5">
                        <small className="opacity-50">© 2024 MedPlus &nbsp; | &nbsp; ISO 27001 Certified</small>
                    </div>
                </div>
            </Col>

            {/* Right Side - Login Form */}
            <Col md={6} lg={5} className="d-flex align-items-center justify-content-center bg-white">
                <Container style={{ maxWidth: '450px' }}>
                    <div className="p-4">
                        <h2 className="fw-bold mb-2">Sign In</h2>
                        <p className="text-muted mb-5">Enter your credentials to access your laboratory workspace.</p>

                        {error && <Alert variant="danger">{error}</Alert>}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-4" controlId="email">
                                <Form.Label className="fw-semibold small">Email Address</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    size="lg"
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-4" controlId="password">
                                <Form.Label className="d-flex justify-content-between fw-semibold small">
                                    Password
                                    <a href="#" className="text-decoration-none small">Forgot Password?</a>
                                </Form.Label>
                                <div style={{ position: 'relative' }}>
                                    <Form.Control
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        size="lg"
                                        required
                                    />
                                    <span
                                        onClick={() => setShowPassword((v) => !v)}
                                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', background: 'transparent', padding: 0 }}
                                    >
                                        {showPassword ? <MdVisibility size={22} /> : <MdVisibilityOff size={22} />}
                                    </span>
                                </div>
                            </Form.Group>

                            {/* Removed Keep me logged in for 30 days */}

                            <Button
                                variant="primary"
                                type="submit"
                                className="w-100 btn-lg mb-4"
                                disabled={loading}
                            >
                                {loading ? 'Signing In...' : 'Sign In to Dashboard →'}
                            </Button>
                        </Form>

                        {/* Removed Privacy Policy, Terms of Service, Contact Support */}
                    </div>
                </Container>
            </Col>
        </div>
    );
};

export default Login;
