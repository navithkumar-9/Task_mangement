import { useCallback, useEffect, useMemo, useState } from 'react';
import API from '../api/axios';

const ITEMS_PER_PAGE = 10;

// Local module-level cache to prevent flashing "Loading..." on page navigation
let cachedProgressTasksList = null;
let cachedProgressFilterOptions = null;
let cachedProgressTotalCount = 0;
let cachedProgressNextUrl = null;
let cachedProgressPrevUrl = null;

const TaskProgress = () => {
    const [tasks, setTasks] = useState(cachedProgressTasksList || []);
    const [loading, setLoading] = useState(false);
    const [taskFilter, setTaskFilter] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [assigneeFilter, setAssigneeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Backend pagination state
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(cachedProgressTotalCount || 0);
    const [nextUrl, setNextUrl] = useState(cachedProgressNextUrl || null);
    const [prevUrl, setPrevUrl] = useState(cachedProgressPrevUrl || null);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;
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
            return <span style={{ marginLeft: '4px', fontSize: '0.75rem', color: 'var(--primary)' }}>▲</span>;
        }
        if (sortBy === `-${field}`) {
            return <span style={{ marginLeft: '4px', fontSize: '0.75rem', color: 'var(--primary)' }}>▼</span>;
        }
        return <span style={{ marginLeft: '4px', fontSize: '0.75rem', opacity: 0.35 }}>↕</span>;
    };

    const fetchTasks = useCallback(
        async (pageNum = 1) => {
            if (!cachedProgressTasksList) {
                setLoading(true);
            }
            try {
                let url = `/tasks/progress/?page=${pageNum}&page_size=${ITEMS_PER_PAGE}&sort_by=${sortBy}`;
                if (taskFilter)
                    url += `&task_name=${encodeURIComponent(taskFilter)}`;
                if (projectFilter)
                    url += `&project_name=${encodeURIComponent(projectFilter)}`;
                if (statusFilter)
                    url += `&status=${encodeURIComponent(statusFilter)}`;
                if (assigneeFilter)
                    url += `&assignee=${encodeURIComponent(assigneeFilter)}`;

                const res = await API.get(url);
                const responseData = res.data;

                // Handle paginated response: { count, next, previous, results: { data: [...] } }
                let items = [];
                if (responseData.results && responseData.results.data) {
                    items = responseData.results.data;
                } else if (
                    responseData.results &&
                    Array.isArray(responseData.results)
                ) {
                    items = responseData.results;
                } else if (responseData.data) {
                    items = responseData.data;
                } else {
                    items = responseData;
                }

                const tasksList = Array.isArray(items) ? items : [];
                setTasks(tasksList);
                setTotalCount(responseData.count || 0);
                setNextUrl(responseData.next || null);
                setPrevUrl(responseData.previous || null);
                cachedProgressTasksList = tasksList;
                cachedProgressTotalCount = responseData.count || 0;
                cachedProgressNextUrl = responseData.next || null;
                cachedProgressPrevUrl = responseData.previous || null;
            } catch (err) {
                console.error('Failed to fetch tasks progress', err);
            } finally {
                setLoading(false);
            }
        },
        [taskFilter, projectFilter, statusFilter, assigneeFilter, sortBy],
    );

    useEffect(() => {
        fetchTasks(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // Reset to page 1 when filters change, if already on page 1, trigger fetch
    useEffect(() => {
        if (page !== 1) {
            setPage(1);
        } else {
            fetchTasks(1);
        }
    }, [taskFilter, projectFilter, assigneeFilter, statusFilter, sortBy]);

    // Fetch unique filter values efficiently from the backend filter options endpoint
    const [filterOptions, setFilterOptions] = useState(
        cachedProgressFilterOptions || {
            projects: [],
            task_names: [],
            assignees: [],
            statuses: [],
        },
    );

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await API.get('/tasks/filter-options/');
                if (res.data.success) {
                    setFilterOptions(res.data.data);
                    cachedProgressFilterOptions = res.data.data;
                }
            } catch (err) {
                console.error('Failed to fetch filter options', err);
            }
        };
        fetchOptions();
    }, []);

    const uniqueTasks = useMemo(() => {
        return (filterOptions.task_names || []).sort();
    }, [filterOptions.task_names]);

    const uniqueProjects = useMemo(() => {
        return (filterOptions.projects || []).sort();
    }, [filterOptions.projects]);

    const uniqueAssignees = useMemo(() => {
        return (filterOptions.assignees || []).sort();
    }, [filterOptions.assignees]);

    const uniqueStatuses = useMemo(() => {
        return (filterOptions.statuses || []).sort();
    }, [filterOptions.statuses]);

    const STATUS_LABELS = {
        PENDING: 'To-do',
        IN_PROGRESS: 'In Progress',
        HOLD: 'Hold',
        IN_REVIEW: 'In Review',
        COMPLETED: 'Completed',
    };

    // Direct rendering since filtering is backend-driven
    const filteredTasks = useMemo(() => {
        return tasks;
    }, [tasks]);

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

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Task Progress</h1>
                    <p className="page-subtitle">
                        Global view of all tasks across the organization
                    </p>
                </div>
            </div>

            <div className="content-card">
                <div className="filter-bar">
                    <div className="filter-group">
                        <label className="form-label">Task Name</label>
                        <select
                            value={taskFilter}
                            onChange={(e) => setTaskFilter(e.target.value)}
                            className="filter-select"
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

                    <div className="filter-group">
                        <label className="form-label">Project Name</label>
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
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
                        <label className="form-label">Assignee</label>
                        <select
                            value={assigneeFilter}
                            onChange={(e) => setAssigneeFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Assignees</option>
                            {uniqueAssignees.map((name) => (
                                <option key={name} value={name}>
                                    @{name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="form-label">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Statuses</option>
                            {uniqueStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {STATUS_LABELS[status] || status}
                                </option>
                            ))}
                        </select>
                    </div>

                    {(taskFilter ||
                        projectFilter ||
                        assigneeFilter ||
                        statusFilter) && (
                        <button
                            className="btn-clear-filter"
                            onClick={() => {
                                setTaskFilter('');
                                setProjectFilter('');
                                setAssigneeFilter('');
                                setStatusFilter('');
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
                    <div className="page-loader ext-calendar-69">
                        <div className="page-loader-spinner"></div>
                        <div className="page-loader-text">Loading tasks...</div>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="empty-state">
                        <p>
                            {taskFilter ||
                            projectFilter ||
                            assigneeFilter ||
                            statusFilter
                                ? 'No tasks match your filters'
                                : 'No tasks found'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('task_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>Task Name {renderSortArrow('task_name')}</th>
                                        <th onClick={() => handleSort('project_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>Project {renderSortArrow('project_name')}</th>
                                        <th>Assigned By</th>
                                        <th>Assignee</th>
                                        <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer', userSelect: 'none' }}>Priority {renderSortArrow('priority')}</th>
                                        <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>Status {renderSortArrow('status')}</th>
                                        <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer', userSelect: 'none' }}>Created At {renderSortArrow('created_at')}</th>
                                        <th onClick={() => handleSort('due_date')} style={{ cursor: 'pointer', userSelect: 'none' }}>Due Date {renderSortArrow('due_date')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTasks.map((task, i) => (
                                        <tr key={task.id || i}>
                                            <td className="text-bold">
                                                {task.task_name}
                                            </td>
                                            <td className="text-muted">
                                                {task.project_name}
                                            </td>
                                            <td>
                                                {task.assigned_by ? (
                                                    <span className="text-bold ext-task-progress-175">
                                                        @
                                                        {
                                                            task.assigned_by
                                                                .username
                                                        }
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td>
                                                {task.assignees &&
                                                task.assignees.length > 0 ? (
                                                    <span className="text-bold">
                                                        @
                                                        {task.assignees
                                                            .map(
                                                                (a) =>
                                                                    a.username,
                                                            )
                                                            .join(', ')}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td>
                                                {getPriorityBadge(
                                                    task.priority,
                                                )}
                                            </td>
                                            <td>
                                                {getStatusBadge(task.status)}
                                            </td>
                                            <td className="text-muted">
                                                {task.created_at
                                                    ? new Date(
                                                          task.created_at,
                                                      ).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                            <td className="text-muted">
                                                {task.revised_due_date ? (
                                                    <div className="ext-dashboard-115">
                                                        <span className="ext-dashboard-116">
                                                            {new Date(
                                                                task.due_date,
                                                            ).toLocaleDateString()}
                                                        </span>
                                                        <span className="ext-announcements-15">
                                                            {new Date(
                                                                task.revised_due_date,
                                                            ).toLocaleDateString()}
                                                            <span className="ext-dashboard-117">
                                                                REVISED
                                                            </span>
                                                        </span>
                                                    </div>
                                                ) : task.due_date ? (
                                                    <span>
                                                        {new Date(
                                                            task.due_date,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="pagination ext-timesheet-185">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <button
                                        className="pagination-btn"
                                        disabled={!prevUrl}
                                        onClick={() => setPage(1)}
                                        title="First page"
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: !prevUrl
                                                ? 'var(--bg-color)'
                                                : 'var(--primary)',
                                            color: !prevUrl
                                                ? 'var(--text-muted)'
                                                : '#fff',
                                            cursor: !prevUrl
                                                ? 'not-allowed'
                                                : 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        «
                                    </button>
                                    <button
                                        className="pagination-btn"
                                        disabled={!prevUrl}
                                        onClick={() => setPage(page - 1)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: !prevUrl
                                                ? 'var(--bg-color)'
                                                : 'var(--primary)',
                                            color: !prevUrl
                                                ? 'var(--text-muted)'
                                                : '#fff',
                                            cursor: !prevUrl
                                                ? 'not-allowed'
                                                : 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        Previous
                                    </button>
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    {getPageNumbers().map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border:
                                                    p === page
                                                        ? '2px solid var(--primary)'
                                                        : '1px solid var(--border-color)',
                                                background:
                                                    p === page
                                                        ? 'var(--primary)'
                                                        : 'transparent',
                                                color:
                                                    p === page
                                                        ? '#fff'
                                                        : 'var(--text-primary)',
                                                cursor: 'pointer',
                                                fontWeight:
                                                    p === page ? 700 : 500,
                                                fontSize: '0.85rem',
                                                minWidth: '36px',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <button
                                        className="pagination-btn"
                                        disabled={!nextUrl}
                                        onClick={() => setPage(page + 1)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: !nextUrl
                                                ? 'var(--bg-color)'
                                                : 'var(--primary)',
                                            color: !nextUrl
                                                ? 'var(--text-muted)'
                                                : '#fff',
                                            cursor: !nextUrl
                                                ? 'not-allowed'
                                                : 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        Next
                                    </button>
                                    <button
                                        className="pagination-btn"
                                        disabled={!nextUrl}
                                        onClick={() => setPage(totalPages)}
                                        title="Last page"
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: !nextUrl
                                                ? 'var(--bg-color)'
                                                : 'var(--primary)',
                                            color: !nextUrl
                                                ? 'var(--text-muted)'
                                                : '#fff',
                                            cursor: !nextUrl
                                                ? 'not-allowed'
                                                : 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        »
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Pagination Info */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 4px 0',
                                fontSize: '0.8rem',
                                color: 'var(--text-muted)',
                            }}
                        >
                            <span>
                                Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
                                {Math.min(page * ITEMS_PER_PAGE, totalCount)} of{' '}
                                {totalCount} tasks
                            </span>
                            <span>
                                Page {page} of {totalPages}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TaskProgress;
