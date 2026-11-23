import React, { useEffect, useState } from 'react';
import { apiFetch } from "../utils/apiFetch";

const STATUS_CONFIG = {
  paid: { label: 'Paid', color: '#16a34a', bg: '#dcfce7' },
  pending: { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  failed: { label: 'Failed', color: '#dc2626', bg: '#fee2e2' },
  processing: { label: 'Processing', color: '#2563eb', bg: '#dbeafe' },
};

const FILTER_TABS = ['All', 'Income', 'Expense', 'Pending', 'Paid'];

const PAGE_SIZE = 10;

const CATEGORY_COLORS = {
  'Crop Sales': '#4CAF50',
  'Livestock': '#FF9800',
  'Equipment': '#2196F3',
  'Seeds': '#8BC34A',
  'Fertilizer': '#009688',
  'Labour': '#9C27B0',
  'Transport': '#795548',
  'Subsidy': '#607D8B',
  'AgriPay': '#4CAF50',
};

/* ── Icon components ──────────────────────────────────────────── */
const IncomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22ZM11 12V16H13V12H16L12 8L8 12H11Z" />
  </svg>
);

const ExpenseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 12V8H11V12H8L12 16L16 12H13Z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" />
  </svg>
);

const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" />
  </svg>
);

const ReceiptIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5a1 1 0 0 0-1 1v17l3-1.5 3 1.5 3-1.5 3 1.5 3-1.5V4a1 1 0 0 0-1-1ZM8 7h8v2H8V7Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const getEvidenceUrl = (transaction, apiBase) => {
  const raw = transaction.receipt_url || transaction.evidence_url || transaction.attachment_url
    || transaction.receipt || transaction.evidence || transaction.image || transaction.photo;
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : `${apiBase}${raw}`;
};

const getReceiptName = (transaction) => {
  return transaction.receipt_name || transaction.evidence_name || transaction.file_name || transaction.filename || null;
};

/* ── Skeleton row ─────────────────────────────────────────────── */
const SkeletonRow = () => (
  <tr className="rtx-row">
    {[48, 72, 100, 90, 72, 64, 70, 40].map((w, i) => (
      <td key={i} className="rtx-cell">
        <div className="rtx-skeleton" style={{ width: w }} />
      </td>
    ))}
  </tr>
);

/* ── Empty state ─────────────────────────────────────────────── */
const EmptyState = ({ filter }) => (
  <tr>
    <td colSpan={8} className="rtx-empty-cell">
      <div className="rtx-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#d1d5db">
          <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
        </svg>
        <div className="rtx-empty-title">No transactions found</div>
        <div className="rtx-empty-sub">
          {filter !== 'All'
            ? `No ${filter.toLowerCase()} transactions match your search.`
            : 'Your transactions will appear here once recorded.'}
        </div>
      </div>
    </td>
  </tr>
);

