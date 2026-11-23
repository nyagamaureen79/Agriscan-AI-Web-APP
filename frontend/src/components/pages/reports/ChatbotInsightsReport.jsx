import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from '../../Sidebar';
import Header from '../../Header';
import './ChatbotInsightsReport.css';
import { apiFetch } from '../../../utils/apiFetch';

const API_BASE = import.meta.env.VITE_API_URL;

// ─── Constants ────────────────────────────────────────────────────────────────

const DATE_RANGES = [
  'Last 7 Days',
  'Last 30 Days',
  'Last 3 Months',
  'This Year',
];

const TOPICS = [
  'All Topics',
  'Crop Disease',
  'Weather',
  'Market Prices',
  'Agronomy Tips',
  'Financial',
  'Pest Control',
  'Soil Health',
  'Livestock',
  'Water Management',
];

const LANGUAGES = [
  'All Languages',
  'English',
  'Swahili',
  'Sheng',
  'Kikuyu',
  'Luo',
];

const STATUSES = [
  'All Statuses',
  'Resolved',
  'Escalated',
  'Abandoned',
];

const PAGE_SIZES = [10, 20, 50, 100];

// ─── Utilities ────────────────────────────────────────────────────────────────

const fmtNum = (n) => Number(n).toLocaleString();

const fmtPct = (n) => `${Number(n).toFixed(1)}%`;

const fmtStatCount = (n) => {
  const v = Number(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
};

function downloadCSV(filename, headers, rows) {
  const lines = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))];
  const blob  = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildSummaryParams(dateRange, topic, language) {
  const params = new URLSearchParams();
  params.append('dateRange', dateRange);
  if (topic    !== 'All Topics')    params.append('topic',    topic);
  if (language !== 'All Languages') params.append('language', language);
  return params;
}

function buildDetailedParams({ dateRange, topic, language, status, searchFarmer, page, pageSize, sortCol, sortDir }) {
  const params = new URLSearchParams();
  params.append('dateRange', dateRange);
  if (topic         !== 'All Topics')    params.append('topic',    topic);
  if (language      !== 'All Languages') params.append('language', language);
  if (status        !== 'All Statuses') params.append('status',   status);
  if (searchFarmer) params.append('farmer', searchFarmer);
  params.append('page',     page);
  params.append('pageSize', pageSize);
  params.append('sortCol',  sortCol);
  params.append('sortDir',  sortDir);
  return params;
}

// ─── Mock data (mirrors ChatbotInsights.jsx mock data) ───────────────────────

const MOCK_SUMMARY_ROWS = [
  { topic: 'Crop Disease',    conversations: 1240, resolved: 1112, escalated: 68,  avgTurns: 5.2, topSubtopic: 'Fall Armyworm',      sharePct: 24.5 },
  { topic: 'Weather',         conversations: 980,  resolved: 921,  escalated: 24,  avgTurns: 2.8, topSubtopic: 'Rainfall Forecast',   sharePct: 19.4 },
  { topic: 'Market Prices',   conversations: 870,  resolved: 827,  escalated: 17,  avgTurns: 3.1, topSubtopic: 'Maize Prices',        sharePct: 17.2 },
  { topic: 'Agronomy Tips',   conversations: 740,  resolved: 688,  escalated: 29,  avgTurns: 6.4, topSubtopic: 'Fertiliser Timing',   sharePct: 14.6 },
  { topic: 'Financial',       conversations: 530,  resolved: 461,  escalated: 53,  avgTurns: 4.9, topSubtopic: 'Agri-loan Rates',     sharePct: 10.5 },
  { topic: 'Pest Control',    conversations: 460,  resolved: 422,  escalated: 21,  avgTurns: 4.3, topSubtopic: 'Aphid Management',    sharePct: 9.1  },
  { topic: 'Soil Health',     conversations: 380,  resolved: 361,  escalated: 8,   avgTurns: 3.7, topSubtopic: 'Soil pH Testing',     sharePct: 7.5  },
  { topic: 'Livestock',       conversations: 290,  resolved: 248,  escalated: 31,  avgTurns: 5.8, topSubtopic: 'Cattle Vaccinations', sharePct: 5.7  },
  { topic: 'Water Management',conversations: 110,  resolved: 99,   escalated: 4,   avgTurns: 2.9, topSubtopic: 'Irrigation Setup',    sharePct: 2.2  },
];

