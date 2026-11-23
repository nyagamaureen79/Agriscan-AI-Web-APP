import React, { useState, useMemo, useEffect } from 'react';
import { apiFetchArray } from "../../../utils/apiFetchArray";
import SuperAdminLayout from '../../SuperAdmin/SuperAdminLayout';
import { FiSearch, FiDownload, FiAlertTriangle, FiEye, FiShield, FiUsers } from 'react-icons/fi';
import '../../../styles/SuperAdmin.css';
import '../../../styles/SuperAdminDiseaseDetection.css';

const API_URL = import.meta.env.VITE_API_URL;

const SuperAdminDiseaseDetection = () => {
  const [detections, setDetections] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, high: 0, medium: 0, tenants: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [diseaseFilter, setDiseaseFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [tenantOptions, setTenantOptions] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedDetection, setSelectedDetection] = useState(null);

 useEffect(() => {
    const fetchDetections = async () => {
      try {
        setLoading(true);

        // Use apiFetchArray to get detections
        const data = await apiFetchArray(`${API_URL}/diseases/detections/all`);

        setDetections(Array.isArray(data) ? data : []);

        // Derive stats
        const high = data.filter(d => (d.severity || "").toLowerCase() === "high").length;
        const medium = data.filter(d => (d.severity || "").toLowerCase() === "medium").length;
        const uniqueTenants = new Set(data.map(d => d.tenant_id || d.tenant_name)).size;
        setStats({ total: data.length, high, medium, tenants: uniqueTenants });

        // Build tenant filter options
        const tenantSet = new Set();
        data.forEach(d => { if (d.tenant_name) tenantSet.add(d.tenant_name); });
        setTenantOptions(["all", ...Array.from(tenantSet)]);
      } catch (err) {
        console.error("Failed to fetch superadmin disease detections:", err);
        setDetections([]);
        setStats({ total: 0, high: 0, medium: 0, tenants: 0 });
        setTenantOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchDiseases = async () => {
      try {
        // Use apiFetchArray to get diseases
        const data = await apiFetchArray(`${API_URL}/diseases/`);
        setDiseases(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch diseases list:", err);
        setDiseases([]);
      }
    };

    fetchDetections();
    fetchDiseases();
  }, []); // run once on mount

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, severityFilter, diseaseFilter, tenantFilter]);


  const filteredDetections = useMemo(() => {
    return detections.filter(detection => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (detection.name || '').toLowerCase().includes(term) ||
        (detection.region || '').toLowerCase().includes(term) ||
        (detection.tenant_name || '').toLowerCase().includes(term);

      const matchesSeverity =
        severityFilter === 'all' || (detection.severity || '').toLowerCase() === severityFilter;

      const matchesDisease =
        diseaseFilter === 'all' || String(detection.disease_id) === diseaseFilter;

      const matchesTenant =
        tenantFilter === 'all' || detection.tenant_name === tenantFilter;

      return matchesSearch && matchesSeverity && matchesDisease && matchesTenant;
    });
  }, [detections, searchTerm, severityFilter, diseaseFilter, tenantFilter]);

  const totalPages = Math.ceil(filteredDetections.length / itemsPerPage);
  const paginatedDetections = filteredDetections.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getSeverityClass = (severity) => {
    switch ((severity || '').toLowerCase()) {
      case 'high': return 'sa-detection-severity sa-detection-severity--high';
      case 'medium': return 'sa-detection-severity sa-detection-severity--medium';
      case 'low': return 'sa-detection-severity sa-detection-severity--low';
      default: return 'sa-detection-severity sa-detection-severity--default';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 85) return '#4CAF50';
    if (confidence >= 70) return '#F59F0A';
    return '#EF4343';
  };

  const handleExportCSV = () => {
    const headers = ['Disease Name', 'Severity', 'Confidence (%)', 'Region', 'Tenant', 'Detected Date'];
    const rows = filteredDetections.map(d => [
      d.name || '',
      d.severity || '',
      d.confidence || '',
      d.region || '',
      d.tenant_name || '',
      d.detectedDate || d.detected_at || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'superadmin-disease-detections.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SuperAdminLayout activePage="disease-detection">
      <div className="sa-disease-page">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-content">
            <h1 className="page-title">Disease Detection</h1>
            <p className="page-subtitle">View all crop disease detections across all tenants</p>
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
              <FiAlertTriangle size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : stats.total}</div>
              <div className="sa-stat-label">Total Detections</div>
            </div>
          </div>
          <div className="sa-stat-card">
            <div className="sa-stat-icon sa-stat-icon--red">
              <FiShield size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : stats.high}</div>
              <div className="sa-stat-label">High Severity</div>
            </div>
          </div>
          <div className="sa-stat-card">
            <div className="sa-stat-icon sa-stat-icon--orange">
              <FiShield size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : stats.medium}</div>
              <div className="sa-stat-label">Medium Severity</div>
            </div>
          </div>
          <div className="sa-stat-card">
            <div className="sa-stat-icon sa-stat-icon--blue">
              <FiUsers size={22} />
            </div>
            <div className="sa-stat-body">
              <div className="sa-stat-value">{loading ? '—' : stats.tenants}</div>
              <div className="sa-stat-label">Affected Tenants</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="sa-farmers-filters">
          <div className="sa-search-box">
            <FiSearch className="sa-search-icon" />
            <input
              type="text"
              placeholder="Search by disease name, region, or tenant..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="sa-search-input"
            />
          </div>

          <div className="sa-filter-group">
            <label className="sa-filter-label">Disease</label>
            <select
              value={diseaseFilter}
              onChange={e => setDiseaseFilter(e.target.value)}
              className="sa-filter-select"
            >
              <option value="all">All Diseases</option>
              {diseases.map(d => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="sa-filter-group">
            <label className="sa-filter-label">Severity</label>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="sa-filter-select"
            >
              <option value="all">All Severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
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
          Showing <strong>{filteredDetections.length}</strong> of <strong>{detections.length}</strong> detections
        </div>

        {/* Table */}
        <div className="sa-farmers-table-wrapper">
          <table className="sa-farmers-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Disease Name</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Region</th>
                <th>Tenant</th>
                <th>Detected Date</th>
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
              ) : paginatedDetections.length > 0 ? (
                paginatedDetections.map((detection, idx) => (
                  <tr key={detection.id || idx} className="sa-table-row">
                    <td className="sa-cell-index">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="sa-cell-name">
                      <div className="sa-detection-icon-wrap">
                        <FiAlertTriangle size={15} />
                      </div>
                      <span>{detection.name || '—'}</span>
                    </td>
                    <td>
                      <span className={getSeverityClass(detection.severity)}>
                        {detection.severity || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <div className="sa-confidence-cell">
                        <span
                          className="sa-confidence-value"
                          style={{ color: getConfidenceColor(detection.confidence) }}
                        >
                          {detection.confidence != null ? `${detection.confidence}%` : '—'}
                        </span>
                        {detection.confidence != null && (
                          <div className="sa-confidence-bar">
                            <div
                              className="sa-confidence-fill"
                              style={{
                                width: `${detection.confidence}%`,
                                backgroundColor: getConfidenceColor(detection.confidence),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{detection.region || '—'}</td>
                    <td>
                      <span className="sa-tenant-chip">
                        {detection.tenant_name || '—'}
                      </span>
                    </td>
                    <td className="sa-date-cell">
                      {detection.detectedDate || detection.detected_at || '—'}
                    </td>
                    <td>
                      <button
                        className="sa-view-btn"
                        onClick={() => setSelectedDetection(detection)}
                        title="View detection details"
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
                      <FiAlertTriangle size={48} />
                    </div>
                    <p className="sa-empty-title">No detections found</p>
                    <p className="sa-empty-subtitle">
                      {detections.length === 0
                        ? 'No disease detections have been recorded across any tenant yet.'
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

      {/* Detection Detail Drawer */}
      {selectedDetection && (
        <div className="sa-farmer-drawer-overlay" onClick={() => setSelectedDetection(null)}>
          <div className="sa-farmer-drawer" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-header">
              <h3 className="sa-drawer-title">Detection Details</h3>
              <button className="sa-drawer-close" onClick={() => setSelectedDetection(null)}>✕</button>
            </div>
            <div className="sa-drawer-avatar-row">
              <div className="sa-detection-drawer-icon">
                <FiAlertTriangle size={24} />
              </div>
              <div>
                <div className="sa-drawer-name">{selectedDetection.name || '—'}</div>
                <span className={getSeverityClass(selectedDetection.severity)}>
                  {selectedDetection.severity || 'Unknown'}
                </span>
              </div>
            </div>
            <div className="sa-drawer-fields">
              {[
                { label: 'Disease ID', value: selectedDetection.disease_id ? `D${selectedDetection.disease_id}` : null },
                { label: 'Confidence', value: selectedDetection.confidence != null ? `${selectedDetection.confidence}%` : null },
                { label: 'Region', value: selectedDetection.region },
                { label: 'Tenant', value: selectedDetection.tenant_name },
                { label: 'Detected', value: selectedDetection.detectedDate || selectedDetection.detected_at },
                { label: 'Farmer', value: selectedDetection.farmer_name },
                { label: 'Crop', value: selectedDetection.crop },
              ].map(({ label, value }) => (
                <div key={label} className="sa-drawer-field">
                  <span className="sa-drawer-field-label">{label}</span>
                  <span className="sa-drawer-field-value">{value || '—'}</span>
                </div>
              ))}
            </div>
            {selectedDetection.image && (
              <div className="sa-drawer-detection-image">
                <img
                  src={`${API_URL}${selectedDetection.image}`}
                  alt={selectedDetection.name}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
};

export default SuperAdminDiseaseDetection;
