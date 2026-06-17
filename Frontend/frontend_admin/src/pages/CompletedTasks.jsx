import { useEffect, useRef, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

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

const CompletedTasks = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('-id');

    // Filters
    const [dateFilter, setDateFilter] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');

    // Selected Task Modal
    const [selectedTask, setSelectedTask] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [subtasks, setSubtasks] = useState([]);
    const [postingComment, setPostingComment] = useState(false);
    const commentsEndRef = useRef(null);

    useEffect(() => {
        if (isAdmin) {
            fetchCompletedTasks();
        }
    }, [dateFilter, projectFilter, employeeFilter, page, sortBy]);

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
            return <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: 'var(--primary)' }}>▲</span>;
        }
        if (sortBy === `-${field}`) {
            return <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: 'var(--primary)' }}>▼</span>;
        }
        return <span style={{ marginLeft: '6px', fontSize: '0.75rem', opacity: 0.35 }}>↕</span>;
    };

    const fetchCompletedTasks = async () => {
        setLoading(true);
        try {
            let query = `completed=true&page=${page}&sort_by=${sortBy}`;
            if (dateFilter) query += `&date=${encodeURIComponent(dateFilter)}`;
            if (projectFilter) query += `&project=${encodeURIComponent(projectFilter)}`;
            if (employeeFilter) query += `&employee_name=${encodeURIComponent(employeeFilter)}`;

            const res = await API.get(`/tasks/admin/?${query}`);
            let items = [];
            let count = 0;

            if (res.data.results && res.data.results.data) {
                items = res.data.results.data;
                count = res.data.count || 0;
            } else if (res.data.data) {
                items = res.data.data;
                count = res.data.count || items.length;
            } else if (res.data.results) {
                items = res.data.results;
                count = res.data.count || 0;
            } else {
                items = res.data;
                count = items.length;
            }

            setTasks(items);
            setTotalPages(Math.ceil(count / 10) || 1);
        } catch (err) {
            console.error('Failed to fetch completed tasks', err);
        } finally {
            setLoading(false);
        }
    };

    // Modal helpers
    const openTaskDetail = async (task) => {
        setSelectedTask(task);
        fetchSubtasks(task.id);
        fetchComments(task.id);
    };

    const fetchSubtasks = async (taskId) => {
        try {
            const res = await API.get(`/tasks/${taskId}/subtasks/`);
            if (res.data.success && res.data.data) {
                setSubtasks(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch subtasks', err);
        }
    };

    const fetchComments = async (taskId) => {
        try {
            const res = await API.get(`/tasks/${taskId}/comments/`);
            if (res.data.success && res.data.data) {
                setComments(res.data.data);
                setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        } catch (err) {
            console.error('Failed to fetch comments', err);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || postingComment) return;

        setPostingComment(true);
        try {
            const res = await API.post(`/tasks/${selectedTask.id}/comments/`, {
                content: commentText.trim(),
            });
            if (res.data.success && res.data.data) {
                setComments((prev) => [...prev, res.data.data]);
                setCommentText('');
                setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        } catch (err) {
            console.error('Failed to add comment', err);
        } finally {
            setPostingComment(false);
        }
    };

    const toggleSubtask = async (subtask) => {
        try {
            const res = await API.patch(`/tasks/${selectedTask.id}/subtasks/${subtask.id}/`, {
                is_completed: !subtask.is_completed,
            });
            if (res.data.success && res.data.data) {
                setSubtasks((prev) =>
                    prev.map((s) => (s.id === subtask.id ? res.data.data : s))
                );
            }
        } catch (err) {
            console.error('Failed to update subtask', err);
        }
    };

    const completedPercentage = subtasks.length
        ? Math.round((subtasks.filter((s) => s.is_completed).length / subtasks.length) * 100)
        : 0;

    return (
        <div className="page ext-calendar-56">
            <div className="page-header">
                <h1 className="page-title">Completed Tasks Archive</h1>
                <p className="page-subtitle">Historical archive of all completed tasks and deliverables</p>
            </div>

            {/* Filters panel */}
            <div className="content-card" style={{ padding: 0 }}>
                <div className="filter-bar">
                    <div className="filter-group">
                        <label className="form-label">Date</label>
                        <input
                            type="date"
                            className="filter-input"
                            value={dateFilter}
                            onChange={(e) => {
                                setDateFilter(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="form-label">Project</label>
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="Filter project..."
                            value={projectFilter}
                            onChange={(e) => {
                                setProjectFilter(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="form-label">Employee</label>
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="Filter assignee..."
                            value={employeeFilter}
                            onChange={(e) => {
                                setEmployeeFilter(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    {(dateFilter || projectFilter || employeeFilter) && (
                        <button
                            className="btn-clear-filter"
                            onClick={() => {
                                setDateFilter('');
                                setProjectFilter('');
                                setEmployeeFilter('');
                                setPage(1);
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Tasks Table */}
            <div className="content-card">
                {loading ? (
                    <div className="page-loader ext-calendar-68">
                        <div className="page-loader-spinner"></div>
                        <div className="page-loader-text">Loading completed tasks...</div>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="empty-state ext-completed-tasks-90">
                        <p>No completed tasks found matching the filters.</p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('task_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                            Project / Task {renderSortArrow('task_name')}
                                        </th>
                                        <th>Assignees</th>
                                        <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                            Priority {renderSortArrow('priority')}
                                        </th>
                                        <th onClick={() => handleSort('id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                            Completion Date {renderSortArrow('id')}
                                        </th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map((task) => (
                                        <tr key={task.id}>
                                            <td className="ext-completed-tasks-91">
                                                <div className="ext-completed-tasks-92">
                                                    <span className="ext-announcements-17">
                                                        {task.task_name}
                                                    </span>
                                                    <span className="ext-completed-tasks-93">
                                                        {task.project_name}
                                                    </span>
                                                    {task.team_leader && (
                                                        <span className="ext-completed-tasks-94">
                                                            Leader: @{task.team_leader.username}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="ext-completed-tasks-91">
                                                {task.assignees && task.assignees.length > 0 ? (
                                                    <div className="ext-completed-tasks-95">
                                                        {task.assignees.map((a) => (
                                                            <span key={a.id} className="ext-completed-tasks-96">
                                                                @{a.username}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="ext-completed-tasks-97">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="ext-completed-tasks-91">
                                                <span className={`priority-badge priority-${task.priority?.toLowerCase()}`}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="ext-completed-tasks-98">
                                                {new Date(task.updated_at || task.created_at).toLocaleDateString(undefined, {
                                                    dateStyle: 'medium',
                                                })}
                                            </td>
                                            <td className="ext-completed-tasks-91">
                                                <button
                                                    onClick={() => openTaskDetail(task)}
                                                    title="View Details"
                                                    style={{
                                                        padding: '6px',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        background: 'var(--primary)',
                                                        color: '#ffffff',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
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

                        {totalPages > 1 && (
                            <div className="pagination ext-completed-tasks-100">
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
                                    &larr; Previous
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
                                        background: page >= totalPages ? 'var(--bg-color)' : 'var(--primary)',
                                        color: page >= totalPages ? 'var(--text-muted)' : '#fff',
                                        cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    Next &rarr;
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Task Detail Modal */}
            {selectedTask && (
                <div
                    onClick={() => setSelectedTask(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            width: '1000px',
                            maxWidth: '95vw',
                            height: '85vh',
                            borderRadius: '16px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div className="ext-completed-tasks-104">
                            <div className="ext-announcements-14">
                                <h2 className="ext-completed-tasks-105">
                                    {selectedTask.task_name}
                                </h2>
                                <span className="ext-completed-tasks-106">
                                    COMPLETED
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Split Body */}
                        <div className="ext-completed-tasks-108">
                            {/* Left Panel: Details */}
                            <div className="ext-completed-tasks-109">
                                <div className="ext-completed-tasks-110">
                                    <h4 className="ext-completed-tasks-111">
                                        Project Name
                                    </h4>
                                    <p className="ext-completed-tasks-112">
                                        {selectedTask.project_name}
                                    </p>
                                </div>

                                <div className="ext-completed-tasks-113">
                                    <div>
                                        <h4 className="ext-completed-tasks-111">
                                            Priority
                                        </h4>
                                        <span className={`priority-badge priority-${selectedTask.priority?.toLowerCase()}`}>
                                            {selectedTask.priority}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="ext-completed-tasks-111">
                                            Team Leader
                                        </h4>
                                        <p className="ext-completed-tasks-114">
                                            {selectedTask.team_leader ? `@${selectedTask.team_leader.username}` : '—'}
                                        </p>
                                    </div>
                                </div>

                                <div className="ext-completed-tasks-113">
                                    <div>
                                        <h4 className="ext-completed-tasks-111">
                                            Original Due Date
                                        </h4>
                                        <p className="ext-completed-tasks-115">
                                            {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="ext-completed-tasks-111">
                                            Revised Due Date
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', fontWeight: selectedTask.revised_due_date ? 600 : 400 }}>
                                            {selectedTask.revised_due_date ? new Date(selectedTask.revised_due_date).toLocaleDateString() : 'None'}
                                        </p>
                                    </div>
                                </div>

                                <div className="ext-completed-tasks-110">
                                    <h4 className="ext-completed-tasks-111">
                                        Assigned Employees
                                    </h4>
                                    {selectedTask.assignees && selectedTask.assignees.length > 0 ? (
                                        <div className="ext-completed-tasks-116">
                                            {selectedTask.assignees.map((a) => {
                                                const avStyle = getAvatarStyle(a.username);
                                                return (
                                                    <div key={a.id} className="ext-completed-tasks-117">
                                                        <div style={{ ...avStyle, width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>
                                                            {a.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="ext-completed-tasks-118">@{a.username}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="ext-completed-tasks-119">No assigned members</p>
                                    )}
                                </div>

                                <div className="ext-completed-tasks-110">
                                    <h4 className="ext-completed-tasks-111">
                                        Description
                                    </h4>
                                    <div className="ext-completed-tasks-120">
                                        {selectedTask.description || 'No description provided.'}
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Comments & Subtasks */}
                            <div className="ext-completed-tasks-121">
                                {/* Subtasks panel */}
                                <div className="ext-completed-tasks-122">
                                    <div className="ext-completed-tasks-123">
                                        <h3 className="ext-completed-tasks-124">
                                            Subtasks Progress ({completedPercentage}%)
                                        </h3>
                                    </div>
                                    <div className="ext-completed-tasks-125">
                                        <div style={{ height: '100%', background: '#10B981', width: `${completedPercentage}%`, transition: 'width 0.3s ease' }}></div>
                                    </div>
                                    <div className="ext-completed-tasks-126">
                                        {subtasks.map((st) => (
                                            <div key={st.id} className="ext-completed-tasks-127">
                                                <input
                                                    type="checkbox"
                                                    checked={st.is_completed}
                                                    onChange={() => toggleSubtask(st)}
                                                    style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                                                />
                                                <span style={{ fontSize: '0.85rem', color: st.is_completed ? '#94a3b8' : '#334155', textDecoration: st.is_completed ? 'line-through' : 'none' }}>
                                                    {st.title}
                                                </span>
                                            </div>
                                        ))}
                                        {subtasks.length === 0 && (
                                            <p className="ext-completed-tasks-129">No subtasks listed.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Comments panel */}
                                <div className="ext-completed-tasks-130">
                                    <div className="modern-activity-header">
                                        <span className="modern-activity-header-title">Comments Feed</span>
                                        <span className="modern-activity-header-count">{comments.length}</span>
                                    </div>

                                    <div className="modern-activity-feed">
                                        {comments.map((comment) => {
                                            const avStyle = getAvatarStyle(comment.user.username);
                                            return (
                                                <div key={comment.id} className="modern-comment-card">
                                                    <div className="modern-comment-avatar" style={avStyle}>
                                                        {comment.user.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="modern-comment-content-area">
                                                        <div className="modern-comment-header">
                                                            <span className="modern-comment-username">@{comment.user.username}</span>
                                                            <span className="modern-comment-time">
                                                                {new Date(comment.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="modern-comment-bubble">{comment.content}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={commentsEndRef} />
                                    </div>

                                    <div className="modern-comment-input-panel">
                                        <form onSubmit={handleAddComment} className="modern-comment-input-row">
                                            <textarea
                                                className="modern-comment-textarea"
                                                placeholder="Write a comment..."
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                rows={1}
                                            />
                                            <button
                                                type="submit"
                                                className={`modern-comment-send-btn ${commentText.trim() ? 'active' : ''}`}
                                                disabled={!commentText.trim() || postingComment}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <line x1="22" y1="2" x2="11" y2="13" />
                                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                                </svg>
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompletedTasks;
