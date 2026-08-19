import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload || typeof payload.exp !== 'number') {
      return true;
    }
    // Expire 10 seconds early to avoid race conditions
    return payload.exp * 1000 < Date.now() + 10000;
  } catch (error) {
    return true;
  }
};

// Request interceptor to attach Bearer token and refresh if expired
api.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('token');
    
    // Do not run proactive refresh on the refresh endpoint itself
    if (token && config.url !== '/auth/refresh' && !config.url.endsWith('/auth/refresh')) {
      if (isTokenExpired(token)) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });
            if (res.status === 200 || res.status === 201) {
              const { token: newToken, refreshToken: newRefreshToken } = res.data;
              localStorage.setItem('token', newToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              token = newToken;
            }
          } catch (refreshError) {
            console.error('Session expired. Redirecting to login...', refreshError);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/';
            return Promise.reject(refreshError);
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/';
          return Promise.reject(new Error('Session expired. No refresh token available.'));
        }
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const selectedBranch = localStorage.getItem('selected_branch');
    if (selectedBranch) {
      config.headers['x-selected-branch'] = selectedBranch;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop if refresh token request fails
    if (originalRequest.url === '/auth/refresh') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          if (res.status === 200 || res.status === 201) {
            const { token, refreshToken: newRefreshToken } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('Session expired. Redirecting to login...', refreshError);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
