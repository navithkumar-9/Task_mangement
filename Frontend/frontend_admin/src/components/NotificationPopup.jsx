import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

/* ── helpers ── */
const timeAgo = (dateStr) => {
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getAvatarStyle = (username) => {
    const colors = [
        { bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', text: '#fff' },
        { bg: 'linear-gradient(135deg, #10B981, #059669)', text: '#fff' },
        { bg: 'linear-gradient(135deg, #f43f5e, #e11d48)', text: '#fff' },
        { bg: 'linear-gradient(135deg, #8B5CF6, #7c3aed)', text: '#fff' },
        { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', text: '#fff' },
        { bg: 'linear-gradient(135deg, #06B6D4, #0891B2)', text: '#fff' },
        { bg: 'linear-gradient(135deg, #3B82F6, #2563eb)', text: '#fff' },
    ];
    let hash = 0;
    const name = username || '';
    for (let i = 0; i < name.length; i++)
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const NotificationPopup = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    /* notification state */
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
    const containerRef = useRef(null);

    /* ── poll unread count every 30s ── */
    useEffect(() => {
        if (!user) return;
        const fetchCount = () => {
            API.get('/notifications/unread-count/')
                .then((res) => {
                    if (res.data?.success) setUnreadCount(res.data.data.count);
                })
                .catch(() => {});
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [user]);

    /* ── close popup on outside click ── */
    useEffect(() => {
        const handler = (e) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ── fetch full notification list ── */
    const fetchNotifications = async () => {
        setLoadingNotifs(true);
        try {
            const res = await API.get('/notifications/?page_size=30');
            const data = res.data?.data || res.data?.results?.data || [];
            setNotifications(Array.isArray(data) ? data : []);
        } catch {
            setNotifications([]);
        } finally {
            setLoadingNotifs(false);
        }
    };

    const togglePopup = () => {
        const next = !isOpen;
        setIsOpen(next);
        if (next) fetchNotifications();
    };

    /* ── mark single read & navigate to the specific task ── */
    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            try {
                await API.patch(`/notifications/${notif.id}/read/`);
                setUnreadCount((c) => Math.max(0, c - 1));
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notif.id ? { ...n, is_read: true } : n,
                    ),
                );
            } catch {}
        }
        setIsOpen(false);
        /* Navigate directly to the task that was commented on */
        const taskId = notif.task_info?.id;
        if (taskId) {
            navigate(`/tasks?taskId=${taskId}`);
        } else {
            navigate('/tasks');
        }
    };

    /* ── mark all read ── */
    const handleMarkAllRead = async () => {
        try {
            await API.patch('/notifications/mark-all-read/');
            setUnreadCount(0);
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true })),
            );
        } catch {}
    };

    if (!user) return null;

    return (
        <div className="notif-float-container" ref={containerRef}>
            {/* ── Floating Action Button ── */}
            <button
                className={`notif-float-btn ${isOpen ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={togglePopup}
                title="Notifications"
                id="floating-notification-button"
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="notif-float-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* ── Floating Panel ── */}
            {isOpen && (
                <div className="notif-float-panel">
                    <div className="notif-float-panel-header">
                        <div className="notif-float-panel-title-area">
                            <h4 className="notif-float-panel-title">
                                Notifications
                            </h4>
                            {unreadCount > 0 && (
                                <span className="notif-float-panel-count">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                className="notif-float-mark-all"
                                onClick={handleMarkAllRead}
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notif-float-panel-body">
                        {loadingNotifs ? (
                            <div className="notif-float-empty-state">
                                <div className="notif-float-spinner"></div>
                                <span>Loading notifications...</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="notif-float-empty-state">
                                <div className="notif-float-empty-icon">
                                    <svg
                                        width="32"
                                        height="32"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    </svg>
                                </div>
                                <span className="notif-float-empty-title">
                                    All caught up!
                                </span>
                                <span className="notif-float-empty-desc">
                                    No new notifications
                                </span>
                            </div>
                        ) : (
                            <div className="notif-float-list">
                                {notifications.map((notif) => {
                                    const sender = notif.sender || {};
                                    const avatarS = getAvatarStyle(
                                        sender.username,
                                    );
                                    const initial = (
                                        sender.name ||
                                        sender.username ||
                                        '?'
                                    )
                                        .charAt(0)
                                        .toUpperCase();
                                    const taskName =
                                        notif.task_info?.task_name || 'a task';
                                    const projectName =
                                        notif.task_info?.project_name || '';

                                    return (
                                        <div
                                            key={notif.id}
                                            className={`notif-float-card ${!notif.is_read ? 'notif-float-unread' : ''}`}
                                            onClick={() =>
                                                handleNotificationClick(notif)
                                            }
                                            role="button"
                                            tabIndex={0}
                                        >
                                            {!notif.is_read && (
                                                <div className="notif-float-card-indicator"></div>
                                            )}
                                            <div className="notif-float-card-avatar">
                                                {sender.profile_picture ? (
                                                    <img
                                                        src={
                                                            sender.profile_picture
                                                        }
                                                        alt=""
                                                        className="notif-float-card-avatar-img"
                                                    />
                                                ) : (
                                                    <div
                                                        className="notif-float-card-avatar-fallback"
                                                        style={{
                                                            background:
                                                                avatarS.bg,
                                                        }}
                                                    >
                                                        {initial}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="notif-float-card-body">
                                                <p className="notif-float-card-message">
                                                    <strong>
                                                        {sender.name ||
                                                            sender.username}
                                                    </strong>{' '}
                                                    commented on{' '}
                                                    <strong>{taskName}</strong>
                                                </p>
                                                <div className="notif-float-card-footer">
                                                    {projectName && (
                                                        <span className="notif-float-card-project">
                                                            <svg
                                                                width="10"
                                                                height="10"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2.5"
                                                            >
                                                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                                            </svg>
                                                            {projectName}
                                                        </span>
                                                    )}
                                                    <span className="notif-float-card-time">
                                                        {timeAgo(
                                                            notif.created_at,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="notif-float-card-arrow">
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationPopup;
