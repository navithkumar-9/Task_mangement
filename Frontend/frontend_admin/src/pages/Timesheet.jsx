import { useEffect, useMemo, useState, useCallback } from 'react';
import API from '../api/axios';

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}
import { useAuth } from '../context/AuthContext';
import { getAvatarStyle } from '../utils/avatar';

const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// Helper: format working_hours (decimal string like "1.50") to rounded display like "1 hr 30 min"
const formatWorkingHours = (workingHours) => {
    if (!workingHours && workingHours !== 0) return '-';
    const totalMinutes = Math.round(parseFloat(workingHours) * 60);
    if (totalMinutes <= 0) return '0 min';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} hr`;
    return `${hours} hr ${minutes} min`;
};

// Helper: get today's date boundaries for datetime-local min/max
const getTodayMin = () => getTodayString() + 'T00:00';
const getTodayMax = () => getTodayString() + 'T23:59';

const Timesheet = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [timesheets, setTimesheets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState(getTodayString());
    const [taskNameFilter, setTaskNameFilter] = useState('');
    const [projectNameFilter, setProjectNameFilter] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');
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
    const [sortBy, setSortBy] = useState('-id');

    const handleSort = (field) => {
        setSortBy((prevSort) => {
            if (prevSort === field) {
                return `-${field}`;
            } else if (prevSort === `-${field}`) {
                return field;
            } else {
                return `-${field}`;
            }
        });
        setPage(1);
    };

    const renderSortArrow = (field) => {
        if (sortBy === field) {
            return (
                <span
                    style={{
                        marginLeft: '6px',
                        fontSize: '0.75rem',
                        color: 'var(--primary)',
                    }}
                >
                    ▲
                </span>
            );
        }
        if (sortBy === `-${field}`) {
            return (
                <span
                    style={{
                        marginLeft: '6px',
                        fontSize: '0.75rem',
                        color: 'var(--primary)',
                    }}
                >
                    ▼
                </span>
            );
        }
        return (
            <span
                style={{
                    marginLeft: '6px',
                    fontSize: '0.75rem',
                    opacity: 0.35,
                }}
            >
                ↕
            </span>
        );
    };

    const [filterOptions, setFilterOptions] = useState({
        projects: [],
        task_names: [],
        assignees: [],
    });

    const fetchFilterOptions = async () => {
        try {
            const res = await API.get('/tasks/filter-options/');
            if (res.data.success) {
                setFilterOptions(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch filter options', err);
        }
    };

    useEffect(() => {
        fetchFilterOptions();
    }, [isAdmin]);

    const uniqueEmployees = useMemo(() => {
        return (filterOptions.assignees || []).sort();
    }, [filterOptions.assignees]);

    const uniqueProjects = useMemo(() => {
        return (filterOptions.projects || []).sort();
    }, [filterOptions.projects]);

    const uniqueTasks = useMemo(() => {
        return (filterOptions.task_names || []).sort();
    }, [filterOptions.task_names]);

    const debouncedTaskName = useDebounce(taskNameFilter, 500);
    const debouncedProjectName = useDebounce(projectNameFilter, 500);
    const debouncedEmployee = useDebounce(employeeFilter, 500);

    const fetchMyTasks = useCallback(async () => {
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
    }, []);

    const fetchTimesheets = useCallback(async () => {
        setLoading(true);
        try {
            const endpointBase = isAdmin
                ? '/timesheets/admin/'
                : '/timesheets/my-timesheets/';
            let query = `page=${page}&sort_by=${sortBy}`;
            if (dateFilter) {
                const localDate = new Date(dateFilter + 'T00:00:00');
                const startUTC = localDate.toISOString();
                const endDate = new Date(dateFilter + 'T23:59:59.999');
                const endUTC = endDate.toISOString();
                query += `&start_date=${encodeURIComponent(startUTC)}&end_date=${encodeURIComponent(endUTC)}`;
            }
            if (debouncedTaskName)
                query += `&task_name=${encodeURIComponent(debouncedTaskName)}`;
            if (debouncedProjectName)
                query += `&project_name=${encodeURIComponent(debouncedProjectName)}`;
            if (debouncedEmployee)
                query += `&employee_name=${encodeURIComponent(debouncedEmployee)}`;
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
    }, [isAdmin, page, sortBy, dateFilter, debouncedTaskName, debouncedProjectName, debouncedEmployee]);

    useEffect(() => {
        fetchTimesheets();
    }, [fetchTimesheets]);

    useEffect(() => {
        if (!isAdmin) fetchMyTasks();
    }, [isAdmin, fetchMyTasks]);

    useEffect(() => {
        setPage(1);
    }, [dateFilter, debouncedTaskName, debouncedProjectName, debouncedEmployee]);


    const handleTaskChange = useCallback((e) => {
        const taskId = e.target.value;
        const selectedTask = myTasks.find((t) => t.id.toString() === taskId);
        setForm((prev) => ({
            ...prev,
            task_id: taskId,
            priority: selectedTask ? selectedTask.priority : 'MEDIUM',
            status: selectedTask ? selectedTask.status : 'PENDING',
        }));
    }, [myTasks]);

    const handleSubmit = useCallback(async (e) => {
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
    }, [form, fetchTimesheets]);

    const getStatusBadge = (status) => {
        const colorMap = {
            PENDING: {
                bg: 'rgba(73,204,249,0.1)',
                color: '#49CCF9',
                label: 'To-do',
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
        <div className="page ext-calendar-56">
            <div className="page-header ext-calendar-57">
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

            <div className="content-card ext-calendar-74">
                <div className="filter-bar">
                    <div className="filter-group">
                        <label className="form-label">Filter by Date</label>
                        <input
                            type="date"
                            className="filter-input"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="form-label">Employee Name</label>
                        <select
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Employees</option>
                            {uniqueEmployees.map((name) => (
                                <option key={name} value={name}>
                                    @{name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="form-label">Project Name</label>
                        <select
                            value={projectNameFilter}
                            onChange={(e) =>
                                setProjectNameFilter(e.target.value)
                            }
                            className="filter-select"
                        >
                            <option value="">All Projects</option>
                            {uniqueProjects.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="form-label">Task Name</label>
                        <select
                            value={taskNameFilter}
                            onChange={(e) => setTaskNameFilter(e.target.value)}
                            className="filter-select"
                            style={{ maxWidth: '200px' }}
                        >
                            <option value="">All Tasks</option>
                            {uniqueTasks.map((name) => (
                                <option key={name} value={name} title={name}>
                                    {name.length > 25
                                        ? name.substring(0, 25) + '...'
                                        : name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {(dateFilter ||
                        employeeFilter ||
                        projectNameFilter ||
                        taskNameFilter) && (
                        <button
                            className="btn-clear-filter"
                            onClick={() => {
                                setDateFilter('');
                                setEmployeeFilter('');
                                setProjectNameFilter('');
                                setTaskNameFilter('');
                            }}
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Clear All
                        </button>
                    )}
                </div>
                {loading ? (
                    <div className="page-loader ext-calendar-68">
                        <div className="page-loader-spinner"></div>
                        <div className="page-loader-text">
                            Loading timesheets...
                        </div>
                    </div>
                ) : timesheets.length === 0 ? (
                    <div className="empty-state ext-timesheet-253">
                        <p>
                            {dateFilter
                                ? 'No timesheets match your date filter'
                                : 'No timesheets logged yet'}
                        </p>
                    </div>
                ) : (
                    <div className="table-wrapper ext-dashboard-147">
                        <table className="data-table ext-timesheet-254">
                            <thead>
                                <tr>
                                    <th
                                        className="ext-timesheet-255"
                                        onClick={() =>
                                            handleSort('team_member__username')
                                        }
                                        style={{
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                        }}
                                    >
                                        Team Member{' '}
                                        {renderSortArrow(
                                            'team_member__username',
                                        )}
                                    </th>
                                    <th
                                        className="ext-timesheet-255"
                                        onClick={() =>
                                            handleSort('task__task_name')
                                        }
                                        style={{
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                        }}
                                    >
                                        Project / Task{' '}
                                        {renderSortArrow('task__task_name')}
                                    </th>
                                    <th className="ext-timesheet-255">
                                        Description
                                    </th>
                                    <th className="ext-timesheet-255">
                                        Priority
                                    </th>
                                    <th
                                        className="ext-timesheet-255"
                                        onClick={() => handleSort('status')}
                                        style={{
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                        }}
                                    >
                                        Status {renderSortArrow('status')}
                                    </th>
                                    <th
                                        className="ext-timesheet-255"
                                        onClick={() =>
                                            handleSort('working_hours')
                                        }
                                        style={{
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                        }}
                                    >
                                        Duration{' '}
                                        {renderSortArrow('working_hours')}
                                    </th>
                                    <th
                                        className="ext-timesheet-255"
                                        onClick={() => handleSort('id')}
                                        style={{
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                        }}
                                    >
                                        Created At {renderSortArrow('id')}
                                    </th>
                                    <th className="ext-timesheet-255">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {timesheets.map((ts, i) => (
                                    <tr
                                        key={ts.id || i}
                                        className="ext-timesheet-256"
                                    >
                                        <td className="ext-completed-tasks-91">
                                            {ts.team_member ? (
                                                <div className="ext-announcements-16">
                                                    {(() => {
                                                        const avStyle =
                                                            getAvatarStyle(
                                                                ts.team_member
                                                                    .username,
                                                            );
                                                        return ts.team_member
                                                            .profile_picture ? (
                                                            <img
                                                                src={
                                                                    ts
                                                                        .team_member
                                                                        .profile_picture
                                                                }
                                                                alt="Avatar"
                                                                className="ext-timesheet-257"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="sidebar-user-avatar"
                                                                style={{
                                                                    background:
                                                                        avStyle.bg,
                                                                    color: avStyle.text,
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    borderRadius:
                                                                        '50%',
                                                                    fontSize:
                                                                        '0.75rem',
                                                                    fontWeight:
                                                                        '700',
                                                                    display:
                                                                        'flex',
                                                                    alignItems:
                                                                        'center',
                                                                    justifyContent:
                                                                        'center',
                                                                }}
                                                            >
                                                                {ts.team_member.username
                                                                    ?.charAt(0)
                                                                    .toUpperCase()}
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="ext-completed-tasks-92">
                                                        <span className="ext-announcements-17">
                                                            @
                                                            {
                                                                ts.team_member
                                                                    .username
                                                            }
                                                        </span>
                                                        {ts.team_leader && (
                                                            <span className="ext-timesheet-258">
                                                                Leader: @
                                                                {
                                                                    ts
                                                                        .team_leader
                                                                        .username
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td className="ext-completed-tasks-91">
                                            <div className="ext-completed-tasks-92">
                                                <span className="ext-dashboard-148">
                                                    {ts.task?.task_name}
                                                </span>
                                                <span className="ext-completed-tasks-93">
                                                    {ts.task?.project_name}
                                                </span>
                                                {ts.task?.team_leader && (
                                                    <span className="ext-timesheet-258">
                                                        Leader: @
                                                        {
                                                            ts.task.team_leader
                                                                .username
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="ext-completed-tasks-91">
                                            <div className="ext-timesheet-259" title={ts.description || ''}>
                                                {ts.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>No description</span>}
                                            </div>
                                        </td>
                                        <td className="ext-completed-tasks-91">
                                            {getPriorityBadge(
                                                ts.task?.priority,
                                            )}
                                        </td>
                                        <td className="ext-completed-tasks-91">
                                            {getStatusBadge(ts.status)}
                                        </td>
                                        <td className="ext-completed-tasks-91">
                                            <div className="ext-completed-tasks-92">
                                                <span className="ext-tasks-211">
                                                    {formatDateTime(
                                                        ts.start_time,
                                                    )}{' '}
                                                    to
                                                </span>
                                                <span className="ext-tasks-211">
                                                    {formatDateTime(
                                                        ts.end_time,
                                                    )}
                                                </span>
                                                {ts.working_hours && (
                                                    <span className="ext-timesheet-260">
                                                        {formatWorkingHours(
                                                            ts.working_hours,
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="ext-completed-tasks-91">
                                            {formatDateTime(ts.created_at)}
                                        </td>
                                        <td className="ext-completed-tasks-91">
                                            <div className="ext-timesheet-261">
                                                <button
                                                    onClick={() =>
                                                        setViewingTimesheet(ts)
                                                    }
                                                    className="btn-icon"
                                                    title="View Details"
                                                    style={{
                                                        padding: '6px',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        background:
                                                            'var(--primary)',
                                                        color: '#ffffff',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent:
                                                            'center',
                                                    }}
                                                >
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                        <circle
                                                            cx="12"
                                                            cy="12"
                                                            r="3"
                                                        />
                                                    </svg>
                                                </button>
                                                {!isAdmin &&
                                                    ts.team_member?.id ===
                                                        user?.id &&
                                                    ts.created_at &&
                                                    new Date() -
                                                        new Date(
                                                            ts.created_at,
                                                        ) <=
                                                        86400000 && (
                                                        <button
                                                            onClick={() => {
                                                                setFormError(
                                                                    '',
                                                                );
                                                                setForm({
                                                                    timesheet_id:
                                                                        ts.id,
                                                                    task_id:
                                                                        ts.task
                                                                            ?.id ||
                                                                        '',
                                                                    description:
                                                                        ts.description ||
                                                                        '',
                                                                    status:
                                                                        ts.status ||
                                                                        'PENDING',
                                                                    start_time:
                                                                        ts.start_time
                                                                            ? new Date(
                                                                                  new Date(
                                                                                      ts.start_time,
                                                                                  ) -
                                                                                      new Date(
                                                                                          ts.start_time,
                                                                                      ).getTimezoneOffset() *
                                                                                          60000,
                                                                              )
                                                                                  .toISOString()
                                                                                  .slice(
                                                                                      0,
                                                                                      16,
                                                                                  )
                                                                            : '',
                                                                    end_time:
                                                                        ts.end_time
                                                                            ? new Date(
                                                                                  new Date(
                                                                                      ts.end_time,
                                                                                  ) -
                                                                                      new Date(
                                                                                          ts.end_time,
                                                                                      ).getTimezoneOffset() *
                                                                                          60000,
                                                                              )
                                                                                  .toISOString()
                                                                                  .slice(
                                                                                      0,
                                                                                      16,
                                                                                  )
                                                                            : '',
                                                                    priority:
                                                                        ts.task
                                                                            ?.priority ||
                                                                        'MEDIUM',
                                                                });
                                                                setShowModal(
                                                                    true,
                                                                );
                                                            }}
                                                            className="btn-icon ext-timesheet-262"
                                                            title="Edit Timesheet"
                                                        >
                                                            <svg
                                                                width="16"
                                                                height="16"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
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
                    <div className="pagination ext-timesheet-263">
                        <button
                            className="pagination-btn"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background:
                                    page <= 1
                                        ? 'var(--bg-color)'
                                        : 'var(--primary)',
                                color: page <= 1 ? 'var(--text-muted)' : '#fff',
                                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                            }}
                        >
                            Previous
                        </button>
                        <span className="pagination-info ext-completed-tasks-101">
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
                                background:
                                    page >= totalPages
                                        ? 'var(--bg-color)'
                                        : 'var(--primary)',
                                color:
                                    page >= totalPages
                                        ? 'var(--text-muted)'
                                        : '#fff',
                                cursor:
                                    page >= totalPages
                                        ? 'not-allowed'
                                        : 'pointer',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                            }}
                        >
                            Next
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
                                boxShadow:
                                    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                animation: 'modalSlideIn 0.3s ease',
                            }}
                        >
                            <div className="ext-timesheet-265">
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
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background =
                                            'rgba(255,255,255,0.35)')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background =
                                            'rgba(255,255,255,0.2)')
                                    }
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                                <h2 className="ext-tasks-196">
                                    {form.timesheet_id
                                        ? 'Edit Logged Time'
                                        : 'Log Time'}
                                </h2>
                            </div>
                            <form
                                onSubmit={handleSubmit}
                                className="ext-announcements-32"
                            >
                                {formError && (
                                    <div className="alert-error ext-timesheet-266">
                                        {formError}
                                    </div>
                                )}

                                <div className="form-group ext-tasks-200">
                                    <label className="form-label ext-timesheet-267">
                                        Select Task
                                    </label>
                                    <select
                                        className="form-input ext-timesheet-268"
                                        value={form.task_id}
                                        onChange={handleTaskChange}
                                        required
                                    >
                                        <option value="" disabled>
                                            Select a Task
                                        </option>
                                        {myTasks
                                            .filter(
                                                (t) => t.status !== 'COMPLETED',
                                            )
                                            .map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.task_name} (
                                                    {t.project_name})
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="form-group ext-tasks-200">
                                    <label className="form-label ext-timesheet-267">
                                        Description
                                    </label>
                                    <textarea
                                        className="form-input form-textarea ext-timesheet-269"
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

                                <div className="ext-timesheet-270">
                                    <div className="form-group ext-dashboard-137">
                                        <label className="form-label ext-timesheet-267">
                                            Start Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="form-input ext-timesheet-268"
                                            value={form.start_time}
                                            min={getTodayMin()}
                                            max={getTodayMax()}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    start_time: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="form-group ext-dashboard-137">
                                        <label className="form-label ext-timesheet-267">
                                            End Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="form-input ext-timesheet-268"
                                            value={form.end_time}
                                            min={getTodayMin()}
                                            max={getTodayMax()}
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

                                <div className="ext-timesheet-271">
                                    <div className="form-group ext-dashboard-137">
                                        <label className="form-label ext-timesheet-267">
                                            Task Priority
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input ext-timesheet-272"
                                            value={form.priority}
                                            disabled
                                        />
                                    </div>
                                    <div className="form-group ext-dashboard-137">
                                        <label className="form-label ext-timesheet-267">
                                            Status Updates
                                        </label>
                                        <select
                                            className="form-input ext-timesheet-268"
                                            value={form.status}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    status: e.target.value,
                                                })
                                            }
                                        >
                                            <option value="PENDING">
                                                To-do
                                            </option>
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

                                <div className="modal-actions ext-timesheet-273">
                                    <button
                                        type="button"
                                        className="ext-team-list-236"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="ext-timesheet-274"
                                    >
                                        {form.timesheet_id
                                            ? 'Update Timesheet'
                                            : 'Submit Timesheet'}
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
                                boxShadow:
                                    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                animation: 'modalSlideIn 0.3s ease',
                            }}
                        >
                            {/* Header */}
                            <div className="ext-team-list-214">
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
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background =
                                            'rgba(255,255,255,0.35)')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background =
                                            'rgba(255,255,255,0.2)')
                                    }
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                                <div className="ext-announcements-14">
                                    <div className="ext-team-list-216">
                                        <svg
                                            width="22"
                                            height="22"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#fff"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="ext-announcements-31">
                                            Timesheet Details
                                        </h2>
                                        <p className="ext-team-list-217">
                                            {
                                                viewingTimesheet.task
                                                    ?.project_name
                                            }{' '}
                                            - {viewingTimesheet.task?.task_name}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="ext-team-list-218">
                                {/* Team Member & Assigned By */}
                                <div className="ext-completed-tasks-113">
                                    <div className="ext-team-list-224">
                                        <div className="ext-team-list-225">
                                            Team Member
                                        </div>
                                        <div className="ext-timesheet-276">
                                            @
                                            {viewingTimesheet.team_member
                                                ?.username || '-'}
                                        </div>
                                    </div>
                                    <div className="ext-team-list-224">
                                        <div className="ext-team-list-225">
                                            Assigned By
                                        </div>
                                        <div className="ext-timesheet-276">
                                            @
                                            {viewingTimesheet.task?.assigned_by
                                                ?.username || '-'}
                                        </div>
                                    </div>
                                </div>

                                {/* Priority & Status */}
                                <div className="ext-timesheet-277">
                                    <div className="ext-calendar-66">
                                        <span className="ext-timesheet-278">
                                            Priority:
                                        </span>
                                        {getPriorityBadge(
                                            viewingTimesheet.task?.priority,
                                        )}
                                    </div>
                                    <div className="ext-calendar-66">
                                        <span className="ext-timesheet-278">
                                            Status:
                                        </span>
                                        {getStatusBadge(
                                            viewingTimesheet.status,
                                        )}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="ext-timesheet-279" />

                                {/* Duration */}
                                <div className="ext-timesheet-280">
                                    <div className="ext-timesheet-281">
                                        <div className="ext-timesheet-282">
                                            Start
                                        </div>
                                        <div className="ext-timesheet-283">
                                            {formatDateTime(
                                                viewingTimesheet.start_time,
                                            )}
                                        </div>
                                    </div>
                                    <div className="ext-timesheet-284">
                                        <div className="ext-timesheet-285">
                                            End
                                        </div>
                                        <div className="ext-timesheet-286">
                                            {formatDateTime(
                                                viewingTimesheet.end_time,
                                            )}
                                        </div>
                                    </div>
                                    <div className="ext-timesheet-287">
                                        <div className="ext-timesheet-288">
                                            Total
                                        </div>
                                        <div className="ext-timesheet-289">
                                            {formatWorkingHours(
                                                viewingTimesheet.working_hours,
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="ext-completed-tasks-110">
                                    <div className="ext-timesheet-290">
                                        Description
                                    </div>
                                    <div className="ext-timesheet-291">
                                        {viewingTimesheet.description ||
                                            'No description provided.'}
                                    </div>
                                </div>

                                {/* Logged At */}
                                <div className="ext-timesheet-292">
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    Logged at{' '}
                                    {formatDateTime(
                                        viewingTimesheet.created_at,
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="ext-team-list-229">
                                <button
                                    onClick={() => setViewingTimesheet(null)}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background:
                                            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        transition: 'opacity 0.2s',
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.target.style.opacity = '0.9')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.opacity = '1')
                                    }
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
