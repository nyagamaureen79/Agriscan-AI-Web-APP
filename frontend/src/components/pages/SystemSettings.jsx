import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { useToast } from '../../contexts/ToastContext';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

const normalizeProfile = (data = {}) => ({
  ...data,
  phoneNumber: data.phoneNumber || data.phone_number || data.phone || ''
});

const TABS = [
  { id: 'profile', label: 'Profile', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
    </svg>
  )},
  { id: 'settings', label: 'Settings', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M17 11C17.34 11 17.67 11.04 18 11.09V6.27L10.5 3L3 6.27V11.18C3 15.72 6.2 19.97 10.5 21C11.05 20.87 11.58 20.68 12.1 20.45C11.41 19.47 11 18.28 11 17C11 13.69 13.69 11 17 11Z" fill="currentColor"/>
      <path d="M17 13C14.79 13 13 14.79 13 17C13 19.21 14.79 21 17 21C19.21 21 21 19.21 21 17C21 14.79 19.21 13 17 13ZM17 14.38C17.62 14.38 18.12 14.89 18.12 15.5C18.12 16.11 17.61 16.62 17 16.62C16.39 16.62 15.88 16.11 15.88 15.5C15.88 14.89 16.38 14.38 17 14.38ZM17 19.75C16.07 19.75 15.26 19.29 14.76 18.58C14.81 17.86 16.27 17.5 17 17.5C17.73 17.5 19.19 17.86 19.24 18.58C18.74 19.29 17.93 19.75 17 19.75Z" fill="currentColor"/>
    </svg>
  )},
  { id: 'disease', label: 'Disease Management', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z" fill="currentColor"/>
    </svg>
  )},
  { id: 'security', label: 'Account & Security', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 11.99H19C18.47 16.11 15.72 19.78 12 20.93V12H5V6.3L12 3.19V11.99Z" fill="currentColor"/>
    </svg>
  )},
  { id: 'system_codes', label: 'System Codes', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" fill="currentColor"/>
    </svg>
  )},
];

