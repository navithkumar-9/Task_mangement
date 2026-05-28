import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('admin_user');
        return stored ? JSON.parse(stored) : null;
    });
    const [tokens, setTokens] = useState(() => {
        const stored = localStorage.getItem('admin_tokens');
        return stored ? JSON.parse(stored) : null;
    });

    const fetchProfile = () => {
        const tokensStored = localStorage.getItem('admin_tokens');
        if (!tokensStored) return;
        API.get('/profile/')
            .then((res) => {
                if (res.data.success) {
                    const profileData = res.data.data;
                    setUser((prev) => {
                        if (!prev) return prev;
                        const updated = {
                            ...prev,
                            name: profileData.name,
                            employee_id: profileData.employee_id,
                            profile_picture: profileData.profile_picture,
                        };
                        return updated;
                    });
                }
            })
            .catch(console.error);
    };

    useEffect(() => {
        if (tokens) {
            fetchProfile();
        }
    }, [tokens]);

    useEffect(() => {
        const handleProfileUpdate = () => {
            fetchProfile();
        };
        window.addEventListener('profileUpdate', handleProfileUpdate);
        return () => window.removeEventListener('profileUpdate', handleProfileUpdate);
    }, []);

    const login = (userData, tokenData) => {
        setUser(userData);
        setTokens(tokenData);
        const basicUser = {
            username: userData.username,
            role: userData.role
        };
        localStorage.setItem('admin_user', JSON.stringify(basicUser));
        localStorage.setItem('admin_tokens', JSON.stringify(tokenData));
    };

    const logout = () => {
        setUser(null);
        setTokens(null);
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_tokens');
    };

    return (
        <AuthContext.Provider value={{ user, tokens, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
