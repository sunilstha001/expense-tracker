const rawBase = import.meta.env.VITE_BASE_URL || "http://localhost:4000/api";

const trimmedBase = rawBase.replace(/\/+$/, "");

// Ensure every API call uses a consistent `/api` base.
export const API_BASE = trimmedBase.endsWith("/api")
  ? trimmedBase
  : `${trimmedBase}/api`;
