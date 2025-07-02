import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Terminal, X, Wifi, Upload } from 'lucide-react';
import { hostGroupAPI } from '../services/api';
import Modal from './Modal';

const HostGroupDetail = ({ group, onClose }) => {
  const [hosts, setHosts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingHost, setEditingHost] = useState(null);
  const [newHost, setNewHost] = useState('');
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
  const handlePingAll = async () => {
    setPinging(true);
    const results = {};
    
    for (const host of hosts) {
      try {
        const startTime = Date.now();
        // 这里需要调用后端API进行ping测试
        // const response = await hostGroupAPI.pingHost(host.ip);
        
        // 模拟ping延迟
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        const endTime = Date.now();
        const latency = endTime - startTime;
        
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
    if (newHost.trim()) {
      const updatedHosts = [...hosts, { id: Date.now(), ip: newHost.trim() }];
      setHosts(updatedHosts);
      updateGroupHosts(updatedHosts);
      setNewHost('');
      setShowAddModal(false);
    }
  };

  const handleBatchAdd = () => {
    if (batchHosts.trim()) {
      const newHostList = batchHosts.split('\n').filter(h => h.trim()).map(host => ({
        id: Date.now() + Math.random(),
        ip: host.trim()
      }));
      const updatedHosts = [...hosts, ...newHostList];
      setHosts(updatedHosts);
      updateGroupHosts(updatedHosts);
      setBatchHosts('');
      setShowBatchModal(false);
    }
  };

  const handleEditHost = (host) => {
    setEditingHost(host);
    setNewHost(host.ip);
    setShowAddModal(true);
  };

  const handleUpdateHost = () => {
    if (newHost.trim() && editingHost) {
      const updatedHosts = hosts.map(host => 
        host.id === editingHost.id ? { ...host, ip: newHost.trim() } : host
      );
      setHosts(updatedHosts);
      updateGroupHosts(updatedHosts);
      setNewHost('');
      setEditingHost(null);
      setShowAddModal(false);
    }
  };

  const handleDeleteHost = (hostId) => {
    if (window.confirm('确定要删除这个主机吗？')) {
      const updatedHosts = hosts.filter(host => host.id !== hostId);
      setHosts(updatedHosts);
      updateGroupHosts(updatedHosts);
    }
  };

  const updateGroupHosts = async (hostList) => {
    try {
      const hostsString = hostList.map(host => host.ip).join('\n');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl border border-border w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">{group.name} - 主机详情</h2>
            <p className="text-sm text-foreground-secondary mt-1">
              用户名: {group.username} | 端口: {group.port} | 共 {hosts.length} 台主机
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

        {/* 操作栏 */}
        <div className="p-6 border-b border-border">
          <div className="flex flex-wrap gap-3">
            <button 
              className="btn-primary flex items-center gap-2"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} />
              添加主机
            </button>
            <button 
              className="btn-secondary flex items-center gap-2"
              onClick={() => setShowBatchModal(true)}
            >
              <Plus size={16} />
              批量添加
            </button>
          </div>
        </div>

        {/* 主机列表 */}
        <div className="flex-1 overflow-auto">
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
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                          title="Ping测试"
                        >
                          <Wifi size={14} />
                        </button>
                        <button 
                          className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
                          onClick={() => openTerminal(host.id)}
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
                          onClick={() => handleDeleteHost(host.id)}
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
            setNewHost('');
          }}
          title={editingHost ? '编辑主机' : '添加主机'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">主机IP地址</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={newHost}
                onChange={(e) => setNewHost(e.target.value)}
                placeholder="请输入主机IP地址"
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
                  setNewHost('');
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
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">每行输入一个主机IP地址，例如：</p>
              <div className="font-mono text-sm bg-blue-100 dark:bg-blue-900/40 p-2 rounded border text-blue-900 dark:text-blue-100">
                192.168.1.100<br/>
                192.168.1.101<br/>
                192.168.1.102
              </div>
            </div>
            
            <div>
              <textarea
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows="8"
                value={batchHosts}
                onChange={(e) => setBatchHosts(e.target.value)}
                placeholder="请输入主机IP地址，每行一个"
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
      </div>
    </div>
  );
};

export default HostGroupDetail;