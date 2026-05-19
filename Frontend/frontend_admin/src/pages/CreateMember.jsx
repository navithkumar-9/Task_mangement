import { useState } from 'react';
import API from '../api/axios';

const CreateMember = () => {
  const [formData, setFormData] = useState({ user_name: '', password: '', email: '' });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('/create-team-member/', formData);
      if (res.data.success) {
        showToast(`Member "${res.data.data.username}" created!`, 'success');
        const existing = JSON.parse(localStorage.getItem('admin_members_list') || '[]');
        existing.unshift({ ...res.data.data, createdAt: new Date().toISOString() });
        localStorage.setItem('admin_members_list', JSON.stringify(existing));
        setFormData({ user_name: '', password: '', email: '' });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to create member';
      const fieldErrors = err.response?.data?.errors;
      if (fieldErrors) {
        showToast(`${errMsg}: ${Object.values(fieldErrors).flat().join(', ')}`, 'error');
      } else {
        showToast(errMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {toast && <div className={`toast-notification toast-${toast.type}`}>{toast.message}</div>}
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Team Member</h1>
          <p className="page-subtitle">Add a new team member to your workspace</p>
        </div>
      </div>
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="form-input" placeholder="Member username" value={formData.user_name} onChange={(e) => setFormData({...formData, user_name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="member@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="Create a strong password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Create Member'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateMember;
