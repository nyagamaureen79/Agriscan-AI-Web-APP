import React, { useState } from 'react';
import '../styles/UsageAnalytics.css';

// ─── Static Data ─────────────────────────────────────────────

const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 Days', key: '7d' },
  { label: 'Last 30 Days', key: '30d' },
  { label: 'Last 3 Months', key: '3m' },
  { label: 'Last 6 Months', key: '6m' },
  { label: 'This Year', key: '1y' },
];

const ACTIVITY_DATA = {
  '7d': [
    { label: 'Mon', users: 1820, sessions: 3240 },
    { label: 'Tue', users: 2100, sessions: 3890 },
    { label: 'Wed', users: 1950, sessions: 3540 },
    { label: 'Thu', users: 2350, sessions: 4210 },
    { label: 'Fri', users: 2543, sessions: 4580 },
    { label: 'Sat', users: 1680, sessions: 2940 },
    { label: 'Sun', users: 1420, sessions: 2560 },
  ],
  '30d': [
    { label: 'W1', users: 1650, sessions: 2980 },
    { label: 'W2', users: 1920, sessions: 3420 },
    { label: 'W3', users: 2180, sessions: 3890 },
    { label: 'W4', users: 2543, sessions: 4580 },
  ],
  '3m': [
    { label: 'Nov', users: 1240, sessions: 2180 },
    { label: 'Dec', users: 1680, sessions: 2940 },
    { label: 'Jan', users: 2543, sessions: 4580 },
  ],
  '6m': [
    { label: 'Aug', users: 890, sessions: 1560 },
    { label: 'Sep', users: 1120, sessions: 1980 },
    { label: 'Oct', users: 1450, sessions: 2560 },
    { label: 'Nov', users: 1820, sessions: 3240 },
    { label: 'Dec', users: 2180, sessions: 3890 },
    { label: 'Jan', users: 2543, sessions: 4580 },
  ],
  '1y': [
    { label: 'Feb', users: 620, sessions: 1080 },
    { label: 'Mar', users: 780, sessions: 1360 },
    { label: 'Apr', users: 890, sessions: 1560 },
    { label: 'May', users: 1020, sessions: 1780 },
    { label: 'Jun', users: 1180, sessions: 2080 },
    { label: 'Jul', users: 1350, sessions: 2380 },
    { label: 'Aug', users: 1520, sessions: 2680 },
    { label: 'Sep', users: 1720, sessions: 3040 },
    { label: 'Oct', users: 1890, sessions: 3340 },
    { label: 'Nov', users: 2120, sessions: 3740 },
    { label: 'Dec', users: 2340, sessions: 4140 },
    { label: 'Jan', users: 2543, sessions: 4580 },
  ],
};

