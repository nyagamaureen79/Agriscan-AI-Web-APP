import React, { useState, useRef } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { useEffect } from "react";
import axios from "axios";
import FarmerPaymentHistoryModal from '../AgriPay/FarmerPaymentHistoryModal';
import FarmerPaymentActionModal from '../AgriPay/FarmerPaymentActionModal';

const AgriPay = () => {
 const API_BASE = import.meta.env.VITE_API_URL;

const [activeTab, setActiveTab] = useState('Payments');

const [formData, setFormData] = useState({
  farmerId: '',
  farmerName: '',
  amount: '',
  reference: '',
  paymentMethod: 'M-Pesa',
  purpose: 'Donation',
  notes: '',
});

const [lookupCode, setLookupCode] = useState('');
const [lookupLoading, setLookupLoading] = useState(false);
const [lookupNotFound, setLookupNotFound] = useState(false);
const [lookupSuggestions, setLookupSuggestions] = useState([]);
const [showSuggestions, setShowSuggestions] = useState(false);
const [farmerDetails, setFarmerDetails] = useState(null);
const lookupTimerRef = useRef(null);
const searchTimerRef = useRef(null);
const lookupInputRef = useRef(null);

const [settings, setSettings] = useState({
  twoFactor: true,
  paymentApprovals: true,
  auditLogging: true,
});

const toggleSetting = (key) => {
  setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
};

const [transactions, setTransactions] = useState([]);
const [farmers, setFarmers] = useState([]);
const [stats, setStats] = useState({});
const [showPaymentHistory, setShowPaymentHistory] = useState(false);
const [showPaymentAction, setShowPaymentAction] = useState(false);
const [selectedFarmer, setSelectedFarmer] = useState(null);

useEffect(() => {
  axios.get(`${API_BASE}/farmers`)
    .then(res => {
      const data = res.data.farmers || [];
      setFarmers(Array.isArray(data) ? data : []);
    })
    .catch(() => setFarmers([]));
}, []);

useEffect(() => {
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mpesa/b2c/stats`);
      const data = await res.json();
      console.log("Fetched stats:", data);
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  fetchStats();
}, [API_BASE]);
useEffect(() => {
  if (transactions.length > 0) {
    fetch(`${API_BASE}/api/mpesa/b2c/stats`)
      .then(res => res.json())
      .then(data => {
        console.log("Stats refreshed after transaction:", data);
        setStats(data);
      })
      .catch(err => console.error("Error refreshing stats:", err));
  }
}, [transactions]);


// useEffect(() => {
//   axios.get(`${API_BASE}/analytics/payment-trends`).then(res => setTrends(res.data));
//   axios.get(`${API_BASE}/analytics/regional-distribution`).then(res => setRegions(res.data));
// }, []);

const handleDownload = async (format = 'pdf') => {
  try {
    const response = await axios.get(`${API_BASE}/analytics/export?format=${format}`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `analytics_report.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Error downloading report:', error);
  }
};


const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
};

const handleInputChange = handleChange;

const clearFarmerSelection = () => {
  setFormData(prev => ({ ...prev, farmerId: '', farmerName: '' }));
  setFarmerDetails(null);
  setLookupNotFound(false);
};

