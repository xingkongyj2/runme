import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, Settings, Calendar, AlertTriangle, Sparkles } from 'lucide-react';
import { ansibleAPI, hostGroupAPI } from '../services/api';
import Modal from '../components/Modal';
import LogModal from '../components/LogModal';
import ExperimentalModal from '../components/ExperimentalModal';
import AISuggestionModal from '../components/AISuggestionModal';

const Ansible = () => {
  const [playbooks, setPlaybooks] = useState([]);
  const [hostGroups, setHostGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showExperimentalModal, setShowExperimentalModal] = useState(false);
  const [showAISuggestionModal, setShowAISuggestionModal] = useState(false); // 添加缺少的状态
  const [experimentalResult, setExperimentalResult] = useState(null);
  const [editingPlaybook, setEditingPlaybook] = useState(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [experimentalMode, setExperimentalMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    host_group_id: '',
    variables: ''
  });

  useEffect(() => {
    fetchPlaybooks();
    fetchHostGroups();
  }, []);

  const fetchPlaybooks = async () => {
    try {
      const response = await ansibleAPI.getAll();
      setPlaybooks(response.data || []);
    } catch (error) {
      console.error('Failed to fetch playbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHostGroups = async () => {
    try {
      const response = await hostGroupAPI.getAll();
      // 修改：response.data.data 才是真正的数组
      const data = response.data.data || [];
      setHostGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch host groups:', error);
      setHostGroups([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        host_group_id: parseInt(formData.host_group_id, 10)
      };
      
      if (editingPlaybook) {
        await ansibleAPI.update(editingPlaybook.id, submitData);
      } else {
        await ansibleAPI.create(submitData);
      }
      setShowModal(false);
      setEditingPlaybook(null);
      setFormData({ name: '', content: '', host_group_id: '', variables: '' });
      fetchPlaybooks();
    } catch (error) {
      console.error('Failed to save playbook:', error);
      alert('保存失败，请检查输入信息');
    }
  };

  const handleEdit = (playbook) => {
    setEditingPlaybook(playbook);
    setFormData({
      name: playbook.name,
      content: playbook.content,
      host_group_id: playbook.host_group_id.toString(),
      variables: playbook.variables || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个Ansible Playbook吗？')) {
      try {
        await ansibleAPI.delete(id);
        fetchPlaybooks();
      } catch (error) {
        console.error('Failed to delete playbook:', error);
        alert('删除失败');
      }
    }
  };

  const handleExecute = async (playbook) => {
    if (experimentalMode) {
      if (window.confirm(`确定要在实验主机模式下执行Ansible Playbook "${playbook.name}" 吗？\n\n系统将随机选择一台主机进行测试，确认无问题后再继续执行剩余主机。`)) {
        try {
          const response = await ansibleAPI.executeExperimental(playbook.id);
          setExperimentalResult(response.data);
          setShowExperimentalModal(true);
        } catch (error) {
          console.error('Failed to execute playbook in experimental mode:', error);
          alert('实验模式执行失败');
        }
      }
    } else {
      if (window.confirm(`确定要执行Ansible Playbook "${playbook.name}" 吗？`)) {
        try {
          await ansibleAPI.execute(playbook.id);
          alert('Ansible Playbook执行已启动，请查看日志了解执行结果');
        } catch (error) {
          console.error('Failed to execute playbook:', error);
          alert('执行失败');
        }
      }
    }
  };

  const handleViewLogs = (playbook) => {
    setSelectedPlaybook(playbook);
    setShowLogModal(true);
  };

  const getHostGroupName = (hostGroupId) => {
    if (!Array.isArray(hostGroups)) return '未知主机组';
    const group = hostGroups.find(g => g.id === hostGroupId);
    return group ? group.name : '未知主机组';
  };

  const handleContinueExecution = async () => {
    try {
      await ansibleAPI.continueExecution(experimentalResult.experimental_result.playbook_id || selectedPlaybook?.id, {
        session_name: experimentalResult.session_name,
        remaining_hosts: experimentalResult.remaining_hosts
      });
      setShowExperimentalModal(false);
      setExperimentalResult(null);
      alert('剩余主机执行已启动，请查看日志了解执行结果');
    } catch (error) {
      console.error('Failed to continue execution:', error);
      alert('继续执行失败');
    }
  };

  // 移动到组件内部
  const handleAISuggestion = (suggestion) => {
    setFormData({
      ...formData,
      name: suggestion.name,
      content: suggestion.content
    });
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Ansible管理</h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={experimentalMode}
                onChange={(e) => setExperimentalMode(e.target.checked)}
                className="custom-checkbox"
              />
              <span className="text-sm text-foreground flex items-center gap-1">
                实验主机模式
              </span>
            </label>
          </div>
        </div>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingPlaybook(null);
            setFormData({ name: '', content: '', host_group_id: '', variables: '' });
            setShowModal(true);
          }}
        >
          <Plus size={16} />
          新增Playbook
        </button>
      </div>

      {experimentalMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 dark:bg-orange-900/20 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <span className="text-sm text-orange-700 dark:text-orange-300">
              实验主机模式已启用：执行Playbook时将先在随机选择的主机上测试，确认无问题后再继续执行剩余主机。
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playbooks.map((playbook) => (
          <div key={playbook.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground truncate">{playbook.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  className={`p-2 rounded-lg transition-colors ${
                    experimentalMode 
                      ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20'
                      : 'text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20'
                  }`}
                  onClick={() => handleExecute(playbook)}
                  title={experimentalMode ? "实验模式执行Playbook" : "执行Playbook"}
                >
                  {experimentalMode ? <AlertTriangle size={16} /> : <Play size={16} />}
                </button>
                <button 
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                  onClick={() => handleViewLogs(playbook)}
                  title="查看日志"
                >
                  <Calendar size={16} />
                </button>
                <button 
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-900/20"
                  onClick={() => handleEdit(playbook)}
                  title="编辑"
                >
                  <Edit size={16} />
                </button>
                <button 
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  onClick={() => handleDelete(playbook.id)}
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-foreground-secondary">
                关联主机组: <span className="font-medium text-foreground">{getHostGroupName(playbook.host_group_id)}</span>
              </p>
              <div className="bg-background-secondary rounded-lg p-3">
                <pre className="text-xs text-foreground-secondary font-mono whitespace-pre-wrap break-words">
                  {playbook.content.substring(0, 200)}{playbook.content.length > 200 ? '...' : ''}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 新增/编辑Playbook模态框 */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        title={editingPlaybook ? '编辑Ansible Playbook' : '新增Ansible Playbook'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">Playbook名称</label>
              <button
                type="button"
                onClick={() => setShowAISuggestionModal(true)}
                className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
              >
                <Sparkles size={14} />
                AI建议
              </button>
            </div>
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
              {Array.isArray(hostGroups) && hostGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">变量 (YAML格式)</label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono"
              rows="4"
              value={formData.variables}
              onChange={(e) => setFormData({...formData, variables: e.target.value})}
              placeholder="例如：\napp_name: myapp\napp_version: 1.0.0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Playbook内容 (YAML)</label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono"
              rows="12"
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="请输入Ansible Playbook内容...\n例如：\n---\n- name: 示例任务\n  hosts: all\n  tasks:\n    - name: 安装软件包\n      yum:\n        name: nginx\n        state: present"
              required
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              取消
            </button>
            <button type="submit" className="btn-primary">
              {editingPlaybook ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 日志查看模态框 */}
      <LogModal 
        show={showLogModal}
        onClose={() => setShowLogModal(false)}
        script={selectedPlaybook}
        type="ansible"
      />

      {/* 实验主机模式结果模态框 */}
      <ExperimentalModal 
        show={showExperimentalModal}
        onClose={() => {
          setShowExperimentalModal(false);
          setExperimentalResult(null);
        }}
        onContinue={handleContinueExecution}
        experimentalResult={experimentalResult}
        type="ansible"
      />
      
      {/* AI建议模态框 - 添加缺少的组件渲染 */}
      <AISuggestionModal 
        show={showAISuggestionModal}
        onClose={() => setShowAISuggestionModal(false)}
        onApply={handleAISuggestion}
        type="ansible"
      />
    </div>
  );
};

export default Ansible;