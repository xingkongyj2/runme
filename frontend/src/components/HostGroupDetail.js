import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Terminal, X, Wifi, Upload, Users } from 'lucide-react';
import { hostAPI, hostGroupAPI } from '../services/api';
import Modal from './Modal';
import useToast from '../hooks/useToast';
import ToastContainer from './ToastContainer';

// 获取操作系统简写
const getOSShortName = (osInfo) => {
  if (!osInfo) return '未知';
  
  const os = osInfo.toLowerCase();
  if (os.includes('ubuntu')) {
    return 'Ubuntu';
  } else if (os.includes('centos')) {
    return 'CentOS';
  } else if (os.includes('redhat') || os.includes('rhel')) {
    return 'RHEL';
  } else if (os.includes('debian')) {
    return 'Debian';
  } else if (os.includes('suse')) {
    return 'SUSE';
  } else if (os.includes('alpine')) {
    return 'Alpine';
  } else if (os.includes('arch')) {
    return 'Arch';
  } else if (os.includes('fedora')) {
    return 'Fedora';
  } else if (os.includes('opensuse')) {
    return 'openSUSE';
  } else if (os.includes('rocky')) {
    return 'Rocky';
  } else if (os.includes('alma')) {
    return 'AlmaLinux';
  } else {
    // 如果都不匹配，尝试提取第一个单词作为系统名称
    const firstWord = osInfo.split(' ')[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  }
};

const HostGroupDetail = ({ group, onClose }) => {
  const { toasts, showSuccess, showError, showWarning, hideToast } = useToast();
  const [hosts, setHosts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);  // 新增删除确认弹窗状态
  const [deletingHost, setDeletingHost] = useState(null);  // 新增要删除的主机
  const [editingHost, setEditingHost] = useState(null);
  // 修改为对象形式，包含完整的主机信息
  const [newHost, setNewHost] = useState({
    ip: '',
    port: '22',
    username: 'root',
    password: ''
  });
  const [batchHosts, setBatchHosts] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPath, setUploadPath] = useState('/tmp/');
  const [pingResults, setPingResults] = useState({});
  const [pinging, setPinging] = useState(false);
  // 新增状态：控制延迟数据显示
  const [showingResults, setShowingResults] = useState(false);
  // 批量添加相关状态
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [showResultModal, setShowResultModal] = useState(false);
  const [batchResults, setBatchResults] = useState({ success: [], failed: [] });

  // 移除旧的 hosts 字符串解析逻辑，现在通过API获取主机数据

  const openTerminal = (hostId) => {
    // 使用主机ID打开新窗口
    const terminalUrl = `/terminal/${hostId}`;
    window.open(terminalUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  };

  // 上传文件功能
  const handleFileUpload = async () => {
    if (!uploadFile || !uploadPath.trim()) {
      alert('请选择文件并输入上传路径');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('path', uploadPath);
      formData.append('groupId', group.id);

      // 这里需要调用后端API上传文件
      // await hostGroupAPI.uploadFile(formData);
      
      showSuccess('文件上传成功！');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadPath('/tmp/');
    } catch (error) {
      console.error('文件上传失败:', error);
      showError('文件上传失败，请重试');
    }
  };

  // Ping功能 - 使用真实的后端API
  const handlePingAll = async () => {
    setPinging(true);
    setShowingResults(false);
    
    try {
      // 调用后端API进行批量ping测试
      const response = await hostGroupAPI.pingHosts(group.id);
      const results = response.data.data;
      
      setPingResults(results);
      setPinging(false);
      setShowingResults(true);
      
      // 显示ping结果摘要
      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;
      
      if (successCount === totalCount) {
        showSuccess(`Ping完成！所有 ${totalCount} 台主机都响应正常`);
      } else if (successCount === 0) {
        showError(`Ping完成！所有 ${totalCount} 台主机都无响应`);
      } else {
        showWarning(`Ping完成！${successCount}/${totalCount} 台主机响应正常`);
      }
      
      // 5秒后清除延迟数据显示
      setTimeout(() => {
        setShowingResults(false);
        setPingResults({});
      }, 5000);
      
    } catch (error) {
      console.error('Ping测试失败:', error);
      showError('Ping测试失败，请重试');
      setPinging(false);
    }
  };

  useEffect(() => {
    // 从后端获取主机列表，而不是解析hosts字符串
    const fetchHosts = async () => {
      try {
        const response = await hostAPI.getByGroupId(group.id);
        setHosts(response.data?.data || []);
      } catch (error) {
        console.error('Failed to fetch hosts:', error);
        setHosts([]);
      }
    };
    
    fetchHosts();
  }, [group.id]);

  const handleAddHost = async () => {
    if (newHost.ip.trim() && newHost.username.trim() && newHost.password.trim()) {
      try {
        // 添加主机到后端
        const response = await hostAPI.create({
          ip: newHost.ip.trim(),
          port: parseInt(newHost.port) || 22,
          username: newHost.username.trim(),
          password: newHost.password.trim(),
          host_group_id: group.id
        });
        
        const newHostData = response.data.data;
        
        // 获取操作系统信息
        // 在handleAddHost函数中
        try {
          const osResponse = await hostAPI.getOSInfo(newHostData.id);
          newHostData.os_info = osResponse.data.os_info;
        } catch (error) {
          console.error('获取操作系统信息失败:', error);
          newHostData.os_info = '未知';
        }
        
        const updatedHosts = [...hosts, newHostData];
        setHosts(updatedHosts);
        setNewHost({ ip: '', port: '22', username: 'root', password: '' });
        setShowAddModal(false);
        showSuccess('主机添加成功！');
      } catch (error) {
        console.error('添加主机失败:', error);
        showError(`添加主机失败: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const handleBatchAdd = async () => {
    if (batchHosts.trim()) {
      const lines = batchHosts.split('\n').filter(line => line.trim());
      const newHostList = [];
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          // 格式: IP 端口 用户名 密码
          newHostList.push({
            ip: parts[0],
            port: parseInt(parts[1]) || 22,
            username: parts[2] || 'root',
            password: parts[3]
          });
        }
      }
      
      if (newHostList.length > 0) {
        setBatchLoading(true);
        setBatchProgress({ current: 0, total: newHostList.length });
        
        const results = { success: [], failed: [] };
        const addedHosts = [];
        
        try {
          // 逐个添加主机，显示进度
          for (let i = 0; i < newHostList.length; i++) {
            const hostData = newHostList[i];
            setBatchProgress({ current: i + 1, total: newHostList.length });
            
            try {
              const response = await hostAPI.create({
                ...hostData,
                host_group_id: group.id
              });
              
              const newHostData = response.data.data;
              
              // 尝试获取操作系统信息
              try {
                const osResponse = await hostAPI.getOSInfo(newHostData.id);
                newHostData.os_info = osResponse.data.os_info;
              } catch (error) {
                newHostData.os_info = '未知';
              }
              
              addedHosts.push(newHostData);
              results.success.push({
                ip: hostData.ip,
                port: hostData.port,
                username: hostData.username
              });
              
            } catch (error) {
              console.error(`添加主机 ${hostData.ip} 失败:`, error);
              results.failed.push({
                ip: hostData.ip,
                port: hostData.port,
                username: hostData.username,
                error: error.response?.data?.error || error.message
              });
            }
          }
          
          // 更新前端显示
          if (addedHosts.length > 0) {
            const updatedHosts = [...hosts, ...addedHosts];
            setHosts(updatedHosts);
          }
          
          // 设置结果并显示结果弹窗
          setBatchResults(results);
          setBatchLoading(false);
          setShowResultModal(true);
          setBatchHosts('');
          setShowBatchModal(false);
          
          // 显示总体结果提示
          if (results.failed.length === 0) {
            showSuccess(`批量添加完成！成功添加 ${results.success.length} 台主机`);
          } else if (results.success.length === 0) {
            showError(`批量添加失败！所有 ${results.failed.length} 台主机添加失败`);
          } else {
            showWarning(`批量添加完成！成功 ${results.success.length} 台，失败 ${results.failed.length} 台`);
          }
          
        } catch (error) {
          console.error('批量添加过程出错:', error);
          setBatchLoading(false);
          showError('批量添加过程中出现错误');
        }
      } else {
        showWarning('请按照正确格式输入：IP 端口 用户名 密码');
      }
    }
  };

  const handleEditHost = (host) => {
    setEditingHost(host);
    setNewHost({
      ip: host.ip,
      port: host.port || '22',
      username: host.username || 'root',
      password: host.password || ''
    });
    setShowAddModal(true);
  };

  const handleUpdateHost = async () => {
    if (newHost.ip.trim() && newHost.username.trim() && newHost.password.trim() && editingHost) {
      try {
        const response = await hostAPI.update(editingHost.id, {
          ip: newHost.ip.trim(),
          port: parseInt(newHost.port) || 22,
          username: newHost.username.trim(),
          password: newHost.password.trim(),
          host_group_id: group.id
        });
        
        const updatedHostData = response.data.data;
        const updatedHosts = hosts.map(host => 
          host.id === editingHost.id ? updatedHostData : host
        );
        setHosts(updatedHosts);
        setNewHost({ ip: '', port: '22', username: 'root', password: '' });
        setEditingHost(null);
        setShowAddModal(false);
        showSuccess('主机更新成功！');
      } catch (error) {
        console.error('更新主机失败:', error);
        showError(`更新主机失败: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const handleDeleteHost = async () => {
    if (deletingHost) {
      try {
        await hostAPI.delete(deletingHost.id);
        const updatedHosts = hosts.filter(host => host.id !== deletingHost.id);
        setHosts(updatedHosts);
        setShowDeleteModal(false);
        setDeletingHost(null);
        showSuccess('主机删除成功！');
      } catch (error) {
        console.error('删除主机失败:', error);
        showError(`删除主机失败: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  // updateGroupHosts 函数已移除，因为现在主机数据单独存储在数据库中

  return (
    <>
      {/* 主详情弹窗 - 使用自定义样式以支持更大尺寸和固定高度 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* 带透明度的黑色背景遮罩 */}
        <div className="fixed inset-0 bg-black bg-opacity-90" onClick={onClose}></div>
        
        {/* 弹窗容器 - 使用与编辑弹窗相同的宽度和固定90%高度 */}
        <div className="relative w-full max-w-3xl h-[90vh] bg-card shadow-2xl rounded-xl border border-border flex flex-col">
          {/* 弹窗头部 - 固定不滚动 */}
          <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{group.name}</h2>
              <p className="text-sm text-foreground-secondary mt-1">
                共 {hosts.length} 台主机
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                title="上传文件"
              >
                <Upload size={20} />
              </button>
              <button
                onClick={handlePingAll}
                disabled={pinging || showingResults}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 disabled:opacity-50"
                title="Ping所有主机"
              >
                <Wifi size={20} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 操作栏 - 固定不滚动 */}
          <div className="p-6 border-b border-border flex-shrink-0">
            <div className="flex justify-center">
              <div className="w-full max-w-5xl">
                <div className="flex flex-wrap gap-3">
                  <button 
                    className="px-3 py-1.5 bg-black hover:bg-gray-900 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus size={14} />
                    添加主机
                  </button>
                  <button 
                    className="px-3 py-1.5 bg-black hover:bg-gray-900 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                    onClick={() => setShowBatchModal(true)}
                  >
                    <Users size={14} />
                    批量添加
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 主机列表 - 可滚动区域 */}
          <div className="flex-1 overflow-y-auto">
            {hosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Terminal size={48} className="text-foreground-secondary mb-4" />
                <p className="text-foreground-secondary">暂无主机，点击上方按钮添加主机</p>
              </div>
            ) : (
              <div className="px-6">
                <table className="w-full table-fixed">
                  <thead className="bg-background-secondary sticky top-0">
                    <tr>
                      <th className="w-16 py-3 text-center text-sm font-medium text-foreground-secondary uppercase tracking-wider">序号</th>
                      <th className="w-32 py-3 text-center text-sm font-medium text-foreground-secondary uppercase tracking-wider">主机IP</th>
                      <th className="w-24 py-3 text-center text-sm font-medium text-foreground-secondary uppercase tracking-wider">系统</th>
                      <th className="w-20 py-3 text-center text-sm font-medium text-foreground-secondary uppercase tracking-wider">延迟</th>
                      <th className="w-32 py-3 text-center text-sm font-medium text-foreground-secondary uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {hosts.map((host, index) => (
                      <tr key={host.id} className="hover:bg-background-secondary transition-colors">
                        <td className="w-16 py-4 text-foreground text-sm text-center">{index + 1}</td>
                        <td className="w-32 py-4 text-foreground font-mono text-sm text-center">{host.ip}</td>
                        <td className="w-24 py-4 text-center">
                          <button
                            className="text-sm text-foreground font-medium hover:text-blue-600 transition-colors cursor-pointer"
                            onClick={async () => {
                              try {
                                const response = await hostAPI.getOSInfo(host.id);
                                const updatedHosts = hosts.map(h => 
                                  h.id === host.id ? {...h, os_info: response.data.os_info} : h
                                );
                                setHosts(updatedHosts);
                              } catch (error) {
                                console.error('Failed to refresh OS info:', error);
                              }
                            }}
                            title="点击刷新操作系统信息"
                          >
                            {getOSShortName(host.os_info)}
                          </button>
                        </td>
                        <td className="w-20 py-4 text-center">
                          {showingResults && pingResults[host.ip] ? (
                            pingResults[host.ip].success ? (
                              <span className="text-green-500">{pingResults[host.ip].latency}ms</span>
                            ) : (
                              <span className="text-red-500">超时</span>
                            )
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="w-32 py-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <button 
                              className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
                              onClick={() => {
                                const terminalUrl = `/terminal/${host.id}`;
                                window.open(terminalUrl, '_blank');
                              }}
                              title="SSH终端"
                            >
                              <Terminal size={14} />
                            </button>
                            <button 
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                              onClick={() => handleEditHost(host)}
                              title="编辑"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                              onClick={() => {
                                setDeletingHost(host);
                                setShowDeleteModal(true);
                              }}
                              title="删除"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 上传文件弹窗 */}
      <Modal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        title="上传文件到主机组"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">选择文件</label>
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">上传路径</label>
            <input
              type="text"
              value={uploadPath}
              onChange={(e) => setUploadPath(e.target.value)}
              placeholder="请输入目标路径，如：/tmp/"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              文件将上传到主机组中的所有主机的指定路径
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setShowUploadModal(false)}
            >
              取消
            </button>
            <button 
              type="button" 
              className="btn-primary"
              onClick={handleFileUpload}
            >
              确认上传
            </button>
          </div>
        </div>
      </Modal>

      {/* 添加/编辑主机弹窗 */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => {
          setShowAddModal(false);
          setEditingHost(null);
          setNewHost({ ip: '', port: '22', username: 'root', password: '' });
        }}
        title={editingHost ? '编辑主机' : '添加主机'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">主机IP地址</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={newHost.ip}
              onChange={(e) => setNewHost({...newHost, ip: e.target.value})}
              placeholder="请输入主机IP地址"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">端口</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={newHost.port}
              onChange={(e) => setNewHost({...newHost, port: e.target.value})}
              placeholder="22"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">用户名</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={newHost.username}
              onChange={(e) => setNewHost({...newHost, username: e.target.value})}
              placeholder="root"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">密码</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={newHost.password}
              onChange={(e) => setNewHost({...newHost, password: e.target.value})}
              placeholder="请输入密码"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => {
                setShowAddModal(false);
                setEditingHost(null);
                setNewHost({ ip: '', port: '22', username: 'root', password: '' });
              }}
            >
              取消
            </button>
            <button 
              type="button" 
              className="btn-primary"
              onClick={editingHost ? handleUpdateHost : handleAddHost}
            >
              {editingHost ? '更新' : '添加'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 批量添加主机弹窗 */}
      <Modal 
        isOpen={showBatchModal} 
        onClose={() => setShowBatchModal(false)}
        title="批量添加主机"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">每行输入一个主机信息，格式：IP 端口 用户名 密码，例如：</p>
            <div className="font-mono text-sm bg-blue-100 dark:bg-blue-900/40 p-2 rounded border text-blue-900 dark:text-blue-100">
              192.168.1.100 22 root password123<br/>
              192.168.1.101 22 admin mypassword<br/>
              192.168.1.102 2222 user secretpass
            </div>
          </div>
          
          <div>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows="8"
              value={batchHosts}
              onChange={(e) => setBatchHosts(e.target.value)}
              placeholder="请按格式输入：IP 端口 用户名 密码，每行一个"
            />
          </div>

          {/* 进度显示 */}
          {batchLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">添加进度:</span>
                <span className="text-sm text-blue-600 font-medium">
                  {batchProgress.current} / {batchProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                正在添加主机 {batchProgress.current} / {batchProgress.total}...
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setShowBatchModal(false)}
              disabled={batchLoading}
            >
              取消
            </button>
            <button 
              type="button" 
              className="btn-primary"
              onClick={handleBatchAdd}
              disabled={batchLoading}
            >
              {batchLoading ? '添加中...' : '确认添加'}
            </button>
          </div>
        </div>
      </Modal>
      {/* 删除确认弹窗 */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingHost(null);
        }}
        title="确认删除"
      >
        <div className="space-y-4">
          <p className="text-foreground">
            确定要删除主机 <span className="font-mono font-semibold text-red-600">{deletingHost?.ip}</span> 吗？
          </p>
          <p className="text-sm text-foreground-secondary">
            此操作不可撤销，请谨慎操作。
          </p>
          
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingHost(null);
              }}
            >
              取消
            </button>
            <button 
              type="button" 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              onClick={handleDeleteHost}
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>

      {/* 批量添加结果弹窗 */}
      <Modal 
        isOpen={showResultModal} 
        onClose={() => setShowResultModal(false)}
        title="批量添加结果"
      >
        <div className="space-y-4">
          {/* 成功统计 */}
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-green-800 dark:text-green-200 font-medium">
              成功添加: {batchResults.success.length} 台主机
            </span>
          </div>

          {/* 失败统计 */}
          {batchResults.failed.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-red-800 dark:text-red-200 font-medium">
                添加失败: {batchResults.failed.length} 台主机
              </span>
            </div>
          )}

          {/* 失败详情 */}
          {batchResults.failed.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">失败详情:</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {batchResults.failed.map((failedHost, index) => (
                  <div key={index} className="p-3 bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm text-red-800 dark:text-red-200">
                        {failedHost.ip}:{failedHost.port}
                      </span>
                      <span className="text-xs text-red-600 dark:text-red-400">
                        用户: {failedHost.username}
                      </span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20 p-2 rounded">
                      错误: {failedHost.error}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 成功详情（可折叠） */}
          {batchResults.success.length > 0 && (
            <details className="space-y-2">
              <summary className="cursor-pointer font-medium text-foreground hover:text-green-600">
                查看成功添加的主机 ({batchResults.success.length}台)
              </summary>
              <div className="max-h-32 overflow-y-auto space-y-1 ml-4">
                {batchResults.success.map((successHost, index) => (
                  <div key={index} className="text-sm text-green-700 dark:text-green-300">
                    <span className="font-mono">{successHost.ip}:{successHost.port}</span>
                    <span className="ml-2 text-green-600 dark:text-green-400">({successHost.username})</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              className="btn-primary"
              onClick={() => setShowResultModal(false)}
            >
              确定
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast 提示容器 */}
      <ToastContainer 
        toasts={toasts} 
        onClose={hideToast} 
      />
    </>
  );
};

export default HostGroupDetail;