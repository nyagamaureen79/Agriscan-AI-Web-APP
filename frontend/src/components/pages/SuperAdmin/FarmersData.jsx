import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import SuperAdminLayout from '../../SuperAdmin/SuperAdminLayout';
import { FiSearch, FiDownload, FiUsers, FiActivity, FiMapPin, FiEye } from 'react-icons/fi';
import '../../../styles/SuperAdmin.css';
import '../../../styles/SuperAdminFarmersData.css';

const API_URL = import.meta.env.VITE_API_URL;

const SuperAdminFarmersData = () => {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, tenants: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [tenantOptions, setTenantOptions] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedFarmer, setSelectedFarmer] = useState(null);

  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/farmers/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = response.data?.farmers || response.data || [];
        setFarmers(Array.isArray(data) ? data : []);

        // Derive stats
        const active = data.filter(f => f.status?.toLowerCase() === 'active').length;
        const inactive = data.filter(f => f.status?.toLowerCase() === 'inactive').length;
        const uniqueTenants = new Set(data.map(f => f.tenant_id || f.tenant_name)).size;
        setStats({ total: data.length, active, inactive, tenants: uniqueTenants });

        // Build tenant filter options
        const tenantSet = new Set();
        data.forEach(f => { if (f.tenant_name) tenantSet.add(f.tenant_name); });
        setTenantOptions(['all', ...response.data.tenants.map(t => t.name)]);
      } catch (err) {
        console.error('Failed to fetch superadmin farmers:', err);
        setFarmers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFarmers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, tenantFilter]);

  const filteredFarmers = useMemo(() => {
    return farmers.filter(farmer => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (farmer.name || '').toLowerCase().includes(term) ||
        (farmer.username || '').toLowerCase().includes(term) ||
        (farmer.location || '').toLowerCase().includes(term) ||
        (farmer.tenant_name || '').toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' || (farmer.status || '').toLowerCase() === statusFilter;

      const matchesTenant =
        tenantFilter === 'all' || farmer.tenant_name === tenantFilter;

      return matchesSearch && matchesStatus && matchesTenant;
    });
  }, [farmers, searchTerm, statusFilter, tenantFilter]);

  const totalPages = Math.ceil(filteredFarmers.length / itemsPerPage);
  const paginatedFarmers = filteredFarmers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const maskPhone = (phone) => {
    if (!phone) return '—';
    const str = String(phone);
    if (str.length <= 4) return str;
    return str.slice(0, 4) + 'xxx' + str.slice(7);
  };

  const TENANT_COLORS = [
    { bg: '#DCFCE7', color: '#16A34A' },
    { bg: '#DBEAFE', color: '#2563EB' },
    { bg: '#FEF3C7', color: '#D97706' },
    { bg: '#FCE7F3', color: '#DB2777' },
    { bg: '#EDE9FE', color: '#7C3AED' },
    { bg: '#CCFBF1', color: '#0D9488' },
    { bg: '#FFE4E6', color: '#E11D48' },
    { bg: '#E0E7FF', color: '#4F46E5' },
    { bg: '#FFEDD5', color: '#EA580C' },
    { bg: '#F3F4F6', color: '#4B5563' },
  ];

  const getTenantColor = (tenantName) => {
    if (!tenantName) return TENANT_COLORS[TENANT_COLORS.length - 1];
    let hash = 0;
    for (let i = 0; i < tenantName.length; i++) {
      hash = tenantName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return TENANT_COLORS[Math.abs(hash) % TENANT_COLORS.length];
  };

  const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active': return 'sa-farmer-status sa-farmer-status--active';
      case 'inactive': return 'sa-farmer-status sa-farmer-status--inactive';
      default: return 'sa-farmer-status sa-farmer-status--default';
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Username', 'Phone', 'Location', 'Status', 'Tenant'];
    const rows = filteredFarmers.map(f => [
      f.name || '',
      f.username || '',
      f.phone || '',
      f.location || '',
      f.status || '',
      f.tenant_name || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'superadmin-farmers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SuperAdminLayout activePage="farmers">
      <div className="sa-farmers-page">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-content">
            <h1 className="page-title">Farmers Data</h1>
            <p className="page-subtitle">View all farmers registered across all tenants</p>
          </div>
          <div className="page-header-actions">
            <button className="btnss btnss-secondary" onClick={handleExportCSV}>
              <FiDownload className="btnss-icon" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="sa-farmers-stats">
          <div className="sa-stat-card">
            <div className="sa-stat-icon sa-stat-icon--green">
              <FiUsers size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : stats.total}</div>
              <div className="sa-stat-label">Total Farmers</div>
            </div>
          </div>
          <div className="sa-stat-card">
            <div className="sa-stat-icon sa-stat-icon--teal">
              <FiActivity size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : stats.active}</div>
              <div className="sa-stat-label">Active Farmers</div>
            </div>
          </div>
          <div className="sa-stat-card">
            <div className="sa-stat-icon sa-stat-icon--gray">
              <FiActivity size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : stats.inactive}</div>
              <div className="sa-stat-label">Inactive Farmers</div>
            </div>
          </div>
          <div className="sa-stat-card">
            <div className="sa-stat-icon sa-stat-icon--blue">
              <FiMapPin size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : stats.tenants}</div>
              <div className="sa-stat-label">Tenants with Farmers</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="sa-farmers-filters">
          <div className="sa-search-box">
            <FiSearch className="sa-search-icon" />
            <input
              type="text"
              placeholder="Search by name, username, location, or tenant..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="sa-search-input"
            />
          </div>

          <div className="sa-filter-group">
            <label className="sa-filter-label">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="sa-filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="sa-filter-group">
            <label className="sa-filter-label">Tenant</label>
            <select
              value={tenantFilter}
              onChange={e => setTenantFilter(e.target.value)}
              className="sa-filter-select"
            >
              {tenantOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All Tenants' : opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="sa-results-info">
          Showing <strong>{filteredFarmers.length}</strong> of <strong>{farmers.length}</strong> farmers
        </div>

        {/* Table */}
        <div className="sa-farmers-table-wrapper">
          <table className="sa-farmers-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Username</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Status</th>
                <th>Tenant</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="sa-skeleton-row">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j}><div className="sa-skeleton-cell" /></td>
                    ))}
                  </tr>
                ))
              ) : paginatedFarmers.length > 0 ? (
                paginatedFarmers.map((farmer, idx) => (
                  <tr key={farmer.id || idx} className="sa-table-row">
                    <td className="sa-cell-index">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="sa-cell-name">
                      <div className="sa-farmer-avatar">
                        {(farmer.name || 'F').charAt(0).toUpperCase()}
                      </div>
                      <span>{farmer.name || '—'}</span>
                    </td>
                    <td>{farmer.username || '—'}</td>
                    <td>{maskPhone(farmer.phone)}</td>
                    <td>{farmer.location || '—'}</td>
                    <td>
                      <span className={getStatusClass(farmer.status)}>
                        {farmer.status || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="sa-tenant-chip"
                        style={{
                          background: getTenantColor(farmer.tenant_name).bg,
                          color: getTenantColor(farmer.tenant_name).color,
                        }}
                      >
                        {farmer.tenant_name || '—'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="sa-view-btn"
                        onClick={() => setSelectedFarmer(farmer)}
                        title="View farmer details"
                      >
                        <FiEye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="sa-empty-state">
                    <div className="sa-empty-icon">
                      <FiUsers size={48} />
                    </div>
                    <p className="sa-empty-title">No farmers found</p>
                    <p className="sa-empty-subtitle">
                      {farmers.length === 0
                        ? 'No farmers have been registered across any tenant yet.'
                        : 'Try adjusting your search or filter criteria.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="sa-pagination">
            <button
              className="sa-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Previous
            </button>
            <div className="sa-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === '...' ? (
                    <span key={`ellipsis-${i}`} className="sa-page-ellipsis">…</span>
                  ) : (
                    <button
                      key={item}
                      className={`sa-page-num ${currentPage === item ? 'sa-page-num--active' : ''}`}
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </button>
                  )
                )}
            </div>
            <button
              className="sa-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Farmer Detail Drawer */}
      {selectedFarmer && (
        <div className="sa-farmer-drawer-overlay" onClick={() => setSelectedFarmer(null)}>
          <div className="sa-farmer-drawer" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-header">
              <h3 className="sa-drawer-title">Farmer Details</h3>
              <button className="sa-drawer-close" onClick={() => setSelectedFarmer(null)}>✕</button>
            </div>
            <div className="sa-drawer-avatar-row">
              <div className="sa-drawer-avatar">
                {(selectedFarmer.name || 'F').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="sa-drawer-name">{selectedFarmer.name}</div>
                <span className={getStatusClass(selectedFarmer.status)}>
                  {selectedFarmer.status || 'Unknown'}
                </span>
              </div>
            </div>
            <div className="sa-drawer-fields">
              {[
                { label: 'Username', value: selectedFarmer.username },
                { label: 'Phone', value: maskPhone(selectedFarmer.phone) },
                { label: 'Location', value: selectedFarmer.location },
                { label: 'Tenant', value: selectedFarmer.tenant_name },
                { label: 'Crops', value: Array.isArray(selectedFarmer.crops) ? selectedFarmer.crops.join(', ') : selectedFarmer.crops },
                { label: 'Farm Size', value: selectedFarmer.farm_size },
                { label: 'Date Registered', value: formatDate(selectedFarmer.date_registered ?? selectedFarmer.created_at ?? selectedFarmer.registered_at) },
                { label: 'Last Active', value: formatDate(selectedFarmer.last_active ?? selectedFarmer.last_login ?? selectedFarmer.last_seen) },
              ].map(({ label, value }) => (
                <div key={label} className="sa-drawer-field">
                  <span className="sa-drawer-field-label">{label}</span>
                  <span className="sa-drawer-field-value">{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
};

export default SuperAdminFarmersData;
