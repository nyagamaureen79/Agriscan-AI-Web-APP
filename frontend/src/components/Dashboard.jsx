import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import StatsCard from './StatsCard';
import TabNavigation from './TabNavigation';
import { BarChart, PieChart, LineChart, computeYAxis } from './ChartComponents';
import QuickStats from './QuickStats';
import { apiFetch } from "../utils/apiFetch";
import UserEngagement from './UserEngagement';
import UsageAnalytics from './UsageAnalytics';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('Disease Detection');
  const [statsData, setStatsData] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [timeFilter, setTimeFilter] = useState('This Month');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const dropdownRef = useRef(null);


  // Disease Detection data states
const [cropData, setCropData] = useState([]);
const [diseaseData, setDiseaseData] = useState([]);
const [diseaseTrendLabels, setDiseaseTrendLabels] = useState([]);
const [diseaseTrendValues, setDiseaseTrendValues] = useState([]);
const [loadingDiseaseData, setLoadingDiseaseData] = useState(false);


  // Carbon Analytics data states
  const [carbonStats, setCarbonStats] = useState([
    { title: 'Total CO2e', value: '-', color: '#4CAF50' },
    { title: 'Avg. per Farmer', value: '-', color: '#4CAF50' },
    { title: 'Current Reduction', value: '-', color: '#4CAF50' },
  ]);
  const [monthlyLabels, setMonthlyLabels] = useState([]);
  const [monthlyValues, setMonthlyValues] = useState([]);
  const [topFarmers, setTopFarmers] = useState([]);
  const [loadingCarbonStats, setLoadingCarbonStats] = useState(false);
  const [emissionSourcesData, setEmissionSourcesData] = useState([]);
  const [emissionSourcesError, setEmissionSourcesError] = useState(false);

  // Carbon Sequestration data states
  const [seqStats, setSeqStats] = useState([
    { title: 'Total Sequestered', value: '-', color: '#4CAF50' },
    { title: 'Avg. per Farmer', value: '-', color: '#4CAF50' },
    { title: 'Net Carbon Balance', value: '-', color: '#245421' },
  ]);
  const [seqMonthlyLabels, setSeqMonthlyLabels] = useState([]);
  const [seqMonthlyValues, setSeqMonthlyValues] = useState([]);
  const [seqSourcesData, setSeqSourcesData] = useState([]);
  const [seqSourcesError, setSeqSourcesError] = useState(false);
  const [loadingSeqStats, setLoadingSeqStats] = useState(false);
  const [seqLineTooltip, setSeqLineTooltip] = useState(null);
  const [seqPieTooltip, setSeqPieTooltip] = useState(null);

  // Chart tooltip state
  const [lineTooltip, setLineTooltip] = useState(null);
  const [pieTooltip, setPieTooltip] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const lineChartSvgRef = useRef(null);
  const seqLineChartSvgRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch carbon analytics data when tab becomes active
  useEffect(() => {
    if (activeTab === 'Emission Analytics') {
      const fetchCarbonData = async () => {
        setLoadingCarbonStats(true);

        try {
          // Fetch carbon stats
          const statsRes = await apiFetch(`${import.meta.env.VITE_API_URL}/carbon/carbon-stats`);
          const statsData = await statsRes.json();
          setCarbonStats([
            { title: 'Total CO2e', value: formatCarbonValue(statsData.totalCO2e, 'kg'), color: '#EA580C' },
            { title: 'Avg. per Farmer', value: formatCarbonValue(statsData.avgPerFarmer, 'kg'), color: '#16A34A' },
            { title: 'Current Reduction', value: formatCarbonValue(statsData.currentReduction, '%'), color: '#2563EB' },
          ]);



          // Fetch top farmers
          const farmersRes = await apiFetch(`${import.meta.env.VITE_API_URL}/carbon/top-farmers`);
          const farmersData = await farmersRes.json();
          setTopFarmers(farmersData.topFarmers || []);

          // Fetch monthly emissions
          const year = new Date().getFullYear();
          const monthlyRes = await apiFetch(`${import.meta.env.VITE_API_URL}/carbon/monthly-emissions?year=${year}`);
          const monthlyData = await monthlyRes.json();
          setMonthlyLabels(monthlyData.labels || []);
          setMonthlyValues(monthlyData.values || []);

          // Fetch emission sources
          try {
            const sourcesRes = await apiFetch(`${import.meta.env.VITE_API_URL}/carbon/emission-sources`);
            if (sourcesRes.ok) {
              const sourcesData = await sourcesRes.json();
              setEmissionSourcesData(sourcesData.sources || sourcesData || []);
            } else {
              setEmissionSourcesError(true);
            }
          } catch (e) {
            console.error('Error fetching emission sources:', e);
            setEmissionSourcesError(true);
          }

          setLoadingCarbonStats(false);
        } catch (error) {
          console.error('Error fetching carbon data:', error);
          setLoadingCarbonStats(false);
        }
      };
      fetchCarbonData();
    }
  }, [activeTab]);

  // Fetch carbon sequestration data when tab becomes active
  useEffect(() => {
    if (activeTab === 'Carbon Sequestration') {
      const fetchSeqData = async () => {
        setLoadingSeqStats(true);
        try {
          const statsRes = await apiFetch(`${import.meta.env.VITE_API_URL}/carbon/sequestration-stats`);
          const statsData = await statsRes.json();
          setSeqStats([
            { title: 'Total Sequestered', value: formatCarbonValue(statsData.totalSequestered, 'kg'), color: '#16A34A' },
            { title: 'Avg. per Farmer', value: formatCarbonValue(statsData.avgPerFarmer, 'kg'), color: '#0D9488' },
            { title: 'Net Carbon Balance', value: formatCarbonValue(statsData.netBalance, 'kg'), color: '#7C3AED' },
          ]);

          const farmersRes = await apiFetch(`${import.meta.env.VITE_API_URL}/carbon/top-farmers`);
          const farmersData = await farmersRes.json();
          setTopFarmers(farmersData.topFarmers || []);

          const year = new Date().getFullYear();
          const monthlyRes = await apiFetch(`${import.meta.env.VITE_API_URL}/carbon/monthly-sequestration?year=${year}`);
          const monthlyData = await monthlyRes.json();
          const aligned = alignToLastSixMonths(monthlyData.labels || [], monthlyData.values || []);
          setSeqMonthlyLabels(aligned.labels);
          setSeqMonthlyValues(aligned.values);

          try {
            const sourcesRes = await apiFetch(`${import.meta.env.VITE_API_URL}/carbon/sequestration-sources`);
            if (sourcesRes.ok) {
              const sourcesData = await sourcesRes.json();
              setSeqSourcesData(sourcesData.sources || sourcesData || []);
            } else {
              setSeqSourcesError(true);
            }
          } catch (e) {
            console.error('Error fetching sequestration sources:', e);
            setSeqSourcesError(true);
          }

          setLoadingSeqStats(false);
        } catch (error) {
          console.error('Error fetching sequestration data:', error);
          setLoadingSeqStats(false);
        }
      };
      fetchSeqData();
    }
  }, [activeTab]);

 useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await apiFetch(
          `${import.meta.env.VITE_API_URL}/analytics/dashboard-stats`
        );
        const data = await res.json();

        // Map backend data into cards dynamically
        const cards = [
          {
            title: "Active Farmers",
            value: data.activeFarmers || "-",
            trendValue: data.trends.activeFarmers || "-",
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M16.67 13.13C18.04 14.06 19 15.32 19 17V20H23V17C23 14.82 19.43 13.53 16.67 13.13Z"
                  fill="#65758B"
                />
                <path
                  d="M9 12C11.2091 12 13 10.2091 13 8C13 5.79086 11.2091 4 9 4C6.79086 4 5 5.79086 5 8C5 10.2091 6.79086 12 9 12Z"
                  fill="#65758B"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C14.53 4 14.09 4.1 13.67 4.24C14.5 5.27 15 6.58 15 8C15 9.42 14.5 10.73 13.67 11.76C14.09 11.9 14.53 12 15 12Z"
                  fill="#65758B"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9 13C6.33 13 1 14.34 1 17V20H17V17C17 14.34 11.67 13 9 13Z"
                  fill="#65758B"
                />
              </svg>
            ),
          },
          {
            title: "Greenhouse Gas Emissions",
  value: data.carbonEmissions
    ? `${formatNumber(data.carbonEmissions)} kg`
    : "-",            trendValue: data.trends.carbonEmissions || "-",
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6.05001 8.05C3.32001 10.78 3.32001 15.2 6.03001 17.93C7.50001 14.53 10.12 11.69 13.39 10C10.62 12.34 8.68001 15.61 8.00001 19.32C10.6 20.55 13.8 20.1 15.95 17.95C19.43 14.47 20 4 20 4C20 4 9.53001 4.57 6.05001 8.05Z"
                  fill="#65758B"
                />
              </svg>
            ),
          },
          {
            title: "Carbon Sequestration",
  value: data.carbonSequestration
    ? `${formatNumber(data.carbonSequestration)} kg`
    : "-",            trendValue: data.trends.carbonSequestration || "-",
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z"
                  fill="#65758B"
                />
              </svg>
            ),
          },
          {
            title: "Disease Alerts",
              value: data.diseaseAlerts != null && data.diseaseAlerts !== 0 
         ? data.diseaseAlerts 
         : "-",  
             trendValue: data.trends.diseaseAlerts != null && data.trends.diseaseAlerts !== 0 
         ? data.trends.diseaseAlerts 
         : 12,
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z"
                  fill="#65758B"
                />
              </svg>
            ),
          },
          {
            title: "Chatbot Interactions",
   value: data.chatbotInteractions != null && data.chatbotInteractions !== 0
         ? data.chatbotInteractions
         : "-", 
           trendValue: data.trends.chatbotInteractions != null && data.trends.chatbotInteractions !== 0
         ? data.trends.chatbotInteractions
         : 45, 
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M16.6699 13.13C18.0399 14.06 18.9999 15.32 18.9999 17V20H22.9999V17C22.9999 14.82 19.4299 13.53 16.6699 13.13Z"
                  fill="#65758B"
                />
                <path
                  d="M9 12C11.2091 12 13 10.2091 13 8C13 5.79086 11.2091 4 9 4C6.79086 4 5 5.79086 5 8C5 10.2091 6.79086 12 9 12Z"
                  fill="#65758B"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M14.9999 12C17.2099 12 18.9999 10.21 18.9999 8C18.9999 5.79 17.2099 4 14.9999 4C14.5299 4 14.0899 4.1 13.6699 4.24C14.4999 5.27 14.9999 6.58 14.9999 8C14.9999 9.42 14.4999 10.73 13.6699 11.76C14.0899 11.9 14.5299 12 14.9999 12Z"
                  fill="#65758B"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9 13C6.33 13 1 14.34 1 17V20H17V17C17 14.34 11.67 13 9 13Z"
                  fill="#65758B"
                />
              </svg>
            ),
          },
        ];

        setStatsData(cards);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, []);


