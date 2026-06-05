import { useEffect, useState } from 'react';
import API from '../api/axios';

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

const Timesheet = () => {
    const [timesheets, setTimesheets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState(getTodayString());
    const [taskNameFilter, setTaskNameFilter] = useState('');
    const [projectNameFilter, setProjectNameFilter] = useState('');
    const [viewingTimesheet, setViewingTimesheet] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    useEffect(() => {
        fetchTimesheets();
    }, [dateFilter, taskNameFilter, projectNameFilter, page]);

    useEffect(() => {
        setPage(1);
    }, [dateFilter, taskNameFilter, projectNameFilter]);

    const fetchTimesheets = async () => {
        setLoading(true);
        try {
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
            const endpoint = `/timesheets/super-admin/?${query}`;
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
                <div className="content-card-header ext-announcements-12">
                    <label className="ext-dashboard-90">
                        Filter by Date:
                    </label>
                    <input type="date" className="search-input ext-timesheet-176" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                    {dateFilter && (
                        <button className="btn-danger ext-timesheet-177" onClick={() => setDateFilter('')} >
                            Clear
                        </button>
                    )}
                    <label className="ext-timesheet-178">
                        Task Name:
                    </label>
                    <input type="text" className="search-input ext-timesheet-176" placeholder="Task name" value={taskNameFilter} onChange={(e) => setTaskNameFilter(e.target.value)} />
                    <label className="ext-timesheet-178">
                        Project Name:
                    </label>
                    <input type="text" className="search-input ext-timesheet-176" placeholder="Project name" value={projectNameFilter} onChange={(e) => setProjectNameFilter(e.target.value)} />
                </div>
                {loading ? (
                        <div className="page-loader ext-calendar-69">
                            <div className="page-loader-spinner"></div>
                            <div className="page-loader-text">Loading timesheets...</div>
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
                                                <span className="text-bold ext-task-progress-175">
                                                    @{ts.team_member.username}
                                                </span>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td>
                                            {ts.task?.assigned_by ? (
                                                <span className="text-bold ext-timesheet-179">
                                                    @
                                                    {
                                                        ts.task.assigned_by
                                                            .username
                                                    }
                                                </span>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td>
                                            <div className="ext-timesheet-180">
                                                <span className="text-bold">
                                                    {ts.task?.task_name}
                                                </span>
                                                <span className="text-muted ext-timesheet-181">
                                                    {ts.task?.project_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="ext-timesheet-182">
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
                                        <td className="ext-timesheet-183">
                                            {formatDateTime(ts.created_at)}
                                        </td>
                                        <td className="ext-timesheet-183">
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
                {!loading && timesheets.length > 0 && (
                    <div className="pagination ext-timesheet-185">
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
                        <span className="pagination-info ext-timesheet-186">
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
            </div>

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
                        <div className="ext-manage-users-134">
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
                            <div className="ext-announcements-12">
                                <div className="ext-manage-users-136">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="ext-announcements-29">Timesheet Details</h2>
                                    <p className="ext-manage-users-137">
                                        {viewingTimesheet.task?.project_name} - {viewingTimesheet.task?.task_name}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="ext-manage-users-138">
                            <div className="ext-timesheet-188">
                                <div className="ext-manage-users-144">
                                    <div className="ext-manage-users-145">Team Member</div>
                                    <div className="ext-timesheet-189">@{viewingTimesheet.team_member?.username || '-'}</div>
                                </div>
                                <div className="ext-manage-users-144">
                                    <div className="ext-manage-users-145">Assigned By</div>
                                    <div className="ext-timesheet-189">@{viewingTimesheet.task?.assigned_by?.username || '-'}</div>
                                </div>
                            </div>

                            <div className="ext-timesheet-190">
                                <div className="ext-calendar-67">
                                    <span className="ext-timesheet-191">Priority:</span>
                                    {getPriorityBadge(viewingTimesheet.task?.priority)}
                                </div>
                                <div className="ext-calendar-67">
                                    <span className="ext-timesheet-191">Status:</span>
                                    {getStatusBadge(viewingTimesheet.status)}
                                </div>
                            </div>

                            <div className="ext-timesheet-192"/>

                            <div className="ext-timesheet-193">
                                <div className="ext-timesheet-194">
                                    <div className="ext-timesheet-195">Start</div>
                                    <div className="ext-timesheet-196">{formatDateTime(viewingTimesheet.start_time)}</div>
                                </div>
                                <div className="ext-timesheet-197">
                                    <div className="ext-timesheet-198">End</div>
                                    <div className="ext-timesheet-199">{formatDateTime(viewingTimesheet.end_time)}</div>
                                </div>
                                <div className="ext-timesheet-200">
                                    <div className="ext-timesheet-201">Total</div>
                                    <div className="ext-timesheet-202">{formatWorkingHours(viewingTimesheet.working_hours)}</div>
                                </div>
                            </div>

                            <div className="ext-manage-users-161">
                                <div className="ext-timesheet-203">Description</div>
                                <div className="ext-timesheet-204">
                                    {viewingTimesheet.description || 'No description provided.'}
                                </div>
                            </div>

                            <div className="ext-timesheet-205">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                Logged at {formatDateTime(viewingTimesheet.created_at)}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="ext-manage-users-149">
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
    );
};

export default Timesheet;

