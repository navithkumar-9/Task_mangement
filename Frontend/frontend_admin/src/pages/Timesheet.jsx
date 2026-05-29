import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};
const getAvatarStyle = (username) => {
    const colors = [
        { bg: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', text: '#ffffff' }, // Blue
        { bg: 'linear-gradient(135deg, #10B981, #047857)', text: '#ffffff' }, // Emerald
        { bg: 'linear-gradient(135deg, #EC4899, #BE185D)', text: '#ffffff' }, // Pink
        { bg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', text: '#ffffff' }, // Violet
        { bg: 'linear-gradient(135deg, #F59E0B, #B45309)', text: '#ffffff' }, // Amber
        { bg: 'linear-gradient(135deg, #06B6D4, #0891B2)', text: '#ffffff' }, // Cyan
        { bg: 'linear-gradient(135deg, #EF4444, #B91C1C)', text: '#ffffff' }, // Rose
    ];
    let hash = 0;
    const name = username || '';
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};


const Timesheet = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [timesheets, setTimesheets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState(getTodayString());
    const [taskNameFilter, setTaskNameFilter] = useState('');
    const [projectNameFilter, setProjectNameFilter] = useState('');
    // For Team Member Create
    const [showModal, setShowModal] = useState(false);
    const [myTasks, setMyTasks] = useState([]);
    const [form, setForm] = useState({
        timesheet_id: '',
        task_id: '',
        description: '',
        status: 'PENDING',
        start_time: '',
        end_time: '',
        priority: 'MEDIUM', // For visual only
    });
    const [formError, setFormError] = useState('');
    const [viewingTimesheet, setViewingTimesheet] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchTimesheets();
        if (!isAdmin) {
            fetchMyTasks();
        }
    }, [isAdmin, dateFilter, taskNameFilter, projectNameFilter, page]);

    useEffect(() => {
        setPage(1);
    }, [dateFilter, taskNameFilter, projectNameFilter]);

    const fetchTimesheets = async () => {
        setLoading(true);
        try {
            const endpointBase = isAdmin
                ? '/timesheets/admin/'
                : '/timesheets/my-timesheets/';
            let query = `page=${page}`;
            if (dateFilter) {
                const localDate = new Date(dateFilter + 'T00:00:00');
                const startUTC = localDate.toISOString();
                const endDate = new Date(dateFilter + 'T23:59:59.999');
                const endUTC = endDate.toISOString();
                query += `&start_date=${encodeURIComponent(startUTC)}&end_date=${encodeURIComponent(endUTC)}`;
            }
            if (taskNameFilter)
                query += `&task_name=${encodeURIComponent(taskNameFilter)}`;
            if (projectNameFilter)
                query += `&project_name=${encodeURIComponent(projectNameFilter)}`;
            const endpoint = `${endpointBase}?${query}`;
            const res = await API.get(endpoint);
            let items = [];
            const count = res.data.count || 0;
            setTotalCount(count);
            setTotalPages(Math.ceil(count / 10) || 1);
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

    const fetchMyTasks = async () => {
        try {
            const res = await API.get('/tasks/my-tasks/?page_size=1000');
            let items = [];
            if (res.data.results && res.data.results.data)
                items = res.data.results.data;
            else if (res.data.data) items = res.data.data;
            else if (res.data.results) items = res.data.results;
            else items = res.data;

            setMyTasks(Array.isArray(items) ? items : []);
        } catch (err) {
            console.error('Failed to fetch my tasks', err);
        }
    };

    const handleTaskChange = (e) => {
        const taskId = e.target.value;
        const selectedTask = myTasks.find((t) => t.id.toString() === taskId);
        setForm({
            ...form,
            task_id: taskId,
            priority: selectedTask ? selectedTask.priority : 'MEDIUM',
            status: selectedTask ? selectedTask.status : 'PENDING',
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            // Backend expects start_time and end_time as ISO strings
            const payload = {
                task_id: form.task_id,
                description: form.description,
                status: form.status,
                start_time: new Date(form.start_time).toISOString(),
                end_time: new Date(form.end_time).toISOString(),
            };

            if (form.timesheet_id) {
                await API.put(`/timesheets/${form.timesheet_id}/`, payload);
            } else {
                await API.post('/timesheets/create/', payload);
            }
            setShowModal(false);
            fetchTimesheets();
        } catch (err) {
            setFormError(
                err.response?.data?.message || 'Failed to submit timesheet',
            );
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
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    };

    return (
        <div className="page" style={{ maxWidth: '100%' }}>
            <div
                className="page-header"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                }}
            >
                <div>
                    <h1 className="page-title">
                        {isAdmin ? 'Team Timesheets' : 'My Timesheets'}
                    </h1>
                    <p className="page-subtitle">Track time spent on tasks</p>
                </div>
                {!isAdmin && (
                    <button
                        className="btn-primary"
                        onClick={() => {
                            setFormError('');
                            setForm({
                                timesheet_id: '',
                                task_id: '',
                                description: '',
                                status: 'PENDING',
                                start_time: '',
                                end_time: '',
                                priority: 'MEDIUM',
                            });
                            setShowModal(true);
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Log Time
                    </button>
                )}
            </div>

            <div className="content-card" style={{ marginTop: '24px' }}>
                <div
                    className="content-card-header"
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '16px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                            Filter by Date:
                        </label>
                        <input
                            type="date"
                            className="search-input"
                            style={{ width: '150px', padding: '8px 12px' }}
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                        {dateFilter && (
                            <button
                                className="btn-danger"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                }}
                                onClick={() => setDateFilter('')}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                            Task Name:
                        </label>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search task..."
                            style={{ width: '160px', padding: '8px 12px' }}
                            value={taskNameFilter}
                            onChange={(e) => setTaskNameFilter(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                            Project Name:
                        </label>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search project..."
                            style={{ width: '160px', padding: '8px 12px' }}
                            value={projectNameFilter}
                            onChange={(e) => setProjectNameFilter(e.target.value)}
                        />
                    </div>
                </div>
                {loading ? (
                        <div className="page-loader" style={{ padding: '60px 0' }}>
                            <div className="page-loader-spinner"></div>
                            <div className="page-loader-text">Loading timesheets...</div>
                        </div>
                    ) : timesheets.length === 0 ? (
                    <div
                        className="empty-state"
                        style={{ padding: '40px', textAlign: 'center' }}
                    >
                        <p>
                            {dateFilter
                                ? 'No timesheets match your date filter'
                                : 'No timesheets logged yet'}
                        </p>
                    </div>
                ) : (
                    <div
                        className="table-wrapper"
                        style={{ overflowX: 'auto' }}
                    >
                        <table
                            className="data-table"
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                textAlign: 'left',
                            }}
                        >
                            <thead>
                                <tr>
                                    <th
                                        style={{
                                            padding: '16px 20px',
                                            borderBottom:
                                                '1px solid var(--border-color)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        Team Member
                                    </th>
                                    <th
                                        style={{
                                            padding: '16px 20px',
                                            borderBottom:
                                                '1px solid var(--border-color)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        Project / Task
                                    </th>
                                    <th
                                        style={{
                                            padding: '16px 20px',
                                            borderBottom:
                                                '1px solid var(--border-color)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        Description
                                    </th>
                                    <th
                                        style={{
                                            padding: '16px 20px',
                                            borderBottom:
                                                '1px solid var(--border-color)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        Priority
                                    </th>
                                    <th
                                        style={{
                                            padding: '16px 20px',
                                            borderBottom:
                                                '1px solid var(--border-color)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        Status
                                    </th>
                                    <th
                                        style={{
                                            padding: '16px 20px',
                                            borderBottom:
                                                '1px solid var(--border-color)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        Duration
                                    </th>
                                    <th
                                        style={{
                                            padding: '16px 20px',
                                            borderBottom:
                                                '1px solid var(--border-color)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        Created At
                                    </th>
                                    <th
                                        style={{
                                            padding: '16px 20px',
                                            borderBottom:
                                                '1px solid var(--border-color)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {timesheets.map((ts, i) => (
                                    <tr
                                        key={ts.id || i}
                                        style={{
                                            borderBottom:
                                                '1px solid var(--border-color)',
                                        }}
                                    >
                                        <td style={{ padding: '16px 20px' }}>
                                            {ts.team_member ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {(() => {
                                                        const avStyle = getAvatarStyle(ts.team_member.username);
                                                        return ts.team_member.profile_picture ? (
                                                            <img
                                                                src={ts.team_member.profile_picture}
                                                                alt="Avatar"
                                                                style={{
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    borderRadius: '50%',
                                                                    objectFit: 'cover'
                                                                }}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="sidebar-user-avatar"
                                                                style={{
                                                                    background: avStyle.bg,
                                                                    color: avStyle.text,
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    borderRadius: '50%',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '700',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                {ts.team_member.username?.charAt(0).toUpperCase()}
                                                            </div>
                                                        );
                                                    })()}
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        @{ts.team_member.username}
                                                    </span>
                                                </div>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                }}
                                            >
                                                <span
                                                    style={{ fontWeight: 600 }}
                                                >
                                                    {ts.task?.task_name}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-muted)',
                                                    }}
                                                >
                                                    {ts.task?.project_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
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
                                        <td style={{ padding: '16px 20px' }}>
                                            {getPriorityBadge(
                                                ts.task?.priority,
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            {getStatusBadge(ts.status)}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.85rem',
                                                    }}
                                                >
                                                    {formatDateTime(
                                                        ts.start_time,
                                                    )}{' '}
                                                    to
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.85rem',
                                                    }}
                                                >
                                                    {formatDateTime(
                                                        ts.end_time,
                                                    )}
                                                </span>
                                                {ts.working_hours && (
                                                    <span
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            color: 'var(--primary)',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {ts.working_hours} hrs
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            style={{
                                                padding: '16px 20px',
                                            }}
                                        >
                                            {formatDateTime(ts.created_at)}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                                                {!isAdmin && new Date(ts.start_time).toDateString() === new Date().toDateString() && (
                                                    <button
                                                        onClick={() => {
                                                            setFormError('');
                                                            setForm({
                                                                timesheet_id: ts.id,
                                                                task_id: ts.task?.id || '',
                                                                description: ts.description || '',
                                                                status: ts.status || 'PENDING',
                                                                start_time: ts.start_time ? new Date(new Date(ts.start_time) - new Date(ts.start_time).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
                                                                end_time: ts.end_time ? new Date(new Date(ts.end_time) - new Date(ts.end_time).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
                                                                priority: ts.task?.priority || 'MEDIUM',
                                                            });
                                                            setShowModal(true);
                                                        }}
                                                        className="btn-icon"
                                                        title="Edit Timesheet"
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
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && timesheets.length > 0 && (
                    <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
                        <button
                            className="pagination-btn"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: page <= 1 ? 'var(--bg-color)' : 'var(--primary)',
                                color: page <= 1 ? 'var(--text-muted)' : '#fff',
                                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                            }}
                        >
                            â† Previous
                        </button>
                        <span className="pagination-info" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            className="pagination-btn"
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: page >= totalPages ? 'var(--bg-color)' : 'var(--primary)',
                                color: page >= totalPages ? 'var(--text-muted)' : '#fff',
                                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                            }}
                        >
                            Next â†’
                        </button>
                    </div>
                )}
            {showModal && !isAdmin && (
                <div
                    onClick={() => setShowModal(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        animation: 'fadeIn 0.2s ease',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            width: '520px',
                            maxWidth: '95vw',
                            borderRadius: '16px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            animation: 'modalSlideIn 0.3s ease',
                        }}
                    >
                        <div style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            padding: '20px 24px',
                            borderRadius: '16px 16px 0 0',
                            position: 'relative',
                        }}>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#fff',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>
                                {form.timesheet_id ? 'Edit Logged Time' : 'Log Time'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                            {formError && (
                                <div
                                    className="alert-error"
                                    style={{
                                        padding: '12px',
                                        background: 'rgba(255,107,107,0.1)',
                                        color: '#ff6b6b',
                                        borderRadius: '6px',
                                        marginBottom: '16px',
                                    }}
                                >
                                    {formError}
                                </div>
                            )}

                            <div
                                className="form-group"
                                style={{ marginBottom: '16px' }}
                            >
                                <label
                                    className="form-label"
                                    style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    Select Task
                                </label>
                                <select
                                    className="form-input"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                    }}
                                    value={form.task_id}
                                    onChange={handleTaskChange}
                                    required
                                >
                                    <option value="" disabled>
                                        Select a Task
                                    </option>
                                    {myTasks.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.task_name} ({t.project_name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div
                                className="form-group"
                                style={{ marginBottom: '16px' }}
                            >
                                <label
                                    className="form-label"
                                    style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    Description
                                </label>
                                <textarea
                                    className="form-input form-textarea"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        minHeight: '80px',
                                        resize: 'vertical',
                                    }}
                                    placeholder="What did you work on?"
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            description: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    gap: '16px',
                                    marginBottom: '16px',
                                }}
                            >
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label
                                        className="form-label"
                                        style={{
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Start Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="form-input"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                        }}
                                        value={form.start_time}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                start_time: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label
                                        className="form-label"
                                        style={{
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        End Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="form-input"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                        }}
                                        value={form.end_time}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                end_time: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    gap: '16px',
                                    marginBottom: '24px',
                                }}
                            >
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label
                                        className="form-label"
                                        style={{
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Task Priority
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-color)',
                                            color: 'var(--text-muted)',
                                        }}
                                        value={form.priority}
                                        disabled
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label
                                        className="form-label"
                                        style={{
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Status Updates
                                    </label>
                                    <select
                                        className="form-input"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                        }}
                                        value={form.status}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                status: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_PROGRESS">
                                            In Progress
                                        </option>
                                        <option value="HOLD">Hold</option>
                                        <option value="IN_REVIEW">
                                            In Review
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div
                                className="modal-actions"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '12px',
                                    marginTop: '24px',
                                }}
                            >
                                <button
                                    type="button"
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        background: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: 500,
                                        color: '#374151',
                                    }}
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    {form.timesheet_id ? 'Update Timesheet' : 'Submit Timesheet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {viewingTimesheet && (
                <div
                    onClick={() => setViewingTimesheet(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        animation: 'fadeIn 0.2s ease',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            width: '580px',
                            maxWidth: '95vw',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            borderRadius: '16px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            animation: 'modalSlideIn 0.3s ease',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            padding: '24px 28px',
                            borderRadius: '16px 16px 0 0',
                            position: 'relative',
                        }}>
                            <button
                                onClick={() => setViewingTimesheet(null)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#fff',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '12px',
                                    padding: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>Timesheet Details</h2>
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>
                                        {viewingTimesheet.task?.project_name} - {viewingTimesheet.task?.task_name}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px 28px' }}>
                            {/* Team Member & Assigned By */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '6px' }}>Team Member</div>
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>@{viewingTimesheet.team_member?.username || '-'}</div>
                                </div>
                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '6px' }}>Assigned By</div>
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>@{viewingTimesheet.task?.assigned_by?.username || '-'}</div>
                                </div>
                            </div>

                            {/* Priority & Status */}
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Priority:</span>
                                    {getPriorityBadge(viewingTimesheet.task?.priority)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
                                    {getStatusBadge(viewingTimesheet.status)}
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)', margin: '4px 0 20px' }} />

                            {/* Duration */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div style={{ textAlign: 'center', background: '#f0fdf4', borderRadius: '12px', padding: '14px' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '4px' }}>Start</div>
                                    <div style={{ fontWeight: 600, color: '#15803d', fontSize: '0.85rem' }}>{formatDateTime(viewingTimesheet.start_time)}</div>
                                </div>
                                <div style={{ textAlign: 'center', background: '#fef2f2', borderRadius: '12px', padding: '14px' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '4px' }}>End</div>
                                    <div style={{ fontWeight: 600, color: '#b91c1c', fontSize: '0.85rem' }}>{formatDateTime(viewingTimesheet.end_time)}</div>
                                </div>
                                <div style={{ textAlign: 'center', background: '#eff6ff', borderRadius: '12px', padding: '14px' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '4px' }}>Total</div>
                                    <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '1.05rem' }}>{viewingTimesheet.working_hours || '-'} hrs</div>
                                </div>
                            </div>

                            {/* Description */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '8px' }}>Description</div>
                                <div style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '14px 16px',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap',
                                    color: '#334155',
                                    maxHeight: '150px',
                                    overflowY: 'auto',
                                }}>
                                    {viewingTimesheet.description || 'No description provided.'}
                                </div>
                            </div>

                            {/* Logged At */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.8rem' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                Logged at {formatDateTime(viewingTimesheet.created_at)}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setViewingTimesheet(null)}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    transition: 'opacity 0.2s',
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
};

export default Timesheet;
