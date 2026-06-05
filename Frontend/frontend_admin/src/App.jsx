import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import CreateMember from './pages/CreateMember';
import TeamList from './pages/TeamList';
import Settings from './pages/Settings';
import Timesheet from './pages/Timesheet';
import Calendar from './pages/Calendar';
import Announcements from './pages/Announcements';
import CompletedTasks from './pages/CompletedTasks';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
          <Route path="/completed-tasks" element={<ProtectedRoute><Layout><CompletedTasks /></Layout></ProtectedRoute>} />
          <Route path="/timesheets" element={<ProtectedRoute><Layout><Timesheet /></Layout></ProtectedRoute>} />
          <Route path="/announcements" element={<ProtectedRoute><Layout><Announcements /></Layout></ProtectedRoute>} />
          <Route path="/create-member" element={<ProtectedRoute><Layout><CreateMember /></Layout></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><Layout><TeamList /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Layout><Calendar /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
