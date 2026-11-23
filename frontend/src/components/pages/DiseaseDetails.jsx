import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from "../../utils/apiFetch";
import Sidebar from '../Sidebar';
import Header from '../Header';

const DiseaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const [diseaseData, setDiseaseData] = useState(null);
  const [affectedFarms, setAffectedFarms] = useState([]); 

 useEffect(() => {
  fetch(`${import.meta.env.VITE_API_URL}/diseases/${id}`)
    .then(res => res.json())
    .then(data => {
      setDiseaseData(data);
      
    })
    .catch(err => console.error(err));
}, [id]);

useEffect(() => {
  apiFetch(`${import.meta.env.VITE_API_URL}/diseases/${id}/affected-farms`)
    .then(res => res.json())
    .then(data => setAffectedFarms(data))
    .catch(err => console.error(err));
}, [id]);
if (!diseaseData) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="dashboard-content">
            {/* Loading State */}
            <div className="disease-details-loading">
              <div className="loading-header">
                <div className="loading-back-btn"></div>
                <div className="loading-title-section">
                  <div className="loading-title"></div>
                  <div className="loading-subtitle"></div>
                </div>
              </div>

              <div className="loading-overview-card">
                <div className="loading-image-placeholder"></div>
                <div className="loading-info-section">
                  <div className="loading-text-line long"></div>
                  <div className="loading-text-line medium"></div>
                  <div className="loading-text-line short"></div>
                  <div className="loading-text-line medium"></div>
                </div>
              </div>

              <div className="loading-tabs">
                <div className="loading-tab"></div>
                <div className="loading-tab"></div>
                <div className="loading-tab"></div>
                <div className="loading-tab"></div>
              </div>

              <div className="loading-content-grid">
                <div className="loading-card"></div>
                <div className="loading-card"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'symptoms', label: 'Symptoms' },
    { id: 'treatment', label: 'Treatment' },
    { id: 'affected-farms', label: 'Affected Farms' }
  ];

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

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content">
          {/* Page Header */}
          <div className="disease-details-header">
            <div className="header-left-section">
              <button className="back-btn" onClick={() => navigate('/disease-detection')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="#374151"/>
                </svg>
                Back
              </button>
              <div className="page-info">
                <h1 className="page-title">Disease Details</h1>
                <p className="page-subtitleag">Comprehensive information about detected crop diseases</p>
              </div>
            </div>
            <button className="export-report-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19 13V18C19 18.55 18.55 19 18 19H6C5.45 19 5 18.55 5 18V13C5 12.45 4.55 12 4 12C3.45 12 3 12.45 3 13V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13C21 12.45 20.55 12 20 12C19.45 12 19 12.45 19 13ZM13 12.67L14.88 10.79C15.27 10.4 15.9 10.4 16.29 10.79C16.68 11.18 16.68 11.81 16.29 12.2L12.7 15.79C12.31 16.18 11.68 16.18 11.29 15.79L7.7 12.2C7.31 11.81 7.31 11.18 7.7 10.79C8.09 10.4 8.72 10.4 9.11 10.79L11 12.67V4C11 3.45 11.45 3 12 3C12.55 3 13 3.45 13 4V12.67Z" fill="white"/>
              </svg>
              Export Report
            </button>
          </div>

          {/* Disease Overview Card */}
          <div className="disease-overview-card">
            <div className="disease-overview-content">
             <div className="disease-image-section">
  <img
    src={
      diseaseData.image 
        ? diseaseData.image  // use the full URL returned by backend
        : "https://api.builder.io/api/v1/image/assets/TEMP/86fda7525fe33c6879bfe8a62d196fa1d3552beb?width=280" // fallback
    }
    alt={diseaseData.name}
    className="disease-overview-image"
  />
</div>
              
              
              <div className="disease-info-section">
                <div className="disease-header-info">
                  <h2 className="disease-title">{diseaseData.name}</h2>
                  <div className={`severity-badge ${getSeverityClass(diseaseData.severity)}`}>
                    {diseaseData.activeCases} Confirmed Cases
                  </div>
                </div>
                
                {/* <p className="disease-type">{diseaseData.type}</p> */}
                <p className="disease-description">{diseaseData.description}</p>
                
                <div className="commonly-affects-section">
                  <p className="commonly-affects-label">Commonly Affects:</p>
<div className="crop-tags">
  {(diseaseData.commonlyAffects || []).map((crop, index) => (
    <span key={index} className="crop-tag">{crop}</span>
  ))}
</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="disease-tab-navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`disease-tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content - Overview */}
          {activeTab === 'overview' && (
            <div className="tab-content-container">
              <div className="disease-details-grid">
                {/* Disease Information Card */}
                <div className="disease-info-card">
                  <div className="info-card-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z" fill="#EF4343"/>
                    </svg>
                    <h3 className="info-card-title">Disease Information</h3>
                    <div className={`severity-badge ${getSeverityClass(diseaseData.severity)}`}>
                      {diseaseData.severity}
                    </div>
                  </div>
                  
                  <div className="disease-id-label">D{diseaseData.id}</div>
                  
                  <div className="disease-card-content">
                    <div className="disease-card-image-container">
                      <img 
  src={diseaseData.image || "https://api.builder.io/api/v1/image/assets/TEMP/86fda7525fe33c6879bfe8a62d196fa1d3552beb?width=280"} 
                        alt={diseaseData.name}
                        className="disease-card-image"
                      />
                    </div>
                    
                    <div className="confidence-info">
                      <div className="confidence-row">
                        <span className="confidence-label"> Last Confidence Score</span>
                        <span className="confidence-percentage">{diseaseData.confidence}%</span>
                      </div>
                      <div className="confidence-progress-bar">
                        <div 
                          className="confidence-progress-fill"
                          style={{ width: `${(diseaseData.confidence / 100) * 100}%` }}
                        ></div>
                      </div>
                      <div className="detection-time">
                         Last Detected: {diseaseData.detectedDate}
                      </div>
                    </div>
                  </div>
                  
                </div>

                {/* Current Status Card */}
                <div className="current-status-card">
                  <div className="status-card-header">
                    <h3 className="status-card-title">Current Status</h3>
                    <div className={`severity-badge ${getSeverityClass(diseaseData.severity)}`}>
                      {diseaseData.severity}
                    </div>
                  </div>
                  
                  <div className="status-stats-grid">
                    <div className="status-stat-card">
                      <div className="status-stat-value">{diseaseData.activeCases}</div>
                      <div className="status-stat-label">Confirmed Cases</div>
                    </div>
                    <div className="status-stat-card">
                      <div className="status-stat-value">{diseaseData.subCountiesAffected}</div>
                      <div className="status-stat-label">Sub-Counties Affected</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

 {activeTab === 'symptoms' && (
  <div className="tab-content-container">
    <div className="symptoms-grid">

      {/* Visual Symptoms */}
      <div className="symptom-card">
        <h4>Visual Symptoms</h4>
        <ul className="symptom-list red-list">
          {(diseaseData.symptoms || []).map((symptom, index) => (
            <li key={index}>{symptom}</li>
          ))}
        </ul>
      </div>

      {/* Identification Tips */}
      <div className="symptom-card">
        <h4>Identification Tips</h4>
        <ul className="symptom-list green-list">
          {diseaseData.identification_tips
            ?.split("\n")
            .map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
        </ul>
      </div>

    </div>
  </div>
)}



        {/* Treatment Tab */}
{activeTab === 'treatment' && (
  <div className="tab-content-container">
    <div className="treatment-grid">

      {/* Organic Treatment */}
      <div className="treatment-card">
        <h4>Organic Treatment</h4>
        <ul className="treatment-list green-list">
          {(diseaseData.organic_treatments || []).map((treatment, index) => (
            <li key={index}>{treatment}</li>
          ))}
        </ul>
      </div>

      {/* Chemical Treatment */}
      <div className="treatment-card">
        <h4>Chemical Treatment</h4>
        <ul className="treatment-list orange-list">
          {(diseaseData.chemical_treatments || []).map((treatment, index) => (
            <li key={index}>{treatment}</li>
          ))}
        </ul>
      </div>

      {/* Prevention Strategies */}
      <div className="treatment-card full-width">
        <h4>Prevention Strategies</h4>
        <ul className="treatment-list green-list">
          {(diseaseData.preventions || []).map((strategy, index) => (
            <li key={index}>{strategy}</li>
          ))}
        </ul>
      </div>

    </div>
  </div>
)}

{activeTab === 'affected-farms' && (
  <div className="tab-content-container">
    <div className="affected-header-row">
      <h3 className="affected-title">Recent Activity</h3>
      <span className="affected-count-badge">{affectedFarms.length} farms</span>
    </div>

    <div className="affected-list">
      {affectedFarms.length === 0 ? (
        <div className="affected-empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 2 2 7v10l10 5 10-5V7L12 2Zm0 2.24L18.5 8 12 11.76 5.5 8 12 4.24ZM4 9.62l7 3.89v7.87l-7-3.5V9.62Zm9 11.76v-7.87l7-3.89v8.26l-7 3.5Z" fill="#D1D5DB" />
          </svg>
          <p>No affected farms found.</p>
        </div>
      ) : (
        affectedFarms.map((farm, idx) => {
          const cropImage = farm.image || farm.scan_image || farm.cropImage;
          const cropImageUrl = cropImage
            ? (/^https?:\/\//i.test(cropImage) ? cropImage : `${import.meta.env.VITE_API_URL}${cropImage}`)
            : null;

          return (
            <div key={idx} className="affected-card">
              <div className="affected-card-thumb">
                {cropImageUrl ? (
                  <img
                    src={cropImageUrl}
                    alt={`Crop scan for ${farm.farmerName || 'farmer'}`}
                    className="affected-card-image"
                  />
                ) : (
                  <div className="affected-card-image-placeholder">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M4 5h3.17L9 3h6l1.83 2H20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm8 3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" fill="#9CA3AF" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="affected-info">
                <h4 className="alert-title">
                  {farm.farmerName || "Unknown Farmer"}
                </h4>
                <div className="affected-meta-row">
                  <span className="affected-meta-item">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Detected {farm.detectedDate}
                  </span>
                  <span className="affected-meta-item affected-meta-item--location">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="#FCA5A5" fillOpacity="0.25" />
                    </svg>
                    {farm.location || 'Unknown location'}
                  </span>
                </div>
              </div>

              <span className="affected-status-chip">Active</span>
            </div>
          );
        })
      )}
    </div>
  </div>
)}




        </div>
      </div>
    </div>
  );
};

export default DiseaseDetails;
