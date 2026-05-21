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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Timesheet;
