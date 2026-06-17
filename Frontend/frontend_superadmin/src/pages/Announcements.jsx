import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getAvatarStyle } from '../utils/avatar';

const getCategoryInfo = (title = '', message = '') => {
    const text = (title + ' ' + message).toLowerCase();
    if (text.includes('urgent') || text.includes('alert') || text.includes('warning') || text.includes('maintenance') || text.includes('throttling') || text.includes('security')) {
        return { label: 'Alert', accent: 'accent-alert', color: '#ef4444', bg: '#fef2f2' };
    }
    if (text.includes('scorecard') || text.includes('performance') || text.includes('evaluation') || text.includes('review') || text.includes('score')) {
        return { label: 'Scorecard', accent: 'accent-scorecard', color: '#10b981', bg: '#f0fdf4' };
    }
    if (text.includes('new') || text.includes('feature') || text.includes('release') || text.includes('update') || text.includes('launch') || text.includes('optimization')) {
        return { label: 'Feature', accent: 'accent-feature', color: '#6366f1', bg: '#e0e7ff' };
    }
    return { label: 'General', accent: 'accent-general', color: '#64748b', bg: '#f8fafc' };
};

const getReadTime = (message = '') => {
    const words = message.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
};

const Announcements = () => {
    const { user } = useAuth();

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('-created_at');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    // Form inputs
    const [form, setForm] = useState({
        title: '',
        message: '',
        audience: 'ALL',
    });
    const [formError, setFormError] = useState('');
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        fetchAnnouncements();
    }, [page, searchQuery, sortBy, pageSize]);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            let endpoint = `/announcements/super-admin/?page=${page}&sort_by=${sortBy}&page_size=${pageSize}`;
            if (searchQuery) {
                endpoint += `&title=${encodeURIComponent(searchQuery)}`;
            }
            const res = await API.get(endpoint);
            const count = res.data.count || 0;
            setTotalCount(count);
            setTotalPages(Math.ceil(count / pageSize) || 1);

            let items = [];
            if (res.data.results && res.data.results.data) {
                items = res.data.results.data;
            } else if (res.data.data) {
                items = res.data.data;
            } else if (res.data.results) {
                items = res.data.results;
            } else {
                items = res.data;
            }
            setAnnouncements(Array.isArray(items) ? items : []);
        } catch (err) {
            console.error('Failed to fetch announcements', err);
            showToast('Failed to load announcements', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            const payload = {
                title: form.title,
                message: form.message,
                audience: form.audience,
            };
            const res = await API.post('/announcements/create/', payload);
            if (res.data.success) {
                showToast('Announcement posted successfully!', 'success');
                setShowCreateModal(false);
                setForm({ title: '', message: '', audience: 'ALL' });
                setPage(1);
                fetchAnnouncements();
            }
        } catch (err) {
            setFormError(
                err.response?.data?.message || 'Failed to post announcement',
            );
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            const payload = {
                title: form.title,
                message: form.message,
            };
            const res = await API.put(
                `/announcements/${selectedAnnouncement.id}/`,
                payload,
            );
            if (res.data.success) {
                showToast('Announcement updated successfully!', 'success');
                setShowEditModal(false);
                setSelectedAnnouncement(null);
                setForm({ title: '', message: '', audience: 'ALL' });
                fetchAnnouncements();
            }
        } catch (err) {
            setFormError(
                err.response?.data?.message || 'Failed to update announcement',
            );
        }
    };

    const handleDelete = async (id) => {
        if (
            !window.confirm(
                'Are you sure you want to delete this announcement?',
            )
        )
            return;
        try {
            await API.delete(`/announcements/${id}/`);
            showToast('Announcement deleted successfully!', 'success');
            fetchAnnouncements();
        } catch (err) {
            showToast('Failed to delete announcement', 'error');
        }
    };

    const openEditModal = (ann) => {
        setSelectedAnnouncement(ann);
        setForm({
            title: ann.title,
            message: ann.message,
            audience: ann.audience,
        });
        setFormError('');
        setShowEditModal(true);
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };

    const getAudienceBadgeStyle = (aud) => {
        switch (aud) {
            case 'ADMINS_ONLY':
                return {
                    bg: 'rgba(123, 104, 238, 0.1)',
                    color: '#7B68EE',
                    label: 'Admins Only',
                };
            case 'ALL':
                return {
                    bg: 'rgba(59, 130, 246, 0.1)',
                    color: '#3B82F6',
                    label: 'All Users',
                };
            case 'MY_TEAM':
                return {
                    bg: 'rgba(16, 185, 129, 0.1)',
                    color: '#10B981',
                    label: 'Team Only',
                };
            default:
                return {
                    bg: 'rgba(100, 116, 139, 0.1)',
                    color: '#64748B',
                    label: aud,
                };
        }
    };

    return (
        <div className="announcements-container">
            {toast && (
                <div className={`toast-notification toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Announcements</h1>
                    <p className="page-subtitle" style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                        Broadcasting messages and managing all announcements across the system
                    </p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setForm({ title: '', message: '', audience: 'ALL' });
                        setFormError('');
                        setShowCreateModal(true);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: 600, fontSize: '0.88rem' }}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New Announcement
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="announcement-control-board">
                <div className="control-board-row">
                    <div className="control-board-search-wrapper">
                        <svg
                            className="control-board-search-icon"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search all announcements by title..."
                            className="control-board-search-input"
                            value={searchQuery}
                            onChange={(e) => {
                                  setSearchQuery(e.target.value);
                                  setPage(1);
                            }}
                        />
                    </div>
                    <div className="control-board-select-wrapper">
                        <select
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setPage(1);
                            }}
                            className="control-board-select"
                        >
                            <option value="-created_at">Newest First</option>
                            <option value="created_at">Oldest First</option>
                            <option value="title">Title (A-Z)</option>
                            <option value="-title">Title (Z-A)</option>
                        </select>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            className="control-board-select"
                            style={{ minWidth: '120px' }}
                        >
                            <option value={5}>5 per page</option>
                            <option value={10}>10 per page</option>
                            <option value={20}>20 per page</option>
                            <option value={50}>50 per page</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="page-loader" style={{ padding: '60px 0', textAlign: 'center' }}>
                    <div className="page-loader-spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
                    <div className="page-loader-text" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                        Loading announcements...
                    </div>
                </div>
            ) : announcements.length === 0 ? (
                <div className="modern-announcement-empty">
                    <svg
                        className="modern-announcement-empty-icon"
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
                    <h3 className="modern-announcement-empty-title">No announcements found</h3>
                    <p className="modern-announcement-empty-desc">Check back later for updates and broadcasts.</p>
                </div>
            ) : (
                <div className="announcements-grid">
                    {announcements.map((ann) => {
                        const audBadge = getAudienceBadgeStyle(ann.audience);
                        const avStyle = getAvatarStyle(ann.sender?.username);
                        const isOwn = user?.username === ann.sender?.username || user?.id === ann.sender?.id;
                        const cat = getCategoryInfo(ann.title, ann.message);
                        const readTime = getReadTime(ann.message);

                        return (
                            <div
                                key={ann.id}
                                className={`modern-announcement-card ${cat.accent}`}
                            >
                                <div className="announcement-card-header">
                                    <div className="announcement-sender-info">
                                        {ann.sender?.profile_picture ? (
                                            <img
                                                src={ann.sender.profile_picture}
                                                alt="Avatar"
                                                className="announcement-avatar"
                                            />
                                        ) : (
                                            <div
                                                className="announcement-avatar-fallback"
                                                style={{
                                                    background: avStyle.bg,
                                                    color: avStyle.text,
                                                }}
                                            >
                                                {ann.sender?.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="announcement-sender-meta">
                                            <div className="announcement-sender-name">
                                                {ann.sender?.name || ann.sender?.username}
                                                <span className="announcement-sender-role-badge" style={{ marginLeft: '8px' }}>
                                                    {ann.sender?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                                                </span>
                                            </div>
                                            <div className="announcement-post-time">
                                                {formatDateTime(ann.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="announcement-meta-badges">
                                        <span
                                            className="announcement-badge-pill"
                                            style={{
                                                backgroundColor: cat.bg,
                                                color: cat.color,
                                            }}
                                        >
                                            {cat.label}
                                        </span>
                                        <span
                                            className="announcement-badge-pill"
                                            style={{
                                                backgroundColor: audBadge.bg,
                                                color: audBadge.color,
                                            }}
                                        >
                                            {audBadge.label}
                                        </span>
                                        {isOwn && (
                                            <div className="announcement-actions" style={{ marginLeft: '8px' }}>
                                                <button
                                                    className="announcement-action-btn"
                                                    onClick={() => openEditModal(ann)}
                                                    title="Edit"
                                                >
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className="announcement-action-btn delete-btn"
                                                    onClick={() => handleDelete(ann.id)}
                                                    title="Delete"
                                                >
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="announcement-card-content">
                                    <h2 className="announcement-card-title">{ann.title}</h2>
                                    <p className="announcement-card-message">{ann.message}</p>
                                </div>

                                <div className="announcement-card-footer">
                                    <span className="announcement-read-time">
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        >
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        {readTime}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Pagination */}
                    {totalCount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                            <button
                                className="btn-primary"
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    background: page === 1 ? '#cbd5e1' : '#4f46e5',
                                    color: page === 1 ? '#64748b' : '#fff',
                                    cursor: page === 1 ? 'not-allowed' : 'pointer'
                                }}
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </button>
                            <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>
                                Page {page} of {totalPages}
                            </span>
                            <button
                                className="btn-primary"
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    background: page === totalPages ? '#cbd5e1' : '#4f46e5',
                                    color: page === totalPages ? '#64748b' : '#fff',
                                    cursor: page === totalPages ? 'not-allowed' : 'pointer'
                                }}
                                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                disabled={page === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Create Announcement Modal */}
            {showCreateModal && (
                <div
                    className="modern-announcement-modal"
                    onClick={() => setShowCreateModal(false)}
                >
                    <div
                        className="modern-announcement-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modern-announcement-modal-header">
                            <button
                                className="modern-announcement-modal-close-btn"
                                onClick={() => setShowCreateModal(false)}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                            <h2 className="modern-announcement-modal-title">
                                Post Announcement
                            </h2>
                        </div>
                        <form
                            onSubmit={handleCreateSubmit}
                            className="modern-announcement-modal-body"
                        >
                            {formError && (
                                <div style={{ color: '#ef4444', background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: 500, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    {formError}
                                </div>
                            )}

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter announcement title..."
                                    value={form.title}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            title: e.target.value,
                                        })
                                    }
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Message</label>
                                <textarea
                                    className="form-input form-textarea"
                                    placeholder="Enter the detailed message..."
                                    value={form.message}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            message: e.target.value,
                                        })
                                    }
                                    style={{ width: '100%', minHeight: '120px', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', resize: 'vertical' }}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '24px' }}>
                                <label className="form-label" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Audience</label>
                                <select
                                    className="form-input"
                                    value={form.audience}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            audience: e.target.value,
                                        })
                                    }
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    required
                                >
                                    <option value="ALL">
                                        All Users (Admins + Team Members)
                                    </option>
                                    <option value="ADMINS_ONLY">
                                        Admins Only
                                    </option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    className="btn-cancel-white"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ padding: '10px 20px', borderRadius: '8px', background: '#4f46e5', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                                >
                                    Publish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Announcement Modal */}
            {showEditModal && (
                <div
                    className="modern-announcement-modal"
                    onClick={() => setShowEditModal(false)}
                >
                    <div
                        className="modern-announcement-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modern-announcement-modal-header">
                            <button
                                className="modern-announcement-modal-close-btn"
                                onClick={() => setShowEditModal(false)}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                            <h2 className="modern-announcement-modal-title">
                                Edit Announcement
                            </h2>
                        </div>
                        <form
                            onSubmit={handleEditSubmit}
                            className="modern-announcement-modal-body"
                        >
                            {formError && (
                                <div style={{ color: '#ef4444', background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: 500, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    {formError}
                                </div>
                            )}

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter announcement title..."
                                    value={form.title}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            title: e.target.value,
                                        })
                                    }
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Message</label>
                                <textarea
                                    className="form-input form-textarea"
                                    placeholder="Enter the detailed message..."
                                    value={form.message}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            message: e.target.value,
                                        })
                                    }
                                    style={{ width: '100%', minHeight: '120px', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', resize: 'vertical' }}
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    className="btn-cancel-white"
                                    onClick={() => setShowEditModal(false)}
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ padding: '10px 20px', borderRadius: '8px', background: '#4f46e5', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Announcements;
