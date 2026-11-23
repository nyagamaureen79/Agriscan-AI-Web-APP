import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Sidebar from '../../Sidebar';
import Header from '../../Header';
import { apiFetch } from '../../../utils/apiFetch';
import './YieldProductionsReport.css';

const API_URL = import.meta.env.VITE_API_URL;



const ALL_COUNTIES_OPTION = 'All Counties';
const ALL_CROPS_OPTION = 'All Crops';

const PAGE_SIZES = [10, 20, 50, 100];

// Loads the real, tenant-scoped county/crop values that actually appear in
// the data (see GET /yield/report/filters), instead of a hardcoded list that
// could silently mismatch the DB and make filters return nothing.
function useReportFilterOptions() {
  const [counties, setCounties] = useState([ALL_COUNTIES_OPTION]);
  const [crops, setCrops] = useState([ALL_CROPS_OPTION]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/yield/report/filters`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setCounties([ALL_COUNTIES_OPTION, ...(json.counties ?? [])]);
        setCrops([ALL_CROPS_OPTION, ...(json.crops ?? [])]);
      } catch (_) {
        // Keep the "All" fallback options if this fails — filters just won't
        // offer specific values yet, rather than offering wrong ones.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { counties, crops };
}


const normalizeSummaryRow = (r) => ({
  id:                 r.id ?? Math.random(),
  county:             r.county ?? '',
  cropType:           r.crop_type ?? r.cropType ?? '',
  totalExpectedYield: Number(r.total_expected_yield ?? r.totalExpectedYield ?? 0),
  totalActualYield:   Number(r.total_actual_yield   ?? r.totalActualYield   ?? 0),
  avgYieldPerHectare: Number(r.avg_yield_per_hectare ?? r.avgYieldPerHectare ?? 0),
  topPerforming:      r.top_performing ?? r.topPerforming ?? '',
});

const normalizeDetailedRow = (r) => ({
  id:             r.id ?? Math.random(),
  regNo:          r.reg_no    ?? r.regNo      ?? '',
  farmerName:     r.farmer_name ?? r.farmerName ?? '',
  cropType:       r.crop_type ?? r.cropType   ?? '',
  county:         r.county    ?? '',
  farmSize:       r.farm_size ?? r.farmSize   ?? '',
  farmSizeHa:     parseFloat(r.farm_size_ha ?? r.farmSizeHa ?? 0),
  expectedYield:  Number(r.expected_yield ?? r.expectedYield ?? 0),
  actualYield:    Number(r.actual_yield   ?? r.actualYield   ?? 0),
  // achievement_pct is null when acreage is missing/zero — don't default it to
  // 0, or missing-data records get misread as genuine 0%-achievement farmers.
  achievementPct: (r.achievement_pct ?? r.achievementPct) != null
    ? parseFloat(r.achievement_pct ?? r.achievementPct)
    : null,
  hasAcreageData: r.has_acreage_data ?? r.hasAcreageData ?? true,
});

// ─── Skeleton components ──────────────────────────────────────────────────────

const TableRowSkeleton = ({ cols }) => (
  <tr className="skeleton-table-row">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i}><div className="skeleton-cell skeleton-shimmer" /></td>
    ))}
  </tr>
);

const StatCardSkeleton = ({ mod }) => (
  <div className={`summary-stat-card ${mod}`}>
    <div className="skeleton-icon skeleton-shimmer" />
    <div className="skeleton-card-text">
      <div className="skeleton-line skeleton-line-value skeleton-shimmer" />
      <div className="skeleton-line skeleton-line-label skeleton-shimmer" />
    </div>
  </div>
);

// ─── Shared sub-components ────────────────────────────────────────────────────

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

const achievementRate = (expected, actual) =>
  expected > 0 ? ((actual / expected) * 100).toFixed(1) : '0.0';

const YieldAchievementBadge = ({ pct }) => {
  if (pct === null || pct === undefined || Number.isNaN(parseFloat(pct))) {
    return <span className="status-badge badge-yield-nodata">No data</span>;
  }
  const val = parseFloat(pct);
  const cls = val >= 80 ? 'badge-yield-high'
    : val >= 50         ? 'badge-yield-medium'
    :                     'badge-yield-low';
  return <span className={`status-badge ${cls}`}>{pct}%</span>;
};

// ─── Summary Report ───────────────────────────────────────────────────────────

const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k kg` : `${Math.round(n)} kg`);

const SummaryReport = () => {
  const { counties: COUNTIES, crops: CROPS } = useReportFilterOptions();
  const [countyFilter, setCountyFilter] = useState(ALL_COUNTIES_OPTION);
  const [cropFilter,   setCropFilter]   = useState(ALL_CROPS_OPTION);
  const [sortCol,      setSortCol]      = useState('county');
  const [sortDir,      setSortDir]      = useState('asc');
  const [summaryData,  setSummaryData]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [fetchError,   setFetchError]   = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams();
        if (countyFilter !== ALL_COUNTIES_OPTION) params.set('county', countyFilter);
        if (cropFilter   !== ALL_CROPS_OPTION)    params.set('crop',   cropFilter);

        const res = await apiFetch(`${API_URL}/yield/report/summary?${params.toString()}`);
        if (res.status === 404) { setSummaryData([]); return; }
        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const json = await res.json();
        
        setSummaryData((json.data ?? []).map(normalizeSummaryRow));
      } catch (err) {
        setFetchError(err.message ?? 'Failed to load summary data.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [countyFilter, cropFilter]);

  const filtered = useMemo(() => {
    return [...summaryData].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [summaryData, sortCol, sortDir]);

  const totals = useMemo(() => {
    const totalExp   = filtered.reduce((s, r) => s + r.totalExpectedYield, 0);
    const totalAct   = filtered.reduce((s, r) => s + r.totalActualYield,   0);
    const avgRate    = totalExp > 0 ? ((totalAct / totalExp) * 100).toFixed(1) : '0.0';
    const avgHectare = filtered.length
      ? Math.round(filtered.reduce((s, r) => s + r.avgYieldPerHectare, 0) / filtered.length)
      : 0;
    return { totalExp, totalAct, avgRate, avgHectare };
  }, [filtered]);

  const topCounty = useMemo(() => {
    if (!filtered.length) return '—';
    const best = filtered.reduce((top, r) => r.totalActualYield > top.totalActualYield ? r : top);
    return `${best.county}${best.cropType ? ` (${best.cropType})` : ''}`;
  }, [filtered]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleExport = () => {
    const headers = [
      'S.No', 'County', 'Crop Type', 'Total Expected Yield (kg)',
      'Total Actual Yield (kg)', 'Yield Achievement Rate (%)',
      'Average Yield per Hectare (kg/ha)', 'Top Performing Crops/Regions',
    ];
    const rows = filtered.map((r, i) => [
      i + 1, r.county, r.cropType,
      r.totalExpectedYield, r.totalActualYield,
      achievementRate(r.totalExpectedYield, r.totalActualYield),
      r.avgYieldPerHectare, r.topPerforming,
    ]);
    downloadCSV('yield-productions-summary.csv', headers, rows);
  };

  const SUMMARY_COLS = [
    { key: 'county',             label: 'County' },
    { key: 'cropType',           label: 'Crop Type' },
    { key: 'totalExpectedYield', label: 'Total Expected Yield (kg)' },
    { key: 'totalActualYield',   label: 'Total Actual Yield (kg)' },
    { key: 'achievementRate',    label: 'Yield Achievement Rate (%)', noSort: true },
    { key: 'avgYieldPerHectare', label: 'Avg Yield per Hectare (kg/ha)' },
    { key: 'topPerforming',      label: 'Top Performing Crops/Regions' },
  ];

  const statCards = [
    {
      label: 'Total Expected Yield',
      value: loading ? '—' : fmtK(totals.totalExp),
      mod: 'stat-blue',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Total Actual Yield',
      value: loading ? '—' : fmtK(totals.totalAct),
      mod: 'stat-green',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M6.05 8.05C3.32 10.78 3.32 15.2 6.03 17.93c1.47-3.4 4.09-6.24 7.36-7.93C10.62 12.34 8.68 15.61 8 19.32 10.6 20.55 13.8 20.1 15.95 17.95 19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Avg Yield Achievement',
      value: loading ? '—' : `${totals.avgRate}%`,
      mod: !loading && parseFloat(totals.avgRate) >= 80 ? 'stat-green'
        : !loading && parseFloat(totals.avgRate) >= 50  ? 'stat-amber'
        : 'stat-red',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M16.85 6.85L18.29 8.29l-4.88 4.88-3.29-3.29c-.39-.39-1.02-.39-1.41 0l-6 6.01c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L10 11.83l3.29 3.29c.39.39 1.02.39 1.41 0l5.59-5.58 1.44 1.44c.31.31.85.09.85-.35V6.5c0-.28-.22-.5-.5-.5h-4.77c-.45 0-.67.54-.36.85z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Avg Yield per Hectare',
      value: loading ? '—' : `${totals.avgHectare.toLocaleString()} kg/ha`,
      mod: 'stat-amber',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 3L2 12h3v8h6v-5h2v5h6v-8h3L12 3z" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <div className="report-section">

      {/* ── Filters ── */}
      <div className="summary-filter-bar">
        <div className="summary-filter-controls">
          <div className="filter-field">
            <label className="filter-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="currentColor" />
              </svg>
              County
            </label>
            <select className="filter-select" value={countyFilter} onChange={e => setCountyFilter(e.target.value)}>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="filter-field">
            <label className="filter-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6.05 8.05C3.32 10.78 3.32 15.2 6.03 17.93c1.47-3.4 4.09-6.24 7.36-7.93C10.62 12.34 8.68 15.61 8 19.32 10.6 20.55 13.8 20.1 15.95 17.95 19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z" fill="currentColor" />
              </svg>
              Crop Type
            </label>
            <select className="filter-select" value={cropFilter} onChange={e => setCropFilter(e.target.value)}>
              {CROPS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button className="export-btn" onClick={handleExport} disabled={loading || !filtered.length}>
          <ExportIcon /> Export CSV
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="summary-stat-cards">
        {loading
          ? statCards.map(card => <StatCardSkeleton key={card.label} mod={card.mod} />)
          : statCards.map(card => (
            <div key={card.label} className={`summary-stat-card ${card.mod}`}>
              <div className="stat-card-icon-wrap">{card.icon}</div>
              <div className="stat-card-body">
                <span className="stat-card-value">{card.value}</span>
                <span className="stat-card-label">{card.label}</span>
              </div>
            </div>
          ))
        }
      </div>

      {/* Top performer callout */}
      {!loading && !fetchError && filtered.length > 0 && (
        <div className="top-performer-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" />
          </svg>
          <span><strong>Top Performer:</strong> {topCounty}</span>
        </div>
      )}

      {/* ── Summary table ── */}
      <div className="report-table-wrapper">
        <table className="report-table">
          <thead>
            <tr>
              <th>S. No</th>
              {SUMMARY_COLS.map(col => (
                <th
                  key={col.key}
                  className={!col.noSort ? 'sortable-th' : ''}
                  onClick={!col.noSort ? () => handleSort(col.key) : undefined}
                >
                  <span className="th-content">
                    {col.label}
                    {!col.noSort && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
            ) : fetchError ? (
              <tr>
                <td colSpan={8} className="empty-table-msg">
                  <div className="fetch-error-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#DC2626" />
                    </svg>
                    <span>{fetchError}</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-table-msg">
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="#9CA3AF" />
                    </svg>
                    <span>No yield data available for the selected filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => {
                const rate = achievementRate(row.totalExpectedYield, row.totalActualYield);
                return (
                  <tr key={row.id} className="table-data-row">
                    <td>{i + 1}</td>
                    <td>{row.county}</td>
                    <td>{row.cropType}</td>
                    <td>{row.totalExpectedYield.toLocaleString()}</td>
                    <td>{row.totalActualYield.toLocaleString()}</td>
                    <td><YieldAchievementBadge pct={rate} /></td>
                    <td>{row.avgYieldPerHectare.toLocaleString()}</td>
                    <td className="top-performing-cell">{row.topPerforming}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {!loading && !fetchError && filtered.length > 0 && (
            <tfoot>
              <tr className="table-totals-row">
                <td colSpan={3}>Total / Average</td>
                <td>{totals.totalExp.toLocaleString()}</td>
                <td>{totals.totalAct.toLocaleString()}</td>
                <td><YieldAchievementBadge pct={totals.avgRate} /></td>
                <td>{totals.avgHectare.toLocaleString()}</td>
                <td>—</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// ─── Detailed Report ──────────────────────────────────────────────────────────

const DetailedReport = () => {
  const { counties: COUNTIES, crops: CROPS } = useReportFilterOptions();
  const [countyFilter, setCountyFilter] = useState(ALL_COUNTIES_OPTION);
  const [cropFilter,   setCropFilter]   = useState(ALL_CROPS_OPTION);
  const [searchName,   setSearchName]   = useState('');
  const [searchRegNo,  setSearchRegNo]  = useState('');
  const [sortCol,      setSortCol]      = useState('id');
  const [sortDir,      setSortDir]      = useState('asc');
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(10);

  const [rows,       setRows]       = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Debounce free-text search so we're not firing a request per keystroke.
  const [debouncedName, setDebouncedName]   = useState('');
  const [debouncedRegNo, setDebouncedRegNo] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedName(searchName);
      setDebouncedRegNo(searchRegNo);
    }, 350);
    return () => clearTimeout(t);
  }, [searchName, searchRegNo]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page, page_size: pageSize,
        sort_by: sortCol, sort_dir: sortDir,
      });
      if (countyFilter !== ALL_COUNTIES_OPTION) params.set('county', countyFilter);
      if (cropFilter   !== ALL_CROPS_OPTION)    params.set('crop',   cropFilter);
      if (debouncedName)  params.set('name',   debouncedName);
      if (debouncedRegNo) params.set('reg_no', debouncedRegNo);

      const res = await apiFetch(`${API_URL}/yield/report/detailed?${params.toString()}`);
      if (res.status === 404) { setRows([]); setTotalCount(0); return; }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();
      const rawList  = json.data ?? [];
      const rawTotal = json.pagination?.total ?? rawList.length;

      setRows(rawList.map(normalizeDetailedRow));
      setTotalCount(rawTotal);
    } catch (err) {
      setFetchError(err.message ?? 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, countyFilter, cropFilter, debouncedName, debouncedRegNo, sortCol, sortDir]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // BUGFIX: sorting now happens server-side (see fetchReport's sort_by/sort_dir
  // params) across the *entire* filtered dataset. Previously this useMemo only
  // re-sorted the rows already on the current page, so clicking a column header
  // silently only reordered 10-50 rows instead of the full report.
  const sorted = rows;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSort = (col) => {
    setPage(1);
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const onFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const handleExport = () => {
    const headers = [
      'S.No', 'Farmer Registration No', 'Farmer Name', 'Crop Type',
      'Farm Size', 'Expected Yield (kg)', 'Actual Yield (kg)',
      'Yield Achievement (%)',
    ];
    const rows = sorted.map((r, i) => [
      i + 1, r.regNo, r.farmerName, r.cropType,
      r.farmSize, r.expectedYield, r.actualYield,
      r.achievementPct !== null ? r.achievementPct : '',
    ]);
    downloadCSV('yield-productions-detailed.csv', headers, rows);
  };

  const DETAIL_COLS = [
    { key: 'id',             label: 'S. No' },
    { key: 'regNo',          label: 'Farmer Registration No' },
    { key: 'farmerName',     label: 'Farmer Name' },
    { key: 'cropType',       label: 'Crop Type' },
    { key: 'farmSizeHa',     label: 'Farm Size' },
    { key: 'expectedYield',  label: 'Expected Yield (kg)' },
    { key: 'actualYield',    label: 'Actual Yield (kg)' },
    { key: 'achievementPct', label: 'Yield Achievement (%)' },
  ];

  return (
    <div className="report-section">

      {/* ── Filters panel ── */}
      <div className="detailed-filters-panel">
        <div className="filters-panel-header">
          <FilterIcon /> Filters
        </div>

        <div className="filters-row">
          <div className="filter-field">
            <label className="filter-label">County</label>
            <select className="filter-select" value={countyFilter} onChange={onFilterChange(setCountyFilter)}>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-label">Crop Type</label>
            <select className="filter-select" value={cropFilter} onChange={onFilterChange(setCropFilter)}>
              {CROPS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="filters-divider" />

        <div className="filters-row">
          <div className="filter-field">
            <label className="filter-label">Farmer Name</label>
            <div className="search-input-wrap">
              <svg className="search-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
              </svg>
              <input
                type="text"
                className="filter-input"
                placeholder="Search by name…"
                value={searchName}
                onChange={onFilterChange(setSearchName)}
              />
            </div>
          </div>
          <div className="filter-field">
            <label className="filter-label">Farmer Registration Number</label>
            <div className="search-input-wrap">
              <svg className="search-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
              </svg>
              <input
                type="text"
                className="filter-input"
                placeholder="e.g. FRN-2024001…"
                value={searchRegNo}
                onChange={onFilterChange(setSearchRegNo)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="report-toolbar">
        <span className="result-count">
          {loading ? (
            <span className="toolbar-loading-indicator">
              <span className="toolbar-spinner" />
              Fetching records…
            </span>
          ) : (
            <>Showing <strong>{sorted.length}</strong> of <strong>{totalCount}</strong> records</>
          )}
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
          <button className="export-btn" onClick={handleExport} disabled={loading || !sorted.length}>
            <ExportIcon /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Detailed table ── */}
      <div className="report-table-wrapper">
        <table className="report-table">
          <thead>
            <tr>
              {DETAIL_COLS.map(col => (
                <th
                  key={col.key}
                  className={!col.noSort ? 'sortable-th' : ''}
                  onClick={!col.noSort ? () => handleSort(col.key) : undefined}
                >
                  <span className="th-content">
                    {col.label}
                    {!col.noSort && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: pageSize > 10 ? 10 : pageSize }).map((_, i) => (
                <TableRowSkeleton key={i} cols={DETAIL_COLS.length} />
              ))
            ) : fetchError ? (
              <tr>
                <td colSpan={DETAIL_COLS.length} className="empty-table-msg">
                  <div className="fetch-error-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#DC2626" />
                    </svg>
                    <span>{fetchError}</span>
                  </div>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={DETAIL_COLS.length} className="empty-table-msg">
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="#9CA3AF" />
                    </svg>
                    <span>No yield records match the selected filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr key={row.id} className="table-data-row">
                  <td>{(page - 1) * pageSize + i + 1}</td>
                  <td className="monospace-cell">{row.regNo}</td>
                  <td>{row.farmerName}</td>
                  <td>{row.cropType}</td>
                  <td>{row.farmSize}</td>
                  <td>{Number(row.expectedYield).toLocaleString()}</td>
                  <td>{Number(row.actualYield).toLocaleString()}</td>
                  <td>
                    <YieldAchievementBadge
                      pct={row.achievementPct !== null ? row.achievementPct.toFixed(1) : null}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="pagination-bar">
        <button className="pagination-btn" disabled={page === 1 || loading} onClick={() => setPage(1)}>&#171;</button>
        <button className="pagination-btn" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>&#8249;</button>
        <span className="pagination-info">Page {page} of {totalPages}</span>
        <button className="pagination-btn" disabled={page === totalPages || loading} onClick={() => setPage(p => p + 1)}>&#8250;</button>
        <button className="pagination-btn" disabled={page === totalPages || loading} onClick={() => setPage(totalPages)}>&#187;</button>
      </div>
    </div>
  );
};

// ─── Page shell ───────────────────────────────────────────────────────────────

const YieldProductionsReport = () => {
  const [activeView, setActiveView] = useState('summary');

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content yield-report-page">

          <div className="report-page-header">
            <div className="report-page-title-group">
              <h1 className="report-page-title">Yield &amp; Productions Report</h1>
              <p className="report-page-subtitle">
                Crop yield performance, achievement rates, and farm productivity across counties
              </p>
            </div>

            <div className="report-type-dropdown-wrap">
              <label className="report-type-dropdown-label">Report Type</label>
              <div className="report-type-select-wrap">
                <svg className="report-type-select-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor" />
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

          {activeView === 'summary' ? <SummaryReport /> : <DetailedReport />}
        </div>
      </div>
    </div>
  );
};

export default YieldProductionsReport;