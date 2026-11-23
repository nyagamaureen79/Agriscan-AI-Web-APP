import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import './Login.css';
import axios from "axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate API call
 await axios.post(`${import.meta.env.VITE_API_URL}/reset/forgot-password`, {
        email,
      });      
      // Show success message
      toast.success('Password reset link has been sent to your email');
      
      // Navigate back to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (error) {
  const backendMessage = error.response?.data?.detail;

  toast.error(
    backendMessage
      ? backendMessage
      : "Failed to send reset link. Please try again."
  );

  console.error("Forgot password error:", error);
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
          <h1 className="login-title">Forgot Password</h1>
          <p className="login-subtitle">Enter your email address and we'll send you a link to reset your password</p>
        </div>

        {/* Forgot Password Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* Email Field */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none">
                <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="#65758B"/>
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="login-button"
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
                Sending Link...
              </div>
            ) : (
              'Send Reset Link'
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

export default ForgotPassword;
