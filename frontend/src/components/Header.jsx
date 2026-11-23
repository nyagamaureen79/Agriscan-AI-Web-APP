import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../utils/auth';

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Handle click outside to close dropdown
  useEffect(() => {
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsDropdownOpen(false);
    }
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);  // ✅ now defined
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, []);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const today = new Date();
const formattedDate = today.toLocaleDateString('en-US', {
  weekday: 'long', // Monday, Tuesday...
  month: 'long',   // January, February...
  day: 'numeric',  // 1, 2, 3...
  year: 'numeric', // 2025
});


  const handleSystemSettings = () => {
    setIsDropdownOpen(false);
    navigate('/system-settings');
  };

const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Navigate using React Router — do NOT reload page
    navigate('/login', { replace: true });
  };

  return (
    <header className="dashboard-header">
      <div className="header-content">
        <div className="welcome-section">
<h1 className="welcome-title">Welcome, {user.first_name || "User"}</h1>                <p className="welcome-date">{formattedDate}</p>
        </div>

        <div className="header-actions">
          <div className="search-container">
            <svg className="search-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="#9CA3AF"/>
            </svg>
            <input type="text" placeholder="Search..." className="search-input" />
          </div>

          <button className="notification-btn">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M15.9999 29.3333C17.4666 29.3333 18.6666 28.1333 18.6666 26.6667H13.3333C13.3333 28.1333 14.5199 29.3333 15.9999 29.3333ZM23.9999 21.3333V14.6667C23.9999 10.5733 21.8133 7.14667 17.9999 6.24V5.33333C17.9999 4.22667 17.1066 3.33333 15.9999 3.33333C14.8933 3.33333 13.9999 4.22667 13.9999 5.33333V6.24C10.1733 7.14667 7.99992 10.56 7.99992 14.6667V21.3333L5.33325 24V25.3333H26.6666V24L23.9999 21.3333Z" fill="#245421"/>
            </svg>
          </button>

          <div className="user-profile-container" ref={dropdownRef}>
            <div className="user-profileag" onClick={toggleDropdown}>
              <div className="user-avatarag">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M15.9999 16C18.9466 16 21.3333 13.6133 21.3333 10.6667C21.3333 7.72 18.9466 5.33333 15.9999 5.33333C13.0533 5.33333 10.6666 7.72 10.6666 10.6667C10.6666 13.6133 13.0533 16 15.9999 16ZM15.9999 18.6667C12.4399 18.6667 5.33325 20.4533 5.33325 24V26.6667H26.6666V24C26.6666 20.4533 19.5599 18.6667 15.9999 18.6667Z" fill="white"/>
                </svg>
              </div>
              <div className="user-infoag">
                
<span className="user-nameag">{user.first_name} {user.last_name}</span>
               <span className="user-roleag">
  {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
</span>

              </div>
              <svg
                className={`dropdown-icon ${isDropdownOpen ? 'rotated' : ''}`}
                width="24"
                height="22"
                viewBox="0 0 24 22"
                fill="none"
              >
                <path d="M7.41 8.13772L12 12.0722L16.59 8.13772L18 9.34899L12 14.5034L6 9.34899L7.41 8.13772Z" fill="#323232"/>
              </svg>
            </div>

            {isDropdownOpen && (
              <div className="header-dropdown">
                <button
                  className="dropdown-item"
                  onClick={handleSystemSettings}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" fill="#323639"/>
                  </svg>
                  System Settings
                </button>
                <button
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.59L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="#DC2626"/>
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
