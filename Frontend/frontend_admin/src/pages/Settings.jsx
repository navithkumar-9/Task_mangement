import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const Settings = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    API.get('/profile/').then(res => {
      if (res.data.success) setProfile(res.data.data);
    }).catch(console.error);
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account</p>
        </div>
      </div>
      <div className="settings-grid">
        <div className="content-card">
          <h3 className="content-card-title">Profile Information</h3>
          <div className="settings-profile">
            <div className="settings-avatar">{profile?.username?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="settings-fields">
              <div className="settings-field">
                <span className="settings-label">Username</span>
                <span className="settings-value">{profile?.username || '—'}</span>
              </div>
              <div className="settings-field">
                <span className="settings-label">Role</span>
                <span className={`role-badge ${profile?.role === 'ADMIN' ? 'role-admin' : 'role-member'}`}>{profile?.role || '—'}</span>
              </div>
              <div className="settings-field">
                <span className="settings-label">User ID</span>
                <span className="settings-value">#{profile?.id || '—'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="content-card">
          <h3 className="content-card-title">Application Info</h3>
          <div className="settings-fields">
            <div className="settings-field">
              <span className="settings-label">App Name</span>
              <span className="settings-value">TaskFlow</span>
            </div>
            <div className="settings-field">
              <span className="settings-label">Version</span>
              <span className="settings-value">1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
