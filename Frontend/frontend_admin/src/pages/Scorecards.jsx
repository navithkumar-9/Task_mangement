import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const ScorecardInfoTooltip = () => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', cursor: 'help' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            
            {isHovered && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    marginTop: '8px',
                    width: '320px',
                    background: 'var(--card-bg, #fff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    fontSize: '13px',
                    color: 'var(--text-color)'
                }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Scorecard Calculation</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <li><strong>Performance (35%):</strong> Quality score (out of 5) assigned by admin, scaled to 100.</li>
                        <li><strong>Completion (25%):</strong> Task completion rate (completed vs total tasks).</li>
                        <li><strong>Discipline (25%):</strong> Average of Attendance score (out of 5) and Timesheet Compliance (logged hours vs expected).</li>
                        <li><strong>Learning (15%):</strong> Learning rate score (out of 5) assigned by admin.</li>
                    </ul>
                </div>
            )}
        </div>
    );
};


const Scorecards = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    // Global filters
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    });

    // States
    const [loading, setLoading] = useState(true);
    const [scorecards, setScorecards] = useState([]);
    const [teamAverage, setTeamAverage] = useState(0);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [drilldownData, setDrilldownData] = useState(null);
    const [activeTab, setActiveTab] = useState('eval'); // 'eval' | 'history' | 'tasks'

    // Form inputs for grading
    const [qualityScore, setQualityScore] = useState(0);
    const [attendanceScore, setAttendanceScore] = useState(0);
    const [learningRateScore, setLearningRateScore] = useState(0);
    const [adminComments, setAdminComments] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Team member view states
    const [memberData, setMemberData] = useState(null);

    // Fetch data based on role
    const fetchData = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            if (isAdmin) {
                // Fetch scorecards list for month
                const listRes = await API.get(`/scorecards/?month=${selectedMonth}-01`);
                if (listRes.data.success) {
                    setScorecards(listRes.data.data.scorecards);
                    setTeamAverage(listRes.data.data.team_average || 0);
                }

                // Fetch dashboard stats
                const dashRes = await API.get(`/scorecards/dashboard/?month=${selectedMonth}-01`);
                if (dashRes.data.success) {
                    setDashboardStats(dashRes.data.data);
                }
            } else {
                // Fetch team member scorecard
                const res = await API.get(`/scorecards/?month=${selectedMonth}-01`);
                if (res.data.success) {
                    setMemberData(res.data.data);
                }
            }
        } catch (error) {
            console.error('Error fetching scorecard data:', error);
            setErrorMsg('Failed to fetch scorecard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedMonth, isAdmin]);

    // Risk alerts count calculated for Admins
    const riskAlertsCount = useMemo(() => {
        if (!isAdmin) return 0;
        return scorecards.filter(sc => {
            const score = sc.overall_score || 0;
            const tcr = sc.task_completion_rate || 0;
            return (score > 0 && score < 70) || (tcr > 0 && tcr < 60);
        }).length;
    }, [scorecards, isAdmin]);

    // Handle row click/drill down
    const handleDrilldown = async (member) => {
        setSelectedMember(member);
        setActiveTab('eval');
        setQualityScore(member.quality_score || 0);
        setAttendanceScore(member.attendance_score || 0);
        setLearningRateScore(member.learning_rate_score || 0);
        setAdminComments(member.admin_comments || '');
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const res = await API.get(`/scorecards/drilldown/${member.employee.id}/?month=${selectedMonth}-01`);
            if (res.data.success) {
                setDrilldownData(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching drilldown details:', error);
        }
    };

    // Save or submit scorecard
    const handleSaveScorecard = async (statusVal) => {
        if (!selectedMember) return;
        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const payload = {
                employee: selectedMember.employee.id,
                month: `${selectedMonth}-01`,
                quality_score: qualityScore,
                attendance_score: attendanceScore,
                learning_rate_score: learningRateScore,
                admin_comments: adminComments,
                status: statusVal,
            };

            const res = await API.post('/scorecards/save/', payload);
            if (res.data.success) {
                setSuccessMsg(`Scorecard successfully ${statusVal === 'PUBLISHED' ? 'submitted and published' : 'saved as draft'}!`);
                // Refresh list
                const updated = scorecards.map(sc => {
                    if (sc.employee.id === selectedMember.employee.id) {
                        return res.data.data;
                    }
                    return sc;
                });
                setScorecards(updated);
                // Update selected member status
                setSelectedMember(res.data.data);
            }
        } catch (error) {
            console.error('Error saving scorecard:', error);
            setErrorMsg(error.response?.data?.message || 'Failed to save scorecard.');
        } finally {
            setSubmitting(false);
        }
    };

    // Helper: color status badges
    const getStatusStyle = (status) => {
        switch (status) {
            case 'PUBLISHED':
                return { bg: 'var(--success-light)', color: 'var(--success)' };
            case 'APPROVED':
                return { bg: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' };
            case 'SUBMITTED':
                return { bg: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b' };
            case 'REJECTED':
                return { bg: 'var(--danger-light)', color: 'var(--danger)' };
            case 'DRAFT':
                return { bg: 'rgba(154, 85, 255, 0.08)', color: 'var(--primary)' };
            default:
                return { bg: 'rgba(156, 163, 175, 0.08)', color: '#6b7280' };
        }
    };

    // Render Admin View
    const renderAdminView = () => {
        return (
            <div className="page">
                <div className="page-header" style={{ marginBottom: '24px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 className="page-title" style={{ margin: 0 }}>Employee Scorecards</h1>
                            <ScorecardInfoTooltip />
                        </div>
                        <p className="page-subtitle" style={{ marginTop: '4px' }}>Evaluate your team performance and submit monthly ratings</p>
                    </div>
                    <div className="filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <label className="text-muted" style={{ fontSize: '14px', fontWeight: '500' }}>Select Month:</label>
                        <input
                            type="month"
                            className="search-input"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                    </div>
                </div>

                {/* Dashboard Stats Cards */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '32px' }}>
                    <div className="stat-card stat-blue">
                        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(154, 85, 255, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }} className="stat-icon-wrapper">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </div>
                        <div className="stat-info">
                            <div className="stat-label">Team Average</div>
                            <div className="stat-value">{teamAverage}%</div>
                        </div>
                    </div>
                    <div className="stat-card stat-amber">
                        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }} className="stat-icon-wrapper">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div className="stat-info">
                            <div className="stat-label">Risk Alerts</div>
                            <div className="stat-value">{riskAlertsCount}</div>
                        </div>
                    </div>
                    <div className="stat-card stat-purple">
                        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }} className="stat-icon-wrapper">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div className="stat-info">
                            <div className="stat-label">Pending Review</div>
                            <div className="stat-value">{scorecards.filter(sc => sc.status === 'DRAFT' || sc.status === 'NOT_CREATED').length}</div>
                        </div>
                    </div>
                </div>

                {/* Scorecards Table */}
                <div className="content-card" style={{ overflow: 'hidden' }}>
                    <div className="content-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Team Score List ({scorecards.length} members)</h3>
                    </div>
                    <div className="table-wrapper">
                        {loading ? (
                            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading scorecards...</div>
                        ) : scorecards.length === 0 ? (
                            <div className="empty-state" style={{ padding: '60px', textAlign: 'center' }}>
                                <p className="text-muted">No team members found.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Task Completion</th>
                                        <th>Hours Logged</th>
                                        <th>Quality (TL)</th>
                                        <th>Attendance (TL)</th>
                                        <th>Overall Score</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scorecards.map((sc) => {
                                        const badge = getStatusStyle(sc.status);
                                        const isRisk = (sc.overall_score > 0 && sc.overall_score < 70) || (sc.task_completion_rate > 0 && sc.task_completion_rate < 60);
                                        return (
                                            <tr key={sc.employee.id} style={{ backgroundColor: isRisk ? 'rgba(224, 36, 36, 0.02)' : 'transparent' }}>
                                                <td style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '600', fontSize: '14px', overflow: 'hidden' }}>
                                                        {sc.employee.profile_picture ? (
                                                            <img src={sc.employee.profile_picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            sc.employee.name?.charAt(0).toUpperCase() || sc.employee.username?.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{sc.employee.name || sc.employee.username}</div>
                                                        <div className="text-muted" style={{ fontSize: '12px' }}>{sc.employee.username}</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontWeight: '500' }}>{sc.task_completion_rate}%</span>
                                                        <div style={{ width: '60px', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${sc.task_completion_rate}%`, height: '100%', background: sc.task_completion_rate < 60 ? 'var(--danger)' : 'var(--success)' }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontWeight: '500' }}>{sc.working_hours} hrs</td>
                                                <td>{sc.quality_score > 0 ? `${sc.quality_score} / 5` : '—'}</td>
                                                <td>{sc.attendance_score > 0 ? `${sc.attendance_score} / 5` : '—'}</td>
                                                <td style={{ fontWeight: '700', color: isRisk ? 'var(--danger)' : 'var(--text-primary)' }}>
                                                    {sc.overall_score}% {isRisk && <span style={{ color: 'var(--danger)', fontSize: '12px', marginLeft: '4px' }}>⚠️</span>}
                                                </td>
                                                <td>
                                                    <span className="status-badge" style={{ backgroundColor: badge.bg, color: badge.color, fontSize: '11px', fontWeight: '600', padding: '4px 8px', borderRadius: '4px' }}>
                                                        {sc.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--primary)', color: '#fff', border: 'none' }}
                                                        onClick={() => handleDrilldown(sc)}
                                                    >
                                                        {sc.status === 'NOT_CREATED' || sc.status === 'DRAFT' || sc.status === 'REJECTED' ? 'Evaluate' : 'View'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Drilldown Modal */}
                {selectedMember && (
                    <div className="modal-overlay">
                        <div className="modal-card modal-card-wide">
                            
                            {/* Modal Header */}
                            <div className="modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '600', fontSize: '16px' }}>
                                        {selectedMember.employee.name?.charAt(0).toUpperCase() || selectedMember.employee.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2>
                                            Evaluate: {selectedMember.employee.name || selectedMember.employee.username}
                                        </h2>
                                        <p className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>Month of {selectedMonth}</p>
                                    </div>
                                </div>
                                <button className="modal-close" onClick={() => setSelectedMember(null)}>&times;</button>
                            </div>

                            {/* Modal Tabs */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
                                <button
                                    onClick={() => setActiveTab('eval')}
                                    style={{ flex: 1, padding: '12px', border: 'none', background: 'none', borderBottom: activeTab === 'eval' ? '2px solid var(--primary)' : 'none', color: activeTab === 'eval' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Rating & Review
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    style={{ flex: 1, padding: '12px', border: 'none', background: 'none', borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : 'none', color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Historical Trend
                                </button>
                                <button
                                    onClick={() => setActiveTab('tasks')}
                                    style={{ flex: 1, padding: '12px', border: 'none', background: 'none', borderBottom: activeTab === 'tasks' ? '2px solid var(--primary)' : 'none', color: activeTab === 'tasks' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Monthly System Stats
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div style={{ padding: '24px' }}>
                                {errorMsg && <div style={{ color: 'var(--danger)', padding: '10px 14px', borderRadius: '4px', background: 'var(--danger-light)', marginBottom: '16px', fontWeight: '500' }}>{errorMsg}</div>}
                                {successMsg && <div style={{ color: 'var(--success)', padding: '10px 14px', borderRadius: '4px', background: 'var(--success-light)', marginBottom: '16px', fontWeight: '500' }}>{successMsg}</div>}

                                {activeTab === 'eval' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* Auto Metrics Display */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', padding: '16px', background: 'var(--border-light)', borderRadius: 'var(--radius)' }}>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '11px', fontWeight: '600' }}>Task Completion</div>
                                                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedMember.task_completion_rate}%</div>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '11px', fontWeight: '600' }}>Logged Hours</div>
                                                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedMember.working_hours} hrs</div>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '11px', fontWeight: '600' }}>Timesheet Compliance</div>
                                                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedMember.timesheet_compliance || 0}%</div>
                                            </div>
                                        </div>

                                        {/* Input Form */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <label style={{ fontWeight: '600', fontSize: '14px' }}>Quality Score (1-5 Stars)</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <span
                                                        key={star}
                                                        onClick={() => {
                                                            if (selectedMember.status === 'NOT_CREATED' || selectedMember.status === 'DRAFT' || selectedMember.status === 'REJECTED') {
                                                                setQualityScore(star);
                                                            }
                                                        }}
                                                        style={{
                                                            fontSize: '28px',
                                                            cursor: (selectedMember.status === 'NOT_CREATED' || selectedMember.status === 'DRAFT' || selectedMember.status === 'REJECTED') ? 'pointer' : 'default',
                                                            color: star <= qualityScore ? '#f59e0b' : '#d1d5db'
                                                        }}
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <label style={{ fontWeight: '600', fontSize: '14px' }}>Attendance & Discipline Score (1-5 Stars)</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <span
                                                        key={star}
                                                        onClick={() => {
                                                            if (selectedMember.status === 'NOT_CREATED' || selectedMember.status === 'DRAFT' || selectedMember.status === 'REJECTED') {
                                                                setAttendanceScore(star);
                                                            }
                                                        }}
                                                        style={{
                                                            fontSize: '28px',
                                                            cursor: (selectedMember.status === 'NOT_CREATED' || selectedMember.status === 'DRAFT' || selectedMember.status === 'REJECTED') ? 'pointer' : 'default',
                                                            color: star <= attendanceScore ? '#f59e0b' : '#d1d5db'
                                                        }}
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <label style={{ fontWeight: '600', fontSize: '14px' }}>Learning Rate Score (1-5 Stars)</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <span
                                                        key={star}
                                                        onClick={() => {
                                                            if (selectedMember.status === 'NOT_CREATED' || selectedMember.status === 'DRAFT' || selectedMember.status === 'REJECTED') {
                                                                setLearningRateScore(star);
                                                            }
                                                        }}
                                                        style={{
                                                            fontSize: '28px',
                                                            cursor: (selectedMember.status === 'NOT_CREATED' || selectedMember.status === 'DRAFT' || selectedMember.status === 'REJECTED') ? 'pointer' : 'default',
                                                            color: star <= learningRateScore ? '#f59e0b' : '#d1d5db'
                                                        }}
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontWeight: '600', fontSize: '14px' }}>TL Review Comments</label>
                                            <textarea
                                                className="search-input"
                                                style={{ width: '100%', height: '100px', padding: '12px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', resize: 'vertical' }}
                                                placeholder="Write performance feedback here..."
                                                value={adminComments}
                                                onChange={(e) => setAdminComments(e.target.value)}
                                                disabled={selectedMember.status !== 'NOT_CREATED' && selectedMember.status !== 'DRAFT' && selectedMember.status !== 'REJECTED'}
                                            />
                                        </div>

                                        {selectedMember.superadmin_comments && (
                                            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.04)', borderLeft: '4px solid var(--danger)', borderRadius: '4px' }}>
                                                <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--danger)' }}>Superadmin Feedback</div>
                                                <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-secondary)' }}>{selectedMember.superadmin_comments}</p>
                                            </div>
                                        )}

                                        {/* Overall Calculated Score */}
                                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '12px' }}>Current Overall Score</div>
                                                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>
                                                    {selectedMember.overall_score || 0}%
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status: <strong>{selectedMember.status}</strong></span>
                                        </div>

                                        {/* Action buttons */}
                                        {(selectedMember.status === 'NOT_CREATED' || selectedMember.status === 'DRAFT' || selectedMember.status === 'REJECTED') && (
                                            <div className="modal-actions" style={{ marginTop: '16px' }}>
                                                <button
                                                    onClick={() => handleSaveScorecard('DRAFT')}
                                                    disabled={submitting}
                                                    className="btn-cancel-white"
                                                >
                                                    Save Draft
                                                </button>
                                                <button
                                                    onClick={() => handleSaveScorecard('PUBLISHED')}
                                                    disabled={submitting}
                                                    className="btn-primary"
                                                >
                                                    Submit & Publish
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Monthly Scores Trend</h4>
                                        {drilldownData?.scorecards?.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {/* Mini custom SVG bar chart */}
                                                <div style={{ width: '100%', height: '150px', background: 'var(--border-light)', borderRadius: 'var(--radius)', padding: '20px 10px', display: 'flex', alignItems: 'flex-end', gap: '20px', justifyContent: 'space-around', position: 'relative' }}>
                                                    {drilldownData.scorecards.map((sc, i) => (
                                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                                                            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--primary)', marginBottom: '4px' }}>{sc.overall_score}%</span>
                                                            <div style={{ width: '30px', height: `${sc.overall_score}%`, background: 'linear-gradient(to top, var(--primary), var(--primary-gradient-start))', borderRadius: '4px 4px 0 0', minHeight: '4px' }}></div>
                                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>{new Date(sc.month).toLocaleString('default', { month: 'short', year: '2-digit' })}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <table className="data-table" style={{ marginTop: '16px' }}>
                                                    <thead>
                                                        <tr>
                                                            <th>Month</th>
                                                            <th>Task Score</th>
                                                            <th>Working Hours</th>
                                                            <th>TL Quality</th>
                                                            <th>Overall</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {drilldownData.scorecards.map((sc, index) => (
                                                            <tr key={index}>
                                                                <td style={{ fontWeight: '600' }}>
                                                                    {new Date(sc.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                                                                </td>
                                                                <td>{sc.task_completion_rate}%</td>
                                                                <td>{sc.working_hours}h</td>
                                                                <td>{sc.quality_score}/5</td>
                                                                <td style={{ fontWeight: '700' }}>{sc.overall_score}%</td>
                                                                <td>
                                                                    <span className="status-badge" style={{ backgroundColor: getStatusStyle(sc.status).bg, color: getStatusStyle(sc.status).color, fontSize: '10px' }}>
                                                                        {sc.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-muted">No historical scorecards found for this employee.</p>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'tasks' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        <div>
                                            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
                                                Monthly System Metrics ({selectedMonth ? new Date(selectedMonth + '-02').toLocaleDateString('default', { month: 'long', year: 'numeric' }) : ''})
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                                <div style={{ padding: '16px', background: 'var(--border-light)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                                                    <div className="text-muted" style={{ fontSize: '12px' }}>Total Tasks Assigned</div>
                                                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                                                        {drilldownData?.task_metrics?.total_tasks || 0}
                                                    </div>
                                                </div>
                                                <div style={{ padding: '16px', background: 'var(--border-light)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                                                    <div className="text-muted" style={{ fontSize: '12px' }}>Completed Tasks</div>
                                                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)', marginTop: '4px' }}>
                                                        {drilldownData?.task_metrics?.completed_tasks || 0}
                                                    </div>
                                                </div>
                                                <div style={{ padding: '16px', background: 'var(--border-light)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                                                    <div className="text-muted" style={{ fontSize: '12px' }}>Task Completion Rate</div>
                                                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)', marginTop: '4px' }}>
                                                        {drilldownData?.task_metrics?.completion_rate || 0}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Lifetime System Metrics</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                                <div style={{ padding: '16px', background: 'var(--border-light)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                                                    <div className="text-muted" style={{ fontSize: '12px' }}>Total Tasks Assigned</div>
                                                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                                                        {drilldownData?.lifetime_metrics?.total_tasks || 0}
                                                    </div>
                                                </div>
                                                <div style={{ padding: '16px', background: 'var(--border-light)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                                                    <div className="text-muted" style={{ fontSize: '12px' }}>Completed Tasks</div>
                                                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)', marginTop: '4px' }}>
                                                        {drilldownData?.lifetime_metrics?.completed_tasks || 0}
                                                    </div>
                                                </div>
                                                <div style={{ padding: '16px', background: 'var(--border-light)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                                                    <div className="text-muted" style={{ fontSize: '12px' }}>Task Completion Rate</div>
                                                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)', marginTop: '4px' }}>
                                                        {drilldownData?.lifetime_metrics?.completion_rate || 0}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render Team Member View
    const renderMemberView = () => {
        if (loading) {
            return <div className="page-loader"><div className="page-loader-spinner"></div><p className="page-loader-text">Loading scorecard...</p></div>;
        }

        const score = memberData?.scorecard?.overall_score || 0;
        const statusVal = memberData?.scorecard?.status || 'NOT_PUBLISHED';
        const hasScorecard = !!memberData?.scorecard;

        return (
            <div className="page">
                <div className="page-header" style={{ marginBottom: '24px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 className="page-title" style={{ margin: 0 }}>My Performance Scorecard</h1>
                            <ScorecardInfoTooltip />
                        </div>
                        <p className="page-subtitle" style={{ marginTop: '4px' }}>Track your monthly scores, breakdown, and trends</p>
                    </div>
                    <div className="filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <label className="text-muted" style={{ fontSize: '14px', fontWeight: '500' }}>Select Month:</label>
                        <input
                            type="month"
                            className="search-input"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                    </div>
                </div>

                {!hasScorecard ? (
                    <div className="content-card" style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Scorecard Not Published</h3>
                        <p className="text-muted">Your scorecard for this month has not been published by the management yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Upper row: Big Score circular ring + metrics breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                            {/* Circle score card */}
                            <div className="content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
                                <span style={{ fontWeight: '600', fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Overall Score</span>
                                <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    {/* SVG Progress Circle */}
                                    <svg width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
                                        <circle cx="75" cy="75" r="65" stroke="var(--border-light)" strokeWidth="12" fill="transparent" />
                                        <circle
                                            cx="75"
                                            cy="75"
                                            r="65"
                                            stroke="url(#purpleGradient)"
                                            strokeWidth="12"
                                            fill="transparent"
                                            strokeDasharray="408.4"
                                            strokeDashoffset={408.4 - (408.4 * score) / 100}
                                            strokeLinecap="round"
                                            style={{ transition: 'stroke-dashoffset 1s ease' }}
                                        />
                                        <defs>
                                            <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="var(--primary-gradient-start)" />
                                                <stop offset="100%" stopColor="var(--primary-gradient-end)" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <span style={{ position: 'absolute', fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)' }}>{score}%</span>
                                </div>
                                <span className="status-badge" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', fontSize: '12px', padding: '6px 12px', borderRadius: '4px', fontWeight: '700' }}>
                                    {statusVal}
                                </span>
                            </div>

                            {/* Breakdown cards */}
                            <div className="content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Score Breakdown</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span className="text-muted">Task Completion (25%)</span>
                                            <span style={{ fontWeight: '600' }}>{memberData.scorecard.task_completion_rate}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${memberData.scorecard.task_completion_rate}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span className="text-muted">Timesheet Compliance (Discipline)</span>
                                            <span style={{ fontWeight: '600' }}>{memberData.scorecard.timesheet_compliance || 0}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${memberData.scorecard.timesheet_compliance || 0}%`, height: '100%', background: '#3b82f6', borderRadius: '4px' }}></div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <span className="text-muted" style={{ fontSize: '13px' }}>Quality Rating (Performance) (35%)</span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <span key={star} style={{ fontSize: '20px', color: star <= memberData.scorecard.quality_score ? '#f59e0b' : '#d1d5db' }}>★</span>
                                            ))}
                                            <span style={{ marginLeft: '8px', fontWeight: '600', fontSize: '14px', alignSelf: 'center' }}>{memberData.scorecard.quality_score}/5</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <span className="text-muted" style={{ fontSize: '13px' }}>Attendance & Discipline (25%)</span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <span key={star} style={{ fontSize: '20px', color: star <= memberData.scorecard.attendance_score ? '#f59e0b' : '#d1d5db' }}>★</span>
                                            ))}
                                            <span style={{ marginLeft: '8px', fontWeight: '600', fontSize: '14px', alignSelf: 'center' }}>{memberData.scorecard.attendance_score}/5</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <span className="text-muted" style={{ fontSize: '13px' }}>Learning Rate (15%)</span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <span key={star} style={{ fontSize: '20px', color: star <= memberData.scorecard.learning_rate_score ? '#f59e0b' : '#d1d5db' }}>★</span>
                                            ))}
                                            <span style={{ marginLeft: '8px', fontWeight: '600', fontSize: '14px', alignSelf: 'center' }}>{memberData.scorecard.learning_rate_score || 0}/5</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Middle row: Team Average Comparison + comments */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {/* Team Comparison */}
                            <div className="content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Team Comparison</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                            <span>My Overall Score</span>
                                            <span style={{ fontWeight: '700' }}>{score}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '10px', background: 'var(--border-light)', borderRadius: '5px', overflow: 'hidden' }}>
                                            <div style={{ width: `${score}%`, height: '100%', background: 'var(--primary)' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                            <span>Team Average Score</span>
                                            <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>{memberData.team_average}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '10px', background: 'var(--border-light)', borderRadius: '5px', overflow: 'hidden' }}>
                                            <div style={{ width: `${memberData.team_average}%`, height: '100%', background: '#9ca3af' }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '12px', background: score >= memberData.team_average ? 'var(--success-light)' : 'rgba(245, 158, 11, 0.04)', borderRadius: 'var(--radius)', borderLeft: `4px solid ${score >= memberData.team_average ? 'var(--success)' : '#f59e0b'}`, fontSize: '13px', fontWeight: '500', color: score >= memberData.team_average ? 'var(--success)' : '#d97706' }}>
                                    {score >= memberData.team_average 
                                        ? "🎉 Excellent! Your score is higher than the team average." 
                                        : "💡 Tip: Focus on completing tasks before their due date to boost your score above the average!"
                                    }
                                </div>
                            </div>

                            {/* TL Feedback Comments */}
                            <div className="content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Manager Comments</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
                                    {memberData.scorecard.admin_comments ? (
                                        <div style={{ fontStyle: 'italic', padding: '16px', background: 'var(--border-light)', borderRadius: 'var(--radius)', position: 'relative' }}>
                                            <span style={{ fontSize: '28px', color: 'var(--primary)', opacity: 0.15, position: 'absolute', top: '4px', left: '8px', lineHeight: 1 }}>“</span>
                                            <p style={{ paddingLeft: '12px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>{memberData.scorecard.admin_comments}</p>
                                        </div>
                                    ) : (
                                        <p className="text-muted" style={{ fontStyle: 'italic', textAlign: 'center' }}>No comment left by your manager.</p>
                                    )}
                                    {memberData.scorecard.superadmin_comments && (
                                        <div style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.04)', borderLeft: '4px solid #3b82f6', borderRadius: '4px' }}>
                                            <div style={{ fontWeight: '600', fontSize: '12px', color: '#3b82f6' }}>Management Review</div>
                                            <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-secondary)' }}>{memberData.scorecard.superadmin_comments}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Historical Trend */}
                        <div className="content-card" style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Historical Score Trend</h3>
                            {memberData.history?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Line Graph representation using SVG */}
                                    <div style={{ width: '100%', height: '180px', background: 'var(--border-light)', borderRadius: 'var(--radius)', position: 'relative', padding: '20px' }}>
                                        <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none">
                                            <defs>
                                                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="rgba(154, 85, 255, 0.3)" />
                                                    <stop offset="100%" stopColor="rgba(154, 85, 255, 0)" />
                                                </linearGradient>
                                            </defs>
                                            {/* Grid lines */}
                                            <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
                                            <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
                                            <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />

                                            {/* Draw area under path */}
                                            <path
                                                d={`M 10 100 ${memberData.history.map((sc, i) => `L ${10 + i * (480 / (memberData.history.length - 1 || 1))} ${100 - sc.overall_score}`).join(' ')} L ${10 + (memberData.history.length - 1) * (480 / (memberData.history.length - 1 || 1))} 100 Z`}
                                                fill="url(#lineGrad)"
                                            />
                                            {/* Draw trend line */}
                                            <path
                                                d={memberData.history.map((sc, i) => `${i === 0 ? 'M' : 'L'} ${10 + i * (480 / (memberData.history.length - 1 || 1))} ${100 - sc.overall_score}`).join(' ')}
                                                fill="none"
                                                stroke="var(--primary)"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                            />
                                            {/* Dots on points */}
                                            {memberData.history.map((sc, i) => (
                                                <circle
                                                    key={i}
                                                    cx={10 + i * (480 / (memberData.history.length - 1 || 1))}
                                                    cy={100 - sc.overall_score}
                                                    r="5"
                                                    fill="var(--bg-white)"
                                                    stroke="var(--primary)"
                                                    strokeWidth="2.5"
                                                />
                                            ))}
                                        </svg>
                                        {/* Label overlay */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '10px', paddingRight: '10px', marginTop: '10px' }}>
                                            {memberData.history.map((sc, i) => (
                                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--primary)' }}>{sc.overall_score}%</span>
                                                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{new Date(sc.month).toLocaleString('default', { month: 'short' })}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted">No historical trends available yet.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return isAdmin ? renderAdminView() : renderMemberView();
};

export default Scorecards;
