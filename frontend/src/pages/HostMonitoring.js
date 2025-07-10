import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Monitor, Cpu, Activity, HardDrive, Wifi } from 'lucide-react';
import { monitoringAPI, hostGroupAPI } from '../services/api';

const HostMonitoring = () => {
  const [hostGroups, setHostGroups] = useState([]);
  const [activeGroupTab, setActiveGroupTab] = useState(0);
  const [systemData, setSystemData] = useState({});
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState({}); // 跟踪每个分组的数据加载状态
  const [initialDataLoaded, setInitialDataLoaded] = useState(false); // 跟踪初始数据是否已加载


  // 获取主机分组
  const fetchHostGroups = useCallback(async () => {
    try {
      const response = await hostGroupAPI.getAll();
      // 修改：response.data.data 才是真正的数组
      const groups = response.data.data || [];
      
      setHostGroups(groups);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch host groups:', error);
      setHostGroups([]);
      setLoading(false);
    }
  }, []);

  // 获取所有分组的监控数据 - 使用批量接口
  const fetchAllGroupsMonitoringData = useCallback(async (isBackgroundUpdate = false) => {
    if (hostGroups.length === 0) return;

    // 如果不是后台更新，设置加载状态
    if (!isBackgroundUpdate) {
      const loadingState = {};
      hostGroups.forEach(group => {
        loadingState[group.id] = true;
      });
      setDataLoading(loadingState);
    }

    const groupIds = hostGroups.map(group => group.id);
    
    try {
      const response = await monitoringAPI.getBatchSystemInfo(groupIds);
      setSystemData(response.data.data);
      
      // 清除加载状态并设置初始数据已加载
      if (!isBackgroundUpdate) {
        setDataLoading({});
        setInitialDataLoaded(true);
      }
    } catch (error) {
      console.error('Failed to fetch batch monitoring data:', error);
      // 如果批量接口失败，回退到单个接口
      await fetchAllGroupsMonitoringDataFallback(isBackgroundUpdate);
    }
  }, [hostGroups]);

  // 回退方案：单独获取每个分组的数据
  const fetchAllGroupsMonitoringDataFallback = useCallback(async (isBackgroundUpdate = false) => {
    const promises = hostGroups.map(async (group) => {
      if (!isBackgroundUpdate) {
        setDataLoading(prev => ({ ...prev, [group.id]: true }));
      }
      
      try {
        const response = await monitoringAPI.getSystemInfo(group.id);
        setSystemData(prev => ({ ...prev, [group.id]: response.data.data }));
      } catch (error) {
        console.error(`Failed to fetch monitoring data for group ${group.name}:`, error);
        // 设置空数据以避免无限加载
        setSystemData(prev => ({ ...prev, [group.id]: [] }));
      } finally {
        if (!isBackgroundUpdate) {
          setDataLoading(prev => ({ ...prev, [group.id]: false }));
        }
      }
    });

    await Promise.allSettled(promises);
    if (!isBackgroundUpdate) {
      setInitialDataLoaded(true);
    }
  }, [hostGroups]);

  useEffect(() => {
    fetchHostGroups();
  }, [fetchHostGroups]);

  useEffect(() => {
    if (hostGroups.length > 0) {
      // 初始加载所有分组的监控数据
      fetchAllGroupsMonitoringData();
      
      // 设置定时器，每3秒更新所有分组的数据
      const interval = setInterval(() => {
        fetchAllGroupsMonitoringData(true); // 传入true表示是后台静默更新
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [hostGroups, fetchAllGroupsMonitoringData]);

  const renderSystemCard = (host) => (
    <div key={host.ip} className="bg-card rounded-lg p-3 border border-gray-600 shadow-sm h-64">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white truncate">{host.ip}</h3>
        <div className={`w-2 h-2 rounded-full ${
          host.status === 'online' ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
      </div>
      
      {/* CPU和内存一行 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-300">CPU</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-gray-500 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${host.cpu_usage || 0}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-400">{host.cpu_usage || 0}%</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-green-400" />
            <span className="text-xs text-gray-300">内存</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${host.memory_usage || 0}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-400">{host.memory_usage || 0}%</span>
        </div>
      </div>
      
      {/* 磁盘和网络一行 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-gray-300">磁盘</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-yellow-500 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${host.disk_usage || 0}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-400">{host.disk_usage || 0}%</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-gray-300">网络</span>
          </div>
          <div className="text-xs text-gray-400 leading-tight">
            ↑ {host.network_tx || '0 KB/s'}<br/>
            ↓ {host.network_rx || '0 KB/s'}
          </div>
        </div>
      </div>
      
      {/* 端口单独一行 */}
      {host.ports && host.ports.length > 0 && (
        <div>
          <span className="text-xs text-gray-300 mb-2 block">端口:</span>
          <div 
            className="overflow-x-auto"
            style={{
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              WebkitScrollbar: { display: 'none' }
            }}
          >
            <div className="flex gap-1 min-w-max pl-0">
              {host.ports.map(port => (
                <span key={port} className="text-xs bg-background-secondary text-foreground-secondary px-2 py-1 rounded whitespace-nowrap">
                  {port}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );


  // 简约加载动画组件
  const SimpleLoader = ({ className = '' }) => {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {/* 简约圆点波浪动画 */}
        <div className="flex space-x-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ 
                backgroundColor: '#27272a',
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.4s'
              }}
            ></div>
          ))}
        </div>
      </div>
    );
  };

  // 简单的圆形加载动画（保留作为备用）
  const LoadingSpinner = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12'
    };
    
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <div className="relative w-full h-full">
          <div className="absolute inset-0 border-2 border-gray-600 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-transparent border-t-green-400 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  };




  // 使用 useMemo 优化性能
  const hasAnyGroupLoading = useMemo(() => 
    Object.values(dataLoading).some(loading => loading),
    [dataLoading]
  );

  const hasAnyDataInCurrentTab = useMemo(() => {
    const currentData = systemData;
    return Object.keys(currentData).some(groupId => 
      currentData[groupId] && currentData[groupId].length > 0
    );
  }, [systemData]);

  const currentGroup = hostGroups[activeGroupTab];
  const currentGroupData = systemData[currentGroup?.id] || [];

  const isCurrentGroupLoading = currentGroup && dataLoading[currentGroup.id];
  
  // 改进的显示逻辑
  const shouldShowLoading = hasAnyGroupLoading && !initialDataLoaded;
  const shouldShowNoData = currentGroupData.length === 0 && !shouldShowLoading && initialDataLoaded;
  
  if (loading) {
    return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Monitor size={24} className="text-primary" />
            <h1 className="text-2xl font-bold text-foreground">主机监控</h1>
          </div>
        </div>

        {/* 加载状态 */}
        <div className="flex flex-col items-center justify-center py-20">
          <SimpleLoader className="py-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Monitor size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">主机监控</h1>
        </div>
      </div>

      <div className="space-y-6">
        
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
          {/* 根据优化后的逻辑显示内容 */}
          {shouldShowLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <SimpleLoader className="py-4" />
            </div>
          ) : (
            /* 正常数据显示 */
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {currentGroupData.map(renderSystemCard)}
              </div>
              
              {shouldShowNoData && (
                <div className="text-center py-12">
                  <div className="space-y-3">
                    <div className="text-gray-400">暂无数据</div>
                    <div className="text-sm text-gray-500">
                      该主机组当前没有可用的系统监控数据
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostMonitoring;