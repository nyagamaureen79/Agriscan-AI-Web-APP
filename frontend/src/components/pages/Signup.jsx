import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import './Signup.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    tenantCode: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const toast = useToast();

  const validateForm = () => {
    const newErrors = {};

    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone Number validation
    const phoneRegex = /^\+?[0-9\s-]{7,15}$/;
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    // Tenant Code validation
    if (!formData.tenantCode.trim()) {
      newErrors.tenantCode = 'Tenant code is required';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/signup`, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone_number: formData.phoneNumber,
        tenant_code: formData.tenantCode,
        password: formData.password
      });

      toast.success('Account created! Please wait for admin approval before logging in.');
      
      // Navigate to login after short delay
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      console.error('Signup failed:', detail || err.message);
      
      if (detail && detail.includes('already registered')) {
        toast.error('This email is already registered. Please login instead.');
      } else {
        toast.error(detail || 'Signup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        {/* Logo and Title */}
        <div className="signup-header">
          <div className="signup-logo">
            <img
              src="/favicon.ico"
              alt="AgriScan AI Logo"
              style={{ width: "3rem", height: "3rem" }}
            />
          </div>
          <h1 className="signup-title">Create Account</h1>
          <p className="signup-subtitle">Join AgriScan AI to get started</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="signup-form">
          {/* Name Fields Row */}
          <div className="form-row">
            {/* First Name Field */}
            <div className="form-group">
              <label className="form-label">First Name</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#65758B"/>
                </svg>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  className={`form-input ${errors.firstName ? 'input-error' : ''}`}
                />
              </div>
              {errors.firstName && <span className="error-text">{errors.firstName}</span>}
            </div>

            {/* Last Name Field */}
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#65758B"/>
                </svg>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className={`form-input ${errors.lastName ? 'input-error' : ''}`}
                />
              </div>
              {errors.lastName && <span className="error-text">{errors.lastName}</span>}
            </div>
          </div>

          {/* Email Field */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="#65758B"/>
              </svg>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john.doe@example.com"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
              />
            </div>
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          {/* Phone Number Field */}
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z" fill="#65758B"/>
              </svg>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+1 234 567 8900"
                className={`form-input ${errors.phoneNumber ? 'input-error' : ''}`}
              />
            </div>
            {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
          </div>

          {/* Tenant Code Field */}
          <div className="form-group">
            <label className="form-label">Tenant Code</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                <path d="M12 7V3H2V21H22V7H12ZM6 19H4V17H6V19ZM6 15H4V13H6V15ZM6 11H4V9H6V11ZM6 7H4V5H6V7ZM10 19H8V17H10V19ZM10 15H8V13H10V15ZM10 11H8V9H10V11ZM10 7H8V5H10V7ZM20 19H12V17H14V15H12V13H14V11H12V9H20V19ZM18 11H16V13H18V11ZM18 15H16V17H18V15Z" fill="#65758B"/>
              </svg>
              <input
                type="text"
                name="tenantCode"
                value={formData.tenantCode}
                onChange={handleInputChange}
                placeholder="Enter your tenant code"
                className={`form-input ${errors.tenantCode ? 'input-error' : ''}`}
              />
            </div>
            {errors.tenantCode && <span className="error-text">{errors.tenantCode}</span>}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9C13.71 2.9 15.1 4.29 15.1 6V8Z" fill="#65758B"/>
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="At least 8 characters"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
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
            {errors.password && <span className="error-text">{errors.password}</span>}
            <p className="password-hint">Must contain uppercase, lowercase, and number</p>
          </div>

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
                placeholder="Re-enter your password"
                className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
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
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="terms-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  if (errors.terms) {
                    setErrors(prev => ({ ...prev, terms: '' }));
                  }
                }}
                className="checkbox-input"
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">
                I agree to the{' '}
                <Link to="/terms-and-conditions" className="terms-link" target="_blank">
                  Terms and Conditions
                </Link>
              </span>
            </label>
            {errors.terms && <span className="error-text">{errors.terms}</span>}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="signup-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="loading-spinner">
                <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                    <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Creating account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="signup-footer">
          <p className="login-prompt">
            Already have an account?{' '}
            <Link to="/login" className="login-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
