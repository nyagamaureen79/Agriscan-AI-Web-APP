import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from '../../Sidebar';
import Header from '../../Header';
import './CarbonTrackingReport.css';
import { apiFetch } from '../../../utils/apiFetch';
import { KENYA_COUNTIES } from '../../../data/kenyaCounties';

const API_BASE = import.meta.env.VITE_API_URL;

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTIES = ['All Counties', ...KENYA_COUNTIES.map(c => c.name)];

const SEQ_ACTIVITIES = [
  'All Activities',
  'Agroforestry',
  'Cover Cropping',
  'Reduced Tillage',
  'Composting',
  'Biochar Application',
  'Wetland Restoration',
];

const EMIT_ACTIVITIES = [
  'All Activities',
  'Synthetic Fertilizer Use',
  'Livestock Management',
  'Irrigation Pumping',
  'Land Clearing',
  'Crop Residue Burning',
  'Diesel Machinery',
];

const CARBON_ACTIVITY_TYPES = [
  'All Types',
  'Sequestration',
  'Emission',
];

const PAGE_SIZES = [10, 20, 50, 100];

// ─── Utilities ────────────────────────────────────────────────────────────────

const fmtNum  = (n) => Number(n).toLocaleString();
const fmtCO2  = (n) => `${Number(n).toLocaleString()} kg`;
const fmtAvg  = (n) => `${Number(n).toFixed(1)} kg`;

// Abbreviated formatters for stat cards — keeps values scannable at a glance
const fmtStatCO2 = (n) => {
  const v = Number(n);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M kg`;
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)}K kg`;
  return `${v.toFixed(1)} kg`;
};

