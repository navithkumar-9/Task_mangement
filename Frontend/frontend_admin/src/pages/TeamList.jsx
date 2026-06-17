import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { getAvatarStyle } from '../utils/avatar';

/* ─── View Profile Modal ─── */
const UserProfileModal = ({ user, onClose }) => {
    if (!user) return null;
    const avatarStyle = getAvatarStyle(user.username);
    return (
        <div onClick={onClose} className="ext-team-list-212">
            <div
                onClick={(e) => e.stopPropagation()}
                className="ext-team-list-213"
            >
                {/* Header */}
                <div className="ext-team-list-214">
                    <button
                        onClick={onClose}
                        className="ext-team-list-215"
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                                'rgba(255,255,255,0.35)')
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                                'rgba(255,255,255,0.2)')
                        }
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
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <div className="ext-announcements-14">
                        <div className="ext-team-list-216">
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="ext-announcements-31">
                                Team Member Profile
                            </h2>
                            <p className="ext-team-list-217">
                                @{user.username}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="ext-team-list-218">
                    <div className="ext-team-list-219">
                        {user.profile_picture ? (
                            <img
                                src={user.profile_picture}
                                alt="Avatar"
                                className="ext-team-list-220"
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
                                {user.name?.charAt(0)?.toUpperCase() ||
                                    user.username?.charAt(0)?.toUpperCase() ||
                                    'U'}
                            </div>
                        )}
                        <h3 className="ext-team-list-221">
                            {user.name || user.username}
                        </h3>
                        <span className="ext-team-list-222">
                            @{user.username}
                        </span>
                    </div>

                    <div className="ext-team-list-223">
                        <div className="ext-team-list-224">
                            <div className="ext-team-list-225">User ID</div>
                            <div className="ext-team-list-226">#{user.id}</div>
                        </div>
                        <div className="ext-team-list-224">
                            <div className="ext-team-list-225">Employee ID</div>
                            <div className="ext-team-list-226">
                                {user.employee_id || '-'}
                            </div>
                        </div>
                    </div>

                    <div className="ext-team-list-223">
                        <div className="ext-team-list-224">
                            <div className="ext-team-list-225">
                                Email Address
                            </div>
                            <div
                                className="ext-team-list-227"
                                title={user.email}
                            >
                                {user.email || '-'}
                            </div>
                        </div>
                        <div className="ext-team-list-224">
                            <div className="ext-team-list-225">
                                Phone Number
                            </div>
                            <div className="ext-team-list-226">
                                {user.phone_number || '-'}
                            </div>
                        </div>
                    </div>

                    <div className="ext-team-list-228">
                        <div className="ext-team-list-224">
                            <div className="ext-team-list-225">Role</div>
                            <div className="ext-team-list-226">
                                <span
                                    className={`role-badge role-${user.role?.toLowerCase().replace('_', '') || 'member'}`}
                                >
                                    {user.role}
                                </span>
                            </div>
                        </div>
                        <div className="ext-team-list-224">
                            <div className="ext-team-list-225">Status</div>
                            <div className="ext-team-list-226">
                                <span className="status-badge status-active">
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="ext-team-list-229">
                    <button
                        onClick={onClose}
                        className="ext-team-list-230"
                        onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
                        onMouseLeave={(e) => (e.target.style.opacity = '1')}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Edit Member Modal ─── */
