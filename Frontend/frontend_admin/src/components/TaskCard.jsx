import React from 'react';
import { getAvatarStyle } from '../utils/avatar';

const TaskCard = React.memo(({ task, openEdit, isOverdue, COLUMNS, moveTask }) => {
    return (
        <div
            className="kanban-card"
            onClick={() => openEdit(task)}
            style={{ cursor: 'pointer' }}
        >
            <div className="kanban-card-top">
                <span
                    className={`priority-badge priority-${task.priority?.toLowerCase()} ext-tasks-187`}
                >
                    {task.priority}
                </span>
            </div>

            <h4 className="kanban-card-title">{task.task_name}</h4>

            {task.project_name && (
                <p className="kanban-card-desc ext-tasks-188">
                    Project: {task.project_name}
                </p>
            )}

            {task.description && (
                <p className="kanban-card-desc">{task.description}</p>
            )}

            <div className="kanban-card-footer">
                {/* Multi-assignee avatars */}
                {task.assignees && task.assignees.length > 0 && (
                    <div className="ext-tasks-189">
                        {task.assignees.map((a) => {
                            const avStyle = getAvatarStyle(a.username);
                            return (
                                <span
                                    key={a.id}
                                    title={a.username}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: avStyle.background,
                                        color: avStyle.color,
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        border: '2px solid #fff',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {a.profile_picture ? (
                                        <img
                                            src={a.profile_picture}
                                            alt="Avatar"
                                            className="ext-tasks-190"
                                         />
                                    ) : (
                                        a.username?.charAt(0).toUpperCase()
                                    )}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Due date with revised logic */}
                <div className="ext-tasks-191">
                    {task.revised_due_date ? (
                        <>
                            <span className="ext-tasks-192">
                                {new Date(task.due_date).toLocaleDateString()}
                            </span>
                            <span
                                className="kanban-due"
                                style={{
                                    color: isOverdue(task)
                                        ? '#ff6b6b'
                                        : undefined,
                                }}
                            >
                                {new Date(
                                    task.revised_due_date,
                                ).toLocaleDateString()}
                                <span className="ext-tasks-193">REVISED</span>
                            </span>
                        </>
                    ) : task.due_date ? (
                        <span
                            className="kanban-due"
                            style={{
                                color: isOverdue(task) ? '#ff6b6b' : undefined,
                            }}
                        >
                            {new Date(task.due_date).toLocaleDateString()}
                            {isOverdue(task) && (
                                <span className="ext-tasks-194">OVERDUE</span>
                            )}
                        </span>
                    ) : null}
                </div>
            </div>

            <div
                className="kanban-card-actions"
                onClick={(e) => e.stopPropagation()}
            >
                {COLUMNS.filter((c) => c.id !== task.status).map((c) => (
                    <button
                        key={c.id}
                        className="move-btn"
                        style={{ '--btn-color': c.color }}
                        onClick={(e) => moveTask(task.id, c.id, e)}
                        title={`Move to ${c.label}`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>
        </div>
    );
});

export default TaskCard;
