import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  getSessions: (id) => api.get(`/scripts/${id}/sessions`),
  getLogs: (scriptId, sessionName) => {
    const encodedSessionName = encodeURIComponent(sessionName);
    return api.get(`/scripts/${scriptId}/logs?session_name=${encodedSessionName}`);
  },
};

// Ansible API
export const ansibleAPI = {
  getAll: () => api.get('/ansible'),
  create: (data) => api.post('/ansible', data),
  update: (id, data) => api.put(`/ansible/${id}`, data),
  delete: (id) => api.delete(`/ansible/${id}`),
  execute: (id) => api.post(`/ansible/${id}/execute`),
  getSessions: (id) => api.get(`/ansible/${id}/sessions`),
  getLogs: (playbookId, sessionName) => {
    const encodedSessionName = encodeURIComponent(sessionName);
    return api.get(`/ansible/${playbookId}/logs?session_name=${encodedSessionName}`);
  },
};

export default api;