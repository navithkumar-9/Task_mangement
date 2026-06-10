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
    const [dashboardData, setDashboardData] = useState(null);
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
                const res = await API.get('/dashboard/stats/');
                if (res.data.success) {
                    setDashboardData(res.data.data);
                }
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
        return dashboardData.recentActivity.map((act) => ({
            ...act,
            date: new Date(act.date),
        }));
    }, [dashboardData]);

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
            case 'To-do':
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
            <div className="page ext-dashboard-85">
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
            <div className="page-header ext-dashboard-86">
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
            <div className="ext-dashboard-87">
                <div className="ext-dashboard-88">
                    <div className="ext-dashboard-89">
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
                        <div className="ext-dashboard-90">
                            Total Active Tasks
                        </div>
                        <div className="ext-dashboard-91">
                            {headerMetrics.totalActive}
                        </div>
                    </div>
                </div>

                <div className="ext-dashboard-88">
                    <div className="ext-dashboard-92">
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
                        <div className="ext-dashboard-90">
                            Overdue Tasks
                        </div>
                        <div className="ext-dashboard-93">
                            {headerMetrics.overdue}
                        </div>
                    </div>
                </div>

                <div className="ext-dashboard-88">
                    <div className="ext-dashboard-94">
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
                    <div className="ext-dashboard-95">
                        <div className="ext-dashboard-90">
                            Project Progress
                        </div>
                        <div className="ext-dashboard-96">
                            <div className="ext-dashboard-91">
                                {headerMetrics.progress}%
                            </div>
                        </div>
                        <div className="ext-dashboard-97">
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
            <div className="ext-dashboard-98">
                {/* Workload per Person (Bar Chart) */}
                <div className="ext-dashboard-99">
                    <h2 className="ext-dashboard-100">
                        Workload Distribution (Global)
                    </h2>
                    <div className="ext-dashboard-101">
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
                            <div className="ext-dashboard-102">
                                No workload data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Tasks by Current Status (Pie Chart) */}
                <div className="ext-dashboard-99">
                    <h2 className="ext-dashboard-100">
                        Tasks by Status
                    </h2>
                    <div className="ext-dashboard-103">
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
                            <div className="ext-dashboard-102">
                                No status data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Actionable Detail */}
            <div className="ext-dashboard-104">
                {/* Top 5 Critical/Urgent Tasks */}
                <div className="ext-dashboard-99">
                    <div className="ext-dashboard-105">
                        <h2 className="ext-dashboard-106">
                            Top 5 Critical Tasks (Global)
                        </h2>
                        <Link to="/tasks-progress" className="ext-dashboard-107">
                            View All
                        </Link>
                    </div>

                    {topCriticalTasks.length > 0 ? (
                        <div className="ext-dashboard-108">
                            <table className="ext-dashboard-109">
                                <thead>
                                    <tr>
                                        <th className="ext-dashboard-110">
                                            Task Name
                                        </th>
                                        <th className="ext-dashboard-110">
                                            Priority
                                        </th>
                                        <th className="ext-dashboard-110">
                                            Due Date
                                        </th>
                                        <th className="ext-dashboard-110">
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
                                            <tr key={task.id || idx} className="ext-dashboard-111">
                                                <td className="ext-dashboard-112">
                                                    {task.task_name}
                                                    <div className="ext-dashboard-113">
                                                        {task.project_name}
                                                    </div>
                                                </td>
                                                <td className="ext-dashboard-114">
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
                                                        <div className="ext-dashboard-115">
                                                            <span className="ext-dashboard-116">
                                                                {new Date(task.due_date).toLocaleDateString()}
                                                            </span>
                                                            <span style={{ fontWeight: 600, color: isOverdue ? '#ff6b6b' : 'var(--text-primary)' }}>
                                                                {new Date(task.revised_due_date).toLocaleDateString()}
                                                                <span className="ext-dashboard-117">REVISED</span>
                                                            </span>
                                                        </div>
                                                    ) : task.due_date ? (
                                                        <>
                                                            {new Date(task.due_date).toLocaleDateString()}
                                                            {isOverdue && (
                                                                <span className="ext-dashboard-118">
                                                                    OVERDUE
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : 'N/A'}
                                                </td>
                                                <td className="ext-dashboard-114">
                                                    <div className="ext-announcements-14">
                                                        <div className="ext-dashboard-119">
                                                            {task.assignees?.[0]?.username
                                                                ?.charAt(0)
                                                                .toUpperCase() ||
                                                                '?'}
                                                        </div>
                                                        <span className="ext-dashboard-120">
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
                        <div className="ext-dashboard-121">
                            No active critical tasks.
                        </div>
                    )}
                </div>

                {/* Recent Activity Feed */}
                <div className="ext-dashboard-99">
                    <h2 className="ext-dashboard-100">
                        Global Activity Feed
                    </h2>

                    <div className="ext-dashboard-122">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity, idx) => (
                                <div key={activity.id || idx} className="ext-dashboard-123">
                                    {idx !== recentActivity.length - 1 && (
                                        <div className="ext-dashboard-124"></div>
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
                                    <div className="ext-dashboard-125">
                                        <div className="ext-dashboard-126">
                                            <div className="ext-dashboard-127">
                                                {activity.title}
                                            </div>
                                            <div className="ext-dashboard-128">
                                                {activity.date.toLocaleDateString(
                                                    [],
                                                    {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    },
                                                )}
                                            </div>
                                        </div>
                                        <div className="ext-dashboard-129">
                                            {activity.desc}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="ext-dashboard-130">
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
