import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const COLUMNS_BASE = [
  { id: 'PENDING', label: 'Pending', color: '#49CCF9' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: '#ffb946' },
  { id: 'HOLD', label: 'Hold', color: '#ff6b6b' },
  { id: 'IN_REVIEW', label: 'In Review', color: '#7B68EE' },
  { id: 'COMPLETED', label: 'Completed', color: '#4bcf82' },
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const Tasks = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const COLUMNS = isAdmin ? COLUMNS_BASE : COLUMNS_BASE.filter(c => c.id !== 'COMPLETED');

  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [form, setForm] = useState({ 
    task_name: '', 
    project_name: '', 
    description: '', 
    priority: 'MEDIUM', 
    status: 'PENDING', 
    assignee_id: '', 
    due_date: '' 
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchTasks();
    if (isAdmin) {
      fetchTeamMembers();
    }
  }, [isAdmin, debouncedSearch]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const endpoint = isAdmin 
        ? `/tasks/admin/?page_size=100${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`
        : `/tasks/my-tasks/?page_size=100${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`;
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
      setTasks(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await API.get('/admin/team-members/?page_size=100');
      let items = [];
      if (res.data.results && res.data.results.data) items = res.data.results.data;
      else if (res.data.data) items = res.data.data;
      else if (res.data.results) items = res.data.results;
      
      setTeamMembers(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to fetch team members', err);
    }
  };

  const openCreate = (status = 'PENDING') => {
    if (!isAdmin) return;
    setError(null);
    setEditTask(null);
    setForm({ 
      task_name: '', 
      project_name: '',
      description: '', 
      priority: 'MEDIUM', 
      status, 
      assignee_id: teamMembers.length > 0 ? teamMembers[0].id : '', 
      due_date: '' 
    });
    setShowModal(true);
  };

  const openEdit = (task) => {
    if (!isAdmin) return;
    setError(null);
    setEditTask(task);
    setForm({
      task_name: task.task_name,
      project_name: task.project_name,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assignee_id: task.assignee?.id || '',
      due_date: task.due_date
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    setError(null);
    try {
      if (editTask) {
        await API.patch(`/tasks/${editTask.id}/`, form);
      } else {
        await API.post('/tasks/create/', form);
      }
      setShowModal(false);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editTask ? 'update' : 'create'} task`);
      console.error('Task save error', err);
    }
  };

  const deleteTask = async () => {
    if (!isAdmin || !editTask) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await API.delete(`/tasks/${editTask.id}/`);
      setShowModal(false);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task');
      console.error('Task delete error', err);
    }
  };

  const moveTask = async (id, newStatus, e) => {
    if (e) e.stopPropagation();
    
    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    try {
      if (isAdmin) {
        await API.patch(`/tasks/${id}/`, { status: newStatus });
      } else {
        await API.patch(`/tasks/update-status/${id}/`, { status: newStatus });
      }
    } catch (err) {
      console.error('Failed to update task status', err);
      setTasks(previousTasks);
    }
  };

  return (
    <div className="page tasks-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''} across all stages</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search tasks..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
          />
          {isAdmin && (
            <button className="btn-primary" onClick={() => openCreate()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Task
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner"></div>
          <p>Loading tasks...</p>
        </div>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div className="kanban-column" key={col.id}>
                <div className="kanban-col-header">
                  <div className="kanban-col-dot" style={{ background: col.color }}></div>
                  <span className="kanban-col-label">{col.label}</span>
                  <span className="kanban-col-count">{colTasks.length}</span>
                </div>
                <div className="kanban-col-body">
                  {colTasks.map(task => (
                    <div 
                      className="kanban-card" 
                      key={task.id} 
                      onClick={() => isAdmin && openEdit(task)} 
                      style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                    >
                      <div className="kanban-card-top">
                        <span className={`priority-dot priority-${task.priority?.toLowerCase()}`}></span>
                        <span className={`priority-text priority-${task.priority?.toLowerCase()}`}>{task.priority}</span>
                      </div>
                      <h4 className="kanban-card-title">{task.task_name}</h4>
                      {task.project_name && <p className="kanban-card-desc" style={{ fontWeight: 600, color: 'var(--primary)' }}>Project: {task.project_name}</p>}
                      {task.description && <p className="kanban-card-desc">{task.description}</p>}
                      <div className="kanban-card-footer">
                        {task.assignee && <span className="kanban-assignee">{task.assignee.username}</span>}
                        {task.due_date && <span className="kanban-due">{new Date(task.due_date).toLocaleDateString()}</span>}
                      </div>
                      <div className="kanban-card-actions" onClick={e => e.stopPropagation()}>
                        {COLUMNS.filter(c => c.id !== task.status).map(c => (
                          <button key={c.id} className="move-btn" style={{ color: c.color }} onClick={(e) => moveTask(task.id, c.id, e)} title={`Move to ${c.label}`}>
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {isAdmin && (
                    <button className="kanban-add-btn" onClick={() => openCreate(col.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="alert-error">{error}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Task Name</label>
                  <input className="form-input" placeholder="Task title" value={form.task_name} onChange={e => setForm({...form, task_name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Project Name</label>
                  <input className="form-input" placeholder="Project name" value={form.project_name} onChange={e => setForm({...form, project_name: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input form-textarea" placeholder="Add details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-input" value={form.assignee_id} onChange={e => setForm({...form, assignee_id: e.target.value})} required>
                  <option value="" disabled>Select Team Member</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.username}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '24px' }}>
                <div>
                  {editTask && (
                    <button type="button" className="btn-danger" onClick={deleteTask}>Delete Task</button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-danger" style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none' }} onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">{editTask ? 'Update Task' : 'Create Task'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
