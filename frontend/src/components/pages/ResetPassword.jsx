import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from "react-router-dom";
import { useToast } from '../../contexts/ToastContext';
import './Login.css';
import './ResetPassword.css';
import axios from "axios";

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validations, setValidations] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  const navigate = useNavigate();
const location = useLocation();
const token = new URLSearchParams(location.search).get("token");

  const toast = useToast();

  const validatePassword = (password) => {
    setValidations({
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'newPassword') {
      validatePassword(value);
    }
  };

  const isPasswordValid = () => {
    return Object.values(validations).every(v => v === true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isPasswordValid()) {
      toast.error('Password does not meet all requirements');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await axios.post(`${import.meta.env.VITE_API_URL}/reset/reset-password`, {
        token: token,
        new_password: formData.newPassword,
      });
      
      toast.success('Password reset successfully! Redirecting to login...');
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
  console.error("Reset error:", error.response?.data || error.message);
  toast.error(error.response?.data?.detail || 'Failed to reset password.');
}
 finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo and Title */}
        <div className="login-header">
          <div className="login-logo">
             <img
    src="/favicon.ico"
    alt="AgriScan AI Logo"
    style={{ width: "3rem", height: "3rem" }}
  />
          </div>
          <h1 className="login-title">Reset Password</h1>
          <p className="login-subtitle">Create a new secure password for your account</p>
        </div>

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* New Password Field */}
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9C13.71 2.9 15.1 4.29 15.1 6V8Z" fill="#65758B"/>
              </svg>
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password"
                className="form-input"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? (
                  <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                    <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7ZM12 15C10.34 15 9 13.66 9 12C9 10.34 10.34 9 12 9C13.66 9 15 10.34 15 12C15 13.66 13.66 15 12 15ZM12 4.5C17 4.5 21.27 7.61 23 12C21.27 16.39 17 19.5 12 19.5C7 19.5 2.73 16.39 1 12C2.73 7.61 7 4.5 12 4.5ZM3.18 12C4.83 15.36 8.24 17.5 12 17.5C15.76 17.5 19.17 15.36 20.82 12C19.17 8.64 15.76 6.5 12 6.5C8.24 6.5 4.83 8.64 3.18 12Z" fill="#65758B"/>
                  </svg>
                ) : (
                  <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                    <path d="M12 7C9.24 7 7 9.24 7 12C7 12.65 7.13 13.26 7.36 13.82L9.13 12.05C9.13 12.03 9.12 12.02 9.12 12C9.12 10.34 10.46 8.99 12.12 8.99C12.14 8.99 12.15 9 12.17 9L13.81 7.36C13.25 7.13 12.64 7 12 7ZM2.01 3.87L4.69 6.55C3.06 7.83 1.77 9.75 1 12C2.73 16.39 7 19.5 12 19.5C13.52 19.5 14.97 19.13 16.31 18.46L19.42 21.57L20.49 20.5L3.08 2.8L2.01 3.87ZM12 17.5C8.24 17.5 4.83 15.36 3.18 12C3.88 10.46 4.9 9.07 6.16 7.93L7.75 9.52C7.56 10.04 7.45 10.61 7.45 11.21C7.45 13.22 9.08 14.85 11.09 14.85C11.69 14.85 12.26 14.74 12.78 14.55L14.37 16.14C13.32 16.75 12.7 17.5 12 17.5ZM14.97 11.17C14.97 9.16 13.34 7.53 11.33 7.53C10.73 7.53 10.16 7.64 9.64 7.83L11.17 9.36C11.28 9.34 11.4 9.33 11.53 9.33C12.38 9.33 13.07 10.02 13.07 10.87C13.07 11 13.06 11.12 13.04 11.23L14.97 11.17Z" fill="#65758B"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <div className="password-validations">
              <div className={`validation-item ${validations.minLength ? 'valid' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                </svg>
                <span>At least 8 characters</span>
              </div>
              <div className={`validation-item ${validations.hasUpperCase ? 'valid' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                </svg>
                <span>One uppercase letter</span>
              </div>
              <div className={`validation-item ${validations.hasLowerCase ? 'valid' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                </svg>
                <span>One lowercase letter</span>
              </div>
              <div className={`validation-item ${validations.hasNumber ? 'valid' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                </svg>
                <span>One number</span>
              </div>
              <div className={`validation-item ${validations.hasSpecialChar ? 'valid' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                </svg>
                <span>One special character</span>
              </div>
            </div>
          )}

          {/* Confirm Password Field */}
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9C13.71 2.9 15.1 4.29 15.1 6V8Z" fill="#65758B"/>
              </svg>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
                className="form-input"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                    <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7ZM12 15C10.34 15 9 13.66 9 12C9 10.34 10.34 9 12 9C13.66 9 15 10.34 15 12C15 13.66 13.66 15 12 15ZM12 4.5C17 4.5 21.27 7.61 23 12C21.27 16.39 17 19.5 12 19.5C7 19.5 2.73 16.39 1 12C2.73 7.61 7 4.5 12 4.5ZM3.18 12C4.83 15.36 8.24 17.5 12 17.5C15.76 17.5 19.17 15.36 20.82 12C19.17 8.64 15.76 6.5 12 6.5C8.24 6.5 4.83 8.64 3.18 12Z" fill="#65758B"/>
                  </svg>
                ) : (
                  <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                    <path d="M12 7C9.24 7 7 9.24 7 12C7 12.65 7.13 13.26 7.36 13.82L9.13 12.05C9.13 12.03 9.12 12.02 9.12 12C9.12 10.34 10.46 8.99 12.12 8.99C12.14 8.99 12.15 9 12.17 9L13.81 7.36C13.25 7.13 12.64 7 12 7ZM2.01 3.87L4.69 6.55C3.06 7.83 1.77 9.75 1 12C2.73 16.39 7 19.5 12 19.5C13.52 19.5 14.97 19.13 16.31 18.46L19.42 21.57L20.49 20.5L3.08 2.8L2.01 3.87ZM12 17.5C8.24 17.5 4.83 15.36 3.18 12C3.88 10.46 4.9 9.07 6.16 7.93L7.75 9.52C7.56 10.04 7.45 10.61 7.45 11.21C7.45 13.22 9.08 14.85 11.09 14.85C11.69 14.85 12.26 14.74 12.78 14.55L14.37 16.14C13.32 16.75 12.7 17.5 12 17.5ZM14.97 11.17C14.97 9.16 13.34 7.53 11.33 7.53C10.73 7.53 10.16 7.64 9.64 7.83L11.17 9.36C11.28 9.34 11.4 9.33 11.53 9.33C12.38 9.33 13.07 10.02 13.07 10.87C13.07 11 13.06 11.12 13.04 11.23L14.97 11.17Z" fill="#65758B"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading || !isPasswordValid()}
          >
            {isLoading ? (
              <div className="loading-spinner">
                <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                    <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Resetting Password...
              </div>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p className="signup-prompt">
            Remember your password? 
            <button type="button" className="signup-link" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
