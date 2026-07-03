import { useState } from 'react';
import { getAvatarStyle } from '../utils/avatar';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const timeAgo = (dateStr) => {
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return then.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const isCommentEditAllowed = (createdAt) => {
    if (!createdAt) return false;
    const createdTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffInMinutes = (now - createdTime) / 1000 / 60;
    return diffInMinutes <= 15;
};

const TaskModal = ({
    showModal,
    setShowModal,
    editTask,
    COLUMNS_BASE,
    canEditOrDelete,
    deleteTask,
    handleSubmit,
    error,
    form,
    setForm,
    todayStr,
    isOverdue,
    subtasks,
    totalSubtasks,
    completedSubtasks,
    setShowSubtaskInput,
    showSubtaskInput,
    toggleSubtask,
    deleteSubtask,
    newSubtaskTitle,
    setNewSubtaskTitle,
    addSubtask,
    teamMembers,
    user,
    toggleAssignee,
    loadingComments,
    comments,
    commentText,
    setCommentText,
    postComment,
    postingComment,
    commentsEndRef,
    updateComment,
    deleteComment,
    canCrud,
    isAdmin,
}) => {
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingText, setEditingText] = useState('');

    if (!showModal) return null;

    return (
        <div
            className="modern-modal-overlay"
            onClick={() => setShowModal(false)}
        >
            <div
                className={`modern-modal-card ${editTask ? 'expanded' : 'simple'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="ext-tasks-195">
                    <div className="ext-announcements-14">
                        <h2 className="ext-tasks-196">
                            {editTask ? 'Edit Task' : 'New Task'}
                        </h2>
                        {editTask && (
                            <span className="ext-tasks-197">
                                {
                                    COLUMNS_BASE.find(
                                        (c) => c.id === editTask.status,
                                    )?.label
                                }
                            </span>
                        )}
                    </div>
                    <div className="ext-completed-tasks-127">
                        {editTask && canEditOrDelete && (
                            <button
                                onClick={deleteTask}
                                className="ext-tasks-198"
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                        '#dc2626')
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                        '#ef4444')
                                }
                            >
                                Delete
                            </button>
                        )}
                        <button
                            onClick={() => setShowModal(false)}
                            style={{
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
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                lineHeight: 1,
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
                            ×
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="modern-modal-body">
                    {/* ─── LEFT PANEL: Task Details ─── */}
                    <div className="modern-modal-left">
                        <form onSubmit={handleSubmit} id="task-form">
                            {error && (
                                <div className="alert-error ext-tasks-200">
                                    {error}
                                </div>
                            )}

                            {/* Task Name */}
                            <div className="modern-form-group">
                                <label className="modern-form-label">
                                    Task Name
                                </label>
                                <input
                                    className="modern-form-input"
                                    placeholder="Task title"
                                    value={form.task_name}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            task_name: e.target.value,
                                        })
                                    }
                                    required
                                    disabled={!canEditOrDelete}
                                    style={{
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        background: '#ffffff',
                                        borderColor: '#cbd5e1',
                                    }}
                                />
                            </div>

                            {/* Meta Grid */}
                            <div className="ext-tasks-202">
                                <div className="modern-form-group">
                                    <label className="modern-form-label">
                                        Project
                                    </label>
                                    <input
                                        className="modern-form-input"
                                        placeholder="Project name"
                                        value={form.project_name}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                project_name: e.target.value,
                                            })
                                        }
                                        required
                                        disabled={!canEditOrDelete}
                                    />
                                </div>

                                <div className="modern-form-group">
                                    <label className="modern-form-label">
                                        Status
                                    </label>
                                    <select
                                        className="modern-form-input"
                                        value={form.status}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                status: e.target.value,
                                            })
                                        }
                                        disabled={!canEditOrDelete}
                                        style={{
                                            appearance: 'none',
                                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition:
                                                'right 10px center',
                                            backgroundSize: '16px',
                                        }}
                                    >
                                        {COLUMNS_BASE.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="modern-form-group">
                                    <label className="modern-form-label">
                                        Priority
                                    </label>
                                    <select
                                        className="modern-form-input"
                                        value={form.priority}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                priority: e.target.value,
                                            })
                                        }
                                        disabled={!canEditOrDelete}
                                        style={{
                                            appearance: 'none',
                                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition:
                                                'right 10px center',
                                            backgroundSize: '16px',
                                        }}
                                    >
                                        {PRIORITIES.map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="modern-form-group">
                                    <label className="modern-form-label">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        className="modern-form-input"
                                        value={form.due_date}
                                        min={editTask ? undefined : todayStr}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                due_date: e.target.value,
                                            })
                                        }
                                        required
                                        disabled={
                                            !canEditOrDelete ||
                                            (editTask &&
                                                editTask.revised_due_date)
                                        }
                                    />
                                </div>

                                {editTask && (
                                    <div className="modern-form-group">
                                        <label className="modern-form-label">
                                            Created At
                                        </label>
                                        <input
                                            type="text"
                                            className="modern-form-input ext-tasks-204"
                                            value={
                                                editTask.created_at
                                                    ? new Date(
                                                          editTask.created_at,
                                                      ).toLocaleString()
                                                    : '—'
                                            }
                                            disabled
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Revised Due Date */}
                            {editTask && canEditOrDelete && (
                                <div className="modern-form-group">
                                    <label className="modern-form-label ext-announcements-16">
                                        Revised Due Date
                                        {isOverdue(editTask) && (
                                            <span className="ext-tasks-205">
                                                Overdue
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="date"
                                        className="modern-form-input"
                                        value={form.revised_due_date}
                                        min={todayStr}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                revised_due_date:
                                                    e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            )}

                            {/* Description */}
                            <div className="modern-form-group">
                                <label className="modern-form-label">
                                    Description
                                </label>
                                <textarea
                                    className="modern-form-input modern-form-textarea"
                                    placeholder="Add description..."
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            description: e.target.value,
                                        })
                                    }
                                    disabled={!canEditOrDelete}
                                />
                            </div>

                            {/* ─── Subtasks Section ─── */}
                            {editTask && (
                                <div className="modern-subtasks-panel">
                                    <div className="modern-subtasks-header">
                                        <div className="modern-subtasks-title-area">
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="#64748b"
                                                strokeWidth="2.5"
                                            >
                                                <path d="M9 11l3 3L22 4" />
                                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                            </svg>
                                            <span className="modern-subtasks-title">
                                                Subtasks
                                            </span>
                                            {totalSubtasks > 0 && (
                                                <span className="modern-subtasks-count">
                                                    {completedSubtasks}/
                                                    {totalSubtasks}
                                                </span>
                                            )}
                                        </div>

                                        {canCrud && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowSubtaskInput(true)
                                                }
                                                className="modern-subtasks-add-btn"
                                            >
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="3"
                                                >
                                                    <line
                                                        x1="12"
                                                        y1="5"
                                                        x2="12"
                                                        y2="19"
                                                    />
                                                    <line
                                                        x1="5"
                                                        y1="12"
                                                        x2="19"
                                                        y2="12"
                                                    />
                                                </svg>
                                                Add Subtask
                                            </button>
                                        )}
                                    </div>

                                    {/* Progress bar */}
                                    {totalSubtasks > 0 && (
                                        <div className="modern-subtask-progress-container">
                                            <div
                                                className={`modern-subtask-progress-bar ${completedSubtasks === totalSubtasks ? 'completed' : ''}`}
                                                style={{
                                                    width: `${(completedSubtasks / totalSubtasks) * 100}%`,
                                                }}
                                            ></div>
                                        </div>
                                    )}

                                    {/* Subtask list */}
                                    <div className="modern-subtask-list">
                                        {subtasks.map((sub) => (
                                            <div
                                                key={sub.id}
                                                className="modern-subtask-item"
                                            >
                                                <div
                                                    className={`modern-subtask-checkbox-custom ${sub.is_completed ? 'checked' : ''}`}
                                                    onClick={() =>
                                                        toggleSubtask(
                                                            sub.id,
                                                            sub.is_completed,
                                                        )
                                                    }
                                                >
                                                    {sub.is_completed && (
                                                        <svg
                                                            width="10"
                                                            height="10"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                        >
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    )}
                                                </div>

                                                <span
                                                    className={`modern-subtask-title-text ${sub.is_completed ? 'completed' : ''}`}
                                                    onClick={() =>
                                                        toggleSubtask(
                                                            sub.id,
                                                            sub.is_completed,
                                                        )
                                                    }
                                                    style={{
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {sub.title}
                                                </span>

                                                {canCrud && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            deleteSubtask(
                                                                sub.id,
                                                            )
                                                        }
                                                        className="modern-subtask-delete-btn"
                                                        title="Delete subtask"
                                                    >
                                                        <svg
                                                            width="14"
                                                            height="14"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                        >
                                                            <path d="M3 6h18" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add subtask input */}
                                    {showSubtaskInput && (
                                        <div className="modern-subtask-input-row">
                                            <input
                                                type="text"
                                                className="modern-subtask-input"
                                                placeholder="Subtask title..."
                                                value={newSubtaskTitle}
                                                onChange={(e) =>
                                                    setNewSubtaskTitle(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) =>
                                                    e.key === 'Enter' &&
                                                    (e.preventDefault(),
                                                    addSubtask())
                                                }
                                                autoFocus
                                            />

                                            <button
                                                type="button"
                                                onClick={addSubtask}
                                                className="modern-subtask-btn-add"
                                            >
                                                Add
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowSubtaskInput(false);
                                                    setNewSubtaskTitle('');
                                                }}
                                                className="modern-subtask-btn-cancel"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}

                                    {subtasks.length === 0 &&
                                        !showSubtaskInput && (
                                            <p className="ext-tasks-206">
                                                No subtasks yet
                                            </p>
                                        )}
                                </div>
                            )}

                            {/* ─── Assignees ─── */}
                            {canCrud && (
                                <div className="modern-form-group ext-tasks-207">
                                    <label className="modern-form-label">
                                        Assign To ({form.assignee_ids.length}{' '}
                                        selected)
                                    </label>

                                    <div className="modern-assignee-grid">
                                        {teamMembers.length === 0 ? (
                                            <div className="ext-tasks-208">
                                                No team members available
                                            </div>
                                        ) : (
                                            teamMembers
                                                .filter(
                                                    (m) => m.id !== user?.id,
                                                )
                                                .map((m) => {
                                                    const isSelected =
                                                        form.assignee_ids.includes(
                                                            m.id,
                                                        );

                                                    const avStyle =
                                                        getAvatarStyle(
                                                            m.username,
                                                        );

                                                    return (
                                                        <div
                                                            key={m.id}
                                                            className={`modern-assignee-item ${isSelected ? 'selected' : ''} ${!canEditOrDelete ? 'disabled' : ''}`}
                                                            onClick={() => {
                                                                if (
                                                                    canEditOrDelete
                                                                ) {
                                                                    toggleAssignee(
                                                                        m.id,
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    isSelected
                                                                }
                                                                readOnly
                                                                className="modern-assignee-checkbox"
                                                            />

                                                            {m.profile_picture ? (
                                                                <img
                                                                    src={
                                                                        m.profile_picture
                                                                    }
                                                                    alt="Avatar"
                                                                    className="modern-assignee-avatar ext-tasks-209"
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="modern-assignee-avatar"
                                                                    style={{
                                                                        background:
                                                                            avStyle.background,
                                                                        color: avStyle.color,
                                                                    }}
                                                                >
                                                                    {m.username
                                                                        ?.charAt(
                                                                            0,
                                                                        )
                                                                        .toUpperCase()}
                                                                </div>
                                                            )}

                                                            <span className="modern-assignee-name">
                                                                {m.username}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Save buttons */}
                            {canEditOrDelete && (
                                <div className="modern-modal-footer">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="modern-btn-secondary"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="modern-btn-primary"
                                    >
                                        {editTask
                                            ? 'Update Task'
                                            : 'Create Task'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* ─── RIGHT PANEL: Activity ─── */}
                    {editTask && (
                        <div className="modern-modal-right">
                            {/* Activity Header */}
                            <div className="modern-activity-header">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="var(--text-secondary)"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                <span className="modern-activity-header-title">
                                    Activity & Comments
                                </span>
                                {comments.length > 0 && (
                                    <span className="modern-activity-header-count">
                                        {comments.length}
                                    </span>
                                )}
                            </div>

                            {/* Comments scroll area */}
                            <div className="modern-activity-feed">
                                {loadingComments ? (
                                    <div className="modern-comments-loading-state">
                                        <div className="modern-comment-spinner"></div>
                                        <div className="ext-tasks-210">
                                            Loading activity...
                                        </div>
                                    </div>
                                ) : (
                                    comments.map((comment) => {
                                        const avStyle = getAvatarStyle(
                                            comment.user?.username || '',
                                        );

                                        return (
                                            <div
                                                key={comment.id}
                                                className="modern-comment-card"
                                            >
                                                {comment.user
                                                    ?.profile_picture ? (
                                                    <img
                                                        src={
                                                            comment.user
                                                                .profile_picture
                                                        }
                                                        alt="Avatar"
                                                        className="modern-comment-avatar ext-tasks-209"
                                                    />
                                                ) : (
                                                    <div
                                                        className="modern-comment-avatar"
                                                        style={{
                                                            background:
                                                                avStyle.bg,
                                                            color: avStyle.text,
                                                        }}
                                                    >
                                                        {comment.user?.username
                                                            ?.charAt(0)
                                                            .toUpperCase() ||
                                                            '?'}
                                                    </div>
                                                )}

                                                <div className="modern-comment-content-area">
                                                    <div className="modern-comment-header">
                                                        <span className="modern-comment-username">
                                                            {comment.user
                                                                ?.username ||
                                                                'Unknown'}
                                                        </span>
                                                        <span className="modern-comment-time">
                                                            {timeAgo(
                                                                comment.created_at,
                                                            )}
                                                        </span>
                                                        {comment.user?.id === user?.id && isCommentEditAllowed(comment.created_at) && (
                                                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', fontSize: '0.75rem' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingCommentId(comment.id);
                                                                        setEditingText(comment.content);
                                                                    }}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: 'var(--text-secondary, #64748b)',
                                                                        cursor: 'pointer',
                                                                        padding: '0 2px',
                                                                        transition: 'color 0.2s',
                                                                    }}
                                                                    onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                                                                    onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary, #64748b)'}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm("Are you sure you want to delete this comment?")) {
                                                                            deleteComment(comment.id);
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: 'var(--text-secondary, #64748b)',
                                                                        cursor: 'pointer',
                                                                        padding: '0 2px',
                                                                        transition: 'color 0.2s',
                                                                    }}
                                                                    onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                                                                    onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary, #64748b)'}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {editingCommentId === comment.id ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '4px' }}>
                                                            <textarea
                                                                value={editingText}
                                                                onChange={(e) => setEditingText(e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '8px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #3b82f6',
                                                                    outline: 'none',
                                                                    fontSize: '0.85rem',
                                                                    minHeight: '60px',
                                                                    resize: 'vertical',
                                                                    backgroundColor: 'var(--bg-primary, #ffffff)',
                                                                    color: 'var(--text-primary, #1e293b)'
                                                                }}
                                                            />
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingCommentId(null);
                                                                        setEditingText('');
                                                                    }}
                                                                    style={{
                                                                        padding: '4px 10px',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #cbd5e1',
                                                                        background: 'none',
                                                                        fontSize: '0.75rem',
                                                                        cursor: 'pointer',
                                                                        color: 'var(--text-secondary, #64748b)'
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!editingText.trim()) return;
                                                                        await updateComment(comment.id, editingText);
                                                                        setEditingCommentId(null);
                                                                        setEditingText('');
                                                                    }}
                                                                    style={{
                                                                        padding: '4px 10px',
                                                                        borderRadius: '4px',
                                                                        border: 'none',
                                                                        background: '#3b82f6',
                                                                        color: '#ffffff',
                                                                        fontSize: '0.75rem',
                                                                        cursor: 'pointer',
                                                                        fontWeight: '500'
                                                                    }}
                                                                >
                                                                    Save
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="modern-comment-bubble">
                                                            {comment.content}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={commentsEndRef} />
                            </div>

                            {/* Comment Input */}
                            <div className="modern-comment-input-panel">
                                <div className="modern-comment-input-row">
                                    {(() => {
                                        const avStyle = getAvatarStyle(
                                            user?.username || 'U',
                                        );

                                        return user?.profile_picture ? (
                                            <img
                                                src={user.profile_picture}
                                                alt="Avatar"
                                                className="modern-comment-input-avatar ext-tasks-209"
                                            />
                                        ) : (
                                            <div
                                                className="modern-comment-input-avatar"
                                                style={{
                                                    background: avStyle.bg,
                                                    color: avStyle.text,
                                                }}
                                            >
                                                {user?.username
                                                    ?.charAt(0)
                                                    .toUpperCase() || 'U'}
                                            </div>
                                        );
                                    })()}

                                    <textarea
                                        className="modern-comment-textarea"
                                        placeholder="Add comment..."
                                        value={commentText}
                                        onChange={(e) =>
                                            setCommentText(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === 'Enter' &&
                                                !e.shiftKey
                                            ) {
                                                e.preventDefault();
                                                postComment();
                                            }
                                        }}
                                        rows={1}
                                    />

                                    <button
                                        onClick={postComment}
                                        disabled={
                                            !commentText.trim() ||
                                            postingComment
                                        }
                                        className={`modern-comment-send-btn ${
                                            commentText.trim() &&
                                            !postingComment
                                                ? 'active'
                                                : ''
                                        }`}
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        >
                                            <line
                                                x1="22"
                                                y1="2"
                                                x2="11"
                                                y2="13"
                                            />
                                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskModal;
