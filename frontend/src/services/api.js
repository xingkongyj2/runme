import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理401错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证API
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getCurrentUser: () => api.get('/user'),
  register: (userData) => api.post('/auth/register', userData),
};

// 主机组API
export const hostGroupAPI = {
  getAll: () => api.get('/hostgroups'),
  create: (data) => api.post('/hostgroups', data),
  update: (id, data) => api.put(`/hostgroups/${id}`, data),
  delete: (id) => api.delete(`/hostgroups/${id}`),
};

// 脚本API
export const scriptAPI = {
  getAll: () => api.get('/scripts'),
  create: (data) => api.post('/scripts', data),
  update: (id, data) => api.put(`/scripts/${id}`, data),
  delete: (id) => api.delete(`/scripts/${id}`),
  execute: (id) => api.post(`/scripts/${id}/execute`),
  executeExperimental: (id) => api.post(`/scripts/${id}/execute-experimental`),
  continueExecution: (id, data) => api.post(`/scripts/${id}/continue-execution`, data),
  getSessions: (id) => api.get(`/scripts/${id}/sessions`),
  getLogs: (id, sessionName) => api.get(`/scripts/${id}/logs?session_name=${encodeURIComponent(sessionName)}`)
};

export const ansibleAPI = {
  getAll: () => api.get('/ansible'),
  create: (data) => api.post('/ansible', data),
  update: (id, data) => api.put(`/ansible/${id}`, data),
  delete: (id) => api.delete(`/ansible/${id}`),
  execute: (id) => api.post(`/ansible/${id}/execute`),
  executeExperimental: (id) => api.post(`/ansible/${id}/execute-experimental`),
  continueExecution: (id, data) => api.post(`/ansible/${id}/continue-execution`, data),
  getSessions: (id) => api.get(`/ansible/${id}/sessions`),
  getLogs: (id, sessionName) => api.get(`/ansible/${id}/logs?session_name=${encodeURIComponent(sessionName)}`)
};

// 主机API
export const hostAPI = {
  // 获取指定主机组的所有主机
  getByGroupId: (groupId) => api.get(`/hostgroups/${groupId}/hosts`),
  
  // 根据ID获取主机
  getById: (id) => api.get(`/hosts/${id}`),
  
  // 创建主机
  create: (hostData) => api.post('/hosts', hostData),
  
  // 更新主机
  update: (id, hostData) => api.put(`/hosts/${id}`, hostData),
  
  // 删除主机
  delete: (id) => api.delete(`/hosts/${id}`)
};

// 监控API
export const monitoringAPI = {
  getSystemInfo: (groupId) => api.get(`/monitoring/system/${groupId}`),
  getProcessInfo: (groupId) => api.get(`/monitoring/processes/${groupId}`),
};

// AI建议API
export const aiAPI = {
  generateScriptSuggestion: (requirement, type) => 
    api.post('/ai/script-suggestion', { requirement, type })
};

export const deploymentAPI = {
  getAll: () => api.get('/deployment'),
  create: (data) => api.post('/deployment', data),
  execute: (id) => api.post(`/deployment/${id}/execute`),
  delete: (id) => api.delete(`/deployment/${id}`),
  getLogs: (id) => api.get(`/deployment/${id}/logs`)
};

// 证书管理API
export const certificateAPI = {
  getAll: () => api.get('/certificates'),
  getById: (id) => api.get(`/certificates/${id}`),
  create: (data) => api.post('/certificates', data),
  update: (id, data) => api.put(`/certificates/${id}`, data),
  delete: (id) => api.delete(`/certificates/${id}`),
  renew: (id) => api.post(`/certificates/${id}/renew`),
  deploy: (id) => api.post(`/certificates/${id}/deploy`),
  download: (id) => api.get(`/certificates/${id}/download`, { responseType: 'blob' }),
  getLogs: (id) => api.get(`/certificates/${id}/logs`)
};

export default api;