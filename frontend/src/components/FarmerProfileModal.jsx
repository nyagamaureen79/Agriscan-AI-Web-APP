import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { apiFetch } from "../utils/apiFetch";
import { KENYA_COUNTIES, getSubCounties } from '../data/kenyaCounties';


const FarmerProfileModal = ({ isOpen, onClose, farmerId }) => {
  const toast = useToast();

  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    name: '',
    phone: '',
    location: '',
    status: '',
    farmSize: '',
    crops: [],
    personalInfo: {},
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!isOpen || !farmerId) return;
    const fetchFarmerData = async () => {
      try {
        setIsLoading(true);
        const response = await apiFetch(`${API_BASE}/farmers/${farmerId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }
        const data = await response.json();
        const normalizedData = {
          ...data,
          farmSize:
            data.farmSize !== null && data.farmSize !== undefined
              ? String(data.farmSize)
              : '',
        };
        setProfileData(normalizedData);
        setEditedData(normalizedData);
        toast.success('Farmer profile loaded successfully');
      } catch (error) {
        console.error('Error fetching farmer data:', error);
        toast.error(`Failed to load farmer profile: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFarmerData();
  }, [isOpen, farmerId, API_BASE]);

  if (!isOpen || !farmerId) return null;

  const selectedCounty = isEditing ? editedData?.personalInfo?.county : profileData?.personalInfo?.county;
  const availableSubCounties = getSubCounties(selectedCounty || '');

  const maskPhoneNumber = (phone) => {
    if (!phone) return '';
    const phoneStr = phone.toString();
    if (phoneStr.length <= 4) return phoneStr;
    return phoneStr.slice(0, 4) + 'xxx' + phoneStr.slice(7);
  };

  const maskId = (id) => {
    if (!id) return '';
    const idStr = id.toString();
    if (idStr.length <= 4) return idStr;
    return idStr.slice(0, 4) + 'xxx' + idStr.slice(7);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedData(profileData);
      setValidationErrors({});
    }
    setIsEditing(!isEditing);
  };

  const validateFarmerData = (data) => {
    const errors = {};

    if (!data.name || data.name.trim() === '') {
      errors.name = 'Name is required';
    } else if (data.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    } else if (data.name.trim().length > 100) {
      errors.name = 'Name must not exceed 100 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(data.name.trim())) {
      errors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }

    if (!data.phone || data.phone.trim() === '') {
      errors.phone = 'Phone number is required';
    } else {
      const phoneRegex = /^[\d\s+()-]{10,20}$/;
      if (!phoneRegex.test(data.phone.trim())) {
        errors.phone = 'Phone number must be 10-20 digits and can include +, -, (), spaces';
      }
    }

    if (!data.location || data.location.trim() === '') {
      errors.location = 'Location is required';
    } else if (data.location.trim().length < 2) {
      errors.location = 'Location must be at least 2 characters long';
    }

    if (data.farmSize !== null && data.farmSize !== undefined && data.farmSize !== '') {
  const farmSizeValue = String(data.farmSize).trim();

  const farmSizeRegex = /^\d+(\.\d+)?\s*(ha|acres|hectares)?$/i;

  if (!farmSizeRegex.test(farmSizeValue)) {
    errors.farmSize =
      'Farm size must be a number (optionally followed by ha, acres, or hectares)';
  }
}

    const validStatuses = ['Active', 'Inactive', 'Pending', 'Verified', 'Suspended'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.status = 'Invalid status selected';
    }

    if (data.personalInfo) {
      const validSexOptions = ['Male', 'Female', 'Other'];
      if (data.personalInfo.sex && !validSexOptions.includes(data.personalInfo.sex)) {
        errors.sex = 'Invalid sex selection';
      }

      if (data.personalInfo.dateOfBirth) {
        const dob = new Date(data.personalInfo.dateOfBirth);
        const today = new Date();
        const calculatedAge = Math.floor((today - dob) / (1000 * 60 * 60 * 24 * 365.25));
        if (isNaN(dob.getTime())) {
          errors.dateOfBirth = 'Invalid date of birth';
        } else if (dob > today) {
          errors.dateOfBirth = 'Date of birth cannot be in the future';
        } else if (calculatedAge < 18) {
          errors.dateOfBirth = 'Farmer must be at least 18 years old';
        } else if (calculatedAge > 120) {
          errors.dateOfBirth = 'Invalid date of birth - age exceeds 120 years';
        }

        const enteredAge = data.personalInfo.age !== undefined && data.personalInfo.age !== null && data.personalInfo.age !== ''
          ? parseInt(data.personalInfo.age, 10)
          : null;
        if (enteredAge !== null) {
          if (isNaN(enteredAge)) {
            errors.age = 'Age must be a valid number';
          } else if (!isNaN(dob.getTime()) && enteredAge !== calculatedAge) {
            errors.age = `Age doesn't match date of birth (expected ${calculatedAge})`;
          }
        }
      } else if (data.personalInfo.age !== undefined && data.personalInfo.age !== null && data.personalInfo.age !== '') {
        const enteredAge = parseInt(data.personalInfo.age, 10);
        if (isNaN(enteredAge) || enteredAge < 0 || enteredAge > 120) {
          errors.age = 'Enter a valid age (0–120)';
        }
      }

      if (data.personalInfo.gpsCoordinates && data.personalInfo.gpsCoordinates.trim() !== '') {
        const gpsRegex = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
        if (!gpsRegex.test(data.personalInfo.gpsCoordinates.trim())) {
          errors.gpsCoordinates = 'GPS coordinates must be in format: latitude, longitude (e.g., -1.2921, 36.8219)';
        } else {
          const [lat, lng] = data.personalInfo.gpsCoordinates.split(',').map(coord => parseFloat(coord.trim()));
          if (lat < -90 || lat > 90) {
            errors.gpsCoordinates = 'Latitude must be between -90 and 90';
          } else if (lng < -180 || lng > 180) {
            errors.gpsCoordinates = 'Longitude must be between -180 and 180';
          }
        }
      }

      if (data.personalInfo.nationalId && data.personalInfo.nationalId.trim() !== '') {
        if (data.personalInfo.nationalId.trim().length < 8) {
          errors.nationalId = 'National ID must be at least 8 characters long';
        } else if (data.personalInfo.nationalId.trim().length > 20) {
          errors.nationalId = 'National ID must not exceed 20 characters';
        }
      }

      const validIncomeBrackets = [
        'Below KES 100,000',
        'KES 100,000 - 200,000',
        'KES 200,000 - 500,000',
        'KES 500,000 - 1,000,000',
        'Above KES 1,000,000'
      ];
      if (data.personalInfo.annualIncomeBracket &&
          data.personalInfo.annualIncomeBracket.trim() !== '' &&
          !validIncomeBrackets.includes(data.personalInfo.annualIncomeBracket)) {
        errors.annualIncomeBracket = 'Invalid annual income bracket selected';
      }

      const textFields = [
        { field: 'primaryOccupation', max: 100 },
        { field: 'otherPrimaryOccupation', max: 100 },
        { field: 'secondaryOccupation', max: 100 },
        { field: 'otherSecondaryOccupation', max: 100 },
        { field: 'farmerCooperative', max: 150 },
        { field: 'leadFarmer', max: 100 }
      ];
      textFields.forEach(({ field, max }) => {
        if (data.personalInfo[field] && data.personalInfo[field].length > max) {
          errors[field] = `Must not exceed ${max} characters`;
        }
      });
    }

    return errors;
  };

  const handleSave = async () => {
    try {
      const errors = validateFarmerData(editedData);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        const firstError = Object.values(errors)[0];
        toast.error(`Validation failed: ${firstError}`);
        return;
      }

      setValidationErrors({});
      setSaveLoading(true);

      // Auto-construct display name from split fields if provided
      const firstName = editedData.personalInfo?.firstName?.trim() || '';
      const middleName = editedData.personalInfo?.middleName?.trim() || '';
      const surname = editedData.personalInfo?.surname?.trim() || '';
      const constructedName = [firstName, middleName, surname].filter(Boolean).join(' ');

      const payload = {
        name: constructedName || editedData.name?.trim(),
        phone: editedData.phone?.trim(),
        location: editedData.location?.trim(),
        status: editedData.status,
        crops: editedData.crops || [],
        farmSize:
  editedData.farmSize !== null &&
  editedData.farmSize !== undefined &&
  editedData.farmSize !== ''
    ? parseFloat(editedData.farmSize)
    : null,
        personalInfo: {
          firstName: firstName || null,
          middleName: middleName || null,
          surname: surname || null,
          sex: editedData.personalInfo?.sex || null,
          dateOfBirth: editedData.personalInfo?.dateOfBirth || null,
          nationalId: editedData.personalInfo?.nationalId?.trim() || null,
          maritalStatus: editedData.personalInfo?.maritalStatus || null,
          educationLevel: editedData.personalInfo?.educationLevel || null,
          disabilityStatus: editedData.personalInfo?.disabilityStatus || null,
          householdSize: editedData.personalInfo?.householdSize || null,
          county: editedData.personalInfo?.county?.trim() || null,
          subCounty: editedData.personalInfo?.subCounty?.trim() || null,
          gpsCoordinates: editedData.personalInfo?.gpsCoordinates?.trim() || null,
          primaryOccupation: editedData.personalInfo?.primaryOccupation?.trim() || null,
          otherPrimaryOccupation: editedData.personalInfo?.otherPrimaryOccupation?.trim() || null,
          secondaryOccupation: editedData.personalInfo?.secondaryOccupation?.trim() || null,
          otherSecondaryOccupation: editedData.personalInfo?.otherSecondaryOccupation?.trim() || null,
          annualIncomeBracket: editedData.personalInfo?.annualIncomeBracket || null,
          creditAccess: editedData.personalInfo?.creditAccess || null,
          insuranceAccess: editedData.personalInfo?.insuranceAccess || null,
          farmerCooperative: editedData.personalInfo?.farmerCooperative?.trim() || null,
          leadFarmer: editedData.personalInfo?.leadFarmer?.trim() || null,
          membersInCooperative: editedData.personalInfo?.membersInCooperative === 'True' ? true : editedData.personalInfo?.membersInCooperative === 'False' ? false : null,
          landTenure: editedData.personalInfo?.landTenure || null,
          irrigationType: editedData.personalInfo?.irrigationType || null,
          soilType: editedData.personalInfo?.soilType || null,
          waterAccessType: editedData.personalInfo?.waterAccessType || null,
          idPhoto: editedData.personalInfo?.idPhoto || null,
          farmerPhoto: editedData.personalInfo?.farmerPhoto || null,
        }
      };

      const response = await apiFetch(`${API_BASE}/farmers/${farmerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = 'Failed to update farmer profile';
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => `${err.loc?.join(' → ') || 'Field'}: ${err.msg}`).join(', ');
          } else {
            errorMessage = errorData.detail;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const updatedData = await response.json();
      setProfileData(updatedData);
      setIsEditing(false);
      toast.success('Farmer profile updated successfully');
    } catch (error) {
      console.error('Error updating farmer profile:', error);
      toast.error(`Update failed: ${error.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const calcAgeFromDob = (dob) => {
    const d = new Date(dob);
    if (isNaN(d.getTime()) || d > new Date()) return null;
    return Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24 * 365.25));
  };

  const validateAgeAgainstDob = (age, dob) => {
    if (age === '' || age === null || age === undefined) return '';
    const enteredAge = parseInt(age, 10);
    if (isNaN(enteredAge)) return 'Age must be a valid number';
    if (enteredAge < 0 || enteredAge > 120) return 'Enter a valid age (0–120)';
    if (dob) {
      const calculated = calcAgeFromDob(dob);
      if (calculated !== null && enteredAge !== calculated) {
        return `Age doesn't match date of birth (expected ${calculated})`;
      }
    }
    return '';
  };

  const handleInputChange = (section, field, value) => {
    if (section === 'personalInfo') {
      setEditedData(prev => {
        const updated = {
          ...prev,
          personalInfo: { ...prev.personalInfo, [field]: value }
        };
        if (field === 'dateOfBirth' && value) {
          const calculated = calcAgeFromDob(value);
          if (calculated !== null) updated.personalInfo.age = calculated;
        }
        return updated;
      });

      // Immediate age error feedback
      if (field === 'age') {
        const currentDob = editedData?.personalInfo?.dateOfBirth;
        const ageError = validateAgeAgainstDob(value, currentDob);
        setValidationErrors(prev => ({ ...prev, age: ageError }));
      } else if (field === 'dateOfBirth') {
        // Re-evaluate age error when DOB changes
        const currentAge = editedData?.personalInfo?.age;
        if (currentAge !== '' && currentAge !== null && currentAge !== undefined) {
          const calculated = calcAgeFromDob(value);
          const ageError = calculated !== null && parseInt(currentAge, 10) !== calculated
            ? `Age doesn't match date of birth (expected ${calculated})`
            : '';
          setValidationErrors(prev => ({ ...prev, age: ageError }));
        } else {
          setValidationErrors(prev => ({ ...prev, age: '' }));
        }
      } else if (validationErrors[field]) {
        setValidationErrors(prev => ({ ...prev, [field]: '' }));
      }
    } else {
      setEditedData(prev => ({ ...prev, [field]: value }));
      if (validationErrors[field]) {
        setValidationErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatMaskedDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      const formatted = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
      return formatted.replace(/\d{4}/, '****');
    } catch {
      return dateString;
    }
  };

  const renderField = (label, section, field, type = 'text', options = null, placeholder = '') => {
    const value = section === 'personalInfo'
      ? currentData.personalInfo?.[field]
      : currentData[field];
    const error = validationErrors[field];

    return (
      <div className="field-item">
        <span className="field-label">{label}</span>
        {isEditing ? (
          options ? (
            <select
              value={value || ''}
              onChange={(e) => handleInputChange(section, field, e.target.value)}
              className={`field-input ${error ? 'field-input-error' : ''}`}
            >
              <option value="">Select {label}</option>
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={value || ''}
              onChange={(e) => handleInputChange(section, field, e.target.value)}
              className={`field-input ${error ? 'field-input-error' : ''}`}
              placeholder={placeholder || label}
            />
          )
        ) : (
          <span className="field-value">
            {field === 'dateOfBirth' ? formatMaskedDate(value) :
             type === 'date' ? formatDisplayDate(value) :
             field === 'nationalId' ? (value ? maskId(value) : 'Not provided') :
             field === 'phone' ? (value ? maskPhoneNumber(value) : 'Not specified') :
             value || 'Not specified'}
          </span>
        )}
        {error && <span className="field-error">{error}</span>}
      </div>
    );
  };

  const renderPhotoField = (label, field) => {
    const value = currentData.personalInfo?.[field];
    return (
      <div className="field-item">
        <span className="field-label">{label}</span>
        <div className="photo-upload-box">
          {value ? (
            <img src={value} alt={label} className="uploaded-photo" />
          ) : (
            <div className="photo-empty-state">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="#9CA3AF"/>
              </svg>
              <span className="photo-empty-text">No photo uploaded</span>
              {isEditing && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => handleInputChange('personalInfo', field, e.target.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="photo-file-input"
                />
              )}
            </div>
          )}
          {isEditing && value && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => handleInputChange('personalInfo', field, e.target.result);
                  reader.readAsDataURL(file);
                }
              }}
              className="photo-file-input photo-replace-input"
            />
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="farmer-modal-overlay" onClick={onClose}>
        <div className="farmer-modal-container" onClick={(e) => e.stopPropagation()} />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="farmer-modal-overlay" onClick={onClose}>
        <div className="farmer-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="error-container">
            <p>Failed to load farmer profile</p>
            <button className="modal-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const currentData = isEditing ? editedData : profileData;

  return (
    <div className="farmer-modal-overlay" onClick={onClose}>
      <div className="farmer-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="farmer-modal-content">

          {/* ── Profile Header ── */}
          <div className="farmer-profile-section">
            <div className={`profile-status-badge status-${currentData.status?.toLowerCase() || 'active'}`}>
              <span className="status-text">{currentData.status || 'Active'}</span>
            </div>

            <div className="profile-edit-controls">
              {isEditing ? (
                <div className="edit-actions">
                  <button className="save-btn" onClick={handleSave} disabled={saveLoading}>
                    {saveLoading ? (
                      <><div className="spinner-small"></div>Saving...</>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M17 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3ZM12 19C10.34 19 9 17.66 9 16C9 14.34 10.34 13 12 13C13.66 13 15 14.34 15 16C15 17.66 13.66 19 12 19ZM15 9H5V5H15V9Z" fill="white"/>
                        </svg>
                        Save
                      </>
                    )}
                  </button>
                  <button className="cancel-btn" onClick={handleEditToggle} disabled={saveLoading}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#DC2626"/>
                    </svg>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="edit-btn" onClick={handleEditToggle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="#4CAF50"/>
                  </svg>
                  Edit
                </button>
              )}
            </div>

            <div className="profile-avatar">
              {currentData.avatar ? (
                <img src={currentData.avatar} alt="Profile" className="avatar-image" />
              ) : (
                <div className="avatar-circle">
                  {currentData.name ? currentData.name.charAt(0).toUpperCase() : 'F'}
                </div>
              )}
            </div>

            <div className="profile-info">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={currentData.name || ''}
                    onChange={(e) => handleInputChange(null, 'name', e.target.value)}
                    className="profile-name-input"
                    placeholder="Full Name"
                  />
                  <input
                    type="text"
                    value={currentData.phone || ''}
                    onChange={(e) => handleInputChange(null, 'phone', e.target.value)}
                    className="profile-phone-input"
                    placeholder="Phone Number"
                  />
                  <div className="profile-location">
                    <svg className="location-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M7.99992 1.33337C5.41992 1.33337 3.33325 3.42004 3.33325 6.00004C3.33325 9.50004 7.99992 14.6667 7.99992 14.6667C7.99992 14.6667 12.6666 9.50004 12.6666 6.00004C12.6666 3.42004 10.5799 1.33337 7.99992 1.33337ZM4.66659 6.00004C4.66659 4.16004 6.15992 2.66671 7.99992 2.66671C9.83992 2.66671 11.3333 4.16004 11.3333 6.00004C11.3333 7.92004 9.41325 10.7934 7.99992 12.5867C6.61325 10.8067 4.66659 7.90004 4.66659 6.00004Z" fill="#65758B"/>
                      <path d="M7.99992 7.66671C8.92039 7.66671 9.66658 6.92052 9.66658 6.00004C9.66658 5.07957 8.92039 4.33337 7.99992 4.33337C7.07944 4.33337 6.33325 5.07957 6.33325 6.00004C6.33325 6.92052 7.07944 7.66671 7.99992 7.66671Z" fill="#65758B"/>
                    </svg>
                    <input
                      type="text"
                      value={currentData.location || ''}
                      onChange={(e) => handleInputChange(null, 'location', e.target.value)}
                      className="profile-location-input"
                      placeholder="Location"
                    />
                  </div>
                  <div className="profile-lead-farmer">
                    <svg className="lead-farmer-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" fill="#4CAF50"/>
                      <path d="M8 9.33337C5.33333 9.33337 2 10.6667 2 13.3334V14H14V13.3334C14 10.6667 10.6667 9.33337 8 9.33337Z" fill="#4CAF50"/>
                    </svg>
                    <input
                      type="text"
                      value={currentData.personalInfo?.leadFarmer || ''}
                      onChange={(e) => handleInputChange('personalInfo', 'leadFarmer', e.target.value)}
                      className="profile-lead-farmer-input"
                      placeholder="Lead Farmer"
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="profile-name">{currentData.name || 'No Name Provided'}</h2>
                  <div className="profile-phone">{maskPhoneNumber(currentData.phone) || 'No Phone'}</div>
                  <div className="profile-location">
                    <svg className="location-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M7.99992 1.33337C5.41992 1.33337 3.33325 3.42004 3.33325 6.00004C3.33325 9.50004 7.99992 14.6667 7.99992 14.6667C7.99992 14.6667 12.6666 9.50004 12.6666 6.00004C12.6666 3.42004 10.5799 1.33337 7.99992 1.33337ZM4.66659 6.00004C4.66659 4.16004 6.15992 2.66671 7.99992 2.66671C9.83992 2.66671 11.3333 4.16004 11.3333 6.00004C11.3333 7.92004 9.41325 10.7934 7.99992 12.5867C6.61325 10.8067 4.66659 7.90004 4.66659 6.00004Z" fill="#65758B"/>
                      <path d="M7.99992 7.66671C8.92039 7.66671 9.66658 6.92052 9.66658 6.00004C9.66658 5.07957 8.92039 4.33337 7.99992 4.33337C7.07944 4.33337 6.33325 5.07957 6.33325 6.00004C6.33325 6.92052 7.07944 7.66671 7.99992 7.66671Z" fill="#65758B"/>
                    </svg>
                    <span>{currentData.location || 'No Location'}</span>
                  </div>
                  <div className="profile-lead-farmer">
                    <svg className="lead-farmer-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" fill="#4CAF50"/>
                      <path d="M8 9.33337C5.33333 9.33337 2 10.6667 2 13.3334V14H14V13.3334C14 10.6667 10.6667 9.33337 8 9.33337Z" fill="#4CAF50"/>
                    </svg>
                    <span>Lead Farmer: {currentData.personalInfo?.leadFarmer || 'Not assigned'}</span>
                  </div>
                </>
              )}
            </div>

            <div className="profile-crops">
              {(currentData.crops || []).map((crop, index) => (
                <span key={index} className="crop-tag">{crop}</span>
              ))}
              {(!currentData.crops || currentData.crops.length === 0) && (
                <span className="crop-tag no-crops">No crops specified</span>
              )}
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="farmer-stats-grid">
            <div className="farmer-stat-card">
              <div className="stat-label">Joined</div>
              <div className="stat-valueag">{formatDisplayDate(currentData.joinedDate)}</div>
            </div>
            <div className="farmer-stat-card">
              <div className="stat-label">Farm Size</div>
              <div className="stat-valueag">{currentData.farmSize || 'Not specified'}</div>
            </div>
            <div className="farmer-stat-card">
              <div className="stat-label">Last Visit</div>
              <div className="stat-valueag">{formatDisplayDate(currentData.lastVisit)}</div>
            </div>
           <div className="farmer-stat-card">
              <div className="stat-label">Activities</div>
              <div className="stat-valueag">{currentData.activities || '20'}</div>
            </div> 
          </div>

          {/* ══════════════════════════════════════════
              Section 1 – Personal Information
          ══════════════════════════════════════════ */}
          <div className="profile-detail-section">
            <h3 className="section-title">Personal Information</h3>

            <div className="fields-grid fields-grid-3">
              {renderField('First Name', 'personalInfo', 'firstName')}
              {renderField('Middle Name', 'personalInfo', 'middleName')}
              {renderField('Surname', 'personalInfo', 'surname')}
            </div>

            <div className="fields-grid fields-grid-3">
              {renderField('Sex', 'personalInfo', 'sex', 'text', ['Male', 'Female', 'Other'])}
              {renderField('Date of Birth', 'personalInfo', 'dateOfBirth', 'date')}
              {renderField('National ID', 'personalInfo', 'nationalId')}
            </div>

            <div className="fields-grid fields-grid-3">
              {renderField('Phone Number', null, 'phone')}
              {renderField('Marital Status', 'personalInfo', 'maritalStatus', 'text', [
                'Single', 'Married', 'Divorced', 'Widowed', 'Separated'
              ])}
              {renderField('Education Level', 'personalInfo', 'educationLevel', 'text', [
                'No Formal Education', 'Primary', 'Secondary', 'Certificate / Diploma', "Bachelor's", 'Postgraduate'
              ])}
            </div>

            <div className="fields-grid fields-grid-3">
              {renderField('Disability Status', 'personalInfo', 'disabilityStatus', 'text', [
                'None', 'Physical', 'Visual', 'Hearing', 'Intellectual', 'Other'
              ])}
              {renderField('Household Size', 'personalInfo', 'householdSize', 'number')}
              <div className="field-item">
                <span className="field-label">Age</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={currentData.personalInfo?.age !== undefined && currentData.personalInfo?.age !== null ? currentData.personalInfo.age : ''}
                    onChange={(e) => handleInputChange('personalInfo', 'age', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className={`field-input ${validationErrors.age ? 'field-input-error' : ''}`}
                    placeholder="Enter age"
                    min="0"
                    max="120"
                  />
                ) : (
                  <span className="field-value">
                    {currentData.personalInfo?.dateOfBirth
                      ? calcAgeFromDob(currentData.personalInfo.dateOfBirth) ?? currentData.personalInfo?.age ?? 'Not specified'
                      : currentData.personalInfo?.age ?? 'Not specified'}
                  </span>
                )}
                {validationErrors.age && <span className="field-error">{validationErrors.age}</span>}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              Section 2 – Location
          ══════════════════════════════════════════ */}
          <div className="profile-detail-section">
            <h3 className="section-title">Location</h3>

            <div className="fields-grid fields-grid-2">
              <div className="field-item">
                <span className="field-label">County</span>
                {isEditing ? (
                  <select
                    value={editedData?.personalInfo?.county || ''}
                    onChange={(e) => {
                      handleInputChange('personalInfo', 'county', e.target.value);
                      handleInputChange('personalInfo', 'subCounty', '');
                    }}
                    className={`field-input ${validationErrors.county ? 'field-input-error' : ''}`}
                  >
                    <option value="">Select County</option>
                    {KENYA_COUNTIES.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="field-value">{currentData.personalInfo?.county || 'Not specified'}</span>
                )}
                {validationErrors.county && <span className="field-error">{validationErrors.county}</span>}
              </div>
              <div className="field-item">
                <span className="field-label">Sub County</span>
                {isEditing ? (
                  <select
                    value={editedData?.personalInfo?.subCounty || ''}
                    onChange={(e) => handleInputChange('personalInfo', 'subCounty', e.target.value)}
                    disabled={!editedData?.personalInfo?.county}
                    className={`field-input ${validationErrors.subCounty ? 'field-input-error' : ''}`}
                  >
                    <option value="">Select Sub County</option>
                    {availableSubCounties.map((sc) => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                ) : (
                  <span className="field-value">{currentData.personalInfo?.subCounty || 'Not specified'}</span>
                )}
                {validationErrors.subCounty && <span className="field-error">{validationErrors.subCounty}</span>}
              </div>
            </div>

            <div className="fields-grid fields-grid-2">
              {renderField('Location', null, 'location')}
              {renderField('GPS Coordinates', 'personalInfo', 'gpsCoordinates', 'text', null, 'e.g. -1.2921, 36.8219')}
            </div>
          </div>

          {/* ══════════════════════════════════════════
              Section 3 – Livelihood & Income
          ══════════════════════════════════════════ */}
          <div className="profile-detail-section">
            <h3 className="section-title">Livelihood &amp; Income</h3>

            <div className="fields-grid fields-grid-2">
              {renderField('Primary Occupation', 'personalInfo', 'primaryOccupation')}
              {renderField('Other Primary Occupation', 'personalInfo', 'otherPrimaryOccupation')}
            </div>

            <div className="fields-grid fields-grid-2">
              {renderField('Secondary Occupation', 'personalInfo', 'secondaryOccupation')}
              {renderField('Other Secondary Occupation', 'personalInfo', 'otherSecondaryOccupation')}
            </div>

            <div className="fields-grid fields-grid-2">
              {renderField('Annual Income Bracket', 'personalInfo', 'annualIncomeBracket', 'text', [
                'Below KES 100,000',
                'KES 100,000 - 200,000',
                'KES 200,000 - 500,000',
                'KES 500,000 - 1,000,000',
                'Above KES 1,000,000'
              ])}
              {renderField('Credit Access', 'personalInfo', 'creditAccess', 'text', ['Yes', 'No'])}
            </div>

            <div className="fields-grid fields-grid-2">
              {renderField('Insurance Access', 'personalInfo', 'insuranceAccess', 'text', ['Yes', 'No'])}
              {renderField('Farmer Cooperative', 'personalInfo', 'farmerCooperative')}
            </div>

            <div className="fields-grid fields-grid-2">
              {renderField('Members in Cooperative', 'personalInfo', 'membersInCooperative', 'text', ['True', 'False'])}
              <div className="field-item">
                <span className="field-label">Crops Grown</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={(currentData.crops || []).join(', ')}
                    onChange={(e) => handleInputChange(null, 'crops', e.target.value.split(',').map(c => c.trim()).filter(Boolean))}
                    className="field-input"
                    placeholder="e.g. Maize, Beans, Wheat"
                  />
                ) : (
                  <span className="field-value">
                    {(currentData.crops || []).length > 0 ? currentData.crops.join(', ') : 'Not specified'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              Section 4 – Farm Information
          ══════════════════════════════════════════ */}
          <div className="profile-detail-section">
            <h3 className="section-title">Farm Information</h3>

            <div className="fields-grid fields-grid-2">
              <div className="field-item">
                <span className="field-label">Farm Size</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentData.farmSize ?? ''}
                    onChange={(e) => handleInputChange(null, 'farmSize', e.target.value)}
                    className={`field-input ${validationErrors.farmSize ? 'field-input-error' : ''}`}
                    placeholder="e.g. 2.5 ha"
                  />
                ) : (
                  <span className="field-value">{currentData.farmSize || 'Not specified'}</span>
                )}
                {validationErrors.farmSize && <span className="field-error">{validationErrors.farmSize}</span>}
              </div>
              {renderField('Land Tenure', 'personalInfo', 'landTenure', 'text', [
                'Owned', 'Leased', 'Communal', 'Rented'
              ])}
            </div>

            <div className="fields-grid fields-grid-2">
              {renderField('Irrigation Type', 'personalInfo', 'irrigationType', 'text', [
                'Rain-fed', 'Drip', 'Sprinkler', 'Flood', 'None'
              ])}
              {renderField('Soil Type', 'personalInfo', 'soilType', 'text', [
                'Clay', 'Sandy', 'Loam', 'Silt', 'Peat', 'Chalk'
              ])}
            </div>

            <div className="fields-grid fields-grid-1">
              {renderField('Water Access Type', 'personalInfo', 'waterAccessType', 'text', [
                'River', 'Borehole', 'Rainwater', 'Well', 'Irrigation Canal', 'None'
              ])}
            </div>
          </div>

          {/* ══════════════════════════════════════════
              Section 5 – Documents
          ══════════════════════════════════════════ */}
          <div className="profile-detail-section">
            <h3 className="section-title">Documents</h3>
            <div className="fields-grid fields-grid-2">
              {renderPhotoField('ID Photo', 'idPhoto')}
              {renderPhotoField('Farmer Photo', 'farmerPhoto')}
            </div>
          </div>

          {/* ── Features Used ── }
          <div className="features-section">
            <h3 className="section-title">Features Used</h3>
            <div className="features-grid">
              {(currentData.featuresUsed || []).map((feature, index) => (
                <div key={index} className={`feature-card ${feature.active ? 'feature-active' : 'feature-inactive'}`}>
                  <div className="feature-name">{feature.name}</div>
                  <div className={`feature-status ${feature.active ? 'status-active' : 'status-inactive'}`}>
                    {feature.status}
                  </div>
                </div>
              ))}
              {(!currentData.featuresUsed || currentData.featuresUsed.length === 0) && (
                <div className="no-features">No features data available</div>
              )}
            </div>
          </div>

          {/* ── Recent Activity ── }
          <div className="activity-section">
            <h3 className="section-title">Recent Activity</h3>
            <div className="activity-list">
              {(currentData.recentActivity || []).map((activity, index) => (
                <div key={index} className="activity-item-modal">
                  <div className="activity-details">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-description">{activity.description}</div>
                    <div className="activity-time">{activity.time}</div>
                  </div>
                  <button className="activity-view-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="#4CAF50"/>
                    </svg>
                  </button>
                </div>
              ))}
              {(!currentData.recentActivity || currentData.recentActivity.length === 0) && (
                <div className="no-activity">No recent activity</div>
              )}
            </div>
          </div>

          {/* ── Close ── */}
          <div className="modal-close-section">
            <button className="modal-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerProfileModal;
