import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getAvatarStyle } from '../utils/avatar';

const Settings = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [name, setName] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [uploadingPic, setUploadingPic] = useState(false);

    // Password Form State
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    useEffect(() => {
        API.get('/profile/')
            .then((res) => {
                if (res.data.success) {
                    const profileData = res.data.data;
                    setProfile(profileData);
                    setName(profileData.name || profileData.username || '');
                    setEmployeeId(profileData.employee_id || '');
                    setProfilePic(profileData.profile_picture || null);
                }
            })
            .catch(console.error);
    }, []);

    const showToastNotification = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showToastNotification('File size exceeds 2MB limit.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Pic = reader.result;
                setUploadingPic(true);
                API.put('/profile/', { profile_picture: base64Pic })
                    .then((res) => {
                        if (res.data.success) {
                            setProfile(res.data.data);
                            setProfilePic(base64Pic);
                            // Dispatch profileUpdate event
                            window.dispatchEvent(new Event('profileUpdate'));
                            showToastNotification(
                                'Profile picture updated successfully!',
                            );
                        } else {
                            showToastNotification(
                                'Failed to update profile picture.',
                                'error',
                            );
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        showToastNotification(
                            'Failed to update profile picture.',
                            'error',
                        );
                    })
                    .finally(() => {
                        setUploadingPic(false);
                    });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveDetails = (e) => {
        e.preventDefault();
        setSaving(true);
        API.put('/profile/', { name, employee_id: employeeId })
            .then((res) => {
                if (res.data.success) {
                    setProfile(res.data.data);
                    // Dispatch profileUpdate event
                    window.dispatchEvent(new Event('profileUpdate'));
                    showToastNotification(
                        'Profile details saved successfully!',
                    );
                } else {
                    showToastNotification('Failed to update details.', 'error');
                }
            })
            .catch((err) => {
                console.error(err);
                showToastNotification('Failed to update details.', 'error');
            })
            .finally(() => {
                setSaving(false);
            });
    };

    const handleSavePassword = (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToastNotification('New passwords do not match!', 'error');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            showToastNotification(
                'Password must be at least 6 characters long.',
                'error',
            );
            return;
        }
        setSaving(true);
        API.put('/profile/', { password: passwordForm.newPassword })
            .then((res) => {
                if (res.data.success) {
                    showToastNotification('Password changed successfully!');
                    setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                    });
                } else {
                    showToastNotification(
                        'Failed to change password.',
                        'error',
                    );
                }
            })
            .catch((err) => {
                console.error(err);
                showToastNotification('Failed to change password.', 'error');
            })
            .finally(() => {
                setSaving(false);
            });
    };

    if (!profile) {
        return (
            <div className="page ext-settings-168">
                <div className="empty-state ext-settings-169">
                    <div className="spinner ext-settings-170"></div>
                    <p className="ext-settings-171">Loading Settings...</p>
                </div>
            </div>
        );
    }

    const avatarStyle = getAvatarStyle(profile?.username);

    return (
        <div className="page">
            {toast && (
                <div className={`toast-notification toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">
                        Manage your personal details and account security
                    </p>
                </div>
            </div>

            <div className="settings-grid ext-settings-172">
                {/* Left Card: Profile Preview */}
                <div className="content-card ext-settings-173">
                    <div className="profile-edit-avatar-wrapper ext-settings-174">
                        {profilePic ? (
                            <img
                                src={profilePic}
                                alt="Profile"
                                className="profile-edit-avatar-img"
                            />
                        ) : (
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    background: avatarStyle.bg,
                                    color: avatarStyle.text,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2.2rem',
                                    fontWeight: '800',
                                }}
                            >
                                {name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        )}
                        {uploadingPic && (
                            <div className="ext-settings-175">
                                <div className="spinner ext-settings-176"></div>
                            </div>
                        )}
                        <label
                            className="profile-edit-avatar-overlay"
                            htmlFor="profile-upload-file"
                        >
                            <svg
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                                />
                                <circle cx="12" cy="13" r="3" />
                            </svg>
                        </label>
                        <input
                            type="file"
                            id="profile-upload-file"
                            accept="image/*"
                            className="ext-settings-177"
                            onChange={handleFileChange}
                        />
                    </div>

                    <h2 className="ext-settings-178">{name || 'User'}</h2>
                    <p className="ext-settings-179">@{profile?.username}</p>
                    <span
                        className={`role-badge ${profile?.role === 'ADMIN' ? 'role-admin' : 'role-member'}`}
                    >
                        {profile?.role}
                    </span>

                    {employeeId && (
                        <div className="settings-indicator-badge">
                            ID: {employeeId}
                        </div>
                    )}
                </div>

                {/* Right Card: Account Details & Forms */}
                <div className="content-card ext-settings-180">
                    <div className="settings-menu-tabs">
                        <button
                            className={`settings-tab-btn ${activeTab === 'general' ? 'settings-tab-btn-active' : ''}`}
                            onClick={() => setActiveTab('general')}
                        >
                            Profile Details
                        </button>
                        <button
                            className={`settings-tab-btn ${activeTab === 'security' ? 'settings-tab-btn-active' : ''}`}
                            onClick={() => setActiveTab('security')}
                        >
                            Account Security
                        </button>
                    </div>

                    {activeTab === 'general' ? (
                        <form onSubmit={handleSaveDetails}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter your name"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        Employee ID
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. EMP-1049"
                                        value={employeeId}
                                        onChange={(e) =>
                                            setEmployeeId(e.target.value)
                                        }
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input ext-settings-181"
                                        value={profile?.username || ''}
                                        disabled
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <input
                                        type="text"
                                        className="form-input ext-settings-181"
                                        value={profile?.role || ''}
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="ext-settings-182">
                                <button
                                    type="submit"
                                    className="btn-primary ext-settings-183"
                                    disabled={saving}
                                >
                                    {saving && (
                                        <span className="spinner ext-settings-184"></span>
                                    )}
                                    {saving ? 'Saving...' : 'Save Details'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSavePassword}>
                            <div className="form-group">
                                <label className="form-label">
                                    Current Password
                                </label>
                                <div className="password-input-container">
                                    <input
                                        type={
                                            showCurrentPass
                                                ? 'text'
                                                : 'password'
                                        }
                                        className="form-input"
                                        placeholder="Enter current password"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) =>
                                            setPasswordForm({
                                                ...passwordForm,
                                                currentPassword: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-eye"
                                        onClick={() =>
                                            setShowCurrentPass(!showCurrentPass)
                                        }
                                    >
                                        {showCurrentPass ? (
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                <line
                                                    x1="1"
                                                    y1="1"
                                                    x2="23"
                                                    y2="23"
                                                />
                                            </svg>
                                        ) : (
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="form-row ext-settings-182">
                                <div className="form-group">
                                    <label className="form-label">
                                        New Password
                                    </label>
                                    <div className="password-input-container">
                                        <input
                                            type={
                                                showNewPass
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            className="form-input"
                                            placeholder="Enter new password"
                                            value={passwordForm.newPassword}
                                            onChange={(e) =>
                                                setPasswordForm({
                                                    ...passwordForm,
                                                    newPassword: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle-eye"
                                            onClick={() =>
                                                setShowNewPass(!showNewPass)
                                            }
                                        >
                                            {showNewPass ? (
                                                <svg
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line
                                                        x1="1"
                                                        y1="1"
                                                        x2="23"
                                                        y2="23"
                                                    />
                                                </svg>
                                            ) : (
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
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        Confirm New Password
                                    </label>
                                    <div className="password-input-container">
                                        <input
                                            type={
                                                showConfirmPass
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            className="form-input"
                                            placeholder="Confirm new password"
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) =>
                                                setPasswordForm({
                                                    ...passwordForm,
                                                    confirmPassword:
                                                        e.target.value,
                                                })
                                            }
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle-eye"
                                            onClick={() =>
                                                setShowConfirmPass(
                                                    !showConfirmPass,
                                                )
                                            }
                                        >
                                            {showConfirmPass ? (
                                                <svg
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line
                                                        x1="1"
                                                        y1="1"
                                                        x2="23"
                                                        y2="23"
                                                    />
                                                </svg>
                                            ) : (
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
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="ext-calendar-74">
                                <button
                                    type="submit"
                                    className="btn-primary ext-settings-183"
                                    disabled={saving}
                                >
                                    {saving && (
                                        <span className="spinner ext-settings-184"></span>
                                    )}
                                    {saving ? 'Updating...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
