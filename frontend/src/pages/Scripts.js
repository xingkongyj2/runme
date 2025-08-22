import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, PlayCircle, FileText, ScrollText, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { scriptAPI, hostGroupAPI } from '../services/api';
import Modal from '../components/Modal';
import LogModal from '../components/LogModal';
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
  const [showAISuggestionModal, setShowAISuggestionModal] = useState(false);
  const [editingScript, setEditingScript] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
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

  // 添加ref用于textarea自动调整大小
  const textareaRef = useRef(null);

  // 自动调整textarea高度的函数
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    fetchScripts();
    fetchHostGroups();
  }, []);

  // 当内容变化时调整textarea高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [formData.content]);

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
    // 延迟调整高度，确保modal和textarea已渲染
    setTimeout(adjustTextareaHeight, 100);
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
    setConfirmConfig({
      title: '执行确认',
      message: `确定要执行脚本 "${script.name}" 吗？`,
      onConfirm: async () => {
        // 1. 立即关闭确认弹窗
        setShowConfirmModal(false);
        
        // 2. 立即显示Toast（使用setTimeout确保在下一个事件循环中执行）
        setTimeout(() => {
          showSuccess(`脚本执行已启动：${script.name}，请查看日志了解执行结果`, '执行成功');
        }, 0);
        
        // 3. Toast显示后再设置按钮加载状态
        setTimeout(() => {
          setRunningScripts(prev => new Set([...prev, script.id]));
        }, 50);
        
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


  const handleAISuggestion = (suggestion) => {
    setFormData({
      ...formData,
      name: suggestion.name,
      content: suggestion.content
    });
    setShowAISuggestionModal(false);
    // 延迟调整高度
    setTimeout(adjustTextareaHeight, 50);
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
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Shell管理</h1>
        </div>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingScript(null);
            setFormData({ name: '', content: '', host_group_id: '' });
            setShowModal(true);
            // 延迟调整高度，确保modal和textarea已渲染
            setTimeout(adjustTextareaHeight, 100);
          }}
        >
          <Plus size={16} />
          新增脚本
        </button>
      </div>


      {scripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={48} className="text-foreground-secondary mb-4" />
          <p className="text-foreground-secondary">暂无Shell脚本</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-6 justify-items-center">
          {scripts.map((script) => {
          const isRunning = runningScripts.has(script.id);
          return (
            <div key={script.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow w-full">
              <div className="w-full">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-foreground leading-tight pr-3 flex-1 min-w-0">{script.name}</h3>
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium dark:bg-blue-900/20 dark:text-blue-300 flex-shrink-0">{getHostGroupName(script.host_group_id)}</span>
                </div>
                <div className="flex items-center justify-between w-full">
                  <button 
                    className={`group relative p-2.5 rounded-xl transition-all duration-200 ${
                      isRunning
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800/50 dark:text-gray-500'
                        : 'bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-md dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                    }`}
                    onClick={() => !isRunning && handleExecute(script)}
                    disabled={isRunning}
                    title={isRunning ? "脚本执行中..." : "执行脚本"}
                  >
                    {isRunning ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <PlayCircle size={16} />
                    )}
                  </button>
                  
                  <button 
                    className="group relative p-2.5 rounded-xl transition-all duration-200 bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    onClick={() => handleViewLogs(script)}
                    title="查看日志"
                  >
                    <ScrollText size={16} />
                  </button>
                  
                  <button 
                    className="group relative p-2.5 rounded-xl transition-all duration-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    onClick={() => handleEdit(script)}
                    title="编辑"
                  >
                    <Edit2 size={16} />
                  </button>
                  
                  <button 
                    className="group relative p-2.5 rounded-xl transition-all duration-200 bg-red-100 text-red-600 hover:bg-red-200 hover:shadow-md dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                    onClick={() => handleDelete(script.id)}
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
      )}

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
              ref={textareaRef}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono"
              style={{ minHeight: '120px', maxHeight: '400px' }}
              value={formData.content}
              onChange={(e) => {
                setFormData({...formData, content: e.target.value});
                setTimeout(adjustTextareaHeight, 0);
              }}
              onInput={adjustTextareaHeight}
              placeholder="请输入Shell脚本内容..."
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