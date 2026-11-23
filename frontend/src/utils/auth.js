// src/utils/auth.js

// Session timeout duration (30 minutes in milliseconds)
export const SESSION_TIMEOUT = 30 * 60 * 1000;

// Save user token or data after login
export const login = (token, userData) => {
  localStorage.setItem("authToken", token);
  localStorage.setItem("userData", JSON.stringify(userData));
  localStorage.setItem("loginTime", Date.now().toString());
};

// Get auth token
export const getToken = () => {
  return localStorage.getItem("authToken");
};

// Get logged in user info
export const getUser = () => {
  const data = localStorage.getItem("userData");
  return data ? JSON.parse(data) : null;
};

// Check if user is logged in
export const isAuthenticated = () => {
  return !!getToken();
};

// Logout function (clear all auth data)
export const logout = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("loginTime");
};

// Check if session has expired
export const isSessionExpired = () => {
  const loginTime = localStorage.getItem("loginTime");
  if (!loginTime) return true;

  const currentTime = Date.now();
  const elapsedTime = currentTime - parseInt(loginTime, 10);

  return elapsedTime > SESSION_TIMEOUT;
};

// Update last activity time
export const updateActivity = () => {
  if (isAuthenticated()) {
    localStorage.setItem("loginTime", Date.now().toString());
  }
};