const EditMemberModal = ({ member, onClose, onSave }) => {
    const [form, setForm] = useState({
        user_name: member?.username || '',
        email: member?.email || '',
        phone_number: member?.phone_number || '',
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    if (!member) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        // Indian phone number validation
        if (form.phone_number) {
            const phoneStr = String(form.phone_number);
            if (phoneStr.length !== 10 || !/^\d{10}$/.test(phoneStr)) {
                setError('Phone number must be exactly 10 digits.');
                setSaving(false);
                return;
            }
            if (!/^[6-9]/.test(phoneStr)) {
                setError('Indian phone number must start with 6, 7, 8, or 9.');
                setSaving(false);
                return;
            }
        }
        try {
            const payload = {};
            if (form.user_name !== member.username)
                payload.user_name = form.user_name;
            if (form.email !== member.email) payload.email = form.email;
            const phone =
                form.phone_number === '' ? null : Number(form.phone_number);
            if (phone !== member.phone_number) payload.phone_number = phone;

            if (Object.keys(payload).length === 0) {
                onClose();
                return;
            }

            await API.put(`/admin/team-members/${member.id}/`, payload);
            onSave();
        } catch (err) {
            const data = err.response?.data;
            const phoneErr = data?.errors?.phone_number;
            setError(
                phoneErr
                    ? Array.isArray(phoneErr)
                        ? phoneErr[0]
                        : phoneErr
                    : data?.message || 'Failed to update member',
            );
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        fontSize: '0.95rem',
        background: 'var(--bg-color)',
        color: 'var(--text-primary)',
        outline: 'none',
        transition: 'border-color 0.2s',
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
    };

    return (
        <div onClick={onClose} className="ext-team-list-212">
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#ffffff',
                    width: '480px',
                    maxWidth: '95vw',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    animation: 'modalSlideIn 0.3s ease',
                }}
            >
                <div className="ext-team-list-232">
                    <h2 className="ext-tasks-196">Edit Team Member</h2>
                    <p className="ext-team-list-217">@{member.username}</p>
                </div>

                <form onSubmit={handleSubmit} className="ext-announcements-32">
                    {error && <div className="ext-team-list-233">{error}</div>}

                    <div className="ext-tasks-200">
                        <label style={labelStyle}>Username</label>
                        <input
                            type="text"
                            style={inputStyle}
                            value={form.user_name}
                            onChange={(e) =>
                                setForm({ ...form, user_name: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div className="ext-tasks-200">
                        <label style={labelStyle}>Email</label>
                        <input
                            type="email"
                            style={inputStyle}
                            value={form.email}
                            onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div className="ext-completed-tasks-84">
                        <label style={labelStyle}>Phone Number</label>
                        <input
                            type="tel"
                            maxLength={10}
                            style={inputStyle}
                            placeholder="10-digit Indian phone number"
                            value={form.phone_number || ''}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setForm({ ...form, phone_number: val });
                            }}
                        />
                        <span className="ext-team-list-234">
                            Must be 10 digits starting with 6, 7, 8, or 9
                        </span>
                    </div>

                    <div className="ext-team-list-235">
                        <button
                            type="button"
                            onClick={onClose}
                            className="ext-team-list-236"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'var(--primary)',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                opacity: saving ? 0.7 : 1,
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─── Delete Confirmation Modal ─── */
const DeleteConfirmModal = ({ member, onClose, onConfirm }) => {
    const [deleting, setDeleting] = useState(false);

    if (!member) return null;

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await API.delete(`/admin/team-members/${member.id}/`);
            onConfirm();
        } catch (err) {
            console.error('Failed to delete member', err);
            alert(err.response?.data?.message || 'Failed to delete member');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-card"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#ffffff',
                    width: '420px',
                    textAlign: 'center',
                    padding: '32px',
                }}
            >
                {/* Warning Icon */}
                <div className="ext-team-list-238">
                    <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ff6b6b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                </div>

                <h2 className="ext-team-list-239">Delete Team Member</h2>
                <p className="ext-team-list-240">
                    Are you sure you want to delete{' '}
                    <strong className="ext-team-list-241">
                        @{member.username}
                    </strong>
                    ? This action cannot be undone and will remove all
                    associated data.
                </p>

                <div className="ext-team-list-242">
                    <button
                        type="button"
                        onClick={onClose}
                        className="ext-team-list-243"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            background:
                                'linear-gradient(135deg, #ff6b6b, #ee5a5a)',
                            color: '#fff',
                            cursor: deleting ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            opacity: deleting ? 0.7 : 1,
                        }}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Main TeamList Component ─── */
