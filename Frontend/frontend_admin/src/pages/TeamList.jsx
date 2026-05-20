import { useState, useEffect } from 'react';
import API from '../api/axios';

const UserProfileModal = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Team Member Profile</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
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
        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const TeamList = () => {
  const [members, setMembers] = useState([]);
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
      // Fallback for testing
      if (!debouncedSearch) {
        const stored = JSON.parse(localStorage.getItem('admin_members_list') || '[]');
        setMembers(stored);
      }
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">Manage your team members and their profiles</p>
        </div>
      </div>
      <div className="content-card">
        <div className="content-card-header">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search members..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        {loading ? (
          <div className="empty-state">
            <div className="spinner"></div>
            <p>Loading members...</p>
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
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, i) => (
                    <tr key={m.id || i}>
                      <td className="text-muted">#{m.id}</td>
                      <td className="text-bold">{m.username}</td>
                      <td className="text-muted">{m.email || '—'}</td>
                      <td>
                        <span className={`role-badge role-${m.role?.toLowerCase().replace('_', '') || 'member'}`}>
                          {m.role}
                        </span>
                      </td>
                      <td><span className="status-badge status-active">Active</span></td>
                      <td>
                        <button 
                          className="btn-icon" 
                          title="View Profile"
                          onClick={() => setSelectedUser(m)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
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
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info">Page {page} of {totalPages}</span>
                <button 
                  className="pagination-btn" 
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
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

export default TeamList;
