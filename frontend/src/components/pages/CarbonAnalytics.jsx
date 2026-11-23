import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { exportCarbonAnalytics } from '../../utils/exportData';
import { apiFetch } from "../../utils/apiFetch";
import { toast } from 'react-toastify';

const emissionSources = [
  { name: 'Fertilizer', color: '#4CAF50', percentage: 30, className: 'fertilizer' },
  { name: 'Machinery', color: '#FF9800', percentage: 30, className: 'machinery' },
  { name: 'Transport', color: '#2196F3', percentage: 16, className: 'transport' },
  { name: 'Others', color: '#F44336', percentage: 24, className: 'others' },
];

const generatePieSlices = (sources) => {
  const cx = 85.5, cy = 85.5, r = 85.5;
  let startAngle = -Math.PI / 2;
  return sources.map(source => {
    const sliceAngle = (source.percentage / 100) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const d = `M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    startAngle = endAngle;
    return { ...source, d };
  });
};

const CarbonAnalytics = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedTimeframe, setSelectedTimeframe] = useState('Last 6 months');
  const [monthlyLabels, setMonthlyLabels] = useState([]);
  const [monthlyValues, setMonthlyValues] = useState([]);

  const [lineTooltip, setLineTooltip] = useState(null);
  const [pieTooltip, setPieTooltip] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const lineChartSvgRef = useRef(null);

  const [carbonStats, setCarbonStats] = useState([
    { title: 'Total CO2e', value: '-', color: '#4CAF50' },
    { title: 'Avg. per Farmer', value: '-', color: '#4CAF50' },
    { title: 'Current Reduction', value: '-', color: '#4CAF50' },
  ]);
  const [topFarmers, setTopFarmers] = useState([]);

  const formatNumber = (value, unit = "") => {
    if (value === null || value === undefined) return "-";
    if (isNaN(value)) return "-";
    return `${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}${unit ? ` ${unit}` : ""}`;
  };

  useEffect(() => {
    const fetchCarbonStats = async () => {
      try {
        const res = await apiFetch(`${import.meta.env.VITE_API_URL}/carbon/carbon-stats`);
        const data = await res.json();

        setCarbonStats([
          { title: 'Total CO2e', value: formatNumber(data.totalCO2e, "kg"), color: '#4CAF50' },
          { title: 'Avg. per Farmer', value: formatNumber(data.avgPerFarmer, "kg"), color: '#4CAF50' },
          { title: 'Current Reduction', value: formatNumber(data.currentReduction, "%"), color: '#4CAF50' },
        ]);

        const resTop = await apiFetch(`${import.meta.env.VITE_API_URL}/carbon/top-farmers`);
        const dataTop = await resTop.json();
        setTopFarmers(dataTop.topFarmers || []);

        const fetchMonthlyEmissions = async () => {
          try {
            const year = new Date().getFullYear();
            const res = await apiFetch(
              `${import.meta.env.VITE_API_URL}/carbon/monthly-emissions?year=${year}`
            );
            const data = await res.json();
            setMonthlyLabels(data.labels || []);
            setMonthlyValues(data.values || []);
          } catch (err) {
            console.error('Error fetching monthly emissions:', err);
          }
        };
        fetchMonthlyEmissions();
      } catch (err) {
        console.error('Error fetching carbon stats:', err);
      }
    };

    fetchCarbonStats();
  }, []);

  const handleExportData = () => {
    exportCarbonAnalytics(topFarmers);
    toast.success('Carbon analytics data exported successfully!');
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleRegionChange = (e) => {
    setSelectedRegion(e.target.value);
  };

  const handleTimeframeChange = (e) => {
    setSelectedTimeframe(e.target.value);
  };

  const generateLinePath = (values, width = 458, height = 141) => {
    if (!values || values.length === 0) return "";
    const maxValue = Math.max(...values) || 1;
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - (v / maxValue) * height;
      return [x, y];
    });
    return points.map(([x, y], i) => (i === 0 ? `M${x} ${y}` : `L${x} ${y}`)).join(" ");
  };

  // --- Line chart hover ---
  const handleLineSVGMouseMove = (e) => {
    if (!lineChartSvgRef.current || monthlyValues.length === 0) return;
    const svg = lineChartSvgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());
    const width = 458;
    const height = 141;
    const index = Math.min(
      monthlyValues.length - 1,
      Math.max(0, Math.round((svgPoint.x / width) * (monthlyValues.length - 1)))
    );
    const x = (index / (monthlyValues.length - 1)) * width;
    const maxVal = Math.max(...monthlyValues.map(v => Number(v) || 0), 1);
    const y = height - (Number(monthlyValues[index]) / maxVal) * height;
    setLineTooltip({ x, y, index, value: monthlyValues[index], label: monthlyLabels[index] });
  };

  const handleLineSVGMouseLeave = () => setLineTooltip(null);

  // --- Pie chart hover ---
  const handleSliceMouseEnter = (source, e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setPieTooltip(source);
  };

  const handleSliceMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleSliceMouseLeave = () => setPieTooltip(null);

  const pieSlices = generatePieSlices(emissionSources);

  // Tooltip x clamped so it never goes off the right edge
  const tooltipX = lineTooltip
    ? lineTooltip.x > 358 ? lineTooltip.x - 90 : lineTooltip.x + 10
    : 0;
  const tooltipY = lineTooltip ? Math.max(4, lineTooltip.y - 32) : 0;

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />

        <div className="dashboard-content">
          {/* Page Header */}
          <div className="carbon-page-header">
            <div className="page-title-section">
              <h1 className="carbon-page-title">Carbon Analytics</h1>
              <p className="carbon-page-subtitle">Monitor carbon emissions and track sustainability progress</p>
            </div>
            <button className="export-data-btn" onClick={handleExportData}>
              <svg className="export-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19 13V18C19 18.55 18.55 19 18 19H6C5.45 19 5 18.55 5 18V13C5 12.45 4.55 12 4 12C3.45 12 3 12.45 3 13V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13C21 12.45 20.55 12 20 12C19.45 12 19 12.45 19 13ZM13 12.67L14.88 10.79C15.27 10.4 15.9 10.4 16.29 10.79C16.68 11.18 16.68 11.81 16.29 12.2L12.7 15.79C12.31 16.18 11.68 16.18 11.29 15.79L7.7 12.2C7.31 11.81 7.31 11.18 7.7 10.79C8.09 10.4 8.72 10.4 9.11 10.79L11 12.67V4C11 3.45 11.45 3 12 3C12.55 3 13 3.45 13 4V12.67Z" fill="white"/>
              </svg>
              <span>Export Data</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="carbon-stats-grid">
            {carbonStats.map((stat, index) => (
              <div key={index} className="carbon-stats-card">
                <div className="carbon-stats-value" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="carbon-stats-title">{stat.title}</div>
              </div>
            ))}
          </div>

          {/* Filters Section */}
          <div className="carbon-filters-section">
            <div className="search-container">
              <svg className="search-filter-icon" width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M20.6667 18.6667H19.6133L19.24 18.3067C20.5467 16.7867 21.3333 14.8133 21.3333 12.6667C21.3333 7.88 17.4533 4 12.6667 4C7.88 4 4 7.88 4 12.6667C4 17.4533 7.88 21.3333 12.6667 21.3333C14.8133 21.3333 16.7867 20.5467 18.3067 19.24L18.6667 19.6133V20.6667L25.3333 27.32L27.32 25.3333L20.6667 18.6667ZM12.6667 18.6667C9.34667 18.6667 6.66667 15.9867 6.66667 12.6667C6.66667 9.34667 9.34667 6.66667 12.6667 6.66667C15.9867 6.66667 18.6667 9.34667 18.6667 12.6667C18.6667 15.9867 15.9867 18.6667 12.6667 18.6667Z" fill="#787878"/>
              </svg>
              <input
                type="text"
                className="search-filter-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>

            <div className="filter-dropdown-container">
              <select
                className="filter-dropdown"
                value={selectedRegion}
                onChange={handleRegionChange}
              >
                <option value="All Regions">All Regions</option>
                <option value="Nairobi">Nairobi</option>
                <option value="Kiambu">Kiambu</option>
                <option value="Mombasa">Mombasa</option>
                <option value="Meru">Meru</option>
              </select>
              <svg className="dropdown-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
              </svg>
            </div>

            <div className="filter-dropdown-container">
              <select
                className="filter-dropdown"
                value={selectedTimeframe}
                onChange={handleTimeframeChange}
              >
                <option value="Last 6 months">Last 6 months</option>
                <option value="Last 3 months">Last 3 months</option>
                <option value="Last year">Last year</option>
                <option value="Custom range">Custom range</option>
              </select>
              <svg className="dropdown-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
              </svg>
            </div>
          </div>

          {/* Charts Section */}
          <div className="carbon-charts-section">
            {/* Monthly Emissions Trends Chart */}
            <div className="carbon-chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Monthly Emissions Trends</h3>
              </div>

              <div className="line-chart-container">
                {/* Y-axis labels */}
                <div className="y-axis-labels">
                  {Array.from({ length: 5 }, (_, i) => {
                    const max = Math.max(...monthlyValues.map(v => Number(v) || 0), 1);
                    return <span key={i} className="y-label">{Math.round(max - (i * max / 4))}</span>;
                  })}
                </div>

                {/* Chart area */}
                <div className="chart-area">
                  <div className="grid-lines-container">
                    <div className="grid-line"></div>
                    <div className="grid-line"></div>
                    <div className="grid-line"></div>
                    <div className="grid-line"></div>
                    <div className="grid-line"></div>
                  </div>

                  {/* Interactive line chart SVG */}
                  <svg
                    ref={lineChartSvgRef}
                    className="emissions-line-chart"
                    viewBox="0 0 458 141"
                    preserveAspectRatio="none"
                    onMouseMove={handleLineSVGMouseMove}
                    onMouseLeave={handleLineSVGMouseLeave}
                    style={{ cursor: monthlyValues.length > 0 ? 'crosshair' : 'default' }}
                  >
                    <defs>
                      <linearGradient id="emissionsGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#245421"/>
                        <stop offset="100%" stopColor="#4CAF50"/>
                      </linearGradient>
                      <filter id="lineTipShadow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15"/>
                      </filter>
                    </defs>

                    {/* Main line */}
                    <path
                      d={generateLinePath(monthlyValues)}
                      stroke="url(#emissionsGradient)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />

                    {/* Hover indicator */}
                    {lineTooltip && (
                      <>
                        {/* Vertical guide line */}
                        <line
                          x1={lineTooltip.x} y1={0}
                          x2={lineTooltip.x} y2={141}
                          stroke="#CFCFCF"
                          strokeWidth="1"
                          strokeDasharray="4,3"
                        />
                        {/* Data point dot */}
                        <circle
                          cx={lineTooltip.x}
                          cy={lineTooltip.y}
                          r="5"
                          fill="#4CAF50"
                          stroke="white"
                          strokeWidth="2"
                        />
                        {/* Tooltip box */}
                        <g transform={`translate(${tooltipX}, ${tooltipY})`} filter="url(#lineTipShadow)">
                          <rect width="84" height="30" rx="5" fill="white" stroke="#e8e8e8" strokeWidth="0.75"/>
                          <text x="42" y="12" textAnchor="middle" fontSize="8.5" fill="#888" fontFamily="Inter, sans-serif">
                            {lineTooltip.label}
                          </text>
                          <text x="42" y="24" textAnchor="middle" fontSize="9.5" fill="#4CAF50" fontFamily="Inter, sans-serif" fontWeight="600">
                            {Number(lineTooltip.value).toLocaleString()} kg
                          </text>
                        </g>
                      </>
                    )}
                  </svg>
                </div>

                {/* X-axis labels */}
                <div className="x-axis-labels">
                  {monthlyLabels.map((label, index) => (
                    <span key={index} className="x-label">{label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Emissions Sources Chart */}
            <div className="carbon-chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Emissions Sources</h3>
              </div>

              <div className="pie-chart-content">
                <div className="pie-chart-wrapper">
                  <svg
                    className="emissions-pie-chart"
                    viewBox="0 0 171 171"
                  >
                    {pieSlices.map((slice, i) => (
                      <path
                        key={i}
                        d={slice.d}
                        fill={slice.color}
                        className="pie-slice"
                        onMouseEnter={(e) => handleSliceMouseEnter(slice, e)}
                        onMouseMove={handleSliceMouseMove}
                        onMouseLeave={handleSliceMouseLeave}
                      />
                    ))}
                  </svg>
                </div>

                <div className="pie-chart-legend">
                  {emissionSources.map((source, i) => (
                    <div key={i} className="legend-item">
                      <div className={`legend-color-bar ${source.className}`}></div>
                      <span className="legend-text">{source.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Carbon-Efficient Farmers Section */}
          <div className="top-farmers-section">
            <h3 className="section-title">Top Carbon-Efficient Farmers</h3>

            <div className="farmers-grid">
              {topFarmers.map((farmer) => (
                <div key={farmer.id} className="farmer-card">
                  <div className="farmer-header">
                    <div className="farmer-rank">
                      <div className="rank-circle">
                        <span className="rank-number">{farmer.rank}</span>
                      </div>
                    </div>
                    <div className="farmer-info">
                      <h4 className="farmer-name">{farmer.name}</h4>
                      <p className="farmer-location">{farmer.subCounty}</p>
                    </div>
                  </div>

                  <div className="farmer-metrics">
                    <div className="metric-row">
                      <span className="metric-label">Carbon Score</span>
                      <span className="metric-valueag">
                        {farmer.carbonScore} {farmer.carbonUnit || "t"}
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Reduction</span>
                      <span className="metric-valueag">{farmer.reduction}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pie chart floating tooltip */}
      {pieTooltip && (
        <div
          className="pie-chart-tooltip"
          style={{ left: mousePos.x + 14, top: mousePos.y - 48 }}
        >
          <span className="pie-tooltip-name">{pieTooltip.name}</span>
          <span className="pie-tooltip-percentage">{pieTooltip.percentage}%</span>
        </div>
      )}
    </div>
  );
};

export default CarbonAnalytics;
