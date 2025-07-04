import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, FileText, Calendar, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { scriptAPI, hostGroupAPI } from '../services/api';
import Modal from '../components/Modal';
import LogModal from '../components/LogModal';
import ExperimentalModal from '../components/ExperimentalModal';
import AISuggestionModal from '../components/AISuggestionModal';
import CustomSelect from '../components/CustomSelect';
import ToastContainer from '../components/ToastContainer';
import useToast from '../hooks/useToast';

const Scripts = () => {
  // 正确使用 useToast hook
  const { showError, showSuccess, toasts, hideToast } = useToast();
  
  const [scripts, setScripts] = useState([]);
  const [hostGroups, setHostGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showExperimentalModal, setShowExperimentalModal] = useState(false);
  const [showAISuggestionModal, setShowAISuggestionModal] = useState(false);
  const [experimentalResult, setExperimentalResult] = useState(null);
  const [editingScript, setEditingScript] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  const [experimentalMode, setExperimentalMode] = useState(false);
  // 添加运行状态管理
  const [runningScripts, setRunningScripts] = useState(new Set());
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    host_group_id: ''
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
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
      // 修改这里：response.data.data 才是真正的数组
      const data = response.data.data || [];
      console.log('Host groups data:', data);
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
      showError('保存失败，请检查输入信息');
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
    setConfirmConfig({
      title: '删除确认',
      message: '确定要删除这个脚本吗？删除后将无法恢复。',
      onConfirm: async () => {
        // 立即关闭确认弹窗
        setShowConfirmModal(false);
        try {
          await scriptAPI.delete(id);
          fetchScripts();
        } catch (error) {
          console.error('Failed to delete script:', error);
          showError('删除失败');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleExecute = async (script) => {
    // 实验模式
    if (experimentalMode) {
      setConfirmConfig({
        title: '实验模式执行确认',
        message: `确定要在实验主机模式下执行脚本 "${script.name}" 吗？\n\n系统将随机选择一台主机进行测试，确认无问题后再继续执行剩余主机。`,
        onConfirm: async () => {
          // 添加到运行状态
          setRunningScripts(prev => new Set([...prev, script.id]));
          try {
            const response = await scriptAPI.executeExperimental(script.id);
            setExperimentalResult(response.data);
            setShowExperimentalModal(true);
            setShowConfirmModal(false);
            showSuccess(`实验模式执行已启动：${script.name}`, '执行成功');
          } catch (error) {
            console.error('Failed to execute script in experimental mode:', error);
            showError('实验模式执行失败');
            setShowConfirmModal(false);
          } finally {
            // 3秒后移除运行状态
            setTimeout(() => {
              setRunningScripts(prev => {
                const newSet = new Set(prev);
                newSet.delete(script.id);
                return newSet;
              });
            }, 3000);
          }
        }
      });
    } else {
      // 常规模式
      // 常规模式
      setConfirmConfig({
        title: '执行确认',
        message: `确定要执行脚本 "${script.name}" 吗？`,
        onConfirm: async () => {
          // 1. 立即关闭确认弹窗
          setShowConfirmModal(false);
          
          // 2. 立即显示Toast
          showSuccess(`脚本执行已启动：${script.name}，请查看日志了解执行结果`, '执行成功');
          
          // 3. 等待Toast显示完成后再设置运行状态（延迟更长时间确保Toast完全显示）
          setTimeout(() => {
            setRunningScripts(prev => new Set([...prev, script.id]));
          }, 100); // 增加延迟时间到100ms
          
          try {
            // 4. 调用API
            await scriptAPI.execute(script.id);
          } catch (error) {
            console.error('Failed to execute script:', error);
            showError('执行失败');
          } finally {
            // 3秒后移除运行状态
            setTimeout(() => {
              setRunningScripts(prev => {
                const newSet = new Set(prev);
                newSet.delete(script.id);
                return newSet;
              });
            }, 3000);
          }
        }
      });
    }
    setShowConfirmModal(true);
  };

  const handleViewLogs = (script) => {
    setSelectedScript(script);
    setShowLogModal(true);
  };

  const getHostGroupName = (hostGroupId) => {
    if (!Array.isArray(hostGroups)) return '未知主机组';
    const group = hostGroups.find(g => g.id === hostGroupId);
    return group ? group.name : '未知主机组';
  };

  const handleContinueExecution = async () => {
    try {
      await scriptAPI.continueExecution(experimentalResult.experimental_result.script_id || selectedScript?.id, {
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

  const handleAISuggestion = (suggestion) => {
    setFormData({
      ...formData,
      name: suggestion.name,
      content: suggestion.content
    });
    setShowAISuggestionModal(false);
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
            <FileText size={24} className="text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Shell管理</h1>
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
            setEditingScript(null);
            setFormData({ name: '', content: '', host_group_id: '' });
            setShowModal(true);
          }}
        >
          <Plus size={16} />
          新增脚本
        </button>
      </div>

      {experimentalMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 dark:bg-orange-900/20 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <span className="text-sm text-orange-700 dark:text-orange-300">
              实验主机模式已启用：执行脚本时将先在随机选择的主机上测试，确认无问题后再继续执行剩余主机。
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scripts.map((script) => {
          const isRunning = runningScripts.has(script.id);
          return (
            <div key={script.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground truncate">{script.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    className={`p-2 rounded-lg transition-colors ${
                      isRunning
                        ? 'text-gray-400 cursor-not-allowed'
                        : experimentalMode 
                          ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20'
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20'
                    }`}
                    onClick={() => !isRunning && handleExecute(script)}
                    disabled={isRunning}
                    title={isRunning ? "脚本执行中..." : (experimentalMode ? "实验模式执行脚本" : "执行脚本")}
                  >
                    {isRunning ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : experimentalMode ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <Play size={16} />
                    )}
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
                  关联主机组: <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium dark:bg-blue-900/20 dark:text-blue-300">{getHostGroupName(script.host_group_id)}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        title={editingScript ? '编辑脚本' : '新增脚本'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">脚本名称</label>
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

      <LogModal 
        show={showLogModal}
        onClose={() => setShowLogModal(false)}
        script={selectedScript}
      />
      
      <ExperimentalModal 
        show={showExperimentalModal}
        onClose={() => {
          setShowExperimentalModal(false);
          setExperimentalResult(null);
        }}
        onContinue={handleContinueExecution}
        experimentalResult={experimentalResult}
        type="script"
      />

      <AISuggestionModal
        show={showAISuggestionModal}
        onClose={() => setShowAISuggestionModal(false)}
        onApply={handleAISuggestion}
        type="shell"
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

export default Scripts;