const fmtStatAvg = (n) => {
  const v = Number(n);
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K kg`;
  return `${v.toFixed(1)} kg`;
};

const fmtStatBalance = (n) => {
  const v = Number(n);
  const sign = v >= 0 ? '+' : '';
  if (Math.abs(v) >= 1_000_000) return `${sign}${(v / 1_000_000).toFixed(1)}M kg`;
  if (Math.abs(v) >= 1_000)     return `${sign}${(v / 1_000).toFixed(1)}K kg`;
  return `${sign}${v.toFixed(1)} kg`;
};

const fmtStatCount = (n) => {
  const v = Number(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
};

function normalizeActivityList(json) {
  const raw = Array.isArray(json)
    ? json
    : (json.activityTypes ?? json.activity_types ?? json.types ?? json.results ?? json.data ?? []);
  return raw
    .map(item => typeof item === 'string' ? item : (item?.name ?? item?.label ?? item?.activityType ?? item?.activity_type ?? item?.type))
    .filter(Boolean);
}

function downloadCSV(filename, headers, rows) {
  const lines = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))];
  const blob  = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildSummaryParams(countyFilter, seqFilter, emitFilter) {
  const params = new URLSearchParams();
  if (countyFilter !== 'All Counties')   params.append('county', countyFilter);
  if (seqFilter    !== 'All Activities') params.append('seqActivity', seqFilter);
  if (emitFilter   !== 'All Activities') params.append('emitActivity', emitFilter);
  return params;
}

function buildDetailedParams({ countyFilter, activityTypeFilter, name, mobile, nationalId, regNo, page, pageSize, sortCol, sortDir }) {
  const params = new URLSearchParams();
  if (countyFilter       !== 'All Counties') params.append('county', countyFilter);
  if (activityTypeFilter !== 'All Types')    params.append('carbonActivityType', activityTypeFilter);
  if (name)       params.append('name', name);
  if (mobile)     params.append('mobile', mobile);
  if (nationalId) params.append('nationalId', nationalId);
  if (regNo)      params.append('regNo', regNo);
  params.append('page', page);
  params.append('pageSize', pageSize);
  params.append('sortCol', sortCol);
  params.append('sortDir', sortDir);
  return params;
}

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

// ─── Net balance cell ─────────────────────────────────────────────────────────

const NetBalanceCell = ({ value }) => {
  const cls = value > 0 ? 'net-positive' : value < 0 ? 'net-negative' : 'net-neutral';
  const prefix = value > 0 ? '+' : '';
  return <span className={cls}>{prefix}{fmtCO2(value)}</span>;
};

// ─── Summary Report ───────────────────────────────────────────────────────────

const SummaryReport = ({ seqActivities, emitActivities }) => {
  const [countyFilter,  setCountyFilter]  = useState('All Counties');
  const [seqFilter,     setSeqFilter]     = useState('All Activities');
  const [emitFilter,    setEmitFilter]    = useState('All Activities');
  const [sortCol,       setSortCol]       = useState('county');
  const [sortDir,       setSortDir]       = useState('asc');
  const [summaryData,   setSummaryData]   = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = buildSummaryParams(countyFilter, seqFilter, emitFilter);
        const res = await apiFetch(`${API_BASE}/carbon/summary?${params.toString()}`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setSummaryData(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        setSummaryData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [countyFilter, seqFilter, emitFilter]);

  const sorted = useMemo(() => {
    return [...summaryData].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [summaryData, sortCol, sortDir]);

  const totals = useMemo(() => ({
    totalEmissions:           summaryData.reduce((s, r) => s + r.totalEmissions, 0),
    totalSequestered:         summaryData.reduce((s, r) => s + r.totalSequestered, 0),
    netBalance:               summaryData.reduce((s, r) => s + r.netBalance, 0),
    eligibleFarms:            summaryData.reduce((s, r) => s + r.eligibleFarms, 0),
    avgEmissionsPerFarmer:    summaryData.length
      ? summaryData.reduce((s, r) => s + r.avgEmissionsPerFarmer, 0) / summaryData.length
      : 0,
    avgSequesteredPerFarmer:  summaryData.length
      ? summaryData.reduce((s, r) => s + r.avgSequesteredPerFarmer, 0) / summaryData.length
      : 0,
  }), [summaryData]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleExport = () => {
    const headers = [
      'S.No', 'County',
      'Total Carbon Emissions (kg CO2 eq)',
      'Avg Emissions per Farmer (kg)',
      'Total Carbon Sequestered (kg CO2 eq)',
      'Avg Sequestered per Farmer (kg)',
      'Net Carbon Balance (kg CO2 eq)',
      'Farms Eligible for Carbon Credits',
      'Top Sequestration Activity',
      'Top Carbon Emission Activity',
    ];
    const rows = sorted.map((r, i) => [
      i + 1, r.county,
      r.totalEmissions, r.avgEmissionsPerFarmer.toFixed(1),
      r.totalSequestered, r.avgSequesteredPerFarmer.toFixed(1),
      r.netBalance, r.eligibleFarms,
      r.topSeqActivity, r.topEmitActivity,
    ]);
    downloadCSV('carbon-tracking-summary.csv', headers, rows);
  };

  const statCards = [
    {
      label: 'Total Carbon Emissions',
      value: fmtStatCO2(totals.totalEmissions),
      mod: 'carbon-stat-red',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Avg Emissions / Farmer',
      value: fmtStatAvg(totals.avgEmissionsPerFarmer),
      mod: 'carbon-stat-amber',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Total Carbon Sequestered',
      value: fmtStatCO2(totals.totalSequestered),
      mod: 'carbon-stat-green',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M6.05 8.05C3.32 10.78 3.32 15.2 6.03 17.93c1.47-3.4 4.09-6.24 7.36-7.93C10.62 12.34 8.68 15.61 8 19.32 10.6 20.55 13.8 20.1 15.95 17.95 19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Avg Sequestered / Farmer',
      value: fmtStatAvg(totals.avgSequesteredPerFarmer),
      mod: 'carbon-stat-teal',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Net Carbon Balance',
      value: fmtStatBalance(totals.netBalance),
      mod: totals.netBalance >= 0 ? 'carbon-stat-emerald' : 'carbon-stat-rose',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Farms Eligible for Credits',
      value: fmtStatCount(totals.eligibleFarms),
      mod: 'carbon-stat-blue',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="currentColor" />
        </svg>
      ),
    },
  ];

  const summaryColumns = [
    { key: 'sno',                     label: 'S. No',                                sortable: false },
    { key: 'county',                  label: 'County',                               sortable: true  },
    { key: 'totalEmissions',          label: 'Total Carbon Emissions (kg CO₂ eq)',    sortable: true  },
    { key: 'avgEmissionsPerFarmer',   label: 'Avg Emissions / Farmer',               sortable: true  },
    { key: 'totalSequestered',        label: 'Total Carbon Sequestered (kg CO₂ eq)', sortable: true  },
    { key: 'avgSequesteredPerFarmer', label: 'Avg Sequestered / Farmer',             sortable: true  },
    { key: 'netBalance',              label: 'Net Carbon Balance',                   sortable: true  },
    { key: 'eligibleFarms',           label: 'Farms Eligible for Carbon Credits',    sortable: true  },
    { key: 'topSeqActivity',          label: 'Top Sequestration Activity',           sortable: true  },
    { key: 'topEmitActivity',         label: 'Top Carbon Emission Activity',         sortable: true  },
  ];

  return (
    <div className="carbon-report-section">

      {/* ── Filters ── */}
      <div className="carbon-summary-filter-bar">
        <div className="carbon-filter-group">
          <div className="filter-field">
            <label className="filter-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="currentColor" />
              </svg>
              County
            </label>
            <select className="filter-select" value={countyFilter} onChange={e => setCountyFilter(e.target.value)}>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="filter-field">
            <label className="filter-label">Sequestration Activity Type</label>
            <select className="filter-select" value={seqFilter} onChange={e => setSeqFilter(e.target.value)}>
              {seqActivities.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div className="filter-field">
            <label className="filter-label">Emission Activity Type</label>
            <select className="filter-select" value={emitFilter} onChange={e => setEmitFilter(e.target.value)}>
              {emitActivities.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <button className="export-btn" onClick={handleExport} disabled={loading || summaryData.length === 0}>
          <ExportIcon /> Export CSV
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="carbon-stat-cards">
        {statCards.map(card => (
          <div key={card.label} className={`carbon-stat-card ${card.mod}`}>
            <div className="carbon-stat-icon-wrap">{card.icon}</div>
            <div className="carbon-stat-body">
              <span className="carbon-stat-value">{card.value}</span>
              <span className="carbon-stat-label">{card.label}</span>
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
                  <tr key={row.county} className="table-data-row">
                    <td>{i + 1}</td>
                    <td>{row.county}</td>
                    <td>{fmtCO2(row.totalEmissions)}</td>
                    <td>{fmtAvg(row.avgEmissionsPerFarmer)}</td>
                    <td>{fmtCO2(row.totalSequestered)}</td>
                    <td>{fmtAvg(row.avgSequesteredPerFarmer)}</td>
                    <td><NetBalanceCell value={row.netBalance} /></td>
                    <td>
                      <span className="eligible-badge">{fmtNum(row.eligibleFarms)}</span>
                    </td>
                    <td>
                      <span className="activity-badge activity-seq">{row.topSeqActivity}</span>
                    </td>
                    <td>
                      <span className="activity-badge activity-emit">{row.topEmitActivity}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                <tr className="table-totals-row">
                  <td colSpan={2}>Total / Average</td>
                  <td>{fmtCO2(totals.totalEmissions)}</td>
                  <td>{fmtAvg(totals.avgEmissionsPerFarmer)}</td>
                  <td>{fmtCO2(totals.totalSequestered)}</td>
                  <td>{fmtAvg(totals.avgSequesteredPerFarmer)}</td>
                  <td><NetBalanceCell value={totals.netBalance} /></td>
                  <td>{fmtNum(totals.eligibleFarms)}</td>
                  <td>—</td>
                  <td>—</td>
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

const DetailedReport = () => {
  const [countyFilter,       setCountyFilter]       = useState('All Counties');
  const [activityTypeFilter, setActivityTypeFilter] = useState('All Types');
  const [searchName,         setSearchName]         = useState('');
  const [searchMobile,       setSearchMobile]       = useState('');
  const [searchId,           setSearchId]           = useState('');
  const [searchRegNo,        setSearchRegNo]        = useState('');
  const [sortCol,            setSortCol]            = useState('id');
  const [sortDir,            setSortDir]            = useState('asc');
  const [page,               setPage]               = useState(1);
  const [pageSize,           setPageSize]           = useState(10);

  // Debounced search values (400 ms delay)
  const [debouncedName,   setDebouncedName]   = useState('');
  const [debouncedMobile, setDebouncedMobile] = useState('');
  const [debouncedId,     setDebouncedId]     = useState('');
  const [debouncedRegNo,  setDebouncedRegNo]  = useState('');

  const [detailedData, setDetailedData] = useState([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedName(searchName); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchName]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedMobile(searchMobile); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchMobile]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedId(searchId); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchId]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedRegNo(searchRegNo); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchRegNo]);

  useEffect(() => {
    const fetchDetailed = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = buildDetailedParams({
          countyFilter, activityTypeFilter,
          name: debouncedName, mobile: debouncedMobile,
          nationalId: debouncedId, regNo: debouncedRegNo,
          page, pageSize, sortCol, sortDir,
        });
        const res = await apiFetch(`${API_BASE}/carbon/detailed?${params.toString()}`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        const records = Array.isArray(json) ? json : (json.data ?? []);
        const total   = Array.isArray(json) ? json.length : (json.total ?? json.count ?? records.length);
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
  }, [
    countyFilter, activityTypeFilter,
    debouncedName, debouncedMobile, debouncedId, debouncedRegNo,
    sortCol, sortDir, page, pageSize,
  ]);

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
        countyFilter, activityTypeFilter,
        name: debouncedName, mobile: debouncedMobile,
        nationalId: debouncedId, regNo: debouncedRegNo,
        page: 1, pageSize: 100000, sortCol, sortDir,
      });
      const res = await apiFetch(`${API_BASE}/carbon/detailed?${params.toString()}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      const allData = Array.isArray(json) ? json : (json.data ?? []);
      const headers = [
        'S.No', 'Farmer Registration No', 'Name', 'Crop Type', 'Farm Size (Ha)',
        'Total Carbon Emissions (kg CO2 eq)', 'Total Carbon Sequestered (kg CO2 eq)',
        'Net Carbon Balance Score', 'Top Sequestration Activity', 'Top Carbon Emission Activity',
      ];
      const rows = allData.map((r, i) => [
        i + 1, r.regNo, r.name, r.cropType, r.farmSize,
        r.totalEmissions, r.totalSequestered,
        r.netBalance, r.topSeqActivity, r.topEmitActivity,
      ]);
      downloadCSV('carbon-tracking-detailed.csv', headers, rows);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const detailedColumns = [
    { key: 'id',               label: 'S. No' },
    { key: 'regNo',            label: 'Farmer Registration No' },
    { key: 'name',             label: 'Name' },
    { key: 'cropType',         label: 'Crop Type' },
    { key: 'farmSize',         label: 'Farm Size (Ha)' },
    { key: 'totalEmissions',   label: 'Total Carbon Emissions' },
    { key: 'totalSequestered', label: 'Total Carbon Sequestered' },
    { key: 'netBalance',       label: 'Net Carbon Balance Score' },
    { key: 'topSeqActivity',   label: 'Top Sequestration Activity' },
    { key: 'topEmitActivity',  label: 'Top Carbon Emission Activity' },
  ];

  return (
    <div className="carbon-report-section">

      {/* ── Filters panel ── */}
      <div className="carbon-filters-panel">
        <div className="filters-panel-header">
          <FilterIcon />
          Filters
        </div>

        {/* Dropdown filters */}
        <div className="filters-row">
          <div className="filter-field">
            <label className="filter-label">County</label>
            <select className="filter-select" value={countyFilter} onChange={onDropdownChange(setCountyFilter)}>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-label">Carbon Activity Type</label>
            <select className="filter-select" value={activityTypeFilter} onChange={onDropdownChange(setActivityTypeFilter)}>
              {CARBON_ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="filters-divider" />

        {/* Search inputs */}
        <div className="filters-row">
          {[
            { label: 'Farmer Name',                value: searchName,   setter: setSearchName,   placeholder: 'Search by name…'    },
            { label: 'Mobile Number',              value: searchMobile, setter: setSearchMobile, placeholder: 'e.g. 0712…'         },
            { label: 'National ID',                value: searchId,     setter: setSearchId,     placeholder: 'Search ID…'         },
            { label: 'Farmer Registration Number', value: searchRegNo,  setter: setSearchRegNo,  placeholder: 'e.g. CTR-2024001…'  },
          ].map(f => (
            <div key={f.label} className="filter-field">
              <label className="filter-label">{f.label}</label>
              <div className="search-input-wrap">
                <SearchIcon />
                <input
                  type="text"
                  className="filter-input"
                  placeholder={f.placeholder}
                  value={f.value}
                  onChange={e => f.setter(e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="report-toolbar">
        <span className="result-count">
          Showing <strong>{detailedData.length}</strong> of <strong>{totalCount}</strong> records
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
                    No records match the selected filters.
                  </td>
                </tr>
              ) : (
                detailedData.map((row, i) => (
                  <tr key={row.id} className="table-data-row">
                    <td>{(page - 1) * pageSize + i + 1}</td>
                    <td className="monospace-cell">{row.regNo}</td>
                    <td>{row.name}</td>
                    <td>{row.cropType}</td>
                    <td>{row.farmSize} ha</td>
                    <td>{fmtCO2(row.totalEmissions)}</td>
                    <td>{fmtCO2(row.totalSequestered)}</td>
                    <td><NetBalanceCell value={row.netBalance} /></td>
                    <td>
                      <span className="activity-badge activity-seq">{row.topSeqActivity}</span>
                    </td>
                    <td>
                      <span className="activity-badge activity-emit">{row.topEmitActivity}</span>
                    </td>
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

const CarbonTrackingReport = () => {
  const [activeView,     setActiveView]     = useState('summary');
  const [seqActivities,  setSeqActivities]  = useState(SEQ_ACTIVITIES);
  const [emitActivities, setEmitActivities] = useState(EMIT_ACTIVITIES);

  useEffect(() => {
    const fetchActivityTypes = async (url, setter) => {
      try {
        const res = await apiFetch(`${API_BASE}${url}`);
        if (!res.ok) {
          console.error(`Failed to fetch ${url}: HTTP ${res.status} ${res.statusText}`);
          return;
        }
        const json = await res.json();
        const list = normalizeActivityList(json);
        if (list.length) {
          setter(['All Activities', ...list]);
        } else {
          console.warn(`${url} returned no usable activity names. Raw response:`, json);
        }
      } catch (err) {
        console.error(`Failed to fetch ${url}:`, err);
      }
    };
    fetchActivityTypes('/carbon/sequestration-activity-types', setSeqActivities);
    fetchActivityTypes('/carbon/emission-activity-types', setEmitActivities);
  }, []);

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content carbon-report-page">

          {/* ── Page header ── */}
          <div className="report-page-header">
            <div className="report-page-title-group">
              <h1 className="report-page-title">Carbon Tracking Report</h1>
              <p className="report-page-subtitle">
                Monitor carbon emissions, sequestration activity, and farm eligibility for carbon credits
              </p>
            </div>

            {/* ── Report type dropdown ── */}
            <div className="report-type-dropdown-wrap">
              <label className="report-type-dropdown-label">Report Type</label>
              <div className="report-type-select-wrap">
                <svg className="report-type-select-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6.05 8.05C3.32 10.78 3.32 15.2 6.03 17.93c1.47-3.4 4.09-6.24 7.36-7.93C10.62 12.34 8.68 15.61 8 19.32 10.6 20.55 13.8 20.1 15.95 17.95 19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z" fill="currentColor" />
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

          {activeView === 'summary'
            ? <SummaryReport seqActivities={seqActivities} emitActivities={emitActivities} />
            : <DetailedReport />}
        </div>
      </div>
    </div>
  );
};

export default CarbonTrackingReport;
