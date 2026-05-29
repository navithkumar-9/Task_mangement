import { useEffect, useState } from 'react';
import API from '../api/axios';

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

const UserProfileModal = ({ user, onClose }) => {
    if (!user) return null;
    const avatarStyle = getAvatarStyle(user.username);

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                animation: 'fadeIn 0.2s ease',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#ffffff',
                    width: '500px',
                    maxWidth: '95vw',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    animation: 'modalSlideIn 0.3s ease',
                }}
            >
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '24px 28px',
                    borderRadius: '16px 16px 0 0',
                    position: 'relative',
                }}>
                    <button
                        onClick={onClose}
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
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '12px',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>User Profile</h2>
                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>
                                @{user.username}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '24px 28px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px 0 24px 0' }}>
                        {user.profile_picture ? (
                            <img
                                src={user.profile_picture}
                                alt="Avatar"
                                style={{
                                    width: '90px',
                                    height: '90px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '3px solid #e2e8f0',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '90px',
                                    height: '90px',
                                    borderRadius: '50%',
                                    background: avatarStyle.bg,
                                    color: avatarStyle.text,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2.2rem',
                                    fontWeight: '800',
                                    border: '3px solid #e2e8f0',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                }}
                            >
                                {user.username?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        )}
                        <h3 style={{ margin: '14px 0 2px 0', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
                            {user.username}
                        </h3>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>@{user.username}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '6px' }}>User ID</div>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>#{user.id}</div>
                        </div>
                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '6px' }}>Account Status</div>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                                <span className="status-badge status-active">Active</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '6px' }}>Email Address</div>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.email}>{user.email || '-'}</div>
                        </div>
                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '6px' }}>Phone Number</div>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{user.phone_number || '-'}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '6px' }}>Role</div>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                                <span className={`role-badge role-${user.role?.toLowerCase().replace('_', '') || 'member'}`}>
                                    {user.role}
                                </span>
                            </div>
                        </div>
                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '6px' }}>Created By</div>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{user.created_by || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const ManageUsers = () => {
    const [activeTab, setActiveTab] = useState('admins'); // 'admins' | 'team-members'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ user_name: '', email: '', phone_number: '' });
    const [editError, setEditError] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [deletingUser, setDeletingUser] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(() => {
        fetchUsers();
    }, [activeTab, page, debouncedSearch]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const endpoint =
                activeTab === 'admins'
                    ? '/admins/'
                    : '/super-admin/team-members/';
            const params = new URLSearchParams();
            if (page > 1) params.append('page', page);
            if (debouncedSearch) params.append('search', debouncedSearch);

            const res = await API.get(`${endpoint}?${params.toString()}`);

            // DRF PageNumberPagination wraps response differently sometimes
            // Our backend uses CustomPagination which returns:
            // { count, next, previous, results: { isV1, success, message, data } }
            // Or if get_paginated_response was just given a dictionary:
            // Actually standard DRF is { count, next, previous, results: <data> }
            // In views.py, it was passed a dict with "data". Let's handle both.

            let items = [];
            let totalCount = 0;

            if (res.data.results && res.data.results.data) {
                items = res.data.results.data;
                totalCount = res.data.count || 0;
            } else if (res.data.data) {
                items = res.data.data;
                totalCount = res.data.count || items.length;
            } else if (res.data.results) {
                items = res.data.results;
                totalCount = res.data.count || 0;
            }

            setUsers(items);
            // Assume page_size = 10 from pagination.py
            setTotalPages(Math.ceil(totalCount / 10) || 1);
        } catch (err) {
            console.error('Failed to fetch users', err);
            setUsers([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearch('');
        setDebouncedSearch('');
        setPage(1);
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setEditForm({
            user_name: user.username || '',
            email: user.email || '',
            phone_number: user.phone_number || '',
        });
        setEditError('');
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditError('');
        if (editForm.phone_number) {
            const phoneStr = String(editForm.phone_number);
            if (phoneStr.length !== 10 || !/^[6-9]/.test(phoneStr)) {
                setEditError('Phone number must be 10 digits starting with 6, 7, 8, or 9.');
                return;
            }
        }
        setEditLoading(true);
        try {
            const payload = {};
            if (editForm.user_name !== editingUser.username) payload.user_name = editForm.user_name;
            if (editForm.email !== editingUser.email) payload.email = editForm.email;
            const phone = editForm.phone_number === '' ? null : Number(editForm.phone_number);
            if (phone !== editingUser.phone_number) payload.phone_number = phone;
            await API.put(`/admins/${editingUser.id}/`, payload);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            setEditError(err.response?.data?.message || err.response?.data?.errors?.phone_number?.[0] || 'Failed to update admin');
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteClick = (user) => {
        setDeletingUser(user);
    };

    const handleDeleteConfirm = async () => {
        setDeleteLoading(true);
        try {
            await API.delete(`/admins/${deletingUser.id}/`);
            setDeletingUser(null);
            fetchUsers();
        } catch (err) {
            console.error('Failed to delete admin', err);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Manage Users</h1>
                    <p className="page-subtitle">
                        View and manage admins and team members
                    </p>
                </div>
            </div>

            <div className="tabs-container">
                <button
                    className={`tab-button ${activeTab === 'admins' ? 'active' : ''}`}
                    onClick={() => handleTabChange('admins')}
                >
                    Admins
                </button>
                <button
                    className={`tab-button ${activeTab === 'team-members' ? 'active' : ''}`}
                    onClick={() => handleTabChange('team-members')}
                >
                    Team Members
                </button>
            </div>

            <div className="content-card">
                <div className="content-card-header">
                    <input
                        type="text"
                        className="search-input"
                        placeholder={`Search ${activeTab.replace('-', ' ')}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {loading ? (
                        <div className="page-loader" style={{ padding: '60px 0' }}>
                            <div className="page-loader-spinner"></div>
                            <div className="page-loader-text">Loading users...</div>
                        </div>
                    ) : users.length === 0 ? (
                    <div className="empty-state">
                        <svg
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            opacity="0.3"
                        >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                        </svg>
                        <p>
                            {debouncedSearch
                                ? 'No users match your search'
                                : `No ${activeTab.replace('-', ' ')} found`}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user, idx) => (
                                        <tr key={user.id || idx}>
                                            <td className="text-muted">
                                                #{user.id}
                                            </td>
                                            <td className="text-bold">
                                                {user.username}
                                            </td>
                                            <td className="text-muted">
                                                {user.email || '—'}
                                            </td>
                                            <td>
                                                <span
                                                    className={`role-badge role-${user.role.toLowerCase().replace('_', '')}`}
                                                >
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="status-badge status-active">
                                                    Active
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <button
                                                    className="btn-icon"
                                                    title="View Profile"
                                                    onClick={() =>
                                                        setSelectedUser(user)
                                                    }
                                                >
                                                    <svg
                                                        width="18"
                                                        height="18"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                    >
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                        <circle
                                                            cx="12"
                                                            cy="12"
                                                            r="3"
                                                        />
                                                    </svg>
                                                </button>
                                                {activeTab === 'admins' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditClick(user)}
                                                            className="btn-icon"
                                                            title="Edit Admin"
                                                            style={{
                                                                padding: '6px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--border-color)',
                                                                background: 'transparent',
                                                                cursor: 'pointer',
                                                                color: '#f59e0b',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(user)}
                                                            className="btn-icon"
                                                            title="Delete Admin"
                                                            style={{
                                                                padding: '6px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--border-color)',
                                                                background: 'transparent',
                                                                cursor: 'pointer',
                                                                color: '#ef4444',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6" />
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                                <line x1="14" y1="11" x2="14" y2="17" />
                                                            </svg>
                                                        </button>
                                                    </>
                                                )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    disabled={page === 1}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    Previous
                                </button>
                                <span className="pagination-info">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    className="pagination-btn"
                                    disabled={page === totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <UserProfileModal
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
            />

            {/* Edit Admin Modal */}
            {editingUser && (
                <div
                    onClick={() => setEditingUser(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                        animation: 'fadeIn 0.2s ease',
                    }}
                >
                    <div onClick={(e) => e.stopPropagation()} style={{
                        background: '#ffffff', width: '480px', maxWidth: '95vw', borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'modalSlideIn 0.3s ease',
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            padding: '20px 24px', borderRadius: '16px 16px 0 0',
                        }}>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>Edit Admin</h2>
                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>
                                @{editingUser.username}
                            </p>
                        </div>
                        <form onSubmit={handleEditSubmit} style={{ padding: '24px' }}>
                            {editError && (
                                <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 500 }}>
                                    {editError}
                                </div>
                            )}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Username</label>
                                <input type="text" value={editForm.user_name} onChange={(e) => setEditForm({ ...editForm, user_name: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Email</label>
                                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Phone Number</label>
                                <input type="tel" maxLength={10} value={editForm.phone_number || ''}
                                    onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setEditForm({ ...editForm, phone_number: val }); }}
                                    placeholder="10-digit Indian phone number"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px', display: 'block' }}>Must start with 6, 7, 8, or 9</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => setEditingUser(null)}
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={editLoading}
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, opacity: editLoading ? 0.7 : 1 }}>
                                    {editLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deletingUser && (
                <div
                    onClick={() => setDeletingUser(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                        animation: 'fadeIn 0.2s ease',
                    }}
                >
                    <div onClick={(e) => e.stopPropagation()} style={{
                        background: '#ffffff', width: '420px', maxWidth: '95vw', borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'modalSlideIn 0.3s ease',
                        padding: '28px',
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>Delete Admin</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                Are you sure you want to delete <strong>@{deletingUser.username}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={() => setDeletingUser(null)}
                                style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Cancel
                            </button>
                            <button onClick={handleDeleteConfirm} disabled={deleteLoading}
                                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, opacity: deleteLoading ? 0.7 : 1 }}>
                                {deleteLoading ? 'Deleting...' : 'Delete Admin'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageUsers;
