import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const getAvatarStyle = (username) => {
    const colors = [
        { bg: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', text: '#ffffff' }, // Blue
        { bg: 'linear-gradient(135deg, #10B981, #047857)', text: '#ffffff' }, // Emerald
        { bg: 'linear-gradient(135deg, #EC4899, #BE185D)', text: '#ffffff' }, // Pink
        { bg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', text: '#ffffff' }, // Violet
        { bg: 'linear-gradient(135deg, #F59E0B, #B45309)', text: '#ffffff' }, // Amber
        { bg: 'linear-gradient(135deg, #06B6D4, #0891B2)', text: '#ffffff' }, // Cyan
        { bg: 'linear-gradient(135deg, #EF4444, #B91C1C)', text: '#ffffff' }, // Rose
    ];
    let hash = 0;
    const name = username || '';
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

const Announcements = () => {
    const { user } = useAuth();

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('-created_at');
    const [page, setPage] = useState(1);
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
        audience: 'ALL', // Super Admin default
    });
    const [formError, setFormError] = useState('');
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        fetchAnnouncements();
    }, [page, searchQuery, sortBy]);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            let endpoint = `/announcements/super-admin/?page=${page}&sort_by=${sortBy}`;
            if (searchQuery) {
                endpoint += `&title=${encodeURIComponent(searchQuery)}`;
            }
            const res = await API.get(endpoint);
            const count = res.data.count || 0;
            setTotalCount(count);
            setTotalPages(Math.ceil(count / 10) || 1);

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
            setFormError(err.response?.data?.message || 'Failed to post announcement');
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
            const res = await API.put(`/announcements/${selectedAnnouncement.id}/`, payload);
            if (res.data.success) {
                showToast('Announcement updated successfully!', 'success');
                setShowEditModal(false);
                setSelectedAnnouncement(null);
                setForm({ title: '', message: '', audience: 'ALL' });
                fetchAnnouncements();
            }
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to update announcement');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
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
        return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    };

    const getAudienceBadgeStyle = (aud) => {
        switch (aud) {
            case 'ADMINS_ONLY':
                return { bg: 'rgba(123, 104, 238, 0.1)', color: '#7B68EE', label: 'Admins Only' };
            case 'ALL':
                return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', label: 'All Users' };
            case 'MY_TEAM':
                return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981', label: 'Team Only' };
            default:
                return { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748B', label: aud };
        }
    };

    return (
        <div className="page ext-announcements-2">
            {toast && (
                <div className={`toast-notification toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}

            <div className="page-header ext-announcements-3">
                <div>
                    <h1 className="page-title">Announcements</h1>
                    <p className="page-subtitle">Broadcasting messages and managing all announcements across the system</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setForm({ title: '', message: '', audience: 'ALL' });
                        setFormError('');
                        setShowCreateModal(true);
                    }}
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

            {/* Filter / Search Bar */}
            <div className="content-card ext-announcements-4">
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                    <div className="ext-announcements-5" style={{ flex: 1, minWidth: '250px', display: 'flex', alignItems: 'center' }}>
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--text-muted)"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input type="text" placeholder="Search all announcements by title..." className="search-input ext-announcements-6" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} style={{ width: '100%' }} />
                    </div>
                    <div>
                        <select
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                            className="filter-select"
                            style={{ minWidth: '160px' }}
                        >
                            <option value="-created_at">Newest First</option>
                            <option value="created_at">Oldest First</option>
                            <option value="title">Title (A-Z)</option>
                            <option value="-title">Title (Z-A)</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="page-loader">
                    <div className="page-loader-spinner"></div>
                    <div className="page-loader-text">Loading announcements...</div>
                </div>
            ) : announcements.length === 0 ? (
                <div className="empty-state ext-announcements-7">
                    <p className="ext-announcements-8">No announcements found</p>
                </div>
            ) : (
                <div className="ext-announcements-9">
                    {announcements.map((ann) => {
                        const audBadge = getAudienceBadgeStyle(ann.audience);
                        const avStyle = getAvatarStyle(ann.sender?.username);
                        // Super admin can only edit/delete their own announcements
                        const isOwn = user?.username === ann.sender?.username || user?.id === ann.sender?.id;

                        return (
                            <div key={ann.id} className="content-card ext-announcements-10">
                                <div className="ext-announcements-11">
                                    <div className="ext-announcements-12">
                                        {ann.sender?.profile_picture ? (
                                            <img src={ann.sender.profile_picture} alt="Avatar" className="ext-announcements-13"/>
                                        ) : (
                                            <div
                                                style={{
                                                    background: avStyle.bg,
                                                    color: avStyle.text,
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    fontSize: '1rem',
                                                    fontWeight: '700',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                {ann.sender?.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div className="ext-announcements-14">
                                                <span className="ext-announcements-15">
                                                    {ann.sender?.name || ann.sender?.username}
                                                </span>
                                                <span className="ext-announcements-16">
                                                    {ann.sender?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                                                </span>
                                            </div>
                                            <div className="ext-announcements-17">
                                                {formatDateTime(ann.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ext-announcements-14">
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                backgroundColor: audBadge.bg,
                                                color: audBadge.color,
                                            }}
                                        >
                                            {audBadge.label}
                                        </span>
                                        {isOwn && (
                                            <div className="ext-announcements-18">
                                                <button
                                                    onClick={() => openEditModal(ann)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        padding: '6px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        color: 'var(--text-muted)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                    title="Edit"
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-body)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ann.id)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        padding: '6px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        color: '#ff6b6b',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                    title="Delete"
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.08)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <h2 className="ext-announcements-21">
                                    {ann.title}
                                </h2>
                                <p className="ext-announcements-22">
                                    {ann.message}
                                </p>
                            </div>
                        );
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="ext-announcements-23">
                            <button
                                className="btn-primary"
                                style={{ padding: '8px 16px', background: page === 1 ? 'var(--border-color)' : 'var(--primary)' }}
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </button>
                            <span className="ext-announcements-24">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                className="btn-primary"
                                style={{ padding: '8px 16px', background: page === totalPages ? 'var(--border-color)' : 'var(--primary)' }}
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
                <div className="ext-announcements-25" onClick={() => setShowCreateModal(false)} >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            width: '540px',
                            maxWidth: '90vw',
                            borderRadius: '16px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            animation: 'modalSlideIn 0.25s ease',
                        }}
                    >
                        <div className="ext-announcements-27">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#fff',
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                            <h2 className="ext-announcements-29">Post Announcement</h2>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="ext-announcements-30">
                            {formError && (
                                <div className="ext-announcements-31">
                                    {formError}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter announcement title..."
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Message</label>
                                <textarea className="form-input form-textarea ext-announcements-32" placeholder="Enter the detailed message..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Audience</label>
                                <select
                                    className="form-input"
                                    value={form.audience}
                                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                                    required
                                >
                                    <option value="ALL">All Users (Admins + Team Members)</option>
                                    <option value="ADMINS_ONLY">Admins Only</option>
                                </select>
                            </div>

                            <div className="ext-announcements-33">
                                <button type="button" className="btn-cancel-white" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary ext-announcements-35">
                                    Publish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Announcement Modal */}
            {showEditModal && (
                <div className="ext-announcements-25" onClick={() => setShowEditModal(false)} >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            width: '540px',
                            maxWidth: '90vw',
                            borderRadius: '16px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            animation: 'modalSlideIn 0.25s ease',
                        }}
                    >
                        <div className="ext-announcements-27">
                            <button
                                onClick={() => setShowEditModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#fff',
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                            <h2 className="ext-announcements-29">Edit Announcement</h2>
                        </div>
                        <form onSubmit={handleEditSubmit} className="ext-announcements-30">
                            {formError && (
                                <div className="ext-announcements-31">
                                    {formError}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter announcement title..."
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Message</label>
                                <textarea className="form-input form-textarea ext-announcements-32" placeholder="Enter the detailed message..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                            </div>

                            <div className="ext-announcements-33">
                                <button type="button" className="btn-cancel-white" onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary ext-announcements-35">
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
