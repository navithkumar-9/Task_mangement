import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';

const TaskProgress = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const endpoint = `/tasks/progress/?page_size=1000`;
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

  const uniqueTasks = useMemo(() => {
    const names = new Set();
    tasks.forEach(t => { if (t.task_name) names.add(t.task_name); });
    return Array.from(names).sort();
  }, [tasks]);

  const uniqueProjects = useMemo(() => {
    const names = new Set();
    tasks.forEach(t => { if (t.project_name) names.add(t.project_name); });
    return Array.from(names).sort();
  }, [tasks]);

  const uniqueAssignees = useMemo(() => {
    const names = new Set();
    tasks.forEach(t => {
      if (t.assignees) {
        t.assignees.forEach(a => { if (a.username) names.add(a.username); });
      }
    });
    return Array.from(names).sort();
  }, [tasks]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    tasks.forEach(t => { if (t.status) statuses.add(t.status); });
    return Array.from(statuses).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (taskFilter && t.task_name !== taskFilter) return false;
      if (projectFilter && t.project_name !== projectFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (assigneeFilter) {
        const hasAssignee = t.assignees?.some(a => a.username === assigneeFilter);
        if (!hasAssignee) return false;
      }
      return true;
    });
  }, [tasks, taskFilter, projectFilter, assigneeFilter, statusFilter]);

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
        <div className="filter-bar">
          <div className="filter-group">
            <label className="form-label">Task Name</label>
            <select
              value={taskFilter}
              onChange={e => setTaskFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Tasks</option>
              {uniqueTasks.map(name => (
                <option key={name} value={name} title={name}>
                  {name.length > 25 ? name.substring(0, 25) + '...' : name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="form-label">Project Name</label>
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Projects</option>
              {uniqueProjects.map(name => (
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
              onChange={e => setAssigneeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Assignees</option>
              {uniqueAssignees.map(name => (
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
              onChange={e => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {(taskFilter || projectFilter || assigneeFilter || statusFilter) && (
            <button
              className="btn-clear-filter"
              onClick={() => {
                setTaskFilter('');
                setProjectFilter('');
                setAssigneeFilter('');
                setStatusFilter('');
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

        {loading ? (
          <div className="page-loader ext-calendar-69">
            <div className="page-loader-spinner"></div>
            <div className="page-loader-text">Loading tasks...</div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state">
            <p>
              {taskFilter || projectFilter || assigneeFilter || statusFilter
                ? 'No tasks match your filters'
                : 'No tasks found'}
            </p>
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
                  <th>Created At</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, i) => (
                  <tr key={task.id || i}>
                    <td className="text-bold">{task.task_name}</td>
                    <td className="text-muted">{task.project_name}</td>
                    <td>{task.assigned_by ? <span className="text-bold ext-task-progress-175">@{task.assigned_by.username}</span> : '—'}</td>
                    <td>{task.assignees && task.assignees.length > 0 ? <span className="text-bold">@{task.assignees.map(a => a.username).join(', ')}</span> : '—'}</td>
                    <td>{getPriorityBadge(task.priority)}</td>
                    <td>{getStatusBadge(task.status)}</td>
                    <td className="text-muted">
                      {task.created_at ? new Date(task.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="text-muted">
                      {task.revised_due_date ? (
                        <div className="ext-dashboard-115">
                          <span className="ext-dashboard-116">
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                          <span className="ext-announcements-15">
                            {new Date(task.revised_due_date).toLocaleDateString()}
                            <span className="ext-dashboard-117">REVISED</span>
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
