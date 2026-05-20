import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateAdmin from './pages/CreateAdmin';
import ManageUsers from './pages/ManageUsers';
import Settings from './pages/Settings';
import TaskProgress from './pages/TaskProgress';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/create-admin" element={<ProtectedRoute><Layout><CreateAdmin /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Layout><ManageUsers /></Layout></ProtectedRoute>} />
          <Route path="/tasks-progress" element={<ProtectedRoute><Layout><TaskProgress /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
