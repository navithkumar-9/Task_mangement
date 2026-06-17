import { useState, useEffect } from 'react';
import API from '../api/axios';

const Scorecards = () => {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    });

    // States
    const [loading, setLoading] = useState(true);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [scorecardsList, setScorecardsList] = useState([]);
    const [selectedScorecard, setSelectedScorecard] = useState(null);
    const [superadminComments, setSuperadminComments] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Fetch data
    const fetchScorecardsData = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            // Fetch Dashboard Stats (includes team comparison)
            const statsRes = await API.get(`/scorecards/dashboard/?month=${selectedMonth}-01`);
            if (statsRes.data.success) {
                setDashboardStats(statsRes.data.data);
            }

            // Fetch all scorecards (to list submissions)
            const listRes = await API.get(`/scorecards/?month=${selectedMonth}-01`);
            if (listRes.data.success) {
                setScorecardsList(listRes.data.data.scorecards || []);
            }
        } catch (error) {
            console.error('Error fetching scorecard data:', error);
            setErrorMsg('Failed to fetch scorecard details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScorecardsData();
    }, [selectedMonth]);

    // Handle review (approve, reject, publish)
    const handleReviewAction = async (scorecardId, newStatus) => {
        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const res = await API.post(`/scorecards/${scorecardId}/review/`, {
                status: newStatus,
                superadmin_comments: superadminComments
            });

            if (res.data.success) {
                setSuccessMsg(`Scorecard status updated to ${newStatus.replace('_', ' ')} successfully!`);
                // Update in local lists
                const updatedList = scorecardsList.map(sc => {
                    if (sc.id === scorecardId) {
                        return res.data.data;
                    }
                    return sc;
                });
                setScorecardsList(updatedList);
                setSelectedScorecard(null);
                setSuperadminComments('');
                // Refresh dashboard counters
                fetchScorecardsData();
            }
        } catch (error) {
            console.error('Error reviewing scorecard:', error);
            setErrorMsg(error.response?.data?.message || 'Failed to review scorecard.');
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

    return (
        <div className="page">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title">Management Scorecards</h1>
                    <p className="page-subtitle">Monitor team analytics, compare performance, and view monthly reviews</p>
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

            {/* Dashboard Overview Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '32px' }}>
                <div className="stat-card stat-blue">
                    <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(154, 85, 255, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }} className="stat-icon-wrapper">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Company Average Score</div>
                        <div className="stat-value">{dashboardStats?.company_average || 0}%</div>
                    </div>
                </div>
                <div className="stat-card stat-purple">
                    <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }} className="stat-icon-wrapper">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Published Scorecards</div>
                        <div className="stat-value">{scorecardsList.filter(sc => sc.status === 'PUBLISHED').length}</div>
                    </div>
                </div>
                <div className="stat-card stat-amber">
                    <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }} className="stat-icon-wrapper">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">At-Risk Employees</div>
                        <div className="stat-value">{dashboardStats?.risk_alerts || 0}</div>
                    </div>
                </div>
            </div>

            {successMsg && <div style={{ color: 'var(--success)', padding: '12px 16px', borderRadius: 'var(--radius)', background: 'var(--success-light)', marginBottom: '24px', fontWeight: '500' }}>{successMsg}</div>}
            {errorMsg && <div style={{ color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius)', background: 'var(--danger-light)', marginBottom: '24px', fontWeight: '500' }}>{errorMsg}</div>}

            <div style={{ marginBottom: '24px' }}>
                
                {/* Team Comparisons */}
                <div className="content-card">
                    <div className="content-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Team Comparisons</h3>
                    </div>
                    <div className="table-wrapper">
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading comparison...</div>
                        ) : !dashboardStats?.team_comparison || dashboardStats.team_comparison.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No team comparison data.</div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Admin / Team</th>
                                        <th>Members</th>
                                        <th>Team Avg</th>
                                        <th>Risk Alerts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardStats.team_comparison.map((team, index) => (
                                        <tr key={index}>
                                            <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{team.admin_name}</td>
                                            <td>{team.member_count}</td>
                                            <td style={{ fontWeight: '700', color: team.team_average < 70 ? 'var(--danger)' : 'var(--text-primary)' }}>
                                                {team.team_average}%
                                            </td>
                                            <td>
                                                <span style={{ color: team.risk_alerts > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '600' }}>
                                                    {team.risk_alerts}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>

            {/* Scorecard Overview (All scorecards including approved, draft) */}
            <div className="content-card">
                <div className="content-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600' }}>All Scorecards Overview</h3>
                </div>
                <div className="table-wrapper">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                    ) : scorecardsList.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No scorecards found.</div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Task Completion</th>
                                    <th>Working Hours</th>
                                    <th>Quality Score</th>
                                    <th>Overall Score</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scorecardsList.map((sc) => {
                                    const badge = getStatusStyle(sc.status);
                                    return (
                                        <tr key={sc.id || sc.employee.id}>
                                            <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {sc.employee.name || sc.employee.username}
                                            </td>
                                            <td>{sc.task_completion_rate}%</td>
                                            <td>{sc.working_hours}h</td>
                                            <td>{sc.quality_score > 0 ? `${sc.quality_score}/5` : '—'}</td>
                                            <td style={{ fontWeight: '700' }}>{sc.overall_score}%</td>
                                            <td>
                                                <span className="status-badge" style={{ backgroundColor: badge.bg, color: badge.color, fontSize: '11px' }}>
                                                    {sc.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {sc.id ? (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedScorecard(sc);
                                                        }}
                                                        className="btn-primary"
                                                        style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--primary)', color: '#fff', border: 'none' }}
                                                    >
                                                        View
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Not Created</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Review Modal */}
            {selectedScorecard && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        
                        <div className="modal-header">
                            <div>
                                <h2>
                                    Scorecard Details: {selectedScorecard.employee.name || selectedScorecard.employee.username}
                                </h2>
                                <p className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>Month of {selectedMonth}</p>
                            </div>
                            <button className="modal-close" onClick={() => setSelectedScorecard(null)}>&times;</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', background: 'var(--border-light)', borderRadius: 'var(--radius)' }}>
                                <div>
                                    <div className="text-muted" style={{ fontSize: '12px' }}>Task Completion Rate</div>
                                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedScorecard.task_completion_rate}%</div>
                                </div>
                                <div>
                                    <div className="text-muted" style={{ fontSize: '12px' }}>Working Hours Logged</div>
                                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedScorecard.working_hours} hrs</div>
                                </div>
                                <div>
                                    <div className="text-muted" style={{ fontSize: '12px' }}>Quality (TL Score)</div>
                                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedScorecard.quality_score} / 5</div>
                                </div>
                                <div>
                                    <div className="text-muted" style={{ fontSize: '12px' }}>Attendance (TL Score)</div>
                                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedScorecard.attendance_score} / 5</div>
                                </div>
                            </div>

                            {/* Overall Score */}
                            <div style={{ padding: '12px 16px', background: 'var(--primary-lighter)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--primary)' }}>Weighted Overall Score</span>
                                <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>{selectedScorecard.overall_score}%</span>
                            </div>

                            {/* TL Comments */}
                            <div>
                                <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '6px' }}>TL Comments:</label>
                                <p style={{ fontSize: '14px', background: 'var(--border-light)', padding: '12px', borderRadius: '4px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                    {selectedScorecard.admin_comments || 'No comment left by TL.'}
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                                <button
                                    onClick={() => setSelectedScorecard(null)}
                                    className="btn-primary"
                                >
                                    Close
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Scorecards;
