import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Sidebar from '../../Sidebar';
import Header from '../../Header';
import { apiFetch } from '../../../utils/apiFetch';
import { KENYA_COUNTIES } from '../../../data/kenyaCounties';
import './DiseaseAIDiagnosticsReport.css';

const API_URL = import.meta.env.VITE_API_URL;


const COUNTIES = ['All Counties', ...KENYA_COUNTIES.map(c => c.name)];

const CROPS = [
  'All Crops', 'Maize', 'Wheat', 'Tea', 'Coffee', 'Rice', 'Beans', 'Sorghum', 'Millet',
  'Potatoes', 'Sweet Potatoes', 'Cassava', 'Bananas', 'Sugarcane', 'Cotton', 'Sunflower',
  'Groundnuts', 'Cowpeas', 'Green Grams', 'Pigeon Peas', 'Avocado', 'Mango', 'Pineapple',
  'Tomatoes', 'Onion', 'Cabbage', 'Kale', 'Carrots', 'Pyrethrum', 'Macadamia', 'Coconut',
];

const SEVERITIES = ['All Severities', 'Low', 'Medium', 'High'];

const ESCALATION_OPTIONS = ['All', 'Escalated', 'Not Escalated'];

const PAGE_SIZES = [10, 20, 50, 100];


const normalizeSummaryRow = (r) => ({
  id:                       r.id ?? Math.random(),
  county:                   r.county ?? '',
  cropType:                 r.crop_type ?? r.cropType ?? '',
  totalDiseaseCases:        r.total_disease_cases ?? r.totalDiseaseCases ?? 0,
  percentageFarmsAffected:  r.percentage_farms_affected ?? r.percentageFarmsAffected ?? 0,
  severityLow:              r.severity_low ?? r.severityLow ?? 0,
  severityMedium:           r.severity_medium ?? r.severityMedium ?? 0,
  severityHigh:             r.severity_high ?? r.severityHigh ?? 0,
  highRiskAlertsEscalated:  r.high_risk_alerts_escalated ?? r.highRiskAlertsEscalated ?? 0,
});

const normalizeDetailedRow = (r) => ({
  id:                r.id ?? Math.random(),
  regNo:             r.reg_no ?? r.regNo ?? '',
  farmerName:        r.farmer_name ?? r.farmerName ?? '',
  cropType:          r.crop_type ?? r.cropType ?? '',
  dateOfScan:        r.date_of_scan ?? r.dateOfScan ?? '',
  diseaseDetected:   r.disease_detected ?? r.diseaseDetected ?? '',
  severityLevel:     r.severity_level ?? r.severityLevel ?? '',
  aiConfidence:      r.ai_confidence ?? r.aiConfidence ?? 0,
  recommendedAction: r.recommended_action ?? r.recommendedAction ?? '',
  escalationStatus:  r.escalation_status ?? r.escalationStatus ?? '',
  county:            r.county ?? '',
});


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

const NoReportsState = ({ message }) => (
  <div className="disease-no-reports-state">
    <div className="disease-no-reports-icon">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 16H8V14H16V16ZM13 9V3.5L18.5 9H13Z" fill="#D1FAE5" />
        <path d="M8 10h5M8 12h3" stroke="#6EE7B7" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
    <h3 className="disease-no-reports-title">No Reports Available Yet</h3>
    <p className="disease-no-reports-subtitle">
      {message ?? 'Disease diagnostic report data hasn\'t been generated yet. Check back once AI scans have been recorded.'}
    </p>
  </div>
);

