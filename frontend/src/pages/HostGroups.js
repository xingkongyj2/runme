import React, { useState, useEffect } from 'react';
import { Plus, Search, Server, Eye, Edit, Trash2 } from 'lucide-react';
import { hostGroupAPI } from '../services/api';
import Modal from '../components/Modal';
import HostGroupDetail from '../components/HostGroupDetail';

const HostGroups = () => {
  const [hostGroups, setHostGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [showDetail, setShowDetail] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  // 新增删除确认弹窗状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(null);
  // 新增：用于存储主机数量的状态
  const [hostCounts, setHostCounts] = useState({});
  const [formData, setFormData] = useState({
    name: ''
  });

  useEffect(() => {
    fetchHostGroups();
  }, []);

  const fetchHostGroups = async () => {
    try {
      const response = await hostGroupAPI.getAll();
      // 修复：确保 groups 是数组
      const groups = response.data?.data || response.data || [];
      // 添加类型检查
      const validGroups = Array.isArray(groups) ? groups : [];
      setHostGroups(validGroups);
      
      // 获取每个主机组的主机数量
      const counts = {};
      for (const group of validGroups) {
        try {
          const hostResponse = await hostGroupAPI.getHosts(group.id);
          counts[group.id] = hostResponse.data?.data?.length || 0;
        } catch (error) {
          counts[group.id] = 0;
        }
      }
      setHostCounts(counts);
    } catch (error) {
      console.error('Failed to fetch host groups:', error);
      // 确保在错误情况下也设置为空数组
      setHostGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        name: formData.name
        // 移除 username, password, port, hosts 字段
      };
      
      if (editingGroup) {
        await hostGroupAPI.update(editingGroup.id, submitData);
      } else {
        await hostGroupAPI.create(submitData);
      }
      setShowModal(false);
      setEditingGroup(null);
      setFormData({ name: '' });
      fetchHostGroups();
    } catch (error) {
      console.error('Failed to save host group:', error);
      alert('保存失败，请检查输入信息');
    }
  };

  // 获取主机数量的函数需要修改
  // 移除原来的 getHostCount 函数，因为我们现在使用状态管理

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name
    });
    setShowModal(true);
  };

  // 修改删除函数，移除window.confirm
  const handleDeleteGroup = async () => {
    if (deletingGroup) {
      try {
        await hostGroupAPI.delete(deletingGroup.id);
        fetchHostGroups();
        setShowDeleteModal(false);
        setDeletingGroup(null);
      } catch (error) {
        console.error('Failed to delete host group:', error);
        alert('删除失败');
      }
    }
  };
  
  // 修改原来的handleDelete函数
  const handleDelete = (group) => {
    setDeletingGroup(group);
    setShowDeleteModal(true);
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

  // 修复 filter 调用，添加安全检查
  const filteredGroups = Array.isArray(hostGroups) ? hostGroups.filter(group => 
    group.name && group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.hosts && group.hosts.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

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
        <div className="flex items-center gap-3">
          <Server size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">主机管理</h1>
        </div>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} />
          新建主机组
        </button>
      </div>

      {/* 搜索区域 */}
      <div className="relative max-w-xs">
        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-secondary" />
        <input
          type="text"
          placeholder="搜索主机组名称、IP"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* 主机组列表卡片 */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
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
                    <span className="font-bold">主机组名称</span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider">主机数量</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-foreground-secondary uppercase tracking-wider">查看详情</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-foreground-secondary uppercase tracking-wider">编辑</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-foreground-secondary uppercase tracking-wider">删除</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-background-secondary transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Server size={16} className="text-primary" />
                        <span className="text-foreground font-medium">{group.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground">{hostCounts[group.id] || 0} 台</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                        onClick={() => openDetail(group)}
                        title="查看详情"
                      >
                        <Eye size={14} />
                        <span>详情</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                        onClick={() => handleEdit(group)}
                        title="编辑"
                      >
                        <Edit size={14} />
                        <span>编辑</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        onClick={() => handleDelete(group)}
                        title="删除"
                      >
                        <Trash2 size={14} />
                        <span>删除</span>
                      </button>
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

      {/* 删除确认弹窗 */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingGroup(null);
        }}
        title="确认删除"
      >
        <div className="space-y-4">
          <p className="text-foreground">
            确定要删除主机组 <span className="font-mono font-semibold text-red-600">{deletingGroup?.name}</span> 吗？
          </p>
          <p className="text-sm text-foreground-secondary">
            此操作将同时删除该主机组下的所有主机信息，且不可撤销，请谨慎操作。
          </p>
          
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingGroup(null);
              }}
            >
              取消
            </button>
            <button 
              type="button" 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              onClick={handleDeleteGroup}
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HostGroups;