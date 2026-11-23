import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiX, FiDollarSign, FiUser } from 'react-icons/fi';
import './FarmerPaymentActionModal.css';

const API_BASE = import.meta.env.VITE_API_URL;

const FarmerPaymentActionModal = ({ isOpen, onClose, farmer }) => {
  const [formData, setFormData] = useState({
    amount: '',
    purpose: 'Donation',
    paymentMethod: 'M-Pesa',
    notes: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (parseFloat(formData.amount) > 1000000) {
      newErrors.amount = 'Amount cannot exceed KES 1,000,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      // Post directly to your backend payment endpoint
      const response = await axios.post(`${API_BASE}/api/mpesa/b2c/initiate`, {
        farmer_id: parseInt(farmer?.id),
        amount: parseFloat(formData.amount),
        reference: formData.purpose, //  Use the selected purpose as reference
      });

      toast.success('Payment initiated successfully!');
      console.log('M-Pesa response:', response.data);

      // reset form after success
      setFormData({
        amount: '',
        purpose: 'Donation',
        paymentMethod: 'M-Pesa',
        notes: ''
      });

      onClose();

    } catch (err) {
      console.error('Payment failed:', err);
      toast.error('Payment failed: ' + (err?.response?.data?.detail || err.message));
      setErrors({ submit: 'Failed to process payment. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setFormData({
        amount: '',
        purpose: 'Donation',
        paymentMethod: 'M-Pesa',
        notes: ''
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="farmer-payment-action-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <h2 className="modal-title">Make Payment</h2>
            <div className="modal-subtitle">
              <div className="farmer-details">
                <FiUser className="farmer-icon" />
                <div className="farmer-info">
                  <strong>{farmer?.name || 'Unknown Farmer'}</strong>
                  <span className="farmer-phone">{farmer?.phone || 'No phone'}</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            className="modal-close" 
            onClick={handleClose}
            disabled={isProcessing}
          >
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} className="payment-form">
            <div className="farmer-info-card">
              <div className="info-row">
                <span className="info-label">Farmer ID:</span>
                <span className="info-value">{farmer?.id || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Location:</span>
                <span className="info-value">{farmer?.location || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Status:</span>
                <span className={`status-badge status-${farmer?.status?.toLowerCase() || 'active'}`}>
                  {farmer?.status || 'Active'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Amount (KES) <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <FiDollarSign className="input-icon" />
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className={`form-input ${errors.amount ? 'error' : ''}`}
                  step="0.01"
                  min="0"
                  disabled={isProcessing}
                  required
                />
              </div>
              {errors.amount && <span className="error-message">{errors.amount}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Purpose <span className="required">*</span></label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                className="form-select"
                disabled={isProcessing}
                required
              >
                <option value="Donation">Donation</option>
                <option value="Loan Payment">Loan Payment</option>
                <option value="Crop Purchase">Crop Purchase</option>
                <option value="Equipment">Equipment</option>
                <option value="Emergency Aid">Emergency Aid</option>
                <option value="Drought Assistance">Drought Assistance</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method <span className="required">*</span></label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className="form-select"
                disabled={isProcessing}
                required
              >
                <option value="M-Pesa">M-Pesa</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add payment notes..."
                className="form-textarea"
                rows="4"
                disabled={isProcessing}
              />
            </div>

            {errors.submit && (
              <div className="error-alert">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z" fill="#DC2626"/>
                </svg>
                {errors.submit}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-cancel"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-submit"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="button-spinner"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <FiDollarSign />
                    Pay Now
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FarmerPaymentActionModal;
