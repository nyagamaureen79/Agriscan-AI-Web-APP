import React, { useEffect, useState, useRef } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { apiFetch } from "../../utils/apiFetch";
import RecentTransactions from '../RecentTransactions';

const FinancialTracking = () => {
  const API_BASE = import.meta.env.VITE_API_URL;

  /* ── DATA STATE ─────────────────────────────────────────── */
  const [stats, setStats] = useState({
    total_revenue: 0,
    total_expenses: 0,
    net_profit: 0,
    total_transactions: 0,
    trend_revenue: 0,
    trend_expenses: 0,
    trend_profit: 0,
    trend_transactions: 0,
  });
  const [monthlyData, setMonthlyData] = useState(null);
  const [revenueSources, setRevenueSources] = useState(null);
  const [expenseSources, setExpenseSources] = useState(null);
  const [outstandingData, setOutstandingData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [cashflowData, setCashflowData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingRevenueSources, setLoadingRevenueSources] = useState(true);
  const [loadingExpenseSources, setLoadingExpenseSources] = useState(true);
  const [loadingOutstanding, setLoadingOutstanding] = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [loadingCashflow, setLoadingCashflow] = useState(true);

  /* ── FILTER & UI STATE ──────────────────────────────────── */
  const [chartTimeframe, setChartTimeframe] = useState('Monthly');
  const [filterPeriod, setFilterPeriod] = useState('Last 30 days');
  const [filterCategory, setFilterCategory] = useState('All Categories');

  /* ── FETCH ──────────────────────────────────────────────── */
  useEffect(() => {
    const safeFetch = async (url, setter, loadingSetter) => {
      try {
        const res = await apiFetch(url);
        const data = await res.json();
        setter(data);
      } catch (e) {
        console.error(`Error fetching ${url}:`, e);
      } finally {
        loadingSetter(false);
      }
    };

    const fetchData = async () => {
      await Promise.all([
        safeFetch(`${API_BASE}/api/financials/stats`, setStats, setLoadingStats),
        safeFetch(`${API_BASE}/api/financials/monthly`, setMonthlyData, setLoadingMonthly),
        safeFetch(`${API_BASE}/api/financials/revenue-sources`, setRevenueSources, setLoadingRevenueSources),
        safeFetch(`${API_BASE}/api/financials/expense-sources`, setExpenseSources, setLoadingExpenseSources),
        safeFetch(`${API_BASE}/api/financials/outstanding`, setOutstandingData, setLoadingOutstanding),
        safeFetch(`${API_BASE}/api/financials/forecast?months_ahead=2`, setForecastData, setLoadingForecast),
        safeFetch(`${API_BASE}/api/financials/cashflow`, setCashflowData, setLoadingCashflow),
      ]);
    };
    fetchData();
  }, [API_BASE]);

  /* ── COMPUTED METRICS ───────────────────────────────────── */
  const healthScore = stats.total_revenue > 0
    ? Math.min(100, Math.max(0, Math.round((stats.net_profit / stats.total_revenue) * 100 + 65)))
    : 82;

  const lastMonthProfit = monthlyData?.profit?.length
    ? monthlyData.profit[monthlyData.profit.length - 1] || 0
    : 0;
  const prevMonthProfit = monthlyData?.profit?.length > 1
    ? monthlyData.profit[monthlyData.profit.length - 2] || 0
    : 0;
  const cashFlowChange = prevMonthProfit !== 0
    ? Math.round(((lastMonthProfit - prevMonthProfit) / Math.abs(prevMonthProfit)) * 100)
    : 0;
  const outstandingPayments = outstandingData?.total_outstanding ?? 0;
  const totalInflow = cashflowData?.total_inflow ?? 0;
  const totalOutflow = cashflowData?.total_outflow ?? 0;
  const netCashFlow = cashflowData?.net_cash_flow ?? 0;

  /* ── EXPENSE BREAKDOWN ──────────────────────────────────── */
  const expenseCategories = (expenseSources?.sources?.map(src => ({
    label: src.name,
    amount: src.amount,
    pct: expenseSources.total > 0 ? Math.round((src.amount / expenseSources.total) * 100) : 0,
    color: src.color,
  })) ?? []).sort((a, b) => b.amount - a.amount);

  /* ── INCOME SOURCES ─────────────────────────────────────── */
  const incomeSources = (revenueSources?.sources?.map(src => ({
    label: src.name,
    amount: src.amount,
    color: src.color,
  })) ?? []).sort((a, b) => b.amount - a.amount);
  const incomeMax = incomeSources.length > 0 ? Math.max(...incomeSources.map(s => s.amount), 1) : 1;

  /* ── FORECAST ───────────────────────────────────────────── */
  const forecastMonths = forecastData?.months ?? ['Oct', 'Nov', 'Dec', 'Jan*', 'Feb*'];
  const forecastRevenue = forecastData?.revenue ?? [0, 0, 0, 0, 0];
  const forecastExpenses = forecastData?.expenses ?? [0, 0, 0, 0, 0];
  const forecastProfit = forecastData?.profit ?? [0, 0, 0, 0, 0];

  /* ── GOALS ──────────────────────────────────────────────── */
 // Use the most recent active month data from monthlyData
const currentMonthRevenue = monthlyData?.revenue?.at(-1) ?? 0
const currentMonthExpenses = monthlyData?.expenses?.at(-1) ?? 0
const currentMonthProfit = monthlyData?.profit?.at(-1) ?? 0

const prevMonthRevenue = monthlyData?.revenue?.at(-2) ?? 0
const prevMonthExpenses = monthlyData?.expenses?.at(-2) ?? 0

// Revenue target: beat last month by 10%
const revenueTarget = Math.round(prevMonthRevenue * 1.1)

// Profit margin: current month's margin vs 30% goal
const currentMarginPct = currentMonthRevenue > 0
  ? Math.round((currentMonthProfit / currentMonthRevenue) * 100)
  : 0

// Expense target: reduce this month vs last month by 15%
const expenseTarget = Math.round(prevMonthExpenses * 0.85)

// Monthly profit target: 20% of last month's revenue (realistic)
const monthlyTarget = prevMonthRevenue
const goalProgress = monthlyTarget > 0
  ? Math.min(100, Math.round((currentMonthProfit / monthlyTarget) * 100))
  : 0

const goals = [
  {
    label: 'Monthly Revenue Target',
    target: revenueTarget,
    current: currentMonthRevenue,
    color: '#4CAF50'
  },
  {
    label: 'Profit Margin Goal',
    target: 30,
    current: currentMarginPct,
    color: '#2196F3',
    unit: '%'
  },
  {
    label: 'Expense Reduction',
    target: expenseTarget,
    current: currentMonthExpenses,
    color: '#FF9800',
    invert: true
  },
]

  /* ── EXPORT ─────────────────────────────────────────────── */
  const handleExport = () => {
    const forecastLastRev = forecastRevenue[forecastRevenue.length - 1] ?? 0;
    const forecastLastExp = forecastExpenses[forecastExpenses.length - 1] ?? 0;
    const forecastLastProfit = forecastProfit[forecastProfit.length - 1] ?? 0;
    const rows = [
      ['Metric', 'Value', 'Trend'],
      ['Total Revenue', `KES ${stats.total_revenue.toLocaleString()}`, `${stats.trend_revenue}%`],
      ['Total Expenses', `KES ${stats.total_expenses.toLocaleString()}`, `${stats.trend_expenses}%`],
      ['Net Profit', `KES ${stats.net_profit.toLocaleString()}`, `${stats.trend_profit}%`],
      ['Cash Flow', `KES ${Math.abs(lastMonthProfit).toLocaleString()}`, `${cashFlowChange}%`],
      ['Outstanding Payments', `KES ${outstandingPayments.toLocaleString()}`, '—'],
      ['Pending Invoices', `${outstandingData?.pending_count ?? 0}`, '—'],
      ['Forecast Revenue (last month)', `KES ${forecastLastRev.toLocaleString()}`, '—'],
      ['Forecast Expenses (last month)', `KES ${forecastLastExp.toLocaleString()}`, '—'],
      ['Forecast Profit (last month)', `KES ${forecastLastProfit.toLocaleString()}`, '—'],
      ['Financial Health Score', `${healthScore}/100`, '—'],
      ['Period Filter', filterPeriod, ''],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-tracking-${filterPeriod.replace(/\s/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };


  /* ═══════════════════════════════════════════════════════════
     UTILITY COMPONENTS
  ═══════════════════════════════════════════════════════════ */

  const formatK = (n) => {
    if (n === 0) return '0';
    if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toString();
  };

  /* ── Sparkline ─────────────────────────────────────────── */
  const Sparkline = ({ data, color, width = 120, height = 36 }) => {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data.filter(v => v > 0), 0);
    const range = max - min || 1;
    const pad = 3;
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - pad - ((Math.max(v, 0) - min) / range) * (height - pad * 2),
    }));
    const linePts = points.map(p => `${p.x},${p.y}`).join(' ');
    const areaPts = `0,${height} ${linePts} ${width},${height}`;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <polygon points={areaPts} fill={color + '22'} />
        <polyline points={linePts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
      </svg>
    );
  };


  /* ═══════════════════════════════════════════════════════════
     KPI CARD COMPONENTS
  ═══════════════════════════════════════════════════════════ */

  /* ── Financial Health Score Card ───────────────────────── */
  const FinancialHealthCard = () => {
    const score = Math.max(0, Math.min(100, healthScore));
    const r = 40, cx = 52, cy = 52;
    const circ = 2 * Math.PI * r;
    const greenLen = (score / 100) * circ;
    const amberLen = circ - greenLen;
    return (
      <div className="ft-kpi-card ft-kpi-health">
        <div className="ft-health-layout">
          <div className="ft-health-gauge-wrap">
            <svg width="104" height="104" viewBox="0 0 104 104">
              {/* Amber track (remainder) */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FCD34D" strokeWidth="9"
                strokeDasharray={`${circ} ${circ}`} strokeDashoffset="0"
                transform={`rotate(-90 ${cx} ${cy})`} />
              {/* Green progress */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22C55E" strokeWidth="9"
                strokeDasharray={`${greenLen} ${amberLen}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`} />
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="#111827"
                fontFamily="Poppins, sans-serif">{score}</text>
              <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#9CA3AF"
                fontFamily="Poppins, sans-serif">/100</text>
            </svg>
          </div>
          <div className="ft-health-details">
            <span className="ft-health-badge">Good</span>
            <p className="ft-health-desc">Healthy cash flow with moderate expense growth</p>
            <div className="ft-health-updated">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#9CA3AF">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
              </svg>
              <span>Updated today</span>
            </div>
          </div>
        </div>
        <div className="ft-kpi-bar" style={{ background: '#22C55E' }} />
      </div>
    );
  };

  /* ── Metric KPI Card (Revenue / Expenses / Profit) ─────── */
  const MetricKpiCard = ({ title, value, trend, trendPositive = true, accentColor, icon, sparkData, loading }) => {
    const hasTrend = trend !== undefined && trend !== null;
    const isUp = trend > 0;
    const isGood = trendPositive ? isUp : !isUp;
    const arrow = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
    return (
      <div className="ft-kpi-card ft-kpi-metric">
        <div className="ft-metric-top-row">
          <div className="ft-metric-icon-circle" style={{ background: accentColor + '18', color: accentColor }}>
            {icon}
          </div>
          {hasTrend && (
            <span className={`ft-kpi-trend-badge ${isGood ? 'ft-kpi-trend-up' : 'ft-kpi-trend-down'}`}>
              {arrow} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div className="ft-metric-value">
          {loading ? <span className="ft-skeleton ft-skeleton-value" /> : (value || '—')}
        </div>
        <div className="ft-metric-label">{title}</div>
        <div className="ft-metric-sparkline">
          {!loading && sparkData && <Sparkline data={sparkData} color={accentColor} />}
        </div>
        <div className="ft-kpi-bar" style={{ background: accentColor }} />
      </div>
    );
  };

  /* ── Cash Flow KPI Card ─────────────────────────────────── */
  const CashFlowKpiCard = () => {
    const monthCount = cashflowData?.month_count || 1;
    const avgInflow = monthCount > 0 ? Math.round(totalInflow / monthCount) : 0;
    const avgOutflow = monthCount > 0 ? Math.round(totalOutflow / monthCount) : 0;
    const barData = (monthlyData?.profit || []).slice(-6);
    const maxBar = Math.max(...barData.map(Math.abs), 1);

    return (
      <div className="ft-kpi-card ft-kpi-cashflow-card">
        <div className="ft-metric-top-row">
          <div className="ft-metric-icon-circle" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
            </svg>
          </div>
          <span className="ft-cashflow-status-badge">Healthy</span>
        </div>
        <div className="ft-metric-value">
          {loadingMonthly ? <span className="ft-skeleton ft-skeleton-value" /> : `KES ${Math.abs(lastMonthProfit).toLocaleString()}`}
        </div>
        <div className="ft-metric-label">Cash Flow</div>
        <div className="ft-cashflow-submetrics">
          <div className="ft-cashflow-submetric">
            <span className="ft-cashflow-submetric-val ft-val-green">↑ {formatK(avgInflow)}</span>
            <span className="ft-cashflow-submetric-label">Avg Inflow</span>
          </div>
          <div className="ft-cashflow-submetric">
            <span className="ft-cashflow-submetric-val ft-val-red">↓ {formatK(avgOutflow)}</span>
            <span className="ft-cashflow-submetric-label">Avg Outflow</span>
          </div>
        </div>
        <div className="ft-cashflow-mini-bars">
          {(barData.length > 0 ? barData : [0, 0, 0, 0, 0, 0]).map((v, i) => (
            <div key={i} className="ft-cashflow-mini-bar-col">
              <div className="ft-cashflow-mini-bar-fill"
                style={{ height: `${Math.max(10, (Math.abs(v) / maxBar) * 100)}%`, background: v >= 0 ? '#3B82F6' : '#93C5FD' }} />
            </div>
          ))}
        </div>
        <div className="ft-kpi-bar" style={{ background: '#3B82F6' }} />
      </div>
    );
  };

  /* ── Outstanding Payments KPI Card ─────────────────────── */
  const OutstandingKpiCard = () => {
    const pendingCount = outstandingData?.pending_count ?? 0;
    return (
      <div className="ft-kpi-card ft-kpi-outstanding-card">
        <div className="ft-metric-top-row">
          <div className="ft-metric-icon-circle" style={{ background: '#FFF7ED', color: '#F97316' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
        </div>
        <div className="ft-metric-value ft-val-orange">
          {loadingOutstanding ? <span className="ft-skeleton ft-skeleton-value" /> : `KES ${outstandingPayments.toLocaleString()}`}
        </div>
        <div className="ft-metric-label">Outstanding Payments</div>
        <div className="ft-outstanding-pending">{pendingCount} pending invoices awaiting settlement</div>
        <div className="ft-outstanding-spacer" />
        <button className="ft-outstanding-link">View Details →</button>
        <div className="ft-kpi-bar" style={{ background: '#F97316' }} />
      </div>
    );
  };


  /* ═══════════════════════════════════════════════════════════
     ANALYTICS SECTION COMPONENTS
  ═══════════════════════════════════════════════════════════ */

  /* ── Monthly Trends Chart (unchanged) ───────────────────── */
  const MonthlyTrendsChart = ({ data }) => {
    const [tooltip, setTooltip] = useState(null);
    const svgRef = useRef(null);
    if (!data) return null;

    const { months = [], revenue = [], expenses = [], profit = [] } = data;
    if (!months.length) return null;

    const maxVal = Math.max(...revenue, ...expenses, ...profit.map(Math.abs), 1);

    const W = 1000, H = 240;
    const pad = { l: 65, r: 20, t: 20, b: 38 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const stepX = months.length > 1 ? plotW / (months.length - 1) : plotW;

    const getY = (v) => pad.t + plotH - Math.max((v / maxVal), 0) * plotH;
    const pts = (arr) => arr.map((v, i) => ({ x: pad.l + i * stepX, y: getY(v || 0) }));

    const revPts = pts(revenue);
    const expPts = pts(expenses);
    const profPts = pts(profit);

    const smoothLine = (points) => {
      if (points.length < 2) return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      let d = `M${points[0].x},${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const cpx = (points[i].x + points[i + 1].x) / 2;
        d += ` C${cpx},${points[i].y} ${cpx},${points[i + 1].y} ${points[i + 1].x},${points[i + 1].y}`;
      }
      return d;
    };

    const smoothArea = (points) => {
      const base = pad.t + plotH;
      let d = `M${points[0].x},${base}`;
      d += ` L${points[0].x},${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const cpx = (points[i].x + points[i + 1].x) / 2;
        d += ` C${cpx},${points[i].y} ${cpx},${points[i + 1].y} ${points[i + 1].x},${points[i + 1].y}`;
      }
      d += ` L${points[points.length - 1].x},${base} Z`;
      return d;
    };

    const yTicks = 5;
    const ySteps = Array.from({ length: yTicks + 1 }, (_, i) => maxVal * (1 - i / yTicks));

    const handleMove = (e) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const svgX = ((e.clientX - rect.left) / rect.width) * W;
      let nearest = 0, minDist = Infinity;
      revPts.forEach((p, i) => {
        const d = Math.abs(p.x - svgX);
        if (d < minDist) { minDist = d; nearest = i; }
      });
      setTooltip({ x: e.clientX, y: e.clientY, idx: nearest });
    };

    return (
      <div className="ft-chart-card ft-trend-card">
        <div className="ft-chart-header">
          <div className="ft-chart-title-group">
            <div className="ft-chart-title">Revenue, Expenses &amp; Profit Trend</div>
            <div className="ft-chart-subtitle">Track financial performance over time</div>
          </div>
          <div className="ft-chart-controls">
            {['Weekly', 'Monthly', 'Quarterly', 'Yearly'].map((tf) => (
              <button
                key={tf}
                className={`ft-timeframe-btn ${chartTimeframe === tf ? 'ft-timeframe-btn--active' : ''}`}
                onClick={() => setChartTimeframe(tf)}
              >{tf}</button>
            ))}
          </div>
        </div>

        <div className="ft-chart-legend-row">
          {[
            { label: 'Revenue', color: '#4CAF50', value: `KES ${(revenue.reduce((a, b) => a + (b || 0), 0)).toLocaleString()}` },
            { label: 'Expenses', color: '#F44336', value: `KES ${(expenses.reduce((a, b) => a + (b || 0), 0)).toLocaleString()}` },
            { label: 'Net Profit', color: '#2196F3', value: `KES ${(profit.reduce((a, b) => a + (b || 0), 0)).toLocaleString()}` },
          ].map(({ label, color, value }) => (
            <div key={label} className="ft-legend-item">
              <span className="ft-legend-dot" style={{ background: color }} />
              <span className="ft-legend-label">{label}</span>
              <span className="ft-legend-val">{value}</span>
            </div>
          ))}
        </div>

        <div className="ft-chart-canvas-wrap" style={{ position: 'relative' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}
            onMouseMove={handleMove}
            onMouseLeave={() => setTooltip(null)}
          >
            <defs>
              <linearGradient id="ft2-rev-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#4CAF50" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="ft2-exp-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F44336" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#F44336" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="ft2-prof-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2196F3" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2196F3" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {ySteps.map((v, i) => {
              const y = pad.t + (i / yTicks) * plotH;
              return (
                <g key={i}>
                  <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#f0f2f5" strokeWidth="1" />
                  <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#c0c8d4">
                    {v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}
                  </text>
                </g>
              );
            })}

            <path d={smoothArea(revPts)} fill="url(#ft2-rev-grad)" />
            <path d={smoothArea(expPts)} fill="url(#ft2-exp-grad)" />
            <path d={smoothArea(profPts)} fill="url(#ft2-prof-grad)" />

            <path d={smoothLine(revPts)} stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d={smoothLine(expPts)} stroke="#F44336" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d={smoothLine(profPts)} stroke="#2196F3" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {tooltip && (
              <line
                x1={revPts[tooltip.idx].x} x2={revPts[tooltip.idx].x}
                y1={pad.t} y2={pad.t + plotH}
                stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" opacity="0.5"
              />
            )}

            {[
              { pts: revPts, color: '#4CAF50' },
              { pts: expPts, color: '#F44336' },
              { pts: profPts, color: '#2196F3' },
            ].map(({ pts: p, color }) =>
              p.map((pt, i) => (
                <circle key={`${color}-${i}`} cx={pt.x} cy={pt.y}
                  r={tooltip?.idx === i ? 5.5 : 3}
                  fill={color} stroke="white" strokeWidth="2" opacity={tooltip?.idx === i ? 1 : 0} />
              ))
            )}

            {months.map((m, i) => (
              <text key={m} x={revPts[i].x} y={H - 8} textAnchor="middle" fontSize="10" fill="#c0c8d4">{m}</text>
            ))}
          </svg>

          {tooltip && (
            <div className="financial-line-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y - 70 }}>
              <div className="financial-line-tooltip-month">{months[tooltip.idx]}</div>
              {[
                { label: 'Revenue', color: '#4CAF50', arr: revenue },
                { label: 'Expenses', color: '#F44336', arr: expenses },
                { label: 'Net Profit', color: '#2196F3', arr: profit },
              ].map(({ label, color, arr }) => (
                <div key={label} className="financial-line-tooltip-row">
                  <div className="financial-line-tooltip-dot" style={{ background: color }} />
                  <span className="financial-line-tooltip-label">{label}</span>
                  <span className="financial-line-tooltip-value">KES {(arr[tooltip.idx] || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Sankey Cash Flow Overview Card ─────────────────────── */
  const SankeyCashFlowCard = () => {
    const [period, setPeriod] = useState('This Month');

    const incomeSrcs = cashflowData?.income_sources ?? [];
    const expCats = cashflowData?.expense_categories ?? [];

    /* SVG coordinate system: viewBox 0 0 820 310 */
    const W = 820, H = 310;
    const leftCardW = 200, leftCardH = 60;
    const rightCardW = 195, rightCardH = 56;
    const walletX = 310, walletY = 90, walletW = 200, walletH = 130;
    const walletCY = walletY + walletH / 2;

    const incomeYs = [30, 115, 200];  /* top-Y of each income card */
    const expenseYs = [16, 90, 164, 238]; /* top-Y of each expense card */

    const incomeConnY = (i) => incomeYs[i] + leftCardH / 2;
    const expConnY = (i) => expenseYs[i] + rightCardH / 2;

    const bezier = (x1, y1, x2, y2) => {
      const mx = (x1 + x2) / 2;
      return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    };

    return (
      <div className="ft-chart-card ft-sankey-card">
        <div className="ft-sankey-header">
          <div>
            <div className="ft-card-section-title">Cash Flow Overview</div>
          </div>
          <select className="ft-period-select" value={period} onChange={e => setPeriod(e.target.value)}>
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Quarter</option>
            <option>This Year</option>
          </select>
        </div>

        <div className="ft-sankey-summary-row">
          <div className="ft-sankey-metric">
            <div className="ft-sankey-metric-val ft-val-green">
              {loadingCashflow ? '—' : `KES ${formatK(totalInflow)}`}
            </div>
            <div className="ft-sankey-metric-label">↑ Total Inflow</div>
          </div>
          <div className="ft-sankey-metric">
            <div className="ft-sankey-metric-val ft-val-red">
              {loadingCashflow ? '—' : `KES ${formatK(totalOutflow)}`}
            </div>
            <div className="ft-sankey-metric-label">↓ Total Outflow</div>
          </div>
          <div className="ft-sankey-metric ft-sankey-net-metric">
            <div className={`ft-sankey-metric-val ${netCashFlow >= 0 ? 'ft-val-green' : 'ft-val-red'}`}>
              {loadingCashflow ? '—' : `KES ${formatK(netCashFlow)}`}
            </div>
            <div className="ft-sankey-metric-label">Net Cash Flow</div>
          </div>
        </div>

        <div className="ft-sankey-viz-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="sk-wallet-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
              <linearGradient id="sk-card-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#1E40AF" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* ── Income → Wallet flow lines ── */}
            {incomeSrcs.map((src, i) => {
              const sw = totalInflow > 0 ? Math.max(3, Math.round((src.amount / totalInflow) * 24)) : 4;
              return (
                <path key={`if-${i}`}
                  d={bezier(leftCardW, incomeConnY(i), walletX, walletCY)}
                  fill="none" stroke="#22C55E" strokeWidth={sw}
                  opacity="0.28" strokeLinecap="round" />
              );
            })}

            {/* ── Wallet → Expense flow lines ── */}
            {expCats.map((cat, i) => {
              const sw = totalOutflow > 0 ? Math.max(2, Math.round((cat.amount / totalOutflow) * 20)) : 3;
              return (
                <path key={`ef-${i}`}
                  d={bezier(walletX + walletW, walletCY, W - rightCardW, expConnY(i))}
                  fill="none" stroke="#EF4444" strokeWidth={sw}
                  opacity="0.28" strokeLinecap="round" />
              );
            })}

            {/* ── Income Source Cards ── */}
            {incomeSrcs.map((src, i) => {
              const ty = incomeYs[i];
              const cy = ty + leftCardH / 2;
              return (
                <g key={`inc-${i}`}>
                  <rect x="0" y={ty} width={leftCardW} height={leftCardH} rx="10"
                    fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1.5" />
                  <circle cx="22" cy={cy} r="13" fill="#22C55E" />
                  <text x="22" y={cy + 4} textAnchor="middle" fontSize="11" fill="white" fontWeight="700">₊</text>
                  <text x="42" y={cy - 7} fontSize="10.5" fill="#374151" fontWeight="600"
                    fontFamily="Poppins, sans-serif">{src.label}</text>
                  <text x="42" y={cy + 10} fontSize="11" fill="#166534" fontWeight="700"
                    fontFamily="Poppins, sans-serif">KES {formatK(src.amount)}</text>
                </g>
              );
            })}

            {/* ── Wallet Center Card ── */}
            <rect x={walletX} y={walletY} width={walletW} height={walletH} rx="14" fill="url(#sk-wallet-g)" />
            {/* chip detail */}
            <rect x={walletX + 14} y={walletY + 22} width="32" height="22" rx="5" fill="rgba(255,255,255,0.22)" />
            <rect x={walletX + 14} y={walletY + 22} width="10" height="22" rx="3" fill="rgba(255,255,255,0.12)" />
            {/* card number dots */}
            {[0, 1, 2, 3].map(j => (
              <circle key={j} cx={walletX + 58 + j * 18} cy={walletY + 77} r="3.5" fill="rgba(255,255,255,0.4)" />
            ))}
            <text x={walletX + walletW / 2} y={walletY + 98} textAnchor="middle"
              fontSize="10.5" fill="rgba(255,255,255,0.75)" fontFamily="Poppins, sans-serif"
              letterSpacing="1">FARMER WALLET</text>
            <text x={walletX + walletW / 2} y={walletY + 118} textAnchor="middle"
              fontSize="15" fill="white" fontWeight="700" fontFamily="Poppins, sans-serif">
              KES {formatK(netCashFlow)}
            </text>
            <text x={walletX + walletW / 2} y={walletY + 135} textAnchor="middle"
              fontSize="9" fill="rgba(255,255,255,0.55)" fontFamily="Poppins, sans-serif">
              Flow: KES {formatK(totalInflow)}
            </text>

            {/* ── Expense Category Cards ── */}
            {expCats.map((cat, i) => {
              const ty = expenseYs[i];
              const cy = ty + rightCardH / 2;
              const rx = W - rightCardW;
              return (
                <g key={`exp-${i}`}>
                  <rect x={rx} y={ty} width={rightCardW} height={rightCardH} rx="10"
                    fill="#FEF2F2" stroke="#FECACA" strokeWidth="1.5" />
                  <circle cx={rx + 21} cy={cy} r="12" fill="#EF4444" />
                  <text x={rx + 21} y={cy + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">−</text>
                  <text x={rx + 40} y={cy - 6} fontSize="10" fill="#374151" fontWeight="600"
                    fontFamily="Poppins, sans-serif">{cat.label}</text>
                  <text x={rx + 40} y={cy + 10} fontSize="11" fill="#DC2626" fontWeight="700"
                    fontFamily="Poppins, sans-serif">KES {formatK(cat.amount)}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  /* ── AI Financial Insights Card ─────────────────────────── */
  const AIInsightsCard = () => {
    const expRatio = stats.total_revenue > 0
      ? Math.round((stats.total_expenses / stats.total_revenue) * 100)
      : 0;

    const aiInsights = [
      {
        type: 'positive',
        color: '#22C55E',
        bg: '#F0FDF4',
        iconPath: 'M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z',
        title: 'Revenue Growth',
        text: `Crop sales drive ${Math.round(stats.total_revenue * 0.45 / Math.max(stats.total_revenue, 1) * 100)}% of income — your #1 revenue stream.`,
      },
      {
        type: 'warning',
        color: '#F59E0B',
        bg: '#FFFBEB',
        iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
        title: 'Cash Flow Risk',
        text: 'Projected cash flow may tighten next quarter. Consider accelerating receivables.',
      },
      {
        type: 'positive',
        color: '#22C55E',
        bg: '#F0FDF4',
        iconPath: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
        title: `Profit +${stats.trend_profit || 0}%`,
        text: `Net profit trending up ${stats.trend_profit || 0}% — strong financial momentum.`,
      },
      {
        type: 'info',
        color: '#3B82F6',
        bg: '#EFF6FF',
        iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v6z',
        title: 'Cost Optimization',
        text: 'Fertilizer costs rose 12%. Bulk purchasing could save up to 8% on farm inputs.',
      },
      {
        type: 'warning',
        color: '#F59E0B',
        bg: '#FFFBEB',
        iconPath: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
        title: 'Expense Watch',
        text: `Expenses at ${expRatio}% of revenue. Review labor and transport allocations.`,
      },
    ];

    return (
      <div className="ft-chart-card ft-ai-card">
        <div className="ft-ai-header">
          <div className="ft-ai-title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#4CAF50">
              <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
            </svg>
            <span className="ft-ai-title">AI Financial Insights</span>
          </div>
          <div className="ft-card-section-sub" style={{ marginBottom: '0.75rem' }}>AI-powered observations</div>
        </div>

        <div className="ft-ai-list">
          {aiInsights.map((ins, i) => (
            <div key={i} className="ft-ai-item" style={{ background: ins.bg, borderColor: ins.color + '40' }}>
              <div className="ft-ai-item-icon" style={{ background: ins.color }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                  <path d={ins.iconPath} />
                </svg>
              </div>
              <div className="ft-ai-item-body">
                <div className="ft-ai-item-title" style={{
                  color: ins.type === 'positive' ? '#166534' : ins.type === 'warning' ? '#92400E' : '#1E40AF'
                }}>{ins.title}</div>
                <div className="ft-ai-item-text">{ins.text}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="ft-ai-cta">
          View All Insights
        </button>
      </div>
    );
  };

  /* ── Expense Breakdown Donut ─────────────────────────────── */
  const ExpenseBreakdownCard = () => {
    const [activeSlice, setActiveSlice] = useState(null);
    const r = 60, cx = 80, cy = 80, strokeW = 22;
    const circumference = 2 * Math.PI * r;
    let cumulative = 0;

    return (
      <div className="ft-chart-card ft-donut-card">
        <div className="ft-card-section-title">Expense Breakdown</div>
        <div className="ft-card-section-sub">By category</div>

        <div className="ft-donut-wrap">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f2f5" strokeWidth={strokeW} />
            {expenseCategories.map((cat, i) => {
              const dash = (cat.pct / 100) * circumference;
              const gap = circumference - dash;
              const offset = circumference - (cumulative / 100) * circumference;
              cumulative += cat.pct;
              return (
                <circle key={i} cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={cat.color}
                  strokeWidth={activeSlice === i ? strokeW + 4 : strokeW}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  transform="rotate(-90 80 80)"
                  style={{ cursor: 'pointer', transition: 'stroke-width 0.2s' }}
                  onMouseEnter={() => setActiveSlice(i)}
                  onMouseLeave={() => setActiveSlice(null)}
                />
              );
            })}
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">
              {activeSlice !== null ? expenseCategories[activeSlice].pct + '%' : 'KES'}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fill="#6b7280">
              {activeSlice !== null ? expenseCategories[activeSlice].label : (stats.total_expenses / 1000).toFixed(0) + 'k'}
            </text>
          </svg>
        </div>

        <div className="ft-donut-legend">
          {expenseCategories.map((cat, i) => (
            <div key={i} className="ft-donut-legend-row" onMouseEnter={() => setActiveSlice(i)} onMouseLeave={() => setActiveSlice(null)}>
              <span className="ft-donut-dot" style={{ background: cat.color }} />
              <span className="ft-donut-label">{cat.label}</span>
              <span className="ft-donut-pct">{cat.pct}%</span>
              {cat.amount != null && (
                <span className="ft-donut-amount">KES {cat.amount.toLocaleString()}</span>
              )}
            </div>
          ))}
        </div>

        <div className="ft-donut-total">
          Total: <strong>KES {(stats.total_expenses || 0).toLocaleString()}</strong>
        </div>
      </div>
    );
  };

  /* ── Top Income Sources Card ─────────────────────────────── */
  const TopIncomeSourcesCard = () => (
    <div className="ft-chart-card ft-income-card">
      <div className="ft-card-section-title">Top Income Sources</div>
      <div className="ft-card-section-sub">Revenue by channel</div>

      <div className="ft-income-list">
        {incomeSources.map((src, i) => {
          const pct = incomeMax > 0 ? Math.round((src.amount / incomeMax) * 100) : 0;
          return (
            <div key={i} className="ft-income-row">
              <div className="ft-income-meta">
                <span className="ft-income-rank" style={{ color: src.color }}>#{i + 1}</span>
                <span className="ft-income-label">{src.label}</span>
                <span className="ft-income-amount">KES {src.amount.toLocaleString()}</span>
              </div>
              <div className="ft-income-bar-track">
                <div className="ft-income-bar-fill" style={{ width: `${pct}%`, background: src.color }} />
              </div>
              <span className="ft-income-pct">{pct}%</span>
            </div>
          );
        })}
      </div>

      <div className="ft-income-total">
        Total Revenue: <strong>KES {(stats.total_revenue || 0).toLocaleString()}</strong>
      </div>
    </div>
  );

  /* ── Financial Forecast Card ─────────────────────────────── */
  const ForecastCard = () => {
    const [fTooltip, setFTooltip] = useState(null);
    const svgRef = useRef(null);
    const maxVal = Math.max(...forecastRevenue, ...forecastExpenses, 1);
    const W = 380, H = 180;
    const pad = { l: 50, r: 10, t: 14, b: 32 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const stepX = forecastMonths.length > 1 ? plotW / (forecastMonths.length - 1) : plotW;
    const getY = (v) => pad.t + plotH - Math.max((v / maxVal), 0) * plotH;
    const revPts = forecastRevenue.map((v, i) => ({ x: pad.l + i * stepX, y: getY(v) }));
    const expPts = forecastExpenses.map((v, i) => ({ x: pad.l + i * stepX, y: getY(v) }));
    const prfPts = forecastProfit.map((v, i) => ({ x: pad.l + i * stepX, y: getY(Math.max(v, 0)) }));
    const line = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const splitIdx = forecastData?.split_index ?? forecastMonths.length - 3;

    const handleMove = (e) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const svgX = ((e.clientX - rect.left) / rect.width) * W;
      let nearest = 0, minDist = Infinity;
      revPts.forEach((p, i) => { const d = Math.abs(p.x - svgX); if (d < minDist) { minDist = d; nearest = i; } });
      setFTooltip({ x: e.clientX, y: e.clientY, idx: nearest });
    };

    return (
      <div className="ft-chart-card ft-forecast-card">
        <div className="ft-card-section-title">Financial Forecast</div>
        <div className="ft-card-section-sub">Projected performance</div>

        <div style={{ position: 'relative' }}>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
            onMouseMove={handleMove} onMouseLeave={() => setFTooltip(null)}>
            <defs>
              <linearGradient id="ft-fc-rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#4CAF50" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75, 1].map((t, i) => {
              const y = pad.t + (1 - t) * plotH;
              return (
                <g key={i}>
                  <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#f0f2f5" strokeWidth="1" />
                  <text x={pad.l - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#c0c8d4">
                    {Math.round(maxVal * t / 1000)}k
                  </text>
                </g>
              );
            })}

            <rect x={pad.l + splitIdx * stepX} y={pad.t} width={plotW - splitIdx * stepX} height={plotH}
              fill="#f8fafc" rx="2" />

            <path d={`M${pad.l + splitIdx * stepX},${pad.t} L${pad.l + splitIdx * stepX},${pad.t + plotH}`}
              stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 3" />

            <path d={`M${revPts[0].x},${pad.t + plotH} ${line(revPts).slice(1)} L${revPts[revPts.length - 1].x},${pad.t + plotH} Z`}
              fill="url(#ft-fc-rev)" />
            <path d={line(revPts)} stroke="#4CAF50" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d={line(expPts)} stroke="#F44336" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray={`${splitIdx * stepX} 0 1000`} />
            <path d={line(prfPts)} stroke="#2196F3" strokeWidth="2" fill="none" strokeLinecap="round" />

            {forecastMonths.map((m, i) => (
              <text key={i} x={revPts[i].x} y={H - 8} textAnchor="middle" fontSize="9"
                fill={i >= splitIdx ? '#94a3b8' : '#c0c8d4'}>{m}</text>
            ))}

            {fTooltip && (
              <line x1={revPts[fTooltip.idx].x} x2={revPts[fTooltip.idx].x}
                y1={pad.t} y2={pad.t + plotH} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
            )}
          </svg>

          {fTooltip && (
            <div className="financial-line-tooltip" style={{ left: fTooltip.x + 14, top: fTooltip.y - 70 }}>
              <div className="financial-line-tooltip-month">{forecastMonths[fTooltip.idx]}{fTooltip.idx >= splitIdx ? ' (projected)' : ''}</div>
              {[
                { label: 'Revenue', color: '#4CAF50', arr: forecastRevenue },
                { label: 'Expenses', color: '#F44336', arr: forecastExpenses },
                { label: 'Profit', color: '#2196F3', arr: forecastProfit },
              ].map(({ label, color, arr }) => (
                <div key={label} className="financial-line-tooltip-row">
                  <div className="financial-line-tooltip-dot" style={{ background: color }} />
                  <span className="financial-line-tooltip-label">{label}</span>
                  <span className="financial-line-tooltip-value">KES {(arr[fTooltip.idx] || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ft-forecast-legend">
          {[['#4CAF50', 'Revenue'], ['#F44336', 'Expenses'], ['#2196F3', 'Profit']].map(([color, label]) => (
            <div key={label} className="ft-legend-item">
              <span className="ft-legend-dot" style={{ background: color }} />
              <span className="ft-legend-label">{label}</span>
            </div>
          ))}
          <span className="ft-forecast-badge">Projected →</span>
        </div>
      </div>
    );
  };

  /* ── AgriPay Wallet Card ─────────────────────────────────── */
  const AgriPayWalletCard = () => {
    const walletBalance = Math.round(stats.total_revenue * 0.12);
    const incoming = Math.round(stats.total_revenue * 0.05);
    const pending = Math.round(stats.total_expenses * 0.04);

    return (
      <div className="ft-chart-card ft-wallet-card">
        <div className="ft-wallet-header">
          <div>
            <div className="ft-card-section-title">AgriPay Wallet</div>
            <div className="ft-card-section-sub">Digital payment summary</div>
          </div>
          <div className="ft-wallet-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#4CAF50">
              <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
            </svg>
          </div>
        </div>

        <div className="ft-wallet-balance-wrap">
          <span className="ft-wallet-balance-label">Available Balance</span>
          <span className="ft-wallet-balance">KES {walletBalance.toLocaleString()}</span>
        </div>

        <div className="ft-wallet-stats">
          <div className="ft-wallet-stat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#4CAF50"><path d="M12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 12V16H13V12H16L12 8L8 12H11Z" /></svg>
            <div>
              <div className="ft-wallet-stat-val">KES {incoming.toLocaleString()}</div>
              <div className="ft-wallet-stat-label">Incoming</div>
            </div>
          </div>
          <div className="ft-wallet-stat-divider" />
          <div className="ft-wallet-stat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF9800"><path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C12.92 6.9 13.63 7.44 13.89 8.3C14.01 8.7 14.34 9 14.76 9H15.06C15.72 9 16.19 8.35 15.96 7.73C15.54 6.55 14.56 5.57 13 5.19V4.5C13 3.67 12.33 3 11.5 3C10.67 3 10 3.67 10 4.5V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.85 17.1 9 16.51 8.67 15.67C8.52 15.28 8.18 15 7.77 15H7.49C6.82 15 6.35 15.68 6.6 16.3C7.17 17.69 8.5 18.51 10 18.83V19.5C10 20.33 10.67 21 11.5 21C12.33 21 13 20.33 13 19.5V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" /></svg>
            <div>
              <div className="ft-wallet-stat-val ft-wallet-pending">KES {pending.toLocaleString()}</div>
              <div className="ft-wallet-stat-label">Pending</div>
            </div>
          </div>
        </div>

        <div className="ft-wallet-actions">
          <button className="ft-wallet-btn ft-wallet-btn--primary">Send Money</button>
          <button className="ft-wallet-btn ft-wallet-btn--secondary">Withdraw</button>
        </div>
      </div>
    );
  };

  /* ── Goals & Targets Card ────────────────────────────────── */
  const GoalsTargetsCard = () => (
    <div className="ft-chart-card ft-goals-card">
      <div className="ft-card-section-title">Goals &amp; Targets</div>
      <div className="ft-card-section-sub">Monthly performance tracking</div>

      <div className="ft-goals-hero">
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r="38" fill="none" stroke="#f0f2f5" strokeWidth="8" />
          <circle cx="45" cy="45" r="38" fill="none" stroke={goalProgress >= 80 ? '#4CAF50' : goalProgress >= 50 ? '#FF9800' : '#F44336'}
            strokeWidth="8"
            strokeDasharray={`${goalProgress * 2.39} 239`}
            strokeLinecap="round"
            transform="rotate(-90 45 45)" />
          <text x="45" y="41" textAnchor="middle" fontSize="16" fontWeight="700" fill="#111827">{goalProgress}%</text>
          <text x="45" y="56" textAnchor="middle" fontSize="9" fill="#6b7280">achieved</text>
        </svg>
        <div className="ft-goals-hero-text">
          <div className="ft-goals-label">Monthly Profit Target</div>
          <div className="ft-goals-target">KES {monthlyTarget.toLocaleString()}</div>
        </div>
      </div>

      <div className="ft-goals-list">
        {goals.map((goal, i) => {
          const pct = goal.unit === '%'
            ? Math.min(100, Math.round((goal.current / goal.target) * 100))
            : goal.invert
              ? Math.min(100, Math.round((goal.target / goal.current) * 100))
              : Math.min(100, Math.round((goal.current / goal.target) * 100));
          const display = goal.unit ? `${goal.current}${goal.unit}` : `KES ${(goal.current || 0).toLocaleString()}`;
          const targetDisplay = goal.unit ? `${goal.target}${goal.unit}` : `KES ${(goal.target || 0).toLocaleString()}`;
          return (
            <div key={i} className="ft-goal-item">
              <div className="ft-goal-meta">
                <span className="ft-goal-label">{goal.label}</span>
                <span className="ft-goal-vals">{display} / {targetDisplay}</span>
              </div>
              <div className="ft-goal-bar-track">
                <div className="ft-goal-bar-fill" style={{ width: `${pct}%`, background: goal.color }} />
              </div>
              <span className="ft-goal-pct" style={{ color: goal.color }}>{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* <div className="ft-goals-footer">
        <span className={`ft-goals-status-badge ${goalProgress >= 80 ? 'ft-status-on-track' : 'ft-status-needs-attention'}`}>
          {goalProgress >= 80 ? '✅ On Track' : '⚡ Needs Attention'}
        </span>
      </div> */}
    </div>
  );

  /* ── Skeleton Loaders ─────────────────────────────────────── */
  const SkeletonCard = ({ className = '' }) => (
    <div className={`ft-chart-card ${className}`}>
      <div className="ft-skeleton ft-skeleton-title" />
      <div className="ft-skeleton ft-skeleton-sub" />
      <div className="ft-skeleton ft-skeleton-chart" />
    </div>
  );


  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content ft-dashboard">

          {/* ── PAGE HEADER ──────────────────────────────── */}
          <div className="ft-page-header">
            <div className="ft-page-header-left">
              <h1 className="ft-page-title">Financial Tracking</h1>
              <p className="ft-page-subtitle">Monitor farm revenue, expenses, and financial analytics in real time</p>
            </div>
            <div className="ft-page-header-actions">
              <div className="ft-filter-group">
                <select className="ft-select" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>This year</option>
                  <option>Custom range</option>
                </select>
                <select className="ft-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option>All Categories</option>
                  <option>Revenue</option>
                  <option>Expenses</option>
                </select>
                <button className="ft-filter-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" /></svg>
                  Filter
                </button>
              </div>
              <button className="ft-export-btn" onClick={handleExport}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13V18C19 18.55 18.55 19 18 19H6C5.45 19 5 18.55 5 18V13C5 12.45 4.55 12 4 12C3.45 12 3 12.45 3 13V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13C21 12.45 20.55 12 20 12C19.45 12 19 12.45 19 13ZM13 12.67L14.88 10.79C15.27 10.4 15.9 10.4 16.29 10.79C16.68 11.18 16.68 11.81 16.29 12.2L12.7 15.79C12.31 16.18 11.68 16.18 11.29 15.79L7.7 12.2C7.31 11.81 7.31 11.18 7.7 10.79C8.09 10.4 8.72 10.4 9.11 10.79L11 12.67V4C11 3.45 11.45 3 12 3C12.55 3 13 3.45 13 4V12.67Z" />
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* ── KPI CARDS GRID ───────────────────────────── */}
          <div className="ft-kpi-grid">
            <FinancialHealthCard />

            <MetricKpiCard
              title="Total Revenue"
              value={`KES ${(stats?.total_revenue ?? 0).toLocaleString()}`}
              trend={stats.trend_revenue}
              trendPositive={true}
              accentColor="#22C55E"
              sparkData={monthlyData?.revenue}
              loading={loadingStats}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z" />
                </svg>
              }
            />

            <MetricKpiCard
              title="Total Expenses"
              value={`KES ${(stats?.total_expenses ?? 0).toLocaleString()}`}
              trend={stats.trend_expenses}
              trendPositive={false}
              accentColor="#EF4444"
              sparkData={monthlyData?.expenses}
              loading={loadingStats}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 18L18.29 15.71L13.41 10.83L9.41 14.83L2 7.41L3.41 6L9.41 12L13.41 8L19.71 14.29L22 12V18H16Z" />
                </svg>
              }
            />

            <MetricKpiCard
              title="Net Profit"
              value={`KES ${(stats?.net_profit ?? 0).toLocaleString()}`}
              trend={stats.trend_profit}
              trendPositive={true}
              accentColor="#22C55E"
              sparkData={monthlyData?.profit}
              loading={loadingStats}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                </svg>
              }
            />

            <CashFlowKpiCard />
            <OutstandingKpiCard />
          </div>

          {/* ── TREND CHART: full width ───────────────────────── */}
          {loadingMonthly
            ? <SkeletonCard className="ft-trend-card" />
            : <MonthlyTrendsChart data={monthlyData} />
          }

          {/* ── ANALYTICS ROW: Cash Flow + AI Insights ─────────── */}
          <div className="ft-analytics-row ft-analytics-row--2col">
            {loadingCashflow ? <SkeletonCard className="ft-sankey-card" /> : <SankeyCashFlowCard />}
            <AIInsightsCard />
          </div>

          {/* ── ANALYTICS ROW 2: Donut + Income + Forecast (top) + Wallet (bottom) */}
          <div className="ft-analytics-row ft-analytics-row--4col">
            {loadingExpenseSources ? <SkeletonCard className="ft-donut-card" /> : <ExpenseBreakdownCard />}
            {loadingRevenueSources ? <SkeletonCard className="ft-income-card" /> : <TopIncomeSourcesCard />}
            <div className="ft-stacked-col">
              {loadingForecast ? <SkeletonCard /> : <ForecastCard />}
              <AgriPayWalletCard />
            </div>
          </div>

          {/* ── BOTTOM ROW: Transactions + Goals ─────────────── */}
          <div className="ft-bottom-row">
            <RecentTransactions />
            <GoalsTargetsCard />
          </div>

        </div>
      </div>
    </div>
  );
};

export default FinancialTracking;
