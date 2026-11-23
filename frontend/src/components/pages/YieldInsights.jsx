import React, { useEffect, useState, useRef, useMemo } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { apiFetch } from '../../utils/apiFetch';
import './YieldInsights.css';


/* ─────────────────────────────────────────────────────────────
   SMOOTH SVG PATH HELPERS (reused verbatim from ChatbotInsights.jsx)
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
   CSV HELPER (quoted, matches YieldProductionsReport.jsx pattern)
───────────────────────────────────────────────────────────── */
function downloadCSV(filename, rows) {
  const lines = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────────────────────
   NORMALIZERS (mirrors YieldProductionsReport.jsx field mapping)
───────────────────────────────────────────────────────────── */
const normalizeSummaryRow = (r) => ({
  id: r.id ?? Math.random(),
  county: r.county ?? '',
  cropType: r.crop_type ?? r.cropType ?? '',
  totalExpectedYield: Number(r.total_expected_yield ?? r.totalExpectedYield ?? 0),
  totalActualYield: Number(r.total_actual_yield ?? r.totalActualYield ?? 0),
  avgYieldPerHectare: Number(r.avg_yield_per_hectare ?? r.avgYieldPerHectare ?? 0),
  achievementPct: (r.achievement_pct ?? r.achievementPct) != null ? Number(r.achievement_pct ?? r.achievementPct) : null,
  topPerforming: [true, 'true', 1, '1'].includes(r.top_performing ?? r.topPerforming),
});

const normalizeDetailedRow = (r) => ({
  id: r.id ?? Math.random(),
  regNo: r.reg_no ?? r.regNo ?? '',
  farmerName: r.farmer_name ?? r.farmerName ?? '',
  cropType: r.crop_type ?? r.cropType ?? '',
  county: r.county ?? '',
  farmSizeHa: parseFloat(r.farm_size_ha ?? r.farmSizeHa ?? 0),
  achievementPct: parseFloat(r.achievement_pct ?? r.achievementPct ?? 0),
});

const normalizeLeaderboardRow = (r) => ({
  regNo: r.reg_no ?? r.regNo ?? '',
  farmerName: r.farmer_name ?? r.farmerName ?? '',
  cropType: r.crop_type ?? r.cropType ?? '',
  county: r.county ?? '',
  achievementPct: parseFloat(r.achievement_pct ?? r.achievementPct ?? 0),
});

/* ─────────────────────────────────────────────────────────────
   YIELD SERIES COLORS
───────────────────────────────────────────────────────────── */
const YIELD_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548'];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const YieldInsights = () => {
  const API_BASE = import.meta.env.VITE_API_URL;

  /* ── MOCK DATA CONSTANTS (endpoints that don't exist yet) ─ */
  const MOCK_YIELD_TRENDS = {
    labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    expected: [142000, 158000, 165000, 171000, 180000, 176000],
    actual: [118000, 129000, 138000, 149000, 161000, 152000],
  };
  const MOCK_SEASONAL = {
    current_season: { label: 'Long Rains 2026', achievement_pct: 71.4 },
    previous_season: { label: 'Short Rains 2025', achievement_pct: 66.8 },
  };
  const MOCK_LOW_PERFORMERS = [
    { reg_no: 'FRN-2025042', farmer_name: 'Peter Otieno', county: 'Kisumu', crop_type: 'Rice', achievement_pct: 31.2 },
    { reg_no: 'FRN-2025107', farmer_name: 'Grace Wambui', county: 'Nakuru', crop_type: 'Wheat', achievement_pct: 34.8 },
    { reg_no: 'FRN-2025063', farmer_name: 'Samuel Kiplagat', county: 'Eldoret', crop_type: 'Maize', achievement_pct: 38.1 },
    { reg_no: 'FRN-2025019', farmer_name: 'Fatuma Abdi', county: 'Garissa', crop_type: 'Sorghum', achievement_pct: 41.5 },
    { reg_no: 'FRN-2025088', farmer_name: 'John Mutua', county: 'Thika', crop_type: 'Beans', achievement_pct: 44.7 },
  ];
  const MOCK_ACREAGE_COVERAGE = { total_records: 214, missing_acreage: 18, coverage_pct: 91.6 };

  /* ── DATA STATE (real endpoints) ─────────────────────── */
  const [summaryData, setSummaryData] = useState([]);
  const [detailedData, setDetailedData] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDetailed, setLoadingDetailed] = useState(true);

  /* ── DATA STATE (mock-initialised, capability-flagged) ── */
  const [yieldTrends, setYieldTrends] = useState(MOCK_YIELD_TRENDS);
  const [trendsLive, setTrendsLive] = useState(false);

  const [seasonal, setSeasonal] = useState(MOCK_SEASONAL);
  const [seasonalLive, setSeasonalLive] = useState(false);

  const [lowPerformers, setLowPerformers] = useState(MOCK_LOW_PERFORMERS.map(normalizeLeaderboardRow));
  const [lowPerformersLive, setLowPerformersLive] = useState(false);

  const [acreageCoverage, setAcreageCoverage] = useState(MOCK_ACREAGE_COVERAGE);
  const [acreageLive, setAcreageLive] = useState(false);

  /* ── UI STATE ─────────────────────────────────────────── */
  const [trendTooltip, setTrendTooltip] = useState(null);
  const [showAllIntervention, setShowAllIntervention] = useState(false);
  const trendSvgRef = useRef(null);

  /* ── SHARED HOVER TOOLTIP (for charts without a dedicated one) ── */
  const [chartTooltip, setChartTooltip] = useState(null);
  const showChartTooltip = (e, title, rows, idx = null) => {
    setChartTooltip({ x: e.clientX, y: e.clientY, title, rows, idx });
  };
  const hideChartTooltip = () => setChartTooltip(null);

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
        // Core endpoints (known to exist) — fetched unfiltered (no county/crop params)
        apiFetch(`${API_BASE}/yield/report/summary`)
          .then(r => (r.status === 404 ? { data: [] } : r.json()))
          .then(d => setSummaryData((d.data ?? []).map(normalizeSummaryRow)))
          .catch(() => {})
          .finally(() => setLoadingSummary(false)),

        // NOTE: page_size=500 pulls the full detailed dataset client-side to build the
        // achievement distribution + intervention fallback. This is a known scaling
        // limit — once farmer count grows past a few hundred, replace with a dedicated
        // backend aggregate endpoint instead of paging the full dataset here.
        apiFetch(`${API_BASE}/yield/report/detailed?page=1&page_size=500`)
          .then(r => (r.status === 404 ? { data: [] } : r.json()))
          .then(d => setDetailedData((d.data ?? []).map(normalizeDetailedRow)))
          .catch(() => {})
          .finally(() => setLoadingDetailed(false)),

        // Extended endpoints (may not exist yet — mock stays in place on failure)
        // NOTE: like /summary and /detailed, these endpoints wrap their payload in a
        // top-level "data" envelope — unwrap it before reading fields, otherwise every
        // field lookup below silently resolves to undefined and insights fall back to 0.
        safeFetch(`${API_BASE}/yield/trends?months=6`, d => {
          const payload = d?.data ?? d ?? {};
          setYieldTrends({ labels: payload.labels || [], expected: payload.expected || [], actual: payload.actual || [] });
          setTrendsLive(true);
        }),
        safeFetch(`${API_BASE}/yield/report/seasonal-comparison`, d => {
          const payload = d?.data ?? d ?? {};
          const current = payload.current_season ?? payload.currentSeason ?? {};
          const previous = payload.previous_season ?? payload.previousSeason ?? {};
          setSeasonal({
            current_season: {
              label: current.label ?? 'Current Season',
              achievement_pct: Number(current.achievement_pct ?? current.achievementPct ?? 0),
            },
            previous_season: {
              label: previous.label ?? 'Previous Season',
              achievement_pct: Number(previous.achievement_pct ?? previous.achievementPct ?? 0),
            },
          });
          setSeasonalLive(true);
        }),
        safeFetch(`${API_BASE}/yield/report/low-performers?limit=5`, d => {
          const payload = d?.data ?? d ?? {};
          setLowPerformers((payload.farmers ?? (Array.isArray(payload) ? payload : [])).map(normalizeLeaderboardRow));
          setLowPerformersLive(true);
        }),
        safeFetch(`${API_BASE}/yield/report/acreage-coverage`, d => {
          const payload = d?.data ?? d ?? {};
          setAcreageCoverage({
            total_records: Number(payload.total_records ?? payload.totalRecords ?? 0),
            missing_acreage: Number(payload.missing_acreage ?? payload.missingAcreage ?? 0),
            coverage_pct: Number(payload.coverage_pct ?? payload.coveragePct ?? 0),
          });
          setAcreageLive(true);
        }),
      ]);
    };
    load();
  }, [API_BASE]);

  /* ── LOW-PERFORMERS FALLBACK: derive from real detailed data
     when the dedicated endpoint isn't live yet, instead of showing
     the static mock over real farmers ─────────────────────── */
  useEffect(() => {
    if (lowPerformersLive || detailedData.length === 0) return;
    const derived = [...detailedData]
      .sort((a, b) => a.achievementPct - b.achievementPct)
      .slice(0, 5);
    setLowPerformers(derived);
  }, [detailedData, lowPerformersLive]);

  const lowPerformersIsMock = !lowPerformersLive && detailedData.length === 0;

  /* ── COMPUTED: KPI TOTALS ─────────────────────────────── */
  const totalExpectedYield = summaryData.reduce((s, r) => s + r.totalExpectedYield, 0);
  const totalActualYield = summaryData.reduce((s, r) => s + r.totalActualYield, 0);
  const overallAchievementRate = totalExpectedYield > 0
    ? (totalActualYield / totalExpectedYield) * 100
    : 0;
  const avgYieldPerHectare = summaryData.length > 0
    ? summaryData.reduce((s, r) => s + r.avgYieldPerHectare, 0) / summaryData.length
    : 0;

  const interventionCount = useMemo(() => {
  if (detailedData.length > 0) {
    // Dedupe on regNo — a farmer with any crop below 50% counts once,
    // even if they have multiple flagged crop records.
    const flaggedFarmers = new Set(
      detailedData.filter(r => r.achievementPct < 50).map(r => r.regNo)
    );
    return flaggedFarmers.size;
  }
  // Fallback: lowPerformers is already deduped-per-farmer once the
  // backend endpoint is live (see step 1) — just count it directly.
  return lowPerformers.filter(f => f.achievementPct < 50).length;
}, [detailedData, lowPerformers]);

  const fmtK = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k kg` : `${Math.round(n)} kg`;

  /* ── COMPUTED: COUNTY / CROP BREAKDOWNS ───────────────── */
  const countyBreakdown = useMemo(() => {
    const map = new Map();
    summaryData.forEach(r => {
      const prev = map.get(r.county) || { expected: 0, actual: 0 };
      map.set(r.county, {
        expected: prev.expected + r.totalExpectedYield,
        actual: prev.actual + r.totalActualYield,
      });
    });
    return [...map.entries()]
      .map(([county, v]) => ({
        label: county,
        value: v.actual,
        expected: v.expected,
        achievementPct: v.expected > 0 ? (v.actual / v.expected) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [summaryData]);

  /* Top 3 counties by achievement rate — for the medal leaderboard */
  const topCounties = useMemo(() => {
    return [...countyBreakdown]
      .sort((a, b) => b.achievementPct - a.achievementPct)
      .slice(0, 3);
  }, [countyBreakdown]);

  /* Farm size vs. achievement scatter — client-derived from the real detailed dataset */
  const scatterPoints = useMemo(() => {
    return detailedData.filter(r => r.farmSizeHa > 0);
  }, [detailedData]);

  const farmSizeCorrelation = useMemo(() => {
    const n = scatterPoints.length;
    if (n < 5) return null;
    const xs = scatterPoints.map(p => p.farmSizeHa);
    const ys = scatterPoints.map(p => p.achievementPct);
    const xMean = xs.reduce((s, v) => s + v, 0) / n;
    const yMean = ys.reduce((s, v) => s + v, 0) / n;
    let cov = 0, xVar = 0, yVar = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - xMean, dy = ys[i] - yMean;
      cov += dx * dy; xVar += dx * dx; yVar += dy * dy;
    }
    const denom = Math.sqrt(xVar * yVar);
    return denom > 0 ? cov / denom : 0;
  }, [scatterPoints]);

  const cropBreakdown = useMemo(() => {
    const map = new Map();
    summaryData.forEach(r => {
      const prev = map.get(r.cropType) || 0;
      map.set(r.cropType, prev + r.totalActualYield);
    });
    return [...map.entries()]
      .map(([crop, actual]) => ({ label: crop, value: actual }))
      .sort((a, b) => b.value - a.value);
  }, [summaryData]);

  const countyTotal = countyBreakdown.reduce((s, r) => s + r.value, 0);
  const cropTotal = cropBreakdown.reduce((s, r) => s + r.value, 0);
  const countyGroupedMax = Math.max(...countyBreakdown.flatMap(r => [r.value, r.expected]), 1);

  /* ── DONUT MATH (crop mix) ─────────────────────────────── */
  const donutSegments = useMemo(() => {
    let cumulative = 0;
    const r = 40, circ = 2 * Math.PI * r;
    return cropBreakdown.map((c, i) => {
      const pct = cropTotal > 0 ? c.value / cropTotal : 0;
      const seg = { ...c, pct, color: YIELD_COLORS[i % YIELD_COLORS.length], offset: cumulative * circ, length: pct * circ, r, circ };
      cumulative += pct;
      return seg;
    });
  }, [cropBreakdown, cropTotal]);

  /* ── COMPUTED: ACHIEVEMENT DISTRIBUTION ───────────────── */
  const distribution = useMemo(() => {
    const buckets = { low: 0, mid: 0, high: 0 };
    detailedData.forEach(r => {
      if (r.achievementPct < 50) buckets.low += 1;
      else if (r.achievementPct < 80) buckets.mid += 1;
      else buckets.high += 1;
    });
    return [
      { label: '< 50% (Needs intervention)', count: buckets.low, color: '#F44336' },
      { label: '50–80% (On track)', count: buckets.mid, color: '#FF9800' },
      { label: '≥ 80% (High achievers)', count: buckets.high, color: '#4CAF50' },
    ];
  }, [detailedData]);

  const distTotal = distribution.reduce((s, b) => s + b.count, 0);
  const distMax = Math.max(...distribution.map(b => b.count), 1);

  /* ── COMPUTED: TOP PERFORMING COUNTY/CROP COMBO ───────── */
  const topPerformingRow = useMemo(() => {
    if (summaryData.length === 0) return null;
    const flagged = summaryData.find(r => r.topPerforming);
    if (flagged) return flagged;
    return [...summaryData].sort((a, b) => {
      const aPct = a.totalExpectedYield > 0 ? a.totalActualYield / a.totalExpectedYield : 0;
      const bPct = b.totalExpectedYield > 0 ? b.totalActualYield / b.totalExpectedYield : 0;
      return bPct - aPct;
    })[0];
  }, [summaryData]);

  const topPerformingPct = topPerformingRow
    ? (topPerformingRow.achievementPct != null
        ? topPerformingRow.achievementPct.toFixed(1)
        : topPerformingRow.totalExpectedYield > 0
          ? ((topPerformingRow.totalActualYield / topPerformingRow.totalExpectedYield) * 100).toFixed(1)
          : null)
    : null;

  /* ── COMPUTED: SEASON COMPARISON ───────────────────────── */
  const seasonDelta = (seasonal.current_season?.achievement_pct ?? 0) - (seasonal.previous_season?.achievement_pct ?? 0);

  /* ── AI INSIGHTS — computed dynamically ───────────────── */
  const aiInsights = [
    topPerformingRow ? {
      color: '#22C55E',
      bg: '#F0FDF4',
      iconPath: 'M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z',
      title: `Top Performer: ${topPerformingRow.county} · ${topPerformingRow.cropType}`,
      text: `Achieving ${topPerformingPct}% of expected yield — the strongest county/crop combination in your network right now.`,
      textColor: '#166534',
    } : null,
    {
      color: seasonDelta >= 0 ? '#22C55E' : '#EF4444',
      bg: seasonDelta >= 0 ? '#F0FDF4' : '#FEF2F2',
      iconPath: seasonDelta >= 0
        ? 'M7 14l5-5 5 5H7z'
        : 'M7 10l5 5 5-5H7z',
      title: seasonDelta >= 0 ? 'Season-over-Season Improvement' : 'Achievement Rate Dropped',
      text: seasonDelta >= 0
        ? `Achievement rate is up ${seasonDelta.toFixed(1)} points versus ${seasonal.previous_season?.label}.`
        : `Achievement rate fell ${Math.abs(seasonDelta).toFixed(1)} points versus ${seasonal.previous_season?.label} — worth flagging with field teams.`,
      textColor: seasonDelta >= 0 ? '#166534' : '#991B1B',
    },
    acreageCoverage.coverage_pct < 95 ? {
      color: '#F59E0B',
      bg: '#FFFBEB',
      iconPath: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM13 17h-2v-2h2v2zm0-4h-2V7h2v6z',
      title: 'Acreage Data Gaps',
      text: `Only ${acreageCoverage.coverage_pct}% of records have acreage recorded — missing values can skew yield-per-hectare figures.`,
      textColor: '#92400E',
    } : null,
    farmSizeCorrelation !== null ? {
      color: '#3B82F6',
      bg: '#EFF6FF',
      iconPath: 'M9 3v18h2V3H9zm4 6v12h2V9h-2zm-8 4v8h2v-8H5zm12-8v16h2V5h-2z',
      title: 'Farm Size vs. Achievement',
      text: Math.abs(farmSizeCorrelation) < 0.15
        ? `No strong relationship between farm size and achievement rate — smallholders are keeping pace with larger farms.`
        : farmSizeCorrelation > 0
          ? `Larger farms trend toward higher achievement rates (correlation ${farmSizeCorrelation.toFixed(2)}) — smallholders may need more support.`
          : `Smaller farms trend toward higher achievement rates (correlation ${farmSizeCorrelation.toFixed(2)}) — larger plots may be under-resourced per hectare.`,
      textColor: '#1E40AF',
    } : null,
  ].filter(Boolean);

  /* ── TREND CHART MATH (mirrors ChatbotInsights trend chart) ── */
  const trendMax = Math.max(...yieldTrends.expected, ...yieldTrends.actual, 1);
  const SVG_W = 1000, SVG_H = 220;
  const pad = { l: 60, r: 20, t: 20, b: 40 };
  const plotW = SVG_W - pad.l - pad.r;
  const plotH = SVG_H - pad.t - pad.b;
  const stepX = yieldTrends.labels.length > 1 ? plotW / (yieldTrends.labels.length - 1) : plotW;
  const getY = (v) => pad.t + plotH - Math.max((v / (trendMax || 1)), 0) * plotH;

  const actualPts = yieldTrends.actual.map((v, i) => ({ x: pad.l + i * stepX, y: getY(v || 0) }));
  const expectedPts = yieldTrends.expected.map((v, i) => ({ x: pad.l + i * stepX, y: getY(v || 0) }));

  const yTicks = 5;
  const ySteps = Array.from({ length: yTicks + 1 }, (_, i) => Math.round(trendMax * (1 - i / yTicks)));

  const handleTrendMouseMove = (e) => {
    const rect = trendSvgRef.current?.getBoundingClientRect();
    if (!rect || actualPts.length === 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * SVG_W;
    let nearest = 0, minDist = Infinity;
    actualPts.forEach((p, i) => {
      const d = Math.abs(p.x - svgX);
      if (d < minDist) { minDist = d; nearest = i; }
    });
    setTrendTooltip({ x: e.clientX, y: e.clientY, idx: nearest });
  };

  /* ── ACHIEVEMENT GAUGE ─────────────────────────────────── */
  const gaugeR = 40, gaugeCx = 52, gaugeCy = 52;
  const gaugeCirc = 2 * Math.PI * gaugeR;
  const gaugePct = Math.min(overallAchievementRate, 100);
  const gaugeGreen = (gaugePct / 100) * gaugeCirc;
  const gaugeGrey = gaugeCirc - gaugeGreen;
  const gaugeColor = overallAchievementRate >= 80 ? '#4CAF50' : overallAchievementRate >= 50 ? '#FF9800' : '#F44336';

  /* ── EXPORT ───────────────────────────────────────────── */
  const handleExport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Expected Yield (kg)', Math.round(totalExpectedYield)],
      ['Total Actual Yield (kg)', Math.round(totalActualYield)],
      ['Overall Achievement Rate (%)', overallAchievementRate.toFixed(1)],
      ['Avg Yield per Hectare (kg/ha)', avgYieldPerHectare.toFixed(1)],
      ['Acreage Data Coverage (%)', acreageCoverage.coverage_pct],
      ['Farmers Needing Intervention', interventionCount],
      ['Current Season Achievement (%)', seasonal.current_season?.achievement_pct ?? '—'],
      ['Previous Season Achievement (%)', seasonal.previous_season?.achievement_pct ?? '—'],
      [],
      ['County', 'Expected Yield (kg)', 'Actual Yield (kg)', 'Achievement %', 'Share of Actual %'],
      ...countyBreakdown.map(c => [c.label, Math.round(c.expected), Math.round(c.value), c.achievementPct.toFixed(1), countyTotal > 0 ? ((c.value / countyTotal) * 100).toFixed(1) : 0]),
      [],
      ['Crop', 'Total Actual Yield (kg)', 'Share %'],
      ...cropBreakdown.map(c => [c.label, Math.round(c.value), cropTotal > 0 ? ((c.value / cropTotal) * 100).toFixed(1) : 0]),
      [],
      ['Achievement Bucket', 'Farmer-Crop Records'],
      ...distribution.map(b => [b.label, b.count]),
      [],
      ['Top Performing Counties', 'Achievement %'],
      ...topCounties.map(c => [c.label, c.achievementPct.toFixed(1)]),
      [],
      ['Farm Size vs. Achievement Correlation', farmSizeCorrelation !== null ? farmSizeCorrelation.toFixed(3) : 'insufficient data'],
      [],
      ['Farmers Needing Intervention', 'Reg No', 'County', 'Crop', 'Achievement %'],
      ...lowPerformers.map(f => [f.farmerName, f.regNo, f.county, f.cropType, f.achievementPct]),
    ];
    downloadCSV('yield-insights.csv', rows);
  };

  const lowMax = 100;

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content yi-page">

          {/* ── PAGE HEADER ──────────────────────────── */}
          <div className="yi-page-header">
            <div className="yi-page-header-left">
              <h1 className="yi-page-title">Yield Insights &amp; Analysis</h1>
              <p className="yi-page-subtitle">
                Crop performance, achievement trends, and intervention priorities across your network.
              </p>
            </div>
            <div className="yi-page-header-actions">
              <button className="yi-export-btn" onClick={handleExport}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13V18C19 18.55 18.55 19 18 19H6C5.45 19 5 18.55 5 18V13C5 12.45 4.55 12 4 12C3.45 12 3 12.45 3 13V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13C21 12.45 20.55 12 20 12C19.45 12 19 12.45 19 13ZM13 12.67L14.88 10.79C15.27 10.4 15.9 10.4 16.29 10.79C16.68 11.18 16.68 11.81 16.29 12.2L12.7 15.79C12.31 16.18 11.68 16.18 11.29 15.79L7.7 12.2C7.31 11.81 7.31 11.18 7.7 10.79C8.09 10.4 8.72 10.4 9.11 10.79L11 12.67V4C11 3.45 11.45 3 12 3C12.55 3 13 3.45 13 4V12.67Z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* ── KPI CARDS ─────────────────────────────── */}
          <div className="yi-kpi-grid">

            {/* Total Expected Yield */}
            <div className="yi-kpi-card">
              <div className="yi-kpi-top-row">
                <div className="yi-kpi-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
              </div>
              <div className="yi-kpi-value">
                {loadingSummary ? <span className="yi-skeleton yi-skeleton-val" /> : fmtK(totalExpectedYield)}
              </div>
              <div className="yi-kpi-label">Total Expected Yield</div>
            </div>

            {/* Total Actual Yield */}
            <div className="yi-kpi-card">
              <div className="yi-kpi-top-row">
                <div className="yi-kpi-icon" style={{ background: '#F0FDF4', color: '#4CAF50' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
              </div>
              <div className="yi-kpi-value">
                {loadingSummary ? <span className="yi-skeleton yi-skeleton-val" /> : fmtK(totalActualYield)}
              </div>
              <div className="yi-kpi-label">Total Actual Yield</div>
            </div>

            {/* Overall Achievement Rate — gauge */}
            <div className="yi-kpi-card yi-kpi-card--gauge yi-kpi-card--highlight"
              style={{ background: `linear-gradient(160deg, ${gaugeColor}14, #ffffff 60%)` }}>
              <div className="yi-gauge-layout yi-gauge-layout--center">
                <svg width="112" height="112" viewBox="0 0 104 104">
                  <circle cx={gaugeCx} cy={gaugeCy} r={gaugeR} fill="none"
                    stroke="#f0f2f5" strokeWidth="10"
                    strokeDasharray={`${gaugeCirc} ${gaugeCirc}`}
                    transform={`rotate(-90 ${gaugeCx} ${gaugeCy})`} />
                  <circle cx={gaugeCx} cy={gaugeCy} r={gaugeR} fill="none"
                    stroke={gaugeColor} strokeWidth="10"
                    strokeDasharray={`${gaugeGreen} ${gaugeGrey}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${gaugeCx} ${gaugeCy})`} />
                  <text x={gaugeCx} y={gaugeCy - 3} textAnchor="middle"
                    fontSize="22" fontWeight="800" fill="#111827">{overallAchievementRate.toFixed(0)}%</text>
                  <text x={gaugeCx} y={gaugeCy + 14} textAnchor="middle"
                    fontSize="11" fill="#9CA3AF">achieved</text>
                </svg>
                <div className="yi-gauge-details yi-gauge-details--center">
                  <div className="yi-kpi-label">Overall Achievement Rate</div>
                  <span className="yi-gauge-status-badge" style={{ background: gaugeColor + '1f', color: gaugeColor }}>
                    {overallAchievementRate >= 80 ? 'On Target' : overallAchievementRate >= 50 ? 'Watch' : 'At Risk'}
                  </span>
                </div>
              </div>
            </div>

            {/* Avg Yield per Hectare */}
            <div className="yi-kpi-card">
              <div className="yi-kpi-top-row">
                <div className="yi-kpi-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L4 12l8 10 8-10-8-10z" />
                  </svg>
                </div>
              </div>
              <div className="yi-kpi-value" style={{ color: '#8B5CF6' }}>
                {loadingSummary ? <span className="yi-skeleton yi-skeleton-val" /> : `${avgYieldPerHectare.toFixed(0)} kg/ha`}
              </div>
              <div className="yi-kpi-label">Avg Yield per Hectare</div>
              <div className="yi-kpi-sub">Across all reporting counties</div>
            </div>

            {/* Acreage Data Coverage */}
            <div className="yi-kpi-card">
              <div className="yi-kpi-top-row">
                <div className="yi-kpi-icon" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" />
                  </svg>
                </div>
              </div>
              <div className="yi-kpi-value">{acreageCoverage.coverage_pct}%</div>
              <div className="yi-kpi-label">
                Acreage Data Coverage
                {!acreageLive && <span className="yi-mock-badge">Preview data</span>}
              </div>
              <div className="yi-kpi-sub">
                {acreageCoverage.missing_acreage} of {acreageCoverage.total_records} records missing acreage
              </div>
            </div>

            {/* Farmers Needing Intervention */}
            <div className="yi-kpi-card">
              <div className="yi-kpi-top-row">
                <div className="yi-kpi-icon" style={{ background: '#FEF2F2', color: '#EF4444' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                  </svg>
                </div>
              </div>
              <div className="yi-kpi-value" style={{ color: '#EF4444' }}>
                {loadingDetailed ? <span className="yi-skeleton yi-skeleton-val" /> : interventionCount}
              </div>
              <div className="yi-kpi-label">Farmers Needing Intervention</div>
              <div className="yi-kpi-sub">Achievement rate below 50%</div>
            </div>

          </div>

          {/* ── ROW 1: TREND CHART + AI INSIGHTS ─────── */}
          <div className="yi-analytics-row yi-row--trend">

            {/* Yield Trend Chart */}
            <div className="yi-chart-card yi-trend-chart-card">
              <div className="yi-chart-header">
                <div>
                  <div className="yi-chart-title">
                    Yield Trend
                    {!trendsLive && <span className="yi-mock-badge">Preview data</span>}
                  </div>
                  <div className="yi-chart-subtitle">Monthly expected vs. actual yield volume across your network</div>
                </div>
                <div className="yi-chart-legend">
                  <span className="yi-legend-dot" style={{ background: '#4CAF50' }} />
                  <span className="yi-legend-label">Actual</span>
                  <span style={{ width: 24, display: 'inline-flex', alignItems: 'center', marginLeft: 8, marginRight: 4 }}>
                    <svg width="24" height="4" viewBox="0 0 24 4">
                      <line x1="0" y1="2" x2="24" y2="2" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 3" />
                    </svg>
                  </span>
                  <span className="yi-legend-label">Expected</span>
                  <span className="yi-legend-val" style={{ marginLeft: 8 }}>
                    {yieldTrends.actual.length > 0 ? `Total ${fmtK(totalActualYield)}` : '—'}
                  </span>
                </div>
              </div>

              {yieldTrends.labels.length === 0 ? (
                <div className="yi-chart-empty">
                  <p>No yield trend data available yet</p>
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
                      <linearGradient id="yi-trend-grad" x1="0" y1="0" x2="0" y2="1">
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

                    {/* Expected line — dashed reference, rendered behind actual */}
                    {expectedPts.length >= 2 && (
                      <path
                        d={smoothLine(expectedPts)}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        fill="none"
                        strokeDasharray="6 4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.6"
                      />
                    )}

                    <path d={smoothArea(actualPts, pad.t + plotH)} fill="url(#yi-trend-grad)" />
                    <path d={smoothLine(actualPts)} stroke="#4CAF50" strokeWidth="2.5"
                      fill="none" strokeLinecap="round" strokeLinejoin="round" />

                    {trendTooltip && (
                      <line
                        x1={actualPts[trendTooltip.idx].x} x2={actualPts[trendTooltip.idx].x}
                        y1={pad.t} y2={pad.t + plotH}
                        stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" opacity="0.5"
                      />
                    )}

                    {actualPts.map((pt, i) => (
                      <circle key={i} cx={pt.x} cy={pt.y}
                        r={trendTooltip?.idx === i ? 6 : 3.5}
                        fill="#4CAF50" stroke="white" strokeWidth="2"
                        opacity={trendTooltip?.idx === i ? 1 : 0.6} />
                    ))}

                    {yieldTrends.labels.map((lbl, i) => (
                      <text key={i} x={actualPts[i]?.x ?? 0} y={SVG_H - 8}
                        textAnchor="middle" fontSize="10" fill="#c0c8d4">{lbl}</text>
                    ))}
                  </svg>

                  {trendTooltip && (
                    <div className="yi-tooltip"
                      style={{ left: trendTooltip.x + 14, top: trendTooltip.y - 70 }}>
                      <div className="yi-tooltip-month">{yieldTrends.labels[trendTooltip.idx]}</div>
                      <div className="yi-tooltip-row">
                        <span className="yi-tooltip-dot" style={{ background: '#4CAF50' }} />
                        <span className="yi-tooltip-label">Actual</span>
                        <span className="yi-tooltip-val">
                          {(yieldTrends.actual[trendTooltip.idx] || 0).toLocaleString()} kg
                        </span>
                      </div>
                      <div className="yi-tooltip-row">
                        <span className="yi-tooltip-dot" style={{ background: '#94a3b8' }} />
                        <span className="yi-tooltip-label">Expected</span>
                        <span className="yi-tooltip-val">
                          {(yieldTrends.expected[trendTooltip.idx] || 0).toLocaleString()} kg
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Insights Panel */}
            <div className="yi-chart-card yi-ai-card">
              <div className="yi-ai-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#4CAF50">
                  <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
                </svg>
                <span className="yi-ai-title">AI-Powered Insights</span>
              </div>
              <div className="yi-ai-subtitle">Observations for cooperatives &amp; NGOs</div>

              <div className="yi-ai-list">
                {aiInsights.map((ins, i) => (
                  <div key={i} className="yi-ai-item"
                    style={{ background: ins.bg, borderColor: ins.color + '40' }}>
                    <div className="yi-ai-item-icon" style={{ background: ins.color }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                        <path d={ins.iconPath} />
                      </svg>
                    </div>
                    <div className="yi-ai-item-body">
                      <div className="yi-ai-item-title" style={{ color: ins.textColor }}>{ins.title}</div>
                      <div className="yi-ai-item-text">{ins.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── ROW 2: TOP PERFORMING COUNTIES (medal rings) + CROP MIX (donut) ── */}
          <div className="yi-analytics-row yi-row--medals">

            {/* Top Performing Counties — radial medal leaderboard */}
            <div className="yi-chart-card yi-medal-card">
              <div className="yi-chart-title">Top Performing Counties</div>
              <div className="yi-chart-subtitle">Highest achievement rate this period</div>

              {loadingSummary ? (
                <div className="yi-chart-empty"><div className="yi-skeleton yi-skeleton-chart" /></div>
              ) : topCounties.length === 0 ? (
                <div className="yi-chart-empty"><p>No county data available yet</p></div>
              ) : (
                <div className="yi-medal-row">
                  {topCounties.map((c, i) => {
                    const medal = ['#FFD700', '#C0C0C0', '#CD7F32'][i];
                    const r = 36, circ = 2 * Math.PI * r, cx = 44, cy = 44;
                    const pct = Math.min(c.achievementPct, 100);
                    const filled = (pct / 100) * circ;
                    return (
                      <div key={i} className="yi-medal-item"
                        onMouseEnter={(e) => showChartTooltip(e, c.label, [
                          { label: 'Expected', value: fmtK(c.expected) },
                          { label: 'Actual', value: fmtK(c.value) },
                          { label: 'Achievement', value: `${c.achievementPct.toFixed(1)}%` },
                        ])}
                        onMouseLeave={hideChartTooltip}
                      >
                        <div className="yi-medal-rank-badge" style={{ background: medal }}>#{i + 1}</div>
                        <svg width="88" height="88" viewBox="0 0 88 88">
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f2f5" strokeWidth="7" />
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke={medal} strokeWidth="7"
                            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                            transform={`rotate(-90 ${cx} ${cy})`} />
                          <text x={cx} y={cy + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#111827">
                            {c.achievementPct.toFixed(0)}%
                          </text>
                        </svg>
                        <div className="yi-medal-county">{c.label}</div>
                        <div className="yi-medal-sub">{fmtK(c.value)} actual</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Crop Mix — donut chart */}
            <div className="yi-chart-card yi-donut-card">
              <div className="yi-chart-title">Crop Mix</div>
              <div className="yi-chart-subtitle">Share of total actual yield by crop</div>

              {loadingSummary ? (
                <div className="yi-chart-empty"><div className="yi-skeleton yi-skeleton-chart" /></div>
              ) : donutSegments.length === 0 ? (
                <div className="yi-chart-empty"><p>No crop data available yet</p></div>
              ) : (
                <div className="yi-donut-layout">
                  <svg width="140" height="140" viewBox="0 0 100 100">
                    {donutSegments.map((seg, i) => (
                      <circle key={i} cx="50" cy="50" r={seg.r} fill="none" stroke={seg.color} strokeWidth="16"
                        strokeDasharray={`${seg.length} ${seg.circ - seg.length}`}
                        strokeDashoffset={-seg.offset}
                        transform="rotate(-90 50 50)"
                        style={{ cursor: 'default' }}
                        onMouseEnter={(e) => showChartTooltip(e, seg.label, [
                          { label: 'Yield', value: fmtK(seg.value), color: seg.color },
                          { label: 'Share', value: `${(seg.pct * 100).toFixed(1)}%` },
                        ])}
                        onMouseLeave={hideChartTooltip}
                      />
                    ))}
                    <text x="50" y="46" textAnchor="middle" fontSize="12" fill="#9CA3AF">Total</text>
                    <text x="50" y="60" textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">
                      {fmtK(cropTotal)}
                    </text>
                  </svg>
                  <div className="yi-donut-legend">
                    {donutSegments.map((seg, i) => (
                      <div key={i} className="yi-donut-legend-row">
                        <span className="yi-donut-dot" style={{ background: seg.color }} />
                        <span className="yi-donut-label">{seg.label}</span>
                        <span className="yi-donut-pct">{(seg.pct * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ── ROW 3: COUNTY PERFORMANCE (grouped bars) + ACHIEVEMENT DISTRIBUTION ── */}
          <div className="yi-analytics-row yi-row--split">

            {/* County Performance — grouped expected vs. actual bars */}
            <div className="yi-chart-card yi-grouped-bar-card">
              <div className="yi-chart-header">
                <div>
                  <div className="yi-chart-title">County Performance</div>
                  <div className="yi-chart-subtitle">Expected vs. actual yield per county — spot the gap, not just the volume</div>
                </div>
                <div className="yi-chart-legend">
                  <span className="yi-legend-dot" style={{ background: '#94a3b8' }} />
                  <span className="yi-legend-label">Expected</span>
                  <span className="yi-legend-dot" style={{ background: '#4CAF50', marginLeft: 8 }} />
                  <span className="yi-legend-label">Actual</span>
                </div>
              </div>

              {loadingSummary ? (
                <div className="yi-chart-empty"><div className="yi-skeleton yi-skeleton-chart" /></div>
              ) : countyBreakdown.length === 0 ? (
                <div className="yi-chart-empty"><p>No county data available yet</p></div>
              ) : (
                <div className="yi-grouped-bar-list">
                  {countyBreakdown.map((row, i) => {
                    const expectedPct = Math.round((row.expected / countyGroupedMax) * 100);
                    const actualPct = Math.round((row.value / countyGroupedMax) * 100);
                    return (
                      <div key={i} className="yi-grouped-bar-row"
                        onMouseEnter={(e) => showChartTooltip(e, row.label, [
                          { label: 'Expected', value: fmtK(row.expected), color: '#94a3b8' },
                          { label: 'Actual', value: fmtK(row.value), color: '#4CAF50' },
                          { label: 'Achievement', value: `${row.achievementPct.toFixed(1)}%` },
                        ])}
                        onMouseLeave={hideChartTooltip}
                      >
                        <div className="yi-grouped-bar-meta">
                          <span className="yi-grouped-bar-label">{row.label}</span>
                          <span className={`yi-grouped-bar-achievement ${row.achievementPct >= 80 ? 'yi-ach-high' : row.achievementPct >= 50 ? 'yi-ach-mid' : 'yi-ach-low'}`}>
                            {row.achievementPct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="yi-grouped-bar-track">
                          <div className="yi-grouped-bar-fill yi-grouped-bar-fill--expected" style={{ width: `${expectedPct}%` }} />
                        </div>
                        <div className="yi-grouped-bar-track">
                          <div className="yi-grouped-bar-fill yi-grouped-bar-fill--actual" style={{ width: `${actualPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Achievement Distribution */}
            <div className="yi-chart-card yi-segments-card">
              <div className="yi-chart-title">Achievement Distribution</div>
              <div className="yi-chart-subtitle">Farmer-crop records by achievement bucket</div>

              {loadingDetailed ? (
                <div className="yi-chart-empty"><div className="yi-skeleton yi-skeleton-chart" /></div>
              ) : (
                <>
                  <div className="yi-segment-list">
                    {distribution.map((b, i) => {
                      const barPct = Math.round((b.count / distMax) * 100);
                      const sharePct = distTotal > 0 ? Math.round((b.count / distTotal) * 100) : 0;
                      return (
                        <div key={i} className="yi-segment-row"
                          onMouseEnter={(e) => showChartTooltip(e, b.label, [
                            { label: 'Records', value: b.count.toLocaleString(), color: b.color },
                            { label: 'Share', value: `${sharePct}%` },
                          ])}
                          onMouseLeave={hideChartTooltip}
                        >
                          <div className="yi-segment-meta">
                            <span className="yi-segment-label">{b.label}</span>
                            <span className="yi-segment-count">{b.count.toLocaleString()}</span>
                          </div>
                          <div className="yi-segment-bar-track">
                            <div className="yi-segment-bar-fill" style={{ width: `${barPct}%`, background: b.color }} />
                          </div>
                          <span className="yi-segment-pct">{sharePct}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="yi-segment-total">
                    Total records analysed: <strong>{distTotal.toLocaleString()}</strong>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* ── ROW 4: FARM SIZE VS. ACHIEVEMENT SCATTER ─── */}
          <div className="yi-chart-card yi-scatter-card">
            <div className="yi-chart-title">Farm Size vs. Achievement</div>
            <div className="yi-chart-subtitle">
              Each dot is a farmer-crop record — plots farm size (hectares) against achievement rate to spot whether smallholders or large farms need more support
            </div>

            {loadingDetailed ? (
              <div className="yi-chart-empty"><div className="yi-skeleton yi-skeleton-chart" /></div>
            ) : scatterPoints.length < 5 ? (
              <div className="yi-chart-empty"><p>Not enough acreage data recorded yet to plot this chart</p></div>
            ) : (
              (() => {
                const SW = 1000, SH = 260;
                const spad = { l: 50, r: 20, t: 10, b: 36 };
                const spw = SW - spad.l - spad.r, sph = SH - spad.t - spad.b;
                const maxSize = Math.max(...scatterPoints.map(p => p.farmSizeHa), 1);
                const sx = (v) => spad.l + (v / maxSize) * spw;
                const sy = (v) => spad.t + sph - (Math.min(v, 120) / 120) * sph;
                const dotColor = (pct) => pct >= 80 ? '#4CAF50' : pct >= 50 ? '#FF9800' : '#F44336';
                const yGrid = [0, 25, 50, 75, 100];
                return (
                  <svg viewBox={`0 0 ${SW} ${SH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                    {yGrid.map((v, i) => (
                      <g key={i}>
                        <line x1={spad.l} x2={SW - spad.r} y1={sy(v)} y2={sy(v)} stroke="#f0f2f5" strokeWidth="1" />
                        <text x={spad.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="10" fill="#c0c8d4">{v}%</text>
                      </g>
                    ))}
                    <text x={spad.l} y={SH - 6} fontSize="10" fill="#c0c8d4">0 ha</text>
                    <text x={SW - spad.r} y={SH - 6} textAnchor="end" fontSize="10" fill="#c0c8d4">{maxSize.toFixed(1)} ha</text>
                    {scatterPoints.map((p, i) => (
                      <circle key={i} cx={sx(p.farmSizeHa)} cy={sy(p.achievementPct)} r={chartTooltip?.idx === i ? 6 : 4}
                        fill={dotColor(p.achievementPct)} opacity={chartTooltip?.idx === i ? 0.9 : 0.55}
                        onMouseEnter={(e) => showChartTooltip(e, p.farmerName || p.regNo || 'Farmer record', [
                          { label: 'County', value: p.county || '—' },
                          { label: 'Crop', value: p.cropType || '—' },
                          { label: 'Farm size', value: `${p.farmSizeHa.toFixed(2)} ha` },
                          { label: 'Achievement', value: `${p.achievementPct.toFixed(1)}%`, color: dotColor(p.achievementPct) },
                        ], i)}
                        onMouseLeave={hideChartTooltip}
                      />
                    ))}
                  </svg>
                );
              })()
            )}
          </div>

          {/* ── FARMERS NEEDING INTERVENTION ─────────── */}
          {(() => {
            const PREVIEW_COUNT = 5;
            const visible = showAllIntervention ? lowPerformers : lowPerformers.slice(0, PREVIEW_COUNT);
            const hidden = lowPerformers.length - PREVIEW_COUNT;
            return (
              <div className="yi-chart-card yi-intervention-card">
                <div className="yi-intervention-header">
                  <div className="yi-intervention-header-left">
                    <div className="yi-intervention-icon-wrap">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#EF4444">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                      </svg>
                    </div>
                    <div>
                      <div className="yi-chart-title" style={{ marginBottom: 2 }}>
                        Farmers Needing Intervention
                        <span className="yi-intervention-badge">{lowPerformers.length} flagged</span>
                        {lowPerformersIsMock && <span className="yi-mock-badge">Preview data</span>}
                      </div>
                      <div className="yi-chart-subtitle">
                        Lowest achievement-rate farmers — prioritise these for field visits and support this week
                      </div>
                    </div>
                  </div>
                </div>

                <div className="yi-intervention-list">
                  {visible.map((f, i) => {
                    const pct = Math.round((f.achievementPct / lowMax) * 100);
                    return (
                      <div key={i} className="yi-intervention-item">
                        <div className="yi-intervention-num" style={{ background: i < 3 ? '#FEF2F2' : '#F9FAFB', color: i < 3 ? '#EF4444' : '#6b7280' }}>
                          {i + 1}
                        </div>
                        <div className="yi-intervention-body">
                          <div className="yi-intervention-name">
                            {f.farmerName} <span className="yi-intervention-regno">{f.regNo}</span>
                          </div>
                          <div className="yi-intervention-meta">
  {f.county} · {f.cropType}
  {f.flaggedCropCount > 1 && ` · ${f.flaggedCropCount} crops flagged`}
</div>
                          <div className="yi-intervention-bar-wrap">
                            <div className="yi-intervention-bar-track">
                              <div
                                className="yi-intervention-bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  background: 'linear-gradient(90deg, #FCA5A5, #EF4444)',
                                }}
                              />
                            </div>
                            <span className="yi-intervention-pct">{f.achievementPct}% achieved</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {lowPerformers.length > PREVIEW_COUNT && (
                  <button
                    className="yi-intervention-toggle"
                    onClick={() => setShowAllIntervention(v => !v)}
                  >
                    {showAllIntervention ? (
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
                        View {hidden} more farmer{hidden !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })()}

          {/* ── SEASON COMPARISON ────────────────────── */}
          <div className="yi-analytics-row yi-row--season">
            <div className="yi-chart-card yi-season-card">
              <div className="yi-chart-title">
                Season Comparison
                {!seasonalLive && <span className="yi-mock-badge">Preview data</span>}
              </div>
              <div className="yi-chart-subtitle">Achievement rate vs. previous planting season</div>

              <div className="yi-season-compare">
                <div className="yi-season-block">
                  <div className="yi-season-label">{seasonal.previous_season?.label}</div>
                  <div className="yi-season-value">{seasonal.previous_season?.achievement_pct}%</div>
                </div>
                <div className={`yi-season-arrow ${seasonDelta >= 0 ? 'yi-season-arrow--up' : 'yi-season-arrow--down'}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    {seasonDelta >= 0
                      ? <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" />
                      : <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.59-5.58L4 12l8 8 8-8z" />}
                  </svg>
                  <span>{Math.abs(seasonDelta).toFixed(1)} pts</span>
                </div>
                <div className="yi-season-block">
                  <div className="yi-season-label">{seasonal.current_season?.label}</div>
                  <div className="yi-season-value yi-season-value--current">{seasonal.current_season?.achievement_pct}%</div>
                </div>
              </div>
            </div>
          </div>

          {chartTooltip && (
            <div className="yi-tooltip" style={{ left: chartTooltip.x + 14, top: chartTooltip.y - 14 }}>
              <div className="yi-tooltip-month">{chartTooltip.title}</div>
              {chartTooltip.rows.map((row, i) => (
                <div key={i} className="yi-tooltip-row">
                  {row.color && <span className="yi-tooltip-dot" style={{ background: row.color }} />}
                  <span className="yi-tooltip-label">{row.label}</span>
                  <span className="yi-tooltip-val">{row.value}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default YieldInsights;
