import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Calendar from './pages/Calendar';
import CreateAdmin from './pages/CreateAdmin';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ManageUsers from './pages/ManageUsers';
import Settings from './pages/Settings';
import TaskProgress from './pages/TaskProgress';
import Timesheet from './pages/Timesheet';
import Announcements from './pages/Announcements';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Dashboard />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/create-admin"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <CreateAdmin />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <ManageUsers />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/tasks-progress"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <TaskProgress />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/timesheet"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Timesheet />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/announcements"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Announcements />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Settings />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/calendar"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Calendar />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="*"
                        element={<Navigate to="/login" replace />}
                    />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
