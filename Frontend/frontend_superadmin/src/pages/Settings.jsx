import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const Settings = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get('/profile/');
        if (res.data.success) setProfile(res.data.data);
      } catch (err) { console.error(err); }
    };
    fetchProfile();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account settings</p>
        </div>
      </div>
      <div className="settings-grid">
        <div className="content-card">
          <h3 className="content-card-title">Profile Information</h3>
          <div className="settings-profile">
            <div className="settings-avatar">{profile?.username?.charAt(0)?.toUpperCase() || 'S'}</div>
            <div className="settings-fields">
              <div className="settings-field">
                <span className="settings-label">Username</span>
                <span className="settings-value">{profile?.username || '—'}</span>
              </div>
              <div className="settings-field">
                <span className="settings-label">Role</span>
                <span className="role-badge role-superadmin">{profile?.role || '—'}</span>
              </div>
              <div className="settings-field">
                <span className="settings-label">User ID</span>
                <span className="settings-value">#{profile?.id || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
