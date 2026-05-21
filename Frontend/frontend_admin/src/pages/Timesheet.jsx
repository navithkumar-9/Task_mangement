import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
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
        task_id: '',
        description: '',
        status: 'PENDING',
        start_time: '',
        end_time: '',
        priority: 'MEDIUM', // For visual only
    });
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetchTimesheets();
        if (!isAdmin) {
            fetchMyTasks();
        }
    }, [isAdmin, dateFilter, taskNameFilter, projectNameFilter]);

    const fetchTimesheets = async () => {
        setLoading(true);
        try {
            const endpointBase = isAdmin
                ? '/timesheets/admin/'
                : '/timesheets/my-timesheets/';
            let query = `page_size=1000`;
            if (dateFilter) query += `&date=${dateFilter}`;
            if (taskNameFilter)
                query += `&task_name=${encodeURIComponent(taskNameFilter)}`;
            if (projectNameFilter)
                query += `&project_name=${encodeURIComponent(projectNameFilter)}`;
            const endpoint = `${endpointBase}?${query}`;
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

            await API.post('/timesheets/create/', payload);
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
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    };

    return (
        <div className="page tasks-page">
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

            <div
                className="content-card"
                style={{
                    marginTop: '24px',
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                }}
            >
                <div
                    className="content-card-header"
                    style={{
                        padding: '20px',
                        borderBottom: '1px solid var(--border-color)',
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
                        style={{
                            width: 'auto',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                        }}
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
                                cursor: 'pointer',
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
                        style={{
                            width: 'auto',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                        }}
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
                        style={{
                            width: 'auto',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                        }}
                        value={projectNameFilter}
                        onChange={(e) => setProjectNameFilter(e.target.value)}
                    />
                </div>
                {loading ? (
                    <div
                        className="empty-state"
                        style={{ padding: '40px', textAlign: 'center' }}
                    >
                        <p>Loading timesheets...</p>
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
                                                <span
                                                    style={{
                                                        fontWeight: 600,
                                                        color: 'var(--primary)',
                                                    }}
                                                >
                                                    @{ts.team_member.username}
                                                </span>
                                            ) : (
                                                '—'
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && !isAdmin && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowModal(false)}
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
                            width: '500px',
                            borderRadius: '12px',
                            padding: '24px',
                        }}
                    >
                        <div
                            className="modal-header"
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                            }}
                        >
                            <h2 style={{ margin: 0 }}>Log Time</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: '#ffffff ', 
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
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
                                }}
                            >
                                <button
                                    type="button"
                                    className="btn-danger"
                                    style={{
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'var(--primary)',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                    }}
                                >
                                    Submit Timesheet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timesheet;
