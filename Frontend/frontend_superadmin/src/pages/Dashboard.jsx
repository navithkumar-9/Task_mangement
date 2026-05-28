import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from 'recharts';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#49CCF9', '#ffb946', '#7B68EE', '#4bcf82', '#ff6b6b'];

const Dashboard = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [timesheets, setTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);

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
                const tasksEndpoint = '/tasks/progress/?page_size=1000';
                const timesheetsEndpoint =
                    '/timesheets/super-admin/?page_size=50';

                const [tasksRes, timesheetsRes] = await Promise.all([
                    API.get(tasksEndpoint).catch(() => ({ data: [] })),
                    API.get(timesheetsEndpoint).catch(() => ({ data: [] })),
                ]);

                let tasksData = [];
                if (tasksRes.data.results && tasksRes.data.results.data)
                    tasksData = tasksRes.data.results.data;
                else if (tasksRes.data.data) tasksData = tasksRes.data.data;
                else if (tasksRes.data.results)
                    tasksData = tasksRes.data.results;
                else tasksData = tasksRes.data;

                let timesheetsData = [];
                if (
                    timesheetsRes.data.results &&
                    timesheetsRes.data.results.data
                )
                    timesheetsData = timesheetsRes.data.results.data;
                else if (timesheetsRes.data.data)
                    timesheetsData = timesheetsRes.data.data;
                else if (timesheetsRes.data.results)
                    timesheetsData = timesheetsRes.data.results;
                else timesheetsData = timesheetsRes.data;

                setTasks(Array.isArray(tasksData) ? tasksData : []);
                setTimesheets(
                    Array.isArray(timesheetsData) ? timesheetsData : [],
                );
            } catch (error) {
                console.error('Error fetching dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Data Processing for Header Metrics
    const headerMetrics = useMemo(() => {
        const active = tasks.filter((t) => t.status !== 'COMPLETED');
        const overdue = tasks.filter(
            (t) =>
                t.status !== 'COMPLETED' &&
                t.due_date &&
                new Date(t.due_date) < new Date(new Date().toDateString()),
        );
        const completed = tasks.filter((t) => t.status === 'COMPLETED');
        const progress =
            tasks.length > 0
                ? Math.round((completed.length / tasks.length) * 100)
                : 0;

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
            PENDING: 0,
            IN_PROGRESS: 0,
            IN_REVIEW: 0,
            HOLD: 0,
            COMPLETED: 0,
        };

        tasks.forEach((task) => {
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

        const workloadArr = Object.keys(workloadMap)
            .map((key) => ({
                name: key,
                tasks: workloadMap[key],
            }))
            .sort((a, b) => b.tasks - a.tasks);

        const statusLabels = {
            PENDING: 'Pending',
            IN_PROGRESS: 'In Progress',
            IN_REVIEW: 'In Review',
            HOLD: 'Hold',
            COMPLETED: 'Completed',
        };

        const statusArr = Object.keys(statusMap)
            .filter((key) => statusMap[key] > 0)
            .map((key) => ({
                name: statusLabels[key] || key,
                value: statusMap[key],
                originalStatus: key,
            }));

        return { workloadData: workloadArr, statusData: statusArr };
    }, [tasks]);

    // Data Processing for Bottom Section
    const topCriticalTasks = useMemo(() => {
        return tasks
            .filter((t) => t.status !== 'COMPLETED')
            .sort((a, b) => {
                // Priority weight
                const pWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
                const aP = pWeight[a.priority] || 0;
                const bP = pWeight[b.priority] || 0;

                // Urgency (Overdue > Due Today > Due Future)
                const today = new Date(new Date().toDateString());
                const aDue = a.due_date
                    ? new Date(a.due_date)
                    : new Date(8640000000000000);
                const bDue = b.due_date
                    ? new Date(b.due_date)
                    : new Date(8640000000000000);

                const aUrgent =
                    aDue < today
                        ? 3
                        : aDue.getTime() === today.getTime()
                          ? 2
                          : 1;
                const bUrgent =
                    bDue < today
                        ? 3
                        : bDue.getTime() === today.getTime()
                          ? 2
                          : 1;

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
        tasks.slice(0, 10).forEach((t) => {
            activities.push({
                id: `task-${t.id}`,
                type: 'TASK',
                date: new Date(t.created_at),
                title: `Task Created: ${t.task_name}`,
                desc: `${t.assignees?.length ? t.assignees.map(a => `@${a.username}`).join(', ') : 'Someone'} was assigned to ${t.project_name}`,
                user: t.assigned_by?.username || 'Admin',
            });
        });

        // Add recent timesheets
        timesheets.slice(0, 10).forEach((ts) => {
            activities.push({
                id: `ts-${ts.id}`,
                type: 'TIMESHEET',
                date: new Date(ts.created_at),
                title: `Time Logged: ${ts.task?.task_name || 'A task'}`,
                desc: `${ts.team_member?.username || 'A member'} logged time.`,
                user: ts.team_member?.username || 'Unknown',
            });
        });

        return activities.sort((a, b) => b.date - a.date).slice(0, 8);
    }, [tasks, timesheets]);

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'HIGH':
                return '#ff6b6b';
            case 'MEDIUM':
                return '#ffb946';
            case 'LOW':
                return '#4bcf82';
            default:
                return 'var(--text-muted)';
        }
    };

    const getStatusColor = (statusName) => {
        switch (statusName) {
            case 'Pending':
                return '#49CCF9';
            case 'In Progress':
                return '#ffb946';
            case 'In Review':
                return '#7B68EE';
            case 'Completed':
                return '#4bcf82';
            case 'Hold':
                return '#ff6b6b';
            default:
                return '#ccc';
        }
    };

    if (loading) {
        return (
            <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
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
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title">Global Dashboard</h1>
                    <p className="page-subtitle">
                        Welcome back,{' '}
                        <span className="text-accent">
                            {profile?.username ||
                                user?.username ||
                                'Super Admin'}
                        </span>
                    </p>
                </div>
            </div>

            {/* Top Header: High-Level Health Counter Cards */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    marginBottom: '32px',
                }}
            >
                <div
                    style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                    }}
                >
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: 'rgba(73,204,249,0.1)',
                            color: '#49CCF9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                            }}
                        >
                            Total Active Tasks
                        </div>
                        <div
                            style={{
                                fontSize: '2rem',
                                fontWeight: 800,
                                color: 'var(--text-primary)',
                                lineHeight: 1.2,
                            }}
                        >
                            {headerMetrics.totalActive}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                    }}
                >
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: 'rgba(255,107,107,0.1)',
                            color: '#ff6b6b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                            }}
                        >
                            Overdue Tasks
                        </div>
                        <div
                            style={{
                                fontSize: '2rem',
                                fontWeight: 800,
                                color: '#ff6b6b',
                                lineHeight: 1.2,
                            }}
                        >
                            {headerMetrics.overdue}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                    }}
                >
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: 'rgba(75,207,130,0.1)',
                            color: '#4bcf82',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div
                            style={{
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                            }}
                        >
                            Project Progress
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: '8px',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '2rem',
                                    fontWeight: 800,
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.2,
                                }}
                            >
                                {headerMetrics.progress}%
                            </div>
                        </div>
                        <div
                            style={{
                                width: '100%',
                                height: '6px',
                                background: 'var(--bg-body)',
                                borderRadius: '3px',
                                marginTop: '8px',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    width: `${headerMetrics.progress}%`,
                                    height: '100%',
                                    background: '#4bcf82',
                                    borderRadius: '3px',
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Section: Visual Charts */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 2fr',
                    gap: '24px',
                    marginBottom: '32px',
                }}
            >
                {/* Workload per Person (Bar Chart) */}
                <div
                    style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                    }}
                >
                    <h2
                        style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            margin: '0 0 24px',
                            color: 'var(--text-primary)',
                        }}
                    >
                        Workload Distribution (Global)
                    </h2>
                    <div style={{ height: '300px', width: '100%' }}>
                        {workloadData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={workloadData}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: -20,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="var(--border-light)"
                                    />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fontSize: 12,
                                            fill: 'var(--text-muted)',
                                        }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fontSize: 12,
                                            fill: 'var(--text-muted)',
                                        }}
                                        allowDecimals={false}
                                    />
                                    <RechartsTooltip
                                        cursor={{ fill: 'var(--bg-body)' }}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow:
                                                '0 10px 30px rgba(0,0,0,0.1)',
                                        }}
                                    />
                                    <Bar
                                        dataKey="tasks"
                                        fill="var(--primary)"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={50}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div
                                style={{
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                No workload data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Tasks by Current Status (Pie Chart) */}
                <div
                    style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                    }}
                >
                    <h2
                        style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            margin: '0 0 24px',
                            color: 'var(--text-primary)',
                        }}
                    >
                        Tasks by Status
                    </h2>
                    <div
                        style={{
                            height: '300px',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
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
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={getStatusColor(
                                                    entry.name,
                                                )}
                                            />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow:
                                                '0 10px 30px rgba(0,0,0,0.1)',
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '12px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div
                                style={{
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                No status data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Actionable Detail */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr',
                    gap: '24px',
                }}
            >
                {/* Top 5 Critical/Urgent Tasks */}
                <div
                    style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                        }}
                    >
                        <h2
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                margin: 0,
                                color: 'var(--text-primary)',
                            }}
                        >
                            Top 5 Critical Tasks (Global)
                        </h2>
                        <Link
                            to="/tasks-progress"
                            style={{
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: 'var(--primary)',
                                textDecoration: 'none',
                            }}
                        >
                            View All
                        </Link>
                    </div>

                    {topCriticalTasks.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    textAlign: 'left',
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th
                                            style={{
                                                padding: '12px 16px',
                                                borderBottom:
                                                    '1px solid var(--border-light)',
                                                color: 'var(--text-muted)',
                                                fontWeight: 600,
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            Task Name
                                        </th>
                                        <th
                                            style={{
                                                padding: '12px 16px',
                                                borderBottom:
                                                    '1px solid var(--border-light)',
                                                color: 'var(--text-muted)',
                                                fontWeight: 600,
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            Priority
                                        </th>
                                        <th
                                            style={{
                                                padding: '12px 16px',
                                                borderBottom:
                                                    '1px solid var(--border-light)',
                                                color: 'var(--text-muted)',
                                                fontWeight: 600,
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            Due Date
                                        </th>
                                        <th
                                            style={{
                                                padding: '12px 16px',
                                                borderBottom:
                                                    '1px solid var(--border-light)',
                                                color: 'var(--text-muted)',
                                                fontWeight: 600,
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            Assignee
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topCriticalTasks.map((task, idx) => {
                                         const effectiveDue = task.revised_due_date || task.due_date;
                                         const isOverdue =
                                             effectiveDue &&
                                             new Date(effectiveDue) <
                                                 new Date(
                                                     new Date().toDateString(),
                                                 );
                                        return (
                                            <tr
                                                key={task.id || idx}
                                                style={{
                                                    borderBottom:
                                                        '1px solid var(--border-light)',
                                                }}
                                            >
                                                <td
                                                    style={{
                                                        padding: '16px',
                                                        fontWeight: 600,
                                                        color: 'var(--text-primary)',
                                                    }}
                                                >
                                                    {task.task_name}
                                                    <div
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            color: 'var(--text-muted)',
                                                            marginTop: '4px',
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        {task.project_name}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <span
                                                        style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            background: `${getPriorityColor(task.priority)}15`,
                                                            color: getPriorityColor(
                                                                task.priority,
                                                            ),
                                                        }}
                                                    >
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td
                                                    style={{
                                                        padding: '16px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: isOverdue
                                                            ? 700
                                                            : 500,
                                                        color: isOverdue
                                                            ? '#ff6b6b'
                                                            : 'var(--text-secondary)',
                                                    }}
                                                >
                                                    {task.revised_due_date ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <span style={{ textDecoration: 'line-through', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {new Date(task.due_date).toLocaleDateString()}
                                                            </span>
                                                            <span style={{ fontWeight: 600, color: isOverdue ? '#ff6b6b' : 'var(--text-primary)' }}>
                                                                {new Date(task.revised_due_date).toLocaleDateString()}
                                                                <span style={{ fontSize: '0.65rem', marginLeft: '6px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(255,185,70,0.1)', color: '#ffb946', fontWeight: 700 }}>REVISED</span>
                                                            </span>
                                                        </div>
                                                    ) : task.due_date ? (
                                                        <>
                                                            {new Date(task.due_date).toLocaleDateString()}
                                                            {isOverdue && (
                                                                <span
                                                                    style={{
                                                                        display:
                                                                            'inline-block',
                                                                        marginLeft:
                                                                            '6px',
                                                                        padding:
                                                                            '2px 6px',
                                                                        borderRadius:
                                                                            '4px',
                                                                        background:
                                                                            '#ff6b6b',
                                                                        color: '#fff',
                                                                        fontSize:
                                                                            '0.65rem',
                                                                    }}
                                                                >
                                                                    OVERDUE
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : 'N/A'}
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            gap: '8px',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: '28px',
                                                                height: '28px',
                                                                borderRadius:
                                                                    '50%',
                                                                background:
                                                                    'var(--primary-light)',
                                                                color: 'var(--primary)',
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                justifyContent:
                                                                    'center',
                                                                fontSize:
                                                                    '0.8rem',
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            {task.assignees?.[0]?.username
                                                                ?.charAt(0)
                                                                .toUpperCase() ||
                                                                '?'}
                                                        </div>
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '0.85rem',
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {task.assignees?.length > 0
                                                                ? `${task.assignees[0].username}${task.assignees.length > 1 ? ` +${task.assignees.length - 1}` : ''}`
                                                                : 'Unassigned'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div
                            style={{
                                padding: '40px',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                background: 'var(--bg-body)',
                                borderRadius: '12px',
                            }}
                        >
                            No active critical tasks.
                        </div>
                    )}
                </div>

                {/* Recent Activity Feed */}
                <div
                    style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                    }}
                >
                    <h2
                        style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            margin: '0 0 24px',
                            color: 'var(--text-primary)',
                        }}
                    >
                        Global Activity Feed
                    </h2>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                        }}
                    >
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity, idx) => (
                                <div
                                    key={activity.id || idx}
                                    style={{
                                        display: 'flex',
                                        gap: '16px',
                                        position: 'relative',
                                    }}
                                >
                                    {idx !== recentActivity.length - 1 && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: '19px',
                                                top: '40px',
                                                bottom: '-20px',
                                                width: '2px',
                                                background:
                                                    'var(--border-light)',
                                            }}
                                        ></div>
                                    )}
                                    <div
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background:
                                                activity.type === 'TASK'
                                                    ? 'rgba(123,104,238,0.1)'
                                                    : 'rgba(73,204,249,0.1)',
                                            color:
                                                activity.type === 'TASK'
                                                    ? '#7B68EE'
                                                    : '#49CCF9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            zIndex: 1,
                                        }}
                                    >
                                        {activity.type === 'TASK' ? (
                                            <svg
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line
                                                    x1="16"
                                                    y1="13"
                                                    x2="8"
                                                    y2="13"
                                                />
                                                <line
                                                    x1="16"
                                                    y1="17"
                                                    x2="8"
                                                    y2="17"
                                                />
                                                <polyline points="10 9 9 9 8 9" />
                                            </svg>
                                        ) : (
                                            <svg
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <circle
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            paddingBottom: '4px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                marginBottom: '4px',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                    color: 'var(--text-primary)',
                                                }}
                                            >
                                                {activity.title}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-muted)',
                                                    whiteSpace: 'nowrap',
                                                    marginLeft: '12px',
                                                }}
                                            >
                                                {activity.date.toLocaleDateString(
                                                    [],
                                                    {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    },
                                                )}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '0.85rem',
                                                color: 'var(--text-secondary)',
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {activity.desc}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div
                                style={{
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    padding: '20px',
                                }}
                            >
                                No recent activity found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
