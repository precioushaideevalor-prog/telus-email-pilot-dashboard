import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const [viewMode, setViewMode] = useState('summary');
  const [dateFilter, setDateFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Replace with your Google Apps Script deployment URL
  const APPS_SCRIPT_URL = 'https://script.google.com/a/macros/telus.com/s/AKfycbwd_mu-1nr2IeYHOXuWVjuyTl2xROBEWb7G1rcdvscIjx4TC4fHi4uke3Y6iHj-hR0/exec';

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(APPS_SCRIPT_URL);
      if (!response.ok) throw new Error('Failed to fetch data');
      const rawData = await response.json();
      
      // Transform to match our schema
      const transformed = rawData.map(row => ({
        emailDate: row['Email Date'] || '',
        status: row['Status'] || '',
        agent: row['Assigned To'] || '',
        reason: row['If not yet given in the primary email message, ask why they choose to contact us via email and not respond to the SMS we sent.'] || '',
        resolution: row['What was the result of the call?'] || '',
      })).filter(r => r.emailDate); // Filter out empty rows

      setData(transformed);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to load data. Check that the Apps Script URL is correct.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(row => {
      if (dateFilter !== 'all') {
        const rowMonth = row.emailDate.slice(0, 7);
        if (dateFilter === 'jul' && !rowMonth.includes('07')) return false;
        if (dateFilter === 'aug' && !rowMonth.includes('08')) return false;
      }
      if (agentFilter !== 'all' && row.agent !== agentFilter) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      return true;
    });
  }, [data, dateFilter, agentFilter, statusFilter]);

  const stats = useMemo(() => {
    const completed = filteredData.filter(d => d.status.includes('Completed')).length;
    const failed = filteredData.filter(d => d.status.includes('Failed')).length;
    const pending = filteredData.filter(d => d.status.includes('Pending')).length;
    const total = filteredData.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const reasons = {};
    filteredData.forEach(d => {
      if (d.reason) reasons[d.reason] = (reasons[d.reason] || 0) + 1;
    });

    const resolutions = {};
    filteredData.forEach(d => {
      if (d.resolution) resolutions[d.resolution] = (resolutions[d.resolution] || 0) + 1;
    });

    return { completed, failed, pending, total, completionRate, reasons, resolutions };
  }, [filteredData]);

  const agents = [...new Set(data.map(d => d.agent).filter(Boolean))].sort();
  const statuses = ['Completed', 'Failed', 'Pending'];

  if (loading && data.length === 0) {
    return <div className="container loading">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="container error">
        <div className="error-card">
          <h2>⚠️ Configuration Error</h2>
          <p>{error}</p>
          <p style={{ marginTop: '12px', fontSize: '13px', color: '#52514e' }}>
            Update the <code>APPS_SCRIPT_URL</code> in src/App.js with your Google Apps Script deployment URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>Email Pilot Dashboard</h1>
          <div className="header-meta">
            <span className="project">proactiverepairs@telus.com</span>
            {lastUpdated && (
              <span className="updated">Updated {lastUpdated.toLocaleTimeString()}</span>
            )}
            <button className="refresh-btn" onClick={fetchData} disabled={loading}>
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="controls">
          <button
            className={`view-btn ${viewMode === 'summary' ? 'active' : ''}`}
            onClick={() => setViewMode('summary')}
          >
            Summary
          </button>
          <button
            className={`view-btn ${viewMode === 'detail' ? 'active' : ''}`}
            onClick={() => setViewMode('detail')}
          >
            Operational
          </button>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Total emails</div>
            <div className="metric-value">{stats.total}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Completion rate</div>
            <div className="metric-value">{stats.completionRate}%</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Calls completed</div>
            <div className="metric-value">{stats.completed}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Failed attempts</div>
            <div className="metric-value">{stats.failed}</div>
          </div>
        </div>

        <div className="filters">
          <div className="filter-group">
            <label>Date range</label>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All dates</option>
              <option value="jul">July 2026</option>
              <option value="aug">August 2026</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Agent</label>
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
              <option value="all">All agents</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {viewMode === 'summary' && (
          <div className="summary-view">
            <div className="card">
              <h3>Call outcomes</h3>
              <div className="outcome-list">
                {[
                  { label: 'Completed', count: stats.completed, color: '#0ca30c' },
                  { label: 'Failed', count: stats.failed, color: '#d03b3b' },
                  { label: 'Pending', count: stats.pending, color: '#fab219' },
                ].map(item => (
                  <div key={item.label} className="outcome-row">
                    <div className="outcome-dot" style={{ backgroundColor: item.color }}></div>
                    <span className="outcome-label">{item.label}</span>
                    <span className="outcome-count">
                      {item.count} ({stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3>Why customers chose email</h3>
              <div className="reason-list">
                {Object.entries(stats.reasons).map(([reason, count]) => (
                  <div key={reason} className="reason-row">
                    <span className="reason-text">{reason}</span>
                    <span className="reason-count">
                      {count} ({Math.round((count / Object.values(stats.reasons).reduce((a, b) => a + b, 0)) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3>Resolution outcomes</h3>
              <div className="resolution-list">
                {Object.entries(stats.resolutions).map(([res, count]) => (
                  <div key={res} className="resolution-row">
                    <span className="resolution-text">{res}</span>
                    <span className="resolution-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'detail' && (
          <div className="detail-view">
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.emailDate}</td>
                      <td>{row.agent || '—'}</td>
                      <td>
                        <span className={`status-badge status-${row.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="reason-cell">{row.reason || '—'}</td>
                      <td>{row.resolution || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
