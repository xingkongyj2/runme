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