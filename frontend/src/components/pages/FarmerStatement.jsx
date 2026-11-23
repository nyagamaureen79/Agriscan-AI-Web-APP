import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { apiFetch } from '../../utils/apiFetch';
import { useToast } from '../../contexts/ToastContext';
import './FarmerStatement.css';

const API_BASE = import.meta.env.VITE_API_URL;

const formatCarbonValue = (kg) => {
  if (kg === null || kg === undefined) return '0';
  const n = Number(kg);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-KE', { maximumFractionDigits: 2 });
};

// ─── Skeleton helpers ─────────────────────────────────────────────────────────
const SkeletonLine = ({ width = '100%', height = '14px' }) => (
  <div className="fs-skeleton-line" style={{ width, height }} />
);

const SkeletonCard = () => (
  <div className="fs-skeleton-card">
    <SkeletonLine width="40%" height="12px" />
    <SkeletonLine width="60%" height="24px" />
    <SkeletonLine width="30%" height="12px" />
  </div>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, subtext, trend, loading }) => {
  const isPositive = trend >= 0;
  return (
    <div className="fs-kpi-card">
      {loading ? (
        <>
          <div className="fs-kpi-icon-skeleton" />
          <SkeletonLine width="50%" height="11px" />
          <SkeletonLine width="80%" height="22px" />
          <SkeletonLine width="40%" height="11px" />
        </>
      ) : (
        <>
          <div className="fs-kpi-icon">{icon}</div>
          <div className="fs-kpi-label">{label}</div>
          <div className="fs-kpi-value">{value}</div>
          {subtext && <div className="fs-kpi-subtext">{subtext}</div>}
          {trend !== undefined && trend !== null && (
            <div className={`fs-kpi-trend ${trend === 0 ? 'fs-kpi-trend--flat' : isPositive ? 'fs-kpi-trend--up' : 'fs-kpi-trend--down'}`}>
              {trend === 0 ? '→' : isPositive ? '↑' : '↓'} {Math.abs(trend)}%
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Financial Line Chart ─────────────────────────────────────────────────────
const FinancialLineChart = ({ data, loading }) => {
  const [tooltip, setTooltip] = useState(null);
  const areaRef = useRef(null);

  const hasData = data && data.months && data.months.length > 0;
  const months = hasData ? data.months : [];
  const revenue = hasData ? (data.revenue || []) : [];
  const expenses = hasData ? (data.expenses || []) : [];
  const profit = hasData ? (data.profit || []) : [];

  const allValues = [...revenue, ...expenses, ...profit].filter(v => v !== null && v !== undefined);
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 100;
  const minVal = Math.min(0, ...(allValues.length > 0 ? allValues : [0]));
  const range = maxVal - minVal || 1;

  const getPath = (vals, w = 1000, h = 160) => {
    if (!vals || vals.length < 2) return '';
    return vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - minVal) / range) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const handleMouseMove = (e) => {
    if (!hasData || !areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(pct * (months.length - 1));
    setTooltip({ x: pct * 100, month: months[idx], income: revenue[idx], expense: expenses[idx], profit: profit[idx] });
  };

  if (loading) return <div className="fs-chart-skeleton fs-chart-skeleton--line" />;

  if (!hasData) {
    return (
      <div className="fs-chart-empty">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="#F0F7F0" />
          <path d="M14 34V26M20 34V20M26 34V23M32 34V16" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        </svg>
        <p>No financial data available</p>
      </div>
    );
  }

  return (
    <div className="fs-financial-chart" ref={areaRef} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
      <svg viewBox="0 0 1000 160" preserveAspectRatio="none" className="fs-chart-svg">
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line key={i} x1="0" y1={pct * 160} x2="1000" y2={pct * 160} stroke="#E1E7EF" strokeWidth="1" strokeDasharray="4,4" />
        ))}
        <path d={getPath(revenue)} stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={getPath(expenses)} stroke="#F44336" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={getPath(profit)} stroke="#2196F3" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {tooltip && <line x1={tooltip.x * 10} y1="0" x2={tooltip.x * 10} y2="160" stroke="#9CA3AF" strokeWidth="1" strokeDasharray="4,2" />}
      </svg>
      {tooltip && (
        <div className="fs-chart-tooltip" style={{ left: `${Math.min(tooltip.x, 80)}%` }}>
          <div className="fs-tooltip-month">{tooltip.month}</div>
          <div className="fs-tooltip-row"><span className="fs-dot" style={{ background: '#4CAF50' }} />Income: KES {(tooltip.income || 0).toLocaleString()}</div>
          <div className="fs-tooltip-row"><span className="fs-dot" style={{ background: '#F44336' }} />Expenses: KES {(tooltip.expense || 0).toLocaleString()}</div>
          <div className="fs-tooltip-row"><span className="fs-dot" style={{ background: '#2196F3' }} />Profit: KES {(tooltip.profit || 0).toLocaleString()}</div>
        </div>
      )}
      <div className="fs-chart-x-labels">
        {months.filter((_, i) => i % Math.ceil(months.length / 6) === 0 || i === months.length - 1).map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </div>
  );
};

// ─── Earnings Donut Chart ──────────────────────────────────────────────────────
const EarningsDonutChart = ({ categories, loading, showValues = false }) => {
  const [hovered, setHovered] = useState(null);

  if (loading) return <div className="fs-chart-skeleton fs-chart-skeleton--donut" />;
  if (!categories || categories.length === 0) {
    return <div className="fs-chart-empty"><p>No earnings data available</p></div>;
  }

  const cx = 80, cy = 80, r = 65, innerR = 38;
  let cumulative = 0;

  const slices = categories.map((cat) => {
    const startDeg = cumulative * 3.6 - 90;
    cumulative += cat.pct;
    const endDeg = cumulative * 3.6 - 90;
    const startRad = startDeg * Math.PI / 180;
    const endRad = endDeg * Math.PI / 180;
    const large = cat.pct > 50 ? 1 : 0;
    const path = [
      `M ${(cx + r * Math.cos(startRad)).toFixed(2)} ${(cy + r * Math.sin(startRad)).toFixed(2)}`,
      `A ${r} ${r} 0 ${large} 1 ${(cx + r * Math.cos(endRad)).toFixed(2)} ${(cy + r * Math.sin(endRad)).toFixed(2)}`,
      `L ${(cx + innerR * Math.cos(endRad)).toFixed(2)} ${(cy + innerR * Math.sin(endRad)).toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${(cx + innerR * Math.cos(startRad)).toFixed(2)} ${(cy + innerR * Math.sin(startRad)).toFixed(2)}`,
      'Z',
    ].join(' ');
    return { ...cat, path };
  });

  return (
    <div className="fs-donut-chart-wrapper">
      <svg width="160" height="160" viewBox="0 0 160 160" className="fs-donut-svg">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity={hovered === null || hovered === i ? 1 : 0.45} className="fs-donut-slice" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
        ))}
        <circle cx={cx} cy={cy} r={innerR} fill="white" />
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="700" fontFamily="Inter, sans-serif">Total</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="10" fill="#6B7280" fontFamily="Inter, sans-serif">Earnings</text>
      </svg>
      <div className="fs-donut-legend">
        {categories.map((cat, i) => (
          <div key={i} className={`fs-donut-legend-item${hovered === i ? ' fs-donut-legend-item--active' : ''}`} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <span className="fs-donut-dot" style={{ background: cat.color }} />
            <div className="fs-donut-label-group">
              <span className="fs-donut-label">{cat.label}</span>
              {showValues && cat.value != null && (
                <span className="fs-donut-value">KES {Number(cat.value).toLocaleString()}</span>
              )}
            </div>
            <span className="fs-donut-pct">{cat.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Dual Carbon Line Chart (Reduced + Sequestered) ───────────────────────────
const DualCarbonLineChart = ({ labels, reducedValues, seqValues, loading, onViewReport, gridArea, className = '' }) => {
  const [tooltip, setTooltip] = useState(null);
  const [period, setPeriod] = useState('1 Year');
  const [showPeriodDrop, setShowPeriodDrop] = useState(false);
  const chartRef = useRef(null);
  const dropRef = useRef(null);

  const periods = ['3 Months', '6 Months', '1 Year'];
  const sliceCount = period === '3 Months' ? 3 : period === '6 Months' ? 6 : labels.length;
  const sl = (arr) => (arr || []).slice(-sliceCount);
  const slLabels = sl(labels);
  const slReduced = sl(reducedValues);
  const slSeq = sl(seqValues);

  const allVals = [...slReduced, ...slSeq].filter(v => v > 0);
  const maxVal = allVals.length > 0 ? Math.max(...allVals) * 1.18 : 100;
  const W = 1000, H = 260, PAD = 16;
  const chartH = H - PAD * 2;

  const getY = (v) => PAD + chartH - (v / maxVal) * chartH;
  const getX = (i, len) => len <= 1 ? W / 2 : (i / (len - 1)) * W;

  const smoothPath = (vals) => {
    if (!vals || vals.length < 2) return '';
    const pts = vals.map((v, i) => ({ x: getX(i, vals.length), y: getY(v) }));
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = (pts[i + 1].x - pts[i].x) / 2.5;
      d += ` C ${(pts[i].x + dx).toFixed(1)},${pts[i].y.toFixed(1)} ${(pts[i + 1].x - dx).toFixed(1)},${pts[i + 1].y.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
    }
    return d;
  };

  const areaPath = (vals, path) => {
    if (!path) return '';
    const lastX = getX(vals.length - 1, vals.length).toFixed(1);
    return `${path} L${lastX} ${H} L0 ${H} Z`;
  };

  const hasData = slReduced.some(v => v > 0);

  useEffect(() => {
    const handle = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowPeriodDrop(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleMouseMove = (e) => {
    if (!chartRef.current || !hasData) return;
    const rect = chartRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(pct * (slLabels.length - 1));
    setTooltip({ pct, idx, label: slLabels[idx], reduced: slReduced[idx], seq: slSeq[idx] });
  };

  const style = gridArea ? { gridArea } : {};

  if (loading) return (
    <div className={`fs-card fs-carbon-trend-card ${className}`} style={style}>
      <div className="fs-card-header">
        <h3 className="fs-card-title">Carbon Trend</h3>
      </div>
      <div className="fs-chart-skeleton fs-chart-skeleton--line" />
    </div>
  );

  const reducedPath = smoothPath(slReduced);
  const seqPath = smoothPath(slSeq);

  return (
    <div className={`fs-card fs-carbon-trend-card ${className}`} style={style}>
      {/* Header with period selector */}
      <div className="fs-card-header">
        <h3 className="fs-card-title">Carbon Trend</h3>
        <div className="fs-period-selector" ref={dropRef} onClick={() => setShowPeriodDrop(v => !v)}>
          <span>{period}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M7 10L12 15L17 10" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {showPeriodDrop && (
            <div className="fs-period-dropdown">
              {periods.map(p => (
                <div key={p} className={`fs-period-option${period === p ? ' fs-period-option--active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setPeriod(p); setShowPeriodDrop(false); }}>
                  {p}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="fs-carbon-series-legend">
        <div className="fs-carbon-series-item">
          <span className="fs-carbon-series-mark" style={{ background: '#16A34A' }} />
          <span>Reduced (kg CO₂e)</span>
        </div>
        <div className="fs-carbon-series-item">
          <span className="fs-carbon-series-mark" style={{ background: '#3B82F6' }} />
          <span>Sequestered (kg CO₂e)</span>
        </div>
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="fs-chart-empty"><p>No carbon data available</p></div>
      ) : (
        <div className="fs-dual-carbon-wrap">
          {/* Y-axis labels */}
          <div className="fs-carbon-yaxis">
            {[1, 0.75, 0.5, 0.25, 0].map((pct, i) => (
              <span key={i} className="fs-carbon-yaxis-label">
                {formatCarbonValue(maxVal * pct)}
              </span>
            ))}
          </div>

          {/* Chart inner area */}
          <div className="fs-carbon-chart-inner" ref={chartRef} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="fs-chart-svg">
              <defs>
                <linearGradient id="gradReduced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="gradSeq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75, 1].map((pct, i) => (
                <line key={i} x1="0" y1={PAD + chartH * (1 - pct)} x2={W} y2={PAD + chartH * (1 - pct)}
                  stroke="#F3F4F6" strokeWidth="1.5" />
              ))}
              <path d={areaPath(slReduced, reducedPath)} fill="url(#gradReduced)" />
              <path d={areaPath(slSeq, seqPath)} fill="url(#gradSeq)" />
              <path d={reducedPath} stroke="#16A34A" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d={seqPath} stroke="#3B82F6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {tooltip && (
                <line x1={getX(tooltip.idx, slLabels.length)} y1={PAD}
                  x2={getX(tooltip.idx, slLabels.length)} y2={H}
                  stroke="#D1D5DB" strokeWidth="1" strokeDasharray="4,3" />
              )}
              {tooltip && [
                { v: slReduced[tooltip.idx], color: '#16A34A' },
                { v: slSeq[tooltip.idx], color: '#3B82F6' },
              ].map((d, i) => (
                <circle key={i} cx={getX(tooltip.idx, slLabels.length)} cy={getY(d.v || 0)}
                  r="5.5" fill={d.color} stroke="white" strokeWidth="2.5" />
              ))}
            </svg>

            {tooltip && (
              <div className="fs-carbon-tooltip" style={{ left: `${Math.min(Math.max(tooltip.pct * 100, 5), 68)}%` }}>
                <div className="fs-tooltip-month">{tooltip.label}</div>
                <div className="fs-tooltip-row"><span className="fs-dot" style={{ background: '#16A34A' }} />Reduced: {(tooltip.reduced || 0).toLocaleString()} kg</div>
                <div className="fs-tooltip-row"><span className="fs-dot" style={{ background: '#3B82F6' }} />Sequestered: {(tooltip.seq || 0).toLocaleString()} kg</div>
              </div>
            )}

            <div className="fs-chart-x-labels">
              {slLabels.map((l, i) => {
                if (i % Math.ceil(slLabels.length / 5) !== 0 && i !== slLabels.length - 1) return null;
                return <span key={i}>{l}</span>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer link */}
      <div className="fs-card-footer-center">
        <button className="fs-footer-link-btn" onClick={onViewReport}>
          View full carbon report
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="fs-footer-link-arrow">
            <path d="M5 12H19M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ─── Main FarmerStatement Component ───────────────────────────────────────────
const FarmerStatement = () => {
  const { farmerId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [farmer, setFarmer] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [carbonStats, setCarbonStats] = useState(null);
  const [carbonLabels, setCarbonLabels] = useState([]);
  const [carbonValues, setCarbonValues] = useState([]);
  const [carbonSeqValues, setCarbonSeqValues] = useState([]);
  const [cropScans, setCropScans] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [harvestStats, setHarvestStats] = useState({});
  const [earningCategoriesData, setEarningCategoriesData] = useState([]);

  const [loadingFarmer, setLoadingFarmer] = useState(true);
  const [loadingFinancials, setLoadingFinancials] = useState(true);
  const [outstanding, setOutstanding] = useState(0);
  const [loadingCarbon, setLoadingCarbon] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingScans, setLoadingScans] = useState(true);
  const [loadingHarvests, setLoadingHarvests] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [activeTab, setActiveTab] = useState('overview');
  const [txFilter, setTxFilter] = useState('all');
  const [txSearch, setTxSearch] = useState('');
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const tabs = ['Overview', 'Financials', 'Harvests', 'Crop Scans', 'Carbon Impact', 'Transactions'];
  const dateOptions = ['Last 7 Days', 'Last 30 Days', 'Last 3 Months', 'Last 6 Months', 'Last Year'];

  useEffect(() => {
    if (!farmerId) return;
    apiFetch(`${API_BASE}/farmers/${farmerId}`)
      .then(r => r.json())
      .then(data => setFarmer(data))
      .catch(err => toast.error(`Failed to load farmer: ${err.message}`))
      .finally(() => setLoadingFarmer(false));
  }, [farmerId]);

  useEffect(() => {
    if (!farmerId) return;
    Promise.all([
      apiFetch(`${API_BASE}/api/financials/farmer/${farmerId}/stats`).then(r => r.json()).catch(() => null),
      apiFetch(`${API_BASE}/api/financials/farmer/${farmerId}/monthly`).then(r => r.json()).catch(() => null),
    ]).then(([stats, monthly]) => {
      setFinancialStats(stats);
      setMonthlyData(monthly);
    }).finally(() => setLoadingFinancials(false));
  }, [farmerId]);


  useEffect(() => {
  if (!farmerId) return;
  apiFetch(`${API_BASE}/api/financials/farmer/${farmerId}/outstanding`)
    .then(r => r.json())
    .then(data => setOutstanding(data.total_outstanding || 0))
    .catch(() => setOutstanding(0));
}, [farmerId]);

  useEffect(() => {
    if (!farmerId) return;
    apiFetch(`${API_BASE}/api/financials/farmer/${farmerId}/revenue-sources`)
      .then(r => r.json())
      .then(data => setEarningCategoriesData(data.categories || []))
      .catch(() => setEarningCategoriesData([]))
      .finally(() => setLoadingCategories(false));
  }, [farmerId]);

  useEffect(() => {
    if (!farmerId) return;
    apiFetch(`${API_BASE}/api/financials/farmer/${farmerId}/recent?limit=20`)
      .then(r => r.json())
      .then(data => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => setTransactions([]))
      .finally(() => setLoadingTransactions(false));
  }, [farmerId]);

  useEffect(() => {
    if (!farmerId) return;
    Promise.all([
      apiFetch(`${API_BASE}/carbon/farmer/${farmerId}/carbon-stats`).then(r => r.json()).catch(() => null),
      apiFetch(`${API_BASE}/carbon/farmer/${farmerId}/monthly-emissions`).then(r => r.json()).catch(() => null),
    ]).then(([stats, monthly]) => {
      setCarbonStats(stats);
      if (monthly?.labels) {
        setCarbonLabels(monthly.labels);
        setCarbonValues(monthly.reducedValues || []);
        setCarbonSeqValues(monthly.seqValues || []);
      }
    }).finally(() => setLoadingCarbon(false));
  }, [farmerId]);

  useEffect(() => {
    if (!farmerId) return;
    apiFetch(`${API_BASE}/diseases/farmer/${farmerId}/detections`)
      .then(r => r.json())
      .then(data => setCropScans(Array.isArray(data) ? data.slice(0, 20) : []))
      .catch(() => setCropScans([]))
      .finally(() => setLoadingScans(false));
  }, [farmerId]);

  useEffect(() => {
    if (!farmerId) return;
    apiFetch(`${API_BASE}/yield/report/farmer/${farmerId}/harvests`)
      .then(r => r.json())
      .then(data => {
        setHarvests(data.harvests || []);
        setHarvestStats({
          total_yield:  data.total_yield  || 0,
          avg_per_acre: data.avg_per_acre || 0,
          latest_date:  data.latest_date  || null,
          total_income: data.total_income || 0,
        });
      })
      .catch(() => { setHarvests([]); setHarvestStats({}); })
      .finally(() => setLoadingHarvests(false));
  }, [farmerId]);

  useEffect(() => {
    const handle = (e) => {
      if (!e.target.closest('.fs-date-selector')) setShowDateDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const totalEarnings = financialStats?.total_revenue || 0;
  const totalExpenses = financialStats?.total_expenses || 0;
  const netProfit = financialStats?.net_profit || 0;
  const accountBalance = totalEarnings - totalExpenses;
  const profitMargin = totalEarnings > 0 ? Math.round((netProfit / totalEarnings) * 100) : 0;

  // Determine if a transaction is an expense (checks both type and amount)
  const isTxExpense = (tx) => {
    if (tx.type === 'expense' || tx.type === 'debit' || tx.type === 'withdrawal') return true;
    if (tx.type === 'income' || tx.type === 'credit') return false;
    return tx.amount < 0;
  };

  const filteredTransactions = transactions.filter(tx => {
    const isExpense = isTxExpense(tx);
    const matchesFilter = txFilter === 'all'
      || (txFilter === 'income' && !isExpense)
      || (txFilter === 'expense' && isExpense)
      || (txFilter === 'payout' && (tx.type === 'payout' || tx.type === 'disbursement'));
    if (!matchesFilter) return false;
    if (txSearch) {
      const q = txSearch.toLowerCase();
      return (tx.description || '').toLowerCase().includes(q)
        || (tx.narration || '').toLowerCase().includes(q)
        || (tx.category || '').toLowerCase().includes(q);
    }
    return true;
  });


  const healthyScans = cropScans.filter(s => getHealthLabel(s).toLowerCase() === 'healthy').length;
  const warningScans = cropScans.filter(s => getHealthLabel(s).toLowerCase() === 'warning').length;
  const alertScans = cropScans.filter(s => ['alert', 'diseased'].includes(getHealthLabel(s).toLowerCase())).length;
  const lastScanDate = cropScans.length > 0 ? (cropScans[0].date || cropScans[0].created_at) : null;

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'KES 0';
    return `KES ${Math.abs(Number(amount)).toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getTxStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': case 'success': return 'fs-badge--success';
      case 'pending': return 'fs-badge--warning';
      case 'failed': return 'fs-badge--error';
      default: return 'fs-badge--default';
    }
  };

  function getHealthClass(status) {
    switch (status?.toLowerCase()) {
      case 'healthy': return 'fs-badge--success';
      case 'warning': return 'fs-badge--warning';
      case 'alert': case 'diseased': case 'high': return 'fs-badge--error';
      default: return 'fs-badge--success';
    }
  }

  function getHealthLabel(scan) {
    if (scan.health_status) return scan.health_status;
    if (scan.severity === 'High') return 'Alert';
    if (scan.severity === 'Medium') return 'Warning';
    return 'Healthy';
  }

  const farmerInitials = farmer
    ? (farmer.name || 'F').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'F';

  const farmerCrops = Array.isArray(farmer?.crops)
    ? farmer.crops.join(', ')
    : (farmer?.crops || 'N/A');

  const totalTxIncome = transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const totalTxExpense = transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);

  // Shared icons
  const iconBalance = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C12.92 6.9 13.63 7.44 13.89 8.3C14.01 8.7 14.34 9 14.76 9H15.06C15.72 9 16.19 8.35 15.96 7.73C15.54 6.55 14.56 5.57 13 5.19V4.5C13 3.67 12.33 3 11.5 3C10.67 3 10 3.67 10 4.5V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.85 17.1 9 16.51 8.67 15.67C8.52 15.28 8.18 15 7.77 15H7.49C6.82 15 6.35 15.68 6.6 16.3C7.17 17.69 8.5 18.51 10 18.83V19.5C10 20.33 10.67 21 11.5 21C12.33 21 13 20.33 13 19.5V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" fill="#4CAF50" />
    </svg>
  );
  const iconEarnings = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M16.85 6.85L18.29 8.29L13.41 13.17L10.12 9.88C9.72 9.49 9.1 9.49 8.71 9.88L2.71 15.89C2.32 16.28 2.32 16.91 2.71 17.3C3.1 17.69 3.73 17.69 4.12 17.3L9.41 12L12.7 15.29C13.09 15.68 13.72 15.68 14.11 15.29L19.7 9.71L21.14 11.15C21.45 11.46 21.99 11.24 21.99 10.8V6.5C22 6.22 21.78 6 21.5 6H17.21C16.76 6 16.54 6.54 16.85 6.85Z" fill="#4CAF50" />
    </svg>
  );
  const iconExpenses = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#F44336" />
    </svg>
  );
  const iconProfit = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM8 17C7.45 17 7 16.55 7 16V13C7 12.45 7.45 12 8 12C8.55 12 9 12.45 9 13V16C9 16.55 8.55 17 8 17ZM12 17C11.45 17 11 16.55 11 16V15C11 14.45 11.45 14 12 14C12.55 14 13 14.45 13 15V16C13 16.55 12.55 17 12 17ZM16 17C15.45 17 15 16.55 15 16V8C15 7.45 15.45 7 16 7C16.55 7 17 7.45 17 8V16C17 16.55 16.55 17 16 17Z" fill="#2196F3" />
    </svg>
  );
  const iconOutstanding = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" fill="#FF9800" />
    </svg>
  );

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content fs-page">

          {/* ── Page Header ── */}
          <div className="fs-page-header">
            <div className="fs-header-left">
              <nav className="fs-breadcrumb">
                <span className="fs-breadcrumb-link" onClick={() => navigate('/farmers-data')}>Farmers</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="fs-breadcrumb-chevron">
                  <path d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.59a1 1 0 0 0 0-1.41L10.7 6.7a1 1 0 0 0-1.41.01z" fill="#9CA3AF"/>
                </svg>
                <span className="fs-breadcrumb-current">Farmer Statement</span>
              </nav>
              <h1 className="fs-page-title">
                {loadingFarmer ? 'Farmer Statement' : `${farmer?.name || ''} — Statement`}
              </h1>
            </div>
            <div className="fs-header-actions">
              <div className="fs-date-selector" onClick={() => setShowDateDropdown(!showDateDropdown)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM7 10H12V15H7V10Z" fill="#6B7280" />
                </svg>
                <span>{dateRange}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#6B7280" />
                </svg>
                {showDateDropdown && (
                  <div className="fs-date-dropdown">
                    {dateOptions.map(opt => (
                      <div key={opt} className={`fs-date-option${dateRange === opt ? ' fs-date-option--active' : ''}`} onClick={(e) => { e.stopPropagation(); setDateRange(opt); setShowDateDropdown(false); }}>
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="fs-back-btn" onClick={() => navigate('/farmers-data')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="white" />
                </svg>
                Back to Farmers
              </button>
            </div>
          </div>

          {/* ── Profile + KPI ── */}
          <div className="fs-profile-section">
            <div className="fs-profile-card">
              <div className="fs-avatar-wrapper">
                {loadingFarmer
                  ? <div className="fs-avatar-skeleton" />
                  : <div className="fs-avatar-initials">{farmerInitials}</div>
                }
              </div>
              <div className="fs-profile-info">
                {loadingFarmer ? (
                  <>
                    <SkeletonLine width="200px" height="22px" />
                    <div style={{ marginTop: 10 }}><SkeletonLine width="130px" height="13px" /></div>
                    <div style={{ marginTop: 6 }}><SkeletonLine width="160px" height="13px" /></div>
                    <div style={{ marginTop: 10 }}><SkeletonLine width="100px" height="22px" /></div>
                  </>
                ) : farmer ? (
                  <>
                    <div className="fs-profile-name">{farmer.name}</div>
                    <div className="fs-profile-meta">
                      <span className="fs-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#9CA3AF" /></svg>
                         {farmer.frn || 'N/A'}
                      </span>
                      <span className="fs-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#9CA3AF" /></svg>
                        {farmer.location || 'N/A'}
                      </span>
                      <span className="fs-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" fill="#9CA3AF" /></svg>
                        ID: {farmer.id || farmer._id || farmerId}
                      </span>
                    </div>
                    <div className="fs-profile-badges">
                      <span className={`fs-badge ${farmer.status === 'Active' ? 'fs-badge--success' : 'fs-badge--warning'}`}>
                        {farmer.status === 'Active' ? '✓ Verified Farmer' : (farmer.status || 'Pending')}
                      </span>
                      {farmer.farmType && <span className="fs-badge fs-badge--info">{farmer.farmType}</span>}
                    </div>
                  </>
                ) : (
                  <div className="fs-chart-empty"><p>Farmer not found</p></div>
                )}
              </div>
            </div>

            <div className="fs-kpi-grid">
              <KpiCard loading={loadingFinancials} icon={iconBalance} label="Account Balance" value={formatCurrency(accountBalance)} subtext="Current balance" trend={financialStats?.trend_revenue} />
              <KpiCard loading={loadingFinancials} icon={iconEarnings} label="Total Earnings" value={formatCurrency(totalEarnings)} subtext="Lifetime income" trend={financialStats?.trend_revenue} />
              <KpiCard loading={loadingFinancials} icon={iconExpenses} label="Total Expenses" value={formatCurrency(totalExpenses)} subtext="Total costs incurred" trend={financialStats?.trend_expenses != null ? -(financialStats.trend_expenses) : undefined} />
              <KpiCard loading={loadingFinancials} icon={iconProfit} label="Net Profit" value={formatCurrency(netProfit)} subtext="After all expenses" trend={financialStats?.trend_profit} />
              <KpiCard loading={loadingFinancials} icon={iconOutstanding} label="Outstanding" value={formatCurrency(outstanding)} subtext="Unpaid invoices" />
            </div>
          </div>

          {/* ── Tab Navigation ── */}
          <div className="fs-tabs-nav">
            {tabs.map(tab => {
              const key = tab.toLowerCase().replace(/ /g, '-');
              return (
                <button key={key} className={`fs-tab-btn${activeTab === key ? ' fs-tab-btn--active' : ''}`} onClick={() => setActiveTab(key)}>
                  {tab}
                </button>
              );
            })}
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* ── Overview Tab ── */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="fs-tab-content">
              <div className="fs-analytics-row--3col">
                <div className="fs-card fs-card--span-wide">
                  <div className="fs-card-header">
                    <h3 className="fs-card-title">Financial Overview</h3>
                    <div className="fs-chart-legend">
                      <span className="fs-legend-dot" style={{ background: '#4CAF50' }} /> Income
                      <span className="fs-legend-dot" style={{ background: '#F44336' }} /> Expenses
                      <span className="fs-legend-dot" style={{ background: '#2196F3' }} /> Profit
                    </div>
                  </div>
                  <FinancialLineChart data={monthlyData} loading={loadingFinancials} />
                </div>

                <div className="fs-card">
                  <div className="fs-card-header"><h3 className="fs-card-title">Earnings by Category</h3></div>
                  <EarningsDonutChart categories={earningCategoriesData} loading={loadingCategories} />
                  <button className="fs-link-btn" onClick={() => setActiveTab('financials')}>View Full Breakdown →</button>
                </div>

                <div className="fs-card">
                  <div className="fs-card-header"><h3 className="fs-card-title">Carbon Impact</h3></div>
                  {loadingCarbon ? (
                    <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
                  ) : (
                    <div className="fs-carbon-metrics">
                      <div className="fs-carbon-metric-card">
                        <div className="fs-carbon-metric-icon fs-carbon-metric-icon--green">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6.05 8.05C3.32 10.78 3.32 15.2 6.03 17.93C7.5 14.53 10.12 11.69 13.39 10C10.62 12.34 8.68 15.61 8 19.32C10.6 20.55 13.8 20.1 15.95 17.95C19.43 14.47 20 4 20 4C20 4 9.53 4.57 6.05 8.05Z" fill="#4CAF50" /></svg>
                        </div>
                        <div className="fs-carbon-metric-info">
                          <div className="fs-carbon-metric-label">Carbon Reduced</div>
                          <div className="fs-carbon-metric-value">{formatCarbonValue(carbonStats?.totalReductions ?? carbonStats?.carbon_reduced)} kg CO₂</div>
{/* Carbon Reduced trend — AFTER */}
{carbonStats?.trend_reduced != null && (
  <div className={`fs-carbon-metric-trend ${carbonStats.trend_reduced >= 0 ? 'fs-carbon-metric-trend--up' : 'fs-carbon-metric-trend--down'}`}>
    {carbonStats.trend_reduced === 0 ? '→' : carbonStats.trend_reduced > 0 ? '↑' : '↓'} {Math.abs(carbonStats.trend_reduced)}% this month
  </div>
)}                        </div>
                      </div>
                      <div className="fs-carbon-metric-card">
                        <div className="fs-carbon-metric-icon fs-carbon-metric-icon--teal">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="#00796B" /></svg>
                        </div>
                        <div className="fs-carbon-metric-info">
                          <div className="fs-carbon-metric-label">Carbon Sequestered</div>
                          <div className="fs-carbon-metric-value">{formatCarbonValue(carbonStats?.totalSequestered ?? carbonStats?.carbon_sequestered)} kg CO₂</div>
{carbonStats?.trend_seq != null && (
  <div className={`fs-carbon-metric-trend ${carbonStats.trend_seq >= 0 ? 'fs-carbon-metric-trend--up' : 'fs-carbon-metric-trend--down'}`}>
    {carbonStats.trend_seq === 0 ? '→' : carbonStats.trend_seq > 0 ? '↑' : '↓'} {Math.abs(carbonStats.trend_seq)}% this month
  </div>
)}                        </div>
                      </div>
                      <div className="fs-carbon-metric-card">
                        <div className="fs-carbon-metric-icon fs-carbon-metric-icon--blue">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="#2196F3" /></svg>
                        </div>
                        <div className="fs-carbon-metric-info">
                          <div className="fs-carbon-metric-label">Total Carbon Impact</div>
                          <div className="fs-carbon-metric-value">{formatCarbonValue(carbonStats?.netImpact ?? carbonStats?.totalEmissions)} kg CO₂</div>
{carbonStats?.trend_impact != null && (
  <div className={`fs-carbon-metric-trend ${carbonStats.trend_impact >= 0 ? 'fs-carbon-metric-trend--up' : 'fs-carbon-metric-trend--down'}`}>
    {carbonStats.trend_impact === 0 ? '→' : carbonStats.trend_impact > 0 ? '↑' : '↓'} {Math.abs(carbonStats.trend_impact)}% this month
  </div>
)}                        </div>
                      </div>
                    </div>
                  )}
                  <button className="fs-link-btn" onClick={() => setActiveTab('carbon-impact')}>View Carbon Report →</button>
                </div>
              </div>

              {/* Unified bottom grid: Harvests | Crop Scans | Carbon Trend (row 1), Transactions (spans 2) | Farm Summary (row 2) */}
              <div className="fs-overview-bottom-grid">
                <div className="fs-card fs-overview-harvests">
                  <div className="fs-card-header">
                    <h3 className="fs-card-title">Recent Harvests</h3>
                  </div>
                  <div className="fs-harvest-table-wrap">
                    <table className="fs-harvest-table">
                      <thead>
                        <tr>
                          <th>Crop</th>
                          <th className="fs-th-right">Quantity</th>
                          <th>Unit</th>
                          <th>Harvest Date</th>
                          <th className="fs-th-right"> Expected Income (KES)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingHarvests ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <tr key={i} className="fs-harvest-row">
                              <td colSpan="5"><SkeletonLine /></td>
                            </tr>
                          ))
                        ) : harvests.length === 0 ? (
                          <tr><td colSpan="5" className="fs-table-empty-cell">No harvests recorded</td></tr>
                        ) : harvests.map((h, i) => (
                          <tr key={i} className="fs-harvest-row">
                            <td>
                              <span className="fs-harvest-crop-cell">
                                <span className="fs-harvest-crop-dot" />
                                {h.crop}
                              </span>
                            </td>
                            <td className="fs-td-right">{(h.quantity || 0).toLocaleString()}</td>
                            <td className="fs-harvest-unit-cell">{h.unit}</td>
                            <td>{formatDate(h.date || h.harvest_date)}</td>
                            <td className="fs-td-right fs-harvest-income-cell">{(h.income || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="fs-card-footer-center">
                    <button className="fs-footer-link-btn" onClick={() => setActiveTab('harvests')}>
                      View all harvests
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="fs-footer-link-arrow">
                        <path d="M5 12H19M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="fs-card fs-overview-cropscans">
                  <div className="fs-card-header">
                    <h3 className="fs-card-title">Recent Crop Scans</h3>
                    <button className="fs-view-all-btn" onClick={() => setActiveTab('crop-scans')}>View All →</button>
                  </div>
                  {loadingScans ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="fs-scan-skeleton">
                        <div className="fs-scan-thumb-skeleton" />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <SkeletonLine width="65%" height="13px" />
                          <SkeletonLine width="45%" height="11px" />
                        </div>
                      </div>
                    ))
                  ) : cropScans.length === 0 ? (
                    <div className="fs-table-empty">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M4.47 21H19.53C21.07 21 22.03 19.33 21.26 18L13.73 4.99C12.96 3.66 11.04 3.66 10.27 4.99L2.74 18C1.97 19.33 2.93 21 4.47 21Z" fill="#9CA3AF" /></svg>
                      <p>No crop scans recorded</p>
                    </div>
                  ) : (
                    <div className="fs-scan-list">
                      {cropScans.slice(0, 5).map((scan, i) => (
                        <div key={i} className="fs-scan-item">
                          <div className="fs-scan-thumb">
                            {scan.image ? (
                              <>
                                <img
                                  src={`${API_BASE}${scan.image}`}
                                  alt="scan thumbnail"
                                  onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
                                />
                                <svg style={{ display: 'none' }} width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 3H3C2 3 1 4 1 5V19C1 20 2 21 3 21H21C22 21 23 20 23 19V5C23 4 22 3 21 3ZM21 19H3V5H21V19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="#9CA3AF" /></svg>
                              </>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 3H3C2 3 1 4 1 5V19C1 20 2 21 3 21H21C22 21 23 20 23 19V5C23 4 22 3 21 3ZM21 19H3V5H21V19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="#9CA3AF" /></svg>
                            )}
                          </div>
                          <div className="fs-scan-details">
<div className="fs-scan-field">{scan.disease_name || scan.field_name || scan.crop || 'Field Scan'}</div>                            <div className="fs-scan-date">{formatDate(scan.date || scan.created_at)}</div>
                          </div>
                          <span className={`fs-badge ${getHealthClass(getHealthLabel(scan))}`}>{getHealthLabel(scan)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DualCarbonLineChart
                  labels={carbonLabels}
                  reducedValues={carbonValues}
                  seqValues={carbonSeqValues}
                  loading={loadingCarbon}
                  onViewReport={() => setActiveTab('carbon-impact')}
                  gridArea="carbon"
                />

                {/* Row 2: Transactions spanning cols 1–2 */}
                <div className="fs-card fs-card--transactions fs-card--transactions-overview fs-overview-tx">
                  <div className="fs-card-header">
                    <h3 className="fs-card-title">Recent Transactions</h3>
                    <button className="fs-view-all-btn" onClick={() => setActiveTab('transactions')}>View All →</button>
                  </div>
                  <div className="fs-tx-filters">
                    {['all', 'income', 'expense', 'payout'].map(f => (
                      <button key={f} className={`fs-tx-filter-btn${txFilter === f ? ' fs-tx-filter-btn--active' : ''}`} onClick={() => setTxFilter(f)}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                  {loadingTransactions ? (
                    <div className="fs-tx-skeleton-list">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="fs-tx-skeleton-row">
                          <SkeletonLine width="80px" height="12px" />
                          <SkeletonLine width="160px" height="12px" />
                          <SkeletonLine width="80px" height="20px" />
                          <SkeletonLine width="90px" height="12px" />
                          <SkeletonLine width="70px" height="20px" />
                        </div>
                      ))}
                    </div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="fs-table-empty">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" fill="#9CA3AF" /></svg>
                      <p>No transactions found</p>
                    </div>
                  ) : (
                    <div className="fs-tx-table-wrapper">
                      <table className="fs-tx-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Balance</th>
                            <th>Method</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.slice(0, 8).map((tx, i) => {
                            const expense = isTxExpense(tx);
                            return (
                              <tr key={i} className="fs-tx-row">
                                <td className="fs-tx-date">{formatDate(tx.date || tx.created_at)}</td>
                                <td className="fs-tx-desc">{tx.description || tx.narration || '—'}</td>
                                <td><span className="fs-badge fs-badge--category">{tx.category || tx.type || '—'}</span></td>
                                <td><span className={`fs-tx-type ${expense ? 'fs-tx-type--expense' : 'fs-tx-type--income'}`}>{expense ? 'Expense' : 'Income'}</span></td>
                                <td className={expense ? 'fs-amount-negative' : 'fs-amount-positive'}>{expense ? '−' : '+'} {formatCurrency(tx.amount)}</td>
                                <td className="fs-tx-balance">{formatCurrency(tx.balance || tx.running_balance)}</td>
                                <td className="fs-tx-method">{tx.payment_method || tx.method || 'M-Pesa'}</td>
                                <td><span className={`fs-badge ${getTxStatusClass(tx.status)}`}>{tx.status || 'Completed'}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Row 2: Farm Summary in col 3 */}
                <div className="fs-card fs-card--farm-summary fs-overview-summary">
                  <div className="fs-card-header"><h3 className="fs-card-title">Farm Summary</h3></div>
                  {loadingFarmer ? (
                    <div className="fs-farm-metrics">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="fs-farm-metric-row">
                          <div className="fs-farm-icon-skeleton" />
                          <div style={{ flex: 1 }}>
                            <SkeletonLine width="50%" height="11px" />
                            <div style={{ marginTop: 4 }}><SkeletonLine width="70%" height="13px" /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="fs-farm-metrics">
                      {[
                        { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#4CAF50" /></svg>, label: 'Total Land Size', value: `${farmer?.farmSize || '—'} acres` },
                        { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="#4CAF50" /></svg>, label: 'Crops Grown', value: farmerCrops },
                        { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill="#4CAF50" /></svg>, label: 'Registered on', value: farmer?.joinedDate
    ? formatDate(farmer.joinedDate)
    : 'N/A'
},
                        { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.69 2 6 4.69 6 8C6 12.5 12 19 12 19C12 19 18 12.5 18 8C18 4.69 15.31 2 12 2ZM12 10.5C10.62 10.5 9.5 9.38 9.5 8C9.5 6.62 10.62 5.5 12 5.5C13.38 5.5 14.5 6.62 14.5 8C14.5 9.38 13.38 10.5 12 10.5Z" fill="#4CAF50" /></svg>, label: 'Farming Practices', value: farmer?.farmType || 'N/A' },
                        { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z" fill="#4CAF50" /></svg>, label: 'Verification Status', value: <span className={`fs-badge ${farmer?.status === 'Active' ? 'fs-badge--success' : 'fs-badge--warning'}`}>{farmer?.status === 'Active' ? 'Verified' : (farmer?.status || 'Pending')}</span> },
                        { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6.05 8.05C3.32 10.78 3.32 15.2 6.03 17.93C7.5 14.53 10.12 11.69 13.39 10C10.62 12.34 8.68 15.61 8 19.32C10.6 20.55 13.8 20.1 15.95 17.95C19.43 14.47 20 4 20 4C20 4 9.53 4.57 6.05 8.05Z" fill="#4CAF50" /></svg>, label: 'Sustainability Status', value: <span className="fs-badge fs-badge--success">Carbon Positive</span> },
                      ].map((m, i) => (
                        <div key={i} className="fs-farm-metric-row">
                          <div className="fs-farm-metric-icon">{m.icon}</div>
                          <div className="fs-farm-metric-content">
                            <div className="fs-farm-metric-label">{m.label}</div>
                            <div className="fs-farm-metric-value">{m.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* ── Financials Tab ── */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'financials' && (
            <div className="fs-tab-content">
              <div className="fs-stats-row">
                <KpiCard loading={loadingFinancials} icon={iconEarnings} label="Total Revenue" value={formatCurrency(totalEarnings)} subtext="Lifetime income" trend={financialStats?.trend_revenue} />
                <KpiCard loading={loadingFinancials} icon={iconExpenses} label="Total Expenses" value={formatCurrency(totalExpenses)} subtext="Total costs incurred" trend={financialStats?.trend_expenses != null ? -(financialStats.trend_expenses) : undefined} />
                <KpiCard loading={loadingFinancials} icon={iconProfit} label="Net Profit" value={formatCurrency(netProfit)} subtext="After all expenses" trend={financialStats?.trend_profit} />
                <KpiCard loading={loadingFinancials} icon={iconBalance} label="Profit Margin" value={`${profitMargin}%`} subtext="Of total revenue" />
              </div>

              <div className="fs-card">
                <div className="fs-card-header">
                  <h3 className="fs-card-title">Financial Overview</h3>
                  <div className="fs-chart-legend">
                    <span className="fs-legend-dot" style={{ background: '#4CAF50' }} /> Income
                    <span className="fs-legend-dot" style={{ background: '#F44336' }} /> Expenses
                    <span className="fs-legend-dot" style={{ background: '#2196F3' }} /> Profit
                  </div>
                </div>
                <FinancialLineChart data={monthlyData} loading={loadingFinancials} />
              </div>

              <div className="fs-analytics-row--split">
                <div className="fs-card">
                  <div className="fs-card-header"><h3 className="fs-card-title">Earnings by Category</h3></div>
                  <EarningsDonutChart categories={earningCategoriesData} loading={loadingCategories} showValues />
                  <button className="fs-link-btn" onClick={() => setActiveTab('financials')}>View Full Breakdown →</button>
                </div>

                <div className="fs-card">
                  <div className="fs-card-header">
                    <h3 className="fs-card-title">Recent Transactions</h3>
                    <button className="fs-view-all-btn" onClick={() => setActiveTab('transactions')}>View All →</button>
                  </div>
                  <div className="fs-tx-filters">
                    {['all', 'income', 'expense'].map(f => (
                      <button key={f} className={`fs-tx-filter-btn${txFilter === f ? ' fs-tx-filter-btn--active' : ''}`} onClick={() => setTxFilter(f)}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                  {loadingTransactions ? (
                    <div className="fs-tx-skeleton-list">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="fs-tx-skeleton-row">
                          <SkeletonLine width="80px" height="12px" />
                          <SkeletonLine width="140px" height="12px" />
                          <SkeletonLine width="80px" height="20px" />
                        </div>
                      ))}
                    </div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="fs-table-empty"><p>No transactions found</p></div>
                  ) : (
                    <div className="fs-mini-tx-list">
                      {filteredTransactions.slice(0, 8).map((tx, i) => {
                        const expense = isTxExpense(tx);
                        return (
                          <div key={i} className="fs-mini-tx-row">
                            <div className="fs-mini-tx-type-dot" style={{ background: expense ? '#EF4444' : '#16A34A' }} />
                            <div className="fs-mini-tx-info">
                              <span className="fs-mini-tx-desc">{tx.description || tx.narration || '—'}</span>
                              <span className="fs-mini-tx-date">{formatDate(tx.date || tx.created_at)}</span>
                            </div>
                            <span className={expense ? 'fs-amount-negative' : 'fs-amount-positive'}>
                              {expense ? '−' : '+'} {formatCurrency(tx.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* ── Harvests Tab ── */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'harvests' && (
            <div className="fs-tab-content">
              <div className="fs-stats-row">
                {[
                  {
                    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="#4CAF50" /></svg>,
                    bg: '#E8F9EE',
                    value: loadingHarvests ? '—' : harvests.length,
                    label: 'Total Harvests',
                    sub: 'Unique crop types recorded',
                  },
                  {
                    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6H4C2.9 6 2 6.9 2 8V16C2 17.1 2.9 18 4 18H20C21.1 18 22 17.1 22 16V8C22 6.9 21.1 6 20 6ZM20 16H4V8H20V16ZM14 10.5C14 11.33 13.33 12 12.5 12S11 11.33 11 10.5 11.67 9 12.5 9 14 9.67 14 10.5Z" fill="#2196F3" /></svg>,
                    bg: '#EBF5FF',
                    value: loadingHarvests ? '—' : `${(harvestStats.total_yield || 0).toLocaleString()} kg`,
                    label: 'Total Yield',
                    sub: 'Cumulative across all crops',
                  },
                  {
                    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z" fill="#9C27B0" /></svg>,
                    bg: '#F3E5FF',
                    value: loadingHarvests ? '—' : harvestStats.avg_per_acre > 0 ? `${harvestStats.avg_per_acre.toLocaleString()} kg` : 'N/A',
                    label: 'Avg. per Acre',
                    sub: harvestStats.avg_per_acre > 0 ? 'Yield efficiency' : 'No acreage data recorded',
                  },
                  {
                    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill="#FF9800" /></svg>,
                    bg: '#FFF7E6',
                    value: loadingHarvests ? '—' : formatDate(harvestStats.latest_date) || '—',
                    label: 'Last Harvest',
                    sub: 'Most recent record',
                  },
                ].map((s, i) => (
                  <div key={i} className="fs-stat-mini">
                    <div className="fs-stat-mini-icon" style={{ background: s.bg }}>{s.icon}</div>
                    <div className="fs-stat-mini-value">{s.value}</div>
                    <div className="fs-stat-mini-label">{s.label}</div>
                    <div className="fs-stat-mini-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="fs-analytics-row--split">
                <div className="fs-card">
                  <div className="fs-card-header">
                    <h3 className="fs-card-title">Recent Harvests</h3>
                    <button className="fs-view-all-btn" onClick={() => navigate('/reports/yield-productions')}>View in Reports →</button>
                  </div>
                  <div className="fs-harvest-table-wrap">
                    <table className="fs-harvest-table">
                      <thead>
                        <tr>
                          <th>Crop</th>
                          <th className="fs-th-right">Quantity</th>
                          <th>Unit</th>
                          <th>Harvest Date</th>
                          <th className="fs-th-right">Expected Income (KES)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingHarvests ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <tr key={i} className="fs-harvest-row">
                              <td colSpan="5"><SkeletonLine /></td>
                            </tr>
                          ))
                        ) : harvests.length === 0 ? (
                          <tr><td colSpan="5" className="fs-table-empty-cell">No harvests recorded</td></tr>
                        ) : harvests.map((h, i) => (
                          <tr key={i} className="fs-harvest-row">
                            <td><span className="fs-harvest-crop-cell"><span className="fs-harvest-crop-dot" />{h.crop}</span></td>
                            <td className="fs-td-right">{(h.quantity || 0).toLocaleString()}</td>
                            <td className="fs-harvest-unit-cell">{h.unit}</td>
                            <td>{formatDate(h.date || h.harvest_date)}</td>
                            <td className="fs-td-right fs-harvest-income-cell">{(h.income || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="fs-card-footer-center">
                    <button className="fs-footer-link-btn" onClick={() => navigate('/reports/yield-productions')}>
                      View all harvests
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="fs-footer-link-arrow">
                        <path d="M5 12H19M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="fs-card">
                  <div className="fs-card-header"><h3 className="fs-card-title">Crop Performance</h3></div>
                  <div className="fs-harvest-crop-list">
                    {(() => {
                      if (loadingHarvests) return Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="fs-harvest-crop-row">
                          <SkeletonLine width="100%" height="14px" />
                        </div>
                      ));
                      if (harvests.length === 0) return (
                        <div className="fs-table-empty"><p>No crop data available</p></div>
                      );
                      return harvests.map((h, i) => {
                        const pct = h.achievement_pct ?? 0;
                        const barPct = Math.min(pct, 100);
                        return (
                          <div key={i} className="fs-harvest-crop-row">
                            <div className="fs-harvest-crop-icon">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="#4CAF50" /></svg>
                            </div>
                            <div className="fs-harvest-crop-info">
                              <span className="fs-harvest-crop-name">{h.crop}</span>
                              <span className="fs-harvest-crop-stat">
                                {h.quantity > 0 ? `${h.quantity.toLocaleString()} kg harvested` : 'No yield recorded'}
                              </span>
                            </div>
                            <div className="fs-harvest-crop-bar-wrap">
                              <div
                                className="fs-harvest-crop-bar"
                                style={{ width: h.achievement_pct != null ? `${barPct}%` : '30%' }}
                                title={h.achievement_pct != null ? `${pct}% of expected yield` : 'No acreage data'}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* ── Crop Scans Tab ── */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'crop-scans' && (
            <div className="fs-tab-content">
              <div className="fs-stats-row">
                {[
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5zM22 7h-2V4h-3V2h5v5zm0 15v-5h-2v3h-3v2h5zM7 22H2v-5h2v3h3v2zM2 7V2h5v2H4v3H2z" fill="#4CAF50" /></svg>, bg: '#E8F9EE', value: loadingScans ? '—' : cropScans.length, label: 'Total Scans', sub: 'Scans performed' },
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="#23C55F" /></svg>, bg: '#E8F9EE', value: loadingScans ? '—' : healthyScans, label: 'Healthy', sub: 'No issues detected' },
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#FF9800" /></svg>, bg: '#FFF7E6', value: loadingScans ? '—' : warningScans + alertScans, label: 'Issues Found', sub: `${warningScans} warning, ${alertScans} alert` },
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill="#2196F3" /></svg>, bg: '#EBF5FF', value: loadingScans ? '—' : formatDate(lastScanDate), label: 'Last Scan', sub: 'Most recent detection' },
                ].map((s, i) => (
                  <div key={i} className="fs-stat-mini">
                    <div className="fs-stat-mini-icon" style={{ background: s.bg }}>{s.icon}</div>
                    <div className="fs-stat-mini-value">{s.value}</div>
                    <div className="fs-stat-mini-label">{s.label}</div>
                    <div className="fs-stat-mini-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="fs-analytics-row--split">
                <div className="fs-card">
                  <div className="fs-card-header">
                    <h3 className="fs-card-title">All Crop Scans</h3>
                    <button className="fs-view-all-btn" onClick={() => navigate('/disease-detection')}>Go to Disease Detection →</button>
                  </div>
                  {loadingScans ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="fs-scan-skeleton">
                        <div className="fs-scan-thumb-skeleton" />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <SkeletonLine width="65%" height="13px" />
                          <SkeletonLine width="45%" height="11px" />
                        </div>
                        <SkeletonLine width="60px" height="22px" />
                      </div>
                    ))
                  ) : cropScans.length === 0 ? (
                    <div className="fs-table-empty">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M4.47 21H19.53C21.07 21 22.03 19.33 21.26 18L13.73 4.99C12.96 3.66 11.04 3.66 10.27 4.99L2.74 18C1.97 19.33 2.93 21 4.47 21Z" fill="#9CA3AF" /></svg>
                      <p>No crop scans recorded</p>
                      <span className="fs-empty-hint">Scan results will appear here after performing disease detections</span>
                    </div>
                  ) : (
                    <div className="fs-scan-list">
                      {cropScans.map((scan, i) => (
                        <div key={i} className="fs-scan-item">
                          <div className="fs-scan-thumb">
                            {scan.image ? (
                              <>
                                <img
                                  src={`${API_BASE}${scan.image}`}
                                  alt="scan thumbnail"
                                  onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
                                />
                                <svg style={{ display: 'none' }} width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 3H3C2 3 1 4 1 5V19C1 20 2 21 3 21H21C22 21 23 20 23 19V5C23 4 22 3 21 3ZM21 19H3V5H21V19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="#9CA3AF" /></svg>
                              </>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 3H3C2 3 1 4 1 5V19C1 20 2 21 3 21H21C22 21 23 20 23 19V5C23 4 22 3 21 3ZM21 19H3V5H21V19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="#9CA3AF" /></svg>
                            )}
                          </div>
                          <div className="fs-scan-details">
                            <div className="fs-scan-field">{scan.field_name || scan.crop || scan.disease_name || 'Field Scan'}</div>
                            <div className="fs-scan-date">{formatDate(scan.date || scan.created_at)}</div>
                          </div>
                          {scan.confidence != null && (
  <div className="fs-scan-confidence">{Number(scan.confidence).toFixed(1)}% conf.</div>
)}
                          <span className={`fs-badge ${getHealthClass(getHealthLabel(scan))}`}>{getHealthLabel(scan)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="fs-card">
                  <div className="fs-card-header"><h3 className="fs-card-title">Health Distribution</h3></div>
                  {loadingScans ? (
                    <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
                  ) : cropScans.length === 0 ? (
                    <div className="fs-table-empty"><p>No scan data available</p></div>
                  ) : (
                    <div className="fs-health-dist">
                      {[
                        { label: 'Healthy', count: healthyScans, color: '#23C55F', bg: '#E8F9EE' },
                        { label: 'Warning', count: warningScans, color: '#FF9800', bg: '#FFF7E6' },
                        { label: 'Alert', count: alertScans, color: '#DC2626', bg: '#FEE2E2' },
                      ].map((h, i) => {
                        const pct = cropScans.length > 0 ? Math.round((h.count / cropScans.length) * 100) : 0;
                        return (
                          <div key={i} className="fs-health-dist-row">
                            <div className="fs-health-dist-header">
                              <div className="fs-health-dist-label-wrap">
                                <span className="fs-health-dist-dot" style={{ background: h.color }} />
                                <span className="fs-health-dist-label">{h.label}</span>
                              </div>
                              <span className="fs-health-dist-count" style={{ color: h.color }}>{h.count} <span className="fs-health-dist-pct">({pct}%)</span></span>
                            </div>
                            <div className="fs-health-dist-bar-track">
                              <div className="fs-health-dist-bar-fill" style={{ width: `${pct}%`, background: h.color }} />
                            </div>
                          </div>
                        );
                      })}

                      <div className="fs-health-summary-card">
                        <div className="fs-health-summary-icon" style={{ background: cropScans.length > 0 && alertScans === 0 ? '#E8F9EE' : '#FEE2E2' }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z" fill={cropScans.length > 0 && alertScans === 0 ? '#23C55F' : '#DC2626'} />
                          </svg>
                        </div>
                        <div>
                          <div className="fs-health-summary-title">{cropScans.length > 0 && alertScans === 0 ? 'Farm is Healthy' : 'Attention Required'}</div>
                          <div className="fs-health-summary-desc">{cropScans.length > 0 && alertScans === 0 ? 'No active disease alerts detected' : `${alertScans} alert(s) require immediate attention`}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* ── Carbon Impact Tab ── */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'carbon-impact' && (
            <div className="fs-tab-content">
              <div className="fs-carbon-overview-grid">
                {[
                  {
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6.05 8.05C3.32 10.78 3.32 15.2 6.03 17.93C7.5 14.53 10.12 11.69 13.39 10C10.62 12.34 8.68 15.61 8 19.32C10.6 20.55 13.8 20.1 15.95 17.95C19.43 14.47 20 4 20 4C20 4 9.53 4.57 6.05 8.05Z" fill="#4CAF50" /></svg>,
                    bg: '#E8F9EE', iconBg: '#C8F0D0', color: '#4CAF50',
                    label: 'Carbon Reduced', value: `${formatCarbonValue(carbonStats?.totalReductions ?? carbonStats?.carbon_reduced)} kg CO₂`, trendVal: carbonStats?.trend_reduced ?? null,
                  },
                  {
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="#00796B" /></svg>,
                    bg: '#E0F2F1', iconBg: '#B2DFDB', color: '#00796B',
                    label: 'Carbon Sequestered', value: `${formatCarbonValue(carbonStats?.totalSequestered ?? carbonStats?.carbon_sequestered)} kg CO₂`, trendVal: carbonStats?.trend_seq ?? null,
                  },
                  {
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="#2196F3" /></svg>,
                    bg: '#EBF5FF', iconBg: '#BBDEFB', color: '#2196F3',
                    label: 'Net Carbon Impact', value: `${formatCarbonValue(carbonStats?.netImpact ?? carbonStats?.totalEmissions)} kg CO₂`, trendVal: carbonStats?.trend_impact ?? null,
                  },
                ].map((m, i) => (
                  <div key={i} className="fs-carbon-big-card" style={{ background: m.bg, borderColor: m.iconBg }}>
                    <div className="fs-carbon-big-icon" style={{ background: m.iconBg }}>{m.icon}</div>
                    <div className="fs-carbon-big-label">{m.label}</div>
                    <div className="fs-carbon-big-value" style={{ color: m.color }}>{loadingCarbon ? '...' : m.value}</div>
                    {m.trendVal != null && (
                      <div className={`fs-carbon-big-trend ${m.trendVal === 0 ? 'fs-carbon-big-trend--flat' : m.trendVal > 0 ? 'fs-carbon-big-trend--up' : 'fs-carbon-big-trend--down'}`}>
                        {m.trendVal === 0 ? '→' : m.trendVal > 0 ? '↑' : '↓'} {Math.abs(m.trendVal)}% this month
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <DualCarbonLineChart
                labels={carbonLabels}
                reducedValues={carbonValues}
                seqValues={carbonSeqValues}
                loading={loadingCarbon}
                onViewReport={() => navigate('/reports/carbon-tracking')}
              />

              <div className="fs-analytics-row--split">
                <div className="fs-card">
                  <div className="fs-card-header"><h3 className="fs-card-title">Carbon Certificate</h3></div>
                  <div className="fs-certificate-card">
                    <div className="fs-certificate-icon">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z" fill="#4CAF50" />
                      </svg>
                    </div>
                    <div className="fs-certificate-info">
                      <div className="fs-certificate-title">AgriScan Carbon Certificate</div>
                      <div className="fs-certificate-name">{farmer?.name || 'Farmer'}</div>
                      <div className="fs-certificate-desc">This farmer has demonstrated carbon-positive farming practices verified by AgriScan AI monitoring systems.</div>
                      <span className="fs-badge fs-badge--success">Carbon Positive</span>
                    </div>
                  </div>
                  <button className="fs-link-btn" onClick={() => navigate('/reports/carbon-tracking')}>Download Certificate →</button>
                </div>

                <div className="fs-card">
                  <div className="fs-card-header">
                    <h3 className="fs-card-title">Monthly Carbon Breakdown</h3>
                    <div className="fs-chart-legend">
                      <span className="fs-legend-dot" style={{ background: '#16A34A' }} /> Reduced
                      <span className="fs-legend-dot" style={{ background: '#3B82F6' }} /> Sequestered
                    </div>
                  </div>
                  {loadingCarbon ? (
                    <div className="fs-chart-skeleton fs-chart-skeleton--line" />
                  ) : (() => {
                    const labels  = carbonLabels.slice(-8);
                    const reduced = carbonValues.slice(-8);
                    const seq     = carbonSeqValues.slice(-8);
                    const maxV    = Math.max(...reduced, ...seq) * 1.15 || 1;
                    const BAR_H   = 140, PAD_TOP = 8, PAD_BOT = 24;
                    const chartH  = BAR_H - PAD_TOP - PAD_BOT;
                    const n       = labels.length;
                    const slotW   = 1000 / n;
                    const barW    = slotW * 0.3;
                    const gap     = slotW * 0.04;
                    return (
                      <div className="fs-monthly-bar-wrap">
                        <svg viewBox={`0 0 1000 ${BAR_H}`} preserveAspectRatio="none" className="fs-monthly-bar-svg">
                          {/* Grid lines */}
                          {[0.33, 0.66, 1].map((p, i) => (
                            <line key={i} x1="0" y1={PAD_TOP + chartH * (1 - p)} x2="1000" y2={PAD_TOP + chartH * (1 - p)}
                              stroke="#F3F4F6" strokeWidth="1.5" />
                          ))}
                          {labels.map((_, i) => {
                            const cx     = slotW * i + slotW / 2;
                            const rH     = (reduced[i] / maxV) * chartH;
                            const sH     = (seq[i] / maxV) * chartH;
                            const rX     = cx - barW - gap / 2;
                            const sX     = cx + gap / 2;
                            return (
                              <g key={i}>
                                {/* Reduced bar */}
                                <rect x={rX} y={PAD_TOP + chartH - rH} width={barW} height={rH}
                                  rx="3" fill="#16A34A" fillOpacity="0.85" />
                                {/* Sequestered bar */}
                                <rect x={sX} y={PAD_TOP + chartH - sH} width={barW} height={sH}
                                  rx="3" fill="#3B82F6" fillOpacity="0.85" />
                              </g>
                            );
                          })}
                        </svg>
                        {/* X labels */}
                        <div className="fs-monthly-bar-labels">
                          {labels.map((l, i) => <span key={i}>{l}</span>)}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* ── Transactions Tab ── */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'transactions' && (
            <div className="fs-tab-content">
              <div className="fs-stats-row fs-stats-row--3">
                {[
                  { icon: iconBalance, bg: '#E8F9EE', value: loadingTransactions ? '—' : transactions.length, label: 'Total Transactions', sub: 'All recorded' },
                  { icon: iconEarnings, bg: '#E8F9EE', value: loadingTransactions ? '—' : formatCurrency(totalTxIncome), label: 'Total Income', sub: 'Sum of inflows' },
                  { icon: iconExpenses, bg: '#FEE2E2', value: loadingTransactions ? '—' : formatCurrency(totalTxExpense), label: 'Total Expenses', sub: 'Sum of outflows' },
                ].map((s, i) => (
                  <div key={i} className="fs-stat-mini">
                    <div className="fs-stat-mini-icon" style={{ background: s.bg }}>{s.icon}</div>
                    <div className="fs-stat-mini-value">{s.value}</div>
                    <div className="fs-stat-mini-label">{s.label}</div>
                    <div className="fs-stat-mini-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="fs-card">
                <div className="fs-card-header">
                  <h3 className="fs-card-title">All Transactions</h3>
                </div>

                <div className="fs-tx-toolbar">
                  <div className="fs-tx-filters">
                    {['all', 'income', 'expense', 'payout'].map(f => (
                      <button key={f} className={`fs-tx-filter-btn${txFilter === f ? ' fs-tx-filter-btn--active' : ''}`} onClick={() => setTxFilter(f)}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="fs-tx-search-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="fs-tx-search-icon">
                      <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="#9CA3AF" />
                    </svg>
                    <input className="fs-tx-search-input" type="text" placeholder="Search transactions..." value={txSearch} onChange={e => setTxSearch(e.target.value)} />
                  </div>
                </div>

                {loadingTransactions ? (
                  <div className="fs-tx-skeleton-list">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="fs-tx-skeleton-row">
                        <SkeletonLine width="80px" height="12px" />
                        <SkeletonLine width="200px" height="12px" />
                        <SkeletonLine width="80px" height="20px" />
                        <SkeletonLine width="90px" height="12px" />
                        <SkeletonLine width="70px" height="20px" />
                      </div>
                    ))}
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="fs-table-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" fill="#9CA3AF" /></svg>
                    <p>No transactions found</p>
                    {txSearch && <span className="fs-empty-hint">Try a different search term</span>}
                  </div>
                ) : (
                  <div className="fs-tx-table-wrapper">
                    <table className="fs-tx-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Category</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Balance</th>
                          <th>Method</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((tx, i) => {
                          const expense = isTxExpense(tx);
                          return (
                            <tr key={i} className="fs-tx-row">
                              <td className="fs-tx-date">{formatDate(tx.date || tx.created_at)}</td>
                              <td className="fs-tx-desc">{tx.description || tx.narration || '—'}</td>
                              <td><span className="fs-badge fs-badge--category">{tx.category || tx.type || '—'}</span></td>
                              <td><span className={`fs-tx-type ${expense ? 'fs-tx-type--expense' : 'fs-tx-type--income'}`}>{expense ? 'Expense' : 'Income'}</span></td>
                              <td className={expense ? 'fs-amount-negative' : 'fs-amount-positive'}>{expense ? '−' : '+'} {formatCurrency(tx.amount)}</td>
                              <td className="fs-tx-balance">{formatCurrency(tx.balance || tx.running_balance)}</td>
                              <td className="fs-tx-method">{tx.payment_method || tx.method || 'M-Pesa'}</td>
                              <td><span className={`fs-badge ${getTxStatusClass(tx.status)}`}>{tx.status || 'Completed'}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default FarmerStatement;
