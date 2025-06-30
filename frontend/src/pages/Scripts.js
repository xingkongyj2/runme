import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, FileText, Calendar } from 'lucide-react';
import { scriptAPI, hostGroupAPI } from '../services/api';
import Modal from '../components/Modal';
import LogModal from '../components/LogModal';

const Scripts = () => {
  const [scripts, setScripts] = useState([]);
  const [hostGroups, setHostGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingScript, setEditingScript] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    host_group_id: ''
  });

  useEffect(() => {
    fetchScripts();
    fetchHostGroups();
  }, []);

  const fetchScripts = async () => {
    try {
      const response = await scriptAPI.getAll();
      setScripts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHostGroups = async () => {
    try {
      const response = await hostGroupAPI.getAll();
      setHostGroups(response.data || []);
    } catch (error) {
      console.error('Failed to fetch host groups:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        host_group_id: parseInt(formData.host_group_id, 10)
      };
      
      if (editingScript) {
        await scriptAPI.update(editingScript.id, submitData);
      } else {
        await scriptAPI.create(submitData);
      }
      setShowModal(false);
      setEditingScript(null);
      setFormData({ name: '', content: '', host_group_id: '' });
      fetchScripts();
    } catch (error) {
      console.error('Failed to save script:', error);
      alert('保存失败，请检查输入信息');
    }
  };

  const handleEdit = (script) => {
    setEditingScript(script);
    setFormData({
      name: script.name,
      content: script.content,
      host_group_id: script.host_group_id.toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个脚本吗？')) {
      try {
        await scriptAPI.delete(id);
        fetchScripts();
      } catch (error) {
        console.error('Failed to delete script:', error);
        alert('删除失败');
      }
    }
  };

  const handleExecute = async (script) => {
    if (window.confirm(`确定要执行脚本 "${script.name}" 吗？`)) {
      try {
        await scriptAPI.execute(script.id);
        alert('脚本执行已启动，请查看日志了解执行结果');
      } catch (error) {
        console.error('Failed to execute script:', error);
        alert('执行失败');
      }
    }
  };

  const handleViewLogs = (script) => {
    setSelectedScript(script);
    setShowLogModal(true);
  };

  const getHostGroupName = (hostGroupId) => {
    const group = hostGroups.find(g => g.id === hostGroupId);
    return group ? group.name : '未知主机组';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">脚本管理</h1>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingScript(null);
            setFormData({ name: '', content: '', host_group_id: '' });
            setShowModal(true);
          }}
        >
          <Plus size={16} />
          新增脚本
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scripts.map((script) => (
          <div key={script.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground truncate">{script.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                  onClick={() => handleExecute(script)}
                  title="执行脚本"
                >
                  <Play size={16} />
                </button>
                <button 
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                  onClick={() => handleViewLogs(script)}
                  title="查看日志"
                >
                  <Calendar size={16} />
                </button>
                <button 
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-900/20"
                  onClick={() => handleEdit(script)}
                  title="编辑"
                >
                  <Edit size={16} />
                </button>
                <button 
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  onClick={() => handleDelete(script.id)}
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-foreground-secondary">
                关联主机组: <span className="font-medium text-foreground">{getHostGroupName(script.host_group_id)}</span>
              </p>
              <div className="bg-background-secondary rounded-lg p-3">
                <pre className="text-xs text-foreground-secondary font-mono whitespace-pre-wrap break-words">
                  {script.content.substring(0, 200)}{script.content.length > 200 ? '...' : ''}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 新增/编辑脚本模态框 */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        title={editingScript ? '编辑脚本' : '新增脚本'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">脚本名称</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">关联主机组</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.host_group_id}
              onChange={(e) => setFormData({...formData, host_group_id: e.target.value})}
              required
            >
              <option value="">请选择主机组</option>
              {hostGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">脚本内容</label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono"
              rows="10"
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="请输入要执行的脚本内容..."
              required
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              取消
            </button>
            <button type="submit" className="btn-primary">
              {editingScript ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 日志查看模态框 */}
      <LogModal 
        show={showLogModal}
        onClose={() => setShowLogModal(false)}
        script={selectedScript}
      />
    </div>
  );
};

export default Scripts;