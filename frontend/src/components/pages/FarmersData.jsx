import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Header from '../Header';
import FarmerProfileModal from '../FarmerProfileModal';
import '../FarmerProfileModal.css';
import { exportFarmersData } from '../../utils/exportData';
import { apiFetch } from "../../utils/apiFetch";
import { useToast } from '../../contexts/ToastContext';
import CreateFarmerModal from '../CreateFarmerModal';
import '../CreateFarmerModal.css';


const FARMER_INSIGHTS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/>
      </svg>
    ),
    title: 'High Engagement',
    text: '78% of registered farmers are actively using the platform — 12% above the regional average for similar programs.',
    accent: '#4CAF50',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L1 21H23L12 2ZM12 18C11.45 18 11 17.55 11 17C11 16.45 11.45 16 12 16C12.55 16 13 16.45 13 17C13 17.55 12.55 18 12 18ZM11 15V11H13V15H11Z" fill="currentColor"/>
      </svg>
    ),
    title: 'At-Risk Farmers',
    text: '22% of farmers show no activity in the last 30 days. Targeted outreach could recover up to 300+ inactive accounts.',
    accent: '#FF9800',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M6.05 8.05C3.32 10.78 3.32 15.2 6.03 17.93C7.5 14.53 10.12 11.69 13.39 10C10.62 12.34 8.68 15.61 8 19.32C10.6 20.55 13.8 20.1 15.95 17.95C19.43 14.47 20 4 20 4C20 4 9.53 4.57 6.05 8.05Z" fill="currentColor"/>
      </svg>
    ),
    title: 'Carbon Potential',
    text: 'Average carbon score of 79 indicates strong sequestration potential. Top performers could qualify for premium carbon credits.',
    accent: '#245421',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="currentColor"/>
      </svg>
    ),
    title: 'Regional Concentration',
    text: 'Most registered farmers are clustered in 3 sub-counties. Expanding outreach to underserved regions could grow the registry by 40%.',
    accent: '#2196F3',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M16.85 6.85L18.29 8.29L13.41 13.17L10.12 9.88C9.73 9.49 9.1 9.49 8.71 9.88L2.71 15.89C2.32 16.28 2.32 16.91 2.71 17.3C3.1 17.69 3.73 17.69 4.12 17.3L9.41 12L12.7 15.29C13.09 15.68 13.72 15.68 14.11 15.29L19.7 9.71L21.14 11.15C21.45 11.46 21.99 11.24 21.99 10.8V6.5C22 6.22 21.78 6 21.5 6H17.21C16.76 6 16.54 6.54 16.85 6.85Z" fill="currentColor"/>
      </svg>
    ),
    title: 'Income Growth',
    text: 'Average monthly income of KES 30,558 is up 8.3% quarter-over-quarter. Mix farming households show the highest income gains.',
    accent: '#9C27B0',
  },
];

const FarmersData = () => {
  const toast = useToast();
  const navigate = useNavigate();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedCrop, setSelectedCrop] = useState('All Crops');
  const [cropOptions, setCropOptions] = useState(["All Crops"]);
  const [regionOptions, setRegionOptions] = useState(['All Regions']);

  // Bulk selection states
  const [selectedFarmers, setSelectedFarmers] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  // Dropdown states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showCropDropdown, setShowCropDropdown] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFarmerId, setSelectedFarmer] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Action dropdown state
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

 
const [farmersData, setFarmersData] = useState([]);
const [loadingFarmers, setLoadingFarmers] = useState(true);

const [statsData, setStatsData] = useState([]);
const [loadingStats, setLoadingStats] = useState(true);


