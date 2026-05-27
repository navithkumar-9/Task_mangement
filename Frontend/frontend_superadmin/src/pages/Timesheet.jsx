import { useEffect, useState } from 'react';
import API from '../api/axios';

const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const Timesheet = () => {
    const [timesheets, setTimesheets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState(getTodayString());
    const [taskNameFilter, setTaskNameFilter] = useState('');
    const [projectNameFilter, setProjectNameFilter] = useState('');
    const [viewingTimesheet, setViewingTimesheet] = useState(null);
    useEffect(() => {
        fetchTimesheets();
    }, [dateFilter, taskNameFilter, projectNameFilter]);

    const fetchTimesheets = async () => {
        setLoading(true);
        try {
            let query = `page_size=1000`;
            if (dateFilter) query += `&date=${dateFilter}`;
            if (taskNameFilter)
                query += `&task_name=${encodeURIComponent(taskNameFilter)}`;
            if (projectNameFilter)
                query += `&project_name=${encodeURIComponent(projectNameFilter)}`;
            const endpoint = `/timesheets/super-admin/?${query}`;
            const res = await API.get(endpoint);
            let items = [];
            if (res.data.results && res.data.results.data)
                items = res.data.results.data;
            else if (res.data.data) items = res.data.data;
            else if (res.data.results) items = res.data.results;
            else items = res.data;

            setTimesheets(Array.isArray(items) ? items : []);
        } catch (err) {
            console.error('Failed to fetch timesheets', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const colorMap = {
            PENDING: {
                bg: 'rgba(73,204,249,0.1)',
                color: '#49CCF9',
                label: 'Pending',
            },
            IN_PROGRESS: {
                bg: 'rgba(255,185,70,0.1)',
                color: '#ffb946',
                label: 'In Progress',
            },
            HOLD: {
                bg: 'rgba(255,107,107,0.1)',
                color: '#ff6b6b',
                label: 'Hold',
            },
            IN_REVIEW: {
                bg: 'rgba(123,104,238,0.1)',
                color: '#7B68EE',
                label: 'In Review',
            },
            COMPLETED: {
                bg: 'rgba(75,207,130,0.1)',
                color: '#4bcf82',
                label: 'Completed',
            },
        };
        const style = colorMap[status] || {
            bg: 'rgba(0,0,0,0.1)',
            color: '#666',
            label: status,
        };
        return (
            <span
                style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: style.bg,
                    color: style.color,
                }}
            >
                {style.label}
            </span>
        );
    };

    const getPriorityBadge = (priority) => {
        const colorMap = {
            LOW: { bg: 'rgba(75,207,130,0.1)', color: '#4bcf82' },
            MEDIUM: { bg: 'rgba(255,185,70,0.1)', color: '#ffb946' },
            HIGH: { bg: 'rgba(255,107,107,0.1)', color: '#ff6b6b' },
        };
        const style = colorMap[priority] || {
            bg: 'rgba(0,0,0,0.1)',
            color: '#666',
        };
        return (
            <span
                style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: style.bg,
                    color: style.color,
                }}
            >
                {priority}
            </span>
        );
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Timesheets</h1>
                    <p className="page-subtitle">
                        Track time spent on tasks across the organization
                    </p>
                </div>
            </div>

            <div className="content-card">
                <div
                    className="content-card-header"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    <label
                        style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                        }}
                    >
                        Filter by Date:
                    </label>
                    <input
                        type="date"
                        className="search-input"
                        style={{ width: 'auto' }}
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                    {dateFilter && (
                        <button
                            className="btn-danger"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary)',
                            }}
                            onClick={() => setDateFilter('')}
                        >
                            Clear
                        </button>
                    )}
                    <label
                        style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            marginLeft: '12px',
                        }}
                    >
                        Task Name:
                    </label>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Task name"
                        style={{ width: 'auto' }}
                        value={taskNameFilter}
                        onChange={(e) => setTaskNameFilter(e.target.value)}
                    />
                    <label
                        style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            marginLeft: '12px',
                        }}
                    >
                        Project Name:
                    </label>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Project name"
                        style={{ width: 'auto' }}
                        value={projectNameFilter}
                        onChange={(e) => setProjectNameFilter(e.target.value)}
                    />
                </div>
                {loading ? (
                    <div className="empty-state">
                        <div className="spinner"></div>
                        <p>Loading timesheets...</p>
                    </div>
                ) : timesheets.length === 0 ? (
                    <div className="empty-state">
                        <p>
                            {dateFilter
                                ? 'No timesheets match your date filter'
                                : 'No timesheets found'}
                        </p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Team Member</th>
                                    <th>Assigned By</th>
                                    <th>Project / Task</th>
                                    <th>Description</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Created At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timesheets.map((ts, i) => (
                                    <tr key={ts.id || i}>
                                        <td>
                                            {ts.team_member ? (
                                                <span
                                                    className="text-bold"
                                                    style={{
                                                        color: 'var(--primary)',
                                                    }}
                                                >
                                                    @{ts.team_member.username}
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td>
                                            {ts.task?.assigned_by ? (
                                                <span
                                                    className="text-bold"
                                                    style={{ color: '#49CCF9' }}
                                                >
                                                    @
                                                    {
                                                        ts.task.assigned_by
                                                            .username
                                                    }
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                }}
                                            >
                                                <span className="text-bold">
                                                    {ts.task?.task_name}
                                                </span>
                                                <span
                                                    className="text-muted"
                                                    style={{
                                                        fontSize: '0.8rem',
                                                    }}
                                                >
                                                    {ts.task?.project_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div
                                                style={{
                                                    maxWidth: '250px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {ts.description}
                                            </div>
                                        </td>
                                        <td>
                                            {getPriorityBadge(
                                                ts.task?.priority,
                                            )}
                                        </td>
                                        <td>{getStatusBadge(ts.status)}</td>
                                        <td className="text-muted">
                                            {formatDateTime(ts.start_time)}
                                        </td>
                                        <td className="text-muted">
                                            {formatDateTime(ts.end_time)}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            {formatDateTime(ts.created_at)}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <button
                                                onClick={() => setViewingTimesheet(ts)}
                                                className="btn-icon"
                                                title="View Details"
                                                style={{
                                                    padding: '6px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    color: 'var(--primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {viewingTimesheet && (
                <div
                    className="modal-overlay"
                    onClick={() => setViewingTimesheet(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                    }}
                >
                    <div
                        className="modal-card"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            width: '550px',
                            borderRadius: '12px',
                            padding: '24px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        }}
                    >
                        <div
                            className="modal-header"
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                                borderBottom: '1px solid var(--border-color)',
                                paddingBottom: '12px',
                            }}
                        >
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-color)' }}>Timesheet Details</h2>
                            <button
                                className="modal-close"
                                onClick={() => setViewingTimesheet(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Team Member</label>
                                    <div style={{ fontWeight: 600, color: 'var(--primary)', marginTop: '4px' }}>
                                        @{viewingTimesheet.team_member?.username || '—'}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Project</label>
                                    <div style={{ fontWeight: 600, marginTop: '4px' }}>
                                        {viewingTimesheet.task?.project_name || '—'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Task Name</label>
                                    <div style={{ fontWeight: 600, marginTop: '4px' }}>
                                        {viewingTimesheet.task?.task_name || '—'}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Priority / Status</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                        {getPriorityBadge(viewingTimesheet.task?.priority)}
                                        {getStatusBadge(viewingTimesheet.status)}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Logged Duration</label>
                                    <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                                        {formatDateTime(viewingTimesheet.start_time)} to {formatDateTime(viewingTimesheet.end_time)}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Time</label>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)', marginTop: '4px' }}>
                                        {viewingTimesheet.task?.working_hours || viewingTimesheet.working_hours || '—'} hrs
                                    </div>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Logged At</label>
                                <div style={{ fontSize: '0.9rem', marginTop: '4px', color: 'var(--text-muted)' }}>
                                    {formatDateTime(viewingTimesheet.created_at)}
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Description</label>
                                <div style={{ 
                                    background: '#f8fafc',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    marginTop: '6px',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.5',
                                    whiteSpace: 'pre-wrap',
                                    color: '#334155',
                                    maxHeight: '150px',
                                    overflowY: 'auto'
                                }}>
                                    {viewingTimesheet.description || 'No description provided.'}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setViewingTimesheet(null)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timesheet;
