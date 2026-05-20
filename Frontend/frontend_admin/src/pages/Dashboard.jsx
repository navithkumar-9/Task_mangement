import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        API.get('/profile/')
            .then((res) => {
                if (res.data.success) setProfile(res.data.data);
            })
            .catch(console.error);
    }, []);

    const tasks = JSON.parse(localStorage.getItem('admin_tasks') || '[]');
    const members = JSON.parse(
        localStorage.getItem('admin_members_list') || '[]',
    );

    const taskStats = {
        todo: tasks.filter((t) => t.status === 'todo').length,
        progress: tasks.filter((t) => t.status === 'in-progress').length,
        review: tasks.filter((t) => t.status === 'review').length,
        done: tasks.filter((t) => t.status === 'done').length,
    };

    const stats = [
        { label: 'To Do', value: taskStats.todo, color: 'blue' },
        { label: 'In Progress', value: taskStats.progress, color: 'amber' },
        { label: 'In Review', value: taskStats.review, color: 'purple' },
        { label: 'Completed', value: taskStats.done, color: 'green' },
    ];

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">
                        Welcome back,{' '}
                        <span className="text-accent">
                            {profile?.username || user?.username || 'User'}
                        </span>
                    </p>
                </div>
            </div>

            <div className="stats-grid">
                {stats.map((s, i) => (
                    <div className={`stat-card stat-${s.color}`} key={i}>
                        <div className="stat-info">
                            <span className="stat-value">{s.value}</span>
                            <span className="stat-label">{s.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-two-col">
                <div className="content-card">
                    <div className="content-card-header">
                        <h2 className="content-card-title">Recent Tasks</h2>
                        <span className="badge-count">{tasks.length}</span>
                    </div>
                    {tasks.length === 0 ? (
                        <div className="empty-state">
                            <p>No tasks yet</p>
                            <span className="empty-hint">
                                Go to "Tasks" to create your first task
                            </span>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Task</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.slice(0, 5).map((t, i) => (
                                        <tr key={i}>
                                            <td className="text-bold">
                                                {t.title}
                                            </td>
                                            <td>
                                                <span
                                                    className={`priority-badge priority-${t.priority}`}
                                                >
                                                    {t.priority}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`status-badge status-${t.status}`}
                                                >
                                                    {t.status.replace('-', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {isAdmin && (
                    <div className="content-card">
                        <div className="content-card-header">
                            <h2 className="content-card-title">Team Members</h2>
                            <span className="badge-count">
                                {members.length}
                            </span>
                        </div>
                        {members.length === 0 ? (
                            <div className="empty-state">
                                <p>No team members yet</p>
                                <span className="empty-hint">
                                    Go to "Create Member" to add one
                                </span>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Username</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {members.slice(0, 5).map((m, i) => (
                                            <tr key={i}>
                                                <td className="text-bold">
                                                    {m.username}
                                                </td>
                                                <td>
                                                    <span className="role-badge role-member">
                                                        {m.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="status-badge status-active">
                                                        Active
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
