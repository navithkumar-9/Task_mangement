import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getAvatarStyle } from '../utils/avatar';

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

const NotificationPopup = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    /* notification state */
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
    const containerRef = useRef(null);

    /* ── dragging state & refs ── */
    const [isDraggingState, setIsDraggingState] = useState(false);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const positionRef = useRef({ x: 0, y: 0 });
    const lastAppliedRef = useRef({ x: 0, y: 0 });
    const hasDraggedRef = useRef(false);

    /* ── poll unread count every 60s (1 minute) ── */
    useEffect(() => {
        if (!user) return;
        const fetchCount = () => {
            if (document.hidden) return; // Skip polling if the tab is inactive/backgrounded
            API.get('/notifications/unread-count/')
                .then((res) => {
                    if (res.data?.success) setUnreadCount(res.data.data.count);
                })
                .catch(() => {});
        };
        fetchCount();
        const interval = setInterval(fetchCount, 60000);
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

    /* ── Drag Event Handlers ── */
    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only drag with left click
        isDraggingRef.current = true;
        hasDraggedRef.current = false;
        setIsDraggingState(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasDraggedRef.current = true;
        }

        let newX = positionRef.current.x + dx;
        let newY = positionRef.current.y + dy;

        if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth || 60;
            const containerHeight = containerRef.current.offsetHeight || 60;

            const initialLeft = window.innerWidth - containerWidth - 24;
            const initialTop = window.innerHeight - containerHeight - 24;

            const currentLeft = initialLeft + newX;
            const currentTop = initialTop + newY;

            // Constrain left/right boundaries (with 10px padding)
            if (currentLeft < 10) {
                newX = 10 - initialLeft;
            } else if (currentLeft > window.innerWidth - containerWidth - 10) {
                newX = window.innerWidth - containerWidth - 10 - initialLeft;
            }

            // Constrain top/bottom boundaries (with 10px padding)
            if (currentTop < 10) {
                newY = 10 - initialTop;
            } else if (currentTop > window.innerHeight - containerHeight - 10) {
                newY = window.innerHeight - containerHeight - 10 - initialTop;
            }

            lastAppliedRef.current = { x: newX, y: newY };
            containerRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
        }
    };

    const handleMouseUp = (e) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsDraggingState(false);

        positionRef.current = { ...lastAppliedRef.current };

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    /* ── Touch Event Handlers ── */
    const handleTouchStart = (e) => {
        if (e.touches.length !== 1) return;
        isDraggingRef.current = true;
        hasDraggedRef.current = false;
        setIsDraggingState(true);
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
    };

    const handleTouchMove = (e) => {
        if (!isDraggingRef.current) return;
        const dx = e.touches[0].clientX - dragStartRef.current.x;
        const dy = e.touches[0].clientY - dragStartRef.current.y;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasDraggedRef.current = true;
            e.preventDefault(); // Prevent scrolling on touch screen while dragging
        }

        let newX = positionRef.current.x + dx;
        let newY = positionRef.current.y + dy;

        if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth || 60;
            const containerHeight = containerRef.current.offsetHeight || 60;

            const initialLeft = window.innerWidth - containerWidth - 24;
            const initialTop = window.innerHeight - containerHeight - 24;

            const currentLeft = initialLeft + newX;
            const currentTop = initialTop + newY;

            if (currentLeft < 10) {
                newX = 10 - initialLeft;
            } else if (currentLeft > window.innerWidth - containerWidth - 10) {
                newX = window.innerWidth - containerWidth - 10 - initialLeft;
            }

            if (currentTop < 10) {
                newY = 10 - initialTop;
            } else if (currentTop > window.innerHeight - containerHeight - 10) {
                newY = window.innerHeight - containerHeight - 10 - initialTop;
            }

            lastAppliedRef.current = { x: newX, y: newY };
            containerRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
        }
    };

    const handleTouchEnd = (e) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsDraggingState(false);

        positionRef.current = { ...lastAppliedRef.current };

        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    };

    const saveNotifsToCache = (notifs) => {
        try {
            const cleaned = notifs.map(n => {
                if (n.sender && n.sender.profile_picture && n.sender.profile_picture.length > 1000) {
                    const { profile_picture, ...restSender } = n.sender;
                    return { ...n, sender: restSender };
                }
                return n;
            });
            localStorage.setItem('notif_cache_data', JSON.stringify(cleaned));
        } catch (err) {
            console.warn('Failed to save notifications to cache:', err);
        }
    };

    /* ── fetch full notification list (using Stale-While-Revalidate pattern) ── */
    const fetchNotifications = async () => {
        const cacheData = localStorage.getItem('notif_cache_data');

        // 1. Show cached data immediately if available to prevent layout flicker
        if (cacheData) {
            try {
                const parsed = JSON.parse(cacheData);
                setNotifications(parsed);
            } catch (e) {
                // ignore invalid cache
            }
        }

        // 2. Only show loading spinner if we have no cached data at all
        if (!cacheData) {
            setLoadingNotifs(true);
        }

        // 3. Always fetch latest notifications from backend in background
        try {
            const res = await API.get('/notifications/?page_size=30');
            const data = res.data?.data || res.data?.results?.data || [];
            const notifsArray = Array.isArray(data) ? data : [];
            setNotifications(notifsArray);
            saveNotifsToCache(notifsArray);
        } catch {
            if (!cacheData) {
                setNotifications([]);
            }
        } finally {
            setLoadingNotifs(false);
        }
    };

    const togglePopup = () => {
        if (hasDraggedRef.current) return;
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
                setNotifications((prev) => {
                    const updated = prev.map((n) =>
                        n.id === notif.id ? { ...n, is_read: true } : n,
                    );
                    saveNotifsToCache(updated);
                    return updated;
                });
            } catch {}
        }
        setIsOpen(false);
        /* Navigate directly to the task that was commented on */
        const taskId = notif.task_info?.id;
        if (taskId) {
            navigate(`/tasks?taskId=${taskId}`);
        } else {
            navigate('/announcements');
        }
    };

    /* ── mark all read ── */
    const handleMarkAllRead = async () => {
        try {
            await API.patch('/notifications/mark-all-read/');
            setUnreadCount(0);
            setNotifications((prev) => {
                const updated = prev.map((n) => ({ ...n, is_read: true }));
                saveNotifsToCache(updated);
                return updated;
            });
        } catch {}
    };

    if (!user) return null;

    return (
        <div className={`notif-float-container ${isDraggingState ? 'dragging' : ''}`} ref={containerRef}>
            {/* ── Floating Action Button ── */}
            <button
                className={`notif-float-btn ${isOpen ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={togglePopup}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
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
                                                    {notif.task_info ? (
                                                        <>
                                                            <strong>
                                                                {sender.name ||
                                                                    sender.username}
                                                            </strong>{' '}
                                                            commented on{' '}
                                                            <strong>{taskName}</strong>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <strong>
                                                                {sender.name ||
                                                                    sender.username}
                                                            </strong>{' '}
                                                            posted a{' '}
                                                            <strong>New Announcement</strong>:{' '}
                                                            {notif.message.replace(/^New Announcement:\s*/, '')}
                                                        </>
                                                    )}
                                                </p>
                                                {notif.task_info && notif.comment_content && (
                                                    <span className="notif-float-card-comment-preview">
                                                        "{notif.comment_content}"
                                                    </span>
                                                )}
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
