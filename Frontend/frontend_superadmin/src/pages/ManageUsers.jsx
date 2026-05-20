import { useEffect, useState } from 'react';
import API from '../api/axios';

const UserProfileModal = ({ user, onClose }) => {
    if (!user) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                <h2 className="modal-title">User Profile</h2>
                <div className="profile-details">
                    <div className="profile-row">
                        <span className="profile-label">ID</span>
                        <span className="profile-value">#{user.id}</span>
                    </div>
                    <div className="profile-row">
                        <span className="profile-label">Username</span>
                        <span className="profile-value">{user.username}</span>
                    </div>
                    {user.email && (
                        <div className="profile-row">
                            <span className="profile-label">Email</span>
                            <span className="profile-value">{user.email}</span>
                        </div>
                    )}
                    {user.phone_number && (
                        <div className="profile-row">
                            <span className="profile-label">Phone Number</span>
                            <span className="profile-value">
                                {user.phone_number}
                            </span>
                        </div>
                    )}
                    <div className="profile-row">
                        <span className="profile-label">Role</span>
                        <span className="profile-value">
                            <span
                                className={`role-badge role-${user.role.toLowerCase().replace('_', '')}`}
                            >
                                {user.role}
                            </span>
                        </span>
                    </div>
                    {user.created_by && (
                        <div className="profile-row">
                            <span className="profile-label">Created By</span>
                            <span className="profile-value">
                                {user.created_by}
                            </span>
                        </div>
                    )}
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
            // Fallback to local storage for Admins if API fails, just for testing
            if (activeTab === 'admins' && !debouncedSearch) {
                const stored = JSON.parse(
                    localStorage.getItem('sa_admins_list') || '[]',
                );
                setUsers(stored);
                setTotalPages(1);
            } else {
                setUsers([]);
                setTotalPages(1);
            }
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
                    <div className="empty-state">
                        <div className="spinner"></div>
                        <p>Loading users...</p>
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
        </div>
    );
};

export default ManageUsers;
