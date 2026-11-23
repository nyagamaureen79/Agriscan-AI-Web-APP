import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import './CreateFarmerModal.css';
import { apiFetch } from '../utils/apiFetch';
import { KENYA_COUNTIES, getSubCounties } from '../data/kenyaCounties';

const INITIAL_FORM = {
 firstName: "",
    middleName: "",
    surname: "",
    sex: "",
    dateOfBirth: "",
    nationalId: "",
    maritalStatus: "",
    educationLevel: "",
    disabilityStatus: "",
    age: "",
    householdSize: "",
    county: "",
    subCounty: "",
    gpsCoordinates: "",
    primaryOccupation: "",
    otherPrimaryOccupation: "",
    secondaryOccupation: "",
    otherSecondaryOccupation: "",
    annualIncomeBracket: "",
    creditAccess: "",
    insuranceAccess: "",
    farmerCooperative: "",
    membersInCooperative: false,
    landTenure: "",
    irrigationType: "",
    soilType: "",
    waterAccessType: "",
    phone: "",
    location: "",
    status: "Active",
    farmSize: "",
    crops: "",
};

const SECTIONS = ['Basic Info', 'Personal', 'Location', 'Livelihood', 'Farm'];


const CreateFarmerModal = ({ isOpen, onClose, onFarmerCreated }) => {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const availableSubCounties = getSubCounties(form.county);

  if (!isOpen) return null;

  const calcAgeFromDob = (dob) => {
    const d = new Date(dob);
    if (isNaN(d.getTime()) || d > new Date()) return null;
    return Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24 * 365.25));
  };

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'dateOfBirth' && value) {
        const calculated = calcAgeFromDob(value);
        if (calculated !== null) updated.age = String(calculated);
      }
      return updated;
    });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if (field === 'dateOfBirth' || field === 'age') {
      setErrors(prev => ({ ...prev, age: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.surname.trim()) errs.surname = 'Surname is required';
    if (!form.phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (!/^[\d\s+()-]{10,20}$/.test(form.phone.trim())) {
      errs.phone = 'Enter a valid phone number (10-20 digits)';
    }
    if (!form.location.trim()) errs.location = 'Location is required';
    if (form.farmSize && !/^\d+(\.\d+)?\s*(ha|acres|hectares)?$/i.test(form.farmSize.trim())) {
      errs.farmSize = 'Farm size must be a number (e.g. 2.5 ha)';
    }
    if (form.dateOfBirth) {
      const dob = new Date(form.dateOfBirth);
      const calculatedAge = calcAgeFromDob(form.dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) errs.dateOfBirth = 'Invalid date of birth';
      else if (calculatedAge !== null && calculatedAge < 18) errs.dateOfBirth = 'Farmer must be at least 18 years old';

      if (form.age !== '' && form.age !== undefined) {
        const enteredAge = parseInt(form.age, 10);
        if (isNaN(enteredAge)) {
          errs.age = 'Age must be a valid number';
        } else if (calculatedAge !== null && enteredAge !== calculatedAge) {
          errs.age = `Age doesn't match date of birth (expected ${calculatedAge})`;
        }
      }
    } else if (form.age !== '' && form.age !== undefined) {
      const enteredAge = parseInt(form.age, 10);
      if (isNaN(enteredAge) || enteredAge < 0 || enteredAge > 120) {
        errs.age = 'Enter a valid age (0–120)';
      }
    }
    if (!form.county) errs.county = 'County is required';
    if (!form.subCounty) errs.subCounty = 'Sub county is required';
    if (form.gpsCoordinates && !/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(form.gpsCoordinates.trim())) {
      errs.gpsCoordinates = 'Format: latitude, longitude (e.g. -1.2921, 36.8219)';
    }
    return errs;
  };


  const handleSubmit = async () => {
  const errs = validate();
  if (Object.keys(errs).length > 0) {
    setErrors(errs);
    toast.error('Please fix the highlighted errors');
    const basicFields = ['firstName', 'surname', 'phone', 'location', 'farmSize'];
    const personalFields = ['dateOfBirth'];
    const locationFields = ['county', 'subCounty', 'gpsCoordinates'];
    if (basicFields.some(f => errs[f])) setActiveSection(0);
    else if (personalFields.some(f => errs[f])) setActiveSection(1);
    else if (locationFields.some(f => errs[f])) setActiveSection(2);
    return;
  }

  setSaving(true);
  try {
    // Combine full name if needed
    const fullName = [form.firstName, form.middleName, form.surname].filter(Boolean).join(' ');

    // Build payload exactly as backend expects
     const payload = {
  name: `${form.firstName.trim()} ${form.middleName.trim()} ${form.surname.trim()}`,
  username: `${form.firstName.trim().toLowerCase()}${form.surname.trim().toLowerCase()}${Math.floor(Math.random()*1000)}`,
  phone: form.phone.trim(),
  location: form.location.trim(),
  status: form.status,
  farmSize: form.farmSize ? parseFloat(form.farmSize) : null,
  crops: form.crops
    ? form.crops.split(",").map(c => c.trim()).filter(c => c)
    : [],
  personalInfo: {
    firstName: form.firstName.trim(),
    middleName: form.middleName.trim() || null,
    surname: form.surname.trim(),
    sex: form.sex || null,
    dateOfBirth: form.dateOfBirth || null,
    nationalId: form.nationalId.trim() || null,
    maritalStatus: form.maritalStatus || null,
    educationLevel: form.educationLevel || null,
    disabilityStatus: form.disabilityStatus || null,
    householdSize: form.householdSize ? parseInt(form.householdSize) : null,
    county: form.county || null,
    subCounty: form.subCounty || null,
    gpsCoordinates: form.gpsCoordinates || null,
    primaryOccupation: form.primaryOccupation || null,
    otherPrimaryOccupation: form.otherPrimaryOccupation || null,
    secondaryOccupation: form.secondaryOccupation || null,
    otherSecondaryOccupation: form.otherSecondaryOccupation || null,
    annualIncomeBracket: form.annualIncomeBracket || null,
    creditAccess: form.creditAccess || null,
    insuranceAccess: form.insuranceAccess || null,
    farmerCooperative: form.farmerCooperative || null,
    membersInCooperative: form.membersInCooperative === 'True' ? true : form.membersInCooperative === 'False' ? false : null,
    landTenure: form.landTenure || null,
    irrigationType: form.irrigationType || null,
    soilType: form.soilType || null,
    waterAccessType: form.waterAccessType || null,
  },
};
    const res = await apiFetch(`${import.meta.env.VITE_API_URL}/farmers/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      let msg = 'Failed to create farmer';
      if (errorData.detail) {
        msg = Array.isArray(errorData.detail)
          ? errorData.detail.map(e => e.msg).join(', ')
          : errorData.detail;
      } else if (errorData.message) {
        msg = errorData.message;
      }
      throw new Error(msg);
    }

    const created = await res.json();
    toast.success('Farmer created successfully!');
    setForm(INITIAL_FORM);
    setErrors({});
    setActiveSection(0);
    onFarmerCreated?.(created);
    onClose();
  } catch (err) {
    console.error('Error creating farmer:', err);
    toast.error(`Failed to create farmer: ${err.message}`);
  } finally {
    setSaving(false);
  }
};

  const handleClose = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setActiveSection(0);
    onClose();
  };

  const field = (label, key, type = 'text', options = null, placeholder = '') => {
    const hasError = !!errors[key];
    return (
      <div className="cf-field">
        <label className="cf-label">{label}{['firstName', 'surname', 'phone', 'location'].includes(key) && <span className="cf-required">*</span>}</label>
        {options ? (
          <select
            value={form[key]}
            onChange={e => handleChange(key, e.target.value)}
            className={`cf-input${hasError ? ' cf-input--error' : ''}`}
          >
            <option value="">Select {label}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={form[key]}
            onChange={e => handleChange(key, e.target.value)}
            placeholder={placeholder || label}
            className={`cf-input${hasError ? ' cf-input--error' : ''}`}
          />
        )}
        {hasError && <span className="cf-error">{errors[key]}</span>}
      </div>
    );
  };

  const sectionContent = [
    // 0 – Basic Info
    <div key="basic" className="cf-section-body">
      <div className="cf-grid cf-grid-3">
        {field('First Name', 'firstName')}
        {field('Middle Name', 'middleName')}
        {field('Surname', 'surname')}
      </div>
      <div className="cf-grid cf-grid-3">
        {field('Phone Number', 'phone', 'tel', null, '+254 7XX XXX XXX')}
        {field('Location', 'location', 'text', null, 'e.g. Nairobi')}
        {field('Status', 'status', 'text', ['Active', 'Inactive'])}
      </div>
      <div className="cf-grid cf-grid-2">
        {field('Farm Size', 'farmSize', 'text', null, 'e.g. 2.5 ha')}
        {field('Crops Grown', 'crops', 'text', null, 'e.g. Maize, Beans, Wheat')}
      </div>
    </div>,

    // 1 – Personal
    <div key="personal" className="cf-section-body">
      <div className="cf-grid cf-grid-3">
        {field('Sex', 'sex', 'text', ['Male', 'Female'])}
        {field('Date of Birth', 'dateOfBirth', 'date')}
        {field('National ID', 'nationalId', 'text', null, 'ID Number')}
      </div>
      <div className="cf-grid cf-grid-3">
        {field('Marital Status', 'maritalStatus', 'text', ['Single', 'Married', 'Divorced', 'Widowed'])}
        {field('Education Level', 'educationLevel', 'text', [
          'No Formal Education', 'Primary', 'Secondary', 'Tertiary'
        ])}
        {field('Disability Status', 'disabilityStatus', 'text', ['None', 'Physical', 'Visual', 'Hearing', 'Other'])}
      </div>
      <div className="cf-grid cf-grid-2">
        {field('Household Size', 'householdSize', 'number', null, 'Number of people')}
        <div className="cf-field">
          <label className="cf-label">Age</label>
          <input
            type="number"
            value={form.age}
            onChange={e => handleChange('age', e.target.value)}
            placeholder="Enter age"
            min="0"
            max="120"
            className={`cf-input${errors.age ? ' cf-input--error' : ''}`}
          />
          {errors.age && <span className="cf-error">{errors.age}</span>}
        </div>
      </div>
    </div>,

    // 2 – Location
   <div key="location" className="cf-section-body">
  <div className="cf-grid cf-grid-2">

    {/* County Dropdown */}
    <div className="cf-field">
      <label className="cf-label">County<span className="cf-required">*</span></label>
      <select
        value={form.county || ''}
        onChange={(e) => {
          handleChange('county', e.target.value);
          handleChange('subCounty', '');
        }}
        className={`cf-input${errors.county ? ' cf-input--error' : ''}`}
      >
        <option value="">Select County</option>
        {KENYA_COUNTIES.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
      {errors.county && <span className="cf-error">{errors.county}</span>}
    </div>

    {/* Sub County Dropdown */}
    <div className="cf-field">
      <label className="cf-label">Sub County<span className="cf-required">*</span></label>
      <select
        value={form.subCounty || ''}
        onChange={(e) => handleChange('subCounty', e.target.value)}
        disabled={!form.county}
        className={`cf-input${errors.subCounty ? ' cf-input--error' : ''}`}
      >
        <option value="">Select Sub County</option>
        {availableSubCounties.map((sc) => (
          <option key={sc} value={sc}>{sc}</option>
        ))}
      </select>
      {errors.subCounty && <span className="cf-error">{errors.subCounty}</span>}
    </div>

  </div>

  <div className="cf-grid cf-grid-1">
    {field('GPS Coordinates', 'gpsCoordinates', 'text', null, 'e.g. -1.2921, 36.8219')}
  </div>
</div>,
    // 3 – Livelihood
    <div key="livelihood" className="cf-section-body">
      <div className="cf-grid cf-grid-2">
        {field('Primary Occupation', 'primaryOccupation', 'text', null, 'e.g. Farmer')}
        {field('Other Primary Occupation', 'otherPrimaryOccupation', 'text', null, 'If applicable')}
      </div>
      <div className="cf-grid cf-grid-2">
        {field('Secondary Occupation', 'secondaryOccupation', 'text', null, 'e.g. Trader')}
        {field('Other Secondary Occupation', 'otherSecondaryOccupation', 'text', null, 'If applicable')}
      </div>
      <div className="cf-grid cf-grid-2">
        {field('Annual Income Bracket', 'annualIncomeBracket', 'text', [
          'Ksh.100 - Ksh.10,000', 'Ksh.10,001 - Ksh.50,000', ' Ksh.50,001 and above'
        ])}
        {field('Credit Access', 'creditAccess', 'text', ['Yes', 'No'])}
      </div>
      <div className="cf-grid cf-grid-2">
        {field('Insurance Access', 'insuranceAccess', 'text', ['Yes', 'No'])}
        {field('Farmer Cooperative', 'farmerCooperative', 'text', null, 'Cooperative name')}
      </div>
      <div className="cf-grid cf-grid-2">
        {field('Members in Cooperative', 'membersInCooperative', 'text', ['True', 'False'])}
        <div className="cf-field" />
      </div>
    </div>,

    // 4 – Farm
    <div key="farm" className="cf-section-body">
      <div className="cf-grid cf-grid-2">
        {field('Land Tenure', 'landTenure', 'text', ['Owned', 'Leased', 'Communal'])}
        {field('Irrigation Type', 'irrigationType', 'text', ['Drip', 'Sprinkler', 'None'])}
      </div>
      <div className="cf-grid cf-grid-2">
        {field('Soil Type', 'soilType', 'text', ['Clay', 'Sandy', 'Loamy'])}
        {field('Water Access Type', 'waterAccessType', 'text', ['River', 'Borehole', 'Well'])}
      </div>
    </div>,
  ];

  const sectionIcons = [
    // Basic Info
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/></svg>,
    // Personal
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/></svg>,
    // Location
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM7 9C7 6.24 9.24 4 12 4C14.76 4 17 6.24 17 9C17 11.88 14.12 16.19 12 18.88C9.92 16.21 7 11.86 7 9ZM12 11.5C13.38 11.5 14.5 10.38 14.5 9C14.5 7.62 13.38 6.5 12 6.5C10.62 6.5 9.5 7.62 9.5 9C9.5 10.38 10.62 11.5 12 11.5Z" fill="currentColor"/></svg>,
    // Livelihood
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" fill="currentColor"/></svg>,
    // Farm
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3L2 12H5V20H19V12H22L12 3ZM12 18H10V14H14V18H12ZM17 18H16V13H8V18H7V11.19L12 6.69L17 11.19V18Z" fill="currentColor"/></svg>,
  ];

  return (
    <div className="cf-overlay" onClick={handleClose}>
      <div className="cf-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="cf-header">
          <div className="cf-header-text">
            <div className="cf-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C12.79 4 11 5.79 11 8C11 10.21 12.79 12 15 12ZM6 10V7H4V10H1V12H4V15H6V12H9V10H6ZM15 14C12.33 14 7 15.34 7 18V20H23V18C23 15.34 17.67 14 15 14Z" fill="white"/>
              </svg>
            </div>
            <div>
              <h2 className="cf-title">Add New Farmer</h2>
              <p className="cf-subtitle">Fill in the details to register a new farmer</p>
            </div>
          </div>
          <button className="cf-close-btn" onClick={handleClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        {/* Section Tabs */}
        <div className="cf-tabs">
          {SECTIONS.map((sec, i) => (
            <button
              key={sec}
              className={`cf-tab${activeSection === i ? ' cf-tab--active' : ''}`}
              onClick={() => setActiveSection(i)}
            >
              <span className="cf-tab-icon">{sectionIcons[i]}</span>
              <span className="cf-tab-label">{sec}</span>
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="cf-body">
          <div className="cf-section-header">
            <div className="cf-section-icon">{sectionIcons[activeSection]}</div>
            <div>
              <h3 className="cf-section-title">
                {['Basic Information', 'Personal Information', 'Location Details', 'Livelihood & Income', 'Farm Information'][activeSection]}
              </h3>
              <p className="cf-section-desc">
                {[
                  'Core farmer details — name, contact, and farm overview',
                  'Demographics and identity information',
                  'Geographic and GPS location details',
                  'Occupation, income, and financial access',
                  'Land, soil, irrigation, and water resources',
                ][activeSection]}
              </p>
            </div>
          </div>

          {sectionContent[activeSection]}
        </div>

        {/* Footer */}
        <div className="cf-footer">
          <div className="cf-step-indicator">
            {SECTIONS.map((_, i) => (
              <button
                key={i}
                className={`cf-step-dot${activeSection === i ? ' cf-step-dot--active' : ''}`}
                onClick={() => setActiveSection(i)}
                aria-label={`Go to section ${i + 1}`}
              />
            ))}
          </div>
          <div className="cf-footer-actions">
            {activeSection > 0 && (
              <button
                className="cf-btn cf-btn--secondary"
                onClick={() => setActiveSection(p => p - 1)}
                disabled={saving}
              >
                Back
              </button>
            )}
            {activeSection < SECTIONS.length - 1 ? (
              <button
                className="cf-btn cf-btn--primary"
                onClick={() => setActiveSection(p => p + 1)}
              >
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor"/>
                </svg>
              </button>
            ) : (
              <button
                className="cf-btn cf-btn--submit"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <><div className="cf-spinner" />Creating...</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                    </svg>
                    Create Farmer
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFarmerModal;