const SystemSettings = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('profile');

  // Modal states
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', role: '' });
  const [editProfileData, setEditProfileData] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '' });

  // Password state
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // General settings state
  const [settings, setSettings] = useState(() => {
    const savedFormat = localStorage.getItem('exportFormat') || 'PDF';
    return { criticalAlerts: true, pushNotifications: true, exportFormat: savedFormat };
  });

  // System codes state
  const [systemCodes, setSystemCodes] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [codeFilterType, setCodeFilterType] = useState('');
  const [codeTypeOptions, setCodeTypeOptions] = useState([]);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isCodeEditMode, setIsCodeEditMode] = useState(false);
  const [isCodeTypeFixed, setIsCodeTypeFixed] = useState(false);
  const [codeFormData, setCodeFormData] = useState({ code_type: '', code_value: '', description: '' });
  const [codeFormErrors, setCodeFormErrors] = useState({});
  const [editingCodeId, setEditingCodeId] = useState(null);
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [deleteConfirmCodeId, setDeleteConfirmCodeId] = useState(null);
  const [isDeletingCode, setIsDeletingCode] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // Disease management state
  const [diseaseTypes, setDiseaseTypes] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [loadingDiseases, setLoadingDiseases] = useState(false);
  const [diseaseView, setDiseaseView] = useState('list'); // 'list' | 'add' | 'view' | 'edit'
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [diseaseData, setDiseaseData] = useState({
    diseaseName: '', description: '', commonlyAffectedCrops: '', diseaseTypeId: '',
    visualSymptoms: '', identificationTips: '', organicTreatment: '',
    chemicalTreatment: '', preventionStrategies: '', diseasePhoto: null
  });
  const [diseasePhotoPreview, setDiseasePhotoPreview] = useState(null);
  const [isSubmittingDisease, setIsSubmittingDisease] = useState(false);
  const [isSubmittingEditDisease, setIsSubmittingEditDisease] = useState(false);
  const [loadingDiseaseDetail, setLoadingDiseaseDetail] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const [dmTypeFilter, setDmTypeFilter] = useState('');
  const [dmPage, setDmPage] = useState(1);
  const DM_PAGE_SIZE = 8;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfileData(normalizeProfile(response.data));
        setEditProfileData(normalizeProfile(response.data));
        // toast.success('Profile loaded successfully');
      } catch (error) {
        const msg = error.response?.data?.detail || error.message || 'Failed to fetch profile';
        toast.error(msg);
      }
    };

    const fetchDiseaseTypes = async () => {
      try {
       const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE}/diseases/types`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDiseaseTypes(response.data);
      } catch (error) {
        console.error('Failed to fetch disease types', error);
      }
    };

    fetchProfile();
    fetchDiseaseTypes();
  }, []);

  // Fetch diseases when disease tab is activated
  useEffect(() => {
    if (activeTab === 'disease') {
      fetchDiseases();
      setDiseaseView('list');
      setSelectedDisease(null);
      setDmSearch('');
      setDmTypeFilter('');
      setDmPage(1);
    }
  }, [activeTab]);

  // Fetch system codes when tab is activated or filter changes
  useEffect(() => {
    if (activeTab === 'system_codes') fetchSystemCodes(codeFilterType);
  }, [activeTab, codeFilterType]);

  const fetchSystemCodes = async (filterType = '') => {
    setLoadingCodes(true);
    try {
      const token = localStorage.getItem('token');
      const url = filterType
        ? `${API_BASE}/system-codes/type/${encodeURIComponent(filterType)}`
        : `${API_BASE}/system-codes/`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setSystemCodes(data);
      if (!filterType) {
        const types = [...new Set(data.map(c => c.code_type).filter(Boolean))].sort();
        setCodeTypeOptions(types);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load system codes');
    } finally {
      setLoadingCodes(false);
    }
  };

  const validateCodeForm = () => {
    const errors = {};
    if (!codeFormData.code_type.trim()) {
      errors.code_type = 'Code type is required';
    } else if (codeFormData.code_type.length > 100) {
      errors.code_type = 'Code type must be 100 characters or fewer';
    }
    if (!codeFormData.code_value.trim()) {
      errors.code_value = 'Code value is required';
    } else if (codeFormData.code_value.length > 255) {
      errors.code_value = 'Code value must be 255 characters or fewer';
    }
    setCodeFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreateCode = () => {
    setIsCodeEditMode(false);
    setIsCodeTypeFixed(false);
    setEditingCodeId(null);
    setCodeFormData({ code_type: '', code_value: '', description: '' });
    setCodeFormErrors({});
    setIsCodeModalOpen(true);
  };

  const handleOpenCreateCodeForType = (codeType) => {
    setIsCodeEditMode(false);
    setIsCodeTypeFixed(true);
    setEditingCodeId(null);
    setCodeFormData({ code_type: codeType, code_value: '', description: '' });
    setCodeFormErrors({});
    setIsCodeModalOpen(true);
  };

  const handleOpenEditCode = (code) => {
    setIsCodeEditMode(true);
    setIsCodeTypeFixed(false);
    setEditingCodeId(code.id);
    setCodeFormData({
      code_type: code.code_type || '',
      code_value: code.code_value || '',
      description: code.description || ''
    });
    setCodeFormErrors({});
    setIsCodeModalOpen(true);
  };

  const toggleGroup = (codeType) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(codeType)) next.delete(codeType);
      else next.add(codeType);
      return next;
    });
  };

  const groupedCodes = (() => {
    const groups = {};
    const filtered = codeFilterType
      ? systemCodes.filter(c => c.code_type === codeFilterType)
      : systemCodes;
    filtered.forEach(code => {
      const type = code.code_type || 'Unknown';
      if (!groups[type]) groups[type] = [];
      groups[type].push(code);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code_type, codes]) => ({ code_type, codes }));
  })();

  const handleSaveCode = async () => {
    if (!validateCodeForm()) return;
    setIsSavingCode(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        code_type: codeFormData.code_type.trim(),
        code_value: codeFormData.code_value.trim(),
        description: codeFormData.description.trim()
      };
      if (isCodeEditMode) {
        const response = await axios.put(`${API_BASE}/system-codes/${editingCodeId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSystemCodes(prev => prev.map(c => c.id === editingCodeId ? response.data : c));
        toast.success('System code updated successfully');
      } else {
        const response = await axios.post(`${API_BASE}/system-codes/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSystemCodes(prev => [response.data, ...prev]);
        const newType = response.data.code_type;
        setCodeTypeOptions(prev => prev.includes(newType) ? prev : [...prev, newType].sort());
        toast.success('System code created successfully');
      }
      setIsCodeModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save system code');
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleConfirmDeleteCode = async () => {
    if (!deleteConfirmCodeId) return;
    setIsDeletingCode(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/system-codes/${deleteConfirmCodeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemCodes(prev => prev.filter(c => c.id !== deleteConfirmCodeId));
      toast.success('System code deleted');
      setDeleteConfirmCodeId(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete system code');
    } finally {
      setIsDeletingCode(false);
    }
  };

  const handleToggleChange = (setting) => {
    setSettings(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  const handleEditProfile = () => {
    setEditProfileData(profileData);
    setIsEditProfileModalOpen(true);
  };

  const handleSaveProfile = async () => {
  try {
    const token = localStorage.getItem('token');

    const response = await axios.put(
      `${API_BASE}/users/me`,
      {
        firstName: editProfileData.firstName,
        lastName: editProfileData.lastName,
        email: editProfileData.email,
        phoneNumber: editProfileData.phoneNumber
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    setProfileData(normalizeProfile(response.data));
    setIsEditProfileModalOpen(false);
    toast.success('Profile updated successfully');

  } catch (error) {
    toast.error(
      error.response?.data?.detail ||
      error.message ||
      'Failed to update profile'
    );
  }
};

  const handleCancelEdit = () => {
    setEditProfileData(profileData);
    setIsEditProfileModalOpen(false);
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordData.oldPassword) errors.oldPassword = 'Current password is required';
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (passwordData.oldPassword && passwordData.newPassword && passwordData.oldPassword === passwordData.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePassword()) { toast.warning('Please fix the validation errors'); return; }
    setIsSubmittingPassword(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/users/me/password`, {
        old_password: passwordData.oldPassword,
        new_password: passwordData.newPassword
      }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
      toast.success('Password updated successfully');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
      setIsPasswordModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to update password');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const fetchDiseases = async () => {
    setLoadingDiseases(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/diseases/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDiseases(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load diseases');
    } finally {
      setLoadingDiseases(false);
    }
  };

  const fetchDiseaseDetail = async (id) => {
    setLoadingDiseaseDetail(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/diseases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load disease details');
      return null;
    } finally {
      setLoadingDiseaseDetail(false);
    }
  };

  const handleViewDisease = async (disease) => {
    setDiseaseView('view');
    setSelectedDisease(disease);
    const full = await fetchDiseaseDetail(disease.id);
    if (full) setSelectedDisease(full);
  };

  const handleEditDisease = async (disease) => {
    setDiseaseView('edit');
    setSelectedDisease(disease);
    const full = await fetchDiseaseDetail(disease.id);
    const d = full || disease;
    setDiseaseData({
      diseaseName: d.disease_name || d.name || '',
      description: d.description || '',
      commonlyAffectedCrops: d.commonly_affected_crops || '',
      diseaseTypeId: d.disease_type_id || '',
      visualSymptoms: d.visual_symptoms || d.symptoms || '',
      identificationTips: d.identification_tips || '',
      organicTreatment: d.organic_treatment || d.organic_treatments || '',
      chemicalTreatment: d.chemical_treatment || d.chemical_treatments || '',
      preventionStrategies: d.prevention_strategies || d.preventions || '',
      diseasePhoto: null
    });
    setDiseasePhotoPreview(d.photo || d.image_url || null);
  };

  const handleSaveEditDisease = async () => {
    if (!diseaseData.diseaseName.trim()) { toast.error('Disease name is required'); return; }
    if (!diseaseData.diseaseTypeId) { toast.error('Disease type is required'); return; }
    setIsSubmittingEditDisease(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('disease_name', diseaseData.diseaseName);
      formData.append('description', diseaseData.description);
      formData.append('commonly_affected_crops', diseaseData.commonlyAffectedCrops);
      formData.append('disease_type_id', diseaseData.diseaseTypeId);
      formData.append('visual_symptoms', diseaseData.visualSymptoms);
      formData.append('identification_tips', diseaseData.identificationTips);
      formData.append('organic_treatment', diseaseData.organicTreatment);
      formData.append('chemical_treatment', diseaseData.chemicalTreatment);
      formData.append('prevention_strategies', diseaseData.preventionStrategies);
      if (diseaseData.diseasePhoto) formData.append('photo', diseaseData.diseasePhoto);
      await axios.put(`${API_BASE}/diseases/${selectedDisease.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });
      toast.success('Disease updated successfully');
      await fetchDiseases();
      resetDiseaseForm();
      setSelectedDisease(null);
      setDiseaseView('list');
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to update disease');
    } finally {
      setIsSubmittingEditDisease(false);
    }
  };

  const handleDiseasePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image size should be less than 5MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please upload a valid image file'); return; }
    setDiseaseData(prev => ({ ...prev, diseasePhoto: file }));
    const reader = new FileReader();
    reader.onloadend = () => setDiseasePhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const resetDiseaseForm = () => {
    setDiseaseData({
      diseaseName: '', description: '', commonlyAffectedCrops: '', diseaseTypeId: '',
      visualSymptoms: '', identificationTips: '', organicTreatment: '',
      chemicalTreatment: '', preventionStrategies: '', diseasePhoto: null
    });
    setDiseasePhotoPreview(null);
  };

  const handleSaveDisease = async () => {
    if (!diseaseData.diseaseName.trim()) { toast.error('Disease name is required'); return; }
    if (!diseaseData.diseaseTypeId) { toast.error('Disease type is required'); return; }
    if (!diseaseData.diseasePhoto) { toast.error('Disease photo is required'); return; }
    setIsSubmittingDisease(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('disease_name', diseaseData.diseaseName);
      formData.append('description', diseaseData.description);
      formData.append('commonly_affected_crops', diseaseData.commonlyAffectedCrops);
      formData.append('disease_type_id', diseaseData.diseaseTypeId);
      formData.append('visual_symptoms', diseaseData.visualSymptoms);
      formData.append('identification_tips', diseaseData.identificationTips);
      formData.append('organic_treatment', diseaseData.organicTreatment);
      formData.append('chemical_treatment', diseaseData.chemicalTreatment);
      formData.append('prevention_strategies', diseaseData.preventionStrategies);
      formData.append('photo', diseaseData.diseasePhoto);
      await axios.post(`${API_BASE}/diseases`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });
      toast.success('Disease added successfully');
      await fetchDiseases();
      resetDiseaseForm();
      setDiseaseView('list');
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to add disease');
    } finally {
      setIsSubmittingDisease(false);
    }
  };

  const splitToList = (raw) => {
    if (!raw && raw !== 0) return [];
    // If it's already an array, clean and return it
    if (Array.isArray(raw)) return raw.map(i => String(i).trim()).filter(Boolean);
    // Coerce everything else to string
    const text = String(raw).trim();
    if (!text) return [];
    let items = text.split(/\n+/).map(s => s.replace(/^[-•*\d.]+\s*/, '').trim()).filter(Boolean);
    if (items.length > 1) return items;
    items = text.split(/(?<=\.)\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
    if (items.length > 1) return items;
    items = text.split(/;\s*/).map(s => s.trim()).filter(Boolean);
    if (items.length > 1) return items;
    return [text];
  };

  const renderDetailText = (text, color = '#4CAF50') => {
    const items = splitToList(text);
    if (items.length <= 1) return <p className="dm-detail-section__body">{items[0] || text}</p>;
    return (
      <ul className="dm-detail-list">
        {items.map((item, i) => (
          <li key={i} className="dm-detail-list__item">
            <span className="dm-detail-list__dot" style={{ background: color }} />
            {item}
          </li>
        ))}
      </ul>
    );
  };

  const ToggleSwitch = ({ isOn, onToggle }) => (
    <div className={`ss-toggle ${isOn ? 'ss-toggle--on' : ''}`} onClick={onToggle}>
      <div className="ss-toggle__knob" />
    </div>
  );

  const PasswordInput = ({ label, value, onChange, error, field }) => (
    <div className="ss-field">
      <label className="ss-field__label">{label}</label>
      <div className="ss-password-wrapper">
        <input
          type={showPasswords[field] ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className={`ss-field__input${error ? ' ss-field__input--error' : ''}`}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        <button
          type="button"
          className="ss-password-toggle"
          onClick={() => setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {showPasswords[field] ? (
              <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
            ) : (
              <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
            )}
          </svg>
        </button>
      </div>
      {error && <span className="ss-field__error">{error}</span>}
    </div>
  );

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="ss-page">
          <div className="ss-page__header">
            <h1 className="ss-page__title">System Settings</h1>
            <p className="ss-page__subtitle">Configure system parameters, integrations, and preferences</p>
          </div>

          {/* Tab Nav */}
          <div className="ss-tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`ss-tab${activeTab === tab.id ? ' ss-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="ss-tab__icon">{tab.icon}</span>
                <span className="ss-tab__label">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="ss-tab-content">

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="ss-card">
                <div className="ss-card__header">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#4CAF50"/>
                  </svg>
                  <h2 className="ss-card__title">Profile Information</h2>
                  <span className="ss-role-badge">{profileData?.role || 'N/A'}</span>
                </div>
                <div className="ss-profile-grid">
                  <div className="ss-field">
                    <label className="ss-field__label">First Name</label>
                    <input type="text" value={profileData.firstName} readOnly className="ss-field__input ss-field__input--readonly" />
                  </div>
                  <div className="ss-field">
                    <label className="ss-field__label">Last Name</label>
                    <input type="text" value={profileData.lastName} readOnly className="ss-field__input ss-field__input--readonly" />
                  </div>
                  <div className="ss-field">
                    <label className="ss-field__label">Email Address</label>
                    <input type="email" value={profileData.email} readOnly className="ss-field__input ss-field__input--readonly" />
                  </div>
                  <div className="ss-field">
                    <label className="ss-field__label">Phone Number</label>
                    <input type="tel" value={profileData.phoneNumber || ''} readOnly className="ss-field__input ss-field__input--readonly" />
                  </div>
                </div>
                <button className="ss-btn ss-btn--primary" onClick={handleEditProfile}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="currentColor"/>
                  </svg>
                  Edit Profile
                </button>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="ss-card">
                <div className="ss-card__header">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M17 11C17.34 11 17.67 11.04 18 11.09V6.27L10.5 3L3 6.27V11.18C3 15.72 6.2 19.97 10.5 21C11.05 20.87 11.58 20.68 12.1 20.45C11.41 19.47 11 18.28 11 17C11 13.69 13.69 11 17 11Z" fill="#4CAF50"/>
                    <path d="M17 13C14.79 13 13 14.79 13 17C13 19.21 14.79 21 17 21C19.21 21 21 19.21 21 17C21 14.79 19.21 13 17 13ZM17 14.38C17.62 14.38 18.12 14.89 18.12 15.5C18.12 16.11 17.61 16.62 17 16.62C16.39 16.62 15.88 16.11 15.88 15.5C15.88 14.89 16.38 14.38 17 14.38ZM17 19.75C16.07 19.75 15.26 19.29 14.76 18.58C14.81 17.86 16.27 17.5 17 17.5C17.73 17.5 19.19 17.86 19.24 18.58C18.74 19.29 17.93 19.75 17 19.75Z" fill="#4CAF50"/>
                  </svg>
                  <h2 className="ss-card__title">General Settings</h2>
                </div>

                <div className="ss-setting-row">
                  <div className="ss-setting-row__info">
                    <h3 className="ss-setting-row__title">Critical Alerts</h3>
                    <p className="ss-setting-row__desc">Enable for severe disease detections &amp; abnormal carbon spikes</p>
                  </div>
                  <ToggleSwitch isOn={settings.criticalAlerts} onToggle={() => handleToggleChange('criticalAlerts')} />
                </div>

                <div className="ss-setting-row">
                  <div className="ss-setting-row__info">
                    <h3 className="ss-setting-row__title">Push Notifications</h3>
                    <p className="ss-setting-row__desc">Get notifications in your browser</p>
                  </div>
                  <ToggleSwitch isOn={settings.pushNotifications} onToggle={() => handleToggleChange('pushNotifications')} />
                </div>

                <div className="ss-setting-row ss-setting-row--last">
                  <div className="ss-setting-row__info">
                    <h3 className="ss-setting-row__title">Default Export Format</h3>
                    <p className="ss-setting-row__desc">Choose the documents format CSV / PDF / Excel</p>
                  </div>
                  <div className="ss-select-wrapper">
                    <select
                      className="ss-select"
                      value={settings.exportFormat}
                      onChange={(e) => {
                        const format = e.target.value;
                        localStorage.setItem('exportFormat', format);
                        setSettings(prev => ({ ...prev, exportFormat: format }));
                      }}
                    >
                      <option value="PDF">PDF</option>
                      <option value="CSV">CSV</option>
                      <option value="Excel">Excel</option>
                    </select>
                    <svg className="ss-select__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#080808"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Disease Management Tab */}
            {activeTab === 'disease' && (
              <div className="ss-card">

                {/* ── List View ── */}
                {diseaseView === 'list' && (
                  <>
                    <div className="dm-toolbar">
                      <div className="ss-card__header dm-toolbar__heading">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <path d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z" fill="#4CAF50"/>
                        </svg>
                        <h2 className="ss-card__title">Disease Management</h2>
                      </div>
                      <button className="ss-btn ss-btn--primary" onClick={() => { resetDiseaseForm(); setDiseaseView('add'); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Add Disease
                      </button>
                    </div>
                    <p className="dm-intro">Manage disease records used for AI diagnostics across the application.</p>

                    {/* Search + Filters */}
                    <div className="dm-filters">
                      <div className="dm-search-wrapper">
                        <svg className="dm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <input
                          type="text"
                          className="dm-search-input"
                          placeholder="Search by disease name…"
                          value={dmSearch}
                          onChange={e => { setDmSearch(e.target.value); setDmPage(1); }}
                        />
                        {dmSearch && (
                          <button className="dm-search-clear" onClick={() => { setDmSearch(''); setDmPage(1); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                          </button>
                        )}
                      </div>
                      <div className="dm-filter-group">
                        <div className="ss-select-wrapper dm-filter-select">
                          <select
                            className="ss-select"
                            value={dmTypeFilter}
                            onChange={e => { setDmTypeFilter(e.target.value); setDmPage(1); }}
                          >
                            <option value="">All Types</option>
                            {diseaseTypes.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                          <svg className="ss-select__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#080808"/>
                          </svg>
                        </div>
                        {(dmSearch || dmTypeFilter) && (
                          <button className="dm-clear-filters-btn" onClick={() => { setDmSearch(''); setDmTypeFilter(''); setDmPage(1); }}>
                            Clear filters
                          </button>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const filtered = diseases.filter(d => {
                        const nameMatch = !dmSearch || (d.disease_name || d.name || '').toLowerCase().includes(dmSearch.toLowerCase());
                        const typeMatch = !dmTypeFilter || String(d.disease_type_id) === String(dmTypeFilter);
                        return nameMatch && typeMatch;
                      });
                      const totalPages = Math.max(1, Math.ceil(filtered.length / DM_PAGE_SIZE));
                      const safePage = Math.min(dmPage, totalPages);
                      const paged = filtered.slice((safePage - 1) * DM_PAGE_SIZE, safePage * DM_PAGE_SIZE);

                      return loadingDiseases ? (
                        <div className="sc-loading">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="sc-loading__spinner">
                            <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round"/>
                          </svg>
                          Loading diseases...
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="sc-empty">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                            <path d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z" fill="#D1D5DB"/>
                          </svg>
                          <p>{dmSearch || dmTypeFilter ? 'No diseases match your filters.' : 'No diseases found. Click "Add Disease" to create the first one.'}</p>
                        </div>
                      ) : (
                        <>
                          <div className="dm-results-meta">
                            <span className="dm-results-count">{filtered.length} disease{filtered.length !== 1 ? 's' : ''} found</span>
                          </div>
                          <div className="dm-table-wrapper">
                            <table className="dm-table">
                              <thead>
                                <tr>
                                  <th className="dm-table__th">Photo</th>
                                  <th className="dm-table__th">Disease Name</th>
                                  <th className="dm-table__th">Type</th>
                                  <th className="dm-table__th">Affected Crops</th>
                                  <th className="dm-table__th dm-table__th--actions">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paged.map(disease => (
                                  <tr key={disease.id} className="dm-table__row">
                                    <td className="dm-table__td">
                                      {(disease.photo || disease.image_url) ? (
                                        <img src={disease.photo || disease.image_url} alt={disease.disease_name || disease.name} className="dm-disease-thumb" />
                                      ) : (
                                        <div className="dm-disease-thumb dm-disease-thumb--placeholder">
                                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="#D1D5DB"/>
                                          </svg>
                                        </div>
                                      )}
                                    </td>
                                    <td className="dm-table__td dm-disease-name">{disease.disease_name || disease.name}</td>
                                    <td className="dm-table__td">
                                      <span className="dm-type-badge">{disease.disease_type || disease.type_name || '—'}</span>
                                    </td>
                                    <td className="dm-table__td dm-crops-cell">{disease.commonly_affected_crops || '—'}</td>
                                    <td className="dm-table__td dm-table__td--actions">
                                      <button className="sc-action-btn dm-action-btn--view" onClick={() => handleViewDisease(disease)}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                                        View
                                      </button>
                                      <button className="sc-action-btn sc-action-btn--edit" onClick={() => handleEditDisease(disease)}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"/></svg>
                                        Edit
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {totalPages > 1 && (
                            <div className="dm-pagination">
                              <span className="dm-pagination__info">Page {safePage} of {totalPages}</span>
                              <div className="dm-pagination__controls">
                                <button
                                  className="dm-pagination__btn"
                                  onClick={() => setDmPage(1)}
                                  disabled={safePage === 1}
                                  title="First page"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z"/></svg>
                                </button>
                                <button
                                  className="dm-pagination__btn"
                                  onClick={() => setDmPage(p => Math.max(1, p - 1))}
                                  disabled={safePage === 1}
                                  title="Previous page"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                  .reduce((acc, p, idx, arr) => {
                                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                                    acc.push(p);
                                    return acc;
                                  }, [])
                                  .map((item, idx) =>
                                    item === '...' ? (
                                      <span key={`ellipsis-${idx}`} className="dm-pagination__ellipsis">…</span>
                                    ) : (
                                      <button
                                        key={item}
                                        className={`dm-pagination__btn dm-pagination__btn--page${safePage === item ? ' dm-pagination__btn--active' : ''}`}
                                        onClick={() => setDmPage(item)}
                                      >
                                        {item}
                                      </button>
                                    )
                                  )}
                                <button
                                  className="dm-pagination__btn"
                                  onClick={() => setDmPage(p => Math.min(totalPages, p + 1))}
                                  disabled={safePage === totalPages}
                                  title="Next page"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                                </button>
                                <button
                                  className="dm-pagination__btn"
                                  onClick={() => setDmPage(totalPages)}
                                  disabled={safePage === totalPages}
                                  title="Last page"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"/></svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}

                {/* ── Add View ── */}
                {diseaseView === 'add' && (
                  <>
                    <div className="dm-subview-header">
                      <button className="dm-back-btn" onClick={() => { resetDiseaseForm(); setDiseaseView('list'); }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                        Back to Diseases
                      </button>
                      <div className="ss-card__header dm-subview-title">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <path d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z" fill="#4CAF50"/>
                        </svg>
                        <h2 className="ss-card__title">Add New Disease</h2>
                      </div>
                    </div>
                    <div className="ss-disease-form">
                      <div className="ss-disease-form__grid">
                        <div className="ss-field">
                          <label className="ss-field__label">Disease Name <span className="ss-required">*</span></label>
                          <input type="text" value={diseaseData.diseaseName} onChange={(e) => setDiseaseData(prev => ({ ...prev, diseaseName: e.target.value }))} className="ss-field__input" placeholder="Enter disease name" />
                        </div>
                        <div className="ss-field">
                          <label className="ss-field__label">Disease Type <span className="ss-required">*</span></label>
                          <select value={diseaseData.diseaseTypeId} onChange={(e) => setDiseaseData(prev => ({ ...prev, diseaseTypeId: e.target.value }))} className="ss-field__input">
                            <option value="">Select disease type</option>
                            {diseaseTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                          </select>
                        </div>
                        <div className="ss-field">
                          <label className="ss-field__label">Commonly Affected Crops</label>
                          <input type="text" value={diseaseData.commonlyAffectedCrops} onChange={(e) => setDiseaseData(prev => ({ ...prev, commonlyAffectedCrops: e.target.value }))} className="ss-field__input" placeholder="e.g., Tomatoes, Potatoes, Peppers" />
                        </div>
                        <div className="ss-field">
                          <label className="ss-field__label">Disease Photo <span className="ss-required">*</span></label>
                          <div
                            className="ss-upload-zone"
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ss-upload-zone--hover'); }}
                            onDragLeave={(e) => e.currentTarget.classList.remove('ss-upload-zone--hover')}
                            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('ss-upload-zone--hover'); const file = e.dataTransfer.files[0]; if (file) handleDiseasePhotoChange({ target: { files: [file] } }); }}
                            onClick={() => document.getElementById('disease-photo-add').click()}
                          >
                            {diseasePhotoPreview ? (
                              <div className="ss-upload-zone__preview">
                                <img src={diseasePhotoPreview} alt="Disease preview" className="ss-upload-zone__img" />
                                <p className="ss-upload-zone__hint">Click to change image</p>
                              </div>
                            ) : (
                              <>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="17 8 12 3 7 8"/>
                                  <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                <p className="ss-upload-zone__text">Click to upload or drag and drop</p>
                                <p className="ss-upload-zone__hint">PNG, JPG, GIF up to 5MB</p>
                              </>
                            )}
                            <input id="disease-photo-add" type="file" accept="image/*" onChange={handleDiseasePhotoChange} style={{ display: 'none' }} />
                          </div>
                        </div>
                        <div className="ss-field ss-field--full">
                          <label className="ss-field__label">Description</label>
                          <textarea value={diseaseData.description} onChange={(e) => setDiseaseData(prev => ({ ...prev, description: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Enter disease description" />
                        </div>
                        <div className="ss-field ss-field--full">
                          <label className="ss-field__label">Visual Symptoms</label>
                          <textarea value={diseaseData.visualSymptoms} onChange={(e) => setDiseaseData(prev => ({ ...prev, visualSymptoms: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Describe visual symptoms of the disease" />
                        </div>
                        <div className="ss-field ss-field--full">
                          <label className="ss-field__label">Identification Tips</label>
                          <textarea value={diseaseData.identificationTips} onChange={(e) => setDiseaseData(prev => ({ ...prev, identificationTips: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Tips for identifying this disease" />
                        </div>
                        <div className="ss-field">
                          <label className="ss-field__label">Organic Treatment</label>
                          <textarea value={diseaseData.organicTreatment} onChange={(e) => setDiseaseData(prev => ({ ...prev, organicTreatment: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Describe organic treatment methods" />
                        </div>
                        <div className="ss-field">
                          <label className="ss-field__label">Chemical Treatment</label>
                          <textarea value={diseaseData.chemicalTreatment} onChange={(e) => setDiseaseData(prev => ({ ...prev, chemicalTreatment: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Describe chemical treatment methods" />
                        </div>
                        <div className="ss-field ss-field--full">
                          <label className="ss-field__label">Prevention Strategies</label>
                          <textarea value={diseaseData.preventionStrategies} onChange={(e) => setDiseaseData(prev => ({ ...prev, preventionStrategies: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Describe prevention strategies" />
                        </div>
                      </div>
                      <div className="ss-disease-form__actions">
                        <button className="ss-btn ss-btn--outline" onClick={resetDiseaseForm} disabled={isSubmittingDisease}>Reset</button>
                        <button className="ss-btn ss-btn--primary" onClick={handleSaveDisease} disabled={isSubmittingDisease}>
                          {isSubmittingDisease ? 'Adding Disease...' : 'Add Disease'}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── View View ── */}
                {diseaseView === 'view' && selectedDisease && (
                  <>
                    <div className="dm-subview-header">
                      <button className="dm-back-btn" onClick={() => setDiseaseView('list')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                        Back to Diseases
                      </button>
                      <div className="dm-view-header-row">
                        <div className="ss-card__header dm-subview-title">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M4.47012 21H19.5301C21.0701 21 22.0301 19.33 21.2601 18L13.7301 4.98999C12.9601 3.65999 11.0401 3.65999 10.2701 4.98999L2.74012 18C1.97012 19.33 2.93012 21 4.47012 21ZM12.0001 14C11.4501 14 11.0001 13.55 11.0001 13V11C11.0001 10.45 11.4501 9.99999 12.0001 9.99999C12.5501 9.99999 13.0001 10.45 13.0001 11V13C13.0001 13.55 12.5501 14 12.0001 14ZM13.0001 18H11.0001V16H13.0001V18Z" fill="#4CAF50"/>
                          </svg>
                          <h2 className="ss-card__title">{selectedDisease.disease_name || selectedDisease.name}</h2>
                        </div>
                        <button className="ss-btn ss-btn--primary" onClick={() => handleEditDisease(selectedDisease)} disabled={loadingDiseaseDetail}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"/></svg>
                          Edit Disease
                        </button>
                      </div>
                    </div>
                    {loadingDiseaseDetail && (
                      <div className="sc-loading dm-detail-loading">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="sc-loading__spinner">
                          <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round"/>
                        </svg>
                        Loading disease details...
                      </div>
                    )}

                    <div className="dm-detail-grid">
                      {(selectedDisease.photo || selectedDisease.image_url) && (
                        <div className="dm-detail-photo-wrapper">
                          <img src={selectedDisease.photo || selectedDisease.image_url} alt={selectedDisease.disease_name || selectedDisease.name} className="dm-detail-photo" />
                        </div>
                      )}
                      <div className="dm-detail-fields">
                        <div className="dm-detail-row">
                          <span className="dm-detail-label">Disease Name</span>
                          <span className="dm-detail-value">{selectedDisease.disease_name || selectedDisease.name || '—'}</span>
                        </div>
                        <div className="dm-detail-row">
                          <span className="dm-detail-label">Disease Type</span>
                          <span className="dm-detail-value">
                            {selectedDisease.disease_type || selectedDisease.type_name
                              ? <span className="dm-type-badge">{selectedDisease.disease_type || selectedDisease.type_name}</span>
                              : '—'}
                          </span>
                        </div>
                        <div className="dm-detail-row">
                          <span className="dm-detail-label">Commonly Affected Crops</span>
                          <span className="dm-detail-value">{selectedDisease.commonly_affected_crops || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="dm-detail-sections">
                      {selectedDisease.description && (
                        <div className="dm-detail-section">
                          <div className="dm-detail-section__header">
                            {/* <span className="dm-detail-section__icon dm-detail-section__icon--desc">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                            </span> */}
                            <h3 className="dm-detail-section__title">Description</h3>
                          </div>
                          <p className="dm-detail-section__body">{selectedDisease.description}</p>
                        </div>
                      )}
                      {(selectedDisease.visual_symptoms || selectedDisease.symptoms) && (
                        <div className="dm-detail-section dm-detail-section--symptoms">
                          <div className="dm-detail-section__header">
                            <span className="dm-detail-section__icon dm-detail-section__icon--symptoms">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                            </span>
                            <h3 className="dm-detail-section__title">Visual Symptoms</h3>
                          </div>
                          {renderDetailText(selectedDisease.visual_symptoms || selectedDisease.symptoms, '#F59E0B')}
                        </div>
                      )}
                      {selectedDisease.identification_tips && (
                        <div className="dm-detail-section dm-detail-section--tips">
                          <div className="dm-detail-section__header">
                            <span className="dm-detail-section__icon dm-detail-section__icon--tips">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>
                            </span>
                            <h3 className="dm-detail-section__title">Identification Tips</h3>
                          </div>
                          {renderDetailText(selectedDisease.identification_tips, '#3B82F6')}
                        </div>
                      )}
                      <div className="dm-detail-treatment-grid">
                        {(selectedDisease.organic_treatment || selectedDisease.organic_treatments) && (
                          <div className="dm-detail-section dm-detail-section--organic">
                            <div className="dm-detail-section__header">
                              <span className="dm-detail-section__icon dm-detail-section__icon--organic">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21H5.71c.52-1.19 1.08-2.35 1.76-3.41C9.21 17.7 11.55 17 14 17c4.96 0 9-4.04 9-9v-1L17 8zm-7.58 6.18C10.5 14.07 11.24 14 12 14c1.08 0 2.12.2 3.08.53C13.82 15.44 12.3 16 11 16c-.6 0-1.11-.08-1.58-.18l-.05-.02.05-.62z"/></svg>
                              </span>
                              <h3 className="dm-detail-section__title">Organic Treatment</h3>
                            </div>
                            {renderDetailText(selectedDisease.organic_treatment || selectedDisease.organic_treatments, '#4CAF50')}
                          </div>
                        )}
                        {(selectedDisease.chemical_treatment || selectedDisease.chemical_treatments) && (
                          <div className="dm-detail-section dm-detail-section--chemical">
                            <div className="dm-detail-section__header">
                              <span className="dm-detail-section__icon dm-detail-section__icon--chemical">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v2h1v12c0 2.21 1.79 4 4 4s4-1.79 4-4V4h1V2H7zm4 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2-4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-6H10V4h4v2z"/></svg>
                              </span>
                              <h3 className="dm-detail-section__title">Chemical Treatment</h3>
                            </div>
                            {renderDetailText(selectedDisease.chemical_treatment || selectedDisease.chemical_treatments, '#F59E0B')}
                          </div>
                        )}
                      </div>
                      {(selectedDisease.prevention_strategies || selectedDisease.preventions) && (
                        <div className="dm-detail-section dm-detail-section--prevention">
                          <div className="dm-detail-section__header">
                            <span className="dm-detail-section__icon dm-detail-section__icon--prevention">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                            </span>
                            <h3 className="dm-detail-section__title">Prevention Strategies</h3>
                          </div>
                          {renderDetailText(selectedDisease.prevention_strategies || selectedDisease.preventions, '#10B981')}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── Edit View ── */}
                {diseaseView === 'edit' && selectedDisease && (
                  <>
                    <div className="dm-subview-header">
                      <button className="dm-back-btn" onClick={() => { resetDiseaseForm(); setDiseaseView('view'); }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                        Back to Disease
                      </button>
                      <div className="ss-card__header dm-subview-title">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="#4CAF50"/>
                        </svg>
                        <h2 className="ss-card__title">Edit Disease</h2>
                      </div>
                    </div>
                    {loadingDiseaseDetail && (
                      <div className="sc-loading dm-detail-loading">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="sc-loading__spinner">
                          <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round"/>
                        </svg>
                        Loading disease details...
                      </div>
                    )}
                    <div className="ss-disease-form">
                      <div className="ss-disease-form__grid">
                        <div className="ss-field">
                          <label className="ss-field__label">Disease Name <span className="ss-required">*</span></label>
                          <input type="text" value={diseaseData.diseaseName} onChange={(e) => setDiseaseData(prev => ({ ...prev, diseaseName: e.target.value }))} className="ss-field__input" placeholder="Enter disease name" />
                        </div>
                        <div className="ss-field">
                          <label className="ss-field__label">Disease Type <span className="ss-required">*</span></label>
                          <select value={diseaseData.diseaseTypeId} onChange={(e) => setDiseaseData(prev => ({ ...prev, diseaseTypeId: e.target.value }))} className="ss-field__input">
                            <option value="">Select disease type</option>
                            {diseaseTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                          </select>
                        </div>
                        <div className="ss-field">
                          <label className="ss-field__label">Commonly Affected Crops</label>
                          <input type="text" value={diseaseData.commonlyAffectedCrops} onChange={(e) => setDiseaseData(prev => ({ ...prev, commonlyAffectedCrops: e.target.value }))} className="ss-field__input" placeholder="e.g., Tomatoes, Potatoes, Peppers" />
                        </div>
                        <div className="ss-field">
                          <label className="ss-field__label">Disease Photo</label>
                          <div
                            className="ss-upload-zone"
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ss-upload-zone--hover'); }}
                            onDragLeave={(e) => e.currentTarget.classList.remove('ss-upload-zone--hover')}
                            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('ss-upload-zone--hover'); const file = e.dataTransfer.files[0]; if (file) handleDiseasePhotoChange({ target: { files: [file] } }); }}
                            onClick={() => document.getElementById('disease-photo-edit').click()}
                          >
                            {diseasePhotoPreview ? (
                              <div className="ss-upload-zone__preview">
                                <img src={diseasePhotoPreview} alt="Disease preview" className="ss-upload-zone__img" />
                                <p className="ss-upload-zone__hint">Click to change image</p>
                              </div>
                            ) : (
                              <>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="17 8 12 3 7 8"/>
                                  <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                <p className="ss-upload-zone__text">Click to upload or drag and drop</p>
                                <p className="ss-upload-zone__hint">PNG, JPG, GIF up to 5MB</p>
                              </>
                            )}
                            <input id="disease-photo-edit" type="file" accept="image/*" onChange={handleDiseasePhotoChange} style={{ display: 'none' }} />
                          </div>
                        </div>
                        <div className="ss-field ss-field--full">
                          <label className="ss-field__label">Description</label>
                          <textarea value={diseaseData.description} onChange={(e) => setDiseaseData(prev => ({ ...prev, description: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Enter disease description" />
                        </div>
                        <div className="ss-field ss-field--full">
                          <label className="ss-field__label">Visual Symptoms</label>
                          <textarea value={diseaseData.visualSymptoms} onChange={(e) => setDiseaseData(prev => ({ ...prev, visualSymptoms: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Describe visual symptoms of the disease" />
                        </div>
                        <div className="ss-field ss-field--full">
                          <label className="ss-field__label">Identification Tips</label>
                          <textarea value={diseaseData.identificationTips} onChange={(e) => setDiseaseData(prev => ({ ...prev, identificationTips: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Tips for identifying this disease" />
                        </div>
                        <div className="ss-field">
                          <label className="ss-field__label">Organic Treatment</label>
                          <textarea value={diseaseData.organicTreatment} onChange={(e) => setDiseaseData(prev => ({ ...prev, organicTreatment: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Describe organic treatment methods" />
                        </div>
                        <div className="ss-field">
                          <label className="ss-field__label">Chemical Treatment</label>
                          <textarea value={diseaseData.chemicalTreatment} onChange={(e) => setDiseaseData(prev => ({ ...prev, chemicalTreatment: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Describe chemical treatment methods" />
                        </div>
                        <div className="ss-field ss-field--full">
                          <label className="ss-field__label">Prevention Strategies</label>
                          <textarea value={diseaseData.preventionStrategies} onChange={(e) => setDiseaseData(prev => ({ ...prev, preventionStrategies: e.target.value }))} className="ss-field__input ss-field__textarea" placeholder="Describe prevention strategies" />
                        </div>
                      </div>
                      <div className="ss-disease-form__actions">
                        <button className="ss-btn ss-btn--outline" onClick={() => { resetDiseaseForm(); setDiseaseView('view'); }} disabled={isSubmittingEditDisease}>Cancel</button>
                        <button className="ss-btn ss-btn--primary" onClick={handleSaveEditDisease} disabled={isSubmittingEditDisease}>
                          {isSubmittingEditDisease ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}

            {/* System Codes Tab */}
            {activeTab === 'system_codes' && (
              <div className="ss-card">
                <div className="sc-toolbar">
                  <div className="ss-card__header sc-toolbar__heading">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" fill="#4CAF50"/>
                    </svg>
                    <h2 className="ss-card__title">System Codes</h2>
                  </div>
                  <div className="sc-toolbar__controls">
                    <div className="ss-select-wrapper sc-filter-select">
                      <select
                        className="ss-select"
                        value={codeFilterType}
                        onChange={e => setCodeFilterType(e.target.value)}
                      >
                        <option value="">All Types</option>
                        {codeTypeOptions.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <svg className="ss-select__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#080808"/>
                      </svg>
                    </div>
                    <button className="ss-btn ss-btn--primary" onClick={handleOpenCreateCode}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      New Type
                    </button>
                  </div>
                </div>

                <p className="sc-intro">
                  Manage dropdown values used across the application (e.g. Sex, Education Level).
                  Each group below is a code type — expand it to view, add, edit, or delete its values.
                </p>

                {loadingCodes ? (
                  <div className="sc-loading">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="sc-loading__spinner">
                      <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round"/>
                    </svg>
                    Loading system codes...
                  </div>
                ) : groupedCodes.length === 0 ? (
                  <div className="sc-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#D1D5DB"/>
                    </svg>
                    <p>{codeFilterType ? `No codes found for type "${codeFilterType}".` : 'No system codes found. Click "New Type" to create the first one.'}</p>
                  </div>
                ) : (
                  <div className="sc-groups">
                    {groupedCodes.map(({ code_type, codes }) => {
                      const isExpanded = !collapsedGroups.has(code_type);
                      return (
                        <div key={code_type} className="sc-group">
                          <div className="sc-group__header" onClick={() => toggleGroup(code_type)}>
                            <div className="sc-group__header-left">
                              <svg
                                className={`sc-group__chevron${isExpanded ? ' sc-group__chevron--open' : ''}`}
                                width="18" height="18" viewBox="0 0 24 24" fill="none"
                              >
                                <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="currentColor"/>
                              </svg>
                              <span className="sc-group__type-label">{code_type}</span>
                            </div>
                            <button
                              className="sc-group__add-value-btn"
                              title={`Add value to ${code_type}`}
                              onClick={e => { e.stopPropagation(); handleOpenCreateCodeForType(code_type); }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                              </svg>
                              Add Value
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="sc-group__body">
                              {codes.length === 0 ? (
                                <p className="sc-group__empty">No values yet.</p>
                              ) : (
                                codes.map(code => (
                                  <div key={code.id} className="sc-value-row">
                                    <div className="sc-value-row__info">
                                      <span className="sc-value-row__name">{code.code_value}</span>
                                      {code.description && (
                                        <span className="sc-value-row__desc">{code.description}</span>
                                      )}
                                    </div>
                                    <div className="sc-value-row__actions">
                                      <button
                                        className="sc-action-btn sc-action-btn--edit"
                                        title="Edit value"
                                        onClick={() => handleOpenEditCode(code)}
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"/>
                                        </svg>
                                        Edit
                                      </button>
                                      <button
                                        className="sc-action-btn sc-action-btn--delete"
                                        title="Delete value"
                                        onClick={() => setDeleteConfirmCodeId(code.id)}
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                        </svg>
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Account & Security Tab */}
            {activeTab === 'security' && (
              <div className="ss-card">
                <div className="ss-card__header">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 11.99H19C18.47 16.11 15.72 19.78 12 20.93V12H5V6.3L12 3.19V11.99Z" fill="#4CAF50"/>
                  </svg>
                  <h2 className="ss-card__title">Account &amp; Security</h2>
                </div>

                <div className="ss-setting-row">
                  <div className="ss-setting-row__info">
                    <h3 className="ss-setting-row__title">Password</h3>
                    <p className="ss-setting-row__desc">Change your account password</p>
                  </div>
                  <button className="ss-btn ss-btn--outline" onClick={() => setIsPasswordModalOpen(true)}>Change</button>
                </div>

                <div className="ss-setting-row">
                  <div className="ss-setting-row__info">
                    <h3 className="ss-setting-row__title">Two-Factor Authentication</h3>
                    <p className="ss-setting-row__desc">Add an extra layer of security</p>
                  </div>
                  <button className="ss-btn ss-btn--outline">Enable</button>
                </div>

                <div className="ss-setting-row ss-setting-row--last">
                  <div className="ss-setting-row__info">
                    <h3 className="ss-setting-row__title">Audit Logs</h3>
                    <p className="ss-setting-row__desc">Track all admin/system-level changes</p>
                  </div>
                  <button className="ss-btn ss-btn--outline">View</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileModalOpen && (
        <div className="ss-modal-overlay" onClick={handleCancelEdit}>
          <div className="ss-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="ss-modal__title">Edit Profile</h2>
            <div className="ss-modal__body">
              <div className="ss-field">
                <label className="ss-field__label">First Name</label>
                <input type="text" value={editProfileData.firstName} onChange={(e) => setEditProfileData(prev => ({ ...prev, firstName: e.target.value }))} className="ss-field__input" />
              </div>
              <div className="ss-field">
                <label className="ss-field__label">Last Name</label>
                <input type="text" value={editProfileData.lastName} onChange={(e) => setEditProfileData(prev => ({ ...prev, lastName: e.target.value }))} className="ss-field__input" />
              </div>
              <div className="ss-field">
                <label className="ss-field__label">Email Address</label>
                <input type="email" value={editProfileData.email} onChange={(e) => setEditProfileData(prev => ({ ...prev, email: e.target.value }))} className="ss-field__input" />
              </div>
              <div className="ss-field">
                <label className="ss-field__label">Phone Number</label>
                <input type="tel" value={editProfileData.phoneNumber || ''} onChange={(e) => setEditProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))} className="ss-field__input" placeholder="+254 700 000 000" />
              </div>
            </div>
            <div className="ss-modal__actions">
              <button className="ss-btn ss-btn--outline" onClick={handleCancelEdit}>Cancel</button>
              <button className="ss-btn ss-btn--primary" onClick={handleSaveProfile}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="ss-modal-overlay" onClick={() => { if (!isSubmittingPassword) { setIsPasswordModalOpen(false); setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' }); setPasswordErrors({}); } }}>
          <div className="ss-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="ss-modal__title">Change Password</h2>
            <div className="ss-modal__body">
              <PasswordInput label="Current Password" value={passwordData.oldPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))} error={passwordErrors.oldPassword} field="old" />
              <PasswordInput label="New Password" value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))} error={passwordErrors.newPassword} field="new" />
              <PasswordInput label="Confirm New Password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))} error={passwordErrors.confirmPassword} field="confirm" />
            </div>
            <div className="ss-modal__actions">
              <button className="ss-btn ss-btn--outline" onClick={() => { setIsPasswordModalOpen(false); setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' }); setPasswordErrors({}); }} disabled={isSubmittingPassword}>Cancel</button>
              <button className="ss-btn ss-btn--primary" onClick={handlePasswordChange} disabled={isSubmittingPassword}>
                {isSubmittingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Code Create/Edit Modal */}
      {isCodeModalOpen && (
        <div className="ss-modal-overlay" onClick={() => { if (!isSavingCode) { setIsCodeModalOpen(false); setCodeFormErrors({}); } }}>
          <div className="ss-modal" onClick={e => e.stopPropagation()}>
            <h2 className="ss-modal__title">
              {isCodeEditMode ? 'Edit Code Value' : isCodeTypeFixed ? `Add Value to "${codeFormData.code_type}"` : 'Add New Code Type'}
            </h2>
            <div className="ss-modal__body">
              <div className="ss-field">
                <label className="ss-field__label">Code Type <span className="ss-required">*</span></label>
                {isCodeTypeFixed ? (
                  <div className="sc-fixed-type-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
                    </svg>
                    {codeFormData.code_type}
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="e.g. Sex, EducationLevel"
                      value={codeFormData.code_type}
                      onChange={e => setCodeFormData(prev => ({ ...prev, code_type: e.target.value }))}
                      className={`ss-field__input${codeFormErrors.code_type ? ' ss-field__input--error' : ''}`}
                    />
                    {codeFormErrors.code_type && <span className="ss-field__error">{codeFormErrors.code_type}</span>}
                    <span className="sc-char-count">{codeFormData.code_type.length}/100</span>
                  </>
                )}
              </div>
              <div className="ss-field">
                <label className="ss-field__label">Code Value <span className="ss-required">*</span></label>
                <input
                  type="text"
                  maxLength={255}
                  placeholder="e.g. Male, Bachelor's Degree"
                  value={codeFormData.code_value}
                  onChange={e => setCodeFormData(prev => ({ ...prev, code_value: e.target.value }))}
                  className={`ss-field__input${codeFormErrors.code_value ? ' ss-field__input--error' : ''}`}
                />
                {codeFormErrors.code_value && <span className="ss-field__error">{codeFormErrors.code_value}</span>}
                <span className="sc-char-count">{codeFormData.code_value.length}/255</span>
              </div>
              <div className="ss-field">
                <label className="ss-field__label">Description</label>
                <textarea
                  placeholder="Optional description"
                  value={codeFormData.description}
                  onChange={e => setCodeFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="ss-field__input ss-field__textarea"
                  rows={3}
                />
              </div>
            </div>
            <div className="ss-modal__actions">
              <button className="ss-btn ss-btn--outline" onClick={() => { setIsCodeModalOpen(false); setCodeFormErrors({}); }} disabled={isSavingCode}>Cancel</button>
              <button className="ss-btn ss-btn--primary" onClick={handleSaveCode} disabled={isSavingCode}>
                {isSavingCode ? 'Saving...' : (isCodeEditMode ? 'Save Changes' : 'Create Code')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Code Delete Confirmation */}
      {deleteConfirmCodeId && (
        <div className="ss-modal-overlay" onClick={() => { if (!isDeletingCode) setDeleteConfirmCodeId(null); }}>
          <div className="ss-modal sc-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="sc-confirm-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#DC2626"/>
              </svg>
            </div>
            <h2 className="ss-modal__title sc-confirm-title">Delete System Code?</h2>
            <p className="sc-confirm-desc">This action cannot be undone. The code will be permanently removed from the system.</p>
            <div className="ss-modal__actions">
              <button className="ss-btn ss-btn--outline" onClick={() => setDeleteConfirmCodeId(null)} disabled={isDeletingCode}>Cancel</button>
              <button className="ss-btn ss-btn--danger" onClick={handleConfirmDeleteCode} disabled={isDeletingCode}>
                {isDeletingCode ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}



      <style>{`
        /* Page Layout */
        .ss-page {
          padding: 1.5rem;
          background: #FFF;
          min-height: calc(100vh - 5.625rem);
          margin: 0.5rem 0.75rem;
          border-radius: 0.5rem;
        }

        .ss-page__header {
          margin-bottom: 1.75rem;
        }

        .ss-page__title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0B0324;
          margin: 0 0 0.375rem;
          font-family: Poppins, sans-serif;
        }

        .ss-page__subtitle {
          font-size: 0.9375rem;
          color: #4B5563;
          margin: 0;
          font-family: Poppins, sans-serif;
        }

        /* Tabs */
        .ss-tabs {
          display: flex;
          border-bottom: 2px solid #E1E7EF;
          margin-bottom: 1.5rem;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .ss-tabs::-webkit-scrollbar { display: none; }

        .ss-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          background: none;
          border: none;
          border-bottom: 2.5px solid transparent;
          margin-bottom: -2px;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #6B7280;
          font-family: Inter, sans-serif;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s, background 0.2s;
          white-space: nowrap;
          border-radius: 0.5rem 0.5rem 0 0;
        }

        .ss-tab:hover {
          color: #4CAF50;
          background: #F0FBF0;
        }

        .ss-tab--active {
          color: #4CAF50;
          border-bottom-color: #4CAF50;
          background: #F0FBF0;
        }

        .ss-tab__icon {
          display: flex;
          align-items: center;
        }

        /* Card */
        .ss-card {
          background: #FFF;
          border: 1px solid #E1E7EF;
          border-radius: 0.75rem;
          padding: 1.75rem 2rem;
        }

        .ss-card__header {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 1.75rem;
        }

        .ss-card__title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #080808;
          margin: 0;
          font-family: Inter, sans-serif;
          flex: 1;
        }

        /* Role badge */
        .ss-role-badge {
          padding: 0.3rem 0.875rem;
          background: #E6E6E6;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #080808;
          font-family: Inter, sans-serif;
        }

        /* Profile grid */
        .ss-profile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .ss-field--full {
          grid-column: 1 / -1;
        }

        /* Fields */
        .ss-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .ss-field__label {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #080808;
          font-family: Inter, sans-serif;
        }

        .ss-field__input {
          padding: 0.875rem 1rem;
          border: 1px solid #E6E6E6;
          border-radius: 0.625rem;
          background: #FCFCFC;
          font-size: 0.9375rem;
          color: #080808 ;
          font-family: Inter, sans-serif;
          outline: none;
          transition: border-color 0.2s;
          width: 100%;
          box-sizing: border-box;
        }

        .ss-field__input:focus { border-color: #4CAF50; }
        .ss-field__input--readonly { cursor: default; }
        .ss-field__input--error { border-color: #DC2626; background: #FEF2F2; }

        .ss-field__textarea {
          min-height: 6rem;
          resize: vertical;
        }

        .ss-field__error {
          font-size: 0.8125rem;
          color: #DC2626;
          font-family: Inter, sans-serif;
        }

        .ss-required { color: #DC2626; }

        /* Password input */
        .ss-password-wrapper { position: relative; }

        .ss-password-wrapper .ss-field__input { padding-right: 3rem; }

        .ss-password-toggle {
          position: absolute;
          right: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #6B7280;
          display: flex;
          align-items: center;
          padding: 0;
        }

        /* Setting rows */
        .ss-setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 0;
          border-bottom: 1px solid #E6E6E6;
          gap: 1rem;
        }

        .ss-setting-row--last {
          border-bottom: none;
          padding-bottom: 0;
        }

        .ss-setting-row__info { flex: 1; }

        .ss-setting-row__title {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #080808;
          margin: 0 0 0.25rem;
          font-family: Inter, sans-serif;
        }

        .ss-setting-row__desc {
          font-size: 0.875rem;
          color: #787878;
          margin: 0;
          font-family: Inter, sans-serif;
        }

        /* Toggle */
        .ss-toggle {
          width: 3.25rem;
          height: 1.625rem;
          background: #D1D5DB;
          border-radius: 1rem;
          position: relative;
          cursor: pointer;
          transition: background 0.3s;
          flex-shrink: 0;
        }

        .ss-toggle--on { background: #4CAF50; }

        .ss-toggle__knob {
          width: 1.125rem;
          height: 1.125rem;
          background: #FFF;
          border-radius: 50%;
          position: absolute;
          top: 0.25rem;
          left: 0.25rem;
          transition: transform 0.3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .ss-toggle--on .ss-toggle__knob {
          transform: translateX(1.625rem);
        }

        /* Select */
        .ss-select-wrapper {
          position: relative;
          width: 9rem;
        }

        .ss-select {
          width: 100%;
          padding: 0.5rem 2.25rem 0.5rem 0.875rem;
          border: 1px solid #E6E6E6;
          border-radius: 0.625rem;
          background: #FCFCFC;
          font-size: 0.9375rem;
          color: #080808;
          font-family: Poppins, sans-serif;
          appearance: none;
          cursor: pointer;
          outline: none;
        }

        .ss-select__arrow {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        /* Buttons */
        .ss-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 0.625rem;
          font-size: 0.9375rem;
          font-weight: 500;
          font-family: Poppins, sans-serif;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          border: none;
          outline: none;
        }

        .ss-btn--primary {
          background: #4CAF50;
          color: #FFF;
        }

        .ss-btn--primary:hover { background: #3d8b40; }
        .ss-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .ss-btn--outline {
          background: #FCFCFC;
          color: #080808;
          border: 1px solid #E6E6E6;
        }

        .ss-btn--outline:hover { background: #F3F4F6; }
        .ss-btn--outline:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Disease inline form */
        .ss-disease-form__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .ss-disease-form__actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          padding-top: 1rem;
          border-top: 1px solid #E6E6E6;
        }

        /* Disease Management — List View */
        .dm-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .dm-toolbar__heading {
          margin-bottom: 0;
          flex: 1;
        }

        .dm-intro {
          font-size: 0.875rem;
          color: #6B7280;
          margin: 0 0 1.5rem;
          font-family: Inter, sans-serif;
          line-height: 1.5;
        }

        .dm-table-wrapper {
          overflow-x: auto;
          border: 1px solid #E6E6E6;
          border-radius: 0.625rem;
        }

        .dm-table {
          width: 100%;
          border-collapse: collapse;
          font-family: Inter, sans-serif;
          font-size: 0.9rem;
        }

        .dm-table__th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #6B7280;
          background: #F9FAFB;
          border-bottom: 1px solid #E6E6E6;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .dm-table__th--actions { text-align: right; }

        .dm-table__row:hover { background: #F9FAFB; }

        .dm-table__td {
          padding: 0.875rem 1rem;
          color: #080808;
          border-bottom: 1px solid #F0F0F0;
          vertical-align: middle;
        }

        .dm-table__row:last-child .dm-table__td { border-bottom: none; }

        .dm-table__td--actions {
          text-align: right;
          white-space: nowrap;
        }

        .dm-disease-thumb {
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 0.5rem;
          object-fit: cover;
          display: block;
        }

        .dm-disease-thumb--placeholder {
          background: #F3F4F6;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dm-disease-name {
          font-weight: 600;
          color: #080808;
        }

        .dm-crops-cell {
          color: #6B7280;
          font-size: 0.875rem;
          max-width: 14rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dm-type-badge {
          display: inline-block;
          padding: 0.2rem 0.6rem;
          background: #F0FBF0;
          border: 1px solid #C8E6C9;
          border-radius: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #2E7D32;
          font-family: Inter, sans-serif;
        }

        .dm-action-btn--view {
          background: #F0FBF0;
          color: #2E7D32;
          border-color: #C8E6C9;
          margin-right: 0.375rem;
        }

        .dm-action-btn--view:hover { background: #DCEDC8; }

        /* Disease Management — Sub-view shared */
        .dm-subview-header {
          margin-bottom: 1.75rem;
        }

        .dm-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          background: none;
          border: none;
          color: #6B7280;
          font-size: 0.875rem;
          font-family: Inter, sans-serif;
          cursor: pointer;
          padding: 0;
          margin-bottom: 1rem;
          transition: color 0.15s;
        }

        .dm-back-btn:hover { color: #4CAF50; }

        .dm-detail-loading { padding: 1rem 0; }

        .dm-subview-title {
          margin-bottom: 0;
        }

        .dm-view-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        /* Disease Management — View Detail */
        .dm-detail-grid {
          display: grid;
          grid-template-columns: 14rem 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
          align-items: start;
        }

        .dm-detail-photo-wrapper {
          border-radius: 0.75rem;
          overflow: hidden;
          border: 1px solid #E6E6E6;
        }

        .dm-detail-photo {
          width: 100%;
          display: block;
          object-fit: cover;
          max-height: 14rem;
        }

        .dm-detail-fields {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .dm-detail-row {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #F0F0F0;
        }

        .dm-detail-row:last-child { border-bottom: none; }

        .dm-detail-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-family: Inter, sans-serif;
        }

        .dm-detail-value {
          font-size: 0.9375rem;
          color: #080808;
          font-family: Inter, sans-serif;
          font-weight: 500;
        }

        .dm-detail-sections {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .dm-detail-section {
          background: #F9FAFB;
          border: 1px solid #E6E6E6;
          border-radius: 0.625rem;
          padding: 1.25rem;
        }

        .dm-detail-section--organic { border-left: 3px solid #4CAF50; }
        .dm-detail-section--chemical { border-left: 3px solid #F59E0B; }

        .dm-detail-section__header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.875rem;
        }

        .dm-detail-section__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .dm-detail-section__icon--desc { background: #EFF6FF; color: #3B82F6; }
        .dm-detail-section__icon--symptoms { background: #FEF3C7; color: #D97706; }
        .dm-detail-section__icon--tips { background: #EFF6FF; color: #3B82F6; }
        .dm-detail-section__icon--organic { background: #F0FBF0; color: #2E7D32; }
        .dm-detail-section__icon--chemical { background: #FFFBEB; color: #D97706; }
        .dm-detail-section__icon--prevention { background: #ECFDF5; color: #059669; }

        .dm-detail-section__title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #080808;
          margin: 0;
          font-family: Inter, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .dm-detail-section__body {
          font-size: 0.9375rem;
          color: #374151;
          margin: 0;
          font-family: Inter, sans-serif;
          line-height: 1.7;
        }

        .dm-detail-section--symptoms { border-left: 3px solid #F59E0B; }
        .dm-detail-section--tips { border-left: 3px solid #3B82F6; }
        .dm-detail-section--prevention { border-left: 3px solid #10B981; }

        .dm-detail-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .dm-detail-list__item {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          font-size: 0.9375rem;
          color: #374151;
          font-family: Inter, sans-serif;
          line-height: 1.6;
        }

        .dm-detail-list__dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 0.45rem;
        }

        .dm-detail-treatment-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        /* Disease Management — Search & Filters */
        .dm-filters {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .dm-search-wrapper {
          position: relative;
          flex: 1;
          min-width: 12rem;
        }

        .dm-search-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .dm-search-input {
          width: 100%;
          padding: 0.625rem 2.5rem 0.625rem 2.5rem;
          border: 1px solid #E6E6E6;
          border-radius: 0.625rem;
          background: #FCFCFC;
          font-size: 0.9rem;
          color: #080808;
          font-family: Inter, sans-serif;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .dm-search-input:focus { border-color: #4CAF50; }
        .dm-search-input::placeholder { color: #9CA3AF; }

        .dm-search-clear {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9CA3AF;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.15s;
        }

        .dm-search-clear:hover { color: #374151; }

        .dm-filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .dm-filter-select {
          width: 11rem;
        }

        .dm-clear-filters-btn {
          background: none;
          border: 1px solid #E6E6E6;
          border-radius: 0.5rem;
          padding: 0.5rem 0.875rem;
          font-size: 0.8125rem;
          color: #6B7280;
          font-family: Inter, sans-serif;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, color 0.15s;
        }

        .dm-clear-filters-btn:hover { background: #F3F4F6; color: #374151; }

        .dm-results-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-bottom: 0.5rem;
        }

        .dm-results-count {
          font-size: 0.8125rem;
          color: #6B7280;
          font-family: Inter, sans-serif;
        }

        /* Disease Management — Pagination */
        .dm-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0 0;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .dm-pagination__info {
          font-size: 0.875rem;
          color: #6B7280;
          font-family: Inter, sans-serif;
        }

        .dm-pagination__controls {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .dm-pagination__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 2rem;
          height: 2rem;
          padding: 0 0.375rem;
          border: 1px solid #E6E6E6;
          border-radius: 0.5rem;
          background: #FCFCFC;
          font-size: 0.875rem;
          color: #374151;
          font-family: Inter, sans-serif;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }

        .dm-pagination__btn:hover:not(:disabled) { background: #F0FBF0; border-color: #4CAF50; color: #2E7D32; }
        .dm-pagination__btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .dm-pagination__btn--active { background: #4CAF50; border-color: #4CAF50; color: #FFF; font-weight: 600; }
        .dm-pagination__btn--active:hover { background: #3d8b40; }

        .dm-pagination__ellipsis {
          min-width: 2rem;
          text-align: center;
          font-size: 0.875rem;
          color: #9CA3AF;
          font-family: Inter, sans-serif;
        }

        @media (max-width: 768px) {
          .dm-detail-grid { grid-template-columns: 1fr; }
          .dm-detail-treatment-grid { grid-template-columns: 1fr; }
          .dm-table__th, .dm-table__td { padding: 0.625rem 0.75rem; }
          .dm-filters { flex-direction: column; align-items: stretch; }
          .dm-filter-group { flex-wrap: wrap; }
          .dm-filter-select { width: 100%; }
          .dm-pagination { justify-content: center; }
        }

        /* Upload zone */
        .ss-upload-zone {
          border: 2px dashed #E6E6E6;
          border-radius: 0.625rem;
          padding: 1.75rem;
          text-align: center;
          cursor: pointer;
          background: #FCFCFC;
          transition: border-color 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .ss-upload-zone--hover { border-color: #4CAF50; }
        .ss-upload-zone:hover { border-color: #4CAF50; }

        .ss-upload-zone__img {
          max-width: 100%;
          max-height: 12rem;
          border-radius: 0.5rem;
        }

        .ss-upload-zone__text {
          font-size: 0.9375rem;
          color: #080808;
          margin: 0;
        }

        .ss-upload-zone__hint {
          font-size: 0.8125rem;
          color: #6B7280;
          margin: 0;
        }

        /* Modal */
        .ss-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .ss-modal {
          background: #FFF;
          border-radius: 0.75rem;
          padding: 2rem;
          width: 100%;
          max-width: 30rem;
          max-height: 90vh;
          overflow-y: auto;
        }

        .ss-modal--wide { max-width: 50rem; }

        .ss-modal__title {
          font-size: 1.375rem;
          font-weight: 600;
          color: #080808;
          margin: 0 0 1.5rem;
          font-family: Inter, sans-serif;
        }

        .ss-modal__body {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.75rem;
        }

        .ss-modal__actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        /* System Codes — Grouped Accordion */
        .sc-groups {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .sc-group {
          border: 1px solid #E6E6E6;
          border-radius: 0.625rem;
          overflow: hidden;
          background: #FFF;
        }

        .sc-group__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
          background: #F9FAFB;
          cursor: pointer;
          user-select: none;
          gap: 0.75rem;
          transition: background 0.15s;
        }

        .sc-group__header:hover { background: #F0FBF0; }

        .sc-group__header-left {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          flex: 1;
          min-width: 0;
        }

        .sc-group__chevron {
          color: #6B7280;
          flex-shrink: 0;
          transition: transform 0.2s;
          transform: rotate(-90deg);
        }

        .sc-group__chevron--open {
          transform: rotate(0deg);
        }

        .sc-group__type-label {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #080808;
          font-family: Inter, sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sc-group__value-count {
          font-size: 0.75rem;
          color: #6B7280;
          background: #E6E6E6;
          border-radius: 0.75rem;
          padding: 0.15rem 0.55rem;
          font-family: Inter, sans-serif;
          flex-shrink: 0;
          font-weight: 500;
        }

        .sc-group__add-value-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 500;
          font-family: Inter, sans-serif;
          cursor: pointer;
          background: #F0FBF0;
          color: #2E7D32;
          border: 1px solid #C8E6C9;
          flex-shrink: 0;
          transition: background 0.15s;
        }

        .sc-group__add-value-btn:hover { background: #DCEDC8; }

        .sc-group__body {
          border-top: 1px solid #E6E6E6;
        }

        .sc-group__empty {
          padding: 1rem 1.25rem;
          font-size: 0.875rem;
          color: #9CA3AF;
          font-family: Inter, sans-serif;
          margin: 0;
        }

        .sc-value-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid #F0F0F0;
          gap: 1rem;
        }

        .sc-value-row:last-child { border-bottom: none; }

        .sc-value-row:hover { background: #FAFAFA; }

        .sc-value-row__info {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          flex: 1;
          min-width: 0;
        }

        .sc-value-row__name {
          font-size: 0.9rem;
          font-weight: 500;
          color: #080808;
          font-family: Inter, sans-serif;
        }

        .sc-value-row__desc {
          font-size: 0.8125rem;
          color: #9CA3AF;
          font-family: Inter, sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sc-value-row__desc::before { content: '·'; margin-right: 0.4rem; }

        .sc-value-row__actions {
          display: flex;
          gap: 0.375rem;
          flex-shrink: 0;
        }

        /* Fixed type badge in modal */
        .sc-fixed-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #F0FBF0;
          border: 1px solid #C8E6C9;
          border-radius: 0.625rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #2E7D32;
          font-family: Inter, sans-serif;
        }

        /* System Codes Tab */
        .sc-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .sc-toolbar__heading {
          margin-bottom: 0;
          flex: 1;
        }

        .sc-toolbar__controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .sc-filter-select {
          width: 11rem;
        }

        .sc-intro {
          font-size: 0.875rem;
          color: #6B7280;
          margin: 0 0 1.5rem;
          font-family: Inter, sans-serif;
          line-height: 1.5;
        }

        .sc-loading {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #6B7280;
          font-size: 0.9375rem;
          font-family: Inter, sans-serif;
          padding: 2rem 0;
        }

        .sc-loading__spinner {
          animation: sc-spin 0.8s linear infinite;
        }

        @keyframes sc-spin {
          to { transform: rotate(360deg); }
        }

        .sc-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 3rem 1rem;
          text-align: center;
          color: #9CA3AF;
          font-size: 0.9375rem;
          font-family: Inter, sans-serif;
        }

        /* Table */
        .sc-table-wrapper {
          overflow-x: auto;
          border: 1px solid #E6E6E6;
          border-radius: 0.625rem;
        }

        .sc-table {
          width: 100%;
          border-collapse: collapse;
          font-family: Inter, sans-serif;
          font-size: 0.9rem;
        }

        .sc-table__th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #6B7280;
          background: #F9FAFB;
          border-bottom: 1px solid #E6E6E6;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .sc-table__th--actions { text-align: right; }

        .sc-table__row:hover { background: #F9FAFB; }

        .sc-table__td {
          padding: 0.875rem 1rem;
          color: #080808;
          border-bottom: 1px solid #F0F0F0;
          vertical-align: middle;
        }

        .sc-table__row:last-child .sc-table__td { border-bottom: none; }

        .sc-table__td--value { font-weight: 500; }

        .sc-table__td--desc {
          color: #6B7280;
          font-size: 0.875rem;
          max-width: 20rem;
        }

        .sc-table__td--actions {
          text-align: right;
          white-space: nowrap;
        }

        .sc-type-badge {
          display: inline-block;
          padding: 0.2rem 0.6rem;
          background: #F0FBF0;
          border: 1px solid #C8E6C9;
          border-radius: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #2E7D32;
          font-family: Inter, sans-serif;
        }

        .sc-no-desc {
          color: #D1D5DB;
        }

        .sc-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 500;
          font-family: Inter, sans-serif;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.2s, color 0.2s;
        }

        .sc-action-btn--edit {
          background: #EFF6FF;
          color: #1D4ED8;
          border-color: #BFDBFE;
          margin-right: 0.375rem;
        }

        .sc-action-btn--edit:hover { background: #DBEAFE; }

        .sc-action-btn--delete {
          background: #FEF2F2;
          color: #DC2626;
          border-color: #FECACA;
        }

        .sc-action-btn--delete:hover { background: #FEE2E2; }

        /* Char count */
        .sc-char-count {
          font-size: 0.75rem;
          color: #9CA3AF;
          font-family: Inter, sans-serif;
          text-align: right;
        }

        /* Delete confirm modal */
        .sc-confirm-modal {
          max-width: 24rem;
          text-align: center;
        }

        .sc-confirm-icon {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .sc-confirm-title {
          font-size: 1.25rem;
          text-align: center;
        }

        .sc-confirm-desc {
          font-size: 0.9rem;
          color: #6B7280;
          margin: 0 0 1.5rem;
          font-family: Inter, sans-serif;
          line-height: 1.5;
        }

        .ss-btn--danger {
          background: #DC2626;
          color: #FFF;
          border: none;
        }

        .ss-btn--danger:hover { background: #B91C1C; }
        .ss-btn--danger:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Responsive */
        @media (max-width: 768px) {
          .ss-page { padding: 1rem; margin: 0.25rem; }
          .ss-card { padding: 1.25rem; }
          .ss-profile-grid { grid-template-columns: 1fr; }
          .ss-field--full { grid-column: 1; }
          .ss-setting-row { flex-direction: column; align-items: flex-start; }
          .ss-tab__label { font-size: 0.8125rem; }
          .ss-tab { padding: 0.625rem 0.875rem; }
          .ss-disease-form__grid { grid-template-columns: 1fr; }
          .sc-category { flex-direction: column; }
          .sc-add-row { max-width: 100%; }
        }

        @media (max-width: 480px) {
          .ss-modal__actions { flex-direction: column; }
          .ss-btn { width: 100%; justify-content: center; }
          .ss-tabs { gap: 0; }
        }
      `}</style>
    </div>
  );
};

export default SystemSettings;
