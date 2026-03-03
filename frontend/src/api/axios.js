import axios from "axios";

// Use environment variable with fallback for local development
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

/* ======================================================
   SIMPLE IN-MEMORY CACHE FOR API RESPONSES
====================================================== */

// Cache storage: { [cacheKey]: { data, timestamp } }
const cache = new Map();
const DEFAULT_CACHE_TTL = 30 * 1000; // 30 seconds

// Cacheable GET endpoints (short TTL for frequently changing data)
const CACHE_CONFIG = {
  "/students/dashboard": 60 * 1000, // 1 minute
  "/reviews/advisor/me": 30 * 1000, // 30 seconds
  "/reviews/reviewer/me": 30 * 1000, // 30 seconds
  "/admin/dashboard-counts": 60 * 1000, // 1 minute
  "/notifications": 10 * 1000, // 10 seconds
  "/availability/me": 30 * 1000, // 30 seconds
};

// Generate cache key from URL and params
const getCacheKey = (url, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `${url}?${sortedParams}`;
};

// Check if response is cached and valid
const getCachedResponse = (cacheKey, ttl) => {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  return null;
};

// Store response in cache
const setCachedResponse = (cacheKey, data) => {
  cache.set(cacheKey, { data, timestamp: Date.now() });
};

// Clear specific cache or all cache
export const clearCache = (url = null) => {
  if (url) {
    // Clear all cache entries starting with this URL
    for (const key of cache.keys()) {
      if (key.startsWith(url)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
};

// Clear cache on mutations (POST, PUT, PATCH, DELETE)
const clearRelatedCache = (url) => {
  // Clear cache for related endpoints after mutations
  const clearPatterns = {
    "/tasks": ["/students/dashboard", "/tasks"],
    "/reviews": ["/reviews", "/students/dashboard", "/admin/dashboard"],
    "/students": ["/students"],
    "/availability": ["/availability"],
    "/notifications": ["/notifications"],
  };

  for (const [pattern, endpoints] of Object.entries(clearPatterns)) {
    if (url.includes(pattern)) {
      endpoints.forEach((ep) => clearCache(ep));
      break;
    }
  }
};

/* ======================================================
   AXIOS INTERCEPTORS
====================================================== */

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Check cache for GET requests
    if (config.method === "get") {
      const ttl = CACHE_CONFIG[config.url] || 0;
      if (ttl > 0) {
        const cacheKey = getCacheKey(config.url, config.params);
        const cachedData = getCachedResponse(cacheKey, ttl);
        if (cachedData) {
          // Return cached response by rejecting with special flag
          return Promise.reject({
            __CACHED__: true,
            data: cachedData,
            config,
          });
        }
        // Store cache key in config for later
        config.__cacheKey = cacheKey;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === "get" && response.config.__cacheKey) {
      setCachedResponse(response.config.__cacheKey, response.data);
    }

    // Clear cache on mutations
    if (["post", "put", "patch", "delete"].includes(response.config.method)) {
      clearRelatedCache(response.config.url);
    }

    return response;
  },
  (error) => {
    // Handle cached responses
    if (error.__CACHED__) {
      return { data: error.data, config: error.config, cached: true };
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
