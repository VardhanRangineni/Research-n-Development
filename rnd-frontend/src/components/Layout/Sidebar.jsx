
import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import {
    MdDashboard,
    MdFolderSpecial,
    MdDescription,
    MdBuild,
    MdHardware,
    MdTrendingUp,
    MdScience,
    MdSettings,
    MdLogout,
    MdAssignment,
    MdFactCheck
} from 'react-icons/md';
import { MdArticle } from 'react-icons/md';
import medPlusLogo from '../../assets/MedPlus.png';
import { authService } from '../../services/auth.service';
import AppDialog from '../Common/AppDialog';
import './Sidebar.css';

const Sidebar = () => {
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const user = authService.getCurrentUser();
    const isAdmin = user?.role === 'HEAD';
    const allowedPages = Array.isArray(user?.allowedPages) ? user.allowedPages : [];
    const hasPage = (key) => isAdmin || allowedPages.includes(key);
    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'MP';

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <img src={medPlusLogo} alt="MedPlus" height="32" />
                <span className="brand-text">MedPlus R&amp;D</span>
            </div>

            <nav className="sidebar-nav">
                {hasPage('DASHBOARD') && (
                    <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <MdDashboard className="nav-icon" />
                        <span>Dashboard</span>
                    </NavLink>
                )}

                <div className="nav-category mt-3">Lab Records</div>
                {hasPage('PROJECTS') && (
                    <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <MdFolderSpecial className="nav-icon" />
                        <span>Projects</span>
                    </NavLink>
                )}
                {hasPage('PROCEDURE') && (
                    <NavLink to="/procedure" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <MdArticle className="nav-icon" />
                        <span>Create Procedure File</span>
                    </NavLink>
                )}
                {hasPage('DOCUMENTS') && (
                    <NavLink to="/documents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <MdDescription className="nav-icon" />
                        <span>Documents</span>
                    </NavLink>
                )}
                {hasPage('CALIBRATION') && (
                    <NavLink to="/calibration" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <MdBuild className="nav-icon" />
                        <span>Equipment Calibration</span>
                    </NavLink>
                )}

                <div className="nav-category mt-3">Logs</div>
                {hasPage('CALIBRATION_LOGS') && (
                    <NavLink to="/logs/calibration" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <MdAssignment className="nav-icon" />
                        <span>Calibration Logs</span>
                    </NavLink>
                )}

                {hasPage('MASTERS') && (
                    <>
                        <div className="nav-category mt-3">System Data</div>
                        <NavLink to="/masters" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <MdHardware className="nav-icon" />
                            <span>Masters</span>
                        </NavLink>
                    </>
                )}

                {hasPage('AUDIT') && (
                    <>
                        <div className="nav-category mt-3">Audit</div>
                        <NavLink to="/audit/trail" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <MdFactCheck className="nav-icon" />
                            <span>Audit Trail</span>
                        </NavLink>
                    </>
                )}
            </nav>

            <div className="sidebar-footer">
                {hasPage('SETTINGS') && (
                    <NavLink to="/settings" className={({ isActive }) => `nav-link mb-2 ${isActive ? 'active' : ''}`}>
                        <MdSettings className="nav-icon" />
                        <span>Settings</span>
                    </NavLink>
                )}

                <div className="user-profile" onClick={() => setShowLogoutDialog(true)}>
                    <div className="user-avatar">{initials}</div>
                    <div className="user-info">
                        <p className="user-name">{user?.name || 'User'}</p>
                        <p className="user-role">{user?.role || 'R&D Staff'}</p>
                    </div>
                    <MdLogout className="text-muted" />
                </div>
            </div>

            <AppDialog
                show={showLogoutDialog}
                title="Logout"
                message="Are you sure you want to logout?"
                confirmText="Logout"
                confirmVariant="danger"
                showCancel
                onConfirm={() => authService.logout().then(() => {
                    setShowLogoutDialog(false);
                    window.location.href = '/login';
                })}
                onClose={() => setShowLogoutDialog(false)}
            />
        </aside>
    );
};

export default Sidebar;
