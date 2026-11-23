import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from "../utils/apiFetch";


const UserEngagement = () => {
  const [featureData, setFeatureData] = useState([]);
  const [engagementData, setEngagementData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEngagement, setLoadingEngagement] = useState(true);

  // Bar chart tooltip state
  const [barTooltip, setBarTooltip] = useState(null);
  const barChartRef = useRef(null);

  // Pie chart tooltip state
  const [pieTooltip, setPieTooltip] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchFeatureUsageData();
    fetchEngagementTrends();
  }, []);

  const fetchEngagementTrends = async () => {
    try {
      setLoadingEngagement(true);
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/analytics/engagement-trends`);
      if (!response.ok) throw new Error('Failed to fetch engagement trends');
      const data = await response.json();

      if (data && Array.isArray(data.trends)) {
        const formattedData = data.trends.map(item => ({
          month: item.month,
          farmers: item.totalFarmersRegistered || 0,
          chatbot: item.chatbotInteractions || 0,
          scanned: item.diseasesScanned || 0
        }));
        setEngagementData(formattedData);
      } else throw new Error('Invalid data format');
    } catch (error) {
      console.error('Error fetching engagement trends:', error);
      setEngagementData([
        { month: 'Jan', farmers: 245, chatbot: 1420, scanned: 890 },
        { month: 'Feb', farmers: 312, chatbot: 1680, scanned: 1050 },
      ]);
    } finally {
      setLoadingEngagement(false);
    }
  };

  const fetchFeatureUsageData = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/analytics/feature-usage`);
      if (!response.ok) throw new Error('Failed to fetch feature usage');
      const data = await response.json();

      if (data && Array.isArray(data.features)) {
        setFeatureData(data.features);
      } else throw new Error('Invalid data format');
    } catch (error) {
      console.error('Error fetching feature usage data:', error);
      setFeatureData([
        { name: 'Disease Scanned', count: 2450, color: '#8159E1' },
        { name: 'Chatbot Interactions', count: 1980, color: '#2196F3' },
        { name: 'Carbon Tracking', count: 1350, color: '#FF9800' },
        { name: 'Financial Records', count: 1620, color: '#4CAF50' },
        { name: 'Weather Alerts', count: 890, color: '#F44336' },
        { name: 'Yield Tracking', count: 1100, color: '#9C27B0' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const maxFarmers = Math.max(...engagementData.map(d => d.farmers), 1);
  const maxChatbot = Math.max(...engagementData.map(d => d.chatbot), 1);
  const maxScanned = Math.max(...engagementData.map(d => d.scanned), 1);

  const calculateBarHeight = (value, type) => {
    const chartHeight = 150;
    let max = 1;
    if (type === 'farmers') max = maxFarmers;
    if (type === 'chatbot') max = maxChatbot;
    if (type === 'scanned') max = maxScanned;
    return `${(value / max) * chartHeight}px`;
  };

  // Bar tooltip handlers
  const barTypeLabels = {
    farmers: 'Farmers Registered',
    chatbot: 'Chatbot Interactions',
    scanned: 'Diseases Scanned',
  };

  const handleBarMouseEnter = (e, item, type) => {
    const container = barChartRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const barRect = e.currentTarget.getBoundingClientRect();
    setBarTooltip({
      x: barRect.left - containerRect.left + barRect.width / 2,
      y: barRect.top - containerRect.top,
      label: `${barTypeLabels[type]} — ${item.month}`,
      value: item[type].toLocaleString(),
    });
  };

  const handleBarMouseLeave = () => setBarTooltip(null);

  // Pie chart helpers
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

  const calculatePieSegments = () => {
    if (featureData.length === 0) return [];
    const total = featureData.reduce((sum, item) => sum + item.count, 0);
    let currentAngle = 0;
    return featureData.map(item => {
      const percentage = (item.count / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      return {
        ...item,
        percentage: percentage.toFixed(1),
        startAngle,
        endAngle,
        path: createPieSlice(85.5, 85.5, 85.5, startAngle, endAngle)
      };
    });
  };

  const pieSegments = calculatePieSegments();

  // Pie tooltip handlers
  const handleSliceMouseEnter = (e, segment) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setPieTooltip(segment);
  };
  const handleSliceMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
  const handleSliceMouseLeave = () => setPieTooltip(null);

  // Y-axis
  const maxValue = Math.max(maxFarmers, maxChatbot, maxScanned, 1);
  const numSteps = 5;
  const step = Math.ceil(maxValue / numSteps);
  const yAxisLabels = Array.from({ length: numSteps + 1 }, (_, i) => i * step);

  return (
    <div className="user-engagement-container">
      <div className="engagement-charts-row">
        {/* Farmer Engagement Trends */}
        <div className="engagement-chart-card farmer-engagement-trends">
          <div className="chart-header">
            <h3 className="chart-title">Farmer Engagement Trends</h3>
          </div>

          {loadingEngagement ? (
            <div className="loading-state"><p>Loading engagement trends...</p></div>
          ) : (
            <div className="farmer-engagement-chart">
              <div className="chart-grid">
                <div className="y-axis-labels">
                  {yAxisLabels.slice().reverse().map((label, idx) => (
                    <span key={idx} className="y-label">{label}</span>
                  ))}
                </div>

                {/* Bar chart area with tooltip container */}
                <div className="chart-area engagement-bar-chart-area" ref={barChartRef}>
                  <div className="grid-lines-container">
                    {yAxisLabels.map((_, idx) => <div key={idx} className="grid-line" />)}
                  </div>

                  {/* Bar tooltip */}
                  {barTooltip && (
                    <div
                      className="chart-tooltip bar-chart-tooltip"
                      style={{ left: barTooltip.x, top: barTooltip.y }}
                    >
                      <span className="chart-tooltip-label">{barTooltip.label}</span>
                      <span className="chart-tooltip-value">{barTooltip.value}</span>
                    </div>
                  )}

                  <div className="bars-container">
                    {engagementData.map((item, idx) => (
                      <div key={idx} className="bar-group">
                        <div className="bar-set">
                          <div
                            className="engagement-bar farmers-bar"
                            style={{ height: calculateBarHeight(item.farmers, 'farmers') }}
                            onMouseEnter={(e) => handleBarMouseEnter(e, item, 'farmers')}
                            onMouseLeave={handleBarMouseLeave}
                          />
                          <div
                            className="engagement-bar chatbot-bar"
                            style={{ height: calculateBarHeight(item.chatbot, 'chatbot') }}
                            onMouseEnter={(e) => handleBarMouseEnter(e, item, 'chatbot')}
                            onMouseLeave={handleBarMouseLeave}
                          />
                          <div
                            className="engagement-bar scanned-bar"
                            style={{ height: calculateBarHeight(item.scanned, 'scanned') }}
                            onMouseEnter={(e) => handleBarMouseEnter(e, item, 'scanned')}
                            onMouseLeave={handleBarMouseLeave}
                          />
                        </div>
                        <span className="bar-label">{item.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="engagement-legend">
                <div className="legend-item">
                  <div className="legend-color-indicator farmers" />
                  <span className="legend-text">Farmers Registered</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color-indicator chatbot-trend" />
                  <span className="legend-text">Chatbot Interactions</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color-indicator scanned" />
                  <span className="legend-text">Diseases Scanned</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feature Usage */}
        <div className="engagement-chart-card feature-usage-card">
          <div className="chart-header">
            <h3 className="chart-title">Feature Usage</h3>
          </div>
          {loading ? (
            <div className="loading-state"><p>Loading...</p></div>
          ) : (
            <div className="feature-usage-content">
              <div className="pie-chart-wrapper">
                <svg className="feature-usage-pie-chart" viewBox="0 0 171 171" style={{ overflow: 'visible' }}>
                  {pieSegments.map((segment, index) => (
                    <path
                      key={index}
                      d={segment.path}
                      fill={segment.color}
                      className="pie-slice"
                      onMouseEnter={(e) => handleSliceMouseEnter(e, segment)}
                      onMouseMove={handleSliceMouseMove}
                      onMouseLeave={handleSliceMouseLeave}
                    />
                  ))}
                </svg>
              </div>
              <div className="feature-usage-legend">
                {pieSegments.map((segment, idx) => (
                  <div
                    key={idx}
                    className="legend-item"
                    onMouseEnter={(e) => handleSliceMouseEnter(e, segment)}
                    onMouseMove={handleSliceMouseMove}
                    onMouseLeave={handleSliceMouseLeave}
                  >
                    <div className="legend-color-indicator" style={{ backgroundColor: segment.color }} />
                    <span className="legend-text">{segment.name}</span>
                    <span className="pie-slice-percentage">{segment.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature Usage floating pie tooltip */}
      {pieTooltip && (
        <div
          className="pie-chart-tooltip"
          style={{ left: mousePos.x + 14, top: mousePos.y - 48 }}
        >
          <span className="pie-tooltip-name">{pieTooltip.name}</span>
          <span className="pie-tooltip-percentage">{pieTooltip.count.toLocaleString()} uses</span>
        </div>
      )}
    </div>
  );
};

export default UserEngagement;
