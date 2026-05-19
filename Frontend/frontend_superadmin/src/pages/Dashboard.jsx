import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    fetchProfile();
    const stored = JSON.parse(localStorage.getItem('sa_admins_list') || '[]');
    setAdmins(stored);
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await API.get('/profile/');
      if (res.data.success) setProfile(res.data.data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const stats = [
    {
      label: 'Total Admins',
      value: admins.length,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      ),
      color: 'purple',
    },
    {
      label: 'Active Sessions',
      value: 1,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
      ),
      color: 'green',
    },
    {
      label: 'System Status',
      value: 'Online',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      ),
      color: 'blue',
    },
    {
      label: 'Your Role',
      value: profile?.role || 'SUPER_ADMIN',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      ),
      color: 'amber',
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, <span className="text-accent">{profile?.username || user?.username || 'Super Admin'}</span></p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div className={`stat-card stat-${stat.color}`} key={i}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Admins */}
      <div className="content-card">
        <div className="content-card-header">
          <h2 className="content-card-title">Recent Admins</h2>
          <span className="badge-count">{admins.length}</span>
        </div>
        {admins.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <p>No admins created yet</p>
            <span className="empty-hint">Go to "Create Admin" to add your first admin</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {admins.slice(0, 5).map((admin, idx) => (
                  <tr key={idx}>
                    <td className="text-muted">#{admin.id}</td>
                    <td className="text-bold">{admin.username}</td>
                    <td><span className="role-badge role-admin">{admin.role}</span></td>
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

export default Dashboard;