const handleLookupCodeChange = (e) => {
  const code = e.target.value;
  setLookupCode(code);
  setLookupNotFound(false);

  if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

  if (!code.trim()) {
    clearFarmerSelection();
    setLookupSuggestions([]);
    setShowSuggestions(false);
    return;
  }

  // Debounced exact-code lookup (400ms)
  lookupTimerRef.current = setTimeout(async () => {
    setLookupLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/farmers/lookup/${encodeURIComponent(code)}`);
      const farmer = res.data;
      if (farmer && farmer.id) {
        setFormData(prev => ({
          ...prev,
          farmerId: String(farmer.id),
          farmerName: farmer.full_name || farmer.name || '',
        }));
        setFarmerDetails(farmer);
        setLookupNotFound(false);
        setShowSuggestions(false);
        setLookupSuggestions([]);
      } else {
        clearFarmerSelection();
        setLookupNotFound(true);
      }
    } catch {
      clearFarmerSelection();
      setLookupNotFound(true);
    } finally {
      setLookupLoading(false);
    }
  }, 400);

  // Debounced typeahead suggestions (300ms)
  searchTimerRef.current = setTimeout(async () => {
    try {
      const res = await axios.get(`${API_BASE}/farmers/search?q=${encodeURIComponent(code)}`);
      const suggestions = res.data?.farmers || res.data || [];
      const list = Array.isArray(suggestions) ? suggestions : [];
      setLookupSuggestions(list);
      setShowSuggestions(list.length > 0);
    } catch {
      setLookupSuggestions([]);
      setShowSuggestions(false);
    }
  }, 300);
};

const handleSelectSuggestion = (farmer) => {
  const name = farmer.full_name || farmer.name || '';
  const code = farmer.lookup_code || farmer.farmer_code || `FRN-${String(farmer.id).padStart(7, '0')}`;
  setLookupCode(code);
  setFormData(prev => ({
    ...prev,
    farmerId: String(farmer.id),
    farmerName: name,
  }));
  setFarmerDetails(farmer);
  setLookupNotFound(false);
  setShowSuggestions(false);
  setLookupSuggestions([]);
};

const handleLookupBlur = () => {
  // Delay to allow click on suggestion item to register
  setTimeout(() => setShowSuggestions(false), 150);
}; 

const handleSubmit = (e) => {
  e.preventDefault();
  axios.post(`${API_BASE}/api/mpesa/b2c/initiate`, {
    farmer_id: parseInt(formData.farmerId),
    amount: parseFloat(formData.amount),
    reference: formData.purpose
  })
  .then(() => axios.get(`${API_BASE}/api/mpesa/b2c/transactions/`))
  .then(res => setTransactions(res.data || []))
  .catch(err => {
    alert("Payment Failed: " + (err?.response?.data?.detail || err.message));
  });
};

const [farmerForm, setFarmerForm] = useState({
  firstName: '',
  surname: '',
  middleName: '',
  phone: '',
  county: '',
  subCounty: '',
});

const handleFarmerFormChange = (e) => {
  const { name, value } = e.target;
  setFarmerForm(prev => ({ ...prev, [name]: value }));
};

const generateUsername = (first) => {
  return first.toLowerCase().replace(/\s+/g, '');
};

const handleAddFarmer = async (e) => {
  e.preventDefault();

  const username = generateUsername(farmerForm.firstName);

  const payload = {
    FirstName: farmerForm.firstName,
    Surname: farmerForm.surname,
    PhoneNumber: farmerForm.phone,
    Location: farmerForm.county,
    SubCounty: farmerForm.subCounty || null,
    username,
    password: farmerForm.phone,
    Status: "Active"
  };

  try {
    const saved = await axios.post(`${API_BASE}/farmers/create`, payload).then(r => r.data);
    setFarmers(prev => [saved, ...prev]);
    setFarmerForm({ firstName: "", middleName: "", surname: "", phone: "", county: "", subCounty: "" });
  } catch (err) {
    alert("Failed to add farmer: " + (err?.response?.data?.detail || err.message));
  }
};

const [searchTerm, setSearchTerm] = useState('');

const filteredTransactions = (transactions || []).filter(tx =>
  (tx?.farmer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
  (tx?.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
  (tx?.farmer?.location || "").toLowerCase().includes(searchTerm.toLowerCase())
);

const filteredFarmers = (farmers || []).filter(farmer =>
  (farmer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
  (farmer?.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
  (farmer?.county || "").toLowerCase().includes(searchTerm.toLowerCase())
);

const handleTabClick = (tabName) => setActiveTab(tabName);



const statsData = [
  { title: 'Total Funds Available', value: stats["Total Funds Available"] },
  { title: 'Total Disbursed', value: stats["Total Disbursed"] },
  { title: 'Total Transactions', value: stats["Total Transactions"] },
  { title: 'Active Beneficiaries', value: stats["Active Beneficiaries"] }
];


const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Completed': return 'status-completed';
    case 'Pending': return 'status-pending';
    case 'Failed': return 'status-failed';
    default: return '';
  }
};

const handleViewPaymentHistory = (farmer) => {
  setSelectedFarmer(farmer);
  setShowPaymentHistory(true);
};

const handleMakePayment = (farmer) => {
  setSelectedFarmer(farmer);
  setShowPaymentAction(true);
};

const handlePaymentSubmit = (paymentData) => {
  console.log('Payment submitted:', paymentData);
};

const getFarmerStatusBadge = (status) => {
  const statusLower = (status || 'active').toLowerCase();
  const statusConfig = {
    verified: { class: 'verified', label: 'Verified' },
    active: { class: 'active', label: 'Active' },
    pending: { class: 'pending', label: 'Pending' },
    inactive: { class: 'inactive', label: 'Inactive' }
  };

  const config = statusConfig[statusLower] || { class: 'active', label: status || 'Active' };

  return (
    <span className={`farmer-status-badge status-${config.class}`}>
      {config.label}
    </span>
  );
};
  
const tabs = [
  { 
    id: 'Payments', 
    label: 'Payments', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <g clipPath="url(#clip0_58_1146)">
          <path d="M7.86622 7.26667C6.35289 6.87333 5.86622 6.46667 5.86622 5.83333C5.86622 5.10667 6.53956 4.6 7.66622 4.6C8.85289 4.6 9.29289 5.16667 9.33289 6H10.8062C10.7596 4.85333 10.0596 3.8 8.66622 3.46V2H6.66622V3.44C5.37289 3.72 4.33289 4.56 4.33289 5.84667C4.33289 7.38667 5.60622 8.15333 7.46622 8.6C9.13289 9 9.46622 9.58667 9.46622 10.2067C9.46622 10.6667 9.13956 11.4 7.66622 11.4C6.29289 11.4 5.75289 10.7867 5.67956 10H4.21289C4.29289 11.46 5.38622 12.28 6.66622 12.5533V14H8.66622V12.5667C9.96622 12.32 10.9996 11.5667 10.9996 10.2C10.9996 8.30667 9.37956 7.66 7.86622 7.26667Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_58_1146">
            <rect width="16" height="16" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    )
  },
  { 
    id: 'History', 
    label: 'History', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <g clipPath="url(#clip0_58_1151)">
          <path d="M9.33366 1.33337H4.00033C3.26699 1.33337 2.66699 1.93337 2.66699 2.66671V13.3334C2.66699 14.0667 3.26033 14.6667 3.99366 14.6667H12.0003C12.7337 14.6667 13.3337 14.0667 13.3337 13.3334V5.33337L9.33366 1.33337ZM12.0003 13.3334H4.00033V2.66671H8.66699V6.00004H12.0003V13.3334Z" fill="currentColor"/>
          <path d="M5.33366 10.6667H10.667V12H5.33366V10.6667Z" fill="currentColor"/>
          <path d="M5.33366 8.00004H10.667V9.33337H5.33366V8.00004Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_58_1151">
            <rect width="16" height="16" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    )
  },
  { 
    id: 'Farmers', 
    label: 'Farmers', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <g clipPath="url(#clip0_58_1156)">
          <path d="M10.0003 7.99996C11.4737 7.99996 12.667 6.80663 12.667 5.33329C12.667 3.85996 11.4737 2.66663 10.0003 2.66663C8.52699 2.66663 7.33366 3.85996 7.33366 5.33329C7.33366 6.80663 8.52699 7.99996 10.0003 7.99996ZM10.0003 3.99996C10.7337 3.99996 11.3337 4.59996 11.3337 5.33329C11.3337 6.06663 10.7337 6.66663 10.0003 6.66663C9.26699 6.66663 8.66699 6.06663 8.66699 5.33329C8.66699 4.59996 9.26699 3.99996 10.0003 3.99996ZM10.0003 9.33329C8.22033 9.33329 4.66699 10.2266 4.66699 12V13.3333H15.3337V12C15.3337 10.2266 11.7803 9.33329 10.0003 9.33329ZM6.00033 12C6.14699 11.52 8.20699 10.6666 10.0003 10.6666C11.8003 10.6666 13.867 11.5266 14.0003 12H6.00033ZM4.00033 9.99996V7.99996H6.00033V6.66663H4.00033V4.66663H2.66699V6.66663H0.666992V7.99996H2.66699V9.99996H4.00033Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_58_1156">
            <rect width="16" height="16" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    )
  },
  { 
    id: 'Analytics', 
    label: 'Analytics', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <g clipPath="url(#clip0_58_1161)">
          <path d="M12.6667 2H3.33333C2.6 2 2 2.6 2 3.33333V12.6667C2 13.4 2.6 14 3.33333 14H12.6667C13.4 14 14 13.4 14 12.6667V3.33333C14 2.6 13.4 2 12.6667 2ZM12.6667 12.6667H3.33333V3.33333H12.6667V12.6667Z" fill="currentColor"/>
          <path d="M6.00033 8H4.66699V11.3333H6.00033V8Z" fill="currentColor"/>
          <path d="M11.3333 4.66663H10V11.3333H11.3333V4.66663Z" fill="currentColor"/>
          <path d="M8.66634 9.33337H7.33301V11.3334H8.66634V9.33337Z" fill="currentColor"/>
          <path d="M8.66634 6.66663H7.33301V7.99996H8.66634V6.66663Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_58_1161">
            <rect width="16" height="16" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    )
  },
  { 
    id: 'Security', 
    label: 'Security', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <g clipPath="url(#clip0_58_1166)">
          <path d="M8 0.666626L2 3.33329V7.33329C2 11.0333 4.56 14.4933 8 15.3333C11.44 14.4933 14 11.0333 14 7.33329V3.33329L8 0.666626ZM8 7.99329H12.6667C12.3133 10.74 10.48 13.1866 8 13.9533V7.99996H3.33333V4.19996L8 2.12663V7.99329Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_58_1166">
            <rect width="16" height="16" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    )
  },
  { 
    id: 'Settings', 
    label: 'Settings', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <g clipPath="url(#clip0_58_1171)">
          <path d="M12.9532 8.65337C12.9799 8.44004 12.9999 8.22671 12.9999 8.00004C12.9999 7.77337 12.9799 7.56004 12.9532 7.34671L14.3599 6.24671C14.4866 6.14671 14.5199 5.96671 14.4399 5.82004L13.1066 3.51337C13.0466 3.40671 12.9332 3.34671 12.8132 3.34671C12.7732 3.34671 12.7332 3.35337 12.6999 3.36671L11.0399 4.03337C10.6932 3.76671 10.3199 3.54671 9.91323 3.38004L9.65989 1.61337C9.63989 1.45337 9.49989 1.33337 9.33323 1.33337H6.66656C6.49989 1.33337 6.35989 1.45337 6.33989 1.61337L6.08656 3.38004C5.67989 3.54671 5.30656 3.77337 4.95989 4.03337L3.29989 3.36671C3.25989 3.35337 3.21989 3.34671 3.17989 3.34671C3.06656 3.34671 2.95323 3.40671 2.89323 3.51337L1.55989 5.82004C1.47323 5.96671 1.51323 6.14671 1.63989 6.24671L3.04656 7.34671C3.01989 7.56004 2.99989 7.78004 2.99989 8.00004C2.99989 8.22004 3.01989 8.44004 3.04656 8.65337L1.63989 9.75337C1.51323 9.85337 1.47989 10.0334 1.55989 10.18L2.89323 12.4867C2.95323 12.5934 3.06656 12.6534 3.18656 12.6534C3.22656 12.6534 3.26656 12.6467 3.29989 12.6334L4.95989 11.9667C5.30656 12.2334 5.67989 12.4534 6.08656 12.62L6.33989 14.3867C6.35989 14.5467 6.49989 14.6667 6.66656 14.6667H9.33323C9.49989 14.6667 9.63989 14.5467 9.65989 14.3867L9.91323 12.62C10.3199 12.4534 10.6932 12.2267 11.0399 11.9667L12.6999 12.6334C12.7399 12.6467 12.7799 12.6534 12.8199 12.6534C12.9332 12.6534 13.0466 12.5934 13.1066 12.4867L14.4399 10.18C14.5199 10.0334 14.4866 9.85337 14.3599 9.75337L12.9532 8.65337ZM11.6332 7.51337C11.6599 7.72004 11.6666 7.86671 11.6666 8.00004C11.6666 8.13337 11.6532 8.28671 11.6332 8.48671L11.5132 9.30004L12.0866 9.76004L12.7466 10.2734L12.2466 11.1334L11.4466 10.8334L10.6799 10.5534L9.99989 11.04C9.6999 11.2534 9.40656 11.4334 9.10656 11.5734L8.3399 11.9L8.21323 12.7267L8.10656 13.3334H6.89323L6.79323 12.7334L6.66656 11.9L5.89989 11.5734C5.58656 11.4267 5.29323 11.2467 5.01989 11.0534L4.3399 10.56L3.55323 10.8467L2.75323 11.1467L2.25323 10.2867L2.91989 9.76671L3.48656 9.30671L3.36656 8.48671C3.34656 8.28004 3.33323 8.14004 3.33323 8.00004C3.33323 7.86004 3.34656 7.71337 3.36656 7.51337L3.48656 6.70004L2.91323 6.24004L2.25323 5.72671L2.75323 4.86671L3.55323 5.16671L4.31989 5.44671L4.99989 4.96004C5.29989 4.74671 5.59323 4.56671 5.89323 4.42671L6.65989 4.10004L6.78656 3.27337L6.89323 2.66671H8.09989L8.19989 3.26671L8.32656 4.10004L9.09323 4.42671C9.40656 4.57337 9.69989 4.75337 9.97323 4.94671L10.6532 5.44004L11.4399 5.15337L12.2399 4.85337L12.7399 5.71337L12.0866 6.22671L11.5199 6.68671L11.6332 7.51337Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_58_1171">
            <rect width="16" height="16" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    )
  },
  { 
    id: 'Support', 
    label: 'Support', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <g clipPath="url(#clip0_58_1176)">
          <path d="M7.33301 12H8.66634V10.6667H7.33301V12ZM7.99967 1.33337C4.31967 1.33337 1.33301 4.32004 1.33301 8.00004C1.33301 11.68 4.31967 14.6667 7.99967 14.6667C11.6797 14.6667 14.6663 11.68 14.6663 8.00004C14.6663 4.32004 11.6797 1.33337 7.99967 1.33337ZM7.99967 13.3334C5.05967 13.3334 2.66634 10.94 2.66634 8.00004C2.66634 5.06004 5.05967 2.66671 7.99967 2.66671C10.9397 2.66671 13.333 5.06004 13.333 8.00004C13.333 10.94 10.9397 13.3334 7.99967 13.3334ZM7.99967 4.00004C6.52634 4.00004 5.33301 5.19337 5.33301 6.66671H6.66634C6.66634 5.93337 7.26634 5.33337 7.99967 5.33337C8.73301 5.33337 9.33301 5.93337 9.33301 6.66671C9.33301 8.00004 7.33301 7.83337 7.33301 10H8.66634C8.66634 8.50004 10.6663 8.33337 10.6663 6.66671C10.6663 5.19337 9.47301 4.00004 7.99967 4.00004Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_58_1176">
            <rect width="16" height="16" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    )
  }
];

 
  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content">
          <div className="agripay-header">
            <div className="agripay-title-section">
              <div className="agripay-title-content">
                <h1 className="agripay-title">AgriPay</h1>
                <p className="agripay-subtitle">
                  Manage and disburse payments to farmers seamlessly via BetterPAY integration.
                </p>
              </div>
              <div className="agripay-actions">
                <button className="export-btn">Export</button>
                <button className="new-payment-btn">New Payment</button>
              </div>
            </div>
          </div>

          <div className="agripay-stats-grid">
            {statsData.map((stat, index) => (
              <div key={index} className="agripay-stats-card">
                <span className="stats-title">{stat.title}</span>
                <div className="stats-value">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="agripay-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`agripay-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => handleTabClick(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'Payments' && (
            <div className="agripay-form-container">
              <div className="payment-form-header">
                <h2 className="payment-form-title">Make Payment</h2>
              </div>
              <form onSubmit={handleSubmit} className="payment-form">
                {/* Farmer Lookup */}
                <div className="form-row full-width">
                  <div className="form-group">
                    <label className="form-label">Farmer Lookup Code</label>
                    <div className="lookup-input-wrapper">
                      <svg className="lookup-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="#9CA3AF"/>
                      </svg>
                      <input
                        ref={lookupInputRef}
                        type="text"
                        value={lookupCode}
                        onChange={handleLookupCodeChange}
                        onBlur={handleLookupBlur}
                        onFocus={() => lookupSuggestions.length > 0 && setShowSuggestions(true)}
                        placeholder="e.g. FRN-2025001"
                        className={`form-input lookup-code-input${
                          farmerDetails ? ' lookup-found' : ''
                        }${lookupNotFound ? ' lookup-not-found' : ''}`}
                        autoComplete="off"
                      />
                      {lookupLoading && (
                        <span className="lookup-spinner" aria-label="Searching" />
                      )}
                      {!lookupLoading && farmerDetails && (
                        <svg className="lookup-check-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#16A34A"/>
                        </svg>
                      )}
                      {!lookupLoading && lookupNotFound && (
                        <svg className="lookup-error-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#DC2626"/>
                        </svg>
                      )}
                      {showSuggestions && lookupSuggestions.length > 0 && (
                        <ul className="lookup-suggestions-list">
                          {lookupSuggestions.map((farmer) => (
                            <li
                              key={farmer.id}
                              className="lookup-suggestion-item"
                              onMouseDown={() => handleSelectSuggestion(farmer)}
                            >
                              <span className="suggestion-name">{farmer.full_name || farmer.name}</span>
                              <span className="suggestion-meta">
                                {farmer.lookup_code || farmer.farmer_code || `FRN-${String(farmer.id).padStart(7, '0')}`}
                                {farmer.location ? ` · ${farmer.location}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {lookupNotFound && (
                      <span className="lookup-not-found-msg">No farmer found with this code.</span>
                    )}
                  </div>
                </div>

                {/* Auto-populated farmer details */}
                {farmerDetails && (
                  <div className="farmer-lookup-card">
                    <div className="farmer-lookup-card-header">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#4CAF50"/>
                      </svg>
                      <span className="farmer-lookup-card-title">Farmer Found</span>
                    </div>
                    <div className="farmer-lookup-details">
                      <div className="farmer-lookup-detail-item">
                        <span className="detail-label">Name</span>
                        <span className="detail-value">{farmerDetails.full_name || farmerDetails.name}</span>
                      </div>
                      {(farmerDetails.phone || farmerDetails.phone_number) && (
                        <div className="farmer-lookup-detail-item">
                          <span className="detail-label">Phone</span>
                          <span className="detail-value">{farmerDetails.phone || farmerDetails.phone_number}</span>
                        </div>
                      )}
                      {farmerDetails.location && (
                        <div className="farmer-lookup-detail-item">
                          <span className="detail-label">Location</span>
                          <span className="detail-value">{farmerDetails.location}</span>
                        </div>
                      )}
                      {farmerDetails.id && (
                        <div className="farmer-lookup-detail-item">
                          <span className="detail-label">Farmer ID</span>
                          <span className="detail-value farmer-id-badge">#{farmerDetails.id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount (KES)</label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="form-input"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <div className="select-wrapper">
                      <select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="M-Pesa">M-Pesa</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                      </select>
                      <svg className="select-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M7.41 8.59003L12 13.17L16.59 8.59003L18 10L12 16L6 10L7.41 8.59003Z" fill="#323232"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="form-row full-width">
                  <div className="form-group">
                    <label className="form-label">Purpose</label>
                    <div className="select-wrapper">
                      <select
                        name="purpose"
                        value={formData.purpose}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="Donation">Donation</option>
                        <option value="Loan Payment">Loan Payment</option>
                        <option value="Crop Purchase">Crop Purchase</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Emergency Aid">Emergency Aid</option>
                      </select>
                      <svg className="select-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M7.41 8.59003L12 13.17L16.59 8.59003L18 10L12 16L6 10L7.41 8.59003Z" fill="#323232"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="form-row full-width">
                  <div className="form-group">
                    <label className="form-label">Notes (Optional)</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Add payment notes..."
                      className="form-textarea"
                      rows="6"
                    />
                  </div>
                </div>

                <button type="submit" className="pay-now-btn">Pay Now</button>
              </form>
            </div>
          )}

          {activeTab === 'History' && (
            <div className="agripay-content">
              <div className="search-filter-section">
                <div className="search-container">
                  <svg className="search-icon" width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <g clipPath="url(#clip0_58_1315)">
                      <path d="M20.6667 18.6667H19.6133L19.24 18.3067C20.5467 16.7867 21.3333 14.8133 21.3333 12.6667C21.3333 7.88 17.4533 4 12.6667 4C7.88 4 4 7.88 4 12.6667C4 17.4533 7.88 21.3333 12.6667 21.3333C14.8133 21.3333 16.7867 20.5467 18.3067 19.24L18.6667 19.6133V20.6667L25.3333 27.32L27.32 25.3333L20.6667 18.6667ZM12.6667 18.6667C9.34667 18.6667 6.66667 15.9867 6.66667 12.6667C6.66667 9.34667 9.34667 6.66667 12.6667 6.66667C15.9867 6.66667 18.6667 9.34667 18.6667 12.6667C18.6667 15.9867 15.9867 18.6667 12.6667 18.6667Z" fill="#787878"/>
                    </g>
                    <defs>
                      <clipPath id="clip0_58_1315">
                        <rect width="32" height="32" fill="white"/>
                      </clipPath>
                    </defs>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="transaction-history-content">
                <div className="content-header">
                  <h2 className="content-title">Transaction History</h2>
                </div>

                <div className="transaction-table">
                  <div className="table-header">
                    <div className="header-cell">Date</div>
                    <div className="header-cell center">Payment ID</div>
                    <div className="header-cell center">Farmer</div>
                    <div className="header-cell center">Amount(KES)</div>
                    <div className="header-cell center">Method</div>
                    <div className="header-cell center">Status</div>
                    <div className="header-cell center">Actions</div>
                  </div>

                  {filteredTransactions.map((transaction) => (
                    <div key={transaction.id} className="table-row">
                      <div className="table-cell">
                        <span className="date-text">{transaction.date}</span>
                      </div>
                      <div className="table-cell center">
                        <span className="payment-id">{transaction.mpesa_transaction_id}</span>
                      </div>
                      <div className="table-cell center">
                        <div className="farmer-info">
                          <span className="farmer-name">{transaction.farmer.name}</span>
                          <div className="farmer-location">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <g clipPath="url(#clip0_58_1373)">
                                <path d="M7.00033 1.16675C4.74283 1.16675 2.91699 2.99258 2.91699 5.25008C2.91699 8.31258 7.00033 12.8334 7.00033 12.8334C7.00033 12.8334 11.0837 8.31258 11.0837 5.25008C11.0837 2.99258 9.25783 1.16675 7.00033 1.16675ZM4.08366 5.25008C4.08366 3.64008 5.39033 2.33341 7.00033 2.33341C8.61033 2.33341 9.91699 3.64008 9.91699 5.25008C9.91699 6.93008 8.23699 9.44425 7.00033 11.0134C5.78699 9.45591 4.08366 6.91258 4.08366 5.25008Z" fill="#65758B"/>
                                <path d="M7.00033 6.70842C7.80574 6.70842 8.45866 6.0555 8.45866 5.25008C8.45866 4.44467 7.80574 3.79175 7.00033 3.79175C6.19491 3.79175 5.54199 4.44467 5.54199 5.25008C5.54199 6.0555 6.19491 6.70842 7.00033 6.70842Z" fill="#65758B"/>
                              </g>
                              <defs>
                                <clipPath id="clip0_58_1373">
                                  <rect width="14" height="14" fill="white"/>
                                </clipPath>
                              </defs>
                            </svg>
                           <span>{transaction.farmer.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="table-cell center">
                        <span className="amount">{transaction.amount}</span>
                      </div>
                      <div className="table-cell center">
                        <span className="method">{transaction.method}</span>
                      </div>
                      <div className="table-cell center">
                        <span className={`status-badge ${getStatusBadgeClass(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </div>
                      <div className="table-cell center">
                        <div className="action-buttons">
                          <button className="action-btn view-btn">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <g clipPath="url(#clip0_58_1380)">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="#323639"/>
                              </g>
                              <defs>
                                <clipPath id="clip0_58_1380">
                                  <rect width="24" height="24" fill="white"/>
                                </clipPath>
                              </defs>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Farmers' && (
            <div className="farmers-tab-container">
              <div className="farmer-directory-container">
                <div className="search-filter-section">
                  <div className="search-box-container">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="search-icon">
                      <path d="M20.6667 18.6667H19.6133L19.24 18.3067C20.5467 16.7867 21.3333 14.8133 21.3333 12.6667C21.3333 7.88 17.4533 4 12.6667 4C7.88 4 4 7.88 4 12.6667C4 17.4533 7.88 21.3333 12.6667 21.3333C14.8133 21.3333 16.7867 20.5467 18.3067 19.24L18.6667 19.6133V20.6667L25.3333 27.32L27.32 25.3333L20.6667 18.6667ZM12.6667 18.6667C9.34667 18.6667 6.66667 15.9867 6.66667 12.6667C6.66667 9.34667 9.34667 6.66667 12.6667 6.66667C15.9867 6.66667 18.6667 9.34667 18.6667 12.6667C18.6667 15.9867 15.9867 18.6667 12.6667 18.6667Z" fill="#787878"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input-field"
                    />
                  </div>
                </div>

                <div className="farmer-directory-section">
                  <div className="directory-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="directory-icon">
                      <path d="M16.6699 13.1299C18.0399 14.0599 18.9999 15.3199 18.9999 16.9999V19.9999H22.9999V16.9999C22.9999 14.8199 19.4299 13.5299 16.6699 13.1299Z" fill="#4CAF50"/>
                      <path d="M14.9999 12C17.2099 12 18.9999 10.21 18.9999 8C18.9999 5.79 17.2099 4 14.9999 4C14.5299 4 14.0899 4.1 13.6699 4.24C14.4999 5.27 14.9999 6.58 14.9999 8C14.9999 9.42 14.4999 10.73 13.6699 11.76C14.0899 11.9 14.5299 12 14.9999 12Z" fill="#4CAF50"/>
                      <path d="M9 12C11.21 12 13 10.21 13 8C13 5.79 11.21 4 9 4C6.79 4 5 5.79 5 8C5 10.21 6.79 12 9 12ZM9 6C10.1 6 11 6.9 11 8C11 9.1 10.1 10 9 10C7.9 10 7 9.1 7 8C7 6.9 7.9 6 9 6Z" fill="#4CAF50"/>
                      <path d="M9 13C6.33 13 1 14.34 1 17V20H17V17C17 14.34 11.67 13 9 13ZM15 18H3V17.01C3.2 16.29 6.3 15 9 15C11.7 15 14.8 16.29 15 17V18Z" fill="#4CAF50"/>
                    </svg>
                    <h2 className="directory-title">Farmer Directory</h2>
                  </div>

                  <div className="table-headers">
                    <div className="header-name">Name</div>
                    <div className="header-id">ID</div>
                    <div className="header-location">Location</div>
                    <div className="header-status">Status</div>
                    <div className="header-payment">Last Payment</div>
                    <div className="header-actions">Actions</div>
                  </div>

                  <div className="table-content">
                    {filteredFarmers.map((farmer, index) => (
                      <div key={index} className="farmer-row">
                        <div className="farmer-info">
                          <div className="farmer-name">{farmer.name}</div>
                          <div className="farmer-phone">{farmer.phone}</div>
                        </div>
                        <div className="farmer-id">F0{farmer.id}</div>
                        <div className="farmer-location">{farmer.location}</div>
                        <div className="farmer-status">
                          {getFarmerStatusBadge(farmer.status)}
                        </div>
                        <div className="farmer-payment">{farmer.lastPayment || 'No payment'}</div>
                        <div className="farmer-actions"> 
                          <button 
                            className="action-btn view-btn"
                            onClick={() => handleViewPaymentHistory(farmer)}
                            title="View payment history"
                          > 
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"> 
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="#323639"/> 
                            </svg> 
                          </button> 

                          <button 
                            className="action-btn edit-btn"
                            onClick={() => handleMakePayment(farmer)}
                            title="Make payment"
                          > 
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"> 
                              <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C12.92 6.9 13.63 7.44 13.89 8.3C14.01 8.7 14.34 9 14.76 9H15.06C15.72 9 16.19 8.35 15.96 7.73C15.54 6.55 14.56 5.57 13 5.19V4.5C13 3.67 12.33 3 11.5 3C10.67 3 10 3.67 10 4.5V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.85 17.1 9 16.51 8.67 15.67C8.52 15.28 8.18 15 7.77 15H7.49C6.82 15 6.35 15.68 6.6 16.3C7.17 17.69 8.5 18.51 10 18.83V19.5C10 20.33 10.67 21 11.5 21C12.33 21 13 20.33 13 19.5V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" fill="#4CAF50"/> 
                            </svg> 
                          </button> 
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Security' && (
            <div className="security-container">
              <h2 className="security-title">Security Settings</h2>

              <div className="security-card">
                <div className="security-item">
                  <div className="security-text">
                    <h3 className="security-label">Two-Factor Authentication</h3>
                    <p className="security-subtext">Required for all payment operations</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.twoFactor}
                      onChange={() => toggleSetting("twoFactor")}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="security-item">
                  <div className="security-text">
                    <h3 className="security-label">Payment Approvals</h3>
                    <p className="security-subtext">Require dual authorization for payments &gt; KES 20,000</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.paymentApprovals}
                      onChange={() => toggleSetting("paymentApprovals")}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="security-item">
                  <div className="security-text">
                    <h3 className="security-label">Audit Logging</h3>
                    <p className="security-subtext">Complete transaction history maintained</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.auditLogging}
                      onChange={() => toggleSetting("auditLogging")}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Settings' && (           
            <div className="config-container">
              <h2 className="security-title">BetterPAY Configuration</h2>

              <form onSubmit={handleSubmit} className="config-form">
                <div className="form-group">
                  <label className="form-label">API Endpoint</label>
                  <input
                    type="text"
                    name="apiEndpoint"
                    value={formData.apiEndpoint}
                    onChange={handleChange}
                    className="form-input"
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">API Key</label>
                  <input
                    type="password"
                    name="apiKey"
                    value={formData.apiKey}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Daily Transaction Limit</label>
                  <input
                    type="text"
                    name="transactionLimit"
                    value={formData.transactionLimit}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <button type="submit" className="update-btn">Update Configuration</button>
              </form>
            </div>
          )}

          {activeTab === 'Analytics' && (
            <div className="analytics-container">
              <div className="analytics-cards-grid">
                <div className="analytics-card">
                  <h3 className="analytics-card-title">Payment Trends</h3>
                  <div className="payment-trends-chart">
                    <div className="trends-chart-area">
                      <div className="trends-y-axis">
                        <span className="trends-y-label">50K</span>
                        <span className="trends-y-label">40K</span>
                        <span className="trends-y-label">30K</span>
                        <span className="trends-y-label">20K</span>
                        <span className="trends-y-label">10K</span>
                        <span className="trends-y-label">0</span>
                      </div>
                      <div className="trends-chart-content">
                        <div className="trends-grid-lines">
                          <div className="trends-grid-line"></div>
                          <div className="trends-grid-line"></div>
                          <div className="trends-grid-line"></div>
                          <div className="trends-grid-line"></div>
                          <div className="trends-grid-line"></div>
                        </div>
                        <div className="trends-bars">
                          <div className="trends-bar-group">
                            <div className="trends-bar" style={{ height: '70%' }}></div>
                            <span className="trends-bar-label">Jan</span>
                          </div>
                          <div className="trends-bar-group">
                            <div className="trends-bar" style={{ height: '45%' }}></div>
                            <span className="trends-bar-label">Feb</span>
                          </div>
                          <div className="trends-bar-group">
                            <div className="trends-bar" style={{ height: '85%' }}></div>
                            <span className="trends-bar-label">Mar</span>
                          </div>
                          <div className="trends-bar-group">
                            <div className="trends-bar" style={{ height: '60%' }}></div>
                            <span className="trends-bar-label">Apr</span>
                          </div>
                          <div className="trends-bar-group">
                            <div className="trends-bar" style={{ height: '90%' }}></div>
                            <span className="trends-bar-label">May</span>
                          </div>
                          <div className="trends-bar-group">
                            <div className="trends-bar" style={{ height: '75%' }}></div>
                            <span className="trends-bar-label">Jun</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="trends-legend">
                      <div className="trends-legend-item">
                        <div className="trends-legend-color"></div>
                        <span className="trends-legend-text">Monthly Payments</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3 className="analytics-card-title">Regional Distribution</h3>
                  <div className="regional-distribution-content">
                    <div className="regional-data-list">
                      <div className="regional-data-row">
                        <span className="county-name">Nairobi County</span>
                        <span className="county-amount">KES 600,500.00</span>
                      </div>
                      <div className="regional-data-row">
                        <span className="county-name">Kiambu County</span>
                        <span className="county-amount">KES 563,758.00</span>
                      </div>
                      <div className="regional-data-row">
                        <span className="county-name">Meru County</span>
                        <span className="county-amount">KES 300,500.00</span>
                      </div>
                      <div className="regional-data-row">
                        <span className="county-name">Narok County</span>
                        <span className="county-amount">KES 250,000.00</span>
                      </div>
                      <div className="regional-data-row">
                        <span className="county-name">Turkana County</span>
                        <span className="county-amount">KES 100,000.00</span>
                      </div>
                      <div className="regional-data-row">
                        <span className="county-name">Total</span>
                        <span className="county-amount">KES 1,700,500.00</span>
                      </div>
                    </div>
                    <div className="regional-data-row">
                      <button className="download-report-btn" onClick={() => handleDownload('pdf')}>
  Download Full Report
</button>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Support' && (
            <div className="security-container">
              <h2 className="security-title">Contact Support</h2>

              <div className="security-card">
                <div className="security-item">
                  <div className="security-text">
                    <h3 className="security-label">Chat Support (Available 24/7)</h3>
                  </div>
                </div>

                <div className="security-item">
                  <div className="security-text">
                    <h3 className="security-label">Email:support@agriscan.co.ke</h3>
                  </div>
                </div>

                <div className="security-item">
                  <div className="security-text">
                    <h3 className="security-label">Phone: +254 700 123 456</h3>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <FarmerPaymentHistoryModal
        isOpen={showPaymentHistory}
        onClose={() => setShowPaymentHistory(false)}
        farmer={selectedFarmer}
      />

      <FarmerPaymentActionModal
        isOpen={showPaymentAction}
        onClose={() => setShowPaymentAction(false)}
        farmer={selectedFarmer}
        onSubmit={handlePaymentSubmit}
      />
    </div>
  );
};

export default AgriPay;
