import React, { useState, useEffect } from 'react';
import { FiX, FiDownload, FiCalendar, FiDollarSign } from 'react-icons/fi';
import './FarmerPaymentHistoryModal.css';

const FarmerPaymentHistoryModal = ({ isOpen, onClose, farmer }) => {
  const API_BASE = import.meta.env.VITE_API_URL;
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && farmer) {
      fetchPaymentHistory();
    }
  }, [isOpen, farmer]);

 const fetchPaymentHistory = async () => {
  setIsLoading(true);
  try {
    const response = await fetch(`${API_BASE}/api/mpesa/b2c/farmer/${farmer.id}/history`);
    if (!response.ok) throw new Error("Failed to fetch payment history");
    const data = await response.json();
    setPaymentHistory(data.payments || []);
  } catch (error) {
    console.error("Error fetching payment history:", error);
  } finally {
    setIsLoading(false);
  }
};


  const filteredPayments = paymentHistory
    .filter(payment => statusFilter === 'all' || payment.status === statusFilter)
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortField === 'amount') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `KES ${Number(amount).toLocaleString()}`;
  };const getStatusBadge = (status) => {
  const normalized = (status || '').toLowerCase();
  const statusConfig = {
    success: { class: 'success', label: 'Success' },
    completed: { class: 'success', label: 'Completed' },
    pending: { class: 'warning', label: 'Pending' },
    failed: { class: 'danger', label: 'Failed' },
    processing: { class: 'info', label: 'Processing' }
  };

  const config = statusConfig[normalized] || { class: 'default', label: status };
  return (
    <span className={`status-badge status-${config.class}`}>
      {config.label}
    </span>
  );
};


  const handleExport = () => {
    const headers = ['Payment ID', 'Date', 'Amount', 'Purpose', 'Method', 'Status', 'Reference'];
    const csvContent = [
      headers.join(','),
      ...filteredPayments.map(payment => [
        payment.id,
        payment.date,
        payment.amount,
        payment.purpose,
        payment.method,
        payment.status,
        payment.reference
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${farmer?.name}_payment_history.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const totalPayments = filteredPayments.length;
  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const completedAmount = filteredPayments
  .filter(p => p.status === 'completed' || p.status === 'success')
  .reduce((sum, payment) => sum + payment.amount, 0);

  const pendingAmount = filteredPayments
    .filter(p => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, payment) => sum + payment.amount, 0);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="farmer-payment-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <h2 className="modal-title">Payment History</h2>
            <div className="modal-subtitle">
              <div className="farmer-info">
                <strong>{farmer?.name || 'Unknown Farmer'}</strong>
                <span className="farmer-phone">{farmer?.phone || 'No phone'}</span>
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-icon">
                <FiCalendar />
              </div>
              <div className="summary-content">
                <div className="summary-value">{totalPayments}</div>
                <div className="summary-label">Total Payments</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">
                <FiDollarSign />
              </div>
              <div className="summary-content">
                <div className="summary-value">{formatCurrency(totalAmount)}</div>
                <div className="summary-label">Total Amount</div>
              </div>
            </div>
            <div className="summary-card success">
              <div className="summary-icon">
                <FiDollarSign />
              </div>
              <div className="summary-content">
                <div className="summary-value">{formatCurrency(completedAmount)}</div>
                <div className="summary-label">Completed</div>
              </div>
            </div>
            <div className="summary-card warning">
              <div className="summary-icon">
                <FiDollarSign />
              </div>
              <div className="summary-content">
                <div className="summary-value">{formatCurrency(pendingAmount)}</div>
                <div className="summary-label">Pending</div>
              </div>
            </div>
          </div>

          <div className="history-filters">
            <div className="filter-group">
              <label className="filter-label">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="filter-results">
              Showing {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
            </div>
            <button className="btn btn-secondary" onClick={handleExport}>
              <FiDownload /> Export CSV
            </button>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading payment history...</p>
            </div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('id')}>
                      Payment ID
                      {sortField === 'id' && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th className="sortable" onClick={() => handleSort('date')}>
                      Date
                      {sortField === 'date' && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th className="sortable" onClick={() => handleSort('amount')}>
                      Amount
                      {sortField === 'amount' && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th>Purpose</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">
                        No payment history found for this farmer.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          <code className="payment-code">{payment.id}</code>
                        </td>
                        <td>{formatDate(payment.date)}</td>
                        <td>
                          <span className="amount">{formatCurrency(payment.amount)}</span>
                        </td>
                        <td>{payment.purpose}</td>
                        <td>{payment.method}</td>
                        <td>{getStatusBadge(payment.status)}</td>
                        <td>
                          <code className="reference-code">{payment.reference}</code>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerPaymentHistoryModal;
