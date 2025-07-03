import React, { useState, useEffect } from 'react';
import { Monitor, Cpu, HardDrive, Wifi, Activity, Users } from 'lucide-react';
import { hostGroupAPI, monitoringAPI } from '../services/api';

const HostMonitoring = () => {
  const [activeTab, setActiveTab] = useState('system');
  const [hostGroups, setHostGroups] = useState([]);
  const [activeGroupTab, setActiveGroupTab] = useState(0);
  const [systemData, setSystemData] = useState({});
  const [processData, setProcessData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHostGroups();
  }, []);

  useEffect(() => {
    if (hostGroups.length > 0) {
      fetchMonitoringData();
      const interval = setInterval(fetchMonitoringData, 3000); // 每3秒更新一次
      return () => clearInterval(interval);
    }
  }, [hostGroups, activeTab, activeGroupTab]);

  // 在fetchHostGroups函数中添加本地监控选项
  const fetchHostGroups = async () => {
    try {
      const response = await hostGroupAPI.getAll();
      const groups = response.data.data || [];
      
      setHostGroups(groups);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch host groups:', error);
      setLoading(false);
    }
  };

  const fetchMonitoringData = async () => {
    if (hostGroups.length === 0) return;
    
    const currentGroup = hostGroups[activeGroupTab];
    if (!currentGroup) return;

    try {
      if (activeTab === 'system') {
        const response = await monitoringAPI.getSystemInfo(currentGroup.id);
        setSystemData(prev => ({ ...prev, [currentGroup.id]: response.data.data }));
      } else {
        const response = await monitoringAPI.getProcessInfo(currentGroup.id);
        setProcessData(prev => ({ ...prev, [currentGroup.id]: response.data.data }));
      }
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    }
  };

  const renderSystemCard = (host) => (
    <div key={host.ip} className="bg-card rounded-lg p-6 border border-gray-600 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{host.ip}</h3>
        <div className={`w-3 h-3 rounded-full ${
          host.status === 'online' ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">CPU</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gray-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${host.cpu_usage || 0}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-400">{host.cpu_usage || 0}%</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-300">内存</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${host.memory_usage || 0}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-400">{host.memory_usage || 0}%</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-300">磁盘</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${host.disk_usage || 0}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-400">{host.disk_usage || 0}%</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">网络</span>
          </div>
          <div className="text-xs text-gray-400">
            ↑ {host.network_tx || '0 KB/s'}<br/>
            ↓ {host.network_rx || '0 KB/s'}
          </div>
        </div>
      </div>
      
      {host.ports && host.ports.length > 0 && (
        <div className="mt-4">
          <span className="text-sm text-gray-300">开放端口:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {host.ports.slice(0, 5).map(port => (
              <span key={port} className="text-xs bg-background-secondary text-foreground-secondary px-2 py-1 rounded">
                {port}
              </span>
            ))}
            {host.ports.length > 5 && (
              <span className="text-xs text-gray-500">+{host.ports.length - 5}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderProcessCard = (process) => (
    <div key={process.pid} className="bg-card rounded-lg p-4 border border-gray-600 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white truncate">{process.name}</h4>
        <span className="text-xs text-gray-400">PID: {process.pid}</span>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-gray-400">CPU:</span>
          <div className="text-gray-300 font-medium">{process.cpu_usage}%</div>
        </div>
        <div>
          <span className="text-gray-400">内存:</span>
          <div className="text-green-400 font-medium">{process.memory_usage}%</div>
        </div>
        <div>
          <span className="text-gray-400">端口:</span>
          <div className="text-purple-400 font-medium">{process.port || 'N/A'}</div>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500 truncate">
        {process.command}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  const currentGroupData = activeTab === 'system' 
    ? systemData[hostGroups[activeGroupTab]?.id] || []
    : processData[hostGroups[activeGroupTab]?.id] || [];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Monitor size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">主机监控</h1>
        </div>
      </div>

      {/* 主要Tab页 */}
      <div className="space-y-6">
        {/* Tab按钮区域 */}
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('system')}
            className={`px-6 py-3 text-sm font-medium transition-colors rounded-lg ${
              activeTab === 'system'
                ? 'bg-card text-white border border-border'
                : 'text-gray-400 hover:text-white bg-transparent'
            }`}
          >
            系统概览
          </button>
          <button
            onClick={() => setActiveTab('process')}
            className={`px-6 py-3 text-sm font-medium transition-colors rounded-lg ${
              activeTab === 'process'
                ? 'bg-card text-white border border-border'
                : 'text-gray-400 hover:text-white bg-transparent'
            }`}
          >
            进程详情
          </button>
        </div>
        
        {/* 主机组Tab页 */}
        {hostGroups.length > 0 && (
          <div className="mb-6">
            <div className="border-b border-gray-800">
              <nav className="flex space-x-6">
                {hostGroups.map((group, index) => (
                  <button
                    key={group.id}
                    onClick={() => setActiveGroupTab(index)}
                    className={`py-2 px-3 border-b-2 font-medium text-sm transition-colors ${
                      activeGroupTab === index
                        ? 'border-green-500 text-green-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* 内容区域 */}
        <div className="space-y-4">
          {activeTab === 'system' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentGroupData.map(renderSystemCard)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentGroupData.map(renderProcessCard)}
            </div>
          )}
          
          {currentGroupData.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400">暂无数据</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostMonitoring;