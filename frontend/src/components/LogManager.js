import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { scriptAPI, ansibleAPI } from '../services/api';

const LogManager = ({ show, onClose, item, type = 'script' }) => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const api = type === 'ansible' ? ansibleAPI : scriptAPI;
  const itemName = type === 'ansible' ? 'Playbook' : '脚本';

  useEffect(() => {
    if (show && item) {
      fetchSessions();
    }
  }, [show, item]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.getSessions(item.id);
      setSessions(response.data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (sessionName) => {
    try {
      setLoading(true);
      const response = await api.getLogs(item.id, sessionName);
      setLogs(response.data || []);
      setSelectedSession(sessionName);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      alert('获取日志失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  return {
    sessions,
    selectedSession,
    logs,
    loading,
    fetchLogs,
    getStatusIcon,
    setSelectedSession,
    setLogs,
    itemName
  };
};

export default LogManager;