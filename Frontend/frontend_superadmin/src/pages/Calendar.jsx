import { useEffect, useMemo, useState } from 'react';
import API from '../api/axios';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const priorityColors = {
    HIGH: {
        bg: 'rgba(255,107,107,0.12)',
        color: '#ff6b6b',
        border: 'rgba(255,107,107,0.3)',
    },
    MEDIUM: {
        bg: 'rgba(255,185,70,0.12)',
        color: '#ffb946',
        border: 'rgba(255,185,70,0.3)',
    },
    LOW: {
        bg: 'rgba(75,207,130,0.12)',
        color: '#4bcf82',
        border: 'rgba(75,207,130,0.3)',
    },
};

const statusColors = {
    PENDING: { bg: 'rgba(73,204,249,0.1)', color: '#49CCF9', label: 'Pending' },
    IN_PROGRESS: {
        bg: 'rgba(255,185,70,0.1)',
        color: '#ffb946',
        label: 'In Progress',
    },
    HOLD: { bg: 'rgba(255,107,107,0.1)', color: '#ff6b6b', label: 'Hold' },
    IN_REVIEW: {
        bg: 'rgba(123,104,238,0.1)',
        color: '#7B68EE',
        label: 'In Review',
    },
    COMPLETED: {
        bg: 'rgba(75,207,130,0.1)',
        color: '#4bcf82',
        label: 'Completed',
    },
};

// Helper to parse YYYY-MM-DD to a local Date at midnight
const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
};

// Helper to get today's local Date at midnight
const getTodayLocal = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
};