useEffect(() => {
  // Fetch farmers
  apiFetch(`${import.meta.env.VITE_API_URL}/farmers/`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to fetch farmers: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      setFarmersData(data.farmers || []);
      // toast.success(`Loaded ${data.farmers?.length || 0} farmers successfully`);
    })
    .catch(err => {
      console.error("Error fetching farmers:", err);
      toast.error(`Failed to load farmers: ${err.message}`);
    })
    .finally(() => {
      setLoadingFarmers(false);
    });

  
  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/analytics/farmer-stats`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `Failed to fetch stats: ${res.statusText}`);
      }
      const data = await res.json();

      setStatsData([
        { title: 'Total Farmers', value: data.totalFarmers, color: '#4CAF50' },
        { title: 'Active Engagement', value: data.activeEngagement, color: '#4CAF50' },
        { title: 'Avg. Carbon Score', value: data.avgCarbonScore, color: '#4CAF50' },
        { title: 'Avg. Farm Size', value: data.avgFarmSize, color: '#4CAF50' },
        { title: 'Avg. Monthly Income', value: data.avgMonthlyIncome, color: '#4CAF50' },
      ]);
      // toast.success('Statistics loaded successfully');
    } catch (err) {
      console.error("Error fetching stats:", err);
      toast.error(`Failed to load statistics: ${err.message}`);
    } finally {
      setLoadingStats(false);
    }
  };

  fetchStats();
}, []);


useEffect(() => {
  apiFetch(`${import.meta.env.VITE_API_URL}/farmers/crops`)
    .then(res => res.json())
    .then(data => {
      if (data.crops && Array.isArray(data.crops)) {
        setCropOptions(["All Crops", ...data.crops]);
      }
    })
    .catch(err => {
      console.error("Error fetching crops:", err);
      toast.error("Failed to load crops");
    });
}, []);

useEffect(() => {
  if (farmersData.length > 0) {
    const uniqueLocations = new Set(['All Regions']);
    farmersData.forEach(farmer => {
      if (farmer.location) {
        uniqueLocations.add(farmer.location);
      }
    });
    setRegionOptions(Array.from(uniqueLocations));
  }
}, [farmersData]);


  // Filter options (updated to Active and Inactive only)
  const statusOptions = ['All Status', 'Active', 'Inactive'];
  

const filteredData = useMemo(() => {
    return farmersData.filter(farmer => {
      const matchesSearch =
        (farmer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (farmer.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (farmer.location || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === 'All Status' || farmer.status === selectedStatus;
      
      const matchesRegion = selectedRegion === 'All Regions' || 
                           (farmer.location && farmer.location === selectedRegion);
      
      // Handle crops as both string and array
      const matchesCrop = selectedCrop === "All Crops" || (() => {
        if (!farmer.crops) return false;
        
        // If crops is an array
        if (Array.isArray(farmer.crops)) {
          return farmer.crops.some(c => 
            c.toLowerCase().includes(selectedCrop.toLowerCase())
          );
        }
        
        // If crops is a string (comma-separated)
        if (typeof farmer.crops === 'string') {
          return farmer.crops.toLowerCase().includes(selectedCrop.toLowerCase());
        }
        
        return false;
      })();

      return matchesSearch && matchesStatus && matchesRegion && matchesCrop;
    });
  }, [farmersData, searchTerm, selectedStatus, selectedRegion, selectedCrop]);
  // Pagination calculations

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedRegion]);

  // Pagination handlers
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Mask phone number - hide digits 5-7 (after first 4)
  const maskPhone = (phone) => {
    if (!phone) return '';
    const str = String(phone);
    if (str.length <= 4) return str;
    return str.slice(0, 4) + 'xxx' + str.slice(7);
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return 'status-badge-active';
      case 'inactive':
        return 'status-badge-inactive';
      default:
        return 'status-badge-default';
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = currentItems.map(farmer => farmer.id);
      setSelectedFarmers(allIds);
    } else {
      setSelectedFarmers([]);
    }
  };

  const handleSelectFarmer = (farmerId) => {
    setSelectedFarmers(prev => {
      if (prev.includes(farmerId)) {
        return prev.filter(id => id !== farmerId);
      } else {
        return [...prev, farmerId];
      }
    });
  };

  const isAllSelected = currentItems.length > 0 && selectedFarmers.length === currentItems.length;
  const isSomeSelected = selectedFarmers.length > 0 && selectedFarmers.length < currentItems.length;

  // Bulk actions handler
const handleBulkAction = async () => {
    if (!bulkAction || selectedFarmers.length === 0) {
      toast.error('Please select an action and at least one farmer');
      return;
    }

    /* COMMENTED OUT - Delete functionality disabled
    if (bulkAction === 'delete') {
      if (!window.confirm(`Are you sure you want to delete ${selectedFarmers.length} farmer(s)? This action cannot be undone.`)) {
        return;
      }

      try {
        // Single request to delete all farmers
        const response = await apiFetch(`${import.meta.env.VITE_API_URL}/farmers/bulk`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
            body: JSON.stringify({ farmer_ids: selectedFarmers }),  // Send array of IDs
        });

        if (!response.ok) {
          throw new Error('Failed to delete farmers');
        }

        const data = await response.json();

        setFarmersData(prevData => prevData.filter(farmer => !selectedFarmers.includes(farmer.id)));
        setSelectedFarmers([]);
        setBulkAction('');
        toast.success(data.message);

        if (data.warning) {
          toast.warning(data.warning);
        }
      } catch (err) {
        console.error('Error deleting farmers:', err);
        toast.error(`Failed to delete farmers: ${err.message}`);
      }
    } else {
    */
      // Bulk status update
      const newStatus = bulkAction;

      try {
        const updatePromises = selectedFarmers.map(farmerId =>
          apiFetch(`${import.meta.env.VITE_API_URL}/farmers/${farmerId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
          })
        );

        await Promise.all(updatePromises);

        setFarmersData(prevData =>
          prevData.map(farmer =>
            selectedFarmers.includes(farmer.id)
              ? { ...farmer, status: newStatus }
              : farmer
          )
        );

        setSelectedFarmers([]);
        setBulkAction('');
        toast.success(`${selectedFarmers.length} farmer(s) status updated to ${newStatus}!`);
      } catch (err) {
        console.error('Error updating farmers:', err);
        toast.error(`Failed to update farmers: ${err.message}`);
      }
    // }
  };

  // Close dropdowns
  const closeAllDropdowns = () => {
    setShowStatusDropdown(false);
    setShowRegionDropdown(false);
    setShowBulkActions(false);
    setOpenActionMenu(null);
  };

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close filter/bulk dropdowns when clicking outside them (but not inside the action menu)
      if (
        !event.target.closest('.filter-dropdown') &&
        !event.target.closest('.bulk-actions-container') &&
        !event.target.closest('.farmer-action-menu-wrapper')
      ) {
        setShowStatusDropdown(false);
        setShowRegionDropdown(false);
        setShowBulkActions(false);
      }
      // Close action menu when clicking outside both the trigger and the fixed dropdown
      if (
        !event.target.closest('.farmer-action-menu-wrapper') &&
        !event.target.closest('.farmer-action-dropdown')
      ) {
        setOpenActionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle dropdown selection
 const handleDropdownSelect = (type, value) => {
  switch(type) {
    case 'status':
      setSelectedStatus(value);
      setShowStatusDropdown(false);
      break;
    case 'region':
      setSelectedRegion(value);
      setShowRegionDropdown(false);
      break;
    case 'crop':
      setSelectedCrop(value);
      setShowCropDropdown(false);
      break;
    default:
      break;
  }
};


  // View farmer profile
const handleViewFarmer = (farmer) => {
  setSelectedFarmer(farmer.id);
  setIsModalOpen(true);
};

  // Navigate to Farmer Statement page
  const handleViewStatement = (farmer) => {
    navigate(`/farmer-statement/${farmer.id}`);
  };


  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFarmer(null);
  };

  // COMMENTED OUT - Delete farmer functionality disabled
  /*
  const handleDeleteFarmer = async (farmerId) => {
    if (!window.confirm('Are you sure you want to delete this farmer? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/farmers/${farmerId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `Failed to delete farmer`);
      }

      // Remove from local state
      setFarmersData(prevData => prevData.filter(farmer => farmer.id !== farmerId));
      toast.success('Farmer deleted successfully!');
    } catch (err) {
      console.error('Error deleting farmer:', err);
      toast.error(`Failed to delete farmer: ${err.message}`);
    }
  };
  */

  // Handle export data
  const handleExportData = () => {
    const filters = {
      searchTerm,
      selectedStatus,
      selectedRegion
    };
    exportFarmersData(filteredData, filters);
    toast.success('Data exported successfully!');
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content">
          {/* Header Section */}
          <div className="farmers-header">
            <div className="farmers-title-section">
              <div className="title-content">
                <h1 className="farmers-title">Farmers Data</h1>
                <p className="farmers-subtitle">Monitor farmer profiles, activities, and agricultural data</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="create-farmer-btn" onClick={() => setIsCreateModalOpen(true)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C12.79 4 11 5.79 11 8C11 10.21 12.79 12 15 12ZM6 10V7H4V10H1V12H4V15H6V12H9V10H6ZM15 14C12.33 14 7 15.34 7 18V20H23V18C23 15.34 17.67 14 15 14Z" fill="white"/>
                  </svg>
                  Add Farmer
                </button>
                {/* <button className="audit-logs-btn" onClick={() => navigate('/audit-logs')}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM9 13V19H11V13H9ZM15 15V19H17V15H15ZM12 11V19H14V11H12Z" fill="white"/>
                  </svg>
                  Audit Logs
                </button> */}
                <button className="export-data-btn" onClick={handleExportData}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M19 13V18C19 18.55 18.55 19 18 19H6C5.45 19 5 18.55 5 18V13C5 12.45 4.55 12 4 12C3.45 12 3 12.45 3 13V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13C21 12.45 20.55 12 20 12C19.45 12 19 12.45 19 13ZM13 12.67L14.88 10.79C15.27 10.4 15.9 10.4 16.29 10.79C16.68 11.18 16.68 11.81 16.29 12.2L12.7 15.79C12.31 16.18 11.68 16.18 11.29 15.79L7.7 12.2C7.31 11.81 7.31 11.18 7.7 10.79C8.09 10.4 8.72 10.4 9.11 10.79L11 12.67V4C11 3.45 11.45 3 12 3C12.55 3 13 3.45 13 4V12.67Z" fill="white"/>
                  </svg>
                  Export Data
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="farmers-stats-grid">
            {loadingStats
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="farmers-stats-card farmers-stats-card--skeleton">
                    <div className="skeleton-line skeleton-line--short" />
                    <div className="skeleton-line skeleton-line--tall" />
                  </div>
                ))
              : statsData.map((stat, index) => (
                  <div key={index} className="farmers-stats-card">
                    <div className="stats-label">{stat.title}</div>
                    <div className="stats-value" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                  </div>
                ))
            }
          </div>

          {/* AI Insights Section */}
          {/* <section className="fd-insights-section">
            <div className="fd-insights-header">
              <span className="fd-ai-badge">AI</span>
              <h3 className="fd-insights-title">AI-Generated Insights</h3>
            </div>
            <div className="fd-insights-grid">
              {FARMER_INSIGHTS.map((insight, i) => (
                <div key={i} className="fd-insight-card">
                  <div className="fd-insight-icon" style={{ color: insight.accent }}>
                    {insight.icon}
                  </div>
                  <div className="fd-insight-card-title">{insight.title}</div>
                  <div className="fd-insight-card-text">{insight.text}</div>
                </div>
              ))}
            </div>
          </section> */}

          {/* Filters Section */}
          <div className="farmers-filters-section1">
            <div className="search-container">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="search-icon">
                <path d="M20.6667 18.6667H19.6133L19.24 18.3067C20.5467 16.7867 21.3333 14.8133 21.3333 12.6667C21.3333 7.88 17.4533 4 12.6667 4C7.88 4 4 7.88 4 12.6667C4 17.4533 7.88 21.3333 12.6667 21.3333C14.8133 21.3333 16.7867 20.5467 18.3067 19.24L18.6667 19.6133V20.6667L25.3333 27.32L27.32 25.3333L20.6667 18.6667ZM12.6667 18.6667C9.34667 18.6667 6.66667 15.9867 6.66667 12.6667C6.66667 9.34667 9.34667 6.66667 12.6667 6.66667C15.9867 6.66667 18.6667 9.34667 18.6667 12.6667C18.6667 15.9867 15.9867 18.6667 12.6667 18.6667Z" fill="#787878"/>
              </svg>
              <input 
                type="text" 
                placeholder="Search farmers..." 
                className="search-input" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Status Filter */}
            <div className="filter-dropdown" onClick={() => {
              closeAllDropdowns();
              setShowStatusDropdown(!showStatusDropdown);
            }}>
              <span>{selectedStatus}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
              </svg>
              {showStatusDropdown && (
                <div className="dropdown-menu">
                  {statusOptions.map(option => (
                    <div 
                      key={option} 
                      className="dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDropdownSelect('status', option);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Region Filter */}
            <div className="filter-dropdown" onClick={() => {
              closeAllDropdowns();
              setShowRegionDropdown(!showRegionDropdown);
            }}>
              <span>{selectedRegion}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
              </svg>
              {showRegionDropdown && (
                <div className="dropdown-menu">
                  {regionOptions.map(option => (
                    <div
                      key={option}
                      className="dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDropdownSelect('region', option);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Crop Filter */}
            <div className="filter-dropdown" onClick={() => {
              closeAllDropdowns();
              setShowCropDropdown(!showCropDropdown);
            }}>
              <span>{selectedCrop}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
              </svg>
              {showCropDropdown && (
                <div className="dropdown-menu">
                  {cropOptions.map(option => (
                    <div 
                      key={option} 
                      className="dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDropdownSelect('crop', option);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedFarmers.length > 0 && (
            <div className="bulk-actions-bar">
              <div className="bulk-actions-info">
                <span className="selected-count">{selectedFarmers.length} farmer(s) selected</span>
                <button 
                  className="clear-selection-btn"
                  onClick={() => setSelectedFarmers([])}
                >
                  Clear Selection
                </button>
              </div>
              <div className="bulk-actions-container">
                <div 
                  className="filter-dropdown bulk-actions-dropdown" 
                  onClick={() => setShowBulkActions(!showBulkActions)}
                >
                  <span>{bulkAction || 'Select Action'}</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
                  </svg>
                  {showBulkActions && (
                    <div className="dropdown-menu">
                      <div
                        className="dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBulkAction('Active');
                          setShowBulkActions(false);
                        }}
                      >
                        Set to Active
                      </div>
                      <div
                        className="dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBulkAction('Inactive');
                          setShowBulkActions(false);
                        }}
                      >
                        Set to Inactive
                      </div>
                    </div>
                  )}
                </div>
                <button 
                  className="apply-bulk-action-btn"
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="results-count">
            Showing {filteredData.length} of {farmersData.length} farmers
          </div>

          {/* Table with Checkboxes */}
          <div className="farmers-table-container">
            <div className="table-header">
              <div className="header-cell header-checkbox">
                <input
                  type="checkbox"
                  className="farmer-checkbox"
                  checked={isAllSelected}
                  ref={input => {
                    if (input) input.indeterminate = isSomeSelected;
                  }}
                  onChange={handleSelectAll}
                />
              </div>
              <div className="header-cell header-name">Name</div>
              <div className="header-cell header-username">Username</div>
              <div className="header-cell header-phone">Phone</div>
              <div className="header-cell header-location">Location</div>
              <div className="header-cell header-status">Status</div>
              {/* <div className="header-cell header-reg-date">Reg. Date</div>
              <div className="header-cell header-last-activity">Last Visit</div> */}
              <div className="header-cell header-action">Action</div>
            </div>

            <div className="table-body">
              {loadingFarmers ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="table-row table-row--skeleton">
                    <div className="table-cell cell-checkbox"><div className="skeleton-box skeleton-box--sm" /></div>
                    <div className="table-cell cell-name"><div className="skeleton-line" /></div>
                    <div className="table-cell cell-username"><div className="skeleton-line skeleton-line--medium" /></div>
                    <div className="table-cell cell-phone"><div className="skeleton-line skeleton-line--medium" /></div>
                    <div className="table-cell cell-location"><div className="skeleton-line skeleton-line--medium" /></div>
                    <div className="table-cell cell-status"><div className="skeleton-box skeleton-box--badge" /></div>
                    <div className="table-cell cell-action"><div className="skeleton-box skeleton-box--sm" /></div>
                  </div>
                ))
              ) : currentItems.length > 0 ? (
                currentItems.map((farmer) => (
                  <div key={farmer.id} className="table-row">
                    <div className="table-cell cell-checkbox">
                      <input
                        type="checkbox"
                        className="farmer-checkbox"
                        checked={selectedFarmers.includes(farmer.id)}
                        onChange={() => handleSelectFarmer(farmer.id)}
                      />
                    </div>
                    <div className="table-cell cell-name">{farmer.name}</div>
                    <div className="table-cell cell-username">{farmer.username}</div>
                    <div className="table-cell cell-phone">{maskPhone(farmer.phone)}</div>
                    <div className="table-cell cell-location">{farmer.location}</div>
                    <div className="table-cell cell-status">
                      <span className={`status-badge ${getStatusBadgeClass(farmer.status)}`}>
                        {farmer.status}
                      </span>
                    </div>
                    <div className="table-cell cell-action">
                      <div className="farmer-action-menu-wrapper">
                        <button
                          className="view-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openActionMenu === farmer.id) {
                              setOpenActionMenu(null);
                              return;
                            }
                            // Calculate fixed position so dropdown is never clipped
                            const rect = e.currentTarget.getBoundingClientRect();
                            const dropdownHeight = 88; // approx two-option dropdown
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const openUpward = spaceBelow < dropdownHeight + 12;
                            setDropdownPos({
                              top: openUpward
                                ? rect.top - dropdownHeight - 4
                                : rect.bottom + 4,
                              right: window.innerWidth - rect.right,
                            });
                            setOpenActionMenu(farmer.id);
                          }}
                          title="Actions"
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="#4CAF50"/>
                          </svg>
                        </button>
                        {openActionMenu === farmer.id && (
                          <div
                            className="farmer-action-dropdown"
                            style={{ top: dropdownPos.top, right: dropdownPos.right }}
                          >
                            <button
                              className="farmer-action-option"
                              onClick={(e) => { e.stopPropagation(); handleViewFarmer(farmer); setOpenActionMenu(null); }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="#4CAF50"/>
                              </svg>
                              View Profile
                            </button>
                            <button
                              className="farmer-action-option"
                              onClick={(e) => { e.stopPropagation(); handleViewStatement(farmer); setOpenActionMenu(null); }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="#4CAF50"/>
                              </svg>
                              View Farmer Statement
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : farmersData.length === 0 ? (
                <div className="farmers-empty-state">
                  <div className="farmers-empty-illustration">
                    <div className="farmers-empty-illustration-circle">
                      <svg width="60" height="60" viewBox="0 0 64 64" fill="none">
                        <path d="M32 14C25.37 14 20 19.37 20 26C20 32.63 25.37 38 32 38C38.63 38 44 32.63 44 26C44 19.37 38.63 14 32 14ZM32 35C27.03 35 23 30.97 23 26C23 21.03 27.03 17 32 17C36.97 17 41 21.03 41 26C41 30.97 36.97 35 32 35ZM32 41C23.99 41 8 45.01 8 53V56H56V53C56 45.01 40.01 41 32 41Z" fill="#4CAF50"/>
                      </svg>
                    </div>
                    <div className="farmers-empty-illustration-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="white"/>
                      </svg>
                    </div>
                  </div>
                  <h3 className="farmers-empty-title">No Farmers Onboarded Yet</h3>
                  <p className="farmers-empty-subtitle">Your farmer registry is empty. Start by adding your first farmer to begin tracking profiles, activities, and agricultural data.</p>
                  <button className="farmers-empty-cta" onClick={() => setIsCreateModalOpen(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C12.79 4 11 5.79 11 8C11 10.21 12.79 12 15 12ZM6 10V7H4V10H1V12H4V15H6V12H9V10H6ZM15 14C12.33 14 7 15.34 7 18V20H23V18C23 15.34 17.67 14 15 14Z" fill="white"/>
                    </svg>
                    Add First Farmer
                  </button>
                </div>
              ) : (
                <div className="farmers-empty-state">
                  <div className="farmers-empty-illustration">
                    <div className="farmers-noresults-illustration-circle">
                      <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
                        <path d="M42 20.34L41.66 20L32 29.66L22.34 20L22 20.34L31.66 30L22 39.66L22.34 40L32 30.34L41.66 40L42 39.66L32.34 30L42 20.34Z" fill="#9CA3AF"/>
                      </svg>
                    </div>
                  </div>
                  <h3 className="farmers-empty-title">No Results Found</h3>
                  <p className="farmers-empty-subtitle">No farmers match your current search or filter criteria.</p>
                  <p className="farmers-empty-tip">Try clearing your filters or searching with a different keyword.</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <button
                  className="pagination-btn"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                <div className="pagination-numbers">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === currentPage - 2 ||
                      pageNum === currentPage + 2
                    ) {
                      return <span key={pageNum} className="pagination-ellipsis">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  className="pagination-btn"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    <FarmerProfileModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  farmerId={selectedFarmerId}
/>

    <CreateFarmerModal
  isOpen={isCreateModalOpen}
  onClose={() => setIsCreateModalOpen(false)}
  onFarmerCreated={(newFarmer) => {
    setFarmersData(prev => [newFarmer, ...prev]);
  }}
/>



    </div>
  );
};

export default FarmersData;
