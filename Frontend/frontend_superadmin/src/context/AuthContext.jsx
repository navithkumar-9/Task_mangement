import { createContext, useContext, useState, useMemo } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('sa_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [tokens, setTokens] = useState(() => {
    const stored = localStorage.getItem('sa_tokens');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (userData, tokenData) => {
    setUser(userData);
    setTokens(tokenData);
    localStorage.setItem('sa_user', JSON.stringify(userData));
    localStorage.setItem('sa_tokens', JSON.stringify(tokenData));
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('sa_user');
    localStorage.removeItem('sa_tokens');
  };

  const authValue = useMemo(() => ({ user, tokens, login, logout }), [user, tokens]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
