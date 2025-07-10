import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, PlayCircle, Settings, ScrollText, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { ansibleAPI, hostGroupAPI } from '../services/api';
import Modal from '../components/Modal';
import LogModal from '../components/LogModal';
import ExperimentalModal from '../components/ExperimentalModal';
import AISuggestionModal from '../components/AISuggestionModal';
import CustomSelect from '../components/CustomSelect';
import ToastContainer from '../components/ToastContainer';
import useToast from '../hooks/useToast';

const Ansible = () => {
  // 正确使用 useToast hook
  const { showError, showSuccess, toasts, hideToast } = useToast();
  
  const [playbooks, setPlaybooks] = useState([]);
  const [hostGroups, setHostGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showExperimentalModal, setShowExperimentalModal] = useState(false);
  const [showAISuggestionModal, setShowAISuggestionModal] = useState(false);
  const [experimentalResult, setExperimentalResult] = useState(null);
  const [editingPlaybook, setEditingPlaybook] = useState(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [experimentalMode, setExperimentalMode] = useState(false);
  // 添加运行状态管理
  const [runningPlaybooks, setRunningPlaybooks] = useState(new Set());
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    host_group_id: '',
    variables: ''
  });
  // 添加确认弹窗状态
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
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

  // 在handleSubmit函数中添加校验
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 校验必填字段
    if (!formData.host_group_id) {
      showError('请选择主机组');
      return;
    }
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
      showError('保存失败，请检查输入信息');
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
    setConfirmConfig({
      title: '删除确认',
      message: '确定要删除这个Ansible Playbook吗？删除后将无法恢复。',
      onConfirm: async () => {
        try {
          await ansibleAPI.delete(id);
          fetchPlaybooks();
          setShowConfirmModal(false);
        } catch (error) {
          console.error('Failed to delete playbook:', error);
          showError('删除失败');
          setShowConfirmModal(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleExecute = async (playbook) => {
    if (experimentalMode) {
      setConfirmConfig({
        title: '实验模式执行确认',
        message: `确定要在实验主机模式下执行Ansible Playbook "${playbook.name}" 吗？\n\n系统将随机选择一台主机进行测试，确认无问题后再继续执行剩余主机。`,
        onConfirm: async () => {
          // 添加到运行状态
          setRunningPlaybooks(prev => new Set([...prev, playbook.id]));
          try {
            const response = await ansibleAPI.executeExperimental(playbook.id);
            setExperimentalResult(response.data);
            setShowExperimentalModal(true);
            setShowConfirmModal(false);
            showSuccess(`实验模式执行已启动：${playbook.name}`, '执行成功');
          } catch (error) {
            console.error('Failed to execute playbook in experimental mode:', error);
            showError('实验模式执行失败');
            setShowConfirmModal(false);
          } finally {
            // 3秒后移除运行状态
            setTimeout(() => {
              setRunningPlaybooks(prev => {
                const newSet = new Set(prev);
                newSet.delete(playbook.id);
                return newSet;
              });
            }, 3000);
          }
        }
      });
    } else {
      setConfirmConfig({
        title: '执行确认',
        message: `确定要执行Ansible Playbook "${playbook.name}" 吗？`,
        onConfirm: async () => {
          // 1. 立即关闭确认弹窗
          setShowConfirmModal(false);
          
          // 2. 立即显示Toast（使用setTimeout确保在下一个事件循环中执行）
          setTimeout(() => {
            showSuccess(`Ansible Playbook执行已启动：${playbook.name}，请查看日志了解执行结果`, '执行成功');
          }, 0);
          
          // 3. Toast显示后再设置按钮加载状态
          setTimeout(() => {
            setRunningPlaybooks(prev => new Set([...prev, playbook.id]));
          }, 50);
          
          try {
            // 4. 调用API
            await ansibleAPI.execute(playbook.id);
          } catch (error) {
            console.error('Failed to execute playbook:', error);
            showError('执行失败');
          } finally {
            // 3秒后移除运行状态
            setTimeout(() => {
              setRunningPlaybooks(prev => {
                const newSet = new Set(prev);
                newSet.delete(playbook.id);
                return newSet;
              });
            }, 3000);
          }
        }
      });
    }
    setShowConfirmModal(true);
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
      showError('剩余主机执行已启动，请查看日志了解执行结果');
    } catch (error) {
      console.error('Failed to continue execution:', error);
      showError('继续执行失败');
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
        {playbooks.map((playbook) => {
          const isRunning = runningPlaybooks.has(playbook.id);
          return (
            <div key={playbook.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-foreground leading-tight pr-4">{playbook.name}</h3>
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium dark:bg-blue-900/20 dark:text-blue-300 flex-shrink-0">{getHostGroupName(playbook.host_group_id)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <button 
                    className={`group relative p-2.5 rounded-xl transition-all duration-200 ${
                      isRunning
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800/50 dark:text-gray-500'
                        : experimentalMode 
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 hover:shadow-md dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-md dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                    }`}
                    onClick={() => !isRunning && handleExecute(playbook)}
                    disabled={isRunning}
                    title={isRunning ? "Playbook执行中..." : (experimentalMode ? "实验模式执行Playbook" : "执行Playbook")}
                  >
                    {isRunning ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : experimentalMode ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <PlayCircle size={16} />
                    )}
                  </button>
                  
                  <button 
                    className="group relative p-2.5 rounded-xl transition-all duration-200 bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    onClick={() => handleViewLogs(playbook)}
                    title="查看日志"
                  >
                    <ScrollText size={16} />
                  </button>
                  
                  <button 
                    className="group relative p-2.5 rounded-xl transition-all duration-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    onClick={() => handleEdit(playbook)}
                    title="编辑"
                  >
                    <Edit2 size={16} />
                  </button>
                  
                  <button 
                    className="group relative p-2.5 rounded-xl transition-all duration-200 bg-red-100 text-red-600 hover:bg-red-200 hover:shadow-md dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                    onClick={() => handleDelete(playbook.id)}
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
          </div>
          );
        })}
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
            <label className="block text-sm font-medium text-gray-300 mb-2">主机组 *</label>
            <CustomSelect
              value={formData.host_group_id}
              onChange={(value) => setFormData({ ...formData, host_group_id: value })}
              options={hostGroups.map(group => ({ value: group.id, label: group.name }))}
              placeholder="请选择主机组"
              required
            />
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
      
      {/* 确认弹窗 */}
      <Modal 
        isOpen={showConfirmModal} 
        onClose={() => setShowConfirmModal(false)}
        title={confirmConfig.title}
      >
        <div className="space-y-4">
          <p className="text-foreground whitespace-pre-line">{confirmConfig.message}</p>
          
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              className="px-4 py-2 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
              onClick={() => setShowConfirmModal(false)}
            >
              取消
            </button>
            <button 
              type="button" 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              onClick={confirmConfig.onConfirm}
            >
              确认
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast容器 */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </div>
  );
};

export default Ansible;