/* ─── Task Detail Modal ─── */
const TaskDetailModal = ({ tasks, date, onClose }) => {
    if (!tasks || tasks.length === 0) return null;

    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="ext-calendar-36" onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    width: '520px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    animation: 'slideUp 0.25s ease-out',
                }}
            >
                <div className="ext-calendar-38">
                    <div>
                        <h2 className="ext-calendar-39">
                            Tasks Due
                        </h2>
                        <p className="ext-calendar-40">
                            {dateStr}
                        </p>
                    </div>
                    <button onClick={onClose} className="ext-calendar-41">
                        &times;
                    </button>
                </div>
                <div className="ext-calendar-42">
                    {tasks.map((task) => {
                        const pStyle =
                            priorityColors[task.priority] ||
                            priorityColors.MEDIUM;
                        const sStyle =
                            statusColors[task.status] || statusColors.PENDING;
                        const effectiveDue =
                            task.revised_due_date || task.due_date;
                        const isOverdue =
                            task.status !== 'COMPLETED' &&
                            effectiveDue &&
                            parseLocalDate(effectiveDue) < getTodayLocal();

                        return (
                            <div
                                key={task.id}
                                style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: `1px solid ${pStyle.border}`,
                                    background: pStyle.bg,
                                    marginBottom: '12px',
                                }}
                            >
                                <div className="ext-calendar-43">
                                    <h3 className="ext-calendar-44">
                                        {task.task_name}
                                    </h3>
                                    <span
                                        style={{
                                            padding: '3px 10px',
                                            borderRadius: '20px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            background: pStyle.bg,
                                            color: pStyle.color,
                                            border: `1px solid ${pStyle.border}`,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {task.priority}
                                    </span>
                                </div>
                                <div className="ext-calendar-45">
                                    <p className="ext-calendar-46">
                                        {task.project_name}
                                    </p>
                                    {task.revised_due_date && (
                                        <span className="ext-calendar-47">
                                            <span className="ext-calendar-48">
                                                {new Date(
                                                    task.due_date,
                                                ).toLocaleDateString()}
                                            </span>
                                            &rarr;
                                            <span>
                                                {new Date(
                                                    task.revised_due_date,
                                                ).toLocaleDateString()}{' '}
                                                (Revised)
                                            </span>
                                        </span>
                                    )}
                                </div>
                                {task.description && (
                                    <p className="ext-calendar-49">
                                        {task.description}
                                    </p>
                                )}
                                <div className="ext-calendar-50">
                                    <span
                                        style={{
                                            padding: '3px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            background: sStyle.bg,
                                            color: sStyle.color,
                                        }}
                                    >
                                        {sStyle.label}
                                    </span>
                                    {task.assignees &&
                                        task.assignees.length > 0 && (
                                            <span className="ext-calendar-51">
                                                @
                                                {task.assignees
                                                    .map((a) => a.username)
                                                    .join(', ')}
                                            </span>
                                        )}
                                    {task.assigned_by && (
                                        <span className="ext-calendar-52">
                                            by @{task.assigned_by.username}
                                        </span>
                                    )}
                                    {isOverdue && (
                                        <span className="ext-calendar-53">
                                            OVERDUE
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/* ─── Main Calendar Component ─── */
const Calendar = () => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [memberFilter, setMemberFilter] = useState('');

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await API.get('/tasks/progress/?page_size=500');
            let items = [];
            if (res.data.results && res.data.results.data)
                items = res.data.results.data;
            else if (res.data.data) items = res.data.data;
            else if (res.data.results) items = res.data.results;
            else items = res.data;
            setTasks(Array.isArray(items) ? items : []);
        } catch (err) {
            console.error('Failed to fetch tasks', err);
        } finally {
            setLoading(false);
        }
    };

    // Extract unique team member names for filter
    const teamMembers = useMemo(() => {
        const names = new Set();
        tasks.forEach((t) => {
            if (t.assignees)
                t.assignees.forEach((a) => {
                    if (a.username) names.add(a.username);
                });
        });
        return Array.from(names).sort();
    }, [tasks]);

    // Filter tasks by selected member
    const filteredTasks = useMemo(() => {
        if (!memberFilter) return tasks;
        return tasks.filter((t) =>
            t.assignees?.some(
                (a) => a.username?.toLowerCase() === memberFilter.toLowerCase(),
            ),
        );
    }, [tasks, memberFilter]);

    // Group tasks by revised_due_date or due_date
    const tasksByDate = useMemo(() => {
        const map = {};
        filteredTasks.forEach((task) => {
            const activeDate = task.revised_due_date || task.due_date;
            if (activeDate) {
                const key = activeDate;
                if (!map[key]) map[key] = [];
                map[key].push(task);
            }
        });
        return map;
    }, [filteredTasks]);

    // Calendar grid
    const calendarDays = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startPad = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();
        const days = [];
        for (let i = startPad - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLast - i,
                isCurrentMonth: false,
                date: new Date(
                    currentYear,
                    currentMonth - 1,
                    prevMonthLast - i,
                ),
            });
        }
        for (let d = 1; d <= totalDays; d++) {
            days.push({
                day: d,
                isCurrentMonth: true,
                date: new Date(currentYear, currentMonth, d),
            });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(currentYear, currentMonth + 1, i),
            });
        }
        return days;
    }, [currentMonth, currentYear]);

    // Stats
    const stats = useMemo(() => {
        const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const monthTasks = filteredTasks.filter((t) => {
            const activeDate = t.revised_due_date || t.due_date;
            return activeDate && activeDate.startsWith(monthStr);
        });
        const overdue = monthTasks.filter((t) => {
            const activeDate = t.revised_due_date || t.due_date;
            return (
                t.status !== 'COMPLETED' &&
                activeDate &&
                parseLocalDate(activeDate) < getTodayLocal()
            );
        });
        const completed = monthTasks.filter((t) => t.status === 'COMPLETED');
        const upcoming = monthTasks.filter((t) => {
            const activeDate = t.revised_due_date || t.due_date;
            return (
                t.status !== 'COMPLETED' &&
                activeDate &&
                parseLocalDate(activeDate) >= getTodayLocal()
            );
        });
        return {
            total: monthTasks.length,
            overdue: overdue.length,
            completed: completed.length,
            upcoming: upcoming.length,
        };
    }, [filteredTasks, currentMonth, currentYear]);

    const navigateMonth = (dir) => {
        let m = currentMonth + dir,
            y = currentYear;
        if (m > 11) {
            m = 0;
            y++;
        } else if (m < 0) {
            m = 11;
            y--;
        }
        setCurrentMonth(m);
        setCurrentYear(y);
    };

    const goToToday = () => {
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
    };

    const getDateKey = (d) => {
        const y = d.date.getFullYear(),
            m = String(d.date.getMonth() + 1).padStart(2, '0'),
            dd = String(d.date.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    };

    const handleDayClick = (dayObj) => {
        const dateKey = getDateKey(dayObj);
        const dayTasks = tasksByDate[dateKey] || [];
        if (dayTasks.length > 0) {
            setSelectedDate(dayObj.date);
            setSelectedTasks(dayTasks);
        }
    };

    const isToday = (d) =>
        d.date.getDate() === today.getDate() &&
        d.date.getMonth() === today.getMonth() &&
        d.date.getFullYear() === today.getFullYear();

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Calendar</h1>
                    <p className="page-subtitle">
                        Track all task deadlines across the organization
                    </p>
                </div>
            </div>

            {teamMembers.length > 0 && (
                <div className="filter-bar" style={{ marginBottom: '24px', background: 'var(--bg-white)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                    <div className="filter-group">
                        <label className="form-label">Team Member</label>
                        <select
                            value={memberFilter}
                            onChange={(e) => setMemberFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Members</option>
                            {teamMembers.map((name) => (
                                <option key={name} value={name}>
                                    @{name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {memberFilter && (
                        <button
                            onClick={() => setMemberFilter('')}
                            className="btn-clear-filter"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Clear
                        </button>
                    )}
                </div>
            )}

            {/* Stats Cards */}
            <div className="ext-calendar-57">
                {[
                    {
                        label: 'Total Deadlines',
                        value: stats.total,
                        color: '#49CCF9',
                        bg: 'rgba(73,204,249,0.08)',
                        icon: '📋',
                    },
                    {
                        label: 'Upcoming',
                        value: stats.upcoming,
                        color: '#7B68EE',
                        bg: 'rgba(123,104,238,0.08)',
                        icon: '🔜',
                    },
                    {
                        label: 'Completed',
                        value: stats.completed,
                        color: '#4bcf82',
                        bg: 'rgba(75,207,130,0.08)',
                        icon: '✅',
                    },
                    {
                        label: 'Overdue',
                        value: stats.overdue,
                        color: '#ff6b6b',
                        bg: 'rgba(255,107,107,0.08)',
                        icon: '⚠️',
                    },
                ].map((stat) => (
                    <div key={stat.label} className="ext-calendar-58">
                        <div
                            style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '10px',
                                background: stat.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                flexShrink: 0,
                            }}
                        >
                            {stat.icon}
                        </div>
                        <div>
                            <div
                                style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    color: stat.color,
                                    lineHeight: 1,
                                }}
                            >
                                {stat.value}
                            </div>
                            <div className="ext-calendar-59">
                                {stat.label}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Calendar Card */}
            <div className="ext-calendar-60">
                {/* Month Nav */}
                <div className="ext-calendar-38">
                    <div className="ext-calendar-61">
                        <button
                            onClick={() => navigateMonth(-1)}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <h2 className="ext-calendar-63">
                            {MONTHS[currentMonth]} {currentYear}
                        </h2>
                        <button
                            onClick={() => navigateMonth(1)}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                    <button onClick={goToToday} className="btn-primary">
                        Today
                    </button>
                </div>

                {/* Legend */}
                <div className="ext-calendar-65">
                    <span className="ext-calendar-66">
                        PRIORITY:
                    </span>
                    {[
                        { label: 'High', color: '#ff6b6b' },
                        { label: 'Medium', color: '#ffb946' },
                        { label: 'Low', color: '#4bcf82' },
                    ].map((item) => (
                        <div key={item.label} className="ext-calendar-67">
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: item.color,
                                }}
                            />
                            <span className="ext-calendar-68">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>

                {loading ? (
                        <div className="page-loader ext-calendar-69">
                            <div className="page-loader-spinner"></div>
                            <div className="page-loader-text">Loading calendar...</div>
                        </div>
                    ) : (
                    <div className="ext-calendar-70">
                        {/* Day Headers */}
                        <div className="ext-calendar-71">
                            {DAYS.map((day) => (
                                <div key={day} className="ext-calendar-72">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="ext-calendar-73">
                            {calendarDays.map((dayObj, idx) => {
                                const dateKey = getDateKey(dayObj);
                                const dayTasks = tasksByDate[dateKey] || [];
                                const hasTasks = dayTasks.length > 0;
                                const todayClass = isToday(dayObj);
                                const highestPriority = dayTasks.reduce(
                                    (acc, t) => {
                                        if (t.priority === 'HIGH')
                                            return 'HIGH';
                                        if (
                                            t.priority === 'MEDIUM' &&
                                            acc !== 'HIGH'
                                        )
                                            return 'MEDIUM';
                                        return acc || 'LOW';
                                    },
                                    null,
                                );
                                const hasOverdue = dayTasks.some(
                                    (t) =>
                                        t.status !== 'COMPLETED' &&
                                        parseLocalDate(
                                            t.revised_due_date || t.due_date,
                                        ) < getTodayLocal(),
                                );

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleDayClick(dayObj)}
                                        style={{
                                            minHeight: '90px',
                                            padding: '8px',
                                            borderRadius: '10px',
                                            border: todayClass
                                                ? '2px solid var(--primary)'
                                                : '1px solid var(--border-light)',
                                            background: todayClass
                                                ? 'var(--primary-light)'
                                                : hasTasks
                                                  ? '#fafbfc'
                                                  : '#fff',
                                            opacity: dayObj.isCurrentMonth
                                                ? 1
                                                : 0.4,
                                            cursor: hasTasks
                                                ? 'pointer'
                                                : 'default',
                                            transition: 'all 0.15s ease',
                                            position: 'relative',
                                            ...(hasTasks && {
                                                boxShadow:
                                                    '0 1px 3px rgba(0,0,0,0.04)',
                                            }),
                                        }}
                                        onMouseEnter={(e) => {
                                            if (hasTasks) {
                                                e.currentTarget.style.transform =
                                                    'translateY(-1px)';
                                                e.currentTarget.style.boxShadow =
                                                    '0 4px 12px rgba(0,0,0,0.08)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform =
                                                'none';
                                            e.currentTarget.style.boxShadow =
                                                hasTasks
                                                    ? '0 1px 3px rgba(0,0,0,0.04)'
                                                    : 'none';
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.82rem',
                                                fontWeight: todayClass
                                                    ? 700
                                                    : 500,
                                                color: todayClass
                                                    ? 'var(--primary)'
                                                    : dayObj.isCurrentMonth
                                                      ? 'var(--text-primary)'
                                                      : 'var(--text-muted)',
                                                marginBottom: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <span>{dayObj.day}</span>
                                            {hasTasks && (
                                                <span
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        color: '#fff',
                                                        background: hasOverdue
                                                            ? '#ff6b6b'
                                                            : priorityColors[
                                                                  highestPriority
                                                              ]?.color ||
                                                              'var(--primary)',
                                                        borderRadius: '10px',
                                                        padding: '1px 6px',
                                                        lineHeight: '1.3',
                                                    }}
                                                >
                                                    {dayTasks.length}
                                                </span>
                                            )}
                                        </div>
                                        {dayTasks
                                            .slice(0, 3)
                                            .map((task, tIdx) => {
                                                const pColor =
                                                    priorityColors[
                                                        task.priority
                                                    ] || priorityColors.MEDIUM;
                                                const taskOverdue =
                                                    task.status !==
                                                        'COMPLETED' &&
                                                    parseLocalDate(
                                                        task.revised_due_date ||
                                                            task.due_date,
                                                    ) < getTodayLocal();
                                                return (
                                                    <div
                                                        key={task.id || tIdx}
                                                        style={{
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.65rem',
                                                            fontWeight: 600,
                                                            color: taskOverdue
                                                                ? '#ff6b6b'
                                                                : pColor.color,
                                                            background:
                                                                taskOverdue
                                                                    ? 'rgba(255,107,107,0.1)'
                                                                    : pColor.bg,
                                                            marginBottom: '2px',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            maxWidth: '100%',
                                                            boxSizing: 'border-box',
                                                            borderLeft: `2px solid ${taskOverdue ? '#ff6b6b' : pColor.color}`,
                                                            textDecoration:
                                                                task.status ===
                                                                'COMPLETED'
                                                                    ? 'line-through'
                                                                    : 'none',
                                                            opacity:
                                                                task.status ===
                                                                'COMPLETED'
                                                                    ? 0.6
                                                                    : 1,
                                                        }}
                                                    >
                                                        {task.task_name}
                                                    </div>
                                                );
                                            })}
                                        {dayTasks.length > 3 && (
                                            <div className="ext-calendar-74">
                                                +{dayTasks.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Upcoming Deadlines */}
            <div className="ext-calendar-75">
                <div className="ext-calendar-76">
                    Upcoming Deadlines
                </div>
                <div className="ext-calendar-77">
                    {filteredTasks
                        .filter(
                            (t) =>
                                t.status !== 'COMPLETED' &&
                                (t.revised_due_date || t.due_date) &&
                                parseLocalDate(
                                    t.revised_due_date || t.due_date,
                                ) >= getTodayLocal(),
                        )
                        .sort(
                            (a, b) =>
                                parseLocalDate(
                                    a.revised_due_date || a.due_date,
                                ) -
                                parseLocalDate(
                                    b.revised_due_date || b.due_date,
                                ),
                        )
                        .slice(0, 8)
                        .map((task) => {
                            const pStyle =
                                priorityColors[task.priority] ||
                                priorityColors.MEDIUM;
                            const sStyle =
                                statusColors[task.status] ||
                                statusColors.PENDING;
                            const dueDate = parseLocalDate(
                                task.revised_due_date || task.due_date,
                            );
                            const diffDays = Math.round(
                                (dueDate - getTodayLocal()) /
                                    (1000 * 60 * 60 * 24),
                            );
                            return (
                                <div key={task.id} className="ext-calendar-78">
                                    <div className="ext-calendar-79">
                                        <div
                                            style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: pStyle.color,
                                                flexShrink: 0,
                                            }}
                                        />
                                        <div className="ext-calendar-80">
                                            <div className="ext-calendar-81">
                                                {task.task_name}
                                            </div>
                                            <div className="ext-calendar-82">
                                                {task.project_name}
                                                {task.assignees &&
                                                    task.assignees.length > 0 &&
                                                    ` • @${task.assignees.map((a) => a.username).join(', ')}`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ext-calendar-83">
                                        <span
                                            style={{
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                background: sStyle.bg,
                                                color: sStyle.color,
                                            }}
                                        >
                                            {sStyle.label}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                                color:
                                                    diffDays <= 1
                                                        ? '#ff6b6b'
                                                        : diffDays <= 3
                                                          ? '#ffb946'
                                                          : 'var(--text-muted)',
                                                minWidth: '80px',
                                                textAlign: 'right',
                                            }}
                                        >
                                            {diffDays === 0
                                                ? 'Today'
                                                : diffDays === 1
                                                  ? 'Tomorrow'
                                                  : `${diffDays} days left`}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    {filteredTasks.filter(
                        (t) =>
                            t.status !== 'COMPLETED' &&
                            (t.revised_due_date || t.due_date) &&
                            parseLocalDate(t.revised_due_date || t.due_date) >=
                                getTodayLocal(),
                    ).length === 0 && (
                        <div className="ext-calendar-84">
                            No upcoming deadlines
                        </div>
                    )}
                </div>
            </div>

            {/* Task Detail Modal */}
            {selectedDate && selectedTasks.length > 0 && (
                <TaskDetailModal
                    tasks={selectedTasks}
                    date={selectedDate}
                    onClose={() => {    
                        setSelectedDate(null);
                        setSelectedTasks([]);
                    }}
                />
            )}

            <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
};

export default Calendar;
