import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Sidebar from '../../Sidebar';
import Header from '../../Header';
import { apiFetch } from '../../../utils/apiFetch';
import { KENYA_COUNTIES } from '../../../data/kenyaCounties';
import './FinancialsReport.css';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTIES = ['All Counties', ...KENYA_COUNTIES.map(c => c.name)];

const TRANSACTION_TYPES = ['All Types', 'Income', 'Expense'];

const PAGE_SIZES = [10, 20, 50, 100];

// ─── Normalizers ──────────────────────────────────────────────────────────────

const normalizeSummaryRow = (r) => ({
  county:         r.county ?? '',
  totalExpenses:  r.total_expenses  ?? r.totalExpenses  ?? 0,
  totalIncome:    r.total_income    ?? r.totalIncome    ?? 0,
  netProfitLoss:  r.net_profit_loss ?? r.netProfitLoss  ?? 0,
  topCostDrivers: r.top_cost_drivers ?? r.topCostDrivers ?? '',
  cropType:       r.crop_type ?? r.cropType ?? '',
  activeFarmers:  r.active_farmers ?? r.activeFarmers ?? 0,
});

const normalizeDetailedRow = (r) => ({
  id:              r.id ?? Math.random(),
  regNo:           r.reg_no          ?? r.regNo          ?? '',
  farmerName:      r.farmer_name     ?? r.farmerName     ?? '',
  category:        r.category        ?? r.transaction_category ?? '',
  county:          r.county          ?? '',
  transactionDate: r.transaction_date ?? r.transactionDate ?? '',
  transactionType: r.transaction_type ?? r.transactionType ?? '',
  description:     r.description     ?? '',
  amount:          r.amount          ?? 0,
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
  <div className={`fin-stat-card ${mod}`}>
    <div className="skeleton-icon skeleton-shimmer" />
    <div className="skeleton-card-text">
      <div className="skeleton-line skeleton-line-value skeleton-shimmer" />
      <div className="skeleton-line skeleton-line-label skeleton-shimmer" />
    </div>
  </div>
);

// ─── Utilities ────────────────────────────────────────────────────────────────

const fmtKES = (n) => `KES ${Number(n).toLocaleString()}`;
const fmtNum = (n) => Number(n).toLocaleString();

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

// ─── Shared icons ─────────────────────────────────────────────────────────────

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) {
    return (
      <svg className="fin-sort-icon fin-sort-idle" width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M7 10l5-5 5 5H7zm0 4l5 5 5-5H7z" fill="currentColor" />
      </svg>
    );
  }
  return sortDir === 'asc' ? (
    <svg className="fin-sort-icon fin-sort-active" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M7 14l5-5 5 5H7z" fill="currentColor" />
    </svg>
  ) : (
    <svg className="fin-sort-icon fin-sort-active" width="14" height="14" viewBox="0 0 24 24" fill="none">
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
  <svg className="fin-search-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
  </svg>
);

// ─── Profit / Loss cell ───────────────────────────────────────────────────────

const ProfitLossCell = ({ value }) => {
  const cls    = value > 0 ? 'fin-profit' : value < 0 ? 'fin-loss' : 'fin-neutral';
  const prefix = value > 0 ? '+' : '';
  return <span className={cls}>{prefix}{fmtKES(value)}</span>;
};

// ─── Transaction type badge ───────────────────────────────────────────────────

const TransactionBadge = ({ type }) => (
  <span className={`fin-txn-badge ${type === 'Income' ? 'fin-txn-income' : 'fin-txn-expense'}`}>
    {type}
  </span>
);

// ─── Summary Report ───────────────────────────────────────────────────────────

