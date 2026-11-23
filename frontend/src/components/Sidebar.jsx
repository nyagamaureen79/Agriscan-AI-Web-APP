import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="currentColor"/>
  </svg>
);

const ReportsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M6 2C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8.83C20 8.3 19.79 7.79 19.41 7.42L14.58 2.59C14.21 2.21 13.7 2 13.17 2H6ZM13 8V3.5L18.5 9H14C13.45 9 13 8.55 13 8Z" fill="currentColor"/>
  </svg>
);

const reportSubItems = [
  { name: "Farmer Registration", path: "/reports/farmer-registration" },
  { name: "Carbon Tracking", path: "/reports/carbon-tracking" },
  { name: "Disease & AI Diagnostics", path: "/reports/disease-ai-diagnostics" },
  { name: "Chatbot Insights", path: "/reports/chatbot-insights" },
  { name: "Financials", path: "/reports/financials" },
  { name: "Yield & Productions", path: "/reports/yield-productions" },


];


const FarmerApprovalIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none"> <path d="M14 7C14 9.21 12.21 11 10 11C7.79 11 6 9.21 6 7C6 4.79 7.79 3 10 3C12.21 3 14 4.79 14 7ZM2 19V17C2 14.34 7.33 13 10 13C10.44 13 10.97 13.05 11.53 13.14C11.19 13.84 11 14.62 11 15.5C11 17.42 11.97 19.11 13.44 20.13C12.53 20.04 11.25 20 10 20C7.33 20 2 18.66 2 17V19H2Z" fill="currentColor"/> <path d="M22.54 16.88L21.12 15.47L17.75 18.83L16.37 17.45L14.96 18.86L17.75 21.65L22.54 16.88Z" fill="currentColor"/> <circle cx="18" cy="15.5" r="4.5" fill="currentColor" fillOpacity="0.12"/> </svg> );
const Sidebar = () => {
  const location = useLocation();
  const isReportPath = location.pathname.startsWith('/reports');
  const [reportsOpen, setReportsOpen] = useState(isReportPath);

  const menuSections = [
    {
      title: "OVERVIEW",
      items: [
        {
          name: "Dashboard",
          path: "/dashboard",
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z" fill="currentColor"/>
            </svg>
          )
        }
      ]
    },
    {
      title: "FARM MANAGEMENT",
      items: [
        {
          name: "Farmers Data",
          path: "/farmers-data",
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
            </svg>
          )
        },
        { name: "Farmers Approvals", path: "/farmer-approvals", icon: <FarmerApprovalIcon />, },
        {
          name: "Disease Detection",
          path: "/disease-detection",
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4.47 21H19.53C21.07 21 22.03 19.33 21.26 18L13.73 4.98999C12.96 3.65999 11.04 3.65999 10.27 4.98999L2.74 18C1.97 19.33 2.93 21 4.47 21ZM12 14C11.45 14 11 13.55 11 13V11C11 10.45 11.45 9.99999 12 9.99999C12.55 9.99999 13 10.45 13 11V13C13 13.55 12.55 14 12 14ZM13 18H11V16H13V18Z" fill="currentColor"/>
            </svg>
          )
        }
      ]
    },
    {
      title: "INSIGHT & ANALYTICS",
      items: [
        {
          name: "Chatbot Insights",
          path: "/chatbot-insights",
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM9 11H7V9H9V11ZM13 11H11V9H13V11ZM17 11H15V9H17V11Z" fill="currentColor"/>
            </svg>
          )
        },
        {
          name: "Yield Insights",
          path: "/yield-insights",
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z" fill="currentColor"/>
            </svg>
          )
        }
      ]
    },
    {
      title: "FINANCIALS",
      items: [
        {
          name: "AgriPay",
          path: "/agripay",
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" fill="currentColor"/>
            </svg>
          )
        },
        {
          name: "Financial Tracking",
          path: "/financial-tracking",
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C12.92 6.9 13.63 7.44 13.89 8.3C14.01 8.7 14.34 9 14.76 9H15.06C15.72 9 16.19 8.35 15.96 7.73C15.54 6.55 14.56 5.57 13 5.19V4.5C13 3.67 12.33 3 11.5 3C10.67 3 10 3.67 10 4.5V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.85 17.1 9 16.51 8.67 15.67C8.52 15.28 8.18 15 7.77 15H7.49C6.82 15 6.35 15.68 6.6 16.3C7.17 17.69 8.5 18.51 10 18.83V19.5C10 20.33 10.67 21 11.5 21C12.33 21 13 20.33 13 19.5V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" fill="currentColor"/>
            </svg>
          )
        },
      ]
    },
    {
      title: "KNOWLEDGE & SUPPORT",
      items: [
        {
          name: "Knowledge Base",
          path: "/knowledge-base",
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04Z" fill="currentColor"/>
            </svg>
          )
        }
      ]
    },
    {
      title: "ADMINISTRATION",
      items: [
        {
          name: "User Management",
          path: "/user-management",
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 15C6.33 15 1 16.34 1 19V20C1 20.55 1.45 21 2 21H16C16.55 21 17 20.55 17 20V19C17 16.34 11.67 15 9 15Z" fill="currentColor"/>
              <path d="M4.74 9H13.27C13.54 9 13.76 8.78 13.76 8.51V8.49C13.76 8.22 13.54 8 13.27 8H13C13 6.52 12.19 5.25 11 4.55V5.5C11 5.78 10.78 6 10.5 6C10.22 6 10 5.78 10 5.5V4.14C9.68 4.06 9.35 4 9 4C8.65 4 8.32 4.06 8 4.14V5.5C8 5.78 7.78 6 7.5 6C7.22 6 7 5.78 7 5.5V4.55C5.81 5.25 5 6.52 5 8H4.74C4.47 8 4.25 8.22 4.25 8.49V8.52C4.25 8.78 4.47 9 4.74 9Z" fill="currentColor"/>
            </svg>
          )
        },
        {
          name: "System Settings",
          path: "/system-settings",
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19.43 12.98C19.47 12.66 19.5 12.34 19.5 12C19.5 11.66 19.47 11.34 19.43 11.02L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.97 19.05 5.05L16.56 6.05C16.04 5.65 15.48 5.32 14.87 5.07L14.49 2.42C14.46 2.18 14.25 2 14 2H9.99996C9.74996 2 9.53996 2.18 9.50996 2.42L9.12996 5.07C8.51996 5.32 7.95996 5.66 7.43996 6.05L4.94996 5.05C4.71996 4.96 4.45996 5.05 4.33996 5.27L2.33996 8.73C2.20996 8.95 2.26996 9.22 2.45996 9.37L4.56996 11.02C4.52996 11.34 4.49996 11.67 4.49996 12C4.49996 12.33 4.52996 12.66 4.56996 12.98L2.45996 14.63C2.26996 14.78 2.21996 15.05 2.33996 15.27L4.33996 18.73C4.45996 18.95 4.72996 19.03 4.94996 18.95L7.43996 17.95C7.95996 18.35 8.51996 18.68 9.12996 18.93L9.50996 21.58C9.53996 21.82 9.74996 22 9.99996 22H14C14.25 22 14.46 21.82 14.49 21.58L14.87 18.93C15.48 18.68 16.04 18.34 16.56 17.95L19.05 18.95C19.28 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98ZM12 15.5C10.07 15.5 8.49996 13.93 8.49996 12C8.49996 10.07 10.07 8.5 12 8.5C13.93 8.5 15.5 10.07 15.5 12C15.5 13.93 13.93 15.5 12 15.5Z" fill="currentColor"/>
            </svg>
          )
        }
      ]
    }
  ];

  return (
    <div className="sidebarag">
      <div className="sidebar-headerag">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/664b82161b4e4a92f2d2515e34408fdd59d6c130?width=386"
          alt="AgriScanAI Logo"
          className="sidebar-logoag"
        />
      </div>

      <nav className="sidebar-navag">
        {menuSections.slice(0, 3).map((section, sectionIndex) => (
          <div key={sectionIndex} className="nav-sectionag">
            <h3 className="nav-section-titleag">{section.title}</h3>
            <ul className="nav-itemsag">
              {section.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className={`nav-itemag ${
                    location.pathname === item.path ||
                    (location.pathname === '/' && item.path === '/dashboard')
                      ? 'active'
                      : ''
                  }`}
                >
                  <Link to={item.path} className="nav-linkag">
                    <span className="nav-iconag">{item.icon}</span>
                    <span className="nav-textag">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* REPORTS section with expandable dropdown */}
        <div className="nav-sectionag">
          <h3 className="nav-section-titleag">REPORTS</h3>
          <ul className="nav-itemsag">
            <li className={`nav-itemag reports-parent-item ${isReportPath ? 'reports-parent-active' : ''}`}>
              <button
                className="nav-linkag reports-toggle-btn"
                onClick={() => setReportsOpen(!reportsOpen)}
                aria-expanded={reportsOpen}
              >
                <span className="nav-iconag">
                  <ReportsIcon />
                </span>
                <span className="nav-textag">Reports</span>
                <span className={`reports-chevron-icon ${reportsOpen ? 'chevron-rotated' : ''}`}>
                  <ChevronDownIcon />
                </span>
              </button>
            </li>

            {reportsOpen && (
              <li className="reports-submenu-container">
                <div className="reports-submenu-track">
                  <ul className="reports-submenu-list">
                    {reportSubItems.map((subItem, idx) => {
                      const isActive = location.pathname === subItem.path;
                      return (
                        <li key={idx} className={`reports-submenu-item ${isActive ? 'reports-submenu-active' : ''}`}>
                          <Link to={subItem.path} className="reports-submenu-link">
                            <span className="reports-submenu-indicator" />
                            <span className="reports-submenu-label">{subItem.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            )}
          </ul>
        </div>

        {menuSections.slice(3).map((section, sectionIndex) => (
          <div key={sectionIndex + 3} className="nav-sectionag">
            <h3 className="nav-section-titleag">{section.title}</h3>
            <ul className="nav-itemsag">
              {section.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className={`nav-itemag ${
                    location.pathname === item.path ||
                    (location.pathname === '/' && item.path === '/dashboard')
                      ? 'active'
                      : ''
                  }`}
                >
                  <Link to={item.path} className="nav-linkag">
                    <span className="nav-iconag">{item.icon}</span>
                    <span className="nav-textag">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
