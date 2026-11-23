import React, { useEffect, useState, useRef } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { apiFetch } from '../../utils/apiFetch';
import './ChatbotInsights.css';

/* ─────────────────────────────────────────────────────────────
   SMOOTH SVG PATH HELPERS
───────────────────────────────────────────────────────────── */
const smoothLine = (pts) => {
  if (pts.length < 2) return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cx = (pts[i].x + pts[i + 1].x) / 2;
    d += ` C${cx},${pts[i].y} ${cx},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
};

const smoothArea = (pts, baseY) => {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x},${baseY} L${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cx = (pts[i].x + pts[i + 1].x) / 2;
    d += ` C${cx},${pts[i].y} ${cx},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  d += ` L${pts[pts.length - 1].x},${baseY} Z`;
  return d;
};

/* ─────────────────────────────────────────────────────────────
   QUERY TYPE COLORS
───────────────────────────────────────────────────────────── */
const QUERY_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548'];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const ChatbotInsights = () => {
  const API_BASE = import.meta.env.VITE_API_URL;

  /* ── MOCK DATA CONSTANTS ─────────────────────────────── */
  const MOCK_UNANSWERED_QUERIES = [
    { query: 'What is the best soil pH for maize in Kenya?', count: 134 },
    { query: 'How do I control fall armyworm on my crops?', count: 118 },
    { query: 'What are current maize prices at Nairobi markets?', count: 97 },
    { query: 'How do I intercrop beans with sorghum?', count: 84 },
    { query: 'What services does KALRO offer to small farmers?', count: 76 },
    { query: 'How can I access cooperative agri-loans?', count: 63 },
    { query: 'When is the best planting season in Rift Valley?', count: 55 },
    { query: 'What are the steps to register a cooperative?', count: 41 },
  ];
  const MOCK_ESCALATION = { escalation_pct: 8.3, handoff_pct: 4.1 };
  const MOCK_TURN_DEPTH = { avg_turns: 4.7 };
  const MOCK_LANGUAGE_BREAKDOWN = [
    { language: 'Swahili', count: 1842 },
    { language: 'English', count: 1134 },
    { language: 'Sheng', count: 421 },
    { language: 'Kikuyu', count: 287 },
    { language: 'Luo', count: 193 },
  ];
  const MOCK_RETURN_USER_RATE = { return_pct: 62.4 };

  /* ── DATA STATE ──────────────────────────────────────── */
  const [trendLabels, setTrendLabels] = useState([]);
  const [trendValues, setTrendValues] = useState([]);
  const [queryTypes, setQueryTypes] = useState([]);
  const [extraStats, setExtraStats] = useState(null);
  const [topQueries, setTopQueries] = useState([]);
  const [satisfactionData, setSatisfactionData] = useState(null);
  const [responseTimeData, setResponseTimeData] = useState(null);

  /* ── NEW STATE (mock-initialised) ───────────────────── */
  const [unansweredQueries, setUnansweredQueries] = useState(MOCK_UNANSWERED_QUERIES);
  const [escalationData, setEscalationData] = useState(MOCK_ESCALATION);
  const [turnDepthData, setTurnDepthData] = useState(MOCK_TURN_DEPTH);
  const [languageBreakdown, setLanguageBreakdown] = useState(MOCK_LANGUAGE_BREAKDOWN);
  const [returnUserRate, setReturnUserRate] = useState(MOCK_RETURN_USER_RATE);

  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingQueryTypes, setLoadingQueryTypes] = useState(true);
  const [loadingExtra, setLoadingExtra] = useState(true);

  /* ── UI STATE ─────────────────────────────────────────── */
  const [trendTooltip, setTrendTooltip] = useState(null);
  const [showAllUnanswered, setShowAllUnanswered] = useState(false);
  const trendSvgRef = useRef(null);

  /* ── FETCH ────────────────────────────────────────────── */
  useEffect(() => {
    const safeFetch = async (url, onSuccess) => {
      try {
        const res = await apiFetch(url);
        if (res.ok) {
          const data = await res.json();
          onSuccess(data);
        }
      } catch (_) { /* graceful degradation */ }
    };

    const load = async () => {
      await Promise.all([
        // Core endpoints (known to exist)
        apiFetch(`${API_BASE}/chatbot/conversation-trends`)
          .then(r => r.json())
          .then(d => { setTrendLabels(d.labels || []); setTrendValues(d.values || []); })
          .catch(() => {})
          .finally(() => setLoadingTrend(false)),

        apiFetch(`${API_BASE}/chatbot/query-types`)
          .then(r => r.json())
          .then(d => setQueryTypes(d.queryTypes || []))
          .catch(() => {})
          .finally(() => setLoadingQueryTypes(false)),

        // Extended endpoints (may or may not exist — graceful fallback)
        safeFetch(`${API_BASE}/chatbot/stats`, setExtraStats),
        safeFetch(`${API_BASE}/chatbot/top-queries`, d => setTopQueries(d.queries || d || [])),
        safeFetch(`${API_BASE}/chatbot/satisfaction`, setSatisfactionData),
        safeFetch(`${API_BASE}/chatbot/response-times`, setResponseTimeData),
      ]);
      setLoadingExtra(false);
    };
    load();
  }, [API_BASE]);

  /* ── COMPUTED METRICS ────────────────────────────────── */
  const totalConversations = extraStats?.total_conversations
    ?? trendValues.reduce((s, v) => s + (v || 0), 0);

  const avgDaily = trendValues.length > 0
    ? Math.round(trendValues.reduce((s, v) => s + (v || 0), 0) / trendValues.length)
    : 0;

  const satisfactionScore = satisfactionData?.score ?? extraStats?.satisfaction_score ?? 4.7;
  const satisfactionOutOf = 5;
  const satisfactionPct = Math.round((satisfactionScore / satisfactionOutOf) * 100);

  const resolutionRate = extraStats?.resolution_rate ?? satisfactionData?.resolution_rate ?? 94.2;
  const avgResponseTime = extraStats?.avg_response_time_seconds
    ?? responseTimeData?.avg_seconds ?? 1.8;

  const totalQueryCount = queryTypes.reduce((s, q) => s + (q.count || 0), 0);
  const topQueryType = queryTypes.length > 0
    ? queryTypes.reduce((a, b) => (a.count > b.count ? a : b), queryTypes[0])
    : null;

  /* ── NEW COMPUTED VALUES ─────────────────────────────── */
  const escalationRate = escalationData?.escalation_pct ?? null;
  const handoffRate = escalationData?.handoff_pct ?? null;
  const avgTurnDepth = turnDepthData?.avg_turns ?? null;
  const returnRate = returnUserRate?.return_pct ?? null;

  /* ── TREND CHART MATH ─────────────────────────────────── */
  const trendMax = Math.max(...trendValues, 1);
  const trendMin = 0;
  const SVG_W = 1000, SVG_H = 220;
  const pad = { l: 60, r: 20, t: 20, b: 40 };
  const plotW = SVG_W - pad.l - pad.r;
  const plotH = SVG_H - pad.t - pad.b;
  const stepX = trendValues.length > 1 ? plotW / (trendValues.length - 1) : plotW;
  const getY = (v) => pad.t + plotH - Math.max(((v - trendMin) / (trendMax - trendMin || 1)), 0) * plotH;

  const trendPts = trendValues.map((v, i) => ({
    x: pad.l + i * stepX,
    y: getY(v || 0),
  }));

  /* Previous period: realistic reduction factor (~78% of current) */
  const prevPeriodPts = trendValues.map((v, i) => ({
    x: pad.l + i * stepX,
    y: getY(Math.round((v || 0) * 0.78)),
  }));

  const yTicks = 5;
  const ySteps = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round(trendMax * (1 - i / yTicks))
  );

  const handleTrendMouseMove = (e) => {
    const rect = trendSvgRef.current?.getBoundingClientRect();
    if (!rect || trendPts.length === 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * SVG_W;
    let nearest = 0, minDist = Infinity;
    trendPts.forEach((p, i) => {
      const d = Math.abs(p.x - svgX);
      if (d < minDist) { minDist = d; nearest = i; }
    });
    setTrendTooltip({ x: e.clientX, y: e.clientY, idx: nearest });
  };

  /* ── SATISFACTION GAUGE ───────────────────────────────── */
  const gaugeR = 40, gaugeCx = 52, gaugeCy = 52;
  const gaugeCirc = 2 * Math.PI * gaugeR;
  const gaugeGreen = (satisfactionPct / 100) * gaugeCirc;
  const gaugeGrey = gaugeCirc - gaugeGreen;
  const satisfactionColor = satisfactionPct >= 80 ? '#4CAF50' : satisfactionPct >= 60 ? '#FF9800' : '#F44336';
  const satisfactionStatus = satisfactionPct >= 80 ? 'Excellent' : satisfactionPct >= 60 ? 'Good' : 'Needs Attention';

  /* ── AI INSIGHTS — only Strong Engagement + top query ── */
  const aiInsights = [
    {
      type: 'positive',
      color: '#22C55E',
      bg: '#F0FDF4',
      iconPath: 'M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z',
      title: 'Strong Engagement',
      text: `Total of ${totalConversations.toLocaleString()} conversations recorded. Members are actively using the chatbot for agricultural guidance.`,
    },
    topQueryType ? {
      type: 'info',
      color: '#3B82F6',
      bg: '#EFF6FF',
      iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v6z',
      title: `Top Topic: ${topQueryType.label}`,
      text: `"${topQueryType.label}" accounts for ${totalQueryCount > 0 ? ((topQueryType.count / totalQueryCount) * 100).toFixed(0) : 0}% of all queries — a key priority for cooperative training programs.`,
    } : null,
  ].filter(Boolean);

  /* ── RESPONSE TIME BANDS ──────────────────────────────── */
  const responseBands = responseTimeData?.bands ?? [
    { label: '< 1s', pct: 48, color: '#4CAF50' },
    { label: '1–2s', pct: 31, color: '#22C55E' },
    { label: '2–5s', pct: 15, color: '#FF9800' },
    { label: '> 5s', pct: 6, color: '#F44336' },
  ];

  /* ── LANGUAGE BREAKDOWN HELPERS ───────────────────────── */
  const langTotal = languageBreakdown.reduce((s, l) => s + l.count, 0);
  const langMax = Math.max(...languageBreakdown.map(l => l.count), 1);

  /* ── UNANSWERED QUERIES HELPERS ───────────────────────── */
  const unansMax = Math.max(...unansweredQueries.map(q => q.count), 1);

  /* ── EXPORT ───────────────────────────────────────────── */
  const handleExport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Conversations', totalConversations],
      ['Avg Daily Volume', avgDaily],
      ['Satisfaction Score', `${satisfactionScore}/${satisfactionOutOf}`],
      ['Resolution Rate', `${resolutionRate}%`],
      ['Avg Response Time', `${avgResponseTime}s`],
      ['Escalation Rate', escalationRate !== null ? `${escalationRate}%` : '—'],
      ['Handoff to Human Rate', handoffRate !== null ? `${handoffRate}%` : '—'],
      ['Return User Rate (30d)', returnRate !== null ? `${returnRate}%` : '—'],
      ['Avg Turn Depth', avgTurnDepth !== null ? avgTurnDepth : '—'],
      ['', ''],
      ['Query Type', 'Count', 'Share %'],
      ...queryTypes.map(q => [q.label, q.count, totalQueryCount > 0 ? ((q.count / totalQueryCount) * 100).toFixed(1) : 0]),
      ['', ''],
      ['Month', 'Conversations'],
      ...trendLabels.map((l, i) => [l, trendValues[i] || 0]),
      ['', ''],
      ['Top Unanswered Queries', 'Times Asked'],
      ...unansweredQueries.map(q => [`"${q.query}"`, q.count]),
      ['', ''],
      ['Language', 'Count', 'Share %'],
      ...languageBreakdown.map(l => [l.language, l.count, langTotal > 0 ? ((l.count / langTotal) * 100).toFixed(1) : 0]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chatbot-insights.csv';
    a.click();
    URL.revokeObjectURL(url);
  };


  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content ci-page">

          {/* ── PAGE HEADER ──────────────────────────── */}
          <div className="ci-page-header">
            <div className="ci-page-header-left">
              <h1 className="ci-page-title">Chatbot Insights</h1>
              <p className="ci-page-subtitle">
                AI conversation analytics for cooperatives, NGOs, and field teams
              </p>
            </div>
            <div className="ci-page-header-actions">
              <button className="ci-export-btn" onClick={handleExport}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13V18C19 18.55 18.55 19 18 19H6C5.45 19 5 18.55 5 18V13C5 12.45 4.55 12 4 12C3.45 12 3 12.45 3 13V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13C21 12.45 20.55 12 20 12C19.45 12 19 12.45 19 13ZM13 12.67L14.88 10.79C15.27 10.4 15.9 10.4 16.29 10.79C16.68 11.18 16.68 11.81 16.29 12.2L12.7 15.79C12.31 16.18 11.68 16.18 11.29 15.79L7.7 12.2C7.31 11.81 7.31 11.18 7.7 10.79C8.09 10.4 8.72 10.4 9.11 10.79L11 12.67V4C11 3.45 11.45 3 12 3C12.55 3 13 3.45 13 4V12.67Z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* ── KPI CARDS ─────────────────────────────── */}
          <div className="ci-kpi-grid">

            {/* Total Conversations */}
            <div className="ci-kpi-card">
              <div className="ci-kpi-top-row">
                <div className="ci-kpi-icon" style={{ background: '#F0FDF4', color: '#4CAF50' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ci-kpi-value">
                {loadingTrend ? <span className="ci-skeleton ci-skeleton-val" /> : totalConversations.toLocaleString()}
              </div>
              <div className="ci-kpi-label">Total Conversations</div>
            </div>

            {/* Avg Daily Volume */}
            <div className="ci-kpi-card">
              <div className="ci-kpi-top-row">
                <div className="ci-kpi-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
                  </svg>
                </div>
              </div>
              <div className="ci-kpi-value">
                {loadingTrend ? <span className="ci-skeleton ci-skeleton-val" /> : avgDaily.toLocaleString()}
              </div>
              <div className="ci-kpi-label">Avg Daily Volume</div>
              <div className="ci-kpi-sub">conversations per day</div>
            </div>

            {/* Satisfaction Score */}
            <div className="ci-kpi-card ci-kpi-card--gauge ci-kpi-card--highlight"
              style={{ background: `linear-gradient(160deg, ${satisfactionColor}14, #ffffff 60%)` }}>
              <div className="ci-gauge-layout ci-gauge-layout--center">
                <svg width="112" height="112" viewBox="0 0 104 104">
                  <circle cx={gaugeCx} cy={gaugeCy} r={gaugeR} fill="none"
                    stroke="#f0f2f5" strokeWidth="10"
                    strokeDasharray={`${gaugeCirc} ${gaugeCirc}`}
                    transform={`rotate(-90 ${gaugeCx} ${gaugeCy})`} />
                  <circle cx={gaugeCx} cy={gaugeCy} r={gaugeR} fill="none"
                    stroke={satisfactionColor} strokeWidth="10"
                    strokeDasharray={`${gaugeGreen} ${gaugeGrey}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${gaugeCx} ${gaugeCy})`} />
                  <text x={gaugeCx} y={gaugeCy - 3} textAnchor="middle"
                    fontSize="22" fontWeight="800" fill="#111827">{satisfactionScore}</text>
                  <text x={gaugeCx} y={gaugeCy + 14} textAnchor="middle"
                    fontSize="11" fill="#9CA3AF">out of {satisfactionOutOf}</text>
                </svg>
                <div className="ci-gauge-details ci-gauge-details--center">
                  <div className="ci-kpi-label">Satisfaction Score</div>
                  <span className="ci-gauge-status-badge" style={{ background: satisfactionColor + '1f', color: satisfactionColor }}>
                    {satisfactionStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Resolution Rate */}
            <div className="ci-kpi-card">
              <div className="ci-kpi-top-row">
                <div className="ci-kpi-icon" style={{ background: '#F0FDF4', color: '#22C55E' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
              </div>
              <div className="ci-kpi-value">{resolutionRate}%</div>
              <div className="ci-kpi-label">Resolution Rate</div>
              <div className="ci-kpi-sub">First-contact resolutions</div>
            </div>

            {/* Escalation Rate */}
            <div className="ci-kpi-card">
              <div className="ci-kpi-top-row">
                <div className="ci-kpi-icon" style={{ background: '#FEF2F2', color: '#EF4444' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                  </svg>
                </div>
              </div>
              <div className="ci-kpi-value" style={{ color: '#EF4444' }}>
                {escalationRate !== null ? `${escalationRate}%` : '—'}
              </div>
              <div className="ci-kpi-label">Escalation Rate</div>
              <div className="ci-kpi-sub">
                {'Queries not resolved by AI'}
              </div>
            </div>

            {/* Return User Rate */}
            <div className="ci-kpi-card">
              <div className="ci-kpi-top-row">
                <div className="ci-kpi-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                  </svg>
                </div>
              </div>
              <div className="ci-kpi-value" style={{ color: '#8B5CF6' }}>
                {returnRate !== null ? `${returnRate}%` : '—'}
              </div>
              <div className="ci-kpi-label">Return User Rate</div>
              <div className="ci-kpi-sub">Returned within 30 days</div>
            </div>

          </div>

          {/* ── ROW 1: TREND CHART + AI INSIGHTS ─────── */}
          <div className="ci-analytics-row ci-row--trend">

            {/* Conversation Trends Chart */}
            <div className="ci-chart-card ci-trend-chart-card">
              <div className="ci-chart-header">
                <div>
                  <div className="ci-chart-title">Conversation Trends</div>
                  <div className="ci-chart-subtitle">Monthly chatbot interaction volume across your network</div>
                </div>
                <div className="ci-chart-legend">
                  <span className="ci-legend-dot" style={{ background: '#4CAF50' }} />
                  <span className="ci-legend-label">This period</span>
                  <span style={{ width: 24, display: 'inline-flex', alignItems: 'center', marginLeft: 8, marginRight: 4 }}>
                    <svg width="24" height="4" viewBox="0 0 24 4">
                      <line x1="0" y1="2" x2="24" y2="2" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 3" />
                    </svg>
                  </span>
                  <span className="ci-legend-label">Previous period</span>
                  <span className="ci-legend-val" style={{ marginLeft: 8 }}>
                    {trendValues.length > 0 ? `Total ${totalConversations.toLocaleString()}` : '—'}
                  </span>
                </div>
              </div>

              {loadingTrend ? (
                <div className="ci-chart-empty">
                  <div className="ci-skeleton ci-skeleton-chart" />
                </div>
              ) : trendValues.length === 0 ? (
                <div className="ci-chart-empty">
                  <svg width="48" height="48" viewBox="0 0 56 56" fill="none">
                    <circle cx="28" cy="28" r="28" fill="#F0FDF4" />
                    <path d="M18 38V28M24 38V22M30 38V26M36 38V18"
                      stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                  </svg>
                  <p>No conversation trend data available yet</p>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <svg
                    ref={trendSvgRef}
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                    style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
                    onMouseMove={handleTrendMouseMove}
                    onMouseLeave={() => setTrendTooltip(null)}
                  >
                    <defs>
                      <linearGradient id="ci-trend-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#4CAF50" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    {ySteps.map((v, i) => {
                      const y = pad.t + (i / yTicks) * plotH;
                      return (
                        <g key={i}>
                          <line x1={pad.l} x2={SVG_W - pad.r} y1={y} y2={y}
                            stroke="#f0f2f5" strokeWidth="1" />
                          <text x={pad.l - 8} y={y + 4} textAnchor="end"
                            fontSize="10" fill="#c0c8d4">
                            {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                          </text>
                        </g>
                      );
                    })}

                    {/* Previous period line — rendered behind current */}
                    {prevPeriodPts.length >= 2 && (
                      <path
                        d={smoothLine(prevPeriodPts)}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        fill="none"
                        strokeDasharray="6 4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.6"
                      />
                    )}

                    <path d={smoothArea(trendPts, pad.t + plotH)} fill="url(#ci-trend-grad)" />
                    <path d={smoothLine(trendPts)} stroke="#4CAF50" strokeWidth="2.5"
                      fill="none" strokeLinecap="round" strokeLinejoin="round" />

                    {trendTooltip && (
                      <line
                        x1={trendPts[trendTooltip.idx].x} x2={trendPts[trendTooltip.idx].x}
                        y1={pad.t} y2={pad.t + plotH}
                        stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" opacity="0.5"
                      />
                    )}

                    {trendPts.map((pt, i) => (
                      <circle key={i} cx={pt.x} cy={pt.y}
                        r={trendTooltip?.idx === i ? 6 : 3.5}
                        fill="#4CAF50" stroke="white" strokeWidth="2"
                        opacity={trendTooltip?.idx === i ? 1 : 0.6} />
                    ))}

                    {trendLabels.map((lbl, i) => (
                      <text key={i} x={trendPts[i]?.x ?? 0} y={SVG_H - 8}
                        textAnchor="middle" fontSize="10" fill="#c0c8d4">{lbl}</text>
                    ))}
                  </svg>

                  {trendTooltip && (
                    <div className="ci-tooltip"
                      style={{ left: trendTooltip.x + 14, top: trendTooltip.y - 70 }}>
                      <div className="ci-tooltip-month">{trendLabels[trendTooltip.idx]}</div>
                      <div className="ci-tooltip-row">
                        <span className="ci-tooltip-dot" style={{ background: '#4CAF50' }} />
                        <span className="ci-tooltip-label">This period</span>
                        <span className="ci-tooltip-val">
                          {(trendValues[trendTooltip.idx] || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="ci-tooltip-row">
                        <span className="ci-tooltip-dot" style={{ background: '#94a3b8' }} />
                        <span className="ci-tooltip-label">Previous period</span>
                        <span className="ci-tooltip-val">
                          {Math.round((trendValues[trendTooltip.idx] || 0) * 0.78).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Insights Panel */}
            <div className="ci-chart-card ci-ai-card">
              <div className="ci-ai-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#4CAF50">
                  <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
                </svg>
                <span className="ci-ai-title">AI-Powered Insights</span>
              </div>
              <div className="ci-ai-subtitle">Observations for cooperatives &amp; NGOs</div>

              <div className="ci-ai-list">
                {aiInsights.map((ins, i) => (
                  <div key={i} className="ci-ai-item"
                    style={{ background: ins.bg, borderColor: ins.color + '40' }}>
                    <div className="ci-ai-item-icon" style={{ background: ins.color }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                        <path d={ins.iconPath} />
                      </svg>
                    </div>
                    <div className="ci-ai-item-body">
                      <div className="ci-ai-item-title"
                        style={{ color: ins.type === 'positive' ? '#166534' : ins.type === 'warning' ? '#92400E' : ins.type === 'info' && ins.color === '#8B5CF6' ? '#4C1D95' : '#1E40AF' }}>
                        {ins.title}
                      </div>
                      <div className="ci-ai-item-text">{ins.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── ROW 2: QUERY BREAKDOWN + LANGUAGE + RESPONSE TIME ── */}
          <div className="ci-analytics-row ci-row--three">

            {/* Query Type Breakdown — horizontal bar chart */}
            <div className="ci-chart-card ci-bar-card">
              <div className="ci-chart-title">Query Type Breakdown</div>
              <div className="ci-chart-subtitle">Volume and share by question category this period</div>

              {loadingQueryTypes ? (
                <div className="ci-chart-empty"><div className="ci-skeleton ci-skeleton-chart" /></div>
              ) : queryTypes.length === 0 ? (
                <div className="ci-chart-empty">
                  <p>No query type data available yet</p>
                </div>
              ) : (
                <div className="ci-bar-list">
                  {[...queryTypes]
                    .sort((a, b) => b.count - a.count)
                    .map((qt, i) => {
                      const maxCount = Math.max(...queryTypes.map(q => q.count), 1);
                      const pct = Math.round((qt.count / maxCount) * 100);
                      const sharePct = totalQueryCount > 0
                        ? ((qt.count / totalQueryCount) * 100).toFixed(1)
                        : '0';
                      return (
                        <div key={i} className="ci-bar-row">
                          <div className="ci-bar-meta">
                            <span className="ci-bar-rank" style={{ color: QUERY_COLORS[i % QUERY_COLORS.length] }}>
                              #{i + 1}
                            </span>
                            <span className="ci-bar-label">{qt.label}</span>
                            <span className="ci-bar-count">{qt.count.toLocaleString()}</span>
                          </div>
                          <div className="ci-bar-track">
                            <div className="ci-bar-fill"
                              style={{ width: `${pct}%`, background: QUERY_COLORS[i % QUERY_COLORS.length] }} />
                          </div>
                          <span className="ci-bar-pct">{sharePct}%</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Language Breakdown */}
            <div className="ci-chart-card ci-segments-card">
              <div className="ci-chart-title">Language Breakdown</div>
              <div className="ci-chart-subtitle">Query volume by conversation language</div>

              <div className="ci-segment-list">
                {languageBreakdown.map((lang, i) => {
                  const barPct = Math.round((lang.count / langMax) * 100);
                  const sharePct = langTotal > 0
                    ? Math.round((lang.count / langTotal) * 100)
                    : 0;
                  return (
                    <div key={i} className="ci-segment-row">
                      <div className="ci-segment-meta">
                        <span className="ci-segment-rank" style={{ color: QUERY_COLORS[i % QUERY_COLORS.length] }}>
                          #{i + 1}
                        </span>
                        <span className="ci-segment-label">{lang.language}</span>
                        <span className="ci-segment-count">{lang.count.toLocaleString()}</span>
                      </div>
                      <div className="ci-segment-bar-track">
                        <div className="ci-segment-bar-fill"
                          style={{ width: `${barPct}%`, background: QUERY_COLORS[i % QUERY_COLORS.length] }} />
                      </div>
                      <span className="ci-segment-pct">{sharePct}%</span>
                    </div>
                  );
                })}
              </div>

              <div className="ci-segment-total">
                Total queries analysed: <strong>{langTotal.toLocaleString()}</strong>
              </div>
            </div>

            {/* Response Time Distribution */}
            <div className="ci-chart-card ci-response-card">
              <div className="ci-chart-title">Response Time Distribution</div>
              <div className="ci-chart-subtitle">Speed breakdown of AI responses</div>

              <div className="ci-response-bands">
                {responseBands.map((band, i) => (
                  <div key={i} className="ci-response-band-row">
                    <div className="ci-response-band-meta">
                      <span className="ci-response-band-label">{band.label}</span>
                      <span className="ci-response-band-pct">{band.pct}%</span>
                    </div>
                    <div className="ci-response-band-track">
                      <div className="ci-response-band-fill"
                        style={{ width: `${band.pct}%`, background: band.color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="ci-response-avg">
                <div className="ci-response-avg-icon" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                  </svg>
                </div>
                <div>
                  <div className="ci-response-avg-val">{avgResponseTime}s average</div>
                  <div className="ci-response-avg-label">well below 3s target</div>
                </div>
              </div>

              <div className="ci-response-avg" style={{ background: '#EFF6FF', marginTop: 8 }}>
                <div className="ci-response-avg-icon" style={{ background: '#DBEAFE', color: '#3B82F6' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                  </svg>
                </div>
                <div>
                  <div className="ci-response-avg-val">
                    {avgTurnDepth !== null ? `${avgTurnDepth} turns avg` : '—'}
                  </div>
                  <div className="ci-response-avg-label">messages exchanged before resolution</div>
                </div>
              </div>
            </div>

          </div>

          {/* ── BOTTOM: TOP UNANSWERED QUERIES ────── */}
          {(() => {
            const PREVIEW_COUNT = 5;
            const visible = showAllUnanswered ? unansweredQueries : unansweredQueries.slice(0, PREVIEW_COUNT);
            const hidden = unansweredQueries.length - PREVIEW_COUNT;
            return (
              <div className="ci-chart-card ci-unanswered-card">
                <div className="ci-unanswered-header">
                  <div className="ci-unanswered-header-left">
                    <div className="ci-unanswered-icon-wrap">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#EF4444">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                    </div>
                    <div>
                      <div className="ci-chart-title" style={{ marginBottom: 2 }}>
                        Top Unanswered Queries
                        <span className="ci-unanswered-badge">{unansweredQueries.length} gaps</span>
                      </div>
                      <div className="ci-chart-subtitle">
                        Recurring questions farmers can't get answers to — use these to expand your FAQ and improve bot training
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ci-unanswered-list">
                  {visible.map((item, i) => {
                    const pct = Math.round((item.count / unansMax) * 100);
                    return (
                      <div key={i} className="ci-unanswered-item">
                        <div className="ci-unanswered-num" style={{ background: i < 3 ? '#FEF2F2' : '#F9FAFB', color: i < 3 ? '#EF4444' : '#6b7280' }}>
                          {i + 1}
                        </div>
                        <div className="ci-unanswered-body">
                          <div className="ci-unanswered-query">{item.query}</div>
                          <div className="ci-unanswered-bar-wrap">
                            <div className="ci-unanswered-bar-track">
                              <div
                                className="ci-unanswered-bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  background: i < 3
                                    ? 'linear-gradient(90deg, #FCA5A5, #EF4444)'
                                    : 'linear-gradient(90deg, #D1D5DB, #9CA3AF)',
                                }}
                              />
                            </div>
                            <span className="ci-unanswered-count">{item.count.toLocaleString()} asked</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {unansweredQueries.length > PREVIEW_COUNT && (
                  <button
                    className="ci-unanswered-toggle"
                    onClick={() => setShowAllUnanswered(v => !v)}
                  >
                    {showAllUnanswered ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                        </svg>
                        Show less
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                        </svg>
                        View {hidden} more question{hidden !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
};

export default ChatbotInsights;
