import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Sidebar from '../../Sidebar';
import Header from '../../Header';
import { apiFetch } from '../../../utils/apiFetch';
import './FarmerRegistrationReport.css';


const API_URL = import.meta.env.VITE_API_URL;

const COUNTIES = [
  'All Counties', 'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru',
  'Eldoret', 'Thika', 'Malindi', 'Kitale', 'Garissa', 'Kakamega',
];

const CROPS = ['All Crops', 'Maize', 'Wheat', 'Tea', 'Coffee', 'Rice', 'Beans', 'Sorghum', 'Millet'];

const SEX_OPTIONS = ['All', 'Male', 'Female'];


const normalizeSummaryRow = (r) => ({
  county: r.county ?? r.region ?? r.location ?? '',
  total:  r.total  ?? r.total_farmers  ?? r.count ?? 0,
  female: r.female ?? r.female_farmers ?? r.female_count ?? 0,
  male:   r.male   ?? r.male_farmers   ?? r.male_count   ?? 0,
  youth:  r.youth  ?? r.youth_farmers  ?? r.youth_count  ?? 0,
});

const normalizeFarmer = (f) => ({
  id:             f.id ?? f.farmer_id,
  regNo:          f.reg_no ?? f.registration_number ?? f.regNo ?? '',
  name:           f.name ?? f.full_name ?? f.farmer_name ?? '',
  nationalId:     f.national_id ?? f.nationalId ?? '',
  mobile:         f.mobile ?? f.phone ?? f.mobile_number ?? '',
  county:         f.county ?? '',
  crops:          Array.isArray(f.crops ?? f.crop ?? f.crop_grown)
                  ? (f.crops ?? f.crop ?? f.crop_grown).join(', ')
                  : (f.crops ?? f.crop ?? f.crop_grown ?? ''),
  farmSize:       f.farm_size ?? f.farmSize ?? '',
  sex:            f.sex ?? f.gender ?? '',
  dateRegistered: f.date_registered ?? f.dateRegistered ?? f.created_at ?? '',
  status:         f.status ?? '',
});

// ─── Utility helpers ──────────────────────────────────────────────────────────

const maskMobile = (num) => num && num.length > 6 ? num.slice(0, 4) + '****' + num.slice(-2) : (num || '—');
const maskId     = (id)  => id  && id.length  > 4 ? id.slice(0, 2)  + '*'.repeat(id.length - 4) + id.slice(-2) : (id || '—');

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

// ─── Summary Report ───────────────────────────────────────────────────────────