useEffect(() => {
  if (activeTab === 'Disease Detection') {
    const fetchDiseaseData = async () => {
      setLoadingDiseaseData(true);

      try {
        const API_BASE = import.meta.env.VITE_API_URL;

        // 1️ Most Scanned Crops
        const cropRes = await apiFetch(`${API_BASE}/diseases/most-scanned-crops`);
        const cropJson = await cropRes.json();
        setCropData(cropJson || []);

        // 2️ Top Diseases
        const diseaseRes = await apiFetch(`${API_BASE}/diseases/top-diseases`);
        const diseaseJson = await diseaseRes.json();
        setDiseaseData(diseaseJson || []);

        // 3️ Disease Trend
        const trendRes = await apiFetch(`${API_BASE}/diseases/disease-trend`);
        const trendJson = await trendRes.json();

        setDiseaseTrendLabels(trendJson.labels || []);
        setDiseaseTrendValues(trendJson.values || []);

      } catch (error) {
        console.error("Error fetching disease data:", error);
      } finally {
        setLoadingDiseaseData(false);
      }
    };

    fetchDiseaseData();
  }
}, [activeTab]);


const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";

  const number = Number(value);
  if (Number.isNaN(number)) return "-";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

const formatCarbonValue = (value, unit = "") => {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  if (unit === '%') return `${num.toFixed(1)}%`;
  const abs = Math.abs(num);
  let formatted;
  if (abs >= 1_000_000) {
    formatted = `${(num / 1_000_000).toFixed(2)}M`;
  } else if (abs >= 1_000) {
    formatted = `${(num / 1_000).toFixed(2)}K`;
  } else {
    formatted = num.toFixed(2);
  }
  return unit ? `${formatted} ${unit}` : formatted;
};