const SummaryReport = () => {
  const [countyFilter, setCountyFilter] = useState('All Counties');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
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
        if (countyFilter !== 'All Counties') params.set('county',    countyFilter);
        if (dateFrom)                        params.set('date_from', dateFrom);
        if (dateTo)                          params.set('date_to',   dateTo);

        const res = await apiFetch(`${API_URL}/api/financials/report/summary?${params.toString()}`);
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
  }, [countyFilter, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    return [...summaryData].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [summaryData, sortCol, sortDir]);

  const totals = useMemo(() => {
    const totalIncome    = filtered.reduce((s, r) => s + r.totalIncome,    0);
    const activeFarmers  = filtered.reduce((s, r) => s + r.activeFarmers, 0);
    return {
      totalExpenses: filtered.reduce((s, r) => s + r.totalExpenses, 0),
      totalIncome,
      netProfitLoss: filtered.reduce((s, r) => s + r.netProfitLoss, 0),
      activeFarmers,
      avgIncomePerFarmer: activeFarmers ? totalIncome / activeFarmers : 0,
    };
  }, [filtered]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleExport = () => {
    const headers = ['S.No', 'County', 'Total Expenses (KES)', 'Total Income (KES)', 'Net Profit/Loss (KES)', 'Top Cost Drivers'];
    const rows    = filtered.map((r, i) => [i + 1, r.county, r.totalExpenses, r.totalIncome, r.netProfitLoss, r.topCostDrivers]);
    downloadCSV('financials-summary.csv', headers, rows);
  };

  const statCards = [
    {
      label: 'Total Income',
      value: fmtKES(totals.totalIncome),
      mod:   'fin-stat-green',
      icon:  (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Total Expenses',
      value: fmtKES(totals.totalExpenses),
      mod:   'fin-stat-red',
      icon:  (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M16 18L18.29 15.71L13.41 10.83L9.41 14.83L2 7.41L3.41 6L9.41 12L13.41 8L19.71 14.29L22 12V18H16Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Net Profit / Loss',
      value: `${totals.netProfitLoss >= 0 ? '+' : ''}${fmtKES(totals.netProfitLoss)}`,
      mod:   totals.netProfitLoss >= 0 ? 'fin-stat-emerald' : 'fin-stat-rose',
      icon:  (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C12.92 6.9 13.63 7.44 13.89 8.3C14.01 8.7 14.34 9 14.76 9H15.06C15.72 9 16.19 8.35 15.96 7.73C15.54 6.55 14.56 5.57 13 5.19V4.5C13 3.67 12.33 3 11.5 3C10.67 3 10 3.67 10 4.5V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.85 17.1 9 16.51 8.67 15.67C8.52 15.28 8.18 15 7.77 15H7.49C6.82 15 6.35 15.68 6.6 16.3C7.17 17.69 8.5 18.51 10 18.83V19.5C10 20.33 10.67 21 11.5 21C12.33 21 13 20.33 13 19.5V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Counties Covered',
      value: fmtNum(filtered.length),
      mod:   'fin-stat-blue',
      icon:  (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Active Farmers',
      value: fmtNum(totals.activeFarmers),
      mod:   'fin-stat-purple',
      icon:  (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Avg Income / Farmer',
      value: fmtKES(Math.round(totals.avgIncomePerFarmer)),
      mod:   'fin-stat-teal',
      icon:  (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 15.93c-2.83-.48-5-2.94-5-5.93 0-1.13.32-2.18.85-3.08L12 15.99V16.93zm4.15-2.99L9.85 6.94C10.65 6.34 11.28 6 12 6c2.76 0 5 2.24 5 5 0 1.13-.38 2.16-1 3z" fill="currentColor" />
        </svg>
      ),
    },
  ];

  const summaryColumns = [
    { key: 'sno',            label: 'S. No',            sortable: false },
    { key: 'county',         label: 'County',            sortable: true  },
    { key: 'totalExpenses',  label: 'Total Expenses',    sortable: true  },
    { key: 'totalIncome',    label: 'Total Income',      sortable: true  },
    { key: 'netProfitLoss',  label: 'Net Profit / Loss', sortable: true  },
    { key: 'topCostDrivers', label: 'Top Cost Drivers',  sortable: true  },
  ];

  return (
    <div className="fin-report-section">

      {/* ── Filters ── */}
      <div className="fin-summary-filter-bar">
        <div className="fin-filter-group">
          <div className="fin-filter-field">
            <label className="fin-filter-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="currentColor" />
              </svg>
              County
            </label>
            <select className="fin-filter-select" value={countyFilter} onChange={e => setCountyFilter(e.target.value)}>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="fin-filter-field">
            <label className="fin-filter-label">Date From (optional)</label>
            <input
              type="date"
              className="fin-date-input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          <div className="fin-filter-field">
            <label className="fin-filter-label">Date To (optional)</label>
            <input
              type="date"
              className="fin-date-input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <button className="fin-export-btn" onClick={handleExport} disabled={loading || !filtered.length}>
          <ExportIcon /> Export CSV
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="fin-stat-cards">
        {loading
          ? statCards.map(card => <StatCardSkeleton key={card.label} mod={card.mod} />)
          : statCards.map(card => (
            <div key={card.label} className={`fin-stat-card ${card.mod}`}>
              <div className="fin-stat-icon-wrap">{card.icon}</div>
              <div className="fin-stat-body">
                <span className="fin-stat-value">{card.value}</span>
                <span className="fin-stat-label">{card.label}</span>
              </div>
            </div>
          ))
        }
      </div>

      {/* ── Summary table ── */}
      <div className="fin-table-wrapper">
        <table className="fin-report-table">
          <thead>
            <tr>
              {summaryColumns.map(col => (
                <th
                  key={col.key}
                  className={col.sortable ? 'fin-sortable-th' : ''}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="fin-th-content">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
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
                <td colSpan={summaryColumns.length} className="fin-empty-table-msg">
                  <div className="fin-fetch-error-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#DC2626" />
                    </svg>
                    <span>{fetchError}</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={summaryColumns.length} className="fin-empty-table-msg">
                  <div className="fin-empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C12.92 6.9 13.63 7.44 13.89 8.3C14.01 8.7 14.34 9 14.76 9H15.06C15.72 9 16.19 8.35 15.96 7.73C15.54 6.55 14.56 5.57 13 5.19V4.5C13 3.67 12.33 3 11.5 3C10.67 3 10 3.67 10 4.5V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.85 17.1 9 16.51 8.67 15.67C8.52 15.28 8.18 15 7.77 15H7.49C6.82 15 6.35 15.68 6.6 16.3C7.17 17.69 8.5 18.51 10 18.83V19.5C10 20.33 10.67 21 11.5 21C12.33 21 13 20.33 13 19.5V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" fill="#9CA3AF" />
                    </svg>
                    <span>No financial data available for the selected filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={row.county + i} className="fin-table-data-row">
                  <td>{i + 1}</td>
                  <td>{row.county}</td>
                  <td className="fin-expense-amount">{fmtKES(row.totalExpenses)}</td>
                  <td className="fin-income-amount">{fmtKES(row.totalIncome)}</td>
                  <td><ProfitLossCell value={row.netProfitLoss} /></td>
                  <td><span className="fin-cost-driver-badge">{row.topCostDrivers}</span></td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && !fetchError && filtered.length > 0 && (
            <tfoot>
              <tr className="fin-table-totals-row">
                <td colSpan={2}>Totals</td>
                <td>{fmtKES(totals.totalExpenses)}</td>
                <td>{fmtKES(totals.totalIncome)}</td>
                <td><ProfitLossCell value={totals.netProfitLoss} /></td>
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
  const [countyFilter,  setCountyFilter]  = useState('All Counties');
  const [txnTypeFilter, setTxnTypeFilter] = useState('All Types');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [searchName,    setSearchName]    = useState('');
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
      if (countyFilter  !== 'All Counties') params.set('county',           countyFilter);
      if (txnTypeFilter !== 'All Types')    params.set('transaction_type', txnTypeFilter);
      if (dateFrom)                         params.set('date_from',        dateFrom);
      if (dateTo)                           params.set('date_to',          dateTo);
      if (searchName)                       params.set('name',             searchName);
      if (searchRegNo)                      params.set('reg_no',           searchRegNo);

      const res = await apiFetch(`${API_URL}/api/financials/report/detailed?${params.toString()}`);
      if (res.status === 404) { setRows([]); setTotalCount(0); return; }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json     = await res.json();
      const rawList  = json.data ?? [];
      const rawTotal = json.pagination?.total ?? rawList.length;

      setRows(rawList.map(normalizeDetailedRow));
      setTotalCount(rawTotal);
    } catch (err) {
      setFetchError(err.message ?? 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, countyFilter, txnTypeFilter, dateFrom, dateTo, searchName, searchRegNo]);

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

  const onChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const handleExport = () => {
    const headers = [
      'S.No', 'Farmer Registration No', 'Farmer Name', 'Category',
      'Transaction Date', 'Transaction Type', 'Description', 'Amount (KES)',
    ];
    const exportRows = sorted.map((r, i) => [
      i + 1, r.regNo, r.farmerName, r.category,
      r.transactionDate, r.transactionType, r.description, r.amount,
    ]);
    downloadCSV('financials-detailed.csv', headers, exportRows);
  };

  const detailedColumns = [
    { key: 'id',              label: 'S. No'                  },
    { key: 'regNo',           label: 'Farmer Registration No' },
    { key: 'farmerName',      label: 'Farmer Name'            },
    { key: 'category',        label: 'Category'               },
    { key: 'transactionDate', label: 'Transaction Date'       },
    { key: 'transactionType', label: 'Transaction Type'       },
    // { key: 'description',     label: 'Description'            },
    { key: 'amount',          label: 'Amount (KES)'           },
  ];

  return (
    <div className="fin-report-section">

      {/* ── Filters panel ── */}
      <div className="fin-filters-panel">
        <div className="fin-filters-panel-header">
          <FilterIcon />
          Filters
        </div>

        <div className="fin-filters-row">
          <div className="fin-filter-field">
            <label className="fin-filter-label">County</label>
            <select className="fin-filter-select" value={countyFilter} onChange={onChange(setCountyFilter)}>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="fin-filter-field">
            <label className="fin-filter-label">Transaction Type</label>
            <select className="fin-filter-select" value={txnTypeFilter} onChange={onChange(setTxnTypeFilter)}>
              {TRANSACTION_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="fin-filter-field">
            <label className="fin-filter-label">Date From</label>
            <input
              type="date"
              className="fin-date-input"
              value={dateFrom}
              onChange={onChange(setDateFrom)}
            />
          </div>

          <div className="fin-filter-field">
            <label className="fin-filter-label">Date To</label>
            <input
              type="date"
              className="fin-date-input"
              value={dateTo}
              onChange={onChange(setDateTo)}
            />
          </div>
        </div>

        <div className="fin-filters-divider" />

        <div className="fin-filters-row">
          {[
            { label: 'Farmer Name',                value: searchName,  setter: setSearchName,  placeholder: 'Search by name…'   },
            { label: 'Farmer Registration Number', value: searchRegNo, setter: setSearchRegNo, placeholder: 'e.g. FIN-2024001…' },
          ].map(f => (
            <div key={f.label} className="fin-filter-field">
              <label className="fin-filter-label">{f.label}</label>
              <div className="fin-search-input-wrap">
                <SearchIcon />
                <input
                  type="text"
                  className="fin-filter-input"
                  placeholder={f.placeholder}
                  value={f.value}
                  onChange={onChange(f.setter)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="fin-report-toolbar">
        <span className="fin-result-count">
          {loading ? (
            <span className="fin-toolbar-loading-indicator">
              <span className="fin-toolbar-spinner" />
              Fetching records…
            </span>
          ) : (
            <>Showing <strong>{sorted.length}</strong> of <strong>{totalCount}</strong> records</>
          )}
        </span>
        <div className="fin-toolbar-right">
          <label className="fin-filter-label">Rows per page</label>
          <select
            className="fin-filter-select fin-filter-select-sm"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button className="fin-export-btn" onClick={handleExport} disabled={loading || !sorted.length}>
            <ExportIcon /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Detailed table ── */}
      <div className="fin-table-wrapper">
        <table className="fin-report-table">
          <thead>
            <tr>
              {detailedColumns.map(col => (
                <th key={col.key} className="fin-sortable-th" onClick={() => handleSort(col.key)}>
                  <span className="fin-th-content">
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
                <TableRowSkeleton key={i} cols={8} />
              ))
            ) : fetchError ? (
              <tr>
                <td colSpan={detailedColumns.length} className="fin-empty-table-msg">
                  <div className="fin-fetch-error-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#DC2626" />
                    </svg>
                    <span>{fetchError}</span>
                  </div>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={detailedColumns.length} className="fin-empty-table-msg">
                  <div className="fin-empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C12.92 6.9 13.63 7.44 13.89 8.3C14.01 8.7 14.34 9 14.76 9H15.06C15.72 9 16.19 8.35 15.96 7.73C15.54 6.55 14.56 5.57 13 5.19V4.5C13 3.67 12.33 3 11.5 3C10.67 3 10 3.67 10 4.5V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.85 17.1 9 16.51 8.67 15.67C8.52 15.28 8.18 15 7.77 15H7.49C6.82 15 6.35 15.68 6.6 16.3C7.17 17.69 8.5 18.51 10 18.83V19.5C10 20.33 10.67 21 11.5 21C12.33 21 13 20.33 13 19.5V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" fill="#9CA3AF" />
                    </svg>
                    <span>No financial transactions match the selected filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr key={row.id} className="fin-table-data-row">
                  <td>{(page - 1) * pageSize + i + 1}</td>
                  <td className="fin-monospace-cell">{row.regNo}</td>
                  <td>{row.farmerName}</td>
                  <td>{row.category || '—'}</td>
                  <td>{row.transactionDate}</td>
                  <td><TransactionBadge type={row.transactionType} /></td>
                  {/* <td>{row.description}</td> */}
                  <td className={row.transactionType === 'Income' ? 'fin-income-amount' : 'fin-expense-amount'}>
                    {row.transactionType === 'Income' ? '+' : '-'}{Number(row.amount).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="fin-pagination-bar">
        <button className="fin-pagination-btn" disabled={page === 1 || loading}          onClick={() => setPage(1)}>&#171;</button>
        <button className="fin-pagination-btn" disabled={page === 1 || loading}          onClick={() => setPage(p => p - 1)}>&#8249;</button>
        <span className="fin-pagination-info">Page {page} of {totalPages}</span>
        <button className="fin-pagination-btn" disabled={page === totalPages || loading} onClick={() => setPage(p => p + 1)}>&#8250;</button>
        <button className="fin-pagination-btn" disabled={page === totalPages || loading} onClick={() => setPage(totalPages)}>&#187;</button>
      </div>
    </div>
  );
};

// ─── Page Shell ───────────────────────────────────────────────────────────────

const FinancialsReport = () => {
  const [activeView, setActiveView] = useState('summary');

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content fin-report-page">

          <div className="report-page-header">
            <div className="report-page-title-group">
              <h1 className="report-page-title">Financials Report</h1>
              <p className="report-page-subtitle">
                Overview of payments, revenue, expenses, and financial summaries by county
              </p>
            </div>

            <div className="report-type-dropdown-wrap">
              <label className="report-type-dropdown-label">Report Type</label>
              <div className="report-type-select-wrap">
                <svg className="report-type-select-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C12.92 6.9 13.63 7.44 13.89 8.3C14.01 8.7 14.34 9 14.76 9H15.06C15.72 9 16.19 8.35 15.96 7.73C15.54 6.55 14.56 5.57 13 5.19V4.5C13 3.67 12.33 3 11.5 3C10.67 3 10 3.67 10 4.5V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.85 17.1 9 16.51 8.67 15.67C8.52 15.28 8.18 15 7.77 15H7.49C6.82 15 6.35 15.68 6.6 16.3C7.17 17.69 8.5 18.51 10 18.83V19.5C10 20.33 10.67 21 11.5 21C12.33 21 13 20.33 13 19.5V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" fill="currentColor" />
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

export default FinancialsReport;