const MODULE_USAGE = [
  { name: 'Disease Detection', sessions: 8250, color: '#4CAF50' },
  { name: 'Chatbot', sessions: 7890, color: '#2196F3' },
  { name: 'Farmers Data', sessions: 6540, color: '#00BCD4' },
  { name: 'Carbon Analytics', sessions: 5120, color: '#FF9800' },
  { name: 'Financial Tracking', sessions: 4890, color: '#9C27B0' },
  { name: 'Knowledge Base', sessions: 2340, color: '#F44336' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const HEATMAP_DATA = DAYS.map((_, di) =>
  Array.from({ length: 24 }, (__, h) => {
    const isWeekday = di < 5;
    const isWork = h >= 8 && h <= 18;
    const isPeak = (h >= 9 && h <= 11) || (h >= 14 && h <= 16);
    let v = isWeekday ? 22 : 6;
    if (isWork) v += 28;
    if (isPeak) v += 28;
    v += ((di * 7 + h) % 14);
    return Math.min(100, v);
  })
);

const SESSION_DURATION = [
  { bucket: '0–2m', count: 420 },
  { bucket: '2–5m', count: 890 },
  { bucket: '5–10m', count: 1340 },
  { bucket: '10–20m', count: 1820 },
  { bucket: '20–30m', count: 1450 },
  { bucket: '30–60m', count: 980 },
  { bucket: '60m+', count: 340 },
];

const RETENTION_DATA = [
  { label: 'Wk 0', rate: 100 },
  { label: 'Wk 1', rate: 68 },
  { label: 'Wk 2', rate: 52 },
  { label: 'Wk 3', rate: 43 },
  { label: 'Wk 4', rate: 38 },
  { label: 'Wk 5', rate: 34 },
  { label: 'Wk 6', rate: 31 },
  { label: 'Wk 7', rate: 29 },
];

const AI_INSIGHTS = [
  {
    icon: '🏆',
    title: 'Most Used Module',
    text: 'Disease Detection leads with 8,250 sessions this month — 23% above the platform average.',
    accent: '#4CAF50',
  },
  {
    icon: '⏰',
    title: 'Peak Usage Times',
    text: 'Highest activity is weekdays 9–11 AM and 2–4 PM. Schedule maintenance outside these windows.',
    accent: '#2196F3',
  },
  {
    icon: '⚠️',
    title: 'Underutilized Feature',
    text: 'Knowledge Base has only 2,340 sessions (8.4%). Surfacing it prominently could lift adoption by 40%+.',
    accent: '#FF9800',
  },
  {
    icon: '📈',
    title: 'Retention Trend',
    text: 'Week-1 retention is 68% — strong. Week-4 drops to 38%. Re-engagement nudges at Day 14 could add 6–10 pts.',
    accent: '#9C27B0',
  },
  {
    icon: '💡',
    title: 'Recommendation',
    text: 'Add onboarding tooltips to Carbon Analytics & Financial Tracking — both show under 20% adoption among new users.',
    accent: '#00BCD4',
  },
];

const KPI_CARDS = [
  { label: 'Active Users', value: '2,543', trend: '+12%', up: true, color: '#4CAF50' },
  { label: 'Total Sessions', value: '18,294', trend: '+8%', up: true, color: '#2196F3' },
  { label: 'Avg Session Duration', value: '14m 32s', trend: '-3%', up: false, color: '#FF9800' },
  { label: 'Avg Time per User', value: '2h 18m', trend: '+5%', up: true, color: '#9C27B0' },
  { label: 'Retention Rate', value: '73%', trend: '+2%', up: true, color: '#00BCD4' },
];

// ─── Journey Nodes & Links ────────────────────────────────────

const JN = [
  { id: 'login',   label: 'Login',             x: 30,  y: 152, w: 80,  h: 36, count: 2543, color: '#4CAF50' },
  { id: 'dash',    label: 'Dashboard',          x: 185, y: 152, w: 110, h: 36, count: 2280, color: '#245421' },
  { id: 'disease', label: 'Disease Detection',  x: 380, y: 60,  w: 140, h: 36, count: 1420, color: '#4CAF50' },
  { id: 'chatbot', label: 'Chatbot',            x: 380, y: 152, w: 100, h: 36, count: 1180, color: '#2196F3' },
  { id: 'carbon',  label: 'Carbon Analytics',   x: 380, y: 244, w: 130, h: 36, count: 680,  color: '#FF9800' },
  { id: 'scan',    label: 'Scan Result',        x: 590, y: 60,  w: 110, h: 36, count: 1280, color: '#4CAF50' },
  { id: 'ai',      label: 'AI Response',        x: 590, y: 152, w: 110, h: 36, count: 1050, color: '#2196F3' },
];

const JOURNEY_LINKS = [
  { from: JN[0], to: JN[1], value: 2280 },
  { from: JN[1], to: JN[2], value: 1420 },
  { from: JN[1], to: JN[3], value: 1180 },
  { from: JN[1], to: JN[4], value: 680  },
  { from: JN[2], to: JN[5], value: 1280 },
  { from: JN[3], to: JN[6], value: 1050 },
];

// ─── SVG Helpers ──────────────────────────────────────────────

function buildLinePath(data, key, pL, pT, cW, cH, maxVal) {
  if (data.length < 2 || maxVal === 0) return '';
  return data.map((d, i) => {
    const x = pL + (i / (data.length - 1)) * cW;
    const y = pT + (1 - d[key] / maxVal) * cH;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

function buildAreaPath(data, key, pL, pT, cW, cH, maxVal) {
  if (data.length < 2 || maxVal === 0) return '';
  const pts = data.map((d, i) => ({
    x: pL + (i / (data.length - 1)) * cW,
    y: pT + (1 - d[key] / maxVal) * cH,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const base = pT + cH;
  return `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${base} L ${pts[0].x.toFixed(1)} ${base} Z`;
}

function donutSlicePath(cx, cy, r, ri, start, end) {
  const toRad = a => (a - 90) * (Math.PI / 180);
  const cos = Math.cos, sin = Math.sin;
  const s = toRad(start), e = toRad(end);
  const x1 = cx + r * cos(s),   y1 = cy + r * sin(s);
  const x2 = cx + r * cos(e),   y2 = cy + r * sin(e);
  const xi1 = cx + ri * cos(e), yi1 = cy + ri * sin(e);
  const xi2 = cx + ri * cos(s), yi2 = cy + ri * sin(s);
  const lg = end - start > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${xi1.toFixed(2)} ${yi1.toFixed(2)} A ${ri} ${ri} 0 ${lg} 0 ${xi2.toFixed(2)} ${yi2.toFixed(2)} Z`;
}

function buildDonutSegments() {
  const total = MODULE_USAGE.reduce((s, d) => s + d.sessions, 0);
  let angle = 0;
  return MODULE_USAGE.map(d => {
    const sweep = (d.sessions / total) * 360;
    const seg = { ...d, start: angle, end: angle + sweep, pct: ((d.sessions / total) * 100).toFixed(1) };
    angle += sweep;
    return seg;
  });
}

function journeyPath(from, to) {
  const fx = from.x + from.w;
  const fy = from.y + from.h / 2;
  const tx = to.x;
  const ty = to.y + to.h / 2;
  const mx = (fx + tx) / 2;
  return `M ${fx} ${fy} C ${mx} ${fy} ${mx} ${ty} ${tx} ${ty}`;
}

function heatColor(v) {
  const opacity = 0.05 + (v / 100) * 0.9;
  return `rgba(76, 175, 80, ${opacity.toFixed(2)})`;
}

function fmtNum(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const DONUT_SEGMENTS = buildDonutSegments();

// ─── Chart Constants ──────────────────────────────────────────

// Activity line chart
const LW = 540, LH = 220, LPL = 52, LPT = 20, LPR = 20, LPB = 32;
const lcW = LW - LPL - LPR;
const lcH = LH - LPT - LPB;

// Session duration chart
const SW = 360, SH = 180, SPL = 44, SPT = 16, SPB = 28;
const scW = SW - SPL - 12;
const scH = SH - SPT - SPB;

// Retention chart
const RW = 360, RH = 180, RPL = 44, RPT = 16, RPB = 28;
const rcW = RW - RPL - 12;
const rcH = RH - RPT - RPB;

// ─── Component ────────────────────────────────────────────────

const UsageAnalytics = () => {
  const [dateRange, setDateRange]       = useState('7d');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [activityHover, setActivityHover] = useState(null);
  const [moduleHover, setModuleHover]   = useState(null);
  const [heatHover, setHeatHover]       = useState(null);
  const [donutHover, setDonutHover]     = useState(null);
  const [sessionHover, setSessionHover] = useState(null);
  const [retHover, setRetHover]         = useState(null);
  const [journeyHover, setJourneyHover] = useState(null);
  const [mousePos, setMousePos]         = useState({ x: 0, y: 0 });

  const activityData = ACTIVITY_DATA[dateRange];

  // Y-axis ticks for activity chart
  const maxAct = Math.max(...activityData.flatMap(d => [d.users, d.sessions]), 1);
  const yStep = Math.ceil(maxAct / 5 / 500) * 500 || 500;
  const yTicks = Array.from({ length: 6 }, (_, i) => i * yStep);
  const maxActY = yTicks[yTicks.length - 1];

  const getActX = (i) => LPL + (i / Math.max(activityData.length - 1, 1)) * lcW;
  const getActY = (v) => LPT + (1 - v / maxActY) * lcH;

  const getRetX = (i) => RPL + (i / (RETENTION_DATA.length - 1)) * rcW;
  const getRetY = (v) => RPT + (1 - v / 100) * rcH;

  const maxSess = Math.max(...SESSION_DURATION.map(d => d.count), 1);

  const selectedLabel = DATE_RANGE_OPTIONS.find(o => o.key === dateRange)?.label;

  const handleActivityMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = rect.width / LW;
    const mx = (e.clientX - rect.left) / scale;
    const raw = (mx - LPL) / lcW * (activityData.length - 1);
    const idx = Math.max(0, Math.min(activityData.length - 1, Math.round(raw)));
    setActivityHover({ idx, x: getActX(idx) });
  };

  const handleRetMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = rect.width / RW;
    const mx = (e.clientX - rect.left) / scale;
    const raw = (mx - RPL) / rcW * (RETENTION_DATA.length - 1);
    const idx = Math.max(0, Math.min(RETENTION_DATA.length - 1, Math.round(raw)));
    setRetHover({
      idx,
      x: getRetX(idx),
      y: getRetY(RETENTION_DATA[idx].rate),
      ...RETENTION_DATA[idx],
    });
  };

  const trackMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });

  return (
    <div className="ua-wrapper">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="ua-page-header">
        <div>
          <h2 className="ua-page-title">Usage Analytics</h2>
          <p className="ua-page-subtitle">Interactive insights into platform usage, engagement, and feature adoption</p>
        </div>
        <div className="ua-date-picker-container">
          <button className="ua-date-btn" onClick={() => setShowDateMenu(v => !v)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V8h14v11zm-7-7h5v5h-5z" fill="currentColor"/>
            </svg>
            {selectedLabel}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M7 10l5 5 5-5H7z" fill="currentColor"/>
            </svg>
          </button>
          {showDateMenu && (
            <div className="ua-date-dropdown">
              {DATE_RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  className={`ua-date-option ${dateRange === opt.key ? 'ua-date-option--active' : ''}`}
                  onClick={() => { setDateRange(opt.key); setShowDateMenu(false); setActivityHover(null); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── AI-Generated Insights ────────────────────────────── */}
      <section className="ua-section">
        <div className="ua-section-heading">
          <span className="ua-ai-badge">AI</span>
          <h3 className="ua-section-title">AI-Generated Insights</h3>
        </div>
        <div className="ua-insights-grid">
          {AI_INSIGHTS.map((ins, i) => (
            <div key={i} className="ua-insight-card">
              <div className="ua-insight-title">{ins.title}</div>
              <div className="ua-insight-text">{ins.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div className="ua-kpi-grid">
        {KPI_CARDS.map((kpi, i) => (
          <div key={i} className="ua-kpi-card">
            <div className="ua-kpi-bar" style={{ background: kpi.color }} />
            <div className="ua-kpi-value" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="ua-kpi-label">{kpi.label}</div>
            <div className={`ua-kpi-trend ${kpi.up ? 'ua-kpi-trend--up' : 'ua-kpi-trend--down'}`}>
              {kpi.up ? '▲' : '▼'} {kpi.trend}
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Activity Trends + Module Usage ────────────── */}
      <div className="ua-charts-row">

        {/* Activity Line Chart */}
        <div className="ua-chart-card ua-chart--wide">
          <div className="ua-chart-head">
            <h4 className="ua-chart-title">User Activity Trends</h4>
            <div className="ua-legend-row">
              <span className="ua-legend-dot" style={{ background: '#4CAF50' }} /> Active Users
              <span className="ua-legend-dot ua-legend-dot--spaced" style={{ background: '#2196F3' }} /> Sessions
            </div>
          </div>
          <svg
            viewBox={`0 0 ${LW} ${LH}`}
            className="ua-svg"
            onMouseMove={handleActivityMouseMove}
            onMouseLeave={() => setActivityHover(null)}
          >
            <defs>
              <linearGradient id="ua-grad-users" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#4CAF50" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="ua-grad-sessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2196F3" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2196F3" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Y gridlines + labels */}
            {yTicks.map((tick, i) => {
              const y = getActY(tick);
              return (
                <g key={i}>
                  <line x1={LPL} y1={y} x2={LW - LPR} y2={y} stroke="#E1E7EF" strokeWidth="1" />
                  <text x={LPL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#65758B">
                    {fmtNum(tick)}
                  </text>
                </g>
              );
            })}

            {/* X labels */}
            {activityData.map((d, i) => (
              <text key={i} x={getActX(i)} y={LH - 6} textAnchor="middle" fontSize="10" fill="#65758B">
                {d.label}
              </text>
            ))}

            {/* Area fills */}
            <path d={buildAreaPath(activityData, 'sessions', LPL, LPT, lcW, lcH, maxActY)} fill="url(#ua-grad-sessions)" />
            <path d={buildAreaPath(activityData, 'users',    LPL, LPT, lcW, lcH, maxActY)} fill="url(#ua-grad-users)" />

            {/* Lines */}
            <path d={buildLinePath(activityData, 'sessions', LPL, LPT, lcW, lcH, maxActY)} fill="none" stroke="#2196F3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={buildLinePath(activityData, 'users',    LPL, LPT, lcW, lcH, maxActY)} fill="none" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Hover crosshair */}
            {activityHover !== null && (
              <>
                <line x1={activityHover.x} y1={LPT} x2={activityHover.x} y2={LPT + lcH} stroke="#9CA3AF" strokeWidth="1" strokeDasharray="4 3" />
                <circle cx={activityHover.x} cy={getActY(activityData[activityHover.idx].users)}    r={5} fill="#4CAF50" stroke="#fff" strokeWidth="2" />
                <circle cx={activityHover.x} cy={getActY(activityData[activityHover.idx].sessions)} r={5} fill="#2196F3" stroke="#fff" strokeWidth="2" />
              </>
            )}
          </svg>
        </div>

        {/* Module Usage Bar Chart */}
        <div className="ua-chart-card ua-chart--narrow">
          <div className="ua-chart-head">
            <h4 className="ua-chart-title">Top Modules by Usage</h4>
          </div>
          <div className="ua-module-list">
            {MODULE_USAGE.map((m, i) => {
              const pct = (m.sessions / MODULE_USAGE[0].sessions) * 100;
              return (
                <div
                  key={i}
                  className="ua-module-row"
                  onMouseEnter={(e) => { setModuleHover(m); trackMouse(e); }}
                  onMouseMove={trackMouse}
                  onMouseLeave={() => setModuleHover(null)}
                >
                  <div className="ua-module-label">{m.name}</div>
                  <div className="ua-module-track">
                    <div className="ua-module-fill" style={{ width: `${pct}%`, background: m.color }} />
                  </div>
                  <div className="ua-module-count">{(m.sessions / 1000).toFixed(1)}k</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Row 2: Heatmap + Donut ───────────────────────────── */}
      <div className="ua-charts-row">

        {/* Usage Heatmap */}
        <div className="ua-chart-card ua-chart--wide">
          <div className="ua-chart-head">
            <h4 className="ua-chart-title">Usage Heatmap — Hour &amp; Day</h4>
          </div>
          <div className="ua-heatmap-layout">
            <div className="ua-heatmap-days">
              {DAYS.map(d => <div key={d} className="ua-heatmap-day">{d}</div>)}
            </div>
            <div className="ua-heatmap-body">
              <div className="ua-heatmap-grid">
                {HEATMAP_DATA.map((row, di) =>
                  row.map((val, hi) => (
                    <div
                      key={`${di}-${hi}`}
                      className="ua-heatmap-cell"
                      style={{ background: heatColor(val) }}
                      onMouseEnter={(e) => { setHeatHover({ day: DAYS[di], hour: hi, val }); trackMouse(e); }}
                      onMouseMove={trackMouse}
                      onMouseLeave={() => setHeatHover(null)}
                    />
                  ))
                )}
              </div>
              <div className="ua-heatmap-hours">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="ua-heatmap-hour">
                    {h % 6 === 0 ? `${h}:00` : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="ua-heatmap-legend">
            <span className="ua-hm-label">Low</span>
            <div className="ua-hm-gradient" />
            <span className="ua-hm-label">High</span>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="ua-chart-card ua-chart--narrow">
          <div className="ua-chart-head">
            <h4 className="ua-chart-title">Module Distribution</h4>
          </div>
          <div className="ua-donut-wrap">
            <svg viewBox="0 0 200 200" className="ua-donut-svg">
              {DONUT_SEGMENTS.map((seg, i) => (
                <path
                  key={i}
                  d={donutSlicePath(100, 100, 88, 54, seg.start, seg.end)}
                  fill={seg.color}
                  stroke="#fff"
                  strokeWidth="1.5"
                  className="ua-donut-slice"
                  onMouseEnter={(e) => { setDonutHover(seg); trackMouse(e); }}
                  onMouseMove={trackMouse}
                  onMouseLeave={() => setDonutHover(null)}
                />
              ))}
              <text x="100" y="95"  textAnchor="middle" fontSize="20" fontWeight="700" fill="#0B0324" fontFamily="Poppins, sans-serif">18k</text>
              <text x="100" y="114" textAnchor="middle" fontSize="10" fill="#65758B"  fontFamily="Poppins, sans-serif">sessions</text>
            </svg>
            <div className="ua-donut-legend">
              {DONUT_SEGMENTS.map((seg, i) => (
                <div
                  key={i}
                  className="ua-donut-legend-item"
                  onMouseEnter={(e) => { setDonutHover(seg); trackMouse(e); }}
                  onMouseMove={trackMouse}
                  onMouseLeave={() => setDonutHover(null)}
                >
                  <span className="ua-donut-dot" style={{ background: seg.color }} />
                  <span className="ua-donut-name">{seg.name}</span>
                  <span className="ua-donut-pct">{seg.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Session Duration + Retention ─────────────── */}
      <div className="ua-charts-row">

        {/* Session Duration Distribution */}
        <div className="ua-chart-card ua-chart--half">
          <div className="ua-chart-head">
            <h4 className="ua-chart-title">Session Duration Distribution</h4>
          </div>
          <svg viewBox={`0 0 ${SW} ${SH}`} className="ua-svg">
            {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
              const y = SPT + (1 - frac) * scH;
              const tick = Math.round(frac * maxSess);
              return (
                <g key={i}>
                  <line x1={SPL} y1={y} x2={SW - 12} y2={y} stroke="#E1E7EF" strokeWidth="1" />
                  <text x={SPL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#65758B">{fmtNum(tick)}</text>
                </g>
              );
            })}
            {SESSION_DURATION.map((d, i) => {
              const slotW = scW / SESSION_DURATION.length;
              const barW = slotW - 6;
              const x = SPL + i * slotW + 3;
              const barH = (d.count / maxSess) * scH;
              const y = SPT + scH - barH;
              return (
                <g key={i}>
                  <rect
                    x={x} y={y} width={barW} height={barH}
                    fill="#4CAF50" rx="3"
                    opacity={sessionHover?.bucket === d.bucket ? 1 : 0.82}
                    className="ua-bar-rect"
                    onMouseEnter={(e) => { setSessionHover(d); trackMouse(e); }}
                    onMouseMove={trackMouse}
                    onMouseLeave={() => setSessionHover(null)}
                  />
                  <text x={x + barW / 2} y={SH - 5} textAnchor="middle" fontSize="9" fill="#65758B">{d.bucket}</text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* User Retention Chart */}
        <div className="ua-chart-card ua-chart--half">
          <div className="ua-chart-head">
            <h4 className="ua-chart-title">User Retention Over Time</h4>
          </div>
          <svg
            viewBox={`0 0 ${RW} ${RH}`}
            className="ua-svg"
            onMouseMove={handleRetMouseMove}
            onMouseLeave={() => setRetHover(null)}
          >
            <defs>
              <linearGradient id="ua-grad-ret" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9C27B0" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#9C27B0" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {[0, 25, 50, 75, 100].map((tick, i) => {
              const y = getRetY(tick);
              return (
                <g key={i}>
                  <line x1={RPL} y1={y} x2={RW - 12} y2={y} stroke="#E1E7EF" strokeWidth="1" />
                  <text x={RPL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#65758B">{tick}%</text>
                </g>
              );
            })}

            {RETENTION_DATA.map((d, i) => (
              <text key={i} x={getRetX(i)} y={RH - 4} textAnchor="middle" fontSize="9" fill="#65758B">{d.label}</text>
            ))}

            {/* Area */}
            <path
              d={(() => {
                const pts = RETENTION_DATA.map((d, i) => ({ x: getRetX(i), y: getRetY(d.rate) }));
                const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                return `${line} L ${pts[pts.length-1].x.toFixed(1)} ${getRetY(0)} L ${pts[0].x.toFixed(1)} ${getRetY(0)} Z`;
              })()}
              fill="url(#ua-grad-ret)"
            />

            {/* Line */}
            <path
              d={RETENTION_DATA.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getRetX(i).toFixed(1)} ${getRetY(d.rate).toFixed(1)}`).join(' ')}
              fill="none" stroke="#9C27B0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            />

            {/* Dots */}
            {RETENTION_DATA.map((d, i) => (
              <circle key={i} cx={getRetX(i)} cy={getRetY(d.rate)} r={4} fill="#9C27B0" stroke="#fff" strokeWidth="1.5" />
            ))}

            {/* Hover indicator */}
            {retHover && (
              <>
                <line x1={retHover.x} y1={RPT} x2={retHover.x} y2={RPT + rcH} stroke="#9CA3AF" strokeWidth="1" strokeDasharray="4 3" />
                <circle cx={retHover.x} cy={retHover.y} r={6} fill="#9C27B0" stroke="#fff" strokeWidth="2" />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* ── User Journey Flow ────────────────────────────────── */}
      <div className="ua-chart-card ua-chart--full">
        <div className="ua-chart-head">
          <h4 className="ua-chart-title">User Journey Flow</h4>
          <span className="ua-chart-subtitle">How users navigate between modules — width indicates volume</span>
        </div>
        <svg viewBox="0 0 740 340" className="ua-svg ua-journey-svg">
          {/* Column labels */}
          {[
            { x: 70,  label: 'Entry' },
            { x: 240, label: 'Dashboard' },
            { x: 450, label: 'Modules' },
            { x: 645, label: 'Detail' },
          ].map((col, i) => (
            <text key={i} x={col.x} y={24} textAnchor="middle" fontSize="10" fill="#9CA3AF" fontFamily="Poppins, sans-serif" fontWeight="500">
              {col.label}
            </text>
          ))}

          {/* Flow paths */}
          {JOURNEY_LINKS.map((link, i) => (
            <path
              key={i}
              d={journeyPath(link.from, link.to)}
              fill="none"
              stroke="#E1E7EF"
              strokeWidth={Math.max(2, (link.value / 2543) * 22)}
              opacity="0.75"
            />
          ))}

          {/* Nodes */}
          {JN.map((node, i) => (
            <g
              key={i}
              className="ua-journey-node"
              onMouseEnter={(e) => { setJourneyHover(node); trackMouse(e); }}
              onMouseMove={trackMouse}
              onMouseLeave={() => setJourneyHover(null)}
            >
              <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="8" fill={node.color} />
              <text x={node.x + node.w / 2} y={node.y + node.h / 2 + 4} textAnchor="middle" fontSize="10.5" fill="#fff" fontFamily="Poppins, sans-serif" fontWeight="500">
                {node.label}
              </text>
              <text x={node.x + node.w / 2} y={node.y + node.h + 16} textAnchor="middle" fontSize="9" fill="#65758B">
                {node.count.toLocaleString()} users
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* ── Floating Tooltips ─────────────────────────────────── */}

      {activityHover !== null && (
        <div className="ua-tooltip" style={{ left: mousePos.x + 14, top: mousePos.y - 90 }}>
          <div className="ua-tt-label">{activityData[activityHover.idx].label}</div>
          <div className="ua-tt-row">
            <span className="ua-tt-dot" style={{ background: '#4CAF50' }} />
            Active Users <strong>{activityData[activityHover.idx].users.toLocaleString()}</strong>
          </div>
          <div className="ua-tt-row">
            <span className="ua-tt-dot" style={{ background: '#2196F3' }} />
            Sessions <strong>{activityData[activityHover.idx].sessions.toLocaleString()}</strong>
          </div>
        </div>
      )}

      {moduleHover && (
        <div className="ua-tooltip" style={{ left: mousePos.x + 14, top: mousePos.y - 55 }}>
          <div className="ua-tt-label" style={{ color: moduleHover.color }}>{moduleHover.name}</div>
          <div className="ua-tt-row">Sessions <strong>{moduleHover.sessions.toLocaleString()}</strong></div>
        </div>
      )}

      {heatHover && (
        <div className="ua-tooltip" style={{ left: mousePos.x + 14, top: mousePos.y - 62 }}>
          <div className="ua-tt-label">{heatHover.day}, {heatHover.hour}:00–{heatHover.hour + 1}:00</div>
          <div className="ua-tt-row">Usage intensity <strong>{heatHover.val}%</strong></div>
        </div>
      )}

      {donutHover && (
        <div className="ua-tooltip" style={{ left: mousePos.x + 14, top: mousePos.y - 72 }}>
          <div className="ua-tt-label" style={{ color: donutHover.color }}>{donutHover.name}</div>
          <div className="ua-tt-row">Sessions <strong>{donutHover.sessions.toLocaleString()}</strong></div>
          <div className="ua-tt-row">Share <strong>{donutHover.pct}%</strong></div>
        </div>
      )}

      {sessionHover && (
        <div className="ua-tooltip" style={{ left: mousePos.x + 14, top: mousePos.y - 62 }}>
          <div className="ua-tt-label">{sessionHover.bucket}</div>
          <div className="ua-tt-row">Sessions <strong>{sessionHover.count.toLocaleString()}</strong></div>
        </div>
      )}

      {retHover && (
        <div className="ua-tooltip" style={{ left: mousePos.x + 14, top: mousePos.y - 62 }}>
          <div className="ua-tt-label">{retHover.label}</div>
          <div className="ua-tt-row">Retention <strong>{retHover.rate}%</strong></div>
        </div>
      )}

      {journeyHover && (
        <div className="ua-tooltip" style={{ left: mousePos.x + 14, top: mousePos.y - 62 }}>
          <div className="ua-tt-label" style={{ color: journeyHover.color }}>{journeyHover.label}</div>
          <div className="ua-tt-row">Users <strong>{journeyHover.count.toLocaleString()}</strong></div>
        </div>
      )}
    </div>
  );
};

export default UsageAnalytics;
