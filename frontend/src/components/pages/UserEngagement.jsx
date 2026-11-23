import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import StatsCard from '../StatsCard';
import { exportUserEngagement } from '../../utils/exportData';
import { toast } from 'react-toastify';


 

const styles={
  exportBtn: {
     display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '12px 16px',
      backgroundColor: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      fontSize: '16px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      flexShrink: 0
    },
     titleSection: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px',
      gap: '24px'
    },
    titleContent: {
      flex: 1
    },
    analyticsHeader: {
      marginBottom: '24px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '16px',
      marginBottom: '32px'
    },
}

const UserEngagement = () => {
  const [statsData, setStatsData] = useState([]);
   const [loadingStats, setLoadingStats] = useState(true);
  const [featureUsageData, setFeatureUsageData] = useState([]);
  const [loadingFeatureUsage, setLoadingFeatureUsage] = useState(true);
  const [featureUsageError, setFeatureUsageError] = useState(false);
   
   useEffect(() => {
     const fetchDashboardStats = async () => {
       try {
         const res = await fetch(`${import.meta.env.VITE_API_URL}/analytics/dashboard-stats`);
         const data = await res.json();
   
         setStatsData([
           {
             title: 'Active Farmers',
             value: data.activeFarmers ?? 0,
             trendValue: data.trends?.activeFarmers ?? 0,
             trendType: 'increase',
             icon: (
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                 <path fillRule="evenodd" clipRule="evenodd" d="M16.67 13.13C18.04 14.06 19 15.32 19 17V20H23V17C23 14.82 19.43 13.53 16.67 13.13Z" fill="#65758B"/>
                 <path d="M9 12C11.2091 12 13 10.2091 13 8C13 5.79086 11.2091 4 9 4C6.79086 4 5 5.79086 5 8C5 10.2091 6.79086 12 9 12Z" fill="#65758B"/>
                 <path fillRule="evenodd" clipRule="evenodd" d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C14.53 4 14.09 4.1 13.67 4.24C14.5 5.27 15 6.58 15 8C15 9.42 14.5 10.73 13.67 11.76C14.09 11.9 14.53 12 15 12Z" fill="#65758B"/>
                 <path fillRule="evenodd" clipRule="evenodd" d="M9 13C6.33 13 1 14.34 1 17V20H17V17C17 14.34 11.67 13 9 13Z" fill="#65758B"/>
               </svg>
             ),
           },
           {
             title: 'Carbon Emissions',
             value: data.carbonEmissions ?? 0,
             trendValue: data.trends?.carbonEmissions ?? 0,
             trendType: 'increase',
             icon: (
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                 <path d="M6.05001 8.05C3.32001 10.78 3.32001 15.2 6.03001 17.93C7.50001 14.53 10.12 11.69 13.39 10C10.62 12.34 8.68001 15.61 8.00001 19.32C10.6 20.55 13.8 20.1 15.95 17.95C19.43 14.47 20 4 20 4C20 4 9.53001 4.57 6.05001 8.05Z" fill="#65758B"/>
               </svg>
             ),
           },
           {
             title: 'Disease Alerts',
             value: data.diseaseAlerts ?? 0,
             trendValue: data.trends?.diseaseAlerts ?? 0,
             trendType: 'decrease',
             icon: (
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                 <path d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z" fill="#65758B"/>
               </svg>
             ),
           },
           {
             title: 'Chatbot Interactions',
             value: data.chatbotInteractions ?? 0,
             trendValue: data.trends?.chatbotInteractions ?? 0,
             trendType: 'increase',
             icon: (
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                 <path fillRule="evenodd" clipRule="evenodd" d="M16.6699 13.13C18.0399 14.06 18.9999 15.32 18.9999 17V20H22.9999V17C22.9999 14.82 19.4299 13.53 16.6699 13.13Z" fill="#65758B"/>
                 <path d="M9 12C11.2091 12 13 10.2091 13 8C13 5.79086 11.2091 4 9 4C6.79086 4 5 5.79086 5 8C5 10.2091 6.79086 12 9 12Z" fill="#65758B"/>
                 <path fillRule="evenodd" clipRule="evenodd" d="M14.9999 12C17.2099 12 18.9999 10.21 18.9999 8C18.9999 5.79 17.2099 4 14.9999 4C14.5299 4 14.0899 4.1 13.6699 4.24C14.4999 5.27 14.9999 6.58 14.9999 8C14.9999 9.42 14.4999 10.73 13.6699 11.76C14.0899 11.9 14.5299 12 14.9999 12Z" fill="#65758B"/>
                 <path fillRule="evenodd" clipRule="evenodd" d="M9 13C6.33 13 1 14.34 1 17V20H17V17C17 14.34 11.67 13 9 13Z" fill="#65758B"/>
               </svg>
             ),
           },
         ]);
       } catch (err) {
         console.error("Error fetching dashboard stats:", err);
         // Show zeros instead of nothing when API fails
         setStatsData([
           { title: 'Active Farmers', value: 0, trendValue: 0, trendType: 'increase', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M16.67 13.13C18.04 14.06 19 15.32 19 17V20H23V17C23 14.82 19.43 13.53 16.67 13.13Z" fill="#65758B"/><path d="M9 12C11.2091 12 13 10.2091 13 8C13 5.79086 11.2091 4 9 4C6.79086 4 5 5.79086 5 8C5 10.2091 6.79086 12 9 12Z" fill="#65758B"/><path fillRule="evenodd" clipRule="evenodd" d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C14.53 4 14.09 4.1 13.67 4.24C14.5 5.27 15 6.58 15 8C15 9.42 14.5 10.73 13.67 11.76C14.09 11.9 14.53 12 15 12Z" fill="#65758B"/><path fillRule="evenodd" clipRule="evenodd" d="M9 13C6.33 13 1 14.34 1 17V20H17V17C17 14.34 11.67 13 9 13Z" fill="#65758B"/></svg>) },
           { title: 'Carbon Emissions', value: 0, trendValue: 0, trendType: 'increase', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6.05001 8.05C3.32001 10.78 3.32001 15.2 6.03001 17.93C7.50001 14.53 10.12 11.69 13.39 10C10.62 12.34 8.68001 15.61 8.00001 19.32C10.6 20.55 13.8 20.1 15.95 17.95C19.43 14.47 20 4 20 4C20 4 9.53001 4.57 6.05001 8.05Z" fill="#65758B"/></svg>) },
           { title: 'Disease Alerts', value: 0, trendValue: 0, trendType: 'decrease', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z" fill="#65758B"/></svg>) },
           { title: 'Chatbot Interactions', value: 0, trendValue: 0, trendType: 'increase', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M16.6699 13.13C18.0399 14.06 18.9999 15.32 18.9999 17V20H22.9999V17C22.9999 14.82 19.4299 13.53 16.6699 13.13Z" fill="#65758B"/><path d="M9 12C11.2091 12 13 10.2091 13 8C13 5.79086 11.2091 4 9 4C6.79086 4 5 5.79086 5 8C5 10.2091 6.79086 12 9 12Z" fill="#65758B"/><path fillRule="evenodd" clipRule="evenodd" d="M14.9999 12C17.2099 12 18.9999 10.21 18.9999 8C18.9999 5.79 17.2099 4 14.9999 4C14.5299 4 14.0899 4.1 13.6699 4.24C14.4999 5.27 14.9999 6.58 14.9999 8C14.9999 9.42 14.4999 10.73 13.6699 11.76C14.0899 11.9 14.5299 12 14.9999 12Z" fill="#65758B"/><path fillRule="evenodd" clipRule="evenodd" d="M9 13C6.33 13 1 14.34 1 17V20H17V17C17 14.34 11.67 13 9 13Z" fill="#65758B"/></svg>) },
         ]);
       } finally {
         setLoadingStats(false);
       }
     };

     fetchDashboardStats();
   }, []);
   
  const defaultFeatureCategories = [
    { name: 'Weather Alerts', color: '#8159E1' },
    { name: 'Disease Detection', color: '#FF9800' },
    { name: 'Chatbot', color: '#2196F3' },
    { name: 'Others', color: '#6B7280' },
  ];

  const createPieSlice = (cx, cy, r, startAngle, endAngle) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const calculateFeatureSegments = (data) => {
    if (!data || data.length === 0) return [];
    const total = data.reduce((sum, item) => sum + (item.count || item.value || 0), 0);
    if (total === 0) return [];
    let currentAngle = 0;
    return data.map((item, i) => {
      const value = item.count || item.value || 0;
      const slice = (value / total) * 360;
      const start = currentAngle;
      const end = currentAngle + slice;
      currentAngle = end;
      return {
        ...item,
        percentage: ((value / total) * 100).toFixed(1),
        path: createPieSlice(85.5, 85.5, 85.5, start, end),
        color: item.color || defaultFeatureCategories[i % defaultFeatureCategories.length].color,
      };
    });
  };

  useEffect(() => {
    const fetchFeatureUsage = async () => {
      setLoadingFeatureUsage(true);
      setFeatureUsageError(false);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/analytics/feature-usage`);
        if (!res.ok) throw new Error('Failed to fetch feature usage');
        const data = await res.json();
        setFeatureUsageData(data.features || data || []);
      } catch (err) {
        console.error('Error fetching feature usage:', err);
        setFeatureUsageError(true);
      } finally {
        setLoadingFeatureUsage(false);
      }
    };
    fetchFeatureUsage();
  }, []);

  const handleExportData = () => {
    const engagementData = statsData.map(stat => ({
      metric: stat.title,
      value: stat.value,
      trend: stat.trend,
      period: 'Last Month'
    }));
    exportUserEngagement(engagementData);
    toast.success('User engagement data exported successfully!');
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content">
           <div style={styles.analyticsHeader}>
             <div style={styles.titleSection}>
              <div style={styles.titleContent}>
            <h1 className="page-title">User Engagement</h1>
            <p className="page-subtitleag">Track user activity,feature adoption,and engagement metrics</p>
            <button style={styles.exportBtn} onClick={handleExportData}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M19 13V18C19 18.55 18.55 19 18 19H6C5.45 19 5 18.55 5 18V13C5 12.45 4.55 12 4 12C3.45 12 3 12.45 3 13V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13C21 12.45 20.55 12 20 12C19.45 12 19 12.45 19 13ZM13 12.67L14.88 10.79C15.27 10.4 15.9 10.4 16.29 10.79C16.68 11.18 16.68 11.81 16.29 12.2L12.7 15.79C12.31 16.18 11.68 16.18 11.29 15.79L7.7 12.2C7.31 11.81 7.31 11.18 7.7 10.79C8.09 10.4 8.72 10.4 9.11 10.79L11 12.67V4C11 3.45 11.45 3 12 3C12.55 3 13 3.45 13 4V12.67Z" fill="white"/>
                </svg>
                Export Data
              </button>
              </div>
</div>
 {/* Stats Cards */}
          <div style={styles.statsGrid}>
             {loadingStats ? (
    <p>Loading stats...</p>
  ) : (
            statsData.map((stat, index) => (
              <StatsCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                trend={stat.trend}
                trendValue={stat.trendValue}
                trendType={stat.trendType}
              />
            )) )}
          </div>
            
             <div className="user-engagement-container">
      {/* Daily Activity Trends and Feature Usage Row */}
      <div className="engagement-charts-row">
        {/* Daily Activity Trends */}
        <div className="engagement-chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Daily Activity Trends</h3>
          </div>
          
          <div className="daily-activity-chart">
            <div className="chart-grid">
              {/* Y-axis labels */}
              <div className="y-axis-labels">
                <span className="y-label">50</span>
                <span className="y-label">40</span>
                <span className="y-label">30</span>
                <span className="y-label">20</span>
                <span className="y-label">10</span>
              </div>

              {/* Grid lines */}
              <div className="chart-area">
                <div className="grid-lines-container">
                  <div className="grid-line"></div>
                  <div className="grid-line"></div>
                  <div className="grid-line"></div>
                  <div className="grid-line"></div>
                  <div className="grid-line"></div>
                </div>

                {/* Bars */}
                <div className="bars-container">
                  <div className="bar-wrapper">
                    <div className="activity-bar" style={{ height: '70%' }}></div>
                    <span className="bar-label">Mon</span>
                  </div>
                  <div className="bar-wrapper">
                    <div className="activity-bar" style={{ height: '76%' }}></div>
                    <span className="bar-label">Tue</span>
                  </div>
                  <div className="bar-wrapper">
                    <div className="activity-bar" style={{ height: '56%' }}></div>
                    <span className="bar-label">Wed</span>
                  </div>
                  <div className="bar-wrapper">
                    <div className="activity-bar" style={{ height: '70%' }}></div>
                    <span className="bar-label">Thur</span>
                  </div>
                  <div className="bar-wrapper">
                    <div className="activity-bar" style={{ height: '50%' }}></div>
                    <span className="bar-label">Fri</span>
                  </div>
                  <div className="bar-wrapper">
                    <div className="activity-bar" style={{ height: '78%' }}></div>
                    <span className="bar-label">Sat</span>
                  </div>
                  <div className="bar-wrapper">
                    <div className="activity-bar" style={{ height: '80%' }}></div>
                    <span className="bar-label">Sun</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Usage */}
        <div className="engagement-chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Feature Usage</h3>
          </div>

          {loadingFeatureUsage ? (
            <div className="feature-usage-content">
              <div className="pie-chart-wrapper">
                <svg className="feature-usage-pie-chart" viewBox="0 0 171 171">
                  <circle cx="85.5" cy="85.5" r="85.5" fill="#f3f4f6" opacity="0.3" />
                </svg>
              </div>
              <div className="feature-usage-legend">
                {defaultFeatureCategories.map((item) => (
                  <div key={item.name} className="legend-item">
                    <div className="legend-color-indicator" style={{ backgroundColor: item.color, opacity: 0.3 }}></div>
                    <span className="legend-text" style={{ color: '#d1d5db' }}>{item.name}</span>
                    <span className="pie-slice-percentage" style={{ color: '#d1d5db' }}>-</span>
                  </div>
                ))}
              </div>
            </div>
          ) : featureUsageError || featureUsageData.length === 0 ? (
            <div className="feature-usage-content">
              <div className="chart-empty-state">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="28" fill="#F0F7F0" />
                  <path d="M28 18C22.477 18 18 22.477 18 28C18 33.523 22.477 38 28 38C33.523 38 38 33.523 38 28C38 22.477 33.523 18 28 18ZM28 35C24.134 35 21 31.866 21 28C21 24.134 24.134 21 28 21C31.866 21 35 24.134 35 28C35 31.866 31.866 35 28 35Z" fill="#4CAF50" opacity="0.4" />
                </svg>
                <p className="chart-empty-label">No feature usage data available yet</p>
              </div>
              <div className="feature-usage-legend">
                {defaultFeatureCategories.map((item) => (
                  <div key={item.name} className="legend-item">
                    <div className="legend-color-indicator" style={{ backgroundColor: item.color }}></div>
                    <span className="legend-text">{item.name}</span>
                    <span className="pie-slice-percentage">0%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="feature-usage-content">
              <div className="pie-chart-wrapper">
                <svg className="feature-usage-pie-chart" viewBox="0 0 171 171">
                  {calculateFeatureSegments(featureUsageData).map((segment, index) => (
                    <path key={index} d={segment.path} fill={segment.color} />
                  ))}
                </svg>
              </div>
              <div className="feature-usage-legend">
                {featureUsageData.map((item, index) => {
                  const total = featureUsageData.reduce((sum, i) => sum + (i.count || i.value || 0), 0);
                  const value = item.count || item.value || 0;
                  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                  const color = item.color || defaultFeatureCategories[index % defaultFeatureCategories.length].color;
                  return (
                    <div key={index} className="legend-item">
                      <div className="legend-color-indicator" style={{ backgroundColor: color }}></div>
                      <span className="legend-text">{item.name}</span>
                      <span className="pie-slice-percentage">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Farmer Engagement Trends - Full Width */}
      <div className="engagement-chart-card farmer-engagement-full">
        <div className="chart-header">
          <h3 className="chart-title">Farmer Engagement Trends</h3>
        </div>
        
        <div className="farmer-engagement-chart">
          <div className="chart-grid">
            {/* Y-axis labels */}
            <div className="y-axis-labels">
              <span className="y-label">50</span>
              <span className="y-label">40</span>
              <span className="y-label">30</span>
              <span className="y-label">20</span>
              <span className="y-label">10</span>
            </div>

            {/* Chart area with grid lines */}
            <div className="chart-area">
              <div className="grid-lines-container">
                <div className="grid-line"></div>
                <div className="grid-line"></div>
                <div className="grid-line"></div>
                <div className="grid-line"></div>
                <div className="grid-line"></div>
              </div>

              {/* Line charts SVG */}
              <svg className="engagement-line-chart" viewBox="0 0 1000 140" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="farmersGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#245421"/>
                    <stop offset="100%" stopColor="#4CAF50"/>
                  </linearGradient>
                  <linearGradient id="chatbotGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#6B100A"/>
                    <stop offset="100%" stopColor="#F44336"/>
                  </linearGradient>
                  <linearGradient id="scannedGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#093E68"/>
                    <stop offset="100%" stopColor="#2196F3"/>
                  </linearGradient>
                </defs>
                
                {/* Farmers line - Green */}
                <path
                  d="M1 126C1 126 8.8 109 29 94C49 79 75.5 31 92.4 31C109 31 122 71 138 71C154 71 181 71 199 86C219 101 226 137 230 144C234 151 255 155 268 140C283 122 289 90 298 75C307 60 320 58 333 46C346 34 373 1 395 1C416 1 421 67 438 67C455 67 448 38 468 46C488 54 474 101 484 116C494 130 507 148 523 140C538 132 531 76 538 66C545 56 546 26 563 26C580 26 593 59 602 67C611 75 617 95 635 86C654 77 649 36 670 36C691 36 695 84 703 94C712 104 716 118 738 116C760 114 761 97 774 80C787 63 791 36 805 36C820 36 838 51 853 46C867 41 873 15 873 15C882 13 892 16 905 26C918 36 929 46 941 66C952 86 955 126 973 126C992 126 977 28 1000 21C1016 17 1014 17 1014 17"
                  stroke="url(#farmersGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                
                {/* Chatbot line - Red */}
                <path
                  d="M1 102C1 102 14 97 35 82C56 67 53 52 71 52C88 52 88 82 104 82C121 82 123 58 143 73C163 88 170 124 174 131C179 138 199 147 212 131C228 113 235 77 244 62C253 47 267 45 281 33C294 21 292 2 314 2C336 2 332 53 350 53C367 53 363 25 383 33C404 41 409 89 419 103C430 118 445 135 461 127C476 119 484 63 492 53C499 43 505 33 523 33C540 33 549 46 558 54C567 62 574 82 593 73C612 64 607 23 629 23C650 23 654 71 663 81C671 91 676 105 698 103C721 101 723 84 736 67C749 50 754 23 768 23C783 23 787 38 802 33C817 28 828 5 838 2C847 -1 848 5 861 15C875 25 873 39 890 57C902 77 905 81 925 81C944 81 937 45 956 45C974 45 1000 56 1000 56"
                  stroke="url(#chatbotGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                
                {/* Scanned line - Blue */}
                <path
                  d="M1 64C1 64 14 59 35 44C55 29 53 14 70 14C88 14 88 44 104 44C120 44 122 20 142 35C162 50 157 64 173 65C205 66 229 50 243 35C259 17 293 64 302 49C312 35 332 50 346 38C359 26 370 44 392 44C414 44 426 49 444 49C461 49 500 57 520 65C541 73 540 13 550 27C560 42 555 73 571 65C586 57 606 37 613 27C620 17 615 49 632 49C658 29 650 52 659 60C668 68 680 54 720 44C741 44 736 80 750 64C763 47 768 64 783 64C797 64 807 54 821 49C836 44 837 66 847 64C857 61 849 21 862 31C876 41 891 -5 903 15C915 35 916 47 935 47C954 47 951 1 969 1C988 1 1007 13 1007 13"
                  stroke="url(#scannedGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>

            {/* X-axis labels */}
            <div className="x-axis-labels">
              <span className="x-label">Jan</span>
              <span className="x-label">Feb</span>
              <span className="x-label">Mar</span>
              <span className="x-label">Apr</span>
              <span className="x-label">May</span>
              <span className="x-label">Jun</span>
              <span className="x-label">Jul</span>
              <span className="x-label">Aug</span>
              <span className="x-label">Sept</span>
              <span className="x-label">Oct</span>
              <span className="x-label">Nov</span>
              <span className="x-label">Dec</span>
            </div>
          </div>

          {/* Legend */}
          <div className="engagement-legend">
            <div className="legend-item">
              <div className="legend-color-indicator farmers"></div>
              <span className="legend-text">Farmers</span>
            </div>
            <div className="legend-item">
              <div className="legend-color-indicator chatbot-trend"></div>
              <span className="legend-text">Chatbot</span>
            </div>
            <div className="legend-item">
              <div className="legend-color-indicator scanned"></div>
              <span className="legend-text">Scanned</span>
            </div>
          </div>
        </div>
      </div>
    </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserEngagement;
