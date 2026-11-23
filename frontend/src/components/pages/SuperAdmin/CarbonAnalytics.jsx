import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import SuperAdminLayout from '../../SuperAdmin/SuperAdminLayout';
import { FiSearch, FiDownload, FiTrendingDown, FiUsers, FiEye } from 'react-icons/fi';
import { FaLeaf } from "react-icons/fa";
import '../../../styles/SuperAdmin.css';
import '../../../styles/SuperAdminCarbonAnalytics.css';

const API_URL = import.meta.env.VITE_API_URL;

const SuperAdminCarbonAnalytics = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCO2e: 0, avgPerFarmer: 0, tenants: 0, totalFarmers: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [tenantOptions, setTenantOptions] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
  const fetchCarbonData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get(`${API_URL}/carbon/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });


      const data = response.data?.records || response.data || [];

     

      const list = Array.isArray(data) ? data : [];


      setRecords(list);

      // stats...
      const totalCO2e = list.reduce((sum, r) => sum + (parseFloat(r.carbon_score) || 0), 0);
      const uniqueTenants = new Set(list.map(r => r.tenant_id || r.tenant_name)).size;
      const avgPerFarmer = list.length > 0 ? totalCO2e / list.length : 0;

      setStats({
        totalCO2e: totalCO2e.toFixed(2),
        avgPerFarmer: avgPerFarmer.toFixed(2),
        tenants: uniqueTenants,
        totalFarmers: list.length,
      });

      const tenantSet = new Set();
      list.forEach(r => { if (r.tenant_name) tenantSet.add(r.tenant_name); });
      setTenantOptions(['all', ...Array.from(tenantSet)]);

    } catch (err) {
      console.error('❌ FETCH ERROR:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  fetchCarbonData();
}, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, tenantFilter]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (record.name || record.farmer_name || '').toLowerCase().includes(term) ||
        (record.region || record.location || '').toLowerCase().includes(term) ||
        (record.tenant_name || '').toLowerCase().includes(term);

      const matchesTenant =
        tenantFilter === 'all' || record.tenant_name === tenantFilter;

      return matchesSearch && matchesTenant;
    });
  }, [records, searchTerm, tenantFilter]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getScoreClass = (score) => {
    const val = parseFloat(score) || 0;
    if (val >= 80) return 'sa-carbon-score sa-carbon-score--high';
    if (val >= 50) return 'sa-carbon-score sa-carbon-score--medium';
    return 'sa-carbon-score sa-carbon-score--low';
  };

  const getScoreBarColor = (score) => {
    const val = parseFloat(score) || 0;
    if (val >= 80) return '#4CAF50';
    if (val >= 50) return '#F59F0A';
    return '#EF4343';
  };

  const formatValue = (val, unit = '') => {
    if (val === null || val === undefined || val === '') return '—';
    const num = parseFloat(val);
    if (isNaN(num)) return '—';
    return `${num.toFixed(2)}${unit ? ` ${unit}` : ''}`;
  };

  const handleExportCSV = () => {
    const headers = ['Farmer Name', 'Carbon Score (kg)', 'Reduction (%)', 'Region', 'Tenant', 'Date'];
    const rows = filteredRecords.map(r => [
      r.name || r.farmer_name || '',
      r.carbon_score || '',
      r.reduction || '',
      r.region || r.location || '',
      r.tenant_name || '',
      r.recorded_at || r.created_at || '',
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'superadmin-carbon-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SuperAdminLayout activePage="carbon-analytics">
      <div className="sa-carbon-page">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-content">
            <h1 className="page-title">Carbon Analytics</h1>
            <p className="page-subtitle">View carbon emission data across all tenants</p>
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
              <FaLeaf size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : `${stats.totalCO2e} kg`}</div>
              <div className="sa-stat-label">Total CO2e</div>
            </div>
          </div>
          <div className="sa-stat-card">
            <div className="sa-stat-icon sa-stat-icon--teal">
              <FiTrendingDown size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : `${stats.avgPerFarmer} kg`}</div>
              <div className="sa-stat-label">Avg. per Farmer</div>
            </div>
          </div>
          <div className="sa-stat-card">
            <div className="sa-stat-icon sa-stat-icon--blue">
              <FiUsers size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : stats.tenants}</div>
              <div className="sa-stat-label">Tenants Tracked</div>
            </div>
          </div>
          <div className="sa-stat-card">
            <div className="sa-stat-icon sa-stat-icon--orange">
              <FaLeaf size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : stats.totalFarmers}</div>
              <div className="sa-stat-label">Total Records</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="sa-farmers-filters">
          <div className="sa-search-box">
            <FiSearch className="sa-search-icon" />
            <input
              type="text"
              placeholder="Search by farmer name, region, or tenant..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="sa-search-input"
            />
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
          Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> records
        </div>

        {/* Table */}
        <div className="sa-farmers-table-wrapper">
          <table className="sa-farmers-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Farmer Name</th>
                <th>Carbon Score</th>
                <th>Score Bar</th>
                <th>Reduction</th>
                <th>Region</th>
                <th>Tenant</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="sa-skeleton-row">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j}><div className="sa-skeleton-cell" /></td>
                    ))}
                  </tr>
                ))
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((record, idx) => (
                  <tr key={record.id || idx} className="sa-table-row">
                    <td className="sa-cell-index">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="sa-cell-name">
                      <div className="sa-carbon-farmer-avatar">
                        {(record.name || record.farmer_name || 'F').charAt(0).toUpperCase()}
                      </div>
                      <span>{record.name || record.farmer_name || '—'}</span>
                    </td>
                    <td>
                      <span className={getScoreClass(record.carbon_score)}>
                        {formatValue(record.carbon_score, 'kg')}
                      </span>
                    </td>
                    <td>
                      <div className="sa-carbon-bar-cell">
                        <div className="sa-carbon-bar-track">
                          <div
                            className="sa-carbon-bar-fill"
                            style={{
                              width: `${Math.min(parseFloat(record.carbon_score) || 0, 100)}%`,
                              backgroundColor: getScoreBarColor(record.carbon_score),
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="sa-carbon-reduction-cell">
                      {record.reduction != null ? (
                        <span className="sa-carbon-reduction-badge">
                          <FiTrendingDown size={12} />
                          {parseFloat(record.reduction).toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td>{record.region || record.location || '—'}</td>
                    <td>
                      <span className="sa-tenant-chip">
                        {record.tenant_name || '—'}
                      </span>
                    </td>
                    <td className="sa-date-cell">
                      {record.recorded_at || record.created_at || '—'}
                    </td>
                    <td>
                      <button
                        className="sa-view-btn"
                        onClick={() => setSelectedRecord(record)}
                        title="View carbon record details"
                      >
                        <FiEye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="sa-empty-state">
                    <div className="sa-empty-icon">
                      <FaLeaf size={48} />
                    </div>
                    <p className="sa-empty-title">No carbon records found</p>
                    <p className="sa-empty-subtitle">
                      {records.length === 0
                        ? 'No carbon analytics data has been recorded across any tenant yet.'
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

      {/* Carbon Record Detail Drawer */}
      {selectedRecord && (
        <div className="sa-farmer-drawer-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="sa-farmer-drawer" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-header">
              <h3 className="sa-drawer-title">Carbon Record Details</h3>
              <button className="sa-drawer-close" onClick={() => setSelectedRecord(null)}>✕</button>
            </div>
            <div className="sa-drawer-avatar-row">
              <div className="sa-carbon-drawer-icon">
                <FaLeaf size={24} />
              </div>
              <div>
                <div className="sa-drawer-name">
                  {selectedRecord.name || selectedRecord.farmer_name || '—'}
                </div>
                <span className={getScoreClass(selectedRecord.carbon_score)}>
                  {formatValue(selectedRecord.carbon_score, 'kg CO2e')}
                </span>
              </div>
            </div>
            <div className="sa-drawer-fields">
              {[
                { label: 'Farmer ID', value: selectedRecord.farmer_id ? `F${selectedRecord.farmer_id}` : null },
                { label: 'Carbon Score', value: formatValue(selectedRecord.carbon_score, 'kg') },
                { label: 'Reduction', value: selectedRecord.reduction != null ? `${parseFloat(selectedRecord.reduction).toFixed(1)}%` : null },
                { label: 'Region', value: selectedRecord.region || selectedRecord.location },
                { label: 'Tenant', value: selectedRecord.tenant_name },
                { label: 'Crop', value: selectedRecord.crop },
                { label: 'Farm Size', value: selectedRecord.farm_size ? `${selectedRecord.farm_size} ha` : null },
                { label: 'Recorded', value: selectedRecord.recorded_at || selectedRecord.created_at },
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

export default SuperAdminCarbonAnalytics;