const FetchErrorState = ({ message }) => (
  <div className="disease-fetch-error-state">
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#DC2626" />
    </svg>
    <span>{message}</span>
  </div>
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

const SeverityBadge = ({ level }) => {
  const cls =
    level === 'Low'    ? 'badge-severity-low'
    : level === 'Medium' ? 'badge-severity-medium'
    : 'badge-severity-high';
  return <span className={`status-badge ${cls}`}>{level}</span>;
};

const EscalationBadge = ({ status }) => {
  const normalized = (status || '').toLowerCase();
  const cls =
    normalized === 'escalated' ? 'badge-escalated'
    : normalized === 'monitor' ? 'badge-monitor'
    : 'badge-normal';
  return <span className={`status-badge ${cls}`}>{status || 'Normal'}</span>;
};

const ConfidenceCell = ({ value }) => (
  <div className="confidence-cell">
    <div className="confidence-bar-track">
      <div className="confidence-bar-fill" style={{ width: `${value}%` }} />
    </div>
    <span className="confidence-value">{value}%</span>
  </div>
);

const SeverityDistCell = ({ low, medium, high }) => (
  <div className="severity-dist-cell">
    <span className="sev-chip sev-chip-low">L: {low}</span>
    <span className="sev-chip sev-chip-medium">M: {medium}</span>
    <span className="sev-chip sev-chip-high">H: {high}</span>
  </div>
);


const SummaryReport = () => {
  const [countyFilter, setCountyFilter] = useState('All Counties');
  const [cropFilter,   setCropFilter]   = useState('All Crops');
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
        if (countyFilter !== 'All Counties') params.set('county', countyFilter);
        if (cropFilter   !== 'All Crops')    params.set('crop',   cropFilter);

        const res = await apiFetch(`${API_URL}/diseases/report/summary?${params.toString()}`);
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

  const totals = useMemo(() => ({
    totalCases:     filtered.reduce((s, r) => s + r.totalDiseaseCases,       0),
    avgAffected:    filtered.length
      ? (filtered.reduce((s, r) => s + r.percentageFarmsAffected, 0) / filtered.length).toFixed(1)
      : '0.0',
    totalHighRisk:  filtered.reduce((s, r) => s + r.severityHigh,            0),
    totalEscalated: filtered.reduce((s, r) => s + r.highRiskAlertsEscalated, 0),
  }), [filtered]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleExport = () => {
    const headers = [
      'S.No', 'County', 'Crop Type', 'Total Disease Cases',
      'Percentage of Farms Affected (%)', 'Severity Low', 'Severity Medium',
      'Severity High', 'High-Risk Alerts Escalated',
    ];
    const rows = filtered.map((r, i) => [
      i + 1, r.county, r.cropType, r.totalDiseaseCases,
      r.percentageFarmsAffected, r.severityLow, r.severityMedium,
      r.severityHigh, r.highRiskAlertsEscalated,
    ]);
    downloadCSV('disease-ai-diagnostics-summary.csv', headers, rows);
  };

  const SUMMARY_COLS = [
    { key: 'county',                  label: 'County' },
    { key: 'cropType',                label: 'Crop Type' },
    { key: 'totalDiseaseCases',       label: 'Total Disease Cases' },
    { key: 'percentageFarmsAffected', label: '% Farms Affected' },
    { key: 'severityDist',            label: 'Severity Distribution', noSort: true },
    { key: 'highRiskAlertsEscalated', label: 'High-Risk Alerts Escalated' },
  ];

  const statCards = [
    {
      label: 'Total Disease Cases', value: totals.totalCases.toLocaleString(),
      mod: 'stat-red', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Avg % Farms Affected', value: `${totals.avgAffected}%`,
      mod: 'stat-amber', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'High Severity Cases', value: totals.totalHighRisk.toLocaleString(),
      mod: 'stat-blue', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4.47 21h15.06c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0L2.74 18c-.77 1.33.19 3 1.73 3zM12 14c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1zm1 4h-2v-2h2v2z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'High-Risk Alerts Escalated', value: totals.totalEscalated.toLocaleString(),
      mod: 'stat-green', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z" fill="currentColor" />
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
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
            ) : fetchError ? (
              <tr>
                <td colSpan={7} className="empty-table-msg">
                  <FetchErrorState message={fetchError} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-table-msg">
                  <NoReportsState />
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={row.id} className="table-data-row">
                  <td>{i + 1}</td>
                  <td>{row.county}</td>
                  <td>{row.cropType}</td>
                  <td>{row.totalDiseaseCases.toLocaleString()}</td>
                  <td>{Number(row.percentageFarmsAffected).toFixed(1)}%</td>
                  <td>
                    <SeverityDistCell
                      low={row.severityLow}
                      medium={row.severityMedium}
                      high={row.severityHigh}
                    />
                  </td>
                  <td>{row.highRiskAlertsEscalated}</td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && !fetchError && filtered.length > 0 && (
            <tfoot>
              <tr className="table-totals-row">
                <td colSpan={3}>Total</td>
                <td>{totals.totalCases.toLocaleString()}</td>
                <td>{totals.avgAffected}% avg</td>
                <td>
                  <SeverityDistCell
                    low={filtered.reduce((s, r) => s + r.severityLow, 0)}
                    medium={filtered.reduce((s, r) => s + r.severityMedium, 0)}
                    high={filtered.reduce((s, r) => s + r.severityHigh, 0)}
                  />
                </td>
                <td>{totals.totalEscalated}</td>
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
  const [countyFilter,     setCountyFilter]     = useState('All Counties');
  const [cropFilter,       setCropFilter]       = useState('All Crops');
  const [severityFilter,   setSeverityFilter]   = useState('All Severities');
  const [escalationFilter, setEscalationFilter] = useState('All');
  const [searchName,       setSearchName]       = useState('');
  const [searchRegNo,      setSearchRegNo]      = useState('');
  const [debouncedName,    setDebouncedName]    = useState('');
  const [debouncedRegNo,   setDebouncedRegNo]   = useState('');
  const [sortCol,          setSortCol]          = useState('id');
  const [sortDir,          setSortDir]          = useState('asc');
  const [page,             setPage]             = useState(1);
  const [pageSize,         setPageSize]         = useState(10);
  const [rows,             setRows]             = useState([]);
  const [totalCount,       setTotalCount]       = useState(0);
  const [loading,          setLoading]          = useState(false);
  const [fetchError,       setFetchError]       = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedName(searchName); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchName]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedRegNo(searchRegNo); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchRegNo]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });
      if (countyFilter     !== 'All Counties')  params.set('county',     countyFilter);
      if (cropFilter       !== 'All Crops')     params.set('crop',       cropFilter);
      if (severityFilter   !== 'All Severities') params.set('severity',  severityFilter);
      if (escalationFilter !== 'All')           params.set('escalation', escalationFilter);
      if (debouncedName)  params.set('name',   debouncedName);
      if (debouncedRegNo) params.set('reg_no', debouncedRegNo);

      const res = await apiFetch(`${API_URL}/diseases/report/detailed?${params.toString()}`);
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
  }, [page, pageSize, countyFilter, cropFilter, severityFilter, escalationFilter, debouncedName, debouncedRegNo]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const onFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const handleExport = () => {
    const headers = [
      'S.No', 'Farmer Registration No', 'Farmer Name', 'Crop Type',
      'Date of AI Scan', 'Disease Detected', 'Severity Level',
      'AI Confidence (%)', 'Recommended Action', 'Escalation Status',
    ];
    const exportRows = sorted.map((r, i) => [
      i + 1, r.regNo, r.farmerName, r.cropType, r.dateOfScan,
      r.diseaseDetected, r.severityLevel, `${r.aiConfidence}%`,
      r.recommendedAction, r.escalationStatus,
    ]);
    downloadCSV('disease-ai-diagnostics-detailed.csv', headers, exportRows);
  };

  const DETAIL_COLS = [
    { key: 'id',               label: 'S. No' },
    { key: 'regNo',            label: 'Farmer Registration No' },
    { key: 'farmerName',       label: 'Farmer Name' },
    { key: 'cropType',         label: 'Crop Type' },
    { key: 'dateOfScan',       label: 'Date of AI Scan' },
    { key: 'diseaseDetected',  label: 'Disease / Pest Detected' },
    { key: 'severityLevel',    label: 'Severity Level' },
    { key: 'aiConfidence',     label: 'AI Confidence (%)' },
    { key: 'recommendedAction',label: 'Recommended Action' },
    { key: 'escalationStatus', label: 'Escalation Status' },
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
          <div className="filter-field">
            <label className="filter-label">Severity Level</label>
            <select className="filter-select" value={severityFilter} onChange={onFilterChange(setSeverityFilter)}>
              {SEVERITIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-label">Escalation Status</label>
            <select className="filter-select" value={escalationFilter} onChange={onFilterChange(setEscalationFilter)}>
              {ESCALATION_OPTIONS.map(e => <option key={e}>{e}</option>)}
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

      {/* ── Content ── */}
      <div className="report-table-wrapper">
        <table className="report-table">
          <thead>
            <tr>
              {DETAIL_COLS.map(col => (
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
            {loading ? (
              Array.from({ length: pageSize > 10 ? 10 : pageSize }).map((_, i) => (
                <TableRowSkeleton key={i} cols={10} />
              ))
            ) : fetchError ? (
              <tr>
                <td colSpan={10} className="empty-table-msg">
                  <FetchErrorState message={fetchError} />
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-table-msg">
                  <NoReportsState message="No disease diagnostic records have been recorded yet. They will appear here once AI scans are completed." />
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr key={row.id} className="table-data-row">
                  <td>{(page - 1) * pageSize + i + 1}</td>
                  <td className="monospace-cell">{row.regNo}</td>
                  <td>{row.farmerName}</td>
                  <td>{row.cropType}</td>
                  <td>{row.dateOfScan}</td>
                  <td>{row.diseaseDetected}</td>
                  <td><SeverityBadge level={row.severityLevel} /></td>
                  <td><ConfidenceCell value={row.aiConfidence} /></td>
                  <td className="action-cell">{row.recommendedAction}</td>
                  <td><EscalationBadge status={row.escalationStatus} /></td>
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

const DiseaseAIDiagnosticsReport = () => {
  const [activeView, setActiveView] = useState('summary');

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content disease-report-page">

          <div className="report-page-header">
            <div className="report-page-title-group">
              <h1 className="report-page-title">Disease &amp; AI Diagnostics Report</h1>
              <p className="report-page-subtitle">
                Summary of detected diseases, AI scan results, severity insights, and treatment recommendations
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

export default DiseaseAIDiagnosticsReport;