const formatYAxisLabel = (value) => {
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toString();
};

// Builds a rolling 6-month window (past 5 months + the current month), matching the
// Monthly Emissions Trends x-axis, so charts stay anchored to "now" regardless of what
// range the backend happens to return for the year.
const getLastSixMonthLabels = () => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const labels = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(monthNames[d.getMonth()]);
  }
  return labels;
};

const alignToLastSixMonths = (labels = [], values = []) => {
  const window = getLastSixMonthLabels();
  const byMonth = new Map();
  labels.forEach((label, i) => {
    const key = String(label).slice(0, 3).toLowerCase();
    byMonth.set(key, values[i]);
  });
  return {
    labels: window,
    values: window.map(m => Number(byMonth.get(m.toLowerCase())) || 0),
  };
};


 



  // --- Line chart hover handlers ---
  const handleLineSVGMouseMove = (e) => {
    if (!lineChartSvgRef.current || monthlyValues.length === 0) return;
    const svg = lineChartSvgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());
    const width = 458, height = 141;
    const index = Math.min(
      monthlyValues.length - 1,
      Math.max(0, Math.round((svgPoint.x / width) * (monthlyValues.length - 1)))
    );
    const x = (index / (monthlyValues.length - 1)) * width;
    const { max: niceMax } = computeYAxis(Math.max(...monthlyValues.map(v => Number(v) || 0), 1));
    const y = height - (Math.max(Number(monthlyValues[index]) || 0, 0) / niceMax) * height;
    setLineTooltip({ x, y, index, value: monthlyValues[index], label: monthlyLabels[index] });
  };
  const handleLineSVGMouseLeave = () => setLineTooltip(null);

  // --- Pie chart hover handlers ---
  const handleSliceMouseEnter = (source, e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setPieTooltip(source);
  };
  const handleSliceMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
  const handleSliceMouseLeave = () => setPieTooltip(null);

  // Sequestration line chart handlers
  const handleSeqLineSVGMouseMove = (e) => {
    if (!seqLineChartSvgRef.current || seqMonthlyValues.length === 0) return;
    const svg = seqLineChartSvgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());
    const width = 458, height = 141;
    const index = Math.min(
      seqMonthlyValues.length - 1,
      Math.max(0, Math.round((svgPoint.x / width) * (seqMonthlyValues.length - 1)))
    );
    const x = (index / (seqMonthlyValues.length - 1)) * width;
    const { max: niceMax } = computeYAxis(Math.max(...seqMonthlyValues.map(v => Number(v) || 0), 1));
    const y = height - (Math.max(Number(seqMonthlyValues[index]) || 0, 0) / niceMax) * height;
    setSeqLineTooltip({ x, y, index, value: seqMonthlyValues[index], label: seqMonthlyLabels[index] });
  };
  const handleSeqLineSVGMouseLeave = () => setSeqLineTooltip(null);
  const handleSeqSliceMouseEnter = (source, e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setSeqPieTooltip(source);
  };
  const handleSeqSliceMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
  const handleSeqSliceMouseLeave = () => setSeqPieTooltip(null);


  // Helper function to generate line path for emissions/sequestration charts.
  // niceMax must be the SAME ceiling used for the y-axis tick labels so the
  // line, the hover dot, and the gridlines all agree on where "0" and the
  // top gridline sit — no artificial padding, baseline always maps to the
  // bottom edge (height) and niceMax always maps to the top edge (0).
const generateLinePath = (values, niceMax, width = 458, height = 141) => {
  if (!values || values.length === 0) return "";

  const max = niceMax || Math.max(...values, 1);

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * width;
    const y = height - (Math.max(Number(v) || 0, 0) / max) * height;
    return [x, y];
  });

  return points
    .map(([x, y], i) => (i === 0 ? `M${x} ${y}` : `L${x} ${y}`))
    .join(" ");
};
  // Helper functions for pie charts
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

  const calculatePieSegments = (data) => {
    if (data.length === 0) return [];

    const total = data.reduce((sum, item) => sum + item.amount, 0);
    let currentAngle = 0;

    return data.map(item => {
      const percentage = (item.amount / total) * 100;
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

  const diseaseSegments = calculatePieSegments(diseaseData);

  const emissionSourcesTop5 = (() => {
    if (emissionSourcesData.length <= 4) return emissionSourcesData;
    const sorted = [...emissionSourcesData].sort((a, b) => b.amount - a.amount);
    const top4 = sorted.slice(0, 4);
    const othersAmount = sorted.slice(4).reduce((sum, s) => sum + s.amount, 0);
    return [...top4, { name: 'Others', amount: othersAmount, color: '#9E9E9E' }];
  })();

  const emissionSegments = calculatePieSegments(emissionSourcesTop5);

  const seqSourcesTop5 = (() => {
    if (seqSourcesData.length <= 4) return seqSourcesData;
    const sorted = [...seqSourcesData].sort((a, b) => b.amount - a.amount);
    const top4 = sorted.slice(0, 4);
    const othersAmount = sorted.slice(4).reduce((sum, s) => sum + s.amount, 0);
    return [...top4, { name: 'Others', amount: othersAmount, color: '#A5D6A7' }];
  })();

  const seqSegments = calculatePieSegments(seqSourcesTop5);

  const emissionCardMeta = [
    {
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6.05001 8.05C3.32001 10.78 3.32001 15.2 6.03001 17.93C7.50001 14.53 10.12 11.69 13.39 10C10.62 12.34 8.68001 15.61 8.00001 19.32C10.6 20.55 13.8 20.1 15.95 17.95C19.43 14.47 20 4 20 4C20 4 9.53001 4.57 6.05001 8.05Z" fill="currentColor"/></svg>),
      color: '#EA580C', bg: '#FFF7ED', desc: 'Total CO₂ equivalent emitted across all farms'
    },
    {
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12C11.2091 12 13 10.2091 13 8C13 5.79086 11.2091 4 9 4C6.79086 4 5 5.79086 5 8C5 10.2091 6.79086 12 9 12Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M9 13C6.33 13 1 14.34 1 17V20H17V17C17 14.34 11.67 13 9 13Z" fill="currentColor"/></svg>),
      color: '#16A34A', bg: '#F0FDF4', desc: 'Average carbon emissions per active farmer'
    },
    {
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z" fill="currentColor"/></svg>),
      color: '#2563EB', bg: '#EFF6FF', desc: 'Reduction achieved from 2023 baseline'
    },
  ];

  const seqCardMeta = [
    {
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="currentColor"/></svg>),
      color: '#16A34A', bg: '#F0FDF4', desc: 'Total carbon captured and stored by farms'
    },
    {
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12C11.2091 12 13 10.2091 13 8C13 5.79086 11.2091 4 9 4C6.79086 4 5 5.79086 5 8C5 10.2091 6.79086 12 9 12Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M9 13C6.33 13 1 14.34 1 17V20H17V17C17 14.34 11.67 13 9 13Z" fill="currentColor"/></svg>),
      color: '#0D9488', bg: '#F0FDFA', desc: 'Average carbon sequestered per farmer'
    },
    {
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" fill="currentColor"/></svg>),
      color: '#7C3AED', bg: '#F5F3FF', desc: 'Net balance: sequestration minus emissions'
    },
  ];

  // Shared y-axis scale for the Monthly Emissions / Sequestration trend charts —
  // computed once so the tick labels, gridlines, and the SVG line path all agree.
  const emissionsYAxis = computeYAxis(Math.max(...monthlyValues.map(v => Number(v) || 0), 1));
  const seqYAxis = computeYAxis(Math.max(...seqMonthlyValues.map(v => Number(v) || 0), 1));

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        
        <div className="dashboard-content">
          <div className="dashboard-title-section">
            <div className="title-content">
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="dashboard-subtitle">Monitor farm activities and analytics across your network</p>
            </div>
            <div className="title-actions">
              <div className="filter-dropdown-container" ref={dropdownRef}>
                {/* <button
                  className="filter-btnag"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <span>{timeFilter}</span>
                  <svg
                    width="24"
                    height="21"
                    viewBox="0 0 24 21"
                    fill="none"
                    style={{ transform: showFilterDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                  >
                    <path d="M7.41 7.50685L12 11.4413L16.59 7.50685L18 8.71813L12 13.8725L6 8.71813L7.41 7.50685Z" fill="#4CAF50"/>
                  </svg>
                </button>
                {showFilterDropdown && (
                  <div className="filter-dropdown-menu">
                    {['Today', 'This Week', 'This Month', 'This Quarter', 'This Year', 'All Time'].map((filter) => (
                      <button
                        key={filter}
                        className={`filter-dropdown-item ${timeFilter === filter ? 'active' : ''}`}
                        onClick={() => {
                          setTimeFilter(filter);
                          setShowFilterDropdown(false);
                        }}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                )} */}
              </div>
              {/* <button className="generate-report-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M19 13V18C19 18.55 18.55 19 18 19H6C5.45 19 5 18.55 5 18V13C5 12.45 4.55 12 4 12C3.45 12 3 12.45 3 13V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13C21 12.45 20.55 12 20 12C19.45 12 19 12.45 19 13ZM13 12.67L14.88 10.79C15.27 10.4 15.9 10.4 16.29 10.79C16.68 11.18 16.68 11.81 16.29 12.2L12.7 15.79C12.31 16.18 11.68 16.18 11.29 15.79L7.7 12.2C7.31 11.81 7.31 11.18 7.7 10.79C8.09 10.4 8.72 10.4 9.11 10.79L11 12.67V4C11 3.45 11.45 3 12 3C12.55 3 13 3.45 13 4V12.67Z" fill="white"/>
                </svg>
                Generate Report
              </button> */}
            </div>
          </div>

          <div className="stats-grid">
  {loadingStats ? (
    // Show empty stat cards while loading
    [
      { title: "Active Farmers", icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M16.67 13.13C18.04 14.06 19 15.32 19 17V20H23V17C23 14.82 19.43 13.53 16.67 13.13Z" fill="#65758B"/><path d="M9 12C11.2091 12 13 10.2091 13 8C13 5.79086 11.2091 4 9 4C6.79086 4 5 5.79086 5 8C5 10.2091 6.79086 12 9 12Z" fill="#65758B"/><path fillRule="evenodd" clipRule="evenodd" d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C14.53 4 14.09 4.1 13.67 4.24C14.5 5.27 15 6.58 15 8C15 9.42 14.5 10.73 13.67 11.76C14.09 11.9 14.53 12 15 12Z" fill="#65758B"/><path fillRule="evenodd" clipRule="evenodd" d="M9 13C6.33 13 1 14.34 1 17V20H17V17C17 14.34 11.67 13 9 13Z" fill="#65758B"/></svg>) },
      { title: "Greenhouse Gas Emissions", icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6.05001 8.05C3.32001 10.78 3.32001 15.2 6.03001 17.93C7.50001 14.53 10.12 11.69 13.39 10C10.62 12.34 8.68001 15.61 8.00001 19.32C10.6 20.55 13.8 20.1 15.95 17.95C19.43 14.47 20 4 20 4C20 4 9.53001 4.57 6.05001 8.05Z" fill="#65758B"/></svg>) },
      { title: "Carbon Sequestration", icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="#65758B"/></svg>) },
      { title: "Disease Alerts", icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z" fill="#65758B"/></svg>) },
      { title: "Chatbot Interactions", icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M16.6699 13.13C18.0399 14.06 18.9999 15.32 18.9999 17V20H22.9999V17C22.9999 14.82 19.4299 13.53 16.6699 13.13Z" fill="#65758B"/><path d="M9 12C11.2091 12 13 10.2091 13 8C13 5.79086 11.2091 4 9 4C6.79086 4 5 5.79086 5 8C5 10.2091 6.79086 12 9 12Z" fill="#65758B"/><path fillRule="evenodd" clipRule="evenodd" d="M14.9999 12C17.2099 12 18.9999 10.21 18.9999 8C18.9999 5.79 17.2099 4 14.9999 4C14.5299 4 14.0899 4.1 13.6699 4.24C14.4999 5.27 14.9999 6.58 14.9999 8C14.9999 9.42 14.4999 10.73 13.6699 11.76C14.0899 11.9 14.5299 12 14.9999 12Z" fill="#65758B"/><path fillRule="evenodd" clipRule="evenodd" d="M9 13C6.33 13 1 14.34 1 17V20H17V17C17 14.34 11.67 13 9 13Z" fill="#65758B"/></svg>) },
    ].map((card, idx) => (
      <StatsCard
        key={idx}
        title={card.title}
        value=""
        icon={card.icon}
        trendValue=""
      />
    ))
  ) : (
    statsData.map((card, idx) => (
        <StatsCard
          key={idx}
          title={card.title}
          value={card.value}
          icon={card.icon}
          // trendValue={card.trendValue.startsWith} 
        />
    ))
  )}
</div>


          <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

          {activeTab === 'Disease Detection' && (
  <>
    <div className="charts-section">
      <div className="charts-row">

        <div className="chart-container">
          <BarChart
            title="Most Scanned Crops"
            data={cropData}
            loading={loadingDiseaseData}
          />
        </div>

        <div className="chart-container">
          <PieChart
            title="Top Diseases Detected"
            data={diseaseSegments}
            loading={loadingDiseaseData}
          />
        </div>

      </div>

      <div className="chart-container full-width">
        <LineChart
          title="Trend of Diseases Detected Over Time"
          labels={diseaseTrendLabels}
          values={diseaseTrendValues}
          loading={loadingDiseaseData}
        />
      </div>

    </div>
  </>
)}

          {activeTab === 'Emission Analytics' && (
            <>
              {/* Emissions Section Header */}
              <div className="carbon-tab-section-header">
                <span className="carbon-tab-badge emissions-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M6.05001 8.05C3.32001 10.78 3.32001 15.2 6.03001 17.93C7.50001 14.53 10.12 11.69 13.39 10C10.62 12.34 8.68001 15.61 8.00001 19.32C10.6 20.55 13.8 20.1 15.95 17.95C19.43 14.47 20 4 20 4C20 4 9.53001 4.57 6.05001 8.05Z" fill="currentColor"/>
                  </svg>
                  Carbon Emissions
                </span>
                <p className="carbon-tab-description">Monitor greenhouse gas emissions and track reduction progress across all farms</p>
              </div>

              {/* Carbon Stats Cards */}
              <div className="carbon-stats-grid">
                {carbonStats.map((stat, index) => {
                  const meta = emissionCardMeta[index] || {};
                  return (
                    <div key={index} className="cs-stat-card">
                      <div className="cs-icon-wrap" style={{ background: meta.bg, color: meta.color }}>
                        {meta.icon}
                      </div>
                      <div className="cs-card-body">
                        <div className="cs-card-value" style={{ color: meta.color }}>{stat.value}</div>
                        <div className="cs-card-label">{stat.title}</div>
                        <div className="cs-card-desc">{meta.desc}</div>
                      </div>
                    </div>
                  );
                })}
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
                      {emissionsYAxis.ticks.map((tick, i) => (
                        <span key={i} className="y-label">{formatYAxisLabel(tick)}</span>
                      ))}
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

                      {/* Line chart SVG */}
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
                        <path
                          d={generateLinePath(monthlyValues, emissionsYAxis.max)}
                          stroke="url(#emissionsGradient)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                        {lineTooltip && (() => {
                          const tx = lineTooltip.x > 358 ? lineTooltip.x - 90 : lineTooltip.x + 10;
                          const ty = Math.max(4, lineTooltip.y - 32);
                          return (
                            <>
                              <line x1={lineTooltip.x} y1={0} x2={lineTooltip.x} y2={141} stroke="#CFCFCF" strokeWidth="1" strokeDasharray="4,3" />
                              <circle cx={lineTooltip.x} cy={lineTooltip.y} r="5" fill="#4CAF50" stroke="white" strokeWidth="2" />
                              <g transform={`translate(${tx}, ${ty})`} filter="url(#lineTipShadow)">
                                <rect width="84" height="30" rx="5" fill="white" stroke="#e8e8e8" strokeWidth="0.75"/>
                                <text x="42" y="12" textAnchor="middle" fontSize="8.5" fill="#888" fontFamily="Inter, sans-serif">{lineTooltip.label}</text>
                                <text x="42" y="24" textAnchor="middle" fontSize="9.5" fill="#4CAF50" fontFamily="Inter, sans-serif" fontWeight="600">{formatCarbonValue(lineTooltip.value, 'kg')}</text>
                              </g>
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* X-axis labels */}
                    <div className="x-axis-labels">
                      {monthlyLabels.map((label, index) => (
                        <span key={index} className="x-label">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Emissions Sources Chart */}
                <div className="carbon-chart-card emissions-sources-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Emissions Sources</h3>
                  </div>

                  {loadingCarbonStats ? (
                    <div className="pie-chart-content">
                      <div className="pie-chart-wrapper">
                        <svg className="emissions-pie-chart" viewBox="0 0 171 171">
                          <circle cx="85.5" cy="85.5" r="85.5" fill="#f3f4f6" opacity="0.3" />
                        </svg>
                      </div>
                      <div className="pie-chart-legend">
                        {[
                          { label: 'Fertilizer', color: '#4CAF50' },
                          { label: 'Machinery', color: '#FF9800' },
                          { label: 'Transport', color: '#2196F3' },
                          { label: 'Others', color: '#F44336' },
                        ].map((item) => (
                          <div key={item.label} className="legend-item">
                            <div className="legend-color-bar" style={{ backgroundColor: item.color, opacity: 0.3 }}></div>
                            <span className="legend-text" style={{ color: '#d1d5db' }}>{item.label}</span>
                            <span className="pie-slice-percentage" style={{ color: '#d1d5db' }}>-</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : emissionSourcesError || emissionSourcesData.length === 0 ? (
                    <div className="pie-chart-content">
                      <div className="chart-empty-state">
                        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                          <circle cx="28" cy="28" r="28" fill="#F0F7F0" />
                          <path d="M28 18C22.477 18 18 22.477 18 28C18 33.523 22.477 38 28 38C33.523 38 38 33.523 38 28C38 22.477 33.523 18 28 18ZM28 35C24.134 35 21 31.866 21 28C21 24.134 24.134 21 28 21C31.866 21 35 24.134 35 28C35 31.866 31.866 35 28 35Z" fill="#4CAF50" opacity="0.4" />
                        </svg>
                        <p className="chart-empty-label">No emission source data available</p>
                      </div>
                      <div className="pie-chart-legend">
                        {[
                          { label: 'Fertilizer', color: '#4CAF50' },
                          { label: 'Machinery', color: '#FF9800' },
                          { label: 'Transport', color: '#2196F3' },
                          { label: 'Others', color: '#F44336' },
                        ].map((item) => (
                          <div key={item.label} className="legend-item">
                            <div className="legend-color-bar" style={{ backgroundColor: item.color }}></div>
                            <span className="legend-text">{item.label}</span>
                            <span className="pie-slice-percentage">0%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pie-chart-content">
                      <div className="pie-chart-wrapper">
                        <svg className="emissions-pie-chart" viewBox="0 0 171 171">
                          {emissionSegments.map((segment, index) => (
                            <path
                              key={index}
                              d={segment.path}
                              fill={segment.color}
                              className="pie-slice"
                              onMouseEnter={(e) => handleSliceMouseEnter(segment, e)}
                              onMouseMove={handleSliceMouseMove}
                              onMouseLeave={handleSliceMouseLeave}
                            />
                          ))}
                        </svg>
                      </div>
                      <div className="pie-chart-legend">
                        {emissionSourcesTop5.map((source, index) => {
                          const total = emissionSourcesTop5.reduce((sum, s) => sum + s.amount, 0);
                          const pct = total > 0 ? ((source.amount / total) * 100).toFixed(1) : '0';
                          return (
                            <div key={index} className="legend-item">
                              <div className="legend-color-bar" style={{ backgroundColor: source.color }}></div>
                              <span className="legend-text">{source.name}</span>
                              <span className="pie-slice-percentage">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </>
          )}

          {activeTab === 'Carbon Sequestration' && (
            <>
              {/* Sequestration Section Header */}
              <div className="carbon-tab-section-header">
                <span className="carbon-tab-badge seq-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="currentColor"/>
                  </svg>
                  Carbon Sequestration
                </span>
                <p className="carbon-tab-description">Track how much carbon is being captured and stored across farms</p>
              </div>

              {/* Sequestration Stats Cards */}
              <div className="carbon-stats-grid">
                {seqStats.map((stat, index) => {
                  const meta = seqCardMeta[index] || {};
                  return (
                    <div key={index} className="cs-stat-card">
                      <div className="cs-icon-wrap" style={{ background: meta.bg, color: meta.color }}>
                        {meta.icon}
                      </div>
                      <div className="cs-card-body">
                        <div className="cs-card-value" style={{ color: meta.color }}>{stat.value}</div>
                        <div className="cs-card-label">{stat.title}</div>
                        <div className="cs-card-desc">{meta.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sequestration Charts */}
              <div className="carbon-charts-section">
                {/* Monthly Sequestration Trends Chart */}
                <div className="carbon-chart-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Monthly Sequestration Trends</h3>
                  </div>
                  <div className="line-chart-container">
                    <div className="y-axis-labels">
                      {seqYAxis.ticks.map((tick, i) => (
                        <span key={i} className="y-label">{formatYAxisLabel(tick)}</span>
                      ))}
                    </div>
                    <div className="chart-area">
                      <div className="grid-lines-container">
                        <div className="grid-line"></div>
                        <div className="grid-line"></div>
                        <div className="grid-line"></div>
                        <div className="grid-line"></div>
                        <div className="grid-line"></div>
                      </div>
                      <svg
                        ref={seqLineChartSvgRef}
                        className="emissions-line-chart"
                        viewBox="0 0 458 141"
                        preserveAspectRatio="none"
                        onMouseMove={handleSeqLineSVGMouseMove}
                        onMouseLeave={handleSeqLineSVGMouseLeave}
                        style={{ cursor: seqMonthlyValues.length > 0 ? 'crosshair' : 'default' }}
                      >
                        <defs>
                          <linearGradient id="seqGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#245421"/>
                            <stop offset="100%" stopColor="#66BB6A"/>
                          </linearGradient>
                          <filter id="seqLineTipShadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15"/>
                          </filter>
                        </defs>
                        <path
                          d={generateLinePath(seqMonthlyValues, seqYAxis.max)}
                          stroke="url(#seqGradient)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                        {seqLineTooltip && (() => {
                          const tx = seqLineTooltip.x > 358 ? seqLineTooltip.x - 90 : seqLineTooltip.x + 10;
                          const ty = Math.max(4, seqLineTooltip.y - 32);
                          return (
                            <>
                              <line x1={seqLineTooltip.x} y1={0} x2={seqLineTooltip.x} y2={141} stroke="#CFCFCF" strokeWidth="1" strokeDasharray="4,3" />
                              <circle cx={seqLineTooltip.x} cy={seqLineTooltip.y} r="5" fill="#66BB6A" stroke="white" strokeWidth="2" />
                              <g transform={`translate(${tx}, ${ty})`} filter="url(#seqLineTipShadow)">
                                <rect width="84" height="30" rx="5" fill="white" stroke="#e8e8e8" strokeWidth="0.75"/>
                                <text x="42" y="12" textAnchor="middle" fontSize="8.5" fill="#888" fontFamily="Inter, sans-serif">{seqLineTooltip.label}</text>
                                <text x="42" y="24" textAnchor="middle" fontSize="9.5" fill="#4CAF50" fontFamily="Inter, sans-serif" fontWeight="600">{formatCarbonValue(seqLineTooltip.value, 'kg')}</text>
                              </g>
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                    <div className="x-axis-labels">
                      {seqMonthlyLabels.map((label, index) => (
                        <span key={index} className="x-label">{label}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sequestration Sources Chart */}
                <div className="carbon-chart-card emissions-sources-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Sequestration Sources</h3>
                  </div>
                  {loadingSeqStats ? (
                    <div className="pie-chart-content">
                      <div className="pie-chart-wrapper">
                        <svg className="emissions-pie-chart" viewBox="0 0 171 171">
                          <circle cx="85.5" cy="85.5" r="85.5" fill="#f3f4f6" opacity="0.3" />
                        </svg>
                      </div>
                      <div className="pie-chart-legend">
                        {['Soil Carbon', 'Agroforestry', 'Cover Crops', 'Others'].map((label) => (
                          <div key={label} className="legend-item">
                            <div className="legend-color-bar" style={{ backgroundColor: '#4CAF50', opacity: 0.3 }}></div>
                            <span className="legend-text" style={{ color: '#d1d5db' }}>{label}</span>
                            <span className="pie-slice-percentage" style={{ color: '#d1d5db' }}>-</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : seqSourcesError || seqSourcesData.length === 0 ? (
                    <div className="pie-chart-content">
                      <div className="chart-empty-state">
                        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                          <circle cx="28" cy="28" r="28" fill="#F0F7F0" />
                          <path d="M28 18C22.477 18 18 22.477 18 28C18 33.523 22.477 38 28 38C33.523 38 38 33.523 38 28C38 22.477 33.523 18 28 18ZM28 35C24.134 35 21 31.866 21 28C21 24.134 24.134 21 28 21C31.866 21 35 24.134 35 28C35 31.866 31.866 35 28 35Z" fill="#4CAF50" opacity="0.4" />
                        </svg>
                        <p className="chart-empty-label">No sequestration source data available</p>
                      </div>
                      <div className="pie-chart-legend">
                        {['Soil Carbon', 'Agroforestry', 'Cover Crops', 'Others'].map((label) => (
                          <div key={label} className="legend-item">
                            <div className="legend-color-bar" style={{ backgroundColor: '#4CAF50' }}></div>
                            <span className="legend-text">{label}</span>
                            <span className="pie-slice-percentage">0%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pie-chart-content">
                      <div className="pie-chart-wrapper">
                        <svg className="emissions-pie-chart" viewBox="0 0 171 171">
                          {seqSegments.map((segment, index) => (
                            <path
                              key={index}
                              d={segment.path}
                              fill={segment.color}
                              className="pie-slice"
                              onMouseEnter={(e) => handleSeqSliceMouseEnter(segment, e)}
                              onMouseMove={handleSeqSliceMouseMove}
                              onMouseLeave={handleSeqSliceMouseLeave}
                            />
                          ))}
                        </svg>
                      </div>
                      <div className="pie-chart-legend">
                        {seqSourcesTop5.map((source, index) => {
                          const total = seqSourcesTop5.reduce((sum, s) => sum + s.amount, 0);
                          const pct = total > 0 ? ((source.amount / total) * 100).toFixed(1) : '0';
                          return (
                            <div key={index} className="legend-item">
                              <div className="legend-color-bar" style={{ backgroundColor: source.color }}></div>
                              <span className="legend-text">{source.name}</span>
                              <span className="pie-slice-percentage">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Carbon-Efficient Farmers Table */}
              <div className="seq-farmers-section">
                <div className="seq-farmers-header">
                  <h3 className="seq-farmers-title">Top Carbon-Efficient Farmers</h3>
                  {topFarmers.length > 0 && (
                    <span className="seq-farmers-count">{topFarmers.length} farmers</span>
                  )}
                </div>
                <div className="seq-farmers-table-wrapper">
                  <table className="seq-farmers-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Farmer</th>
                        <th>Location</th>
                        <th>Carbon Score</th>
                        <th>Reduction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topFarmers.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="seq-table-empty">No farmer data available</td>
                        </tr>
                      ) : (
                        topFarmers.map((farmer) => (
                          <tr key={farmer.id}>
                            <td>
                              <span className={`farmer-rank-badge ${farmer.rank <= 3 ? `rank-${farmer.rank}` : 'rank-other'}`}>
                                {farmer.rank}
                              </span>
                            </td>
                            <td>
                              <div className="farmer-table-name">{farmer.name}</div>
                            </td>
                            <td>
                              <div className="farmer-table-location">{farmer.subCounty}</div>
                            </td>
                            <td>
                              <div className="carbon-score-cell">
                                <span className="carbon-score-value">{farmer.carbonScore} {farmer.carbonUnit || 't'}</span>
                                <div className="carbon-score-bar">
                                  <div
                                    className="carbon-score-fill"
                                    style={{ width: `${Math.min(100, (farmer.carbonScore / 100) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="reduction-badge">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                  <path d="M7 14l5-5 5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                {farmer.reduction}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          

          {activeTab === 'User Engagement' && (
            <UserEngagement />
          )}

          {activeTab === 'Usage Analytics' && (
            <UsageAnalytics />
          )}
        </div>
      </div>

      {/* Emission sources / financial pie chart floating tooltip */}
      {pieTooltip && (
        <div
          className="pie-chart-tooltip"
          style={{ left: mousePos.x + 14, top: mousePos.y - 60 }}
        >
          <div className="pie-tooltip-header">
            <span className="pie-tooltip-color-dot" style={{ backgroundColor: pieTooltip.color }}></span>
            <span className="pie-tooltip-name">{pieTooltip.name}</span>
          </div>
          {pieTooltip.amount != null && (
            <div className="pie-tooltip-data-row">
              <span className="pie-tooltip-data-label">Amount</span>
              <span className="pie-tooltip-amount">KES {pieTooltip.amount.toLocaleString()}</span>
            </div>
          )}
          <div className="pie-tooltip-data-row">
            <span className="pie-tooltip-data-label">Share</span>
            <span className="pie-tooltip-percentage">{pieTooltip.percentage}%</span>
          </div>
        </div>
      )}

      {seqPieTooltip && (
        <div
          className="pie-chart-tooltip"
          style={{ left: mousePos.x + 14, top: mousePos.y - 60 }}
        >
          <div className="pie-tooltip-header">
            <span className="pie-tooltip-color-dot" style={{ backgroundColor: seqPieTooltip.color }}></span>
            <span className="pie-tooltip-name">{seqPieTooltip.name}</span>
          </div>
          {seqPieTooltip.amount != null && (
            <div className="pie-tooltip-data-row">
              <span className="pie-tooltip-data-label">Amount</span>
              <span className="pie-tooltip-amount">{Number(seqPieTooltip.amount).toLocaleString()} kg</span>
            </div>
          )}
          <div className="pie-tooltip-data-row">
            <span className="pie-tooltip-data-label">Share</span>
            <span className="pie-tooltip-percentage">{seqPieTooltip.percentage}%</span>
          </div>
        </div>
      )}


    </div>
  );
};

export default Dashboard;
