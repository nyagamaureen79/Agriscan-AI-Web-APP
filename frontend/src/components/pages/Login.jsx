import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import ReCAPTCHA from "react-google-recaptcha";
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaResponse, setCaptchaResponse] = useState(null);
  const [showCaptcha, setShowCaptcha] = useState(false); // whether to show CAPTCHA
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const returnTo = location.state?.returnTo;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!acceptedTerms) {
    toast.error('Please accept the terms and conditions to continue');
    return;
  }

  setIsLoading(true);

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/auth/login`,
      {
        email: formData.email,
        password: formData.password,
        captcha_response: captchaResponse,
      }
    );

    const { access_token, user } = response.data;

    // Save token and user info
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('loginTime', Date.now().toString());

    // Set default axios header
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

    toast.success('Login successful! Welcome back.');
    setCaptchaResponse(null);
    setShowCaptcha(false);

    // Navigate based on role (or return to previous page if session expired)
    setTimeout(() => {
      if (returnTo && returnTo !== '/login') {
        navigate(returnTo, { replace: true });
      } else if (user.role === "super_admin") {
        navigate("/super-admin/overview");
      } else {
        navigate("/dashboard");
      }
    }, 500);

  } catch (err) {
    const detail = err.response?.data?.detail;
    console.error('Login failed:', detail || err.message);
    toast.error(detail || 'Login failed. Check your credentials.');

    if (detail && detail.includes('Please solve CAPTCHA')) {
      setShowCaptcha(true);
      setCaptchaResponse(null);
    }

  } finally {
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

          <h1 className="login-title">AgriScan AI</h1>
          {/*  */}
        </div>

        {/* Login Form */}
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
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                className="form-input"
                required
              />
            </div>
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
                placeholder="Enter your password"
                className="form-input"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
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
                         {showCaptcha && (
  <ReCAPTCHA
    sitekey="6LeJ1R4sAAAAAM-SGOP1aElA_4wrYYb-FlKdxjgT"
    onChange={(token) => setCaptchaResponse(token)}
  />
)}
          </div>

          {/* Forgot Password Link */}
          <div className="forgot-password-container">
            <button type="button" className="forgot-password-link" onClick={() => navigate('/forgot-password')}>
              Forgot your password?
            </button>
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="terms-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
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
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p className="signup-prompt">
            Don't have an account?{' '}
            <Link to="/signup" className="signup-link">
              Sign Up
            </Link>
            
          </p>
          <p className="signup-prompt" >
          <button
  type="button"
  className="signup-prompt"
>
  Or
</button>
</p>
          <p className="signup-prompt" >
          <button
  type="button"
  className="signup-link"
  onClick={() => window.open("https://agriscanai.co.ke/contact", "_blank")}
>
  Contact Administrator
</button>
</p>
        </div>
        
        

      </div>
    </div>
  );
};

export default Login;
