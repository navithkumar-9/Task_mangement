import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';

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

/* ─── View Profile Modal ─── */
const UserProfileModal = ({ user, onClose }) => {
  if (!user) return null;
  const avatarStyle = getAvatarStyle(user.username);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#ffffff', width: '420px' }}
      >
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Team Member Profile</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0' }}>
          {user.profile_picture ? (
            <img
              src={user.profile_picture}
              alt="Avatar"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--border-color)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
          ) : (
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: avatarStyle.bg,
                color: avatarStyle.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: '800',
                border: '3px solid var(--border-color)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <h3 style={{ margin: '12px 0 2px 0', fontSize: '1.2rem', fontWeight: 800 }}>
            {user.name || user.username}
          </h3>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>@{user.username}</span>
        </div>
        <div className="profile-details" style={{ marginTop: '10px' }}>
          <div className="profile-row">
            <span className="profile-label">ID</span>
            <span className="profile-value">#{user.id}</span>
          </div>
          {user.name && (
            <div className="profile-row">
              <span className="profile-label">Full Name</span>
              <span className="profile-value">{user.name}</span>
            </div>
          )}
          {user.employee_id && (
            <div className="profile-row">
              <span className="profile-label">Employee ID</span>
              <span className="profile-value">{user.employee_id}</span>
            </div>
          )}
          {user.email && (
            <div className="profile-row">
              <span className="profile-label">Email</span>
              <span className="profile-value">{user.email}</span>
            </div>
          )}
          {user.phone_number && (
            <div className="profile-row">
              <span className="profile-label">Phone Number</span>
              <span className="profile-value">{user.phone_number}</span>
            </div>
          )}
          <div className="profile-row">
            <span className="profile-label">Role</span>
            <span className="profile-value">
              <span className={`role-badge role-${user.role?.toLowerCase().replace('_', '') || 'member'}`}>
                {user.role}
              </span>
            </span>
          </div>
        </div>
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button className="btn-primary" onClick={onClose} style={{ padding: '10px 24px', borderRadius: '8px' }}>Close</button>
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
    try {
      const payload = {};
      if (form.user_name !== member.username) payload.user_name = form.user_name;
      if (form.email !== member.email) payload.email = form.email;
      const phone = form.phone_number === '' ? null : Number(form.phone_number);
      if (phone !== member.phone_number) payload.phone_number = phone;

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      await API.put(`/admin/team-members/${member.id}/`, payload);
      onSave();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || data?.errors ? JSON.stringify(data.errors) : 'Failed to update member');
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#ffffff', width: '480px' }}
      >
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Edit Team Member</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(255,107,107,0.1)',
              color: '#ff6b6b',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              style={inputStyle}
              value={form.user_name}
              onChange={(e) => setForm({ ...form, user_name: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              style={inputStyle}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Phone Number</label>
            <input
              type="number"
              style={inputStyle}
              placeholder="Optional"
              value={form.phone_number || ''}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 600,
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
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(255,107,107,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>Delete Team Member</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 24px' }}>
          Are you sure you want to delete <strong style={{ color: 'var(--primary)' }}>@{member.username}</strong>?
          This action cannot be undone and will remove all associated data.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 600,
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}
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
              background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)',
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
  }, [page, debouncedSearch]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (page > 1) params.append('page', page);
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await API.get(`/admin/team-members/?${params.toString()}`);

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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">Manage your team members and their profiles</p>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                        <div className="page-loader" style={{ padding: '60px 0' }}>
                            <div className="page-loader-spinner"></div>
                            <div className="page-loader-text">Loading members...</div>
                        </div>
                    ) : members.length === 0 ? (
          <div className="empty-state">
            <p>{debouncedSearch ? 'No members match your search' : 'No team members found'}</p>
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
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {members.map((m, i) => {
                     const avatarStyle = getAvatarStyle(m.username);
                     return (
                       <tr key={m.id || i}>
                         <td className="text-muted">#{m.id}</td>
                         <td className="text-bold">
                           <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                             {m.profile_picture ? (
                               <img
                                 src={m.profile_picture}
                                 alt="Avatar"
                                 style={{
                                   width: '30px',
                                   height: '30px',
                                   borderRadius: '50%',
                                   objectFit: 'cover',
                                 }}
                               />
                             ) : (
                               <div
                                 className="sidebar-user-avatar"
                                 style={{
                                   background: avatarStyle.bg,
                                   color: avatarStyle.text,
                                   width: '30px',
                                   height: '30px',
                                   borderRadius: '50%',
                                   display: 'flex',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   fontSize: '0.8rem',
                                   fontWeight: '700',
                                 }}
                               >
                                 {m.username?.charAt(0).toUpperCase()}
                               </div>
                             )}
                             <span>{m.username}</span>
                           </div>
                         </td>
                         <td className="text-muted">{m.email || '—'}</td>
                         <td className="text-muted">{m.phone_number || '—'}</td>
                         <td>
                           <span className={`role-badge role-${m.role?.toLowerCase().replace('_', '') || 'member'}`}>
                             {m.role}
                           </span>
                         </td>
                         <td><span className="status-badge status-active">Active</span></td>
                         <td>
                           <div style={{ display: 'flex', gap: '8px' }}>
                             {/* View */}
                             <button
                               className="btn-icon"
                               title="View Profile"
                               onClick={() => setSelectedUser(m)}
                               style={{ border: '1px solid var(--border-color)' }}
                             >
                               <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                 <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                 <circle cx="12" cy="12" r="3" />
                               </svg>
                             </button>
 
                             {/* Edit */}
                             <button
                               className="btn-icon"
                               title="Edit Member"
                               onClick={() => setEditMember(m)}
                               style={{ border: '1px solid var(--border-color)', color: 'var(--primary)' }}
                             >
                               <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                 <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                 <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                               </svg>
                             </button>
 
                             {/* Delete */}
                             <button
                               className="btn-icon"
                               title="Delete Member"
                               onClick={() => setDeleteMember(m)}
                               style={{ border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b' }}
                             >
                               <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <span className="pagination-info">Page {page} of {totalPages}</span>
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