const SummaryReport = () => {
  const [countyFilter, setCountyFilter] = useState('All Counties');
  const [sortCol, setSortCol]           = useState('county');
  const [sortDir, setSortDir]           = useState('asc');
  const [summaryData, setSummaryData]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [fetchError, setFetchError]     = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams();
        if (countyFilter !== 'All Counties') params.set('county', countyFilter);

        const res = await apiFetch(`${API_URL}/farmers/report/summary?${params.toString()}`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        const rawList = json.data ?? [];
        setSummaryData(rawList.map(normalizeSummaryRow));
      } catch (err) {
        setFetchError(err.message ?? 'Failed to load summary data.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [countyFilter]);

  const filtered = useMemo(() => {
    return [...summaryData].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [summaryData, sortCol, sortDir]);

  const totals = useMemo(() => ({
    total:  filtered.reduce((s, r) => s + r.total,  0),
    female: filtered.reduce((s, r) => s + r.female, 0),
    male:   filtered.reduce((s, r) => s + r.male,   0),
    youth:  filtered.reduce((s, r) => s + r.youth,  0),
  }), [filtered]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleExport = () => {
    const headers = ['S.No', 'County', 'Total Farmers', 'Female Farmers', 'Male Farmers', 'Youth Farmers'];
    const rows    = filtered.map((r, i) => [i + 1, r.county, r.total, r.female, r.male, r.youth]);
    downloadCSV('farmer-registration-summary.csv', headers, rows);
  };

  const statCards = [
    { label: 'Total Farmers',  value: totals.total,  mod: 'stat-green',  icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/></svg>
    )},
    { label: 'Female Farmers', value: totals.female, mod: 'stat-purple', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2C9.24 2 7 4.24 7 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 10c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" fill="currentColor"/></svg>
    )},
    { label: 'Male Farmers',   value: totals.male,   mod: 'stat-blue',   icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2C9.24 2 7 4.24 7 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 10c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" fill="currentColor"/></svg>
    )},
    { label: 'Youth Farmers',  value: totals.youth,  mod: 'stat-orange', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6.05 8.05C3.32 10.78 3.32 15.2 6.03 17.93c1.47-3.4 4.09-6.24 7.36-7.93C10.62 12.34 8.68 15.61 8 19.32 10.6 20.55 13.8 20.1 15.95 17.95 19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z" fill="currentColor"/></svg>
    )},
  ];

  return (
    <div className="report-section">

      {/* ── County filter bar ── */}
      <div className="summary-filter-bar">
        <div className="filter-field">
          <label className="filter-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="currentColor"/>
            </svg>
            Filter by County
          </label>
          <select
            className="filter-select"
            value={countyFilter}
            onChange={e => setCountyFilter(e.target.value)}
          >
            {COUNTIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button className="export-btn" onClick={handleExport} disabled={loading}>
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
                <span className="stat-card-value">{card.value.toLocaleString()}</span>
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
              {[
                { key: 'sno',    label: 'S. No' },
                { key: 'county', label: 'County' },
                { key: 'total',  label: 'No. of Farmers Registered' },
                { key: 'female', label: 'No. of Female Farmers Registered' },
                { key: 'male',   label: 'No. of Male Farmers' },
                { key: 'youth',  label: 'No. of Farmers Who Are Youth' },
              ].map(col => (
                <th
                  key={col.key}
                  className={col.key !== 'sno' ? 'sortable-th' : ''}
                  onClick={col.key !== 'sno' ? () => handleSort(col.key) : undefined}
                >
                  <span className="th-content">
                    {col.label}
                    {col.key !== 'sno' && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
            ) : fetchError ? (
              <tr>
                <td colSpan={6} className="empty-table-msg">
                  <div className="fetch-error-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#DC2626"/>
                    </svg>
                    <span>{fetchError}</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-table-msg">
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.53 15.48 0 12 0S6 2.53 6 4.64c0 .48.11.92.18 1.36H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8-4c1.93 0 3.5 1.57 3.5 3.5S13.93 9 12 9 8.5 7.43 8.5 5.5 10.07 2 12 2zm0 9c2.76 0 5 2.24 5 5H7c0-2.76 2.24-5 5-5z" fill="#9CA3AF"/>
                    </svg>
                    <span>No summary data available.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={row.county || i} className="table-data-row">
                  <td>{i + 1}</td>
                  <td>{row.county}</td>
                  <td>{row.total.toLocaleString()}</td>
                  <td>{row.female.toLocaleString()}</td>
                  <td>{row.male.toLocaleString()}</td>
                  <td>{row.youth.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && !fetchError && filtered.length > 0 && (
            <tfoot>
              <tr className="table-totals-row">
                <td colSpan={2}>Total</td>
                <td>{totals.total.toLocaleString()}</td>
                <td>{totals.female.toLocaleString()}</td>
                <td>{totals.male.toLocaleString()}</td>
                <td>{totals.youth.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// ─── Detailed Report ──────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 20, 50, 100];

const DetailedReport = () => {
  const [countyFilter,  setCountyFilter]  = useState('All Counties');
  const [sexFilter,     setSexFilter]     = useState('All');
  const [cropFilter,    setCropFilter]    = useState('All Crops');
  const [searchName,    setSearchName]    = useState('');
  const [searchMobile,  setSearchMobile]  = useState('');
  const [searchId,      setSearchId]      = useState('');
  const [searchRegNo,   setSearchRegNo]   = useState('');
  const [sortCol,       setSortCol]       = useState('id');
  const [sortDir,       setSortDir]       = useState('asc');
  const [page,          setPage]          = useState(1);
  const [pageSize,      setPageSize]      = useState(10);

  const [rows,       setRows]       = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });
      if (countyFilter !== 'All Counties') params.set('county', countyFilter);
      if (sexFilter    !== 'All')          params.set('sex',    sexFilter);
      if (cropFilter   !== 'All Crops')    params.set('crop',   cropFilter);
      if (searchName)                      params.set('name',        searchName);
      if (searchMobile)                    params.set('mobile',      searchMobile);
      if (searchId)                        params.set('national_id', searchId);
      if (searchRegNo)                     params.set('reg_no',      searchRegNo);

      const res = await apiFetch(`${API_URL}/farmers/report/detailed?${params.toString()}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();
      const rawList  = json.data ?? [];
      const rawTotal = json.pagination?.total ?? rawList.length;

      setRows(rawList.map(normalizeFarmer));
      setTotalCount(rawTotal);
    } catch (err) {
      setFetchError(err.message ?? 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, countyFilter, sexFilter, cropFilter, searchName, searchMobile, searchId, searchRegNo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filtered = useMemo(() => {
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

  const onServerFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };
  const onSearchChange       = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const handleExport = () => {
    const headers = [
      'S.No', 'Reg No', 'Farmer Name', 'National ID', 'Mobile No',
      'County', 'Crops Grown', 'Farm Size', 'Sex', 'Date Registered', 'Status',
    ];
    const exportRows = filtered.map((r, i) => [
      (page - 1) * pageSize + i + 1,
      r.regNo, r.name, maskId(r.nationalId), maskMobile(r.mobile),
      r.county, r.crops, r.farmSize, r.sex, r.dateRegistered, r.status,
    ]);
    downloadCSV('farmer-registration-detailed.csv', headers, exportRows);
  };

  const statusBadge = (status) => {
    const cls = status === 'Active' ? 'badge-active'
      : status === 'Inactive'       ? 'badge-inactive'
      : 'badge-pending';
    return <span className={`status-badge ${cls}`}>{status}</span>;
  };

  return (
    <div className="report-section">

      {/* ── Filters panel ── */}
      <div className="detailed-filters-panel">
        <div className="filters-panel-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z" fill="currentColor"/>
          </svg>
          Filters
        </div>

        <div className="filters-row">
          <div className="filter-field">
            <label className="filter-label">County</label>
            <select className="filter-select" value={countyFilter} onChange={onServerFilterChange(setCountyFilter)}>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-label">Sex</label>
            <select className="filter-select" value={sexFilter} onChange={onServerFilterChange(setSexFilter)}>
              {SEX_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-label">Crops Grown</label>
            <select className="filter-select" value={cropFilter} onChange={onServerFilterChange(setCropFilter)}>
              {CROPS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="filters-divider" />

        <div className="filters-row">
          {[
            { label: 'Farmer Name',               value: searchName,   setter: setSearchName,   placeholder: 'Search by name…'   },
            { label: 'Mobile Number',              value: searchMobile, setter: setSearchMobile, placeholder: 'e.g. 0712…'        },
            { label: 'National ID',                value: searchId,     setter: setSearchId,     placeholder: 'Search ID…'        },
            { label: 'Farmer Registration Number', value: searchRegNo,  setter: setSearchRegNo,  placeholder: 'e.g. FRN-2024001…' },
          ].map(f => (
            <div key={f.label} className="filter-field">
              <label className="filter-label">{f.label}</label>
              <div className="search-input-wrap">
                <svg className="search-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                </svg>
                <input
                  type="text"
                  className="filter-input"
                  placeholder={f.placeholder}
                  value={f.value}
                  onChange={onSearchChange(f.setter)}
                />
              </div>
            </div>
          ))}
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
            <>Showing <strong>{filtered.length}</strong> of <strong>{totalCount}</strong> records</>
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
          <button className="export-btn" onClick={handleExport} disabled={loading}>
            <ExportIcon /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Detailed table ── */}
      <div className="report-table-wrapper">
        <table className="report-table">
          <thead>
            <tr>
              {[
                { key: 'id',             label: 'S. No' },
                { key: 'regNo',          label: 'Farmer Registration No' },
                { key: 'name',           label: 'Farmer Name' },
                { key: 'nationalId',     label: 'National ID' },
                { key: 'mobile',         label: 'Mobile No' },
                { key: 'county',         label: 'County' },
                { key: 'crops',          label: 'Crops Grown' },
                { key: 'farmSize',       label: 'Farm Size' },
                { key: 'sex',            label: 'Sex' },
                { key: 'dateRegistered', label: 'Date Registered' },
                { key: 'status',         label: 'Status' },
              ].map(col => (
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
                <TableRowSkeleton key={i} cols={11} />
              ))
            ) : fetchError ? (
              <tr>
                <td colSpan={11} className="empty-table-msg">
                  <div className="fetch-error-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#DC2626"/>
                    </svg>
                    <span>{fetchError}</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty-table-msg">
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.53 15.48 0 12 0S6 2.53 6 4.64c0 .48.11.92.18 1.36H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8-4c1.93 0 3.5 1.57 3.5 3.5S13.93 9 12 9 8.5 7.43 8.5 5.5 10.07 2 12 2zm0 9c2.76 0 5 2.24 5 5H7c0-2.76 2.24-5 5-5z" fill="#9CA3AF"/>
                    </svg>
                    <span>No records match the selected filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={row.id ?? i} className="table-data-row">
                  <td>{(page - 1) * pageSize + i + 1}</td>
                  <td className="monospace-cell">{row.regNo}</td>
                  <td>{row.name}</td>
                  <td className="monospace-cell masked-cell" title="Masked for privacy">{maskId(row.nationalId)}</td>
                  <td className="monospace-cell masked-cell" title="Masked for privacy">{maskMobile(row.mobile)}</td>
                  <td>{row.county}</td>
                  <td>{row.crops}</td>
                  <td>{row.farmSize}</td>
                  <td>{row.sex}</td>
                  <td>{row.dateRegistered}</td>
                  <td>{statusBadge(row.status)}</td>
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

const FarmerRegistrationReport = () => {
  const [activeView, setActiveView] = useState('summary');

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content farmer-report-page">

          <div className="report-page-header">
            <div className="report-page-title-group">
              <h1 className="report-page-title">Farmer Registration Report</h1>
              <p className="report-page-subtitle">
                Insights on farmer onboarding, registrations, and profile completeness
              </p>
            </div>

            <div className="report-type-dropdown-wrap">
              <label className="report-type-dropdown-label">Report Type</label>
              <div className="report-type-select-wrap">
                <svg className="report-type-select-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor"/>
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
                  <path d="M7 10l5 5 5-5H7z" fill="currentColor"/>
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

export default FarmerRegistrationReport;
