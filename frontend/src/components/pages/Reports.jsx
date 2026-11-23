import React, { useState } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { 
  MdInsertDriveFile, 
  MdVisibility, 
  MdFileDownload, 
  MdCalendarToday 
} from 'react-icons/md';

const Reports = () => {
  // Mock data - replace with API calls later
  const [statsData] = useState({
    totalReports: 24,
    downloaded: 8,
    avgGeneration: '2.3s'
  });

  const [reportsData] = useState([
    {
      id: 1,
      title: 'Monthly Farm Report',
      createdAt: '2 hours ago',
      type: 'farm'
    },
    {
      id: 2,
      title: 'Carbon Analytics Summary',
      createdAt: '1 day ago',
      type: 'carbon'
    },
    {
      id: 3,
      title: 'Disease Detection Report',
      createdAt: '1 week ago',
      type: 'disease'
    },
    {
      id: 4,
      title: 'Financial Overview',
      createdAt: '8/25/2025',
      type: 'financial'
    }
  ]);

  const handleViewReport = (reportId) => {
    // Implement view report functionality
    console.log('Viewing report:', reportId);
  };

  const handleDownloadReport = (reportId) => {
    // Implement download report functionality
    console.log('Downloading report:', reportId);
  };

  const handleCreateReport = () => {
    // Implement create report functionality
    console.log('Creating new report');
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content">
          {/* Page Header */}
          <div className="reports-header">
            <div className="header-content">
              <div className="title-section">
                <h1 className="page-title">Reports</h1>
                <p className="page-subtitleag">Generate and manage analytical reports</p>
              </div>
              <button className="create-report-btn" onClick={handleCreateReport}>
                Create a Report
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="reports-stats-grid">
            <div className="reports-stats-card">
              <div className="stats-label">Total Reports</div>
              <div className="stats-value">{statsData.totalReports}</div>
            </div>
            <div className="reports-stats-card">
              <div className="stats-label">Downloaded</div>
              <div className="stats-value">{statsData.downloaded}</div>
            </div>
            <div className="reports-stats-card">
              <div className="stats-label">Avg Report Generation</div>
              <div className="stats-value">{statsData.avgGeneration}</div>
            </div>
          </div>

          {/* Generated Reports Section */}
          <div className="generated-reports-section">
            <h2 className="section-title">Generated Reports</h2>
            <div className="reports-list">
              {reportsData.map((report) => (
                <div key={report.id} className="report-item">
                  <div className="report-content">
                    <div className="report-icon">
                      <MdInsertDriveFile size={24} />
                    </div>
                    <div className="report-details">
                      <h3 className="report-title">{report.title}</h3>
                      <div className="report-meta">
                        <MdCalendarToday size={12} />
                        <span className="report-date">Created: {report.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="report-actions">
                    <button 
                      className="action-btn view-btn"
                      onClick={() => handleViewReport(report.id)}
                    >
                      <MdVisibility size={20} />
                      {/* <span>View</span> */}
                    </button>
                    <button 
                      className="action-btn download-btn"
                      onClick={() => handleDownloadReport(report.id)}
                    >
                      <MdFileDownload size={20} />
                      {/* <span>Download</span> */}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
