import { useEffect, useMemo, useState } from 'react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { Card, Button, Form, Row, Col, Table, Badge } from 'react-bootstrap';
import { settingsService } from '../../services/settings.service';
import { authService } from '../../services/auth.service';
import AppDialog from '../Common/AppDialog';

const PAGE_OPTIONS = [
    { key: 'DASHBOARD', label: 'Dashboard' },
    { key: 'PROJECTS', label: 'Projects' },
    { key: 'PROCEDURE', label: 'Create Procedure File' },
    { key: 'DOCUMENTS', label: 'Documents' },
    { key: 'CALIBRATION', label: 'Equipment Calibration' },
    { key: 'CALIBRATION_LOGS', label: 'Calibration Logs' },
    { key: 'MASTERS', label: 'Masters' },
    { key: 'AUDIT', label: 'Audit Trail' },
    { key: 'SETTINGS', label: 'Settings' }
];

const HEAD_DEFAULT_PAGES = PAGE_OPTIONS.map(item => item.key);

const emptyForm = {
    id: null,
    username: '',
    email: '',
    password: '',
    role: 'EXECUTIVE',
    allowedPages: ['DASHBOARD']
};

const SettingsPage = () => {
    const currentUser = authService.getCurrentUser();
    const isHead = currentUser?.role === 'HEAD';

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState(['HEAD', 'MANAGER', 'EXECUTIVE']);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [dialog, setDialog] = useState({ show: false, title: '', message: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const isEdit = isHead && !!form.id;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [roleRes, userRes] = await Promise.all([
                settingsService.getRoles().catch(() => ({ roles: ['HEAD', 'MANAGER', 'EXECUTIVE'] })),
                settingsService.getUsers()
            ]);

            const allRoles = Array.isArray(roleRes?.roles) ? roleRes.roles : ['HEAD', 'MANAGER', 'EXECUTIVE'];
            setRoles(isHead ? allRoles : allRoles.filter(r => r !== 'HEAD'));
            setUsers(Array.isArray(userRes) ? userRes : []);
        } catch (error) {
            setDialog({ show: true, title: 'Error', message: error.message || 'Unable to load settings data.' });
        } finally {
            setLoading(false);
        }
    };

    const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleRoleChange = (role) => {
        if (role === 'HEAD') {
            setForm(prev => ({ ...prev, role, allowedPages: HEAD_DEFAULT_PAGES }));
            return;
        }
        setForm(prev => ({ ...prev, role }));
    };

    const togglePage = (pageKey) => {
        if (form.role === 'HEAD') return;

        setForm(prev => {
            const has = prev.allowedPages.includes(pageKey);
            const next = has
                ? prev.allowedPages.filter(item => item !== pageKey)
                : [...prev.allowedPages, pageKey];

            if (!next.includes('DASHBOARD')) {
                next.push('DASHBOARD');
            }

            return { ...prev, allowedPages: Array.from(new Set(next)) };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.username.trim() || !form.email.trim() || !form.role) {
            setDialog({ show: true, title: 'Validation', message: 'Username, email and role are required.' });
            return;
        }

        if (!isEdit && !form.password.trim()) {
            setDialog({ show: true, title: 'Validation', message: 'Password is required while creating a user.' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                username: form.username.trim(),
                email: form.email.trim(),
                password: form.password,
                role: form.role,
                allowedPages: form.role === 'HEAD' ? HEAD_DEFAULT_PAGES : form.allowedPages
            };

            if (isEdit) {
                await settingsService.updateUser(form.id, payload);
            } else {
                await settingsService.createUser(payload);
            }

            setForm(emptyForm);
            await loadData();
        } catch (error) {
            setDialog({ show: true, title: 'Save Failed', message: error.message || 'Unable to save user.' });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (user) => {
        if (!isHead) return;
        setForm({
            id: user.id,
            username: user.username || '',
            email: user.email || '',
            password: '',
            role: user.role || 'EXECUTIVE',
            allowedPages: Array.isArray(user.allowedPages) && user.allowedPages.length
                ? user.allowedPages
                : ['DASHBOARD']
        });
    };

    const requestDelete = (user) => {
        if (!isHead || !user?.id || user.role === 'HEAD') return;
        setDeleteTarget(user);
    };

    const handleDeleteConfirm = async () => {
        const user = deleteTarget;
        if (!user?.id) return;

        setDeleting(true);
        try {
            await settingsService.deleteUser(user.id);
            if (form.id === user.id) {
                setForm(emptyForm);
            }
            setDeleteTarget(null);
            await loadData();
        } catch (error) {
            setDialog({ show: true, title: 'Delete Failed', message: error.message || 'Unable to delete user.' });
        } finally {
            setDeleting(false);
        }
    };

    const roleBadge = (role) => {
        if (role === 'HEAD') return 'danger';
        if (role === 'MANAGER') return 'warning';
        return 'secondary';
    };

    const sortedUsers = useMemo(() => {
        return [...users].sort((a, b) => (a.id || 0) - (b.id || 0));
    }, [users]);

    return (
        <div>
            <h2 className="fw-bold mb-4">Settings - User Access Control</h2>

            <Row className="g-4">
                <Col lg={5}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white fw-semibold">
                            {isHead && isEdit ? 'Update User' : 'Add User'}
                        </Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Username</Form.Label>
                                    <Form.Control
                                        value={form.username}
                                        onChange={(e) => setField('username', e.target.value)}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setField('email', e.target.value)}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>{isEdit ? 'Password (leave empty to keep)' : 'Password'}</Form.Label>
                                    <div style={{ position: 'relative' }}>
                                        <Form.Control
                                            type={showPassword ? 'text' : 'password'}
                                            value={form.password}
                                            onChange={(e) => setField('password', e.target.value)}
                                        />
                                        <span
                                            onClick={() => setShowPassword((v) => !v)}
                                            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', background: 'transparent', padding: 0 }}
                                        >
                                            {showPassword ? <MdVisibility size={22} /> : <MdVisibilityOff size={22} />}
                                        </span>
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Role</Form.Label>
                                    <Form.Select
                                        value={form.role}
                                        onChange={(e) => handleRoleChange(e.target.value)}
                                    >
                                        {roles.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Page Access</Form.Label>
                                    <div className="d-flex flex-column gap-2 border rounded p-3" style={{ maxHeight: 220, overflowY: 'auto' }}>
                                        {PAGE_OPTIONS.map(item => {
                                            const checked = form.role === 'HEAD'
                                                ? true
                                                : form.allowedPages.includes(item.key);

                                            return (
                                                <Form.Check
                                                    key={item.key}
                                                    type="checkbox"
                                                    label={item.label}
                                                    checked={checked}
                                                    disabled={form.role === 'HEAD'}
                                                    onChange={() => togglePage(item.key)}
                                                />
                                            );
                                        })}
                                    </div>
                                    {form.role === 'HEAD' && (
                                        <div className="small text-muted mt-2">HEAD always has access to all pages.</div>
                                    )}
                                </Form.Group>

                                <div className="d-flex gap-2">
                                    <Button type="submit" variant="danger" disabled={saving}>
                                        {saving ? 'Saving...' : (isHead && isEdit ? 'Update User' : 'Create User')}
                                    </Button>
                                    {isHead && isEdit && (
                                        <Button type="button" variant="outline-secondary" onClick={() => setForm(emptyForm)}>
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={7}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white fw-semibold">Users</Card.Header>
                        <Card.Body className="p-0">
                            {loading ? (
                                <div className="p-4 text-center text-muted">Loading users...</div>
                            ) : (
                                <Table hover responsive bordered className="m-0 align-middle">
                                    <thead className="bg-light text-muted">
                                        <tr>
                                            <th>Username</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Pages</th>
                                            {isHead && <th className="text-end">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedUsers.map(user => (
                                            <tr key={user.id}>
                                                <td className="fw-semibold">{user.username}</td>
                                                <td>{user.email}</td>
                                                <td><Badge bg={roleBadge(user.role)}>{user.role}</Badge></td>
                                                <td style={{ minWidth: 260 }}>
                                                    {(user.allowedPages || []).length
                                                        ? (user.allowedPages || []).join(', ')
                                                        : '—'}
                                                </td>
                                                {isHead && (
                                                    <td className="text-end">
                                                        <div className="d-inline-flex gap-2">
                                                            <Button size="sm" variant="outline-primary" onClick={() => handleEdit(user)}>
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-danger"
                                                                onClick={() => requestDelete(user)}
                                                                disabled={user.role === 'HEAD'}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <AppDialog
                show={dialog.show}
                title={dialog.title}
                message={dialog.message}
                onClose={() => setDialog({ show: false, title: '', message: '' })}
            />

            <AppDialog
                show={!!deleteTarget}
                title="Confirm Delete"
                message={deleteTarget ? `Delete user "${deleteTarget.username || deleteTarget.email || 'this user'}"? This action cannot be undone.` : ''}
                confirmText={deleting ? 'Deleting...' : 'Delete'}
                cancelText="Cancel"
                confirmVariant="danger"
                showCancel
                busy={deleting}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                onClose={() => {
                    if (!deleting) setDeleteTarget(null);
                }}
            />
        </div>
    );
};

export default SettingsPage;
