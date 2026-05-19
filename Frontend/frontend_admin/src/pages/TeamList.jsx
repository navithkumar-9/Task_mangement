import { useState, useEffect } from 'react';

const TeamList = () => {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('admin_members_list') || '[]');
    setMembers(stored);
  }, []);

  const filtered = members.filter(m =>
    m.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">{members.length} member{members.length !== 1 ? 's' : ''} in your team</p>
        </div>
      </div>
      <div className="content-card">
        <div className="content-card-header">
          <input type="text" className="search-input" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>{search ? 'No members match your search' : 'No team members yet'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Created</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={i}>
                    <td className="text-muted">#{m.id}</td>
                    <td className="text-bold">{m.username}</td>
                    <td><span className="role-badge role-member">{m.role}</span></td>
                    <td className="text-muted">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}</td>
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

export default TeamList;
