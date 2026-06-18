import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import API from '../api/axios';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import { useAuth } from '../context/AuthContext';

const COLUMNS_BASE = [
    { id: 'PENDING', label: 'To-do', color: '#49CCF9' },

    { id: 'IN_PROGRESS', label: 'In Progress', color: '#ffb946' },

    { id: 'HOLD', label: 'Hold', color: '#ff6b6b' },

    { id: 'IN_REVIEW', label: 'In Review', color: '#7B68EE' },

    { id: 'COMPLETED', label: 'Completed', color: '#4bcf82' },
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const getTodayStr = () => {
    const d = new Date();

    const yyyy = d.getFullYear();

    const mm = String(d.getMonth() + 1).padStart(2, '0');

    const dd = String(d.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
};

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

// Local module-level cache to prevent flashing "Loading..." on page navigation
let cachedUserId = null;
let cachedTasksList = null;
let cachedTeamMembersList = null;
let cachedFilterOptionsList = null;

const Tasks = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // Clear cache if logged in user changes
    if (user && cachedUserId !== user.id) {
        cachedUserId = user.id;
        cachedTasksList = null;
        cachedTeamMembersList = null;
        cachedFilterOptionsList = null;
    }

    const isAdmin = user?.role === 'ADMIN';
    const canCrud = isAdmin || user?.can_crud_tasks;

    const COLUMNS = canCrud
        ? COLUMNS_BASE
        : COLUMNS_BASE.filter((c) => c.id !== 'COMPLETED');

    const [tasks, setTasks] = useState(() =>
        cachedUserId === user?.id ? cachedTasksList || [] : [],
    );
    const [sortBy, setSortBy] = useState('-id');

    const [teamMembers, setTeamMembers] = useState(() =>
        cachedUserId === user?.id ? cachedTeamMembersList || [] : [],
    );

    const [showModal, setShowModal] = useState(false);

    const [editTask, setEditTask] = useState(null);
    const canEditOrDelete =
        isAdmin ||
        (!editTask
            ? user?.can_crud_tasks
            : user?.can_crud_tasks &&
              (editTask.assigned_by?.id === user.id ||
                  editTask.assigned_by?.username === user.username));

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState(null);

    // Activity / Comments

    const [comments, setComments] = useState([]);

    const [commentText, setCommentText] = useState('');

    const [loadingComments, setLoadingComments] = useState(false);

    const [postingComment, setPostingComment] = useState(false);

    const commentsEndRef = useRef(null);

    // Subtasks

    const [subtasks, setSubtasks] = useState([]);

    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const [showSubtaskInput, setShowSubtaskInput] = useState(false);

    const [form, setForm] = useState({
        task_name: '',

        project_name: '',

        description: '',

        priority: 'MEDIUM',

        status: 'PENDING',

        assignee_ids: [],

        due_date: '',

        revised_due_date: '',
    });

    const [filterOptions, setFilterOptions] = useState(() =>
        cachedUserId === user?.id
            ? cachedFilterOptionsList || { task_names: [] }
            : { task_names: [] },
    );
    const [selectedTaskFilter, setSelectedTaskFilter] = useState('');
    const [debouncedTaskFilter, setDebouncedTaskFilter] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedTaskFilter(selectedTaskFilter);
        }, 300);
        return () => clearTimeout(handler);
    }, [selectedTaskFilter]);

    useEffect(() => {
        if (!user) return;
        fetchFilterOptions();
    }, [user]);

    const fetchFilterOptions = useCallback(async () => {
        try {
            const res = await API.get('/tasks/filter-options/');
            if (res.data.success) {
                setFilterOptions(res.data.data);
                cachedFilterOptionsList = res.data.data;
            }
        } catch (err) {
            console.error('Failed to fetch filter options', err);
        }
    }, []);

    const uniqueTasks = useMemo(() => {
        return (filterOptions.task_names || []).sort();
    }, [filterOptions.task_names]);

    const fetchTasks = useCallback(async () => {
        if (!cachedTasksList || cachedUserId !== user?.id) {
            setLoading(true);
        }

        try {
            const endpoint = canCrud
                ? `/tasks/admin/?page_size=100&sort_by=${sortBy}${debouncedTaskFilter ? `&search=${encodeURIComponent(debouncedTaskFilter)}` : ''}`
                : `/tasks/my-tasks/?page_size=100&sort_by=${sortBy}${debouncedTaskFilter ? `&search=${encodeURIComponent(debouncedTaskFilter)}` : ''}`;

            const res = await API.get(endpoint);

            let items = [];

            if (res.data.results && res.data.results.data) {
                items = res.data.results.data;
            } else if (res.data.data) {
                items = res.data.data;
            } else if (res.data.results) {
                items = res.data.results;
            } else {
                items = res.data;
            }

            const tasksList = Array.isArray(items) ? items : [];
            setTasks(tasksList);
            cachedTasksList = tasksList;
            cachedUserId = user?.id;
        } catch (err) {
            console.error('Failed to fetch tasks', err);
        } finally {
            setLoading(false);
        }
    }, [canCrud, sortBy, debouncedTaskFilter, user?.id]);

    const fetchTeamMembers = useCallback(async () => {
        try {
            const res = await API.get('/admin/team-members/?page_size=100');

            let items = [];

            if (res.data.results && res.data.results.data)
                items = res.data.results.data;
            else if (res.data.data) items = res.data.data;
            else if (res.data.results) items = res.data.results;

            const membersList = Array.isArray(items) ? items : [];
            setTeamMembers(membersList);
            cachedTeamMembersList = membersList;
        } catch (err) {
            console.error('Failed to fetch team members', err);
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchTasks();

        if (canCrud) {
            fetchTeamMembers();
        }
    }, [user, canCrud, fetchTasks, fetchTeamMembers]);

    // ─── Comments API ───

    const fetchComments = useCallback(async (taskId) => {
        setLoadingComments(true);

        try {
            const res = await API.get(`/tasks/${taskId}/comments/`);

            const data = res.data.data || res.data.results || res.data || [];

            setComments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch comments', err);

            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    }, []);

    // ─── Subtasks API ───

    const fetchSubtasks = useCallback(async (taskId) => {
        try {
            const res = await API.get(`/tasks/${taskId}/subtasks/`);

            const data = res.data.data || res.data.results || res.data || [];

            setSubtasks(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch subtasks', err);

            setSubtasks([]);
        }
    }, []);

    const openEdit = useCallback((task) => {
        setError(null);

        setEditTask(task);

        setForm({
            task_name: task.task_name,

            project_name: task.project_name,

            description: task.description,

            priority: task.priority,

            status: task.status,

            assignee_ids: task.assignees ? task.assignees.map((a) => a.id) : [],

            due_date: task.due_date,

            revised_due_date: task.revised_due_date || '',
        });

        setShowModal(true);

        fetchComments(task.id);

        fetchSubtasks(task.id);
    }, [fetchComments, fetchSubtasks]);

    /* ── Auto-open task from notification (URL ?taskId=X) ── */
    useEffect(() => {
        const taskIdParam = searchParams.get('taskId');
        if (taskIdParam && tasks.length > 0) {
            const taskToOpen = tasks.find(
                (t) => String(t.id) === String(taskIdParam),
            );
            if (taskToOpen) {
                openEdit(taskToOpen);
                /* Clear the query param so refreshing doesn't re-open */
                setSearchParams({}, { replace: true });
            }
        }
    }, [tasks, searchParams, openEdit, setSearchParams]);

    const postComment = useCallback(async () => {
        if (!commentText.trim() || !editTask) return;

        setPostingComment(true);

        try {
            const res = await API.post(`/tasks/${editTask.id}/comments/`, {
                content: commentText.trim(),
            });

            const newComment = res.data.data || res.data;

            setComments((prev) => [...prev, newComment]);

            setCommentText('');

            setTimeout(
                () =>
                    commentsEndRef.current?.scrollIntoView({
                        behavior: 'smooth',
                    }),
                100,
            );
        } catch (err) {
            console.error('Failed to post comment', err);
        } finally {
            setPostingComment(false);
        }
    }, [commentText, editTask]);

    const addSubtask = useCallback(async () => {
        if (!newSubtaskTitle.trim() || !editTask) return;

        try {
            const res = await API.post(`/tasks/${editTask.id}/subtasks/`, {
                title: newSubtaskTitle.trim(),
            });

            const newSub = res.data.data || res.data;

            setSubtasks((prev) => [...prev, newSub]);

            setNewSubtaskTitle('');

            setShowSubtaskInput(false);
        } catch (err) {
            console.error('Failed to add subtask', err);
        }
    }, [newSubtaskTitle, editTask]);

    const toggleSubtask = useCallback(async (subtaskId, currentState) => {
        if (!editTask) return;

        try {
            await API.patch(`/tasks/${editTask.id}/subtasks/${subtaskId}/`, {
                is_completed: !currentState,
            });

            setSubtasks((prev) =>
                prev.map((s) =>
                    s.id === subtaskId
                        ? { ...s, is_completed: !currentState }
                        : s,
                ),
            );
        } catch (err) {
            console.error('Failed to toggle subtask', err);
        }
    }, [editTask]);

    const deleteSubtask = useCallback(async (subtaskId) => {
        if (!editTask) return;

        try {
            await API.delete(`/tasks/${editTask.id}/subtasks/${subtaskId}/`);

            setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
        } catch (err) {
            console.error('Failed to delete subtask', err);
        }
    }, [editTask]);

    // ─── Modal open/close ───

    const openCreate = useCallback((status = 'PENDING') => {
        if (!canCrud) return;

        setError(null);

        setEditTask(null);

        setComments([]);

        setSubtasks([]);

        setForm({
            task_name: '',

            project_name: '',

            description: '',

            priority: 'MEDIUM',

            status,

            assignee_ids: [],

            due_date: '',

            revised_due_date: '',
        });

        setShowModal(true);
    }, [canCrud]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        if (!canEditOrDelete) return;

        setError(null);

        try {
            const payload = { ...form };

            if (!editTask) {
                delete payload.revised_due_date;
            }

            if (editTask && !payload.revised_due_date) {
                payload.revised_due_date = null;
            }

            if (editTask) {
                await API.patch(`/tasks/${editTask.id}/`, payload);
            } else {
                await API.post('/tasks/create/', payload);
            }

            setShowModal(false);

            fetchTasks();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    `Failed to ${editTask ? 'update' : 'create'} task`,
            );

            console.error('Task save error', err);
        }
    }, [canEditOrDelete, form, editTask, fetchTasks]);

    const deleteTask = useCallback(async () => {
        if (!canEditOrDelete || !editTask) return;

        if (!window.confirm('Are you sure you want to delete this task?'))
            return;

        try {
            await API.delete(`/tasks/${editTask.id}/`);

            setShowModal(false);

            fetchTasks();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete task');

            console.error('Task delete error', err);
        }
    }, [canEditOrDelete, editTask, fetchTasks]);

    const moveTask = useCallback(async (id, newStatus, e) => {
        if (e) e.stopPropagation();

        const previousTasks = [...tasks];

        setTasks((currentTasks) =>
            currentTasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
        );

        try {
            const taskObj = tasks.find((t) => t.id === id);
            const isCreator =
                taskObj?.assigned_by?.id === user.id ||
                taskObj?.assigned_by?.username === user.username;
            if (isAdmin || (user?.can_crud_tasks && isCreator)) {
                await API.patch(`/tasks/${id}/`, { status: newStatus });
            } else {
                await API.patch(`/tasks/update-status/${id}/`, {
                    status: newStatus,
                });
            }
        } catch (err) {
            console.error('Failed to update task status', err);

            setTasks(previousTasks);
        }
    }, [tasks, isAdmin, user?.id, user?.username, user?.can_crud_tasks]);

    const toggleAssignee = useCallback((memberId) => {
        setForm((prev) => {
            const ids = prev.assignee_ids.includes(memberId)
                ? prev.assignee_ids.filter((id) => id !== memberId)
                : [...prev.assignee_ids, memberId];

            return { ...prev, assignee_ids: ids };
        });
    }, []);

    const isOverdue = useCallback((task) => {
        const effectiveDue = task.revised_due_date || task.due_date;

        return (
            effectiveDue &&
            new Date(effectiveDue) < new Date(new Date().toDateString()) &&
            task.status !== 'COMPLETED'
        );
    }, []);

    const todayStr = getTodayStr();
    const completedSubtasks = subtasks.filter((s) => s.is_completed).length;

    const totalSubtasks = subtasks.length;

    return (
        <div className="page tasks-page">
            <div className="page-header ext-calendar-57">
                <div>
                    <h1 className="page-title">Tasks</h1>

                    <p className="page-subtitle">
                        {tasks.length} task{tasks.length !== 1 ? 's' : ''}{' '}
                        across all stages
                    </p>
                </div>

                <div className="ext-announcements-6">
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Search tasks by name..."
                            value={selectedTaskFilter}
                            onChange={(e) =>
                                setSelectedTaskFilter(e.target.value)
                            }
                            className="filter-input"
                            style={{ minWidth: '180px' }}
                        />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="filter-select"
                            style={{ minWidth: '160px' }}
                        >
                            <option value="-id">Newest Created</option>
                            <option value="id">Oldest Created</option>
                            <option value="due_date">
                                Due Date (Earliest)
                            </option>
                            <option value="-due_date">Due Date (Latest)</option>
                            <option value="task_name">Task Name (A-Z)</option>
                            <option value="-task_name">Task Name (Z-A)</option>
                            <option value="project_name">
                                Project Name (A-Z)
                            </option>
                            <option value="-project_name">
                                Project Name (Z-A)
                            </option>
                            <option value="priority">Priority (A-Z)</option>
                            <option value="-priority">Priority (Z-A)</option>
                        </select>
                        {selectedTaskFilter && (
                            <button
                                className="btn-clear-filter"
                                onClick={() => {
                                    setSelectedTaskFilter('');
                                    setDebouncedTaskFilter('');
                                }}
                                style={{ padding: '8px 12px' }}
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                                Clear
                            </button>
                        )}
                    </div>

                    {canCrud && (
                        <button
                            className="btn-primary"
                            onClick={() => openCreate()}
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
                            New Task
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="page-loader ext-calendar-68">
                    <div className="page-loader-spinner"></div>
                    <div className="page-loader-text">Loading tasks...</div>
                </div>
            ) : (
                <div className="kanban-board">
                    {COLUMNS.map((col) => {
                        const colTasks = tasks.filter(
                            (t) => t.status === col.id,
                        );

                        return (
                            <div className="kanban-column" key={col.id}>
                                <div className="kanban-col-header">
                                    <div
                                        className="kanban-col-dot"
                                        style={{ background: col.color }}
                                    ></div>

                                    <span className="kanban-col-label">
                                        {col.label}
                                    </span>

                                    <span className="kanban-col-count">
                                        {colTasks.length}
                                    </span>
                                </div>

                                <div className="kanban-col-body">
                                    {colTasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            openEdit={openEdit}
                                            isOverdue={isOverdue}
                                            COLUMNS={COLUMNS}
                                            moveTask={moveTask}
                                        />
                                    ))}

                                    {canCrud && (
                                        <button
                                            className="kanban-add-btn"
                                            onClick={() => openCreate(col.id)}
                                        >
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
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
                                            Add task
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <TaskModal
                showModal={showModal}
                setShowModal={setShowModal}
                editTask={editTask}
                COLUMNS_BASE={COLUMNS_BASE}
                canEditOrDelete={canEditOrDelete}
                deleteTask={deleteTask}
                handleSubmit={handleSubmit}
                error={error}
                form={form}
                setForm={setForm}
                todayStr={todayStr}
                isOverdue={isOverdue}
                subtasks={subtasks}
                totalSubtasks={totalSubtasks}
                completedSubtasks={completedSubtasks}
                setShowSubtaskInput={setShowSubtaskInput}
                showSubtaskInput={showSubtaskInput}
                toggleSubtask={toggleSubtask}
                deleteSubtask={deleteSubtask}
                newSubtaskTitle={newSubtaskTitle}
                setNewSubtaskTitle={setNewSubtaskTitle}
                addSubtask={addSubtask}
                teamMembers={teamMembers}
                user={user}
                toggleAssignee={toggleAssignee}
                loadingComments={loadingComments}
                comments={comments}
                commentText={commentText}
                setCommentText={setCommentText}
                postComment={postComment}
                postingComment={postingComment}
                commentsEndRef={commentsEndRef}
                canCrud={canCrud}
            />
        </div>
    );
};

export default Tasks;
