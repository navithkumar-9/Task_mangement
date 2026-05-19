import { useState, useEffect } from 'react';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#49CCF9' },
  { id: 'in-progress', label: 'In Progress', color: '#ffb946' },
  { id: 'review', label: 'Review', color: '#7B68EE' },
  { id: 'done', label: 'Done', color: '#4bcf82' },
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', assignee: '', dueDate: '' });

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('admin_tasks') || '[]');
    setTasks(stored);
  }, []);

  const save = (updated) => {
    setTasks(updated);
    localStorage.setItem('admin_tasks', JSON.stringify(updated));
  };

  const openCreate = (status = 'todo') => {
    setEditTask(null);
    setForm({ title: '', description: '', priority: 'medium', status, assignee: '', dueDate: '' });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({ ...task });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editTask) {
      const updated = tasks.map(t => t.id === editTask.id ? { ...t, ...form } : t);
      save(updated);
    } else {
      const newTask = { ...form, id: Date.now().toString(), createdAt: new Date().toISOString() };
      save([newTask, ...tasks]);
    }
    setShowModal(false);
  };

  const deleteTask = (id) => {
    save(tasks.filter(t => t.id !== id));
  };

  const moveTask = (id, newStatus) => {
    save(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  return (
    <div className="page tasks-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''} across all stages</p>
        </div>
        <button className="btn-primary" onClick={() => openCreate()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Task
        </button>
      </div>

      {/* Kanban Board */}
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
                  <div className="kanban-card" key={task.id} onClick={() => openEdit(task)}>
                    <div className="kanban-card-top">
                      <span className={`priority-dot priority-${task.priority}`}></span>
                      <span className={`priority-text priority-${task.priority}`}>{task.priority}</span>
                    </div>
                    <h4 className="kanban-card-title">{task.title}</h4>
                    {task.description && <p className="kanban-card-desc">{task.description}</p>}
                    <div className="kanban-card-footer">
                      {task.assignee && <span className="kanban-assignee">{task.assignee}</span>}
                      {task.dueDate && <span className="kanban-due">{new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                    {/* Move Buttons */}
                    <div className="kanban-card-actions" onClick={e => e.stopPropagation()}>
                      {COLUMNS.filter(c => c.id !== task.status).map(c => (
                        <button key={c.id} className="move-btn" style={{ color: c.color }} onClick={() => moveTask(task.id, c.id)} title={`Move to ${c.label}`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="kanban-add-btn" onClick={() => openCreate(col.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add task
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" placeholder="Task title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input form-textarea" placeholder="Add details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
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
                  <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <input className="form-input" placeholder="Assign to..." value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})} />
              </div>
              <div className="modal-actions">
                {editTask && <button type="button" className="btn-danger" onClick={() => { deleteTask(editTask.id); setShowModal(false); }}>Delete</button>}
                <button type="submit" className="btn-primary">{editTask ? 'Update Task' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
