import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiUser,
  FiLogOut,
  FiCreditCard,
  FiBarChart2,
  FiActivity,
  FiTrendingUp,
  FiAlertTriangle,
  FiWind,
} from "react-icons/fi";
import "../../styles/SuperAdminSidebar.css";
import { logout } from "../../utils/auth"; 

const SuperAdminSidebar = ({ activePage }) => {
  const navigation = [
    {
      name: "Overview",
      path: "/super-admin/overview",
      icon: FiHome,
      key: "overview",
    },
      {
        name: "Tenants",
        path: "/super-admin/tenants",
        icon: FiUsers,
        key: "tenants",
      },
      {
        name: "Farmers Data",
        path: "/super-admin/farmers-data",
        icon: FiUser,
        key: "farmers-data",
      },
      {
        name: "Disease Detection",
        path: "/super-admin/disease-detection",
        icon: FiAlertTriangle,
        key: "disease-detection",
      },
      {
        name: "Carbon Analytics",
        path: "/super-admin/carbon-analytics",
        icon: FiWind,
        key: "carbon-analytics",
      },
    {
      name: "Payments",
      path: "/super-admin/payments",
      icon: FiCreditCard,
      key: "payments",
    },
    {
      name: "Analytics",
      path: "/super-admin/analytics",
      icon: FiBarChart2,
      key: "analytics",
    },
  ];
  const navigate = useNavigate();

   const handleLogout = () => {
      logout();
      navigate("/login");
    };
    // Get the user data from localStorage
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="super-admin-sidebar">
      <div className="sidebar-header">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/664b82161b4e4a92f2d2515e34408fdd59d6c130?width=386"
          alt="AgriScanAI Logo"
          className="sidebar-logoag"
        />
      </div>
   

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.key;

            return (
              <li key={item.key} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link ${isActive ? "active" : ""}`}
                >
                  <Icon className="nav-icon" />
                  <span className="nav-text">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
        <div className="sidebar-footer">
              <button
                className="logout-button-bottom"
                onClick={handleLogout}
              >
                <span className="nav-icon">
                  <FiLogOut size={20} />
                </span>
              
                  <span className="nav-label">Logout</span>
                
              </button>
      {/* <div className="sidebar-footer">
        <Link to="/settings" className="nav-link">
          <FiSettings className="nav-icon" />
          <span className="nav-text">Settings</span>
        </Link>
      </div> */}
    </div>
    </div>
  );
};

export default SuperAdminSidebar;
