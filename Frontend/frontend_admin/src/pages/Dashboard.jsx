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

    const [dashboardData, setDashboardData] = useState(null);

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

                const res = await API.get('/dashboard/stats/');

                if (res.data.success) {

                    setDashboardData(res.data.data);

                }

            } catch (error) {

                console.error("Error fetching dashboard data", error);

            } finally {

                setLoading(false);

            }

        };



        fetchDashboardData();

    }, []);



    // Data Processing for Header Metrics

    const headerMetrics = useMemo(() => {

        return dashboardData?.metrics || { totalActive: 0, overdue: 0, progress: 0 };

    }, [dashboardData]);



    // Data Processing for Charts

    const workloadData = useMemo(() => {

        return dashboardData?.workloadData || [];

    }, [dashboardData]);



    const statusData = useMemo(() => {

        return dashboardData?.statusData || [];

    }, [dashboardData]);



    // Data Processing for Bottom Section

    const topCriticalTasks = useMemo(() => {

        return dashboardData?.topCriticalTasks || [];

    }, [dashboardData]);



    const recentActivity = useMemo(() => {

        if (!dashboardData?.recentActivity) return [];

        return dashboardData.recentActivity.map(act => ({

            ...act,

            date: new Date(act.date)

        }));

    }, [dashboardData]);



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

            case 'To-do': return '#49CCF9';

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

