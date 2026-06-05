import { useEffect, useState, useMemo } from 'react';

import {

    BarChart,

    Bar,

    XAxis,

    YAxis,

    CartesianGrid,

    Tooltip as RechartsTooltip,

    ResponsiveContainer,

    PieChart,

    Pie,

    Cell,

    Legend

} from 'recharts';

import API from '../api/axios';

import { useAuth } from '../context/AuthContext';

import { Link } from 'react-router-dom';



const COLORS = ['#49CCF9', '#ffb946', '#7B68EE', '#4bcf82', '#ff6b6b'];



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



const Dashboard = () => {

    const { user } = useAuth();

    const [profile, setProfile] = useState(null);

    const [tasks, setTasks] = useState([]);

    const [timesheets, setTimesheets] = useState([]);

    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role === 'ADMIN';



    useEffect(() => {

        API.get('/profile/')

            .then((res) => {

                if (res.data.success) setProfile(res.data.data);

            })

            .catch(console.error);

    }, []);



    useEffect(() => {

        const fetchDashboardData = async () => {

            setLoading(true);

            try {

                const tasksEndpoint = isAdmin ? '/tasks/admin/?page_size=1000' : '/tasks/my-tasks/?page_size=1000';

                const timesheetsEndpoint = isAdmin ? '/timesheets/admin/?page_size=50' : '/timesheets/my-timesheets/?page_size=50';

                

                const [tasksRes, timesheetsRes] = await Promise.all([

                    API.get(tasksEndpoint).catch(() => ({ data: [] })),

                    API.get(timesheetsEndpoint).catch(() => ({ data: [] }))

                ]);



                let tasksData = [];

                if (tasksRes.data.results && tasksRes.data.results.data) tasksData = tasksRes.data.results.data;

                else if (tasksRes.data.data) tasksData = tasksRes.data.data;

                else if (tasksRes.data.results) tasksData = tasksRes.data.results;

                else tasksData = tasksRes.data;



                let timesheetsData = [];

                if (timesheetsRes.data.results && timesheetsRes.data.results.data) timesheetsData = timesheetsRes.data.results.data;

                else if (timesheetsRes.data.data) timesheetsData = timesheetsRes.data.data;

                else if (timesheetsRes.data.results) timesheetsData = timesheetsRes.data.results;

                else timesheetsData = timesheetsRes.data;



                setTasks(Array.isArray(tasksData) ? tasksData : []);

                setTimesheets(Array.isArray(timesheetsData) ? timesheetsData : []);

            } catch (error) {

                console.error("Error fetching dashboard data", error);

            } finally {

                setLoading(false);

            }

        };



        fetchDashboardData();

    }, [isAdmin]);



    // Data Processing for Header Metrics

    const headerMetrics = useMemo(() => {

        const active = tasks.filter(t => t.status !== 'COMPLETED');

        const overdue = tasks.filter(t => t.status !== 'COMPLETED' && t.due_date && new Date(t.due_date) < new Date(new Date().toDateString()));

        const completed = tasks.filter(t => t.status === 'COMPLETED');

        const progress = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;



        return {

            totalActive: active.length,

            overdue: overdue.length,

            progress: progress,

        };

    }, [tasks]);



    // Data Processing for Charts

    const { workloadData, statusData } = useMemo(() => {

        const workloadMap = {};

        const statusMap = {

            'PENDING': 0,

            'IN_PROGRESS': 0,

            'IN_REVIEW': 0,

            'HOLD': 0,

            'COMPLETED': 0

        };



        tasks.forEach(task => {

            // Workload (Active tasks only)

            if (task.status !== 'COMPLETED') {

                const assigneeList = task.assignees || [];

                if (assigneeList.length === 0) {

                    if (!workloadMap['Unassigned']) workloadMap['Unassigned'] = 0;

                    workloadMap['Unassigned']++;

                } else {

                    assigneeList.forEach(a => {

                        const name = a.username || 'Unassigned';

                        if (!workloadMap[name]) workloadMap[name] = 0;

                        workloadMap[name]++;

                    });

                }

            }



            // Status Pie Chart

            if (statusMap[task.status] !== undefined) {

                statusMap[task.status]++;

            } else {

                statusMap[task.status] = 1;

            }

        });



        const workloadArr = Object.keys(workloadMap).map(key => ({

            name: key,

            tasks: workloadMap[key]

        })).sort((a, b) => b.tasks - a.tasks);



        const statusLabels = {

            'PENDING': 'Pending',

            'IN_PROGRESS': 'In Progress',

            'IN_REVIEW': 'In Review',

            'HOLD': 'Hold',

            'COMPLETED': 'Completed'

        };



        const statusArr = Object.keys(statusMap)

            .filter(key => statusMap[key] > 0)

            .map(key => ({

                name: statusLabels[key] || key,

                value: statusMap[key],

                originalStatus: key

            }));



        return { workloadData: workloadArr, statusData: statusArr };

    }, [tasks]);



    // Data Processing for Bottom Section

    const topCriticalTasks = useMemo(() => {

        return tasks

            .filter(t => t.status !== 'COMPLETED')

            .sort((a, b) => {

                // Priority weight

                const pWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };

                const aP = pWeight[a.priority] || 0;

                const bP = pWeight[b.priority] || 0;

                

                // Urgency (Overdue > Due Today > Due Future)

                const today = new Date(new Date().toDateString());

                const aDue = a.due_date ? new Date(a.due_date) : new Date(8640000000000000);

                const bDue = b.due_date ? new Date(b.due_date) : new Date(8640000000000000);

                

                const aUrgent = aDue < today ? 3 : (aDue.getTime() === today.getTime() ? 2 : 1);

                const bUrgent = bDue < today ? 3 : (bDue.getTime() === today.getTime() ? 2 : 1);



                // Sort by Urgency then Priority

                if (aUrgent !== bUrgent) return bUrgent - aUrgent;

                if (aP !== bP) return bP - aP;

                return aDue - bDue;

            })

            .slice(0, 5);

    }, [tasks]);



    const recentActivity = useMemo(() => {

        const activities = [];

        

        // Add recent tasks

        tasks.slice(0, 10).forEach(t => {

            activities.push({

                id: `task-${t.id}`,

                type: 'TASK',

                date: new Date(t.created_at),

                title: `Task Created: ${t.task_name}`,

                desc: `${t.assignees?.length ? t.assignees.map(a => `@${a.username}`).join(', ') : 'Someone'} was assigned to ${t.project_name}`,

                user: t.assigned_by?.username || 'Admin'

            });

        });



        // Add recent timesheets

        timesheets.slice(0, 10).forEach(ts => {

            activities.push({

                id: `ts-${ts.id}`,

                type: 'TIMESHEET',

                date: new Date(ts.created_at),

                title: `Time Logged: ${ts.task?.task_name || 'A task'}`,

                desc: `${ts.team_member?.username || 'A member'} logged time.`,

                user: ts.team_member?.username || 'Unknown'

            });

        });



        return activities

            .sort((a, b) => b.date - a.date)

            .slice(0, 8);

    }, [tasks, timesheets]);



    const getPriorityColor = (priority) => {

        switch (priority) {

            case 'HIGH': return '#ff6b6b';

            case 'MEDIUM': return '#ffb946';

            case 'LOW': return '#4bcf82';

            default: return 'var(--text-muted)';

        }

    };



    const getStatusColor = (statusName) => {

        switch (statusName) {

            case 'Pending': return '#49CCF9';

            case 'In Progress': return '#ffb946';

            case 'In Review': return '#7B68EE';

            case 'Completed': return '#4bcf82';

            case 'Hold': return '#ff6b6b';

            default: return '#ccc';

        }

    };



    if (loading) {
        return (
            <div className="page ext-dashboard-131">
                <div className="page-loader">
                    <div className="page-loader-spinner"></div>
                    <div className="page-loader-text">Loading dashboard...</div>
                </div>
            </div>
        );
    }



    return (

        <div className="page">

            {/* Page Header */}

            <div className="page-header ext-completed-tasks-84">

                <div>

                    <h1 className="page-title">Dashboard</h1>

                    <p className="page-subtitle">

                        Welcome back, <span className="text-accent">{profile?.username || user?.username || 'User'}</span>

                    </p>

                </div>

            </div>



            {/* Top Header: High-Level Health Counter Cards */}

            <div className="ext-dashboard-132">

                <div className="stat-card stat-blue">

                    <div className="ext-dashboard-133">

                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>

                    </div>

                    <div className="stat-info">

                        <div className="stat-label">Total Active Tasks</div>

                        <div className="stat-value">{headerMetrics.totalActive}</div>

                    </div>

                </div>



                <div className="stat-card stat-amber">

                    <div className="ext-dashboard-134">

                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>

                    </div>

                    <div className="stat-info">

                        <div className="stat-label">Overdue Tasks</div>

                        <div className="stat-value ext-dashboard-135">{headerMetrics.overdue}</div>

                    </div>

                </div>



                <div className="stat-card stat-green">

                    <div className="ext-dashboard-136">

                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>

                    </div>

                    <div className="stat-info ext-dashboard-137">

                        <div className="stat-label">Project Progress</div>

                        <div className="stat-value">{headerMetrics.progress}%</div>

                        <div className="ext-dashboard-138">

                            <div style={{ width: `${headerMetrics.progress}%`, height: '100%', background: '#4bcf82', borderRadius: '3px' }}></div>

                        </div>

                    </div>

                </div>

            </div>



            {/* Middle Section: Visual Charts */}

            <div className="ext-dashboard-139">

                {/* Workload per Person (Bar Chart) */}

                <div className="content-card">

                    <h2 className="content-card-title ext-completed-tasks-84">Workload Distribution</h2>

                    <div className="ext-dashboard-140">

                        {workloadData.length > 0 ? (

                            <ResponsiveContainer width="100%" height="100%">

                                <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>

                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />

                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />

                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} allowDecimals={false} />

                                    <RechartsTooltip cursor={{ fill: 'var(--bg-body)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />

                                    <Bar dataKey="tasks" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={50} />

                                </BarChart>

                            </ResponsiveContainer>

                        ) : (

                            <div className="ext-dashboard-141">No workload data available</div>

                        )}

                    </div>

                </div>



                {/* Tasks by Current Status (Pie Chart) */}

                <div className="content-card">

                    <h2 className="content-card-title ext-completed-tasks-84">Tasks by Status</h2>

                    <div className="ext-dashboard-142">

                        {statusData.length > 0 ? (

                            <ResponsiveContainer width="100%" height="100%">

                                <PieChart>

                                    <Pie

                                        data={statusData}

                                        cx="50%"

                                        cy="45%"

                                        innerRadius={60}

                                        outerRadius={90}

                                        paddingAngle={5}

                                        dataKey="value"

                                    >

                                        {statusData.map((entry, index) => (

                                            <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />

                                        ))}

                                    </Pie>

                                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />

                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />

                                </PieChart>

                            </ResponsiveContainer>

                        ) : (

                            <div className="ext-dashboard-141">No status data available</div>

                        )}

                    </div>

                </div>

            </div>



            {/* Bottom Section: Actionable Detail */}

            <div className="ext-dashboard-143">

                {/* Top 5 Critical/Urgent Tasks */}

                <div className="content-card">

                    <div className="ext-dashboard-144">

                        <h2 className="content-card-title ext-dashboard-145">Top 5 Critical Tasks</h2>

                        <Link to="/tasks" className="ext-dashboard-146">View All</Link>

                    </div>

                    

                    {topCriticalTasks.length > 0 ? (

                        <div className="ext-dashboard-147">

                            <table className="data-table">

                                <thead>

                                    <tr>

                                        <th>Task Name</th>

                                        <th>Priority</th>

                                        <th>Due Date</th>

                                        <th>Assignee</th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {topCriticalTasks.map((task, idx) => {

                                        const effectiveDue = task.revised_due_date || task.due_date;

                                        const isOverdue = effectiveDue && new Date(effectiveDue) < new Date(new Date().toDateString());

                                        const assigneeName = task.assignees?.[0]?.username || '';

                                        const avStyle = getAvatarStyle(assigneeName);

                                        return (

                                            <tr key={task.id || idx}>

                                                <td className="ext-dashboard-148">

                                                    {task.task_name}

                                                    <div className="ext-dashboard-149">{task.project_name}</div>

                                                </td>

                                                <td>

                                                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: `${getPriorityColor(task.priority)}15`, color: getPriorityColor(task.priority) }}>

                                                        {task.priority}

                                                    </span>

                                                </td>

                                                <td style={{ fontSize: '0.85rem', fontWeight: isOverdue ? 700 : 500, color: isOverdue ? '#ff6b6b' : 'var(--text-secondary)' }}>

                                                    {task.revised_due_date ? (

                                                        <div className="ext-dashboard-150">

                                                            <span className="ext-dashboard-151">

                                                                {new Date(task.due_date).toLocaleDateString()}

                                                            </span>

                                                            <span style={{ fontWeight: 600, color: isOverdue ? '#ff6b6b' : 'var(--text-primary)' }}>

                                                                {new Date(task.revised_due_date).toLocaleDateString()}

                                                                <span className="ext-dashboard-152">REVISED</span>

                                                            </span>

                                                        </div>

                                                    ) : task.due_date ? (

                                                        <>

                                                            {new Date(task.due_date).toLocaleDateString()}

                                                            {isOverdue && <span className="ext-dashboard-153">OVERDUE</span>}

                                                        </>

                                                    ) : 'N/A'}

                                                </td>

                                                <td>

                                                    <div className="ext-announcements-16">

                                                        {assigneeName ? (

                                                            task.assignees?.[0]?.profile_picture ? (

                                                                <img src={task.assignees[0].profile_picture} alt="Avatar" className="ext-dashboard-154"/>

                                                            ) : (

                                                                <div 

                                                                    style={{ 

                                                                        width: '28px', height: '28px', borderRadius: '50%', 

                                                                        background: avStyle.bg, color: avStyle.text, 

                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', 

                                                                        fontSize: '0.8rem', fontWeight: 700,

                                                                        boxShadow: '0 2px 4px rgba(15, 23, 42, 0.08)'

                                                                    }}

                                                                >

                                                                    {assigneeName.charAt(0).toUpperCase()}

                                                                </div>

                                                            )

                                                        ) : (

                                                            <div className="ext-dashboard-155">

                                                                ?

                                                            </div>

                                                        )}

                                                        <span className="ext-dashboard-156">{assigneeName || 'Unassigned'}{task.assignees?.length > 1 ? ` +${task.assignees.length - 1}` : ''}</span>

                                                    </div>

                                                </td>

                                            </tr>

                                        );

                                    })}

                                </tbody>

                            </table>

                        </div>

                    ) : (

                        <div className="ext-dashboard-157">

                            No active critical tasks.

                        </div>

                    )}

                </div>



                {/* Recent Activity Feed */}

                <div className="content-card">

                    <h2 className="content-card-title ext-completed-tasks-84">Recent Activity</h2>

                    

                    <div className="ext-dashboard-158">

                        {recentActivity.length > 0 ? recentActivity.map((activity, idx) => (

                            <div key={activity.id || idx} className="ext-dashboard-159">

                                {idx !== recentActivity.length - 1 && (

                                    <div className="ext-dashboard-160"></div>

                                )}

                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: activity.type === 'TASK' ? 'rgba(123,104,238,0.1)' : 'rgba(73,204,249,0.1)', color: activity.type === 'TASK' ? '#7B68EE' : '#49CCF9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>

                                    {activity.type === 'TASK' ? (

                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>

                                    ) : (

                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>

                                    )}

                                </div>

                                <div className="ext-dashboard-161">

                                    <div className="ext-dashboard-162">

                                        <div className="ext-dashboard-163">{activity.title}</div>

                                        <div className="ext-dashboard-164">

                                            {activity.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}

                                        </div>

                                    </div>

                                    <div className="ext-dashboard-165">

                                        {activity.desc}

                                    </div>

                                </div>

                            </div>

                        )) : (

                            <div className="ext-dashboard-166">No recent activity found.</div>

                        )}

                    </div>

                </div>

            </div>

        </div>

    );

};



export default Dashboard;

