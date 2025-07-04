import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Monitor, Cpu, Activity, HardDrive, Wifi } from 'lucide-react';
import { monitoringAPI, hostGroupAPI } from '../services/api';

const HostMonitoring = () => {
  const [activeTab, setActiveTab] = useState('system');
  const [hostGroups, setHostGroups] = useState([]);
  const [activeGroupTab, setActiveGroupTab] = useState(0);
  const [systemData, setSystemData] = useState({});
  const [processData, setProcessData] = useState({});
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState({}); // 跟踪每个分组的数据加载状态
  const [initialDataLoaded, setInitialDataLoaded] = useState(false); // 跟踪初始数据是否已加载

  // 添加计算骨架屏数量的hook
  const useSkeletonCount = () => {
    const [skeletonCount, setSkeletonCount] = useState({ system: 10, process: 8 });

    useEffect(() => {
      const calculateSkeletonCount = () => {
        const screenWidth = window.innerWidth;
        let systemCols, processCols;
        
        // 根据屏幕宽度计算列数（与CSS grid保持一致）
        if (screenWidth >= 1024) { // lg
          systemCols = 5;
          processCols = 4;
        } else if (screenWidth >= 768) { // md
          systemCols = 3;
          processCols = 2;
        } else { // sm
          systemCols = 1;
          processCols = 1;
        }
        
        // 固定显示2行，避免复杂的高度计算
        const visibleRows = 2;
        
        setSkeletonCount({
          system: systemCols * visibleRows,
          process: processCols * visibleRows
        });
      };

      calculateSkeletonCount();
      
      const handleResize = () => {
        calculateSkeletonCount();
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [activeTab]);

    return skeletonCount;
  };

  const skeletonCount = useSkeletonCount();

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

    // 只有在没有任何数据时才设置加载状态
    const currentData = activeTab === 'system' ? systemData : processData;
    const hasAnyData = Object.keys(currentData).some(groupId => 
      currentData[groupId] && currentData[groupId].length > 0
    );
    
    if (!hasAnyData && !isBackgroundUpdate) {
      const loadingState = {};
      hostGroups.forEach(group => {
        loadingState[group.id] = true;
      });
      setDataLoading(loadingState);
    }

    const groupIds = hostGroups.map(group => group.id);
    
    try {
      if (activeTab === 'system') {
        const response = await monitoringAPI.getBatchSystemInfo(groupIds);
        setSystemData(response.data.data);
      } else {
        const response = await monitoringAPI.getBatchProcessInfo(groupIds);
        setProcessData(response.data.data);
      }
      
      // 只有在没有数据时才需要清除加载状态
      if (!hasAnyData && !isBackgroundUpdate) {
        setTimeout(() => {
          setDataLoading({});
          setInitialDataLoaded(true);
        }, 100); // 增加延迟确保数据完全渲染
      } else {
        // 确保初始状态已设置
        if (!initialDataLoaded) {
          setInitialDataLoaded(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch batch monitoring data:', error);
      // 如果批量接口失败，回退到单个接口
      await fetchAllGroupsMonitoringDataFallback(isBackgroundUpdate);
    }
  }, [hostGroups, activeTab, systemData, processData, initialDataLoaded]);

  // 回退方案：单独获取每个分组的数据
  const fetchAllGroupsMonitoringDataFallback = useCallback(async (isBackgroundUpdate = false) => {
    // 检查是否有任何数据
    const currentData = activeTab === 'system' ? systemData : processData;
    const hasAnyData = Object.keys(currentData).some(groupId => 
      currentData[groupId] && currentData[groupId].length > 0
    );
    
    const promises = hostGroups.map(async (group) => {
      // 只有在没有任何数据时才设置加载状态
      if (!hasAnyData && !isBackgroundUpdate) {
        setDataLoading(prev => ({ ...prev, [group.id]: true }));
      }
      
      try {
        if (activeTab === 'system') {
          const response = await monitoringAPI.getSystemInfo(group.id);
          setSystemData(prev => ({ ...prev, [group.id]: response.data.data }));
        } else {
          const response = await monitoringAPI.getProcessInfo(group.id);
          setProcessData(prev => ({ ...prev, [group.id]: response.data.data }));
        }
      } catch (error) {
        console.error(`Failed to fetch monitoring data for group ${group.name}:`, error);
        // 设置空数据以避免无限加载
        if (activeTab === 'system') {
          setSystemData(prev => ({ ...prev, [group.id]: [] }));
        } else {
          setProcessData(prev => ({ ...prev, [group.id]: [] }));
        }
      } finally {
        // 只有在没有数据时才清除加载状态
        if (!hasAnyData && !isBackgroundUpdate) {
          setDataLoading(prev => ({ ...prev, [group.id]: false }));
        }
      }
    });

    await Promise.allSettled(promises);
    setInitialDataLoaded(true);
  }, [hostGroups, activeTab, systemData, processData]);

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
  }, [hostGroups, activeTab, fetchAllGroupsMonitoringData]);

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

  const renderProcessCard = (process) => (
    <div key={process.pid} className="bg-card rounded-lg p-4 border border-gray-600 shadow-sm h-32">
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

  // 加载动画组件
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

  // 脉冲加载动画组件
  const PulseLoader = ({ className = '' }) => (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
    </div>
  );

  // 骨架屏加载组件 - 更新为与实际卡片一致的布局
  const SkeletonCard = () => (
    <div className="bg-card rounded-lg p-3 border border-gray-600 shadow-sm animate-pulse h-64">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-700 rounded w-20"></div>
        <div className="w-2 h-2 bg-gray-700 rounded-full"></div>
      </div>
      
      {/* CPU和内存一行 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {[1, 2].map(i => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-700 rounded"></div>
              <div className="h-3 bg-gray-700 rounded w-8"></div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5"></div>
            <div className="h-3 bg-gray-700 rounded w-6"></div>
          </div>
        ))}
      </div>
      
      {/* 磁盘和网络一行 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {[1, 2].map(i => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-700 rounded"></div>
              <div className="h-3 bg-gray-700 rounded w-8"></div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5"></div>
            <div className="h-3 bg-gray-700 rounded w-6"></div>
          </div>
        ))}
      </div>
      
      {/* 端口区域 */}
      <div>
        <div className="h-3 bg-gray-700 rounded w-8 mb-1"></div>
        <div className="flex gap-1">
          <div className="h-6 bg-gray-700 rounded w-8"></div>
          <div className="h-6 bg-gray-700 rounded w-8"></div>
          <div className="h-6 bg-gray-700 rounded w-8"></div>
        </div>
      </div>
    </div>
  );

  // 进程卡片骨架屏组件
  const ProcessSkeletonCard = () => (
    <div className="bg-card rounded-lg p-4 border border-gray-600 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-700 rounded w-24"></div>
        <div className="h-3 bg-gray-700 rounded w-16"></div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-xs mb-2">
        <div className="space-y-1">
          <div className="h-3 bg-gray-700 rounded w-8"></div>
          <div className="h-4 bg-gray-700 rounded w-12"></div>
        </div>
        <div className="space-y-1">
          <div className="h-3 bg-gray-700 rounded w-8"></div>
          <div className="h-4 bg-gray-700 rounded w-12"></div>
        </div>
        <div className="space-y-1">
          <div className="h-3 bg-gray-700 rounded w-8"></div>
          <div className="h-4 bg-gray-700 rounded w-12"></div>
        </div>
      </div>
      
      <div className="h-3 bg-gray-700 rounded w-full"></div>
    </div>
  );

  // 使用 useMemo 优化性能
  const hasAnyGroupLoading = useMemo(() => 
    Object.values(dataLoading).some(loading => loading),
    [dataLoading]
  );

  const hasAnyDataInCurrentTab = useMemo(() => {
    const currentData = activeTab === 'system' ? systemData : processData;
    return Object.keys(currentData).some(groupId => 
      currentData[groupId] && currentData[groupId].length > 0
    );
  }, [activeTab, systemData, processData]);

  const currentGroup = hostGroups[activeGroupTab];
  const currentGroupData = activeTab === 'system' 
    ? systemData[currentGroup?.id] || []
    : processData[currentGroup?.id] || [];

  const isCurrentGroupLoading = currentGroup && dataLoading[currentGroup.id];
  
  // 改进的显示逻辑
  const shouldShowSkeleton = (!hasAnyDataInCurrentTab && hasAnyGroupLoading) || isCurrentGroupLoading;
  const shouldShowNoData = currentGroupData.length === 0 && !shouldShowSkeleton && initialDataLoaded;
  
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
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <LoadingSpinner size="xl" />
          <div className="text-center space-y-2">
            <div className="text-lg text-white font-medium">正在加载主机分组</div>
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <span>请稍候</span>
              <PulseLoader />
            </div>
          </div>
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
          {/* 根据优化后的逻辑显示内容 */}
          {shouldShowSkeleton ? (
            <div className="space-y-6">
              {/* 根据当前标签显示不同的骨架屏 */}
              {activeTab === 'system' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Array.from({ length: skeletonCount.system }).map((_, index) => (
                    <SkeletonCard key={index} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: skeletonCount.process }).map((_, index) => (
                    <ProcessSkeletonCard key={index} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* 正常数据显示 */
            <>
              {activeTab === 'system' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {currentGroupData.map(renderSystemCard)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {currentGroupData.map(renderProcessCard)}
                </div>
              )}
              
              {shouldShowNoData && (
                <div className="text-center py-12">
                  <div className="space-y-3">
                    <div className="text-gray-400">暂无数据</div>
                    <div className="text-sm text-gray-500">
                      {activeTab === 'system' ? '该主机组当前没有可用的系统监控数据' : '该主机组当前没有可用的进程监控数据'}
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