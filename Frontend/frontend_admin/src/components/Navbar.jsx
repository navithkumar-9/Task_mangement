import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const roleBadgeClass =
        user?.role === 'ADMIN' ? 'brand-badge-green' : 'brand-badge-blue';

    return (
        <nav className="navbar-custom">
            <div className="navbar-inner">
                <div className="navbar-brand-area">
                    <div className="brand-icon">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M12 2L2 7L12 12L22 7L12 2Z"
                                fill="url(#gradNav)"
                            />
                            <path
                                d="M2 17L12 22L22 17"
                                stroke="url(#gradNav)"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                            <path
                                d="M2 12L12 17L22 12"
                                stroke="url(#gradNav)"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient
                                    id="gradNav"
                                    x1="2"
                                    y1="2"
                                    x2="22"
                                    y2="22"
                                >
                                    <stop stopColor="#06b6d4" />
                                    <stop offset="1" stopColor="#3b82f6" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <span className="brand-text">
                        TaskFlow{' '}
                        <span className={`brand-badge ${roleBadgeClass}`}>
                            {user?.role || 'Admin'}
                        </span>
                    </span>
                </div>
                <div className="navbar-user-area">
                    {user && (
                        <div className="user-info">
                            {user.profile_picture ? (
                                <img
                                    src={user.profile_picture}
                                    alt="Avatar"
                                    className="user-avatar"
                                    style={{ objectFit: 'cover' }}
                                />
                            ) : (
                                <div className="user-avatar">
                                    {user.username?.charAt(0)?.toUpperCase() || 'A'}
                                </div>
                            )}
                            <span className="user-name">
                                {user.name || user.username || 'User'}
                            </span>
                        </div>
                    )}
                    <button className="btn-logout" onClick={handleLogout}>
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16,17 21,12 16,7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
