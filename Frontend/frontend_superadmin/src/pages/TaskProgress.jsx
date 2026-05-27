import { useState, useEffect } from 'react';
import API from '../api/axios';

const TaskProgress = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchTasks();
  }, [debouncedSearch]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const endpoint = debouncedSearch 
        ? `/tasks/progress/?page_size=1000&search=${encodeURIComponent(debouncedSearch)}`
        : `/tasks/progress/?page_size=1000`;
      const res = await API.get(endpoint);
      let items = [];
      if (res.data.results && res.data.results.data) items = res.data.results.data;
      else if (res.data.data) items = res.data.data;
      else if (res.data.results) items = res.data.results;
      else items = res.data;
      
      setTasks(Array.isArray(items) ? items : []);
      
    } catch (err) {
      console.error('Failed to fetch tasks progress', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colorMap = {
      'PENDING': { bg: 'rgba(73,204,249,0.1)', color: '#49CCF9', label: 'Pending' },
      'IN_PROGRESS': { bg: 'rgba(255,185,70,0.1)', color: '#ffb946', label: 'In Progress' },
      'HOLD': { bg: 'rgba(255,107,107,0.1)', color: '#ff6b6b', label: 'Hold' },
      'IN_REVIEW': { bg: 'rgba(123,104,238,0.1)', color: '#7B68EE', label: 'In Review' },
      'COMPLETED': { bg: 'rgba(75,207,130,0.1)', color: '#4bcf82', label: 'Completed' },
    };
    const style = colorMap[status] || { bg: 'rgba(0,0,0,0.1)', color: '#666', label: status };
    return <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: style.bg, color: style.color }}>{style.label}</span>;
  };

  const getPriorityBadge = (priority) => {
    const colorMap = {
      'LOW': { bg: 'rgba(75,207,130,0.1)', color: '#4bcf82' },
      'MEDIUM': { bg: 'rgba(255,185,70,0.1)', color: '#ffb946' },
      'HIGH': { bg: 'rgba(255,107,107,0.1)', color: '#ff6b6b' },
    };
    const style = colorMap[priority] || { bg: 'rgba(0,0,0,0.1)', color: '#666' };
    return <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: style.bg, color: style.color }}>{priority}</span>;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Task Progress</h1>
          <p className="page-subtitle">Global view of all tasks across the organization</p>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search by task, project, assignee..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        {loading ? (
          <div className="empty-state">
            <div className="spinner"></div>
            <p>Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <p>{debouncedSearch ? 'No tasks match your search' : 'No tasks found'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Project</th>
                  <th>Assigned By</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, i) => (
                  <tr key={task.id || i}>
                    <td className="text-bold">{task.task_name}</td>
                    <td className="text-muted">{task.project_name}</td>
                    <td>{task.assigned_by ? <span className="text-bold" style={{ color: 'var(--primary)' }}>@{task.assigned_by.username}</span> : '—'}</td>
                    <td>{task.assignees && task.assignees.length > 0 ? <span className="text-bold">@{task.assignees.map(a => a.username).join(', ')}</span> : '—'}</td>
                    <td>{getPriorityBadge(task.priority)}</td>
                    <td>{getStatusBadge(task.status)}</td>
                    <td className="text-muted">
                      {task.revised_due_date ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ textDecoration: 'line-through', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {new Date(task.revised_due_date).toLocaleDateString()}
                            <span style={{ fontSize: '0.65rem', marginLeft: '6px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(255,185,70,0.1)', color: '#ffb946', fontWeight: 700 }}>REVISED</span>
                          </span>
                        </div>
                      ) : task.due_date ? (
                        <span>{new Date(task.due_date).toLocaleDateString()}</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskProgress;
