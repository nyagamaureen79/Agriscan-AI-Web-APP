import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from "../../utils/apiFetch";
import Sidebar from '../Sidebar';
import Header from '../Header';
import './FarmerApprovals.css';

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];
const ITEMS_PER_PAGE = 8;

const AVATAR_COLORS = [
  '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#00BCD4',
  '#FF9800', '#795548', '#607D8B', '#E91E63', '#3F51B5',
];

const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const FarmerApprovals = () => {
  const [farmers, setFarmers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [notification, setNotification] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkConfirmModal, setBulkConfirmModal] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchPendingFarmers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/farmers/pending`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const mappedFarmers = data.farmers.map(f => ({
        ...f,
        displayStatus: f.is_approved === true ? 'Approved'
          : f.is_approved === false ? 'Rejected'
          : 'Pending',
      }));
      setFarmers(mappedFarmers);
    } catch (err) {
      console.error('Failed to fetch farmers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPendingFarmers(); }, []);

  const handleApproveReject = async (action, farmer, previousFarmers) => {
    setProcessingIds(prev => new Set(prev).add(farmer.id));
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/farmers/approve/${farmer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const data = await res.json();
      const updatedFarmer = {
        ...data.farmer,
        displayStatus: data.farmer.is_approved === true ? 'Approved'
          : data.farmer.is_approved === false ? 'Rejected'
          : 'Pending',
      };
      setFarmers(prev => prev.map(f => f.id === updatedFarmer.id ? updatedFarmer : f));
      showNotification(
        `${farmer.name} has been ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      setFarmers(previousFarmers);
      showNotification('Failed to update farmer status. Please try again.', 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(farmer.id);
        return next;
      });
    }
  };

  const handleBulkAction = async (action) => {
    const pendingSelected = farmers.filter(f => selectedIds.has(f.id) && f.displayStatus === 'Pending');
    if (pendingSelected.length === 0) return;
    setBulkProcessing(true);
    const previousFarmers = farmers;
    const optimisticStatus = action === 'approve' ? 'Approved' : 'Rejected';
    setFarmers(prev => prev.map(f =>
      selectedIds.has(f.id) && f.displayStatus === 'Pending'
        ? { ...f, displayStatus: optimisticStatus, is_approved: action === 'approve' }
        : f
    ));
    setSelectedIds(new Set());
    setBulkConfirmModal(null);
    try {
      await Promise.all(pendingSelected.map(farmer =>
        apiFetch(`${import.meta.env.VITE_API_URL}/farmers/approve/${farmer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
      ));
      showNotification(
        `${pendingSelected.length} farmer${pendingSelected.length > 1 ? 's' : ''} ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      setFarmers(previousFarmers);
      showNotification('Failed to update farmer statuses. Please try again.', 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  const stats = useMemo(() => ({
    pending:  farmers.filter(f => f.displayStatus === 'Pending').length,
    approved: farmers.filter(f => f.displayStatus === 'Approved').length,
    rejected: farmers.filter(f => f.displayStatus === 'Rejected').length,
    total:    farmers.length,
  }), [farmers]);

  const filtered = useMemo(() => {
    return farmers.filter(farmer => {
      const matchesSearch =
        farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === 'All' || farmer.displayStatus === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [farmers, searchTerm, selectedStatus]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedFarmers = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const pendingOnPage = paginatedFarmers.filter(f => f.displayStatus === 'Pending');
  const allCurrentPendingSelected = pendingOnPage.length > 0 && pendingOnPage.every(f => selectedIds.has(f.id));

  const toggleSelectAll = () => {
    if (allCurrentPendingSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pendingOnPage.forEach(f => next.delete(f.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pendingOnPage.forEach(f => next.add(f.id));
        return next;
      });
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleApprove = (farmer) => setConfirmModal({ action: 'approve', farmer });
  const handleReject  = (farmer) => setConfirmModal({ action: 'reject',  farmer });

  const confirmAction = () => {
    if (!confirmModal) return;
    const { action, farmer } = confirmModal;
    const previousFarmers = farmers;
    const optimisticStatus = action === 'approve' ? 'Approved' : 'Rejected';
    setFarmers(prev => prev.map(f =>
      f.id === farmer.id
        ? { ...f, displayStatus: optimisticStatus, is_approved: action === 'approve' }
        : f
    ));
    setConfirmModal(null);
    handleApproveReject(action, farmer, previousFarmers);
  };

  const maskPhone = (phone) => {
    if (!phone) return '';
    const str = String(phone);
    const local = str.startsWith('+254') ? '0' + str.slice(4) : str;
    if (local.length <= 4) return local;
    return local.slice(0, 4) + 'xxx' + local.slice(7);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0].split(' ')[0];
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Approved': return 'approval-badge approval-badge--approved';
      case 'Rejected': return 'approval-badge approval-badge--rejected';
      default:         return 'approval-badge approval-badge--pending';
    }
  };

  const selectedPendingCount = farmers.filter(f => selectedIds.has(f.id) && f.displayStatus === 'Pending').length;

  const statCards = [
    {
      label: 'Total Registered',
      value: stats.total,
      mod: 'stat-card--total',
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V18H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V18H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/>
        </svg>
      ),
    },
    {
      label: 'Pending Review',
      value: stats.pending,
      mod: 'stat-card--pending',
      iconBg: '#FFFBEB',
      iconColor: '#D97706',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="currentColor"/>
        </svg>
      ),
    },
    {
      label: 'Approved',
      value: stats.approved,
      mod: 'stat-card--approved',
      iconBg: '#F0FDF4',
      iconColor: '#16A34A',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/>
        </svg>
      ),
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      mod: 'stat-card--rejected',
      iconBg: '#FEF2F2',
      iconColor: '#DC2626',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.47 2 2 6.47 2 12C2 17.53 6.47 22 12 22C17.53 22 22 17.53 22 12C22 6.47 17.53 2 12 2ZM17 15.59L15.59 17L12 13.41L8.41 17L7 15.59L10.59 12L7 8.41L8.41 7L12 10.59L15.59 7L17 8.41L13.41 12L17 15.59Z" fill="currentColor"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content">

          {/* Notification Toast */}
          {notification && (
            <div className={`approvals-notification approvals-notification--${notification.type}`}>
              <div className="approvals-notification-icon">
                {notification.type === 'success' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                  </svg>
                )}
              </div>
              <span className="approvals-notification-text">{notification.message}</span>
              <button className="approvals-notification-close" onClick={() => setNotification(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          )}

          {/* Page Header */}
          <div className="approvals-page-header">
            <div className="approvals-header-text">
              <h1 className="approvals-title">Farmer Approvals</h1>
              <p className="approvals-subtitle">Review and approve newly registered farmers</p>
            </div>
            {!loading && stats.pending > 0 && (
              <div className="approvals-pending-pill">
                <span className="approvals-pending-dot" />
                {stats.pending} awaiting review
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="approvals-stats-grid">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="approvals-stat-card approvals-stat-skeleton">
                  <div className="skeleton-icon-block skeleton-shimmer" />
                  <div className="approvals-stat-info">
                    <div className="skeleton-line skeleton-line--value skeleton-shimmer" />
                    <div className="skeleton-line skeleton-line--label skeleton-shimmer" />
                  </div>
                </div>
              ))
            ) : (
              statCards.map(card => (
                <div key={card.label} className={`approvals-stat-card ${card.mod}`}>
                  <div className="approvals-stat-icon" style={{ background: card.iconBg, color: card.iconColor }}>
                    {card.icon}
                  </div>
                  <div className="approvals-stat-info">
                    <span className="approvals-stat-value">{card.value}</span>
                    <span className="approvals-stat-label">{card.label}</span>
                  </div>
                  {stats.total > 0 && (
                    <div className="approvals-stat-bar-track">
                      <div
                        className="approvals-stat-bar-fill"
                        style={{
                          width: `${(card.value / stats.total) * 100}%`,
                          background: card.iconColor,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Filters + Status Tabs row */}
          <div className="approvals-controls-row">
            <div className="approvals-search-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="approvals-search-icon">
                <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="#9CA3AF"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name, location or email..."
                className="approvals-search-input"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <div className="approvals-status-tabs">
              {STATUS_FILTERS.map(s => {
                const count = s === 'All' ? farmers.length : stats[s.toLowerCase()];
                return (
                  <button
                    key={s}
                    className={`approvals-status-tab ${selectedStatus === s ? 'approvals-status-tab--active' : ''}`}
                    onClick={() => handleStatusFilter(s)}
                  >
                    {s}
                    <span className="approvals-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results count */}
          {!loading && (
            <div className="approvals-results-count">
              Showing <strong>{filtered.length}</strong> of <strong>{farmers.length}</strong> farmers
            </div>
          )}

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="approvals-bulk-bar">
              <div className="approvals-bulk-left">
                <div className="approvals-bulk-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                  </svg>
                </div>
                <span className="approvals-bulk-count">
                  {selectedIds.size} farmer{selectedIds.size > 1 ? 's' : ''} selected
                  {selectedPendingCount !== selectedIds.size && ` · ${selectedPendingCount} pending`}
                </span>
              </div>
              <div className="approvals-bulk-actions">
                <button
                  className="bulk-approve-btn"
                  onClick={() => setBulkConfirmModal({ action: 'approve' })}
                  disabled={bulkProcessing || selectedPendingCount === 0}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                  </svg>
                  Approve
                </button>
                <button
                  className="bulk-reject-btn"
                  onClick={() => setBulkConfirmModal({ action: 'reject' })}
                  disabled={bulkProcessing || selectedPendingCount === 0}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                  </svg>
                  Reject
                </button>
                <button className="bulk-clear-btn" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="approvals-table-wrap">
            {loading ? (
              <div className="approvals-skeleton-wrap">
                <div className="approvals-table-header">
                  <div className="approvals-col approvals-col--checkbox" />
                  <div className="approvals-col approvals-col--name">Name</div>
                  <div className="approvals-col approvals-col--phone">Phone</div>
                  <div className="approvals-col approvals-col--location">Location</div>
                  <div className="approvals-col approvals-col--crops">Crops</div>
                  <div className="approvals-col approvals-col--farm-size">Farm Size (ha)</div>
                  <div className="approvals-col approvals-col--date">Registered</div>
                  <div className="approvals-col approvals-col--status">Status</div>
                  <div className="approvals-col approvals-col--actions">Actions</div>
                </div>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="approvals-skeleton-row">
                    <div className="skeleton-cell"><div className="skeleton-checkbox skeleton-shimmer" /></div>
                    <div className="skeleton-cell skeleton-cell--name">
                      <div className="skeleton-avatar skeleton-shimmer" />
                      <div className="skeleton-line skeleton-line--name skeleton-shimmer" />
                    </div>
                    <div className="skeleton-cell"><div className="skeleton-line skeleton-shimmer" /></div>
                    <div className="skeleton-cell"><div className="skeleton-line skeleton-shimmer" /></div>
                    <div className="skeleton-cell"><div className="skeleton-line skeleton-line--short skeleton-shimmer" /></div>
                    <div className="skeleton-cell"><div className="skeleton-line skeleton-line--short skeleton-shimmer" /></div>
                    <div className="skeleton-cell"><div className="skeleton-line skeleton-line--short skeleton-shimmer" /></div>
                    <div className="skeleton-cell"><div className="skeleton-badge skeleton-shimmer" /></div>
                    <div className="skeleton-cell skeleton-cell--actions">
                      <div className="skeleton-btn skeleton-shimmer" />
                      <div className="skeleton-btn skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="approvals-table-header">
                  <div className="approvals-col approvals-col--checkbox">
                    <input
                      type="checkbox"
                      className="approvals-checkbox"
                      checked={allCurrentPendingSelected}
                      onChange={toggleSelectAll}
                      disabled={pendingOnPage.length === 0}
                      title="Select all pending on this page"
                    />
                  </div>
                  <div className="approvals-col approvals-col--name">Name</div>
                  <div className="approvals-col approvals-col--phone">Phone</div>
                  <div className="approvals-col approvals-col--location">Location</div>
                  <div className="approvals-col approvals-col--crops">Crops</div>
                  <div className="approvals-col approvals-col--farm-size">Farm Size (ha)</div>
                  <div className="approvals-col approvals-col--date">Registered</div>
                  <div className="approvals-col approvals-col--status">Status</div>
                  <div className="approvals-col approvals-col--actions">Actions</div>
                </div>

                <div className="approvals-table-body">
                  {paginatedFarmers.length > 0 ? (
                    paginatedFarmers.map(farmer => (
                      <div
                        key={farmer.id}
                        className={`approvals-table-row ${processingIds.has(farmer.id) ? 'approvals-table-row--processing' : ''} ${selectedIds.has(farmer.id) ? 'approvals-table-row--selected' : ''}`}
                      >
                        <div className="approvals-cell approvals-cell--checkbox">
                          {farmer.displayStatus === 'Pending' && (
                            <input
                              type="checkbox"
                              className="approvals-checkbox"
                              checked={selectedIds.has(farmer.id)}
                              onChange={() => toggleSelectOne(farmer.id)}
                            />
                          )}
                        </div>
                        <div className="approvals-cell approvals-cell--name">
                          <div className="farmer-name-block">
                            <div
                              className="farmer-avatar"
                              style={{ background: getAvatarColor(farmer.name) }}
                            >
                              {farmer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="farmer-name-info">
                              <p className="farmer-full-name">{farmer.name}</p>
                              {farmer.email && <p className="farmer-email">{farmer.email}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="approvals-cell approvals-cell--phone">{maskPhone(farmer.phone)}</div>
                        <div className="approvals-cell approvals-cell--location">{farmer.location}</div>
                        <div className="approvals-cell approvals-cell--crops">
                          <div className="crop-tags">
                            {farmer.crops.map(c => (
                              <span key={c} className="crop-tag">{c}</span>
                            ))}
                          </div>
                        </div>
                        <div className="approvals-cell approvals-cell--farm-size">{farmer.farmSize}</div>
                        <div className="approvals-cell approvals-cell--date">{formatDate(farmer.joinedDate)}</div>
                        <div className="approvals-cell approvals-cell--status">
                          <span className={getStatusClass(farmer.displayStatus)}>
                            <span className="badge-dot" />
                            {farmer.displayStatus}
                          </span>
                        </div>
                        <div className="approvals-cell approvals-cell--actions">
                          {processingIds.has(farmer.id) ? (
                            <div className="approval-action-spinner">
                              <div className="row-spinner" />
                            </div>
                          ) : farmer.displayStatus === 'Pending' ? (
                            <div className="approval-action-btns">
                              <button className="approve-btn" onClick={() => handleApprove(farmer)} title="Approve farmer">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                                </svg>
                                Approve
                              </button>
                              <button className="reject-btn" onClick={() => handleReject(farmer)} title="Reject farmer">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                                </svg>
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="approval-action-done">—</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="approvals-empty-state">
                      <div className="approvals-empty-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                          <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                        </svg>
                      </div>
                      <p className="approvals-empty-title">No farmers found</p>
                      <p className="approvals-empty-sub">Try adjusting your search or filter.</p>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="approvals-pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      ← Previous
                    </button>
                    <div className="pagination-numbers">
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                          return (
                            <button
                              key={page}
                              className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="pagination-ellipsis">…</span>;
                        }
                        return null;
                      })}
                    </div>
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Single Confirm Modal */}
      {confirmModal && (
        <div className="approvals-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="approvals-modal" onClick={e => e.stopPropagation()}>
            <div className={`approvals-modal-icon-wrap ${confirmModal.action === 'approve' ? 'approvals-modal-icon-wrap--approve' : 'approvals-modal-icon-wrap--reject'}`}>
              {confirmModal.action === 'approve' ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                </svg>
              )}
            </div>
            <h3 className="approvals-modal-title">
              {confirmModal.action === 'approve' ? 'Approve Farmer' : 'Reject Farmer'}
            </h3>
            <p className="approvals-modal-body">
              Are you sure you want to <strong>{confirmModal.action}</strong> the registration of{' '}
              <strong>{confirmModal.farmer.name}</strong>?
              {confirmModal.action === 'reject' && ' This will prevent the farmer from accessing the platform.'}
            </p>
            <div className="approvals-modal-actions">
              <button className="approvals-modal-cancel" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button
                className={`approvals-modal-confirm ${confirmModal.action === 'approve' ? 'approvals-modal-confirm--approve' : 'approvals-modal-confirm--reject'}`}
                onClick={confirmAction}
              >
                {confirmModal.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Confirm Modal */}
      {bulkConfirmModal && (
        <div className="approvals-modal-overlay" onClick={() => setBulkConfirmModal(null)}>
          <div className="approvals-modal" onClick={e => e.stopPropagation()}>
            <div className={`approvals-modal-icon-wrap ${bulkConfirmModal.action === 'approve' ? 'approvals-modal-icon-wrap--approve' : 'approvals-modal-icon-wrap--reject'}`}>
              {bulkConfirmModal.action === 'approve' ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                </svg>
              )}
            </div>
            <h3 className="approvals-modal-title">
              {bulkConfirmModal.action === 'approve' ? 'Approve Selected Farmers' : 'Reject Selected Farmers'}
            </h3>
            <p className="approvals-modal-body">
              Are you sure you want to <strong>{bulkConfirmModal.action}</strong>{' '}
              <strong>{selectedPendingCount}</strong> selected farmer{selectedPendingCount > 1 ? 's' : ''}?
              {bulkConfirmModal.action === 'reject' && ' They will be prevented from accessing the platform.'}
            </p>
            <div className="approvals-modal-actions">
              <button className="approvals-modal-cancel" onClick={() => setBulkConfirmModal(null)}>Cancel</button>
              <button
                className={`approvals-modal-confirm ${bulkConfirmModal.action === 'approve' ? 'approvals-modal-confirm--approve' : 'approvals-modal-confirm--reject'}`}
                onClick={() => handleBulkAction(bulkConfirmModal.action)}
                disabled={bulkProcessing}
              >
                {bulkProcessing ? 'Processing…' : bulkConfirmModal.action === 'approve' ? 'Yes, Approve All' : 'Yes, Reject All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerApprovals;