/* ── Transaction detail modal ────────────────────────────────── */
const TransactionDetailModal = ({ transaction, apiBase, onClose }) => {
  if (!transaction) return null;

  const isExpense = transaction.type === 'expense';
  const status = transaction.status || 'paid';
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.paid;
  const evidenceUrl = getEvidenceUrl(transaction, apiBase);
  const receiptName = getReceiptName(transaction);
  const catColor = CATEGORY_COLORS[transaction.category] || '#6B7280';

  return (
    <div className="rtx-modal-overlay" onClick={onClose}>
      <div className="rtx-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rtx-modal-header">
          <div className="rtx-modal-header-left">
            <span className={`rtx-modal-header-icon ${isExpense ? 'rtx-type-expense' : 'rtx-type-income'}`}>
              {isExpense ? <ExpenseIcon /> : <IncomeIcon />}
            </span>
            <div>
              <h3 className="rtx-modal-title">Transaction Details</h3>
              <span className="rtx-modal-subtitle">
                {isExpense ? `${transaction.category} payment` : `${transaction.category} receipt`}
              </span>
            </div>
          </div>
          <button className="rtx-modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="rtx-modal-body">
          <div className="rtx-modal-evidence-section">
            <span className="rtx-modal-section-label">Receipt / Evidence</span>

            <div className="rtx-modal-receipt-name">
              <ReceiptIcon />
              <span>{receiptName || 'No receipt name'}</span>
            </div>

            {evidenceUrl ? (
              <div className="rtx-modal-evidence">
                <img src={evidenceUrl} alt="Transaction evidence" className="rtx-modal-evidence-img" />
              </div>
            ) : (
              <div className="rtx-modal-evidence rtx-modal-evidence-empty">
                <ReceiptIcon />
                <span className="rtx-modal-evidence-empty-title">No receipt or photo attached</span>
                <span className="rtx-modal-evidence-empty-sub">Evidence for this transaction hasn't been uploaded yet.</span>
              </div>
            )}
          </div>

          <div className="rtx-modal-summary-row">
            <span className={`rtx-amount rtx-modal-amount ${isExpense ? 'rtx-amount-neg' : 'rtx-amount-pos'}`}>
              {isExpense ? '−' : '+'} {transaction.amount}
            </span>
            <span className="rtx-status-badge" style={{ color: statusCfg.color, background: statusCfg.bg }}>
              <span className="rtx-status-dot" style={{ background: statusCfg.color }} />
              {statusCfg.label}
            </span>
          </div>

          <div className="rtx-modal-detail-grid">
            <div className="rtx-modal-detail-card">
              <span className="rtx-modal-detail-label">Date</span>
              <span className="rtx-modal-detail-value">{transaction.datetime || '—'}</span>
            </div>
            <div className="rtx-modal-detail-card">
              <span className="rtx-modal-detail-label">Category</span>
              <span
                className="rtx-cat-badge rtx-modal-cat-badge"
                style={{ color: catColor, background: catColor + '18', borderColor: catColor + '30' }}
              >
                {transaction.category || '—'}
              </span>
            </div>
            <div className="rtx-modal-detail-card rtx-modal-detail-card--wide">
              <span className="rtx-modal-detail-label">Farmer / Source</span>
              <span className="rtx-modal-detail-value">{transaction.person || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const RecentTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const API_BASE = import.meta.env.VITE_API_URL;

  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const offset = (currentPage - 1) * PAGE_SIZE;
        const res = await apiFetch(
          `${API_BASE}/api/financials/recent?limit=${PAGE_SIZE}&offset=${offset}`
        );
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error('Failed to fetch transactions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [currentPage]);

  /* Reset to page 1 when filter or search changes */
  const handleFilterChange = (tab) => {
    setActiveFilter(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  /* ── DERIVED / FILTERED DATA ─────────────────────────────── */
  const filteredTransactions = transactions.filter((tx) => {
    const matchesFilter = (() => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Income') return tx.type !== 'expense';
      if (activeFilter === 'Expense') return tx.type === 'expense';
      if (activeFilter === 'Pending') return tx.status === 'pending';
      if (activeFilter === 'Paid') return tx.status === 'paid';
      return true;
    })();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || [tx.category, tx.person, tx.amount, tx.datetime]
      .some((v) => (v || '').toString().toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  /* ── RENDER ──────────────────────────────────────────────── */
  return (
    <div className="rtx-card">

      {/* ── Card Header ─────────────────────────────────── */}
      <div className="rtx-header">
        <div className="rtx-header-left">
          <h3 className="rtx-title">Recent Transactions</h3>
          <span className="rtx-count">{total} total transactions</span>
        </div>

        <div className="rtx-filter-tabs">
          {FILTER_TABS.map((tab) => {
            const counts = {
              All: transactions.length,
              Income: transactions.filter((t) => t.type !== 'expense').length,
              Expense: transactions.filter((t) => t.type === 'expense').length,
              Pending: transactions.filter((t) => t.status === 'pending').length,
              Paid: transactions.filter((t) => t.status === 'paid').length,
            };
            return (
              <button
                key={tab}
                className={`rtx-tab ${activeFilter === tab ? 'rtx-tab--active' : ''}`}
                onClick={() => handleFilterChange(tab)}
              >
                {tab}
                {counts[tab] > 0 && (
                  <span className={`rtx-tab-count ${activeFilter === tab ? 'rtx-tab-count--active' : ''}`}>
                    {counts[tab]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="rtx-toolbar">
        <div className="rtx-search-wrap">
          <span className="rtx-search-icon"><SearchIcon /></span>
          <input
            className="rtx-search-input"
            placeholder="Search by category, farmer, amount…"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button className="rtx-search-clear" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}>✕</button>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="rtx-table-wrap">
        <table className="rtx-table">
          <thead>
            <tr className="rtx-thead-row">
              <th className="rtx-th rtx-th-type">Type</th>
              <th className="rtx-th rtx-th-date">Date</th>
              <th className="rtx-th rtx-th-desc">Description</th>
              <th className="rtx-th rtx-th-farmer">Farmer / Source</th>
              <th className="rtx-th rtx-th-cat">Category</th>
              <th className="rtx-th rtx-th-amount">Amount</th>
              <th className="rtx-th rtx-th-status">Status</th>
              <th className="rtx-th rtx-th-action">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filteredTransactions.length === 0 ? (
              <EmptyState filter={activeFilter} />
            ) : (
              filteredTransactions.map((transaction) => {
                const isExpense = transaction.type === 'expense';
                const status = transaction.status || 'paid';
                const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.paid;
                const catColor = CATEGORY_COLORS[transaction.category] || '#6B7280';

                return (
                  <tr key={transaction.id} className="rtx-row">
                    {/* Type */}
                    <td className="rtx-cell rtx-cell-type">
                      <div className={`rtx-type-wrap ${isExpense ? 'rtx-type-expense' : 'rtx-type-income'}`}>
                        <span className="rtx-type-icon">
                          {isExpense ? <ExpenseIcon /> : <IncomeIcon />}
                        </span>
                        <span className="rtx-type-label">{isExpense ? 'Expense' : 'Income'}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="rtx-cell rtx-cell-date">
                      <span className="rtx-date">{transaction.datetime || '—'}</span>
                    </td>

                    {/* Description */}
                    <td className="rtx-cell rtx-cell-desc">
                      <span className="rtx-desc">
                        {isExpense
                          ? `${transaction.category} payment`
                          : `${transaction.category} receipt`}
                      </span>
                    </td>

                    {/* Farmer / Source */}
                    <td className="rtx-cell rtx-cell-farmer">
                      <div className="rtx-farmer-wrap">
                        <span className="rtx-farmer-name">{transaction.person || '—'}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="rtx-cell rtx-cell-cat">
                      <span
                        className="rtx-cat-badge"
                        style={{ color: catColor, background: catColor + '18', borderColor: catColor + '30' }}
                      >
                        {transaction.category || '—'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="rtx-cell rtx-cell-amount">
                      <span className={`rtx-amount ${isExpense ? 'rtx-amount-neg' : 'rtx-amount-pos'}`}>
                        {isExpense ? '−' : '+'} {transaction.amount}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="rtx-cell rtx-cell-status">
                      <span
                        className="rtx-status-badge"
                        style={{ color: statusCfg.color, background: statusCfg.bg }}
                      >
                        <span
                          className="rtx-status-dot"
                          style={{ background: statusCfg.color }}
                        />
                        {statusCfg.label}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="rtx-cell rtx-cell-action">
                      <button
                        className="rtx-view-btn"
                        title={
                          getEvidenceUrl(transaction, API_BASE)
                            ? 'View transaction receipt'
                            : 'View transaction details'
                        }
                        onClick={() => setSelectedTransaction(transaction)}
                      >
                        <ViewIcon />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer / Pagination ──────────────────────────── */}
      <div className="rtx-footer">
        <span className="rtx-footer-info">
          Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, total)}–{Math.min(currentPage * PAGE_SIZE, total)} of {total} transactions
        </span>

        {totalPages > 1 && (
          <div className="rtx-pagination">
            <button
              className="rtx-page-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ‹ Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="rtx-page-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`rtx-page-btn ${currentPage === p ? 'rtx-page-btn--active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              className="rtx-page-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next ›
            </button>
          </div>
        )}
      </div>

      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          apiBase={API_BASE}
          onClose={() => setSelectedTransaction(null)}
        />
      )}

    </div>
  );
};

export default RecentTransactions;
