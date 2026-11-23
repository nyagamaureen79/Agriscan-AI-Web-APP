import React, { useState } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { apiFetchArray } from "../../utils/apiFetchArray";
import { exportDiseaseDetection } from '../../utils/exportData';
import { toast } from 'react-toastify';

const DiseaseDetection = () => {
const [diseaseDetections, setDiseaseDetections] = useState([]);
const [diseases, setDiseases] = useState([]);
const [loading, setLoading] = useState(true);



useEffect(() => {
  apiFetchArray(`${import.meta.env.VITE_API_URL}/diseases/detections`)
    .then(data => {
      console.log("detections", data);
      setDiseaseDetections(data);
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
}, []);

useEffect(() => {
  fetch(`${import.meta.env.VITE_API_URL}/diseases/`)
    .then(res => res.json())
    .then(data => setDiseases(data))
    .catch(err => console.error(err));
}, []);


  const [filters, setFilters] = useState({
    search: '',
    disease: 'All Diseases',
    severity: 'All Severity',
    region: 'All Regions'
  });

  // Filter disease detections based on active filters
  const filteredDetections = diseaseDetections.filter((detection) => {
    // Search filter (searches in disease name)
    if (filters.search && !detection.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Disease filter
    if (filters.disease !== 'All Diseases' && filters.disease !== '' && detection.disease_id !== parseInt(filters.disease)) {
      return false;
    }

    // Severity filter
    if (filters.severity !== 'All Severity' && detection.severity !== filters.severity) {
      return false;
    }

    // Region filter
    if (filters.region !== 'All Regions' && detection.region !== filters.region) {
      return false;
    }

    return true;
  });

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'High':
        return 'severity-high';
      case 'Medium':
        return 'severity-medium';
      case 'Low':
        return 'severity-low';
      default:
        return '';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 85) return '#4CAF50';
    if (confidence >= 70) return '#F59F0A';
    return '#EF4343';
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleExportData = () => {
    exportDiseaseDetection(diseaseDetections);
    toast.success('Disease detection data exported successfully!');
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content">
          {/* Page Header */}
          <div className="disease-detection-header">
            <div className="page-info">
              <h1 className="page-title">Disease Detection</h1>
              <p className="page-subtitleag">Monitor and review AI-powered crop disease detections</p>
            </div>
            <button className="export-report-btn" onClick={handleExportData}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19 13V18C19 18.55 18.55 19 18 19H6C5.45 19 5 18.55 5 18V13C5 12.45 4.55 12 4 12C3.45 12 3 12.45 3 13V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13C21 12.45 20.55 12 20 12C19.45 12 19 12.45 19 13ZM13 12.67L14.88 10.79C15.27 10.4 15.9 10.4 16.29 10.79C16.68 11.18 16.68 11.81 16.29 12.2L12.7 15.79C12.31 16.18 11.68 16.18 11.29 15.79L7.7 12.2C7.31 11.81 7.31 11.18 7.7 10.79C8.09 10.4 8.72 10.4 9.11 10.79L11 12.67V4C11 3.45 11.45 3 12 3C12.55 3 13 3.45 13 4V12.67Z" fill="white"/>
              </svg>
              Export Data
            </button>
          </div>

          {/* Filters Section */}
          <div className="farmers-filters-section">
            <div className="search-container">
              <svg className="search-icon" width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M20.6667 18.6667H19.6133L19.24 18.3067C20.5467 16.7867 21.3333 14.8133 21.3333 12.6667C21.3333 7.88 17.4533 4 12.6667 4C7.88 4 4 7.88 4 12.6667C4 17.4533 7.88 21.3333 12.6667 21.3333C14.8133 21.3333 16.7867 20.5467 18.3067 19.24L18.6667 19.6133V20.6667L25.3333 27.32L27.32 25.3333L20.6667 18.6667ZM12.6667 18.6667C9.34667 18.6667 6.66667 15.9867 6.66667 12.6667C6.66667 9.34667 9.34667 6.66667 12.6667 6.66667C15.9867 6.66667 18.6667 9.34667 18.6667 12.6667C18.6667 15.9867 15.9867 18.6667 12.6667 18.6667Z" fill="#787878"/>
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-dropdown-container">
  <select 
    className="filter-dropdown"
    value={filters.disease}
    onChange={(e) => handleFilterChange('disease', e.target.value)}
  >
    <option value="">All Diseases</option>

    {diseases.map((disease) => (
      <option key={disease.id} value={disease.id}>
        {disease.name}
      </option>
    ))}

  </select>

  <svg className="dropdown-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
  </svg>
</div>


              <div className="filter-dropdown-container">
                <select 
                className="filter-dropdown"
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                >
                  <option>All Severity</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
               <svg className="dropdown-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
              </svg>
              </div>

              <div className="filter-dropdown-container">
                <select 
                className="filter-dropdown"
                  value={filters.region}
                  onChange={(e) => handleFilterChange('region', e.target.value)}
                >
                  <option>All Regions</option>
                  <option>West Pokot</option>
                  <option>Trans Nzoia</option>
                  <option>Nakuru</option>
                  <option>Kiambu</option>
                </select>
                 <svg className="dropdown-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
              </svg>
             
            </div>
          </div>

          {/* Disease Detection Cards Grid */}
          {loading ? (
            <div className="disease-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="disease-card disease-card--skeleton">
                  <div className="skeleton-card-image" />
                  <div className="card-body">
                    <div className="card-header">
                      <div className="skeleton-line skeleton-line--wide" />
                      <div className="skeleton-box skeleton-box--badge" />
                    </div>
                    <div className="skeleton-line skeleton-line--short" />
                    <div className="skeleton-line skeleton-line--full" />
                    <div className="skeleton-bar" />
                    <div className="skeleton-line skeleton-line--medium" />
                  </div>
                  <div className="skeleton-box skeleton-box--btn" />
                </div>
              ))}
            </div>
          ) : diseaseDetections.length === 0 ? (
            <div className="no-results-container">
              <svg className="no-results-icon" width="96" height="96" viewBox="0 0 96 96" fill="none">
                <circle cx="48" cy="48" r="48" fill="#F0FFF4"/>
                <path d="M48 28C37.0 28 28 37.0 28 48C28 59.0 37.0 68 48 68C59.0 68 68 59.0 68 48C68 37.0 59.0 28 48 28ZM52 58H44V50H52V58ZM52 46H44V38H52V46Z" fill="#4CAF50" opacity="0.35"/>
              </svg>
              <h3 className="no-results-title">No Detections Available</h3>
              <p className="no-results-message">
                There are no disease detection records yet. They will appear here once farmers scan crops through the app.
              </p>
            </div>
          ) : filteredDetections.length === 0 ? (
            <div className="no-results-container">
              <svg className="no-results-icon" width="96" height="96" viewBox="0 0 96 96" fill="none">
                <circle cx="48" cy="48" r="48" fill="#F3F4F6"/>
                <path d="M48 28C37.0 28 28 37.0 28 48C28 59.0 37.0 68 48 68C59.0 68 68 59.0 68 48C68 37.0 59.0 28 48 28ZM48 64C39.18 64 32 56.82 32 48C32 39.18 39.18 32 48 32C56.82 32 64 39.18 64 48C64 56.82 56.82 64 48 64Z" fill="#9CA3AF"/>
                <path d="M54 42L42 54M42 42L54 54" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <h3 className="no-results-title">No Results Found</h3>
              <p className="no-results-message">
                No disease detections match your current filter criteria. Try adjusting your filters or search terms.
              </p>
              <button
                className="reset-filters-btn"
                onClick={() => setFilters({
                  search: '',
                  disease: 'All Diseases',
                  severity: 'All Severity',
                  region: 'All Regions'
                })}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="disease-grid">
              {filteredDetections.map((detection) => (
                <div key={detection.id} className={`disease-card disease-card--${getSeverityClass(detection.severity)}`}>
                  <div className="card-thumbnail">
                    <img
                      src={
                        detection.image
                          ? `${import.meta.env.VITE_API_URL}${detection.image}`
                          : "https://api.builder.io/api/v1/image/assets/TEMP/86fda7525fe33c6879bfe8a62d196fa1d3552beb?width=280"
                      }
                      alt={detection.name}
                      className="card-thumbnail-img"
                    />
                    <div className={`card-severity-pill ${getSeverityClass(detection.severity)}`}>
                      {detection.severity}
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="card-title-row">
                      <svg className="warning-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z" fill="#EF4343"/>
                      </svg>
                      <h3 className="disease-name">{detection.name}</h3>
                    </div>

                    <div className="card-meta-row">
                      <span className="disease-id-tag">D{detection.disease_id}</span>
                      {detection.region && (
                        <span className="region-tag">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#787878"/>
                          </svg>
                          {detection.region}
                        </span>
                      )}
                    </div>

                    <div className="confidence-block">
                      <div className="confidence-row-header">
                        <span className="confidence-label">AI Confidence</span>
                        <span
                          className="confidence-value"
                          style={{ color: getConfidenceColor(detection.confidence) }}
                        >
                          {detection.confidence}%
                        </span>
                      </div>
                      <div className="confidence-bar">
                        <div
                          className="confidence-fill"
                          style={{
                            width: `${detection.confidence}%`,
                            backgroundColor: getConfidenceColor(detection.confidence)
                          }}
                        />
                      </div>
                    </div>

                    <div className="card-footer-info">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="#787878"/>
                      </svg>
                      <span className="detection-timestamp">Last detected: {detection.detectedDate}</span>
                    </div>
                  </div>

                  <Link to={`/disease-details/${detection.disease_id}`} className="view-details-btn">
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiseaseDetection;
