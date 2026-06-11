import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Lazy load page components
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const CreateMember = lazy(() => import('./pages/CreateMember'));
const TeamList = lazy(() => import('./pages/TeamList'));
const Settings = lazy(() => import('./pages/Settings'));
const Timesheet = lazy(() => import('./pages/Timesheet'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Announcements = lazy(() => import('./pages/Announcements'));
const CompletedTasks = lazy(() => import('./pages/CompletedTasks'));

const LoadingFallback = () => (
    <div
        style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100vw',
            backgroundColor: '#0a0a0c',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
        }}
    >
        <div
            style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(79, 70, 229, 0.1)',
                borderTop: '3px solid #4f46e5',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }}
        ></div>
        <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    </div>
);

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Suspense fallback={<LoadingFallback />}>
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
                            path="/tasks"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Tasks />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/completed-tasks"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <CompletedTasks />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/timesheets"
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
                            path="/create-member"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <CreateMember />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/team"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <TeamList />
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
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
