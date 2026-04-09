import { Outlet, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import Sidebar from './Sidebar';
import Header from './Header';
import { authService } from '../../services/auth.service';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const verifySession = async () => {
            const result = await authService.checkAuth();
            if (!isMounted) return;
            setIsAuthenticated(result);
            setLoading(false);
        };

        verifySession();
        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="main-content-wrapper">
                <Header />
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