const MOCK_DETAILED_ROWS = Array.from({ length: 94 }, (_, i) => {
  const topics = ['Crop Disease', 'Weather', 'Market Prices', 'Agronomy Tips', 'Financial', 'Pest Control', 'Soil Health'];
  const subtopics = ['Fall Armyworm', 'Rainfall Forecast', 'Maize Prices', 'Fertiliser Timing', 'Agri-loan Rates', 'Aphid Management', 'Soil pH Testing'];
  const languages = ['English', 'Swahili', 'Sheng', 'Kikuyu', 'Luo'];
  const statuses = ['Resolved', 'Resolved', 'Resolved', 'Escalated', 'Abandoned'];
  const titles = [
    'Help with fall armyworm on maize',
    'Rainfall forecast for next week',
    'Current maize prices in Kisumu',
    'Best time to apply fertiliser',
    'How to apply for agri-loan',
    'Controlling aphids on cabbage',
    'Soil pH for bean farming',
  ];

  const topicIdx    = i % topics.length;
  const startDate   = new Date(2025, 7, 1 + (i % 26));
  const lastActive  = new Date(startDate.getTime() + (i % 5) * 3_600_000);

  return {
    id:          i + 1,
    farmerId:    `FRN-${String(2024001 + i).padStart(7, '0')}`,
    farmerName:  ['Mercy Masika', 'James Wilson', 'Priya Patel', 'Ahmed Hassan', 'Buoy Bouy'][i % 5],
    title:       titles[topicIdx],
    topic:       topics[topicIdx],
    subtopic:    subtopics[topicIdx],
    turns:       3 + (i % 9),
    language:    languages[i % languages.length],
    startedAt:   startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    lastActive:  lastActive.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    status:      statuses[i % statuses.length],
  };
});

const MOCK_STATS = {
  totalConversations: 5600,
  resolutionRate:     94.2,
  escalationRate:     8.3,
  avgTurnDepth:       4.7,
  mostActiveTopic:    'Crop Disease',
  avgDailyVolume:     187,
};

// ─── Shared icons ─────────────────────────────────────────────────────────────

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) {
    return (
      <svg className="sort-icon sort-idle" width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M7 10l5-5 5 5H7zm0 4l5 5 5-5H7z" fill="currentColor" />
      </svg>
    );
  }
  return sortDir === 'asc' ? (
    <svg className="sort-icon sort-active" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M7 14l5-5 5 5H7z" fill="currentColor" />
    </svg>
  ) : (
    <svg className="sort-icon sort-active" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
    </svg>
  );
};

const ExportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor" />
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z" fill="currentColor" />
  </svg>
);

const SearchIcon = () => (
  <svg className="search-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
  </svg>
);

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const cls =
    status === 'Resolved'  ? 'chatbot-badge-resolved'  :
    status === 'Escalated' ? 'chatbot-badge-escalated' :
                             'chatbot-badge-abandoned';
  return <span className={`chatbot-status-badge ${cls}`}>{status}</span>;
};

// ─── Summary Report ───────────────────────────────────────────────────────────

