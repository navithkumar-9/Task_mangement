import { useEffect, useMemo, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

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
    PENDING: { bg: 'rgba(73,204,249,0.1)', color: '#49CCF9', label: 'To-do' },
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
        <div className="ext-calendar-39" onClick={onClose}>
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
                {/* Header */}
                <div className="ext-calendar-41">
                    <div>
                        <h2 className="ext-calendar-42">
                            Tasks Due
                        </h2>
                        <p className="ext-calendar-43">
                            {dateStr}
                        </p>
                    </div>
                    <button onClick={onClose} className="ext-calendar-44">
                        &times;
                    </button>
                </div>

                {/* Tasks List */}
                <div className="ext-calendar-45">
                    {tasks.map((task) => {
                        const pStyle =
                            priorityColors[task.priority] ||
                            priorityColors.MEDIUM;
                        const sStyle =
                            statusColors[task.status] || statusColors.PENDING;
                        const effectiveDue = task.revised_due_date || task.due_date;
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
                                    transition: 'transform 0.15s',
                                }}
                            >
                                <div className="ext-calendar-46">
                                    <h3 className="ext-calendar-47">
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
                                            letterSpacing: '0.3px',
                                        }}
                                    >
                                        {task.priority}
                                    </span>
                                </div>

                                <div className="ext-calendar-48">
                                    <p className="ext-calendar-49">
                                        {task.project_name}
                                    </p>
                                    {task.revised_due_date && (
                                        <span className="ext-calendar-50">
                                            <span className="ext-calendar-51">{new Date(task.due_date).toLocaleDateString()}</span>
                                            &rarr;
                                            <span>{new Date(task.revised_due_date).toLocaleDateString()} (Revised)</span>
                                        </span>
                                    )}
                                </div>

                                {task.description && (
                                    <p className="ext-calendar-52">
                                        {task.description}
                                    </p>
                                )}

                                <div className="ext-calendar-53">
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

                                    {task.assignees && task.assignees.length > 0 && (
                                        <span className="ext-calendar-54">
                                            @{task.assignees.map(a => a.username).join(', ')}
                                        </span>
                                    )}

                                    {isOverdue && (
                                        <span className="ext-calendar-55">
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
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

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
    }, [currentMonth, currentYear]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const formatDateStr = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            const startStr = formatDateStr(new Date(currentYear, currentMonth - 1, 1));
            const endStr = formatDateStr(new Date(currentYear, currentMonth + 2, 0));

            const baseEndpoint = isAdmin
                ? '/tasks/admin/'
                : '/tasks/my-tasks/';
            const endpoint = `${baseEndpoint}?page_size=500&start_date=${startStr}&end_date=${endStr}`;
            const res = await API.get(endpoint);

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
            if (t.assignees) t.assignees.forEach(a => { if (a.username) names.add(a.username); });
        });
        return Array.from(names).sort();
    }, [tasks]);

    // Filter tasks by selected member
    const filteredTasks = useMemo(() => {
        if (!memberFilter) return tasks;
        return tasks.filter(
            (t) => t.assignees?.some(a => a.username?.toLowerCase() === memberFilter.toLowerCase()),
        );
    }, [tasks, memberFilter]);

    // Group tasks by revised_due_date or due_date
    const tasksByDate = useMemo(() => {
        const map = {};
        filteredTasks.forEach((task) => {
            const activeDate = task.revised_due_date || task.due_date;
            if (activeDate) {
                const key = activeDate; // "YYYY-MM-DD"
                if (!map[key]) map[key] = [];
                map[key].push(task);
            }
        });
        return map;
    }, [filteredTasks]);

    // Calendar grid calculation
    const calendarDays = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startPad = firstDay.getDay();
        const totalDays = lastDay.getDate();

        // Previous month days for padding
        const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();

        const days = [];

        // Previous month padding
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

        // Current month
        for (let d = 1; d <= totalDays; d++) {
            days.push({
                day: d,
                isCurrentMonth: true,
                date: new Date(currentYear, currentMonth, d),
            });
        }

        // Next month padding (fill to 42 cells = 6 rows)
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

    // Count stats
    const stats = useMemo(() => {
        const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const monthTasks = filteredTasks.filter((t) => {
            const activeDate = t.revised_due_date || t.due_date;
            return activeDate && activeDate.startsWith(monthStr);
        });
        const overdue = monthTasks.filter((t) => {
            const activeDate = t.revised_due_date || t.due_date;
            return t.status !== 'COMPLETED' && activeDate && parseLocalDate(activeDate) < getTodayLocal();
        });
        const completed = monthTasks.filter((t) => t.status === 'COMPLETED');
        const upcoming = monthTasks.filter((t) => {
            const activeDate = t.revised_due_date || t.due_date;
            return t.status !== 'COMPLETED' && activeDate && parseLocalDate(activeDate) >= getTodayLocal();
        });
        return {
            total: monthTasks.length,
            overdue: overdue.length,
            completed: completed.length,
            upcoming: upcoming.length,
        };
    }, [filteredTasks, currentMonth, currentYear]);

    const navigateMonth = (dir) => {
        let newMonth = currentMonth + dir;
        let newYear = currentYear;
        if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        } else if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };

    const goToToday = () => {
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
    };

    const handleDayClick = (dateObj) => {
        const key = `${dateObj.date.getFullYear()}-${String(dateObj.date.getMonth() + 1).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
        // Build the correct date key based on the actual date object
        const y = dateObj.date.getFullYear();
        const m = String(dateObj.date.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.date.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;
        const dayTasks = tasksByDate[dateKey] || [];
        if (dayTasks.length > 0) {
            setSelectedDate(dateObj.date);
            setSelectedTasks(dayTasks);
        }
    };

    const isToday = (dateObj) => {
        return (
            dateObj.date.getDate() === today.getDate() &&
            dateObj.date.getMonth() === today.getMonth() &&
            dateObj.date.getFullYear() === today.getFullYear()
        );
    };

    const getDateKey = (dateObj) => {
        const y = dateObj.date.getFullYear();
        const m = String(dateObj.date.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    return (
        <div className="page ext-calendar-56">
            {/* Header */}
            <div className="page-header ext-calendar-57">
                <div>
                    <h1 className="page-title">Calendar</h1>
                    <p className="page-subtitle">
                        Track task deadlines and milestones
                    </p>
                </div>
                {isAdmin && teamMembers.length > 0 && (
                    <div className="ext-announcements-14">
                        <label className="ext-announcements-26">
                            Team Member:
                        </label>
                        <select
                            value={memberFilter}
                            onChange={(e) => setMemberFilter(e.target.value)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                fontSize: '0.88rem',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                background: '#fff',
                                cursor: 'pointer',
                                outline: 'none',
                                minWidth: '180px',
                            }}
                        >
                            <option value="">All Members</option>
                            {teamMembers.map((name) => (
                                <option key={name} value={name}>
                                    @{name}
                                </option>
                            ))}
                        </select>
                        {memberFilter && (
                            <button
                                onClick={() => setMemberFilter('')}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                {[
                    {
                        label: 'Total Deadlines',
                        value: stats.total,
                        color: '#49CCF9',
                        bg: 'rgba(73,204,249,0.08)',
                        icon: '📋',
                        statClass: 'stat-blue',
                    },
                    {
                        label: 'Upcoming',
                        value: stats.upcoming,
                        color: '#7B68EE',
                        bg: 'rgba(123,104,238,0.08)',
                        icon: '🔜',
                        statClass: 'stat-purple',
                    },
                    {
                        label: 'Completed',
                        value: stats.completed,
                        color: '#4bcf82',
                        bg: 'rgba(75,207,130,0.08)',
                        icon: '✅',
                        statClass: 'stat-green',
                    },
                    {
                        label: 'Overdue',
                        value: stats.overdue,
                        color: '#ff6b6b',
                        bg: 'rgba(255,107,107,0.08)',
                        icon: '⚠️',
                        statClass: 'stat-amber',
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className={`stat-card ${stat.statClass}`}
                    >
                        <div
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: stat.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.1rem',
                                flexShrink: 0,
                            }}
                        >
                            {stat.icon}
                        </div>
                        <div className="stat-info">
                            <div
                                className="stat-value"
                                style={{
                                    color: stat.color,
                                    fontSize: '1.4rem',
                                }}
                            >
                                {stat.value}
                            </div>
                            <div className="stat-label">
                                {stat.label}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Calendar Card */}
            <div className="content-card ext-calendar-60">
                {/* Month Navigation */}
                <div className="ext-calendar-61">
                    <div className="ext-announcements-14">
                        <button
                            onClick={() => navigateMonth(-1)}
                            className="calendar-nav-btn"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>

                        <h2 className="ext-calendar-62">
                            {MONTHS[currentMonth]} {currentYear}
                        </h2>

                        <button
                            onClick={() => navigateMonth(1)}
                            className="calendar-nav-btn"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>

                    <button onClick={goToToday} className="btn-primary ext-calendar-63">
                        Today
                    </button>
                </div>

                {/* Legend */}
                <div className="ext-calendar-64">
                    <span className="ext-calendar-65">
                        PRIORITY:
                    </span>
                    {[
                        { label: 'High', color: '#ff6b6b' },
                        { label: 'Medium', color: '#ffb946' },
                        { label: 'Low', color: '#4bcf82' },
                    ].map((item) => (
                        <div key={item.label} className="ext-calendar-66">
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: item.color,
                                }}
                            />
                            <span className="ext-calendar-67">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>

                {loading ? (
                        <div className="page-loader ext-calendar-68">
                            <div className="page-loader-spinner"></div>
                            <div className="page-loader-text">Loading calendar...</div>
                        </div>
                    ) : (
                    <div className="ext-calendar-69">
                        {/* Day Headers */}
                        <div className="ext-calendar-70">
                            {DAYS.map((day) => (
                                <div key={day} className="ext-calendar-71">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="ext-calendar-72">
                            {calendarDays.map((dayObj, idx) => {
                                const dateKey = getDateKey(dayObj);
                                const dayTasks = tasksByDate[dateKey] || [];
                                const hasTasks = dayTasks.length > 0;
                                const todayClass = isToday(dayObj);

                                // Get highest priority for the dot color
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
                                        parseLocalDate(t.revised_due_date || t.due_date) <
                                            getTodayLocal(),
                                );

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleDayClick(dayObj)}
                                        className={`calendar-cell ${!dayObj.isCurrentMonth ? 'calendar-cell-other-month' : ''} ${todayClass ? 'calendar-cell-today' : ''} ${hasTasks && !todayClass ? 'calendar-cell-has-tasks' : ''}`}
                                    >
                                        {/* Day Number */}
                                        <div className="calendar-cell-day-num">
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

                                        {/* Task Pills */}
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
                                                    parseLocalDate(task.revised_due_date || task.due_date) <
                                                        getTodayLocal();

                                                return (
                                                    <div
                                                        key={task.id || tIdx}
                                                        className="calendar-pill"
                                                        style={{
                                                            color: taskOverdue
                                                                ? '#ff6b6b'
                                                                : pColor.color,
                                                            background:
                                                                taskOverdue
                                                                    ? 'rgba(255,107,107,0.1)'
                                                                    : pColor.bg,
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
                                            <div className="ext-calendar-73">
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

            {/* Upcoming Deadlines List */}
            <div className="content-card ext-calendar-74">
                <div className="content-card-title ext-calendar-75">
                    Upcoming Deadlines
                </div>
                <div className="ext-calendar-76">
                    {filteredTasks
                        .filter(
                            (t) =>
                                t.status !== 'COMPLETED' &&
                                (t.revised_due_date || t.due_date) &&
                                parseLocalDate(t.revised_due_date || t.due_date) >=
                                    getTodayLocal(),
                        )
                        .sort(
                            (a, b) =>
                                parseLocalDate(a.revised_due_date || a.due_date) - parseLocalDate(b.revised_due_date || b.due_date),
                        )
                        .slice(0, 8)
                        .map((task) => {
                            const pStyle =
                                priorityColors[task.priority] ||
                                priorityColors.MEDIUM;
                            const sStyle =
                                statusColors[task.status] ||
                                statusColors.PENDING;
                            const dueDate = parseLocalDate(task.revised_due_date || task.due_date);
                            const diffDays = Math.round(
                                (dueDate - getTodayLocal()) /
                                    (1000 * 60 * 60 * 24),
                            );

                            return (
                                <div key={task.id} className="ext-calendar-77">
                                    <div className="ext-calendar-78">
                                        <div
                                            style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: pStyle.color,
                                                flexShrink: 0,
                                            }}
                                        />
                                        <div className="ext-calendar-79">
                                            <div className="ext-calendar-80">
                                                {task.task_name}
                                            </div>
                                            <div className="ext-calendar-81">
                                                {task.project_name}
                                                {task.assignees && task.assignees.length > 0 &&
                                                    ` • @${task.assignees.map(a => a.username).join(', ')}`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ext-calendar-82">
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
                        <div className="ext-calendar-83">
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
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    );
};

export default Calendar;
