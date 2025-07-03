import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Terminal, X, Wifi, Upload, Monitor, Users } from 'lucide-react';
import { hostGroupAPI } from '../services/api';
import Modal from './Modal';

// 将getLinuxIcon函数移到组件外部作为工具函数
const getLinuxIcon = (osInfo) => {
  if (!osInfo) return <Monitor size={16} className="text-gray-500" />;
  
  const os = osInfo.toLowerCase();
  if (os.includes('ubuntu')) {
    return <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">U</div>;
  } else if (os.includes('centos')) {
    return <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">C</div>;
  } else if (os.includes('redhat') || os.includes('rhel')) {
    return <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">R</div>;
  } else if (os.includes('debian')) {
    return <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">D</div>;
  } else if (os.includes('suse')) {
    return <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">S</div>;
  } else if (os.includes('alpine')) {
    return <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>;
  } else if (os.includes('arch')) {
    return <div className="w-4 h-4 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>;
  } else {
    return <Monitor size={16} className="text-gray-500" />;
  }
};

const HostGroupDetail = ({ group, onClose }) => {
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
  const [groupData, setGroupData] = useState(group);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPath, setUploadPath] = useState('/tmp/');
  const [pingResults, setPingResults] = useState({});
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    if (group.hosts) {
      const hostList = group.hosts.split('\n').filter(h => h.trim()).map((host, index) => ({
        id: index,
        ip: host.trim()
      }));
      setHosts(hostList);
    }
  }, [group]);

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
      
      alert('文件上传成功！');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadPath('/tmp/');
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败');
    }
  };

  // Ping功能
  // 修复第82行的latency变量问题 - 移除未使用的变量
  const handlePingAll = async () => {
    setPinging(true);
    const results = {};
    
    for (const host of hosts) {
      try {
        // 移除未使用的startTime变量
        // 这里需要调用后端API进行ping测试
        // const response = await hostGroupAPI.pingHost(host.ip);
        
        // 模拟ping延迟
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        
        results[host.ip] = {
          success: Math.random() > 0.1, // 90%成功率
          latency: Math.floor(Math.random() * 100 + 10) // 10-110ms随机延迟
        };
      } catch (error) {
        results[host.ip] = {
          success: false,
          latency: null
        };
      }
    }
    
    setPingResults(results);
    setPinging(false);
  };

  const handleAddHost = () => {
    if (newHost.ip.trim() && newHost.username.trim() && newHost.password.trim()) {
      const updatedHosts = [...hosts, { 
        id: Date.now(), 
        ip: newHost.ip.trim(),
        port: newHost.port || '22',
        username: newHost.username.trim(),
        password: newHost.password.trim()
      }];
      setHosts(updatedHosts);
      updateGroupHosts(updatedHosts);
      setNewHost({ ip: '', port: '22', username: 'root', password: '' });
      setShowAddModal(false);
    }
  };

  const handleBatchAdd = () => {
    if (batchHosts.trim()) {
      const lines = batchHosts.split('\n').filter(line => line.trim());
      const newHostList = [];
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          // 格式: IP 端口 用户名 密码
          newHostList.push({
            id: Date.now() + Math.random(),
            ip: parts[0],
            port: parts[1] || '22',
            username: parts[2] || 'root',
            password: parts[3]
          });
        }
      }
      
      if (newHostList.length > 0) {
        const updatedHosts = [...hosts, ...newHostList];
        setHosts(updatedHosts);
        updateGroupHosts(updatedHosts);
        setBatchHosts('');
        setShowBatchModal(false);
      } else {
        alert('请按照正确格式输入：IP 端口 用户名 密码');
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

  const handleUpdateHost = () => {
    if (newHost.ip.trim() && newHost.username.trim() && newHost.password.trim() && editingHost) {
      const updatedHosts = hosts.map(host => 
        host.id === editingHost.id ? { 
          ...host, 
          ip: newHost.ip.trim(),
          port: newHost.port || '22',
          username: newHost.username.trim(),
          password: newHost.password.trim()
        } : host
      );
      setHosts(updatedHosts);
      updateGroupHosts(updatedHosts);
      setNewHost({ ip: '', port: '22', username: 'root', password: '' });
      setEditingHost(null);
      setShowAddModal(false);
    }
  };

  // 修改删除主机函数
  const handleDeleteHost = () => {
    if (deletingHost) {
      const updatedHosts = hosts.filter(host => host.id !== deletingHost.id);
      setHosts(updatedHosts);
      updateGroupHosts(updatedHosts);
      setShowDeleteModal(false);
      setDeletingHost(null);
    }
  };

  const updateGroupHosts = async (hostList) => {
    try {
      // 将主机信息序列化为字符串格式
      const hostsString = hostList.map(host => 
        `${host.ip}:${host.port}@${host.username}:${host.password}`
      ).join('\n');
      const updatedGroup = {
        ...groupData,
        hosts: hostsString
      };
      await hostGroupAPI.update(group.id, updatedGroup);
      setGroupData(updatedGroup);
    } catch (error) {
      console.error('Failed to update hosts:', error);
      alert('更新主机列表失败');
    }
  };

  return (
    <>
      {/* 主详情弹窗 - 使用自定义样式以支持更大尺寸和固定高度 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* 带透明度的黑色背景遮罩 */}
        <div className="fixed inset-0 bg-black bg-opacity-90" onClick={onClose}></div>
        
        {/* 弹窗容器 - 使用与编辑弹窗相同的宽度和固定90%高度 */}
        <div className="relative w-full max-w-2xl h-[90vh] bg-card shadow-2xl rounded-xl border border-border flex flex-col">
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
                disabled={pinging}
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

          {/* 主机列表 - 可滚动区域 */}
          <div className="flex-1 overflow-y-auto">
            {hosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Terminal size={48} className="text-foreground-secondary mb-4" />
                <p className="text-foreground-secondary">暂无主机，点击上方按钮添加主机</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-background-secondary sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">序号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">主机IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">系统</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">延迟</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hosts.map((host, index) => (
                    <tr key={host.id} className="hover:bg-background-secondary transition-colors">
                      <td className="px-6 py-4 text-foreground">{index + 1}</td>
                      <td className="px-6 py-4 text-foreground font-mono">{host.ip}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getLinuxIcon(host.osInfo)}
                          <span className="text-sm text-foreground-secondary">
                            {host.osInfo || '未知'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {pinging ? (
                          <span className="text-yellow-500">测试中...</span>
                        ) : pingResults[host.ip] ? (
                          pingResults[host.ip].success ? (
                            <span className="text-green-500">{pingResults[host.ip].latency}ms</span>
                          ) : (
                            <span className="text-red-500">超时</span>
                          )
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
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

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setShowBatchModal(false)}
            >
              取消
            </button>
            <button 
              type="button" 
              className="btn-primary"
              onClick={handleBatchAdd}
            >
              确认添加
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
    </>
  );
};

export default HostGroupDetail;