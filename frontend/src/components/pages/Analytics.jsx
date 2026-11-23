import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import StatsCard from '../StatsCard';
import { exportAnalyticsData } from '../../utils/exportData';
import { toast } from 'react-toastify';


const Analytics = () => {
  // Mock data for stats cards
  const [statsData, setStatsData] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/analytics/dashboard-stats`);
        const data = await res.json();
  
        setStatsData([
          {
            title: 'Active Farmers',
            value: data.activeFarmers,
            trendValue: data.trends.activeFarmers,
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
            title: 'GreenHouse Gas Emissions',
            value: data.carbonEmissions,
            trendValue: data.trends.carbonEmissions,
            trendType: 'increase',
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6.05001 8.05C3.32001 10.78 3.32001 15.2 6.03001 17.93C7.50001 14.53 10.12 11.69 13.39 10C10.62 12.34 8.68001 15.61 8.00001 19.32C10.6 20.55 13.8 20.1 15.95 17.95C19.43 14.47 20 4 20 4C20 4 9.53001 4.57 6.05001 8.05Z" fill="#65758B"/>
              </svg>
            ),
          },
          {
            title: 'Disease Alerts',
            value: data.diseaseAlerts,
            trendValue: data.trends.diseaseAlerts,
            trendType: 'decrease',
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z" fill="#65758B"/>
              </svg>
            ),
          },
          {
            title: 'Chatbot Interactions',
            value: data.chatbotInteractions,
            trendValue: data.trends.chatbotInteractions,
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
      } finally {
        setLoadingStats(false);
      }
    };
  
    fetchDashboardStats();
  }, []);
  
  // Mock data for charts
  const cropData = [
    { name: "Maize", value: 50 },
    { name: "Beans", value: 45 },
    { name: "Coffee", value: 32 },
    { name: "Tomatoes", value: 32 },
    { name: "Potatoes", value: 25 },
    { name: "Avocado", value: 22 },
    { name: "Others", value: 18 }
  ];

  const diseaseData = [
    { name: "Maize Leaf Blight", value: 40, color: "#4CAF50" },
    { name: "Bean Rust", value: 30, color: "#8159E1" },
    { name: "Tomato Wilt", value: 20, color: "#2196F3" },
    { name: "Others", value: 10, color: "#6B7280" }
  ];

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const handleExportData = () => {
    const analyticsData = {
      activeFarmers: '278',
      carbonEmissions: '179 kg',
      diseaseScans: '278',
      chatbotInteractions: '1,028'
    };
    exportAnalyticsData(analyticsData);
    toast.success('Analytics data exported successfully!');
  };

  const styles = {
    analyticsHeader: {
      marginBottom: '24px'
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
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#0B0324',
      margin: '0 0 8px 0'
    },
    subtitle: {
      fontSize: '16px',
      color: '#4B5563',
      margin: '0'
    },
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
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '16px',
      marginBottom: '32px'
    },
    sectionTitle: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#0B0324',
      margin: '0 0 24px 0'
    },
    chartsRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      marginBottom: '24px'
    },
    chartContainer: {
      backgroundColor: '#FFF',
      border: '1px solid #E1E7EF',
      borderRadius: '10px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    chartContainerFull: {
      backgroundColor: '#FFF',
      border: '1px solid #E1E7EF',
      borderRadius: '10px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      gridColumn: '1 / -1',
      marginBottom: '32px'
    },
    chartTitle: {
      fontSize: '16px',
      fontWeight: '500',
      color: '#0B0324',
      margin: '0'
    },
    barChartContainer: {
      height: '174px'
    },
    barChart: {
      position: 'relative',
      height: '100%',
      display: 'flex'
    },
    yAxis: {
      display: 'flex',
      flexDirection: 'column-reverse',
      justifyContent: 'space-between',
      width: '16px',
      height: 'calc(100% - 32px)',
      fontSize: '12px',
      color: 'rgba(0, 0, 0, 0.4)',
      textAlign: 'right',
      paddingRight: '6px'
    },
    chartArea: {
      position: 'relative',
      flex: 1,
      marginLeft: '23px',
      marginBottom: '32px',
      height: 'calc(100% - 32px)'
    },
    gridLines: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      opacity: 0.5
    },
    gridLine: {
      height: '1px',
      backgroundColor: '#CFCFCF',
      width: '100%'
    },
    barsContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      gap: '8px',
      padding: '8px 16px'
    },
    barGroup: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: 1,
      height: '100%',
      justifyContent: 'flex-end'
    },
    cropBar: {
      width: '16px',
      borderRadius: '5px',
      marginBottom: '8px',
      minHeight: '5px',
      background: 'linear-gradient(180deg, #4CAF50 0%, #245421 100%)'
    },
    barLabel: {
      fontSize: '12px',
      color: 'rgba(0, 0, 0, 0.4)',
      textAlign: 'center',
      lineHeight: '15px',
      whiteSpace: 'nowrap',
      marginTop: '8px'
    },
    pieChartContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '32px',
      height: '174px'
    },
    pieChart: {
      flexShrink: 0,
      width: '171px',
      height: '171px'
    },
    pieLegend: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      flex: 1
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    legendColor: {
      width: '60px',
      height: '16px',
      flexShrink: 0
    },
    legendLabel: {
      fontSize: '10px',
      color: '#65758B'
    },
    lineChartContainer: {
      position: 'relative',
      height: '174px',
      display: 'flex',
      flexDirection: 'column'
    },
    diseaseTrendLine: {
      position: 'absolute',
      top: '-10rem',
      left: '23px',
      right: 0,
      bottom: '32px',
      // width: 'calc(100% - 23px)',
      // height: 'calc(100% - 40px)'
      
    },
    xAxis: {
      position: 'absolute',
      bottom: 0,
      left: '23px',
      right: 0,
      height: '32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: '12px'
    },
    xLabel: {
      fontSize: '12px',
      color: 'rgba(0, 0, 0, 0.4)',
      textAlign: 'center',
      flex: 1,
      opacity: 0.4
    },
    financialLegend: {
      display: 'flex',
      justifyContent: 'center',
      gap: '48px',
      marginTop: '16px'
    }
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content">
          {/* Page Header */}
          <div style={styles.analyticsHeader}>
            <div style={styles.titleSection}>
              <div style={styles.titleContent}>
                <h1 style={styles.title}>Analytics</h1>
                <p style={styles.subtitle}>Comprehensive insights and data visualization across all modules</p>
              </div>
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

          {/* Crops & Disease Section */}
          <h2 style={styles.sectionTitle}>Crops & Disease</h2>

          <div style={styles.chartsRow}>
            {/* Most Scanned Crops Chart */}
            <div style={styles.chartContainer}>
              <h3 style={styles.chartTitle}>Most Scanned Crops</h3>
              <div style={styles.barChartContainer}>
                <div style={styles.barChart}>
                  <div style={styles.yAxis}>
                    <span>50</span>
                    <span>40</span>
                    <span>30</span>
                    <span>20</span>
                    <span>10</span>
                  </div>
                  <div style={styles.chartArea}>
                    <div style={styles.gridLines}>
                      <div style={styles.gridLine}></div>
                      <div style={styles.gridLine}></div>
                      <div style={styles.gridLine}></div>
                      <div style={styles.gridLine}></div>
                      <div style={styles.gridLine}></div>
                    </div>
                    <div style={styles.barsContainer}>
                      {cropData.map((crop, index) => (
                        <div key={index} style={styles.barGroup}>
                          <div 
                            style={{ 
                              ...styles.cropBar,
                              height: `${(crop.value / 50) * 100}%`
                            }}
                          ></div>
                          <span style={styles.barLabel}>{crop.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Detected Diseases Chart */}
            <div style={styles.chartContainer}>
              <h3 style={styles.chartTitle}>Top Diseases Detected</h3>
              <div style={styles.pieChartContainer}>
                <div style={styles.pieChart}>
                  <svg width="171" height="171" viewBox="0 0 171 171">
                    <path d="M171 85.5C171 71.5187 167.571 57.7508 161.014 45.4024C154.458 33.0541 144.973 22.502 133.39 14.6708C121.808 6.83966 108.482 1.96828 94.5799 0.483501C80.6777 -1.00128 66.6235 0.945847 53.6487 6.15429L85.5 85.5H171Z" fill="#4CAF50"/>
                    <path d="M54.0005 6.01395C41.8988 10.8097 31.0519 18.3055 22.2868 27.9297C13.5217 37.5539 7.06995 49.0524 3.42335 61.5485C-0.223257 74.0447 -0.96839 87.2085 1.24476 100.036C3.45791 112.864 8.57091 125.017 16.1939 135.569L85.5 85.5L54.0005 6.01395Z" fill="#8159E1"/>
                    <path d="M15.7103 134.893C26.0692 149.529 40.7676 160.539 57.7266 166.363C74.6857 172.188 93.0468 172.534 110.213 167.351L85.5 85.5L15.7103 134.893Z" fill="#2196F3"/>
                    <path d="M108.812 167.761C126.786 162.667 142.597 151.826 153.828 136.896C165.058 121.966 171.089 103.769 170.999 85.0874L85.5 85.5L108.812 167.761Z" fill="#6B7280"/>
                  </svg>
                </div>
                <div style={styles.pieLegend}>
                  {diseaseData.map((disease, index) => (
                    <div key={index} style={styles.legendItem}>
                      <div style={{...styles.legendColor, backgroundColor: disease.color}}></div>
                      <span style={styles.legendLabel}>{disease.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Disease Trend Over Time */}
          <div style={styles.chartContainerFull}>
            <h3 style={styles.chartTitle}>Trend of Diseases Detected Over Time</h3>
            <div style={styles.lineChartContainer}>
              <div style={styles.yAxis}>
                <span>50</span>
                <span>40</span>
                <span>30</span>
                <span>20</span>
                <span>10</span>
              </div>
              <div style={styles.chartArea}>
                <div style={styles.gridLines}>
                  <div style={styles.gridLine}></div>
                  <div style={styles.gridLine}></div>
                  <div style={styles.gridLine}></div>
                  <div style={styles.gridLine}></div>
                  <div style={styles.gridLine}></div>
                </div>
                <svg style={styles.diseaseTrendLine} viewBox="0 0 1000 140" preserveAspectRatio="none">
                  <path 
                    d="M1 102.275C1 102.275 13.9319 97.1673 34.745 82.1585C55.5581 67.1496 53.319 51.9839 70.7396 51.9839C88.1603 51.9839 88.0893 82.1585 104.485 82.1585C120.88 82.1585 123.1 58.0188 143.08 73.1061C163.06 88.1934 169.784 124.403 174.16 131.444C178.536 138.484 198.58 146.531 211.9 131.444C227.925 113.292 234.599 76.7647 243.964 62.0421C253.329 47.3195 267.4 44.9432 280.72 32.8734C294.04 20.8035 291.82 1.69299 313.704 1.69299C335.587 1.69299 332.096 52.9897 349.698 52.9897C367.3 52.9897 362.86 24.8268 383.443 32.8734C404.026 40.9199 409.149 88.5898 419.438 103.281C429.727 117.972 445 135.467 460.54 127.42C476.08 119.374 484.436 63.2471 491.62 52.9897C498.804 42.7324 505.385 32.8734 522.922 32.8734C540.46 32.8734 549.34 45.949 558.22 53.9955C567.1 62.0421 573.76 82.1585 592.662 73.1061C611.564 64.0537 607.06 22.8152 628.657 22.8152C650.254 22.8152 653.664 70.8882 662.56 81.1526C671.456 91.417 675.88 105.292 698.396 103.281C720.913 101.269 722.5 84.1701 735.82 67.0712C749.14 49.9723 753.58 22.8152 768.136 22.8152C782.692 22.8152 786.88 37.9025 801.881 32.8734C816.882 27.8443 828.261 4.46625 837.876 1.69299C847.49 -1.08026 847.93 4.71043 861.25 14.7686C874.57 24.8268 873.46 38.9083 890.11 57.013C902.065 77.1294 905.46 81.1526 924.52 81.1526C943.58 81.1526 937.395 45.4461 955.6 45.4461C973.805 45.4461 1000 55.5043 1000 55.5043" 
                    stroke="#FF1807" 
                    strokeWidth="2" 
                    fill="none"
                  />
                </svg>
              </div>
              <div style={styles.xAxis}>
                {months.map((month, index) => (
                  <span key={index} style={styles.xLabel}>{month}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Financial Section */}
          <h2 style={styles.sectionTitle}>Financial</h2>

          <div style={styles.chartContainerFull}>
            <h3 style={styles.chartTitle}>Monthly Transaction Trends</h3>
            <div style={styles.lineChartContainer}>
              <div style={styles.yAxis}>
                <span>50</span>
                <span>40</span>
                <span>30</span>
                <span>20</span>
                <span>10</span>
              </div>
              <div style={styles.chartArea}>
                <div style={styles.gridLines}>
                  <div style={styles.gridLine}></div>
                  <div style={styles.gridLine}></div>
                  <div style={styles.gridLine}></div>
                  <div style={styles.gridLine}></div>
                  <div style={styles.gridLine}></div>
                </div>
                <svg style={styles.diseaseTrendLine} viewBox="0 0 1000 150" preserveAspectRatio="none">
                  {/* Revenue Line */}
                  <path 
                    d="M1 126.471C1 126.471 8.79513 108.845 28.957 93.986C49.1189 79.1266 75.5224 30.8741 92.398 30.8741C109.274 30.8741 121.677 71.2042 137.559 71.2042C153.442 71.2042 180.57 71.0825 199.925 86.0196C219.28 100.957 225.794 136.806 230.033 143.776C234.271 150.747 254.764 154.73 267.667 139.793C283.191 121.823 288.58 89.6418 297.652 75.0657C306.725 60.4897 320.355 58.1371 333.259 46.1874C346.162 34.2378 373.35 1 394.549 1C415.748 1 420.509 67.0993 437.56 67.0993C454.611 67.0993 447.697 38.221 467.636 46.1874C487.575 54.1539 473.829 101.349 483.796 115.894C493.763 130.438 507.452 147.759 522.506 139.793C537.56 131.827 530.601 76.2587 537.56 66.1035C544.519 55.9483 546.378 26.2713 563.366 26.2713C580.355 26.2713 593.474 59.1329 602.076 67.0993C610.678 75.0657 617.13 94.9818 635.441 86.0196C653.751 77.0574 649.388 36.2294 670.309 36.2294C691.23 36.2294 694.534 83.8238 703.151 93.986C711.769 104.148 716.055 117.885 737.867 115.894C759.679 113.902 761.216 96.9734 774.119 80.0448C787.023 63.1161 791.324 36.2294 805.424 36.2294C819.525 36.2294 838.082 51.1665 852.614 46.1874C867.146 41.2084 872.982 15.3175 872.982 15.3175C882.295 12.5719 892.399 16.3133 905.302 26.2713C918.206 36.2294 928.958 46.1874 940.54 66.1035C952.121 86.0196 954.765 125.852 973.229 125.852C991.693 125.852 977.346 27.8867 999.926 21.414" 
                    stroke="#4CAF50" 
                    strokeWidth="2" 
                    fill="none"
                  />
                  {/* Expenses Line */}
                  <path 
                    d="M1 102.275C1 102.275 13.9319 97.1673 34.745 82.1585C55.5581 67.1496 53.319 51.9839 70.7396 51.9839C88.1603 51.9839 88.0893 82.1585 104.485 82.1585C120.88 82.1585 123.1 58.0188 143.08 73.1061C163.06 88.1934 169.784 124.403 174.16 131.444C178.536 138.484 198.58 146.531 211.9 131.444C227.925 113.292 234.599 76.7647 243.964 62.0421C253.329 47.3195 267.4 44.9432 280.72 32.8734C294.04 20.8035 291.82 1.69299 313.704 1.69299C335.587 1.69299 332.096 52.9897 349.698 52.9897C367.3 52.9897 362.86 24.8268 383.443 32.8734C404.026 40.9199 409.149 88.5898 419.438 103.281C429.727 117.972 445 135.467 460.54 127.42C476.08 119.374 484.436 63.2471 491.62 52.9897C498.804 42.7324 505.385 32.8734 522.922 32.8734C540.46 32.8734 549.34 45.949 558.22 53.9955C567.1 62.0421 573.76 82.1585 592.662 73.1061C611.564 64.0537 607.06 22.8152 628.657 22.8152C650.254 22.8152 653.664 70.8882 662.56 81.1526C671.456 91.417 675.88 105.292 698.396 103.281C720.913 101.269 722.5 84.1701 735.82 67.0712C749.14 49.9723 753.58 22.8152 768.136 22.8152C782.692 22.8152 786.88 37.9025 801.881 32.8734C816.882 27.8443 828.261 4.46625 837.876 1.69299C847.49 -1.08026 847.93 4.71043 861.25 14.7686C874.57 24.8268 873.46 38.9083 890.11 57.013C902.065 77.1294 905.46 81.1526 924.52 81.1526C943.58 81.1526 937.395 45.4461 955.6 45.4461C973.805 45.4461 1000 55.5043 1000 55.5043" 
                    stroke="#D9392D" 
                    strokeWidth="2" 
                    fill="none"
                  />
                  {/* Profit Line */}
                  <path 
                    d="M1 63.5638C1 63.5638 13.8653 58.521 34.5711 43.7023C55.277 28.8836 53.0494 13.91 70.3803 13.91C87.7113 13.91 87.6406 43.7023 103.951 43.7023C120.262 43.7023 122.471 19.8685 142.348 34.7646C162.225 49.6608 156.704 63.5638 173.268 64.5569C205.108 66.4658 229.461 49.6608 242.712 34.7646C258.655 16.8434 293.152 63.7003 302.469 49.1642C311.786 34.6281 332.284 50.1573 345.536 38.2404C358.787 26.3235 370.145 43.7023 391.915 43.7023C413.686 43.7023 426.306 49.1642 443.817 49.1642C461.328 49.1642 499.756 56.6123 520.233 64.5569C540.711 72.5015 539.592 12.8118 549.828 27.3165C560.064 41.8213 555.349 72.5015 570.809 64.5569C586.269 56.6123 605.625 37.4439 612.772 27.3165C619.919 17.1891 615.202 49.1642 632.649 49.1642C658.047 29.3027 650.317 51.6469 659.152 59.5915C667.986 67.5361 680.133 53.6331 719.887 43.7023C740.868 43.7023 736.451 80.4461 749.703 63.5638C762.954 46.6815 768.35 63.5638 782.831 63.5638C797.312 63.5638 806.557 54.1296 821.481 49.1642C836.405 44.1988 837.314 66.3019 846.879 63.5638C856.444 60.8257 849.088 20.8615 862.339 30.7923C875.591 40.7231 891.051 -4.95845 902.944 14.9031C914.838 34.7646 916.26 47.1781 935.222 47.1781C954.184 47.1781 951.343 1 969.454 1C987.566 1 1007 12.9169 1007 12.9169" 
                    stroke="#1B81D2" 
                    strokeWidth="2" 
                    fill="none"
                  />
                </svg>
              </div>
              <div style={styles.xAxis}>
                {months.map((month, index) => (
                  <span key={index} style={styles.xLabel}>{month}</span>
                ))}
              </div>
            </div>
            
            {/* Legend */}
            <div style={styles.financialLegend}>
              <div style={styles.legendItem}>
                <div style={{...styles.legendColor, backgroundColor: '#4CAF50'}}></div>
                <span style={styles.legendLabel}>Revenue</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{...styles.legendColor, backgroundColor: '#D9392D'}}></div>
                <span style={styles.legendLabel}>Expenses</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{...styles.legendColor, backgroundColor: '#1B81D2'}}></div>
                <span style={styles.legendLabel}>Profit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
