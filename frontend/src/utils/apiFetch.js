// apiFetch.js

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

export const apiFetch = async (url, options = {}) => {
  // Get the current access token from localStorage
  const token = localStorage.getItem("token");

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  // Check for new tokens in headers and update localStorage
  const newAccessToken = res.headers.get("x-access-token");
  const newRefreshToken = res.headers.get("x-refresh-token");

  if (newAccessToken) localStorage.setItem("token", newAccessToken);
  if (newRefreshToken) localStorage.setItem("refresh_token", newRefreshToken);

  // Notify the app of an unauthorised response so the session modal appears,
  // then throw so calling components don't try to process an invalid response.
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('session:expired', { detail: { reason: '401' } }));
    throw new SessionExpiredError();
  }

  return res;
};
