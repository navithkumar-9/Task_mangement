import { useState, useEffect } from 'react';

const AdminsList = () => {
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('sa_admins_list') || '[]');
    setAdmins(stored);
  }, []);

  const filtered = admins.filter(a =>
    a.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Admins</h1>
          <p className="page-subtitle">{admins.length} admin{admins.length !== 1 ? 's' : ''} in your organization</p>
        </div>
      </div>
      <div className="content-card">
        <div className="content-card-header">
          <input type="text" className="search-input" placeholder="Search admins..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <p>{search ? 'No admins match your search' : 'No admins created yet'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Username</th><th>Role</th><th>Created</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map((admin, idx) => (
                  <tr key={idx}>
                    <td className="text-muted">#{admin.id}</td>
                    <td className="text-bold">{admin.username}</td>
                    <td><span className="role-badge role-admin">{admin.role}</span></td>
                    <td className="text-muted">{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}</td>
                    <td><span className="status-badge status-active">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminsList;