const TeamList = () => {
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editMember, setEditMember] = useState(null);
    const [deleteMember, setDeleteMember] = useState(null);
    const [sortBy, setSortBy] = useState('-id');

    const handleSort = (field) => {
        setSortBy((prevSort) => {
            if (prevSort === field) {
                return `-${field}`;
            } else if (prevSort === `-${field}`) {
                return field;
            } else {
                return `-${field}`;
            }
        });
        setPage(1);
    };

    const renderSortArrow = (field) => {
        if (sortBy === field) {
            return (
                <span
                    style={{
                        marginLeft: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--primary)',
                    }}
                >
                    ▲
                </span>
            );
        }
        if (sortBy === `-${field}`) {
            return (
                <span
                    style={{
                        marginLeft: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--primary)',
                    }}
                >
                    ▼
                </span>
            );
        }
        return (
            <span
                style={{
                    marginLeft: '4px',
                    fontSize: '0.75rem',
                    opacity: 0.35,
                }}
            >
                ↕
            </span>
        );
    };

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(() => {
        fetchMembers();
    }, [page, debouncedSearch, sortBy]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (page > 1) params.append('page', page);
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (sortBy) params.append('sort_by', sortBy);

            const res = await API.get(
                `/admin/team-members/?${params.toString()}`,
            );

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

            setMembers(items);
            setTotalPages(Math.ceil(totalCount / 10) || 1);
        } catch (err) {
            console.error('Failed to fetch team members', err);
            setMembers([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleEditSave = () => {
        setEditMember(null);
        fetchMembers();
    };

    const handleDeleteConfirm = () => {
        setDeleteMember(null);
        fetchMembers();
    };

    return (
        <div className="page">
            <div className="page-header ext-calendar-57">
                <div>
                    <h1 className="page-title">Team Members</h1>
                    <p className="page-subtitle">
                        Manage your team members and their profiles
                    </p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => navigate('/create-member')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontWeight: 600,
                    }}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Member
                </button>
            </div>

            <div className="content-card">
                <div className="content-card-header">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search members..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {loading ? (
                    <div className="page-loader ext-calendar-68">
                        <div className="page-loader-spinner"></div>
                        <div className="page-loader-text">
                            Loading members...
                        </div>
                    </div>
                ) : members.length === 0 ? (
                    <div className="empty-state">
                        <p>
                            {debouncedSearch
                                ? 'No members match your search'
                                : 'No team members found'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th
                                            onClick={() => handleSort('id')}
                                            style={{
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                            }}
                                        >
                                            ID {renderSortArrow('id')}
                                        </th>
                                        <th
                                            onClick={() =>
                                                handleSort('username')
                                            }
                                            style={{
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                            }}
                                        >
                                            Username{' '}
                                            {renderSortArrow('username')}
                                        </th>
                                        <th
                                            onClick={() => handleSort('email')}
                                            style={{
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                            }}
                                        >
                                            Email {renderSortArrow('email')}
                                        </th>
                                        <th
                                            onClick={() =>
                                                handleSort('phone_number')
                                            }
                                            style={{
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                            }}
                                        >
                                            Phone{' '}
                                            {renderSortArrow('phone_number')}
                                        </th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((m, i) => {
                                        const avatarStyle = getAvatarStyle(
                                            m.username,
                                        );
                                        return (
                                            <tr key={m.id || i}>
                                                <td className="text-muted">
                                                    #{m.id}
                                                </td>
                                                <td className="text-bold">
                                                    <div className="ext-completed-tasks-127">
                                                        {m.profile_picture ? (
                                                            <img
                                                                src={
                                                                    m.profile_picture
                                                                }
                                                                alt="Avatar"
                                                                className="ext-team-list-245"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="sidebar-user-avatar"
                                                                style={{
                                                                    background:
                                                                        avatarStyle.bg,
                                                                    color: avatarStyle.text,
                                                                    width: '30px',
                                                                    height: '30px',
                                                                    borderRadius:
                                                                        '50%',
                                                                    display:
                                                                        'flex',
                                                                    alignItems:
                                                                        'center',
                                                                    justifyContent:
                                                                        'center',
                                                                    fontSize:
                                                                        '0.8rem',
                                                                    fontWeight:
                                                                        '700',
                                                                }}
                                                            >
                                                                {m.username
                                                                    ?.charAt(0)
                                                                    .toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span>
                                                            {m.username}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="text-muted">
                                                    {m.email || '—'}
                                                </td>
                                                <td className="text-muted">
                                                    {m.phone_number || '—'}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`role-badge role-${m.role?.toLowerCase().replace('_', '') || 'member'}`}
                                                    >
                                                        {m.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="status-badge status-active">
                                                        Active
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="ext-team-list-246">
                                                        {/* View */}
                                                        <button
                                                            className="btn-icon"
                                                            title="View Profile"
                                                            onClick={() =>
                                                                setSelectedUser(
                                                                    m,
                                                                )
                                                            }
                                                            style={{
                                                                padding: '6px',
                                                                borderRadius:
                                                                    '6px',
                                                                border: 'none',
                                                                background:
                                                                    'var(--primary)',
                                                                color: '#ffffff',
                                                                cursor: 'pointer',
                                                                display:
                                                                    'inline-flex',
                                                                alignItems:
                                                                    'center',
                                                                justifyContent:
                                                                    'center',
                                                            }}
                                                        >
                                                            <svg
                                                                width="15"
                                                                height="15"
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

                                                        {/* Edit */}
                                                        <button
                                                            className="btn-icon"
                                                            title="Edit Member"
                                                            onClick={() =>
                                                                setEditMember(m)
                                                            }
                                                            style={{
                                                                border: '1px solid var(--border-color)',
                                                                color: 'var(--primary)',
                                                            }}
                                                        >
                                                            <svg
                                                                width="15"
                                                                height="15"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>

                                                        {/* Delete */}
                                                        <button
                                                            className="btn-icon"
                                                            title="Delete Member"
                                                            onClick={() =>
                                                                setDeleteMember(
                                                                    m,
                                                                )
                                                            }
                                                            style={{
                                                                border: '1px solid rgba(255,107,107,0.3)',
                                                                color: '#ff6b6b',
                                                            }}
                                                        >
                                                            <svg
                                                                width="15"
                                                                height="15"
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
                                                </td>
                                            </tr>
                                        );
                                    })}
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

            {/* View Profile Modal */}
            <UserProfileModal
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
            />

            {/* Edit Modal */}
            {editMember && (
                <EditMemberModal
                    member={editMember}
                    onClose={() => setEditMember(null)}
                    onSave={handleEditSave}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteMember && (
                <DeleteConfirmModal
                    member={deleteMember}
                    onClose={() => setDeleteMember(null)}
                    onConfirm={handleDeleteConfirm}
                />
            )}
        </div>
    );
};

export default TeamList;
