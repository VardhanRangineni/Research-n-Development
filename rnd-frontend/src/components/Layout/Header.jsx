import { MdSearch, MdNotifications, MdHelpOutline } from 'react-icons/md';
import { useEffect, useState } from 'react';
import { notificationsService } from '../../services/notifications.service';
import './Header.css';

const Header = () => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        let isMounted = true;

        const loadNotifications = async () => {
            try {
                const data = await notificationsService.getAll();
                if (isMounted) {
                    setNotifications(Array.isArray(data) ? data : []);
                }
            } catch {
                if (isMounted) {
                    setNotifications([]);
                }
            }
        };

        loadNotifications();
        const timer = setInterval(loadNotifications, 60000);

        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, []);

    return (
        <header className="header">
            <div className="header-search">
                <MdSearch className="search-icon" />
                <input type="text" className="search-input" placeholder="Search experiments, ingredients, or lots..." />
            </div>

            <div className="header-actions">
                <button type="button" className="action-btn" title="Help">
                    <MdHelpOutline size={20} />
                </button>
                <button type="button" className="action-btn" title="Notifications" onClick={() => setShowNotifications(prev => !prev)}>
                    <MdNotifications size={20} />
                    {notifications.length > 0 && <span className="badge-dot"></span>}
                </button>
                {showNotifications && (
                    <div className="notifications-panel">
                        <div className="notifications-title">Notifications</div>
                        {notifications.length === 0 ? (
                            <div className="notifications-empty">No notifications.</div>
                        ) : (
                            <div className="notifications-list">
                                {notifications.slice(0, 20).map((item, index) => (
                                    <div key={`${item.source}-${item.protocolId}-${item.conditionLabel}-${item.intervalLabel}-${index}`} className="notification-item">
                                        <div className="notification-type">{item.source} · {item.type}</div>
                                        <div className="notification-text">
                                            {(item.projectName || item.projectId || 'Project')} · {item.title || item.protocolName || 'Update'}
                                        </div>
                                        {(item.conditionLabel || item.intervalLabel) && (
                                            <div className="notification-text">
                                                {item.conditionLabel} {item.intervalLabel ? `· ${item.intervalLabel}` : ''}
                                            </div>
                                        )}
                                        {item.dueDate && <div className="notification-date">Due: {item.dueDate}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
