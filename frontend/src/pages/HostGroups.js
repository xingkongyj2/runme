import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Server, Upload, Play, Wifi, Search, Eye } from 'lucide-react';
import { hostGroupAPI } from '../services/api';
import Modal from '../components/Modal';
import HostGroupDetail from '../components/HostGroupDetail';

const HostGroups = () => {
  const [hostGroups, setHostGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    port: '22',
    hosts: ''
  });

  useEffect(() => {
    fetchHostGroups();
  }, []);

  const fetchHostGroups = async () => {
    try {
      const response = await hostGroupAPI.getAll();
      setHostGroups(response.data || []);
    } catch (error) {
      console.error('Failed to fetch host groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        port: parseInt(formData.port, 10) || 22
      };
      
      if (editingGroup) {
        await hostGroupAPI.update(editingGroup.id, submitData);
      } else {
        await hostGroupAPI.create(submitData);
      }
      setShowModal(false);
      setEditingGroup(null);
      setFormData({ name: '', username: '', password: '', port: '22', hosts: '' });
      fetchHostGroups();
    } catch (error) {
      console.error('Failed to save host group:', error);
      alert('保存失败，请检查输入信息');
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      username: group.username,
      password: group.password,
      port: group.port || '22',
      hosts: group.hosts
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个主机组吗？')) {
      try {
        await hostGroupAPI.delete(id);
        fetchHostGroups();
      } catch (error) {
        console.error('Failed to delete host group:', error);
        alert('删除失败');
      }
    }
  };

  const openDetail = (group) => {
    setSelectedGroup(group);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedGroup(null);
    fetchHostGroups(); // 刷新主机组列表
  };

  const toggleGroupSelection = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const selectAllGroups = () => {
    if (selectedGroups.length === hostGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(hostGroups.map(group => group.id));
    }
  };

  const getHostCount = (hosts) => {
    if (!hosts) return 0;
    return hosts.split('\n').filter(h => h.trim()).length;
  };

  const filteredGroups = hostGroups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.hosts && group.hosts.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和主要操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">主机组管理</h1>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} />
          新建主机组
        </button>
      </div>

      {/* 功能操作区域 */}
      <div className="p-6 bg-card rounded-xl border border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* 左侧搜索框 */}
          <div className="relative flex-1 max-w-md">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-secondary" />
            <input
              type="text"
              placeholder="搜索主机组名称、IP"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          {/* 右侧其他功能按钮 */}
          <div className="flex flex-wrap gap-3">
            <button className="btn-info flex items-center gap-2">
              <Play size={16} />
              执行任务
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Upload size={16} />
              上传文件
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Wifi size={16} />
              Ping 所有
            </button>
          </div>
        </div>
      </div>

      {/* 主机组列表卡片 */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              checked={selectedGroups.length === hostGroups.length && hostGroups.length > 0}
              onChange={selectAllGroups}
            />
            <span className="text-lg font-semibold text-foreground">主机组列表</span>
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Server size={48} className="text-foreground-secondary mb-4" />
            <p className="text-foreground-secondary">暂无主机组，点击上方按钮创建第一个主机组</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                      checked={selectedGroups.length === filteredGroups.length}
                      onChange={selectAllGroups}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">主机组名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">用户名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">端口</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">主机数量</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-background-secondary transition-colors">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => toggleGroupSelection(group.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Server size={16} className="text-primary" />
                        <span className="text-foreground font-medium">{group.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground">{group.username}</td>
                    <td className="px-6 py-4 text-foreground">{group.port}</td>
                    <td className="px-6 py-4 text-foreground">{getHostCount(group.hosts)} 台</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        -
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                          onClick={() => openDetail(group)}
                          title="查看详情"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                          onClick={() => handleEdit(group)}
                          title="编辑"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                          onClick={() => handleDelete(group.id)}
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

      {/* 编辑主机组弹窗 */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        title={editingGroup ? '编辑主机组' : '新建主机组'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">主机组名称</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="请输入主机组名称"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">SSH用户名</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              placeholder="请输入SSH用户名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">SSH密码</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="请输入SSH密码"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">SSH端口</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.port}
              onChange={(e) => setFormData({...formData, port: e.target.value})}
              placeholder="请输入SSH端口"
              min="1"
              max="65535"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">主机IP列表</label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows="6"
              value={formData.hosts}
              onChange={(e) => setFormData({...formData, hosts: e.target.value})}
              placeholder="请输入主机IP地址，每行一个\n例如：\n192.168.1.100\n192.168.1.101\n192.168.1.102"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setShowModal(false)}
            >
              取消
            </button>
            <button type="submit" className="btn-primary">
              {editingGroup ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 主机组详情弹窗 */}
      {showDetail && selectedGroup && (
        <HostGroupDetail
          group={selectedGroup}
          onClose={closeDetail}
        />
      )}
    </div>
  );
};

export default HostGroups;