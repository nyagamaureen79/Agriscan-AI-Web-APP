// apiFetchArray.js
import { apiFetch } from "./apiFetch";

export const apiFetchArray = async (url, options = {}) => {
  try {
    const res = await apiFetch(url, options);

    // Handle HTTP errors
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API Error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    // Parse JSON safely
    const data = await res.json().catch(() => null);

    // Ensure we always return an array
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("apiFetchArray error:", err);
    return [];
  }
};