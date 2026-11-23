import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiX, FiEye, FiEyeOff, FiEdit, FiPlus, FiUser, FiMail, FiPhone, FiLock, FiShield, FiChevronLeft, FiChevronRight, FiSearch, FiCheck } from 'react-icons/fi';
import Sidebar from '../Sidebar';
import Header from '../Header';
import './UserManagement.css';

const API_BASE = import.meta.env.VITE_API_URL;

const authHeaders = {
  "Authorization": `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json"
};

const ITEMS_PER_PAGE = 10;

const isPendingApproval = (user) => user.isApproved === false;

const getUserPhone = (user) =>
  user?.phoneNumber || user?.phone_number || user?.phone || '';

const UserManagement = () => {
  const tenantId = localStorage.getItem("tenantId") || 1;

  const [selectedFilter, setSelectedFilter] = useState('All Users');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    pendingApproval: 0
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'analyst'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [customRoles, setCustomRoles] = useState([]);
  const [isAddingNewRole, setIsAddingNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const defaultRoles = [
    { value: 'super admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'analyst', label: 'Analyst' },
    { value: 'support', label: 'Support' }
  ];

  const allRoles = [...defaultRoles, ...customRoles];

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/users/?tenant_id=${tenantId}`, {
        headers: authHeaders
      });

      if (!res.ok) {
        throw new Error("Unauthorized");
      }

      const data = await res.json();
      setUsers(data);

      setUserStats({
        totalUsers: data.length,
        activeSessions: data.filter(u => u.lastActive !== null).length,
        pendingApproval: data.filter(isPendingApproval).length
      });
    } catch (err) {
      console.error("Error loading users:", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filterOptions = ['All Users', 'Pending Approval', 'Approved', 'Active Users'];

  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    setCurrentPage(1);
  };

  const getFilteredUsers = () => {
    let filtered = [...users];

    switch (selectedFilter) {
      case 'Pending Approval':
        filtered = filtered.filter(isPendingApproval);
        break;
      case 'Approved':
        filtered = filtered.filter(u => !isPendingApproval(u));
        break;
      case 'Active Users':
        filtered = filtered.filter(u => u.lastActive !== null);
        break;
      default:
        break;
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const pendingOnPage = paginatedUsers.filter(isPendingApproval);
  const allCurrentPendingSelected = pendingOnPage.length > 0 && pendingOnPage.every(u => selectedIds.has(u.id));
  const selectedPendingCount = users.filter(u => selectedIds.has(u.id) && isPendingApproval(u)).length;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const toggleSelectAll = () => {
    if (allCurrentPendingSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pendingOnPage.forEach(u => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pendingOnPage.forEach(u => next.add(u.id));
        return next;
      });
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddUser = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      role: 'analyst'
    });
    setIsAddingNewRole(false);
    setNewRoleName('');
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.name?.split(' ')[0] || '',
      lastName: user.name?.split(' ')[1] || '',
      email: user.email || '',
      phone: getUserPhone(user),
      password: '',
      role: user.role || 'analyst'
    });
    setIsAddingNewRole(false);
    setNewRoleName('');
    setShowPassword(false);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders
      });

      if (!res.ok) throw new Error('Failed to delete user');
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleApproveUser = async (user) => {
    if (!window.confirm(`Approve ${user.name}?`)) return;
    setProcessingIds(prev => new Set(prev).add(user.id));
    try {
      const res = await fetch(`${API_BASE}/users/approve/${user.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ action: 'approve' })
      });
      if (!res.ok) throw new Error('Failed to approve user');
      toast.success(`${user.name} approved successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  const handleBulkApprove = async () => {
    const pendingSelected = users.filter(u => selectedIds.has(u.id) && isPendingApproval(u));
    if (pendingSelected.length === 0) return;
    if (!window.confirm(`Approve ${pendingSelected.length} selected user${pendingSelected.length > 1 ? 's' : ''}?`)) return;

    setBulkProcessing(true);
    try {
      await Promise.all(pendingSelected.map(user =>
        fetch(`${API_BASE}/users/approve/${user.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ action: 'approve' })
        })
      ));
      toast.success(`${pendingSelected.length} user${pendingSelected.length > 1 ? 's' : ''} approved successfully`);
      setSelectedIds(new Set());
      fetchUsers();
    } catch (error) {
      console.error('Error approving users:', error);
      toast.error('Failed to approve selected users');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleAddCustomRole = () => {
    if (newRoleName.trim()) {
      const roleValue = newRoleName.toLowerCase();
      const roleLabel = newRoleName.trim();

      const roleExists = allRoles.some(r => r.value === roleValue);

      if (roleExists) {
        toast.error('This role already exists');
        return;
      }

      const newRole = { value: roleValue, label: roleLabel };
      setCustomRoles([...customRoles, newRole]);
      setFormData({ ...formData, role: roleValue });
      setIsAddingNewRole(false);
      setNewRoleName('');
      toast.success('Custom role added successfully');
    } else {
      toast.error('Please enter a role name');
    }
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone_number: formData.phone,
        password: formData.password,
        role: formData.role
      };

      const res = await fetch(`${API_BASE}/users/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(userData)
      });

      if (!res.ok) throw new Error('Failed to add user');
      setIsAddModalOpen(false);
      toast.success('User added successfully');
      setCurrentPage(1);
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone_number: formData.phone,
        role: formData.role
      };

      if (formData.password) {
        userData.password = formData.password;
      }

      const res = await fetch(`${API_BASE}/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(userData)
      });

      if (!res.ok) throw new Error('Failed to update user');
      setIsEditModalOpen(false);
      toast.success('User updated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const closeAllModals = () => {
    setIsAddModalOpen(false);
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedUser(null);
    setIsAddingNewRole(false);
    setNewRoleName('');
  };

  const getRoleBadgeClass = (role) => {
    if (!role) return "role-badge";
    switch (role.toLowerCase()) {
      case 'super admin':
      case 'admin':
        return 'role-badge super-admin';
      case 'analyst':
        return 'role-badge analyst';
      case 'support':
        return 'role-badge support';
      default:
        return 'role-badge custom-role';
    }
  };

  const renderRoleSelector = () => (
    <div className="form-group full-width">
      <label className="form-label">
        <FiShield className="label-icon" />
        Role
      </label>
      {!isAddingNewRole ? (
        <div className="role-selector-container">
          <select
            className="form-select"
            value={formData.role}
            onChange={(e) => {
              if (e.target.value === 'add-new-role') {
                setIsAddingNewRole(true);
              } else {
                setFormData({ ...formData, role: e.target.value });
              }
            }}
            required
          >
            {allRoles.map(role => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
            <option value="add-new-role">+ Add New Role</option>
          </select>
        </div>
      ) : (
        <div className="custom-role-input-container">
          <input
            type="text"
            className="form-input"
            placeholder="Enter new role name"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomRole();
              }
            }}
          />
          <div className="custom-role-actions">
            <button
              type="button"
              className="btn-custom-role-add"
              onClick={handleAddCustomRole}
            >
              Add
            </button>
            <button
              type="button"
              className="btn-custom-role-cancel"
              onClick={() => {
                setIsAddingNewRole(false);
                setNewRoleName('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content">
          <div className="user-management-header">
            <div className="title-section">
              <h1 className="page-title">User Management</h1>
              <p className="page-subtitleag">Manage user accounts, roles, and permissions</p>
            </div>
            <div className="header-actions">
              <button className="um-add-user-btn" onClick={handleAddUser}>
                <span className="um-add-user-icon"><FiPlus size={18} /></span>
                <span>Add User</span>
              </button>
            </div>
          </div>

          <div className="user-stats-grid um-stats-grid--4">
            <div className="user-stats-card">
              <div className="stats-value">{userStats.totalUsers}</div>
              <div className="stats-label">Total Users</div>
            </div>
            <div className="user-stats-card um-stats-card--pending">
              <div className="stats-value">{userStats.pendingApproval}</div>
              <div className="stats-label">Pending Approval</div>
            </div>
            <div className="user-stats-card um-stats-card--approved">
              <div className="stats-value">{userStats.totalUsers - userStats.pendingApproval}</div>
              <div className="stats-label">Approved</div>
            </div>
            <div className="user-stats-card">
              <div className="stats-value">{userStats.activeSessions}</div>
              <div className="stats-label">Active Users</div>
            </div>
          </div>

          <div className="um-status-tabs">
            {filterOptions.map((option) => {
              const count = option === 'All Users' ? userStats.totalUsers
                : option === 'Pending Approval' ? userStats.pendingApproval
                : option === 'Approved' ? userStats.totalUsers - userStats.pendingApproval
                : userStats.activeSessions;
              return (
                <button
                  key={option}
                  className={`um-status-tab ${selectedFilter === option ? 'um-status-tab--active' : ''}`}
                  onClick={() => handleFilterSelect(option)}
                >
                  {option}
                  <span className="um-tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="user-accounts-section">
            <div className="section-header">
              <h2 className="section-title">User Accounts</h2>
              <div className="section-info">
                Showing {filteredUsers.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
            </div>

            <div className="um-search-wrap">
              <FiSearch className="um-search-icon" size={16} />
              <input
                type="text"
                placeholder="Search by name or email..."
                className="um-search-input"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {selectedIds.size > 0 && (
              <div className="um-bulk-bar">
                <div className="um-bulk-left">
                  <div className="um-bulk-icon">
                    <FiCheck size={16} />
                  </div>
                  <span className="um-bulk-count">
                    {selectedIds.size} user{selectedIds.size > 1 ? 's' : ''} selected
                    {selectedPendingCount !== selectedIds.size && ` · ${selectedPendingCount} pending`}
                  </span>
                </div>
                <div className="um-bulk-actions">
                  <button
                    className="um-bulk-approve-btn"
                    onClick={handleBulkApprove}
                    disabled={bulkProcessing || selectedPendingCount === 0}
                  >
                    <FiCheck size={14} />
                    {bulkProcessing ? 'Approving…' : 'Approve Selected'}
                  </button>
                  <button className="um-bulk-clear-btn" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="um-table-wrap">
              {loading ? (
                <p className="no-users-message">Loading...</p>
              ) : paginatedUsers.length === 0 ? (
                <p className="no-users-message">No users found for the selected filter.</p>
              ) : (
                <>
                  <div className="um-table-header">
                    <div className="um-col um-col--checkbox">
                      <input
                        type="checkbox"
                        className="um-checkbox"
                        checked={allCurrentPendingSelected}
                        onChange={toggleSelectAll}
                        disabled={pendingOnPage.length === 0}
                        title="Select all pending on this page"
                      />
                    </div>
                    <div className="um-col um-col--name">Name</div>
                    <div className="um-col um-col--role">Role</div>
                    <div className="um-col um-col--created">Created</div>
                    <div className="um-col um-col--seen">Last Seen</div>
                    <div className="um-col um-col--status">Status</div>
                    <div className="um-col um-col--actions">Actions</div>
                  </div>

                  <div className="um-table-body">
                    {paginatedUsers.map((user) => {
                      const pending = isPendingApproval(user);
                      const processing = processingIds.has(user.id);
                      return (
                        <div
                          key={user.id}
                          className={`um-table-row ${selectedIds.has(user.id) ? 'um-table-row--selected' : ''}`}
                        >
                          <div className="um-cell um-cell--checkbox">
                            {pending && (
                              <input
                                type="checkbox"
                                className="um-checkbox"
                                checked={selectedIds.has(user.id)}
                                onChange={() => toggleSelectOne(user.id)}
                              />
                            )}
                          </div>
                          <div className="um-cell um-cell--name">
                            <div className="um-name-block">
                              <div className="user-avatarag">
                                <span className="user-initialsag">
                                  {user.name?.split(" ").map(w => w[0]).join("")}
                                </span>
                              </div>
                              <div className="um-name-info">
                                <p className="um-full-name">{user.name}</p>
                                <p className="um-email">{user.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="um-cell um-cell--role">
                            <span className={getRoleBadgeClass(user.role)}>{user.role}</span>
                          </div>
                          <div className="um-cell um-cell--created">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                          <div className="um-cell um-cell--seen">
                            {user.lastActive ? new Date(user.lastActive).toLocaleString() : "Inactive"}
                          </div>
                          <div className="um-cell um-cell--status">
                            <span className={`um-status-badge ${pending ? 'um-status-badge--pending' : 'um-status-badge--approved'}`}>
                              <span className="badge-dot" />
                              {pending ? 'Pending' : 'Approved'}
                            </span>
                          </div>
                          <div className="um-cell um-cell--actions">
                            {processing ? (
                              <div className="um-row-spinner" />
                            ) : (
                              <div className="um-action-btns">
                                <button className="um-action-btn um-action-btn--view" onClick={() => handleViewUser(user)}>
                                  View
                                </button>
                                <button className="um-action-btn um-action-btn--edit" onClick={() => handleEditUser(user)}>
                                  Edit
                                </button>
                                {pending && (
                                  <button className="um-action-btn um-action-btn--approve" onClick={() => handleApproveUser(user)}>
                                    Approve
                                  </button>
                                )}
                                {user.role !== 'super admin' && (
                                  <button className="um-action-btn um-action-btn--delete" onClick={() => handleDeleteUser(user.id)}>
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination-container">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft size={20} />
                  Previous
                </button>
                <div className="pagination-info">
                  <span className="page-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`page-number ${currentPage === page ? 'active' : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    ))}
                  </span>
                </div>
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <FiChevronRight size={20} />
                </button>
              </div>
            )}
          </div>

          {isAddModalOpen && (
            <div className="user-modal-overlay" onClick={closeAllModals}>
              <div className="user-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="user-modal-header">
                  <div className="modal-header-content">
                    <h2 className="user-modal-title">
                      <FiPlus className="modal-title-icon" />
                      Add New User
                    </h2>
                    <p className="user-modal-subtitle">Create a new user account</p>
                  </div>
                  <button className="user-modal-close" onClick={closeAllModals}>
                    <FiX />
                  </button>
                </div>
                <div className="user-modal-body">
                  <form onSubmit={handleSubmitAdd} className="user-form" autoComplete="off">
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">
                          <FiUser className="label-icon" />
                          First Name
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          required
                          placeholder="Enter first name"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          <FiUser className="label-icon" />
                          Last Name
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          required
                          placeholder="Enter last name"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          <FiMail className="label-icon" />
                          Email
                        </label>
                        <input
                          type="email"
                          className="form-input"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                          placeholder="Enter email address"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          <FiPhone className="label-icon" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          className="form-input"
                          name="user-phone"
                          autoComplete="off"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          required
                          placeholder="+254 700 000 000"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          <FiLock className="label-icon" />
                          Password
                        </label>
                        <div className="um-password-wrap">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-input"
                            name="user-new-password"
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                            placeholder="Enter password"
                            minLength={6}
                          />
                          <button
                            type="button"
                            className="um-password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                          </button>
                        </div>
                      </div>
                      {renderRoleSelector()}
                    </div>
                    <div className="user-modal-footer">
                      <button type="button" className="btn-cancel" onClick={closeAllModals}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        <FiPlus size={16} />
                        Add User
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {isViewModalOpen && selectedUser && (
            <div className="user-modal-overlay" onClick={closeAllModals}>
              <div className="user-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="user-modal-header">
                  <div className="modal-header-content">
                    <h2 className="user-modal-title">
                      
                      User Details
                    </h2>
                    <p className="user-modal-subtitle">View user information</p>
                  </div>
                  <button className="user-modal-close" onClick={closeAllModals}>
                    <FiX />
                  </button>
                </div>
                <div className="user-modal-body">
                  <div className="user-details-view">
                    <div className="user-profile-section">
                      <div className="profile-avatar-large">
                        <span className="user-initials-large">
                          {selectedUser.name?.split(" ").map(w => w[0]).join("")}
                        </span>
                      </div>
                      <div className="profile-info">
                        <h3 className="profile-name">{selectedUser.name}</h3>
                        <span className={getRoleBadgeClass(selectedUser.role)}>
                          {selectedUser.role}
                        </span>
                        <span className={`um-status-badge ${isPendingApproval(selectedUser) ? 'um-status-badge--pending' : 'um-status-badge--approved'}`}>
                          <span className="badge-dot" />
                          {isPendingApproval(selectedUser) ? 'Pending Approval' : 'Approved'}
                        </span>
                      </div>
                    </div>
                    <div className="user-info-grid">
                      <div className="info-item">
                        <label className="info-label">
                          <FiMail className="label-icon" />
                          Email
                        </label>
                        <div className="info-value">{selectedUser.email || 'Not provided'}</div>
                      </div>
                      <div className="info-item">
                        <label className="info-label">
                          <FiPhone className="label-icon" />
                          Phone Number
                        </label>
                        <div className="info-value">{getUserPhone(selectedUser) || 'Not provided'}</div>
                      </div>
                      <div className="info-item">
                        <label className="info-label">
                          <FiUser className="label-icon" />
                          User ID
                        </label>
                        <div className="info-value">#{selectedUser.id}</div>
                      </div>
                      <div className="info-item">
                        <label className="info-label">
                          <svg width="16" height="16" viewBox="0 0 12 12" fill="none" className="label-icon">
                            <path d="M10 1.5H9.5V0.5H8.5V1.5H3.5V0.5H2.5V1.5H2C1.45 1.5 1 1.95 1 2.5V10.5C1 11.05 1.45 11.5 2 11.5H10C10.55 11.5 11 11.05 11 10.5V2.5C11 1.95 10.55 1.5 10 1.5ZM10 10.5H2V4H10V10.5Z" fill="currentColor"/>
                          </svg>
                          Created Date
                        </label>
                        <div className="info-value">
                          {new Date(selectedUser.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="info-item">
                        <label className="info-label">
                          <svg width="16" height="16" viewBox="0 0 12 12" fill="none" className="label-icon">
                            <path d="M5.995 1C3.235 1 1 3.24 1 6C1 8.76 3.235 11 5.995 11C8.76 11 11 8.76 11 6C11 3.24 8.76 1 5.995 1ZM6 10C3.79 10 2 8.21 2 6C2 3.79 3.79 2 6 2C8.21 2 10 3.79 10 6C10 8.21 8.21 10 6 10Z" fill="currentColor"/>
                            <path d="M6.25 3.5H5.5V6.5L8.125 8.075L8.5 7.46L6.25 6.125V3.5Z" fill="currentColor"/>
                          </svg>
                          Last Activity
                        </label>
                        <div className="info-value">
                          {selectedUser.lastActive
                            ? new Date(selectedUser.lastActive).toLocaleString()
                            : 'Inactive'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="user-modal-footer">
                    <button type="button" className="btn-cancel" onClick={closeAllModals}>
                      Close
                    </button>
                    {isPendingApproval(selectedUser) && (
                      <button
                        type="button"
                        className="um-bulk-approve-btn"
                        onClick={() => {
                          setIsViewModalOpen(false);
                          handleApproveUser(selectedUser);
                        }}
                      >
                        <FiCheck size={16} />
                        Approve User
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setIsViewModalOpen(false);
                        handleEditUser(selectedUser);
                      }}
                    >
                      <FiEdit size={16} />
                      Edit User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isEditModalOpen && selectedUser && (
            <div className="user-modal-overlay" onClick={closeAllModals}>
              <div className="user-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="user-modal-header">
                  <div className="modal-header-content">
                    <h2 className="user-modal-title">
                      
                      Edit User
                    </h2>
                    <p className="user-modal-subtitle">Update user information</p>
                  </div>
                  <button className="user-modal-close" onClick={closeAllModals}>
                    <FiX />
                  </button>
                </div>
                <div className="user-modal-body">
                  <form onSubmit={handleSubmitEdit} className="user-form" autoComplete="off">
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">
                          <FiUser className="label-icon" />
                          First Name
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          required
                          placeholder="Enter first name"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          <FiUser className="label-icon" />
                          Last Name
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          required
                          placeholder="Enter last name"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          <FiMail className="label-icon" />
                          Email
                        </label>
                        <input
                          type="email"
                          className="form-input"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                          placeholder="Enter email address"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          <FiPhone className="label-icon" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          className="form-input"
                          name="user-phone"
                          autoComplete="off"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          required
                          placeholder="+254 700 000 000"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          <FiLock className="label-icon" />
                          New Password
                        </label>
                        <div className="um-password-wrap">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-input"
                            name="user-new-password"
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            placeholder="Leave blank to keep current password"
                            minLength={6}
                          />
                          <button
                            type="button"
                            className="um-password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                          </button>
                        </div>
                        <small className="form-hint">Leave blank to keep current password</small>
                      </div>
                      {renderRoleSelector()}
                    </div>
                    <div className="user-modal-footer">
                      <button type="button" className="btn-cancel" onClick={closeAllModals}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        <FiEdit size={16} />
                        Update User
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
