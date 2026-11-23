import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { useToast } from '../../contexts/ToastContext';
import './AuditLogs.css';

const AuditLogs = () => {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('All Actions');
  const [selectedUser, setSelectedUser] = useState('All Users');
  const [dateRange, setDateRange] = useState('All Time');
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const actionOptions = ['All Actions', 'Create', 'Edit', 'Delete', 'View', 'Export'];
  const dateOptions = ['All Time', 'Today', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days'];

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // const fetchAuditLogs = async () => {
  //   try {
  //     const response = await fetch(`${import.meta.env.VITE_API_URL}/audit-logs`);
  //     if (!response.ok) {
  //       throw new Error('Failed to fetch audit logs');
  //     }
  //     const data = await response.json();
  //     setLogs(data.logs || []);
  //     toast.success('Audit logs loaded successfully');
  //   } catch (err) {
  //     console.error('Error fetching audit logs:', err);
  //     toast.error(`Failed to load audit logs: ${err.message}`);
  //     setLogs(generateMockLogs());
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const generateMockLogs = () => {
    const actions = ['Create', 'Edit', 'Delete', 'View', 'Export'];
    const users = ['Nhial James', 'Michael Lam', 'Peter Paul', 'Sarah Johnson', 'David Kim'];
    const entities = ['Farmer', 'Disease Record', 'Payment', 'Report', 'User Account'];
    const mockLogs = [];

    for (let i = 0; i < 50; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 90));
      
      mockLogs.push({
        id: i + 1,
        action,
        entity: entities[Math.floor(Math.random() * entities.length)],
        entityId: `F${Math.floor(Math.random() * 1000)}`,
        user: users[Math.floor(Math.random() * users.length)],
        userId: Math.floor(Math.random() * 100),
        timestamp: date.toISOString(),
        details: action === 'Create' 
          ? 'Created new record'
          : action === 'Edit'
          ? 'Updated status from Pending to Active'
          : action === 'Delete'
          ? 'Permanently deleted record'
          : action === 'Export'
          ? 'Exported data to CSV'
          : 'Viewed record details',
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      });
    }

    return mockLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const userOptions = useMemo(() => {
    const users = new Set(['All Users']);
    logs.forEach(log => users.add(log.user));
    return Array.from(users);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = selectedAction === 'All Actions' || log.action === selectedAction;
      const matchesUser = selectedUser === 'All Users' || log.user === selectedUser;

      let matchesDate = true;
      if (dateRange !== 'All Time') {
        const logDate = new Date(log.timestamp);
        const now = new Date();
        const daysDiff = Math.floor((now - logDate) / (1000 * 60 * 60 * 24));

        switch(dateRange) {
          case 'Today':
            matchesDate = daysDiff === 0;
            break;
          case 'Last 7 Days':
            matchesDate = daysDiff <= 7;
            break;
          case 'Last 30 Days':
            matchesDate = daysDiff <= 30;
            break;
          case 'Last 90 Days':
            matchesDate = daysDiff <= 90;
            break;
          default:
            matchesDate = true;
        }
      }

      return matchesSearch && matchesAction && matchesUser && matchesDate;
    });
  }, [logs, searchTerm, selectedAction, selectedUser, dateRange]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedAction, selectedUser, dateRange]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const getActionBadgeClass = (action) => {
    switch(action.toLowerCase()) {
      case 'create':
        return 'action-badge-create';
      case 'edit':
        return 'action-badge-edit';
      case 'delete':
        return 'action-badge-delete';
      case 'view':
        return 'action-badge-view';
      case 'export':
        return 'action-badge-export';
      default:
        return 'action-badge-default';
    }
  };

  const getActionIcon = (action) => {
    switch(action.toLowerCase()) {
      case 'create':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
          </svg>
        );
      case 'edit':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="currentColor"/>
          </svg>
        );
      case 'delete':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="currentColor"/>
          </svg>
        );
      case 'view':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
          </svg>
        );
      case 'export':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 13V18C19 18.55 18.55 19 18 19H6C5.45 19 5 18.55 5 18V13C5 12.45 4.55 12 4 12C3.45 12 3 12.45 3 13V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13C21 12.45 20.55 12 20 12C19.45 12 19 12.45 19 13ZM13 12.67L14.88 10.79C15.27 10.4 15.9 10.4 16.29 10.79C16.68 11.18 16.68 11.81 16.29 12.2L12.7 15.79C12.31 16.18 11.68 16.18 11.29 15.79L7.7 12.2C7.31 11.81 7.31 11.18 7.7 10.79C8.09 10.4 8.72 10.4 9.11 10.79L11 12.67V4C11 3.45 11.45 3 12 3C12.55 3 13 3.45 13 4V12.67Z" fill="currentColor"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const closeAllDropdowns = () => {
    setShowActionDropdown(false);
    setShowUserDropdown(false);
    setShowDateDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.filter-dropdown')) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content">
          <div className="audit-logs-header">
            <div className="audit-title-section">
              <div className="title-content">
                <h1 className="audit-title">Audit Logs</h1>
                <p className="audit-subtitle">Track all system activities, changes, and user actions</p>
              </div>
            </div>
          </div>

          <div className="audit-stats-grid">
            <div className="audit-stat-card">
              <div className="stat-icon stat-icon-total">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="#4CAF50"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Total Logs</div>
                <div className="stat-value">{logs.length}</div>
              </div>
            </div>

            <div className="audit-stat-card">
              <div className="stat-icon stat-icon-today">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="#2196F3"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Today's Activity</div>
                <div className="stat-value">{logs.filter(log => {
                  const logDate = new Date(log.timestamp);
                  const today = new Date();
                  return logDate.toDateString() === today.toDateString();
                }).length}</div>
              </div>
            </div>

            <div className="audit-stat-card">
              <div className="stat-icon stat-icon-users">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="#8159E1"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Active Users</div>
                <div className="stat-value">{userOptions.length - 1}</div>
              </div>
            </div>

            <div className="audit-stat-card">
              <div className="stat-icon stat-icon-critical">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#DC2626"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Deletions</div>
                <div className="stat-value">{logs.filter(log => log.action === 'Delete').length}</div>
              </div>
            </div>
          </div>

          <div className="audit-filters-section">
            <div className="search-container">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="search-icon">
                <path d="M20.6667 18.6667H19.6133L19.24 18.3067C20.5467 16.7867 21.3333 14.8133 21.3333 12.6667C21.3333 7.88 17.4533 4 12.6667 4C7.88 4 4 7.88 4 12.6667C4 17.4533 7.88 21.3333 12.6667 21.3333C14.8133 21.3333 16.7867 20.5467 18.3067 19.24L18.6667 19.6133V20.6667L25.3333 27.32L27.32 25.3333L20.6667 18.6667ZM12.6667 18.6667C9.34667 18.6667 6.66667 15.9867 6.66667 12.6667C6.66667 9.34667 9.34667 6.66667 12.6667 6.66667C15.9867 6.66667 18.6667 9.34667 18.6667 12.6667C18.6667 15.9867 15.9867 18.6667 12.6667 18.6667Z" fill="#787878"/>
              </svg>
              <input 
                type="text" 
                placeholder="Search logs..." 
                className="search-input" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-dropdown" onClick={() => {
              closeAllDropdowns();
              setShowActionDropdown(!showActionDropdown);
            }}>
              <span>{selectedAction}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
              </svg>
              {showActionDropdown && (
                <div className="dropdown-menu">
                  {actionOptions.map(option => (
                    <div 
                      key={option} 
                      className="dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAction(option);
                        setShowActionDropdown(false);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-dropdown" onClick={() => {
              closeAllDropdowns();
              setShowUserDropdown(!showUserDropdown);
            }}>
              <span>{selectedUser}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
              </svg>
              {showUserDropdown && (
                <div className="dropdown-menu">
                  {userOptions.map(option => (
                    <div 
                      key={option} 
                      className="dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(option);
                        setShowUserDropdown(false);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-dropdown" onClick={() => {
              closeAllDropdowns();
              setShowDateDropdown(!showDateDropdown);
            }}>
              <span>{dateRange}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#787878"/>
              </svg>
              {showDateDropdown && (
                <div className="dropdown-menu">
                  {dateOptions.map(option => (
                    <div 
                      key={option} 
                      className="dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateRange(option);
                        setShowDateDropdown(false);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="results-count">
            Showing {filteredLogs.length} of {logs.length} log entries
          </div>

          <div className="audit-logs-container">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading audit logs...</p>
              </div>
            ) : currentLogs.length > 0 ? (
              <div className="logs-list">
                {currentLogs.map((log) => (
                  <div key={log.id} className="log-entry">
                    <div className="log-main-content">
                      <div className="log-action-badge">
                        <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                          {getActionIcon(log.action)}
                          {log.action}
                        </span>
                      </div>
                      <div className="log-details">
                        <div className="log-description">
                          <span className="log-entity">{log.entity}</span>
                          <span className="log-entity-id">#{log.entityId}</span>
                          <span className="log-separator">•</span>
                          <span className="log-text">{log.details}</span>
                        </div>
                        <div className="log-meta">
                          <div className="log-user">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                            </svg>
                            {log.user}
                          </div>
                          <span className="log-separator">•</span>
                          <div className="log-ip">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.44 4 16.08 4 12C4 11.38 4.08 10.79 4.21 10.21L9 15V16C9 17.1 9.9 18 11 18V19.93ZM17.9 17.39C17.64 16.58 16.9 16 16 16H15V13C15 12.45 14.55 12 14 12H8V10H10C10.55 10 11 9.55 11 9V7H13C14.1 7 15 6.1 15 5V4.59C17.93 5.78 20 8.65 20 12C20 14.08 19.2 15.97 17.9 17.39Z" fill="currentColor"/>
                            </svg>
                            {log.ipAddress}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="log-timestamp">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6H12L10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6ZM20 18H4V6H9.17L11.17 8H20V18ZM12 10H14V12H16V14H14V16H12V14H10V12H12V10Z" fill="#E1E7EF"/>
                </svg>
                <p>No audit logs found</p>
                <span>Try adjusting your filters</span>
              </div>
            )}

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
    </div>
  );
};

export default AuditLogs;
