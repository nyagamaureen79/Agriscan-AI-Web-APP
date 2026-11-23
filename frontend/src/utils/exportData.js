import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const getExportFormat = () => {
  return localStorage.getItem('exportFormat') || 'PDF';
};

const formatDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const exportToCSV = (data, columns, filename) => {
  const headers = columns.map(col => col.header).join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const value = col.accessor(row);
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${Date.now()}.csv`;
  link.click();
};

const exportToExcel = (data, columns, filename, sheetName = 'Data') => {
  const worksheetData = [
    columns.map(col => col.header),
    ...data.map(row => columns.map(col => col.accessor(row)))
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  const columnWidths = columns.map((col, index) => {
    const headerLength = col.header.length;
    const maxDataLength = Math.max(
      ...data.map(row => {
        const val = col.accessor(row);
        return val ? val.toString().length : 0;
      })
    );
    return { wch: Math.max(headerLength, maxDataLength) + 2 };
  });
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}_${Date.now()}.xlsx`);
};

const exportToPDF = (data, columns, filename, title, metadata = {}) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(36, 84, 33);
  doc.text(title, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${formatDate()}`, 14, 28);
  
  if (metadata.subtitle) {
    doc.setFontSize(9);
    doc.text(metadata.subtitle, 14, 34);
  }

  let startY = metadata.subtitle ? 40 : 35;

  if (metadata.stats && metadata.stats.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Summary Statistics', 14, startY);
    
    const statsData = metadata.stats.map(stat => [stat.label, stat.value]);
    autoTable(doc, {
  startY: startY + 5,
  head: [['Metric', 'Value']],
  body: statsData,
  theme: 'grid',
  headStyles: { fillColor: [76, 175, 80], textColor: 255 },
  margin: { left: 14 },
  styles: { fontSize: 9 }
});
    
    startY = doc.lastAutoTable.finalY + 10;
  }

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(metadata.tableTitle || 'Data', 14, startY);
const tableData = data.map(row => columns.map(col => col.accessor(row)));

autoTable(doc, {
  startY: startY + 5,
  head: [columns.map(col => col.header)],
  body: tableData,
  theme: 'striped',
  headStyles: { 
    fillColor: [76, 175, 80],
    textColor: 255,
    fontStyle: 'bold'
  },
  alternateRowStyles: { fillColor: [245, 248, 247] },
  margin: { left: 14, right: 14 },
  styles: { 
    fontSize: 8,
    cellPadding: 3
  },
  columnStyles: metadata.columnStyles || {}
});


  if (metadata.footer) {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        metadata.footer,
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10
      );
    }
  }

  doc.save(`${filename}_${Date.now()}.pdf`);
};

export const exportFarmersData = (farmersData, filters = {}) => {
  const format = getExportFormat();
  const filename = 'AgriScanAI_Farmers_Data';
  const title = 'AgriScanAI - Farmers Data Report';

  const columns = [
    { header: 'ID', accessor: (row) => row.id },
    { header: 'Name', accessor: (row) => row.name },
    { header: 'Username', accessor: (row) => row.username },
    { header: 'Phone', accessor: (row) => row.phone },
    { header: 'Location', accessor: (row) => row.location },
    { header: 'Status', accessor: (row) => row.status },
    { header: 'Registration Date', accessor: (row) => row.regDate ? new Date(row.regDate).toLocaleDateString() : '' },
    { header: 'Last Visit', accessor: (row) => row.lastVisit ? new Date(row.lastVisit).toLocaleDateString() : '' }
  ];

  const metadata = {
    subtitle: 'Comprehensive farmer profiles and agricultural data',
    stats: [
      { label: 'Total Farmers', value: farmersData.length },
      { label: 'Export Date', value: formatDate() },
      { label: 'Filters Applied', value: Object.keys(filters).filter(k => filters[k] && filters[k] !== 'All' && filters[k] !== '').length }
    ],
    tableTitle: 'Farmer Records',
    footer: 'AgriScanAI - Agricultural Intelligence Platform',
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 }
    }
  };

  if (format === 'CSV') {
    exportToCSV(farmersData, columns, filename);
  } else if (format === 'Excel') {
    exportToExcel(farmersData, columns, filename, 'Farmers Data');
  } else {
    exportToPDF(farmersData, columns, filename, title, metadata);
  }
};

export const exportAnalyticsData = (analyticsData) => {
  const format = getExportFormat();
  const filename = 'AgriScanAI_Analytics_Report';
  const title = 'AgriScanAI - Analytics Report';

  const columns = [
    { header: 'Metric', accessor: (row) => row.metric },
    { header: 'Value', accessor: (row) => row.value },
    { header: 'Trend', accessor: (row) => row.trend },
    { header: 'Period', accessor: (row) => row.period }
  ];

  const data = [
    { metric: 'Active Farmers', value: analyticsData.activeFarmers || '278', trend: '+12%', period: 'Last Month' },
    { metric: 'Carbon Emissions', value: analyticsData.carbonEmissions || '179 kg', trend: '+12%', period: 'Last Month' },
    { metric: 'Disease Scans', value: analyticsData.diseaseScans || '278', trend: '-9%', period: 'Last Month' },
    { metric: 'Chatbot Interactions', value: analyticsData.chatbotInteractions || '1,028', trend: '+12%', period: 'Last Month' }
  ];

  const metadata = {
    subtitle: 'Comprehensive insights and data visualization across all modules',
    stats: [
      { label: 'Report Period', value: 'Last 6 Months' },
      { label: 'Generated', value: formatDate() }
    ],
    tableTitle: 'Key Metrics',
    footer: 'AgriScanAI - Agricultural Intelligence Platform'
  };

  if (format === 'CSV') {
    exportToCSV(data, columns, filename);
  } else if (format === 'Excel') {
    exportToExcel(data, columns, filename, 'Analytics');
  } else {
    exportToPDF(data, columns, filename, title, metadata);
  }
};

export const exportCarbonAnalytics = (carbonData) => {
  const format = getExportFormat();
  const filename = 'AgriScanAI_Carbon_Analytics';
  const title = 'AgriScanAI - Carbon Analytics Report';

  const columns = [
    { header: 'Rank', accessor: (row) => row.rank },
    { header: 'Farmer Name', accessor: (row) => row.name },
    { header: 'Sub County', accessor: (row) => row.subCounty },
    { header: 'Carbon Score', accessor: (row) => `${row.carbonScore}/100` },
    { header: 'Reduction %', accessor: (row) => `${row.reduction}%` }
  ];

  const metadata = {
    subtitle: 'Carbon emissions monitoring and sustainability progress tracking',
    stats: [
      { label: 'Total CO2e', value: '3584 kg' },
      { label: 'Avg. per Farmer', value: '168 kg' },
      { label: 'Current Reduction', value: '15%' },
      { label: 'Top Performers', value: carbonData.length }
    ],
    tableTitle: 'Top Carbon-Efficient Farmers',
    footer: 'AgriScanAI - Sustainability Tracking',
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45 }
    }
  };

  if (format === 'CSV') {
    exportToCSV(carbonData, columns, filename);
  } else if (format === 'Excel') {
    exportToExcel(carbonData, columns, filename, 'Carbon Analytics');
  } else {
    exportToPDF(carbonData, columns, filename, title, metadata);
  }
};

export const exportChatbotInsights = (conversationsData) => {
  const format = getExportFormat();
  const filename = 'AgriScanAI_Chatbot_Insights';
  const title = 'AgriScanAI - Chatbot Insights Report';

  const columns = [
    { header: 'Farmer Name', accessor: (row) => row.name },
    { header: 'Location', accessor: (row) => row.location },
    { header: 'Messages', accessor: (row) => row.messages },
    { header: 'Query Type', accessor: (row) => row.queryType },
    { header: 'Timestamp', accessor: (row) => row.timestamp }
  ];

  const metadata = {
    subtitle: 'Chatbot conversation analysis and farmer engagement patterns',
    stats: [
      { label: 'Total Conversations', value: conversationsData.length },
      { label: 'Total Messages', value: conversationsData.reduce((sum, c) => sum + c.messages, 0) },
      { label: 'Avg Messages/Conv', value: Math.round(conversationsData.reduce((sum, c) => sum + c.messages, 0) / conversationsData.length) },
      { label: 'Resolution Rate', value: '87%' }
    ],
    tableTitle: 'Recent Conversations',
    footer: 'AgriScanAI - Chatbot Analytics',
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 40 },
      2: { cellWidth: 20 }
    }
  };

  if (format === 'CSV') {
    exportToCSV(conversationsData, columns, filename);
  } else if (format === 'Excel') {
    exportToExcel(conversationsData, columns, filename, 'Chatbot Insights');
  } else {
    exportToPDF(conversationsData, columns, filename, title, metadata);
  }
};

export const exportDiseaseDetection = (diseaseData) => {
  const format = getExportFormat();
  const filename = 'AgriScanAI_Disease_Detection';
  const title = 'AgriScanAI - Disease Detection Report';

  const columns = [
    { header: 'ID', accessor: (row) => row.id },
    { header: 'Disease Name', accessor: (row) => row.name },
    { header: 'Severity', accessor: (row) => row.severity },
    { header: 'Confidence', accessor: (row) => `${row.confidence}%` },
    { header: 'Farmer', accessor: (row) => row.farmer },
    { header: 'Crop Type', accessor: (row) => row.cropType },
    { header: 'Location', accessor: (row) => row.location },
    { header: 'Detected Date', accessor: (row) => row.detectedDate }
  ];

  const metadata = {
    subtitle: 'AI-powered crop disease detection and monitoring',
    stats: [
      { label: 'Total Detections', value: diseaseData.length },
      { label: 'High Severity', value: diseaseData.filter(d => d.severity === 'High').length },
      { label: 'Medium Severity', value: diseaseData.filter(d => d.severity === 'Medium').length },
      { label: 'Low Severity', value: diseaseData.filter(d => d.severity === 'Low').length }
    ],
    tableTitle: 'Disease Detection Records',
    footer: 'AgriScanAI - Disease Monitoring System',
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20 }
    }
  };

  if (format === 'CSV') {
    exportToCSV(diseaseData, columns, filename);
  } else if (format === 'Excel') {
    exportToExcel(diseaseData, columns, filename, 'Disease Detection');
  } else {
    exportToPDF(diseaseData, columns, filename, title, metadata);
  }
};

export const exportUserEngagement = (engagementData) => {
  const format = getExportFormat();
  const filename = 'AgriScanAI_User_Engagement';
  const title = 'AgriScanAI - User Engagement Report';

  const columns = [
    { header: 'Metric', accessor: (row) => row.metric },
    { header: 'Value', accessor: (row) => row.value },
    { header: 'Trend', accessor: (row) => row.trend },
    { header: 'Period', accessor: (row) => row.period }
  ];

  const data = [
    { metric: 'Active Farmers', value: '278', trend: '+12%', period: 'Last Month' },
    { metric: 'Carbon Emissions', value: '179 kg', trend: '+12%', period: 'Last Month' },
    { metric: 'Disease Scans', value: '278', trend: '-9%', period: 'Last Month' },
    { metric: 'Chatbot Interactions', value: '1,028', trend: '+12%', period: 'Last Month' }
  ];

  const metadata = {
    subtitle: 'User activity, feature adoption, and engagement metrics',
    stats: [
      { label: 'Report Period', value: 'Last 6 Months' },
      { label: 'Generated', value: formatDate() }
    ],
    tableTitle: 'Engagement Metrics',
    footer: 'AgriScanAI - User Analytics'
  };

  if (format === 'CSV') {
    exportToCSV(data, columns, filename);
  } else if (format === 'Excel') {
    exportToExcel(data, columns, filename, 'User Engagement');
  } else {
    exportToPDF(data, columns, filename, title, metadata);
  }
};