const SummaryReport = ({ topics }) => {
  const [dateRange,   setDateRange]   = useState('This Year');
  const [topicFilter, setTopicFilter] = useState('All Topics');
  const [langFilter,  setLangFilter]  = useState('All Languages');
  const [sortCol,     setSortCol]     = useState('conversations');
  const [sortDir,     setSortDir]     = useState('desc');
  const [summaryData, setSummaryData] = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = buildSummaryParams(dateRange, topicFilter, langFilter);

        const [summaryRes, statsRes] = await Promise.allSettled([
          apiFetch(`${API_BASE}/chatbot/report/summary?${params.toString()}`),
          apiFetch(`${API_BASE}/chatbot/stats?${params.toString()}`),
        ]);

        if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
          const json = await summaryRes.value.json();
          setSummaryData(Array.isArray(json) ? json : (json.data ?? []));
        } else {
          setSummaryData(MOCK_SUMMARY_ROWS);
        }

        if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
          setStats(await statsRes.value.json());
        } else {
          setStats(MOCK_STATS);
        }
      } catch (err) {
        setError(err.message);
        setSummaryData(MOCK_SUMMARY_ROWS);
        setStats(MOCK_STATS);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [dateRange, topicFilter, langFilter]);

  const sorted = useMemo(() => {
    return [...summaryData].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [summaryData, sortCol, sortDir]);

  const totals = useMemo(() => {
    const totalConvs = summaryData.reduce((s, r) => s + r.conversations, 0);
    return {
      conversations: totalConvs,
      resolved:      summaryData.reduce((s, r) => s + r.resolved,   0),
      escalated:     summaryData.reduce((s, r) => s + r.escalated,  0),
      avgTurns:      summaryData.length
        ? (summaryData.reduce((s, r) => s + r.avgTurns, 0) / summaryData.length).toFixed(1)
        : '0.0',
    };
  }, [summaryData]);

  const liveStats = {
    totalConversations: stats?.total_conversations ?? stats?.totalConversations ?? totals.conversations,
    resolutionRate:     stats?.resolution_rate     ?? stats?.resolutionRate     ?? (totals.conversations ? ((totals.resolved / totals.conversations) * 100).toFixed(1) : 0),
    escalationRate:     stats?.escalation_rate     ?? stats?.escalationRate     ?? (totals.conversations ? ((totals.escalated / totals.conversations) * 100).toFixed(1) : 0),
    avgTurnDepth:       stats?.avg_turn_depth      ?? stats?.avgTurnDepth       ?? totals.avgTurns,
    mostActiveTopic:    stats?.most_active_topic   ?? stats?.mostActiveTopic    ?? (summaryData.length ? summaryData.reduce((a, b) => a.conversations > b.conversations ? a : b, summaryData[0])?.topic : '—'),
    avgDailyVolume:     stats?.avg_daily_volume    ?? stats?.avgDailyVolume     ?? MOCK_STATS.avgDailyVolume,
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleExport = () => {
    const headers = [
      'S.No', 'Topic', 'Conversations', 'Resolved', 'Escalated',
      'Avg Turns', 'Most Common Sub-topic', 'Share %',
    ];
    const rows = sorted.map((r, i) => [
      i + 1, r.topic, r.conversations, r.resolved, r.escalated,
      r.avgTurns, r.topSubtopic, r.sharePct,
    ]);
    downloadCSV('chatbot-insights-summary.csv', headers, rows);
  };

  const statCards = [
    {
      label: 'Total Conversations',
      value: loading ? '…' : fmtStatCount(liveStats.totalConversations),
      mod: 'chatbot-stat-green',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Resolution Rate',
      value: loading ? '…' : fmtPct(liveStats.resolutionRate),
      mod: 'chatbot-stat-blue',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Escalation Rate',
      value: loading ? '…' : fmtPct(liveStats.escalationRate),
      mod: 'chatbot-stat-red',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Avg Turn Depth',
      value: loading ? '…' : `${liveStats.avgTurnDepth} turns`,
      mod: 'chatbot-stat-amber',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Most Active Topic',
      value: loading ? '…' : liveStats.mostActiveTopic,
      mod: 'chatbot-stat-purple',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Avg Daily Volume',
      value: loading ? '…' : fmtStatCount(liveStats.avgDailyVolume),
      mod: 'chatbot-stat-teal',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="currentColor" />
        </svg>
      ),
    },
  ];

  const summaryColumns = [
    { key: 'sno',          label: 'S. No',                  sortable: false },
    { key: 'topic',        label: 'Topic',                  sortable: true  },
    { key: 'conversations',label: 'Conversations',          sortable: true  },
    { key: 'resolved',     label: 'Resolved',               sortable: true  },
    { key: 'escalated',    label: 'Escalated',              sortable: true  },
    { key: 'avgTurns',     label: 'Avg Turns',              sortable: true  },
    { key: 'topSubtopic',  label: 'Most Common Sub-topic',  sortable: true  },
    { key: 'sharePct',     label: 'Share %',                sortable: true  },
  ];

  return (
    <div className="chatbot-report-section">

      {/* ── Filters ── */}
      <div className="chatbot-summary-filter-bar">
        <div className="chatbot-filter-group">
          <div className="filter-field">
            <label className="filter-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="currentColor" />
              </svg>
              Date Range
            </label>
            <select className="filter-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
              {DATE_RANGES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          <div className="filter-field">
            <label className="filter-label">Topic</label>
            <select className="filter-select" value={topicFilter} onChange={e => setTopicFilter(e.target.value)}>
              {topics.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="filter-field">
            <label className="filter-label">Language</label>
            <select className="filter-select" value={langFilter} onChange={e => setLangFilter(e.target.value)}>
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <button className="export-btn" onClick={handleExport} disabled={loading || summaryData.length === 0}>
          <ExportIcon /> Export CSV
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="chatbot-stat-cards">
        {statCards.map(card => (
          <div key={card.label} className={`chatbot-stat-card ${card.mod}`}>
            <div className="chatbot-stat-icon-wrap">{card.icon}</div>
            <div className="chatbot-stat-body">
              <span className="chatbot-stat-value">{card.value}</span>
              <span className="chatbot-stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Summary table ── */}
      <div className="report-table-wrapper">
        {loading ? (
          <div className="table-status-msg">Loading data…</div>
        ) : error ? (
          <div className="table-status-msg table-status-error">Failed to load data: {error}</div>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                {summaryColumns.map(col => (
                  <th
                    key={col.key}
                    className={col.sortable ? 'sortable-th' : ''}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="th-content">
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={summaryColumns.length} className="empty-table-msg">
                    No records match the selected filters.
                  </td>
                </tr>
              ) : (
                sorted.map((row, i) => (
                  <tr key={row.topic} className="table-data-row">
                    <td>{i + 1}</td>
                    <td><span className="chatbot-topic-label">{row.topic}</span></td>
                    <td>{fmtNum(row.conversations)}</td>
                    <td>
                      <span className="chatbot-resolved-count">{fmtNum(row.resolved)}</span>
                    </td>
                    <td>
                      <span className="chatbot-escalated-count">{fmtNum(row.escalated)}</span>
                    </td>
                    <td>{Number(row.avgTurns).toFixed(1)}</td>
                    <td>
                      <span className="chatbot-subtopic-badge">{row.topSubtopic}</span>
                    </td>
                    <td>{Number(row.sharePct).toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                <tr className="table-totals-row">
                  <td colSpan={2}>Total / Average</td>
                  <td>{fmtNum(totals.conversations)}</td>
                  <td>{fmtNum(totals.resolved)}</td>
                  <td>{fmtNum(totals.escalated)}</td>
                  <td>{totals.avgTurns}</td>
                  <td>—</td>
                  <td>100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
};

// ─── Detailed Report ──────────────────────────────────────────────────────────

const DetailedReport = ({ topics }) => {
  const [dateRange,     setDateRange]     = useState('Last 30 Days');
  const [topicFilter,   setTopicFilter]   = useState('All Topics');
  const [langFilter,    setLangFilter]    = useState('All Languages');
  const [statusFilter,  setStatusFilter]  = useState('All Statuses');
  const [searchFarmer,  setSearchFarmer]  = useState('');
  const [sortCol,       setSortCol]       = useState('id');
  const [sortDir,       setSortDir]       = useState('asc');
  const [page,          setPage]          = useState(1);
  const [pageSize,      setPageSize]      = useState(10);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [detailedData, setDetailedData] = useState([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchFarmer); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchFarmer]);

  useEffect(() => {
    const fetchDetailed = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = buildDetailedParams({
          dateRange, topic: topicFilter, language: langFilter,
          status: statusFilter, searchFarmer: debouncedSearch,
          page, pageSize, sortCol, sortDir,
        });

        let records = null;
        let total   = 0;

        try {
          const res = await apiFetch(`${API_BASE}/chatbot/report/detailed?${params.toString()}`);
          if (res.ok) {
            const json = await res.json();
            records = Array.isArray(json) ? json : (json.data ?? null);
            total   = Array.isArray(json) ? json.length : (json.total ?? json.count ?? (records ?? []).length);
          }
        } catch (_) {}

        if (records === null) {
          /* Fall back to mock data with client-side filtering */
          let filtered = MOCK_DETAILED_ROWS.filter(r => {
            if (topicFilter  !== 'All Topics'    && r.topic    !== topicFilter)  return false;
            if (langFilter   !== 'All Languages' && r.language !== langFilter)   return false;
            if (statusFilter !== 'All Statuses'  && r.status   !== statusFilter) return false;
            if (debouncedSearch && !r.farmerId.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
                !r.farmerName.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
            return true;
          });
          total   = filtered.length;
          const start = (page - 1) * pageSize;
          records = filtered.slice(start, start + pageSize);
        }

        setDetailedData(records);
        setTotalCount(total);
      } catch (err) {
        setError(err.message);
        setDetailedData([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };
    fetchDetailed();
  }, [dateRange, topicFilter, langFilter, statusFilter, debouncedSearch, sortCol, sortDir, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const onDropdownChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const handleExport = async () => {
    try {
      const params = buildDetailedParams({
        dateRange, topic: topicFilter, language: langFilter,
        status: statusFilter, searchFarmer: debouncedSearch,
        page: 1, pageSize: 100000, sortCol, sortDir,
      });

      let allData = null;
      try {
        const res = await apiFetch(`${API_BASE}/chatbot/report/detailed?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          allData = Array.isArray(json) ? json : (json.data ?? null);
        }
      } catch (_) {}

      if (allData === null) {
        allData = MOCK_DETAILED_ROWS.filter(r => {
          if (topicFilter  !== 'All Topics'    && r.topic    !== topicFilter)  return false;
          if (langFilter   !== 'All Languages' && r.language !== langFilter)   return false;
          if (statusFilter !== 'All Statuses'  && r.status   !== statusFilter) return false;
          if (debouncedSearch && !r.farmerId.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
              !r.farmerName.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
          return true;
        });
      }

      const headers = [
        'S.No', 'Farmer ID', 'Farmer Name', 'Title', 'Topic', 'Sub-topic',
        'Turns', 'Language', 'Started', 'Last Active', 'Status',
      ];
      const rows = allData.map((r, i) => [
        i + 1, r.farmerId ?? r.farmer_id, r.farmerName ?? r.farmer_name,
        r.title, r.topic, r.subtopic ?? r.sub_topic,
        r.turns, r.language,
        r.startedAt ?? r.started_at, r.lastActive ?? r.last_active, r.status,
      ]);
      downloadCSV('chatbot-insights-detailed.csv', headers, rows);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const detailedColumns = [
    { key: 'id',         label: '#'            },
    { key: 'farmerId',   label: 'Farmer ID'    },
    { key: 'title',      label: 'Title'        },
    { key: 'topic',      label: 'Topic'        },
    { key: 'subtopic',   label: 'Sub-topic'    },
    { key: 'turns',      label: 'Turns'        },
    { key: 'language',   label: 'Language'     },
    { key: 'startedAt',  label: 'Started'      },
    { key: 'lastActive', label: 'Last Active'  },
    { key: 'status',     label: 'Status'       },
  ];

  return (
    <div className="chatbot-report-section">

      {/* ── Filters panel ── */}
      <div className="chatbot-filters-panel">
        <div className="filters-panel-header">
          <FilterIcon />
          Filters
        </div>

        <div className="filters-row">
          <div className="filter-field">
            <label className="filter-label">Date Range</label>
            <select className="filter-select" value={dateRange} onChange={onDropdownChange(setDateRange)}>
              {DATE_RANGES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-label">Topic</label>
            <select className="filter-select" value={topicFilter} onChange={onDropdownChange(setTopicFilter)}>
              {topics.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-label">Language</label>
            <select className="filter-select" value={langFilter} onChange={onDropdownChange(setLangFilter)}>
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-label">Status</label>
            <select className="filter-select" value={statusFilter} onChange={onDropdownChange(setStatusFilter)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="filters-divider" />

        <div className="filters-row">
          <div className="filter-field">
            <label className="filter-label">Search by Farmer ID or Name</label>
            <div className="search-input-wrap">
              <SearchIcon />
              <input
                type="text"
                className="filter-input"
                placeholder="e.g. FRN-2024001 or Mercy…"
                value={searchFarmer}
                onChange={e => setSearchFarmer(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="report-toolbar">
        <span className="result-count">
          Showing <strong>{detailedData.length}</strong> of <strong>{totalCount}</strong> conversations
        </span>
        <div className="toolbar-right">
          <label className="filter-label">Rows per page</label>
          <select
            className="filter-select filter-select-sm"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button className="export-btn" onClick={handleExport} disabled={loading || totalCount === 0}>
            <ExportIcon /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Detailed table ── */}
      <div className="report-table-wrapper">
        {loading ? (
          <div className="table-status-msg">Loading data…</div>
        ) : error ? (
          <div className="table-status-msg table-status-error">Failed to load data: {error}</div>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                {detailedColumns.map(col => (
                  <th key={col.key} className="sortable-th" onClick={() => handleSort(col.key)}>
                    <span className="th-content">
                      {col.label}
                      <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailedData.length === 0 ? (
                <tr>
                  <td colSpan={detailedColumns.length} className="empty-table-msg">
                    No conversations match the selected filters.
                  </td>
                </tr>
              ) : (
                detailedData.map((row, i) => (
                  <tr key={row.id ?? i} className="table-data-row">
                    <td>{(page - 1) * pageSize + i + 1}</td>
                    <td className="monospace-cell">{row.farmerId ?? row.farmer_id}</td>
                    <td className="chatbot-title-cell">{row.title}</td>
                    <td><span className="chatbot-topic-badge">{row.topic}</span></td>
                    <td>{row.subtopic ?? row.sub_topic}</td>
                    <td>{row.turns}</td>
                    <td>{row.language}</td>
                    <td className="chatbot-date-cell">{row.startedAt ?? row.started_at}</td>
                    <td className="chatbot-date-cell">{row.lastActive ?? row.last_active}</td>
                    <td><StatusBadge status={row.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      <div className="pagination-bar">
        <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(1)}>&#171;</button>
        <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>&#8249;</button>
        <span className="pagination-info">Page {page} of {totalPages}</span>
        <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>&#8250;</button>
        <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>&#187;</button>
      </div>
    </div>
  );
};

// ─── Page shell ───────────────────────────────────────────────────────────────

const ChatbotInsightsReport = () => {
  const [activeView, setActiveView] = useState('summary');
  const [topics,     setTopics]     = useState(TOPICS);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await apiFetch(`${API_BASE}/chatbot/report/topics`);
        if (res.ok) {
          const json = await res.json();
          const raw  = Array.isArray(json) ? json : (json.topics ?? json.data ?? []);
          const list = raw
            .map(item => typeof item === 'string' ? item : (item?.topic ?? item?.name ?? item?.label))
            .filter(Boolean);
          if (list.length) setTopics(['All Topics', ...list]);
        } else {
          console.error('Failed to fetch chatbot topics:', res.status, res.statusText);
        }
      } catch (err) {
        console.error('Failed to fetch chatbot topics:', err);
        /* keep fallback TOPICS */
      }
    };
    fetchTopics();
  }, []);

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content chatbot-report-page">

          {/* ── Page header ── */}
          <div className="report-page-header">
            <div className="report-page-title-group">
              <h1 className="report-page-title">Chatbot Insights Report</h1>
              <p className="report-page-subtitle">
                Analyse AI conversation performance, query topics, escalation trends, and farmer engagement by period
              </p>
            </div>

            {/* ── Report type dropdown ── */}
            <div className="report-type-dropdown-wrap">
              <label className="report-type-dropdown-label">Report Type</label>
              <div className="report-type-select-wrap">
                <svg className="report-type-select-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor" />
                </svg>
                <select
                  className="report-type-select"
                  value={activeView}
                  onChange={e => setActiveView(e.target.value)}
                >
                  <option value="summary">Summary Report</option>
                  <option value="detailed">Detailed Report</option>
                </select>
                <svg className="report-type-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>

          {activeView === 'summary' ? <SummaryReport topics={topics} /> : <DetailedReport topics={topics} />}
        </div>
      </div>
    </div>
  );
};

export default ChatbotInsightsReport